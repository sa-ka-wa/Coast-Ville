# App/Controllers/PaymentController.py
from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from App.Extension import db
from App.Models.PaymentModel import Payment
from App.Models.TenantModel import Tenant
from App.Models.PropertyModel import Property
from App.Services.MpesaService import MpesaService
from App.Services.NotificationService import NotificationService
from datetime import datetime
import uuid
import logging

logger = logging.getLogger(__name__)


class PaymentController:

    @staticmethod
    @jwt_required()
    def get_payments():
        """Get all payments (optionally filtered by property or tenant)"""
        property_id = request.args.get('property_id')
        tenant_id = request.args.get('tenant_id')
        status = request.args.get('status')

        query = Payment.query

        if property_id:
            query = query.filter_by(property_id=property_id)
        if tenant_id:
            query = query.filter_by(tenant_id=tenant_id)
        if status:
            query = query.filter_by(status=status)

        payments = query.order_by(Payment.payment_date.desc()).all()
        return jsonify([p.to_dict() for p in payments]), 200

    @staticmethod
    @jwt_required()
    def get_payment(payment_id):
        """Get a single payment"""
        payment = Payment.query.get(payment_id)
        if not payment:
            return jsonify({'message': 'Payment not found'}), 404
        return jsonify(payment.to_dict()), 200

    @staticmethod
    @jwt_required()
    def create_payment():
        """Create a new payment"""
        data = request.json

        # Generate receipt number
        receipt_no = f"RCP-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

        payment = Payment(
            property_id=data.get('property_id'),
            tenant_id=data.get('tenant_id'),
            unit_id=data.get('unit_id'),
            amount=data.get('amount'),
            receipt_no=receipt_no,
            payment_method=data.get('payment_method', 'mpesa'),
            mpesa_code=data.get('mpesa_code'),
            status='paid',
            payment_for_month=datetime.strptime(data.get('payment_for_month'), '%Y-%m-%d').date() if data.get(
                'payment_for_month') else None,
            notes=data.get('notes')
        )

        db.session.add(payment)

        # Update tenant balance
        tenant = Tenant.query.get(data.get('tenant_id'))
        if tenant:
            tenant.balance = (tenant.balance or 0) - data.get('amount', 0)

        db.session.commit()

        # Send receipt via WhatsApp
        try:
            NotificationService.send_receipt(tenant, payment)
        except Exception as e:
            logger.error(f"Failed to send receipt: {str(e)}")

        return jsonify({
            'message': 'Payment recorded successfully',
            'payment': payment.to_dict()
        }), 201

    @staticmethod
    @jwt_required()
    def confirm_payment():
        """Confirm a payment from M-Pesa callback or manual entry"""
        data = request.json

        # Parse M-Pesa data
        receipt_no = data.get('receipt_no')
        amount = data.get('amount')
        phone = data.get('phone')
        mpesa_code = data.get('mpesa_code')

        # Find tenant by phone
        tenant = Tenant.query.filter_by(phone=phone).first()
        if not tenant:
            return jsonify({'message': 'Tenant not found'}), 404

        # Create payment
        payment = Payment(
            property_id=tenant.property_id,
            tenant_id=tenant.id,
            unit_id=tenant.unit_id,
            amount=amount,
            receipt_no=receipt_no or f"MP-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}",
            payment_method='mpesa',
            mpesa_code=mpesa_code,
            status='paid',
            payment_for_month=datetime.now().date()
        )

        db.session.add(payment)

        # Update tenant balance
        tenant.balance = (tenant.balance or 0) - amount

        db.session.commit()

        # Send receipt via WhatsApp
        try:
            NotificationService.send_receipt(tenant, payment)
        except Exception as e:
            logger.error(f"Failed to send receipt: {str(e)}")

        return jsonify({
            'message': 'Payment confirmed successfully',
            'payment': payment.to_dict(),
            'tenant': tenant.to_dict()
        }), 201

    @staticmethod
    @jwt_required()
    def match_payment():
        """Match a payment to a tenant"""
        data = request.json
        phone = data.get('phone')
        amount = data.get('amount')

        # Try to find tenant by phone
        tenant = Tenant.query.filter_by(phone=phone).first()

        if not tenant:
            # Try to find by amount (for manual matching)
            tenants = Tenant.query.filter_by(monthly_rent=amount).all()
            if len(tenants) == 1:
                tenant = tenants[0]

        if not tenant:
            return jsonify({'tenant': None}), 404

        return jsonify({
            'tenant': tenant.to_dict()
        }), 200

    @staticmethod
    @jwt_required()
    def get_payment_stats():
        """Get payment statistics"""
        property_id = request.args.get('property_id')

        query = Payment.query
        if property_id:
            query = query.filter_by(property_id=property_id)

        payments = query.all()

        total_collected = sum([p.amount for p in payments if p.status == 'paid'])

        # Get expected rent
        tenant_query = Tenant.query
        if property_id:
            tenant_query = tenant_query.filter_by(property_id=property_id)
        tenants = tenant_query.all()
        expected_rent = sum([t.monthly_rent or 0 for t in tenants if t.status == 'active'])

        outstanding = expected_rent - total_collected

        # Calculate occupancy
        property_obj = Property.query.get(property_id) if property_id else None
        occupancy = 0
        if property_obj and property_obj.total_units > 0:
            occupied = len([t for t in tenants if t.status == 'active'])
            occupancy = round((occupied / property_obj.total_units) * 100, 2)

        return jsonify({
            'totalCollected': total_collected,
            'expectedRent': expected_rent,
            'outstanding': outstanding,
            'occupancy': occupancy
        }), 200

    @staticmethod
    @jwt_required()
    def initiate_stk_push():
        """Initiate STK Push payment"""
        data = request.json
        phone = data.get('phone')
        amount = data.get('amount')
        tenant_id = data.get('tenant_id')
        description = data.get('description', 'Rent Payment')

        # Validate required fields
        if not all([phone, amount, tenant_id]):
            return jsonify({'message': 'Missing required fields: phone, amount, tenant_id'}), 400

        try:
            # Get tenant
            tenant = Tenant.query.get(tenant_id)
            if not tenant:
                return jsonify({'message': 'Tenant not found'}), 404

            # Initialize M-Pesa service
            mpesa = MpesaService()

            # Generate account reference
            account_ref = f"RENT-{datetime.now().strftime('%Y%m%d')}-{tenant_id}"

            # Initiate STK Push
            result = mpesa.stk_push(
                phone_number=phone,
                amount=amount,
                account_reference=account_ref,
                transaction_desc=description
            )

            if result.get('success'):
                # Create pending payment record
                receipt_no = f"STK-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

                payment = Payment(
                    property_id=tenant.property_id,
                    tenant_id=tenant.id,
                    unit_id=tenant.unit_id,
                    amount=amount,
                    receipt_no=receipt_no,
                    payment_method='mpesa',
                    status='pending',
                    phone_number=phone,
                    checkout_request_id=result.get('CheckoutRequestID'),
                    merchant_request_id=result.get('MerchantRequestID', ''),
                    payment_for_month=datetime.now().date(),
                    notes=f"STK Push initiated: {description}"
                )

                db.session.add(payment)
                db.session.commit()

                return jsonify({
                    'message': 'STK Push initiated successfully',
                    'checkoutRequestID': result.get('CheckoutRequestID'),
                    'responseCode': '0',
                    'responseDescription': 'Success. Request accepted for processing',
                    'payment_id': payment.id
                }), 200
            else:
                return jsonify({
                    'message': 'Failed to initiate STK Push',
                    'error': result.get('error', 'Unknown error')
                }), 400

        except Exception as e:
            logger.error(f"STK Push error: {str(e)}")
            return jsonify({'message': f'STK Push failed: {str(e)}'}), 500

    @staticmethod
    def mpesa_callback():
        """Handle M-Pesa callback from Safaricom"""
        try:
            data = request.json
            logger.info(f"Received M-Pesa callback: {data}")

            # Parse callback using MpesaService
            mpesa = MpesaService()
            parsed = mpesa.parse_callback(data)

            if parsed.get('success'):
                # Payment successful
                receipt_no = parsed.get('receipt_no')
                amount = parsed.get('amount')
                phone = parsed.get('phone')
                mpesa_code = parsed.get('mpesa_code')
                checkout_id = data.get('Body', {}).get('stkCallback', {}).get('CheckoutRequestID')

                # Find pending payment
                payment = Payment.query.filter_by(checkout_request_id=checkout_id).first()

                if not payment:
                    # Try to find by phone and amount
                    payment = Payment.query.filter_by(
                        phone_number=phone,
                        status='pending'
                    ).order_by(Payment.created_at.desc()).first()

                if payment:
                    # Update payment
                    payment.status = 'paid'
                    payment.mpesa_code = mpesa_code
                    payment.mpesa_receipt_number = receipt_no
                    payment.completed_at = datetime.now()
                    payment.receipt_no = receipt_no or payment.receipt_no

                    # Update tenant balance
                    tenant = Tenant.query.get(payment.tenant_id)
                    if tenant:
                        tenant.balance = (tenant.balance or 0) - payment.amount

                    db.session.commit()

                    # Send receipt via WhatsApp
                    try:
                        NotificationService.send_receipt(tenant, payment)
                    except Exception as e:
                        logger.error(f"Failed to send receipt: {str(e)}")

                    return jsonify({'ResultCode': 0, 'ResultDesc': 'Success'}), 200
                else:
                    # Create new payment if not found
                    tenant = Tenant.query.filter_by(phone=phone).first()
                    if tenant:
                        new_payment = Payment(
                            property_id=tenant.property_id,
                            tenant_id=tenant.id,
                            unit_id=tenant.unit_id,
                            amount=amount,
                            receipt_no=receipt_no or f"CB-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}",
                            payment_method='mpesa',
                            mpesa_code=mpesa_code,
                            mpesa_receipt_number=receipt_no,
                            status='paid',
                            phone_number=phone,
                            completed_at=datetime.now(),
                            payment_for_month=datetime.now().date()
                        )

                        db.session.add(new_payment)
                        tenant.balance = (tenant.balance or 0) - amount
                        db.session.commit()

                        # Send receipt
                        try:
                            NotificationService.send_receipt(tenant, new_payment)
                        except Exception as e:
                            logger.error(f"Failed to send receipt: {str(e)}")

                        return jsonify({'ResultCode': 0, 'ResultDesc': 'Success'}), 200

                return jsonify({'ResultCode': 0, 'ResultDesc': 'Payment processed'}), 200
            else:
                # Payment failed
                checkout_id = data.get('Body', {}).get('stkCallback', {}).get('CheckoutRequestID')
                payment = Payment.query.filter_by(checkout_request_id=checkout_id).first()

                if payment:
                    payment.status = 'failed'
                    payment.result_code = parsed.get('result_code')
                    payment.result_description = parsed.get('result_desc', 'Payment failed')
                    payment.failed_at = datetime.now()
                    db.session.commit()

                return jsonify({'ResultCode': 1, 'ResultDesc': 'Payment failed'}), 200

        except Exception as e:
            logger.error(f"Callback processing error: {str(e)}")
            return jsonify({'ResultCode': 1, 'ResultDesc': 'Internal error'}), 500

    @staticmethod
    @jwt_required()
    def check_payment_status():
        """Check STK Push payment status"""
        data = request.json
        checkout_request_id = data.get('checkout_request_id')

        if not checkout_request_id:
            return jsonify({'message': 'checkout_request_id required'}), 400

        try:
            mpesa = MpesaService()
            result = mpesa.query_status(checkout_request_id)

            if result.get('success'):
                status_data = result.get('data', {})
                result_code = status_data.get('ResultCode')

                # Update payment status
                payment = Payment.query.filter_by(checkout_request_id=checkout_request_id).first()

                if payment:
                    if result_code == '0':
                        payment.status = 'paid'
                        payment.mpesa_receipt_number = status_data.get('MpesaReceiptNumber')
                        payment.transaction_id = status_data.get('TransactionID')
                        payment.completed_at = datetime.now()

                        # Update tenant balance
                        tenant = Tenant.query.get(payment.tenant_id)
                        if tenant:
                            tenant.balance = (tenant.balance or 0) - payment.amount

                        db.session.commit()

                        # Send receipt
                        try:
                            NotificationService.send_receipt(tenant, payment)
                        except Exception as e:
                            logger.error(f"Failed to send receipt: {str(e)}")
                    else:
                        payment.status = 'failed'
                        payment.result_code = result_code
                        payment.result_description = status_data.get('ResultDesc', 'Payment failed')
                        payment.failed_at = datetime.now()
                        db.session.commit()

                return jsonify({
                    'status': 'completed' if result_code == '0' else 'failed',
                    'data': status_data
                }), 200
            else:
                return jsonify({
                    'message': 'Status check failed',
                    'error': result.get('error')
                }), 400

        except Exception as e:
            logger.error(f"Status check error: {str(e)}")
            return jsonify({'message': f'Status check failed: {str(e)}'}), 500

    @staticmethod
    @jwt_required()
    def send_receipt():
        """Send receipt to tenant via WhatsApp/SMS/Email"""
        data = request.json
        payment_id = data.get('payment_id')
        method = data.get('method', 'whatsapp')  # whatsapp, sms, email

        if not payment_id:
            return jsonify({'message': 'payment_id required'}), 400

        payment = Payment.query.get(payment_id)
        if not payment:
            return jsonify({'message': 'Payment not found'}), 404

        tenant = Tenant.query.get(payment.tenant_id)
        if not tenant:
            return jsonify({'message': 'Tenant not found'}), 404

        try:
            if method == 'whatsapp':
                result = NotificationService.send_receipt(tenant, payment)
            elif method == 'sms':
                result = NotificationService.send_sms(tenant.phone,
                                                      NotificationService.format_receipt_text(tenant, payment))
            elif method == 'email':
                result = NotificationService.send_email(
                    tenant.email,
                    'Rent Payment Receipt',
                    NotificationService.format_receipt_html(tenant, payment)
                )
            else:
                return jsonify({'message': 'Invalid method. Use: whatsapp, sms, or email'}), 400

            if result.get('success'):
                return jsonify({
                    'message': f'Receipt sent via {method} successfully',
                    'method': method
                }), 200
            else:
                return jsonify({
                    'message': f'Failed to send receipt via {method}',
                    'error': result.get('error', 'Unknown error')
                }), 400

        except Exception as e:
            logger.error(f"Send receipt error: {str(e)}")
            return jsonify({'message': f'Failed to send receipt: {str(e)}'}), 500

    @staticmethod
    @jwt_required()
    def get_payment_history():
        """Get payment history with filters"""
        property_id = request.args.get('property_id')
        tenant_id = request.args.get('tenant_id')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')

        query = Payment.query

        if property_id:
            query = query.filter_by(property_id=property_id)
        if tenant_id:
            query = query.filter_by(tenant_id=tenant_id)
        if start_date:
            query = query.filter(Payment.payment_date >= datetime.strptime(start_date, '%Y-%m-%d'))
        if end_date:
            query = query.filter(Payment.payment_date <= datetime.strptime(end_date, '%Y-%m-%d'))

        payments = query.order_by(Payment.payment_date.desc()).all()
        return jsonify([p.to_dict() for p in payments]), 200

    @staticmethod
    @jwt_required()
    def generate_receipt(payment_id):
        """Generate receipt for a payment"""
        payment = Payment.query.get(payment_id)
        if not payment:
            return jsonify({'message': 'Payment not found'}), 404

        # In production, this would generate a PDF
        # For now, return payment details
        return jsonify({
            'receipt': payment.to_dict(),
            'message': 'Receipt generated successfully'
        }), 200
    @staticmethod
    @jwt_required()
    def get_payment_summary():
        """Get payment summary statistics"""
        property_id = request.args.get('property_id')
        
        try:
            query = Payment.query
            if property_id:
                query = query.filter_by(property_id=property_id)
            
            total_collected = sum([p.amount for p in query.filter_by(status='paid').all()])
            pending = query.filter_by(status='pending').count()
            failed = query.filter_by(status='failed').count()
            total_payments = query.count()
            
            return jsonify({
                'total_collected': total_collected,
                'pending': pending,
                'failed': failed,
                'total_payments': total_payments
            }), 200
        except Exception as e:
            return jsonify({'message': str(e)}), 400
