# App/Controllers/PaymentController.py - Enhanced version

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

    # App/Controllers/PaymentController.py - Updated confirm_payment with duplicate detection

    @staticmethod
    @jwt_required()
    def confirm_payment():
        """
        Confirm a payment - Hybrid approach using phone, name, or house number
        WITH DUPLICATE DETECTION
        """
        try:
            data = request.json
            logger.info(f"📝 Payment confirmation request: {data}")

            # Extract data
            phone = data.get('phone')
            name = data.get('name') or data.get('sender')
            house_no = data.get('house_no') or data.get('houseNumber')
            amount = data.get('amount')
            mpesa_code = data.get('mpesa_code')
            receipt_no = data.get('receipt_no')
            payment_for_month = data.get('payment_for_month')
            notes = data.get('notes')
            tenant_id = data.get('tenant_id')  # For manual selection

            # ✅ CRITICAL: Check for duplicate payment by M-Pesa code
            if mpesa_code:
                existing_payment = Payment.query.filter_by(mpesa_code=mpesa_code).first()
                if existing_payment:
                    logger.warning(f"⚠️ DUPLICATE PAYMENT DETECTED: M-Pesa code {mpesa_code} already exists")
                    return jsonify({
                        'success': False,
                        'message': 'Duplicate payment detected. This M-Pesa transaction has already been recorded.',
                        'duplicate': True,
                        'existing_payment': existing_payment.to_dict(),
                        'action': 'review_duplicate'
                    }), 409  # 409 Conflict

            # Also check by receipt number if provided
            if receipt_no:
                existing_by_receipt = Payment.query.filter_by(receipt_no=receipt_no).first()
                if existing_by_receipt:
                    logger.warning(f"⚠️ DUPLICATE PAYMENT DETECTED: Receipt {receipt_no} already exists")
                    return jsonify({
                        'success': False,
                        'message': 'Duplicate payment detected. This receipt number already exists.',
                        'duplicate': True,
                        'existing_payment': existing_by_receipt.to_dict(),
                        'action': 'review_duplicate'
                    }), 409

            # Also check by combination of amount, phone, and date (within 5 minutes)
            if amount and phone:
                from datetime import datetime, timedelta
                time_threshold = datetime.now() - timedelta(minutes=5)
                recent_duplicate = Payment.query.filter(
                    Payment.amount == amount,
                    Payment.phone_number == phone,
                    Payment.payment_date >= time_threshold
                ).first()

                if recent_duplicate:
                    logger.warning(
                        f"⚠️ POTENTIAL DUPLICATE: Same amount ({amount}) from same phone ({phone}) within 5 minutes")
                    return jsonify({
                        'success': False,
                        'message': 'Potential duplicate payment detected. Same amount from same phone within 5 minutes.',
                        'duplicate': True,
                        'existing_payment': recent_duplicate.to_dict(),
                        'action': 'review_duplicate'
                    }), 409

            tenant = None
            matched_by = None
            candidates = []

            # Helper function to get house number
            def get_house_no(tenant_obj):
                if tenant_obj and tenant_obj.unit:
                    return tenant_obj.unit.unit_number
                return None

            # === STEP 1: Try to match by tenant_id (manual selection) ===
            if tenant_id:
                tenant = Tenant.query.get(tenant_id)
                if tenant:
                    matched_by = 'manual_selection'
                    house = get_house_no(tenant)
                    logger.info(f"✅ Matched by manual selection: {tenant.name} ({house})")

            # === STEP 2: Try to match by phone (highest confidence) ===
            if not tenant and phone:
                # Clean phone number
                phone_clean = ''.join(filter(str.isdigit, phone))
                if phone_clean.startswith('0'):
                    phone_clean = '254' + phone_clean[1:]
                elif not phone_clean.startswith('254') and phone_clean.startswith('7'):
                    phone_clean = '254' + phone_clean

                tenant = Tenant.query.filter_by(phone=phone_clean).first()
                if tenant:
                    matched_by = 'phone'
                    house = get_house_no(tenant)
                    logger.info(f"✅ Matched by phone: {tenant.name} ({house})")

            # === STEP 3: Try to match by house number ===
            if not tenant and house_no:
                # Clean house number
                house_no_clean = str(house_no).strip().upper()

                # Try to find by unit number
                from App.Models.UnitModel import Unit
                unit = Unit.query.filter_by(unit_number=house_no_clean).first()
                if unit:
                    tenant = Tenant.query.filter_by(unit_id=unit.id).first()
                    if tenant:
                        matched_by = 'house_number'
                        house = get_house_no(tenant)
                        logger.info(f"✅ Matched by house number: {tenant.name} ({house})")

            # === STEP 4: Try to match by name (partial match) ===
            if not tenant and name:
                name_clean = name.strip().lower()
                tenants = Tenant.query.filter(
                    Tenant.name.ilike(f'%{name_clean}%')
                ).all()

                if len(tenants) == 1:
                    tenant = tenants[0]
                    matched_by = 'name_partial'
                    house = get_house_no(tenant)
                    logger.info(f"✅ Matched by name: {tenant.name} ({house})")
                elif len(tenants) > 1:
                    candidates = [t.to_dict() for t in tenants]
                    logger.info(f"⚠️ Multiple tenants found for name '{name}': {len(tenants)}")
                    return jsonify({
                        'success': False,
                        'message': 'Multiple tenants found with similar name',
                        'candidates': candidates,
                        'action': 'manual_selection',
                        'payment_data': data
                    }), 200

            # === STEP 5: Try to find by property and amount ===
            if not tenant and amount:
                property_id = data.get('property_id')
                if property_id:
                    tenants = Tenant.query.filter_by(
                        property_id=property_id,
                        monthly_rent=amount,
                        status='active'
                    ).all()

                    if len(tenants) == 1:
                        tenant = tenants[0]
                        matched_by = 'rent_amount'
                        house = get_house_no(tenant)
                        logger.info(f"✅ Matched by rent amount: {tenant.name} ({house})")
                    elif len(tenants) > 1:
                        candidates = [t.to_dict() for t in tenants]
                        return jsonify({
                            'success': False,
                            'message': 'Multiple tenants with same rent amount',
                            'candidates': candidates,
                            'action': 'manual_selection',
                            'payment_data': data
                        }), 200

            # === No tenant found ===
            if not tenant:
                logger.warning(f"❌ No tenant found for payment: phone={phone}, name={name}, house={house_no}")
                return jsonify({
                    'success': False,
                    'message': 'No tenant found. Please match manually.',
                    'action': 'manual_entry',
                    'payment_data': data
                }), 404

            # === Create Payment ===
            if not payment_for_month:
                payment_for_month = datetime.now().date().strftime('%Y-%m-%d')

            receipt_no = receipt_no or f"MP-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

            house_no_display = get_house_no(tenant) or 'N/A'

            payment = Payment(
                property_id=tenant.property_id,
                tenant_id=tenant.id,
                unit_id=tenant.unit_id,
                amount=amount,
                receipt_no=receipt_no,
                payment_method='mpesa',
                mpesa_code=mpesa_code,
                phone_number=phone,
                status='paid',
                payment_for_month=datetime.strptime(payment_for_month,
                                                    '%Y-%m-%d').date() if payment_for_month else datetime.now().date(),
                notes=notes or f"Confirmed by: {matched_by} | Phone: {phone} | Name: {name} | House: {house_no_display}"
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

            logger.info(f"✅ Payment confirmed: {tenant.name} - KSh {amount} (matched by: {matched_by})")

            return jsonify({
                'success': True,
                'message': f'Payment confirmed for {tenant.name}',
                'payment': payment.to_dict(),
                'tenant': tenant.to_dict(),
                'matched_by': matched_by
            }), 201

        except Exception as e:
            logger.error(f"❌ Error confirming payment: {str(e)}")
            db.session.rollback()
            import traceback
            traceback.print_exc()
            return jsonify({
                'message': f'Payment confirmation failed: {str(e)}',
                'success': False,
                'error': str(e)
            }), 500

    # App/Controllers/PaymentController.py - Replace the match_payment method

    @staticmethod
    @jwt_required()
    def match_payment():
        """Match a payment to a tenant - Enhanced with multiple criteria"""
        try:
            data = request.json
            logger.info(f"🔍 Matching payment with data: {data}")

            phone = data.get('phone')
            amount = data.get('amount')
            name = data.get('name')
            house_no = data.get('house_no')
            property_id = data.get('property_id')

            results = []

            # 1. Match by phone
            if phone:
                phone_clean = ''.join(filter(str.isdigit, phone))
                if phone_clean.startswith('0'):
                    phone_clean = '254' + phone_clean[1:]
                elif not phone_clean.startswith('254') and phone_clean.startswith('7'):
                    phone_clean = '254' + phone_clean

                tenant = Tenant.query.filter_by(phone=phone_clean).first()
                if tenant:
                    results.append({
                        'tenant': tenant.to_dict(),
                        'match_score': 100,
                        'matched_by': 'phone'
                    })

            # 2. Match by house number (with multiple formats)
            if house_no:
                from App.Models.UnitModel import Unit

                # Clean house number
                house_no_clean = str(house_no).strip().upper()

                # Try different formats
                formats = [
                    house_no_clean,  # "11"
                    house_no_clean.zfill(3),  # "011"
                    house_no_clean.lstrip('0'),  # "11"
                    house_no_clean.rjust(3, '0'),  # "011"
                    house_no_clean.replace('-', ''),  # Remove dashes
                    house_no_clean.replace(' ', ''),  # Remove spaces
                ]

                # Add letter variations
                if house_no_clean.isdigit():
                    formats.append(str(int(house_no_clean)))  # "11" -> "11"

                # Remove duplicates
                formats = list(dict.fromkeys(formats))

                logger.info(f"🔍 Trying house number formats: {formats}")

                for fmt in formats:
                    unit = Unit.query.filter_by(unit_number=fmt).first()
                    if unit:
                        tenant = Tenant.query.filter_by(unit_id=unit.id, status='active').first()
                        if tenant:
                            results.append({
                                'tenant': tenant.to_dict(),
                                'match_score': 95,
                                'matched_by': f'house_number_{fmt}'
                            })
                            break

                # If no exact match, try partial match
                if not any(r['matched_by'].startswith('house_number') for r in results):
                    units = Unit.query.filter(
                        Unit.unit_number.ilike(f'%{house_no_clean}%')
                    ).all()
                    for unit in units:
                        tenant = Tenant.query.filter_by(unit_id=unit.id, status='active').first()
                        if tenant:
                            results.append({
                                'tenant': tenant.to_dict(),
                                'match_score': 80,
                                'matched_by': 'house_number_partial'
                            })

            # 3. Match by name (partial)
            if name:
                name_clean = name.strip().lower()
                tenants = Tenant.query.filter(
                    Tenant.name.ilike(f'%{name_clean}%'),
                    Tenant.status == 'active'
                ).all()
                for t in tenants:
                    results.append({
                        'tenant': t.to_dict(),
                        'match_score': 70,
                        'matched_by': 'name_partial'
                    })

            # 4. Match by amount (property specific)
            if property_id and amount:
                tenants = Tenant.query.filter_by(
                    property_id=property_id,
                    monthly_rent=amount,
                    status='active'
                ).all()
                for t in tenants:
                    results.append({
                        'tenant': t.to_dict(),
                        'match_score': 60,
                        'matched_by': 'rent_amount'
                    })

            # Remove duplicates
            seen = set()
            unique_results = []
            for r in results:
                tenant_id = r['tenant']['id']
                if tenant_id not in seen:
                    seen.add(tenant_id)
                    unique_results.append(r)

            if len(unique_results) == 0:
                return jsonify({
                    'success': False,
                    'message': 'No matching tenants found',
                    'candidates': []
                }), 404

            # Sort by match score (highest first)
            unique_results.sort(key=lambda x: x['match_score'], reverse=True)

            return jsonify({
                'success': True,
                'candidates': unique_results,
                'total_matches': len(unique_results),
                'best_match': unique_results[0] if len(unique_results) == 1 else None
            }), 200

        except Exception as e:
            logger.error(f"Error matching payment: {str(e)}")
            import traceback
            traceback.print_exc()
            return jsonify({'error': str(e)}), 500

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
        try:
            data = request.json
            logger.info(f"📱 STK Push request received: {data}")

            phone = data.get('phone')
            amount = data.get('amount')
            tenant_id = data.get('tenant_id')
            description = data.get('description', 'Rent Payment')

            # Validate required fields
            if not all([phone, amount, tenant_id]):
                logger.error("❌ Missing required fields")
                return jsonify({
                    'message': 'Missing required fields: phone, amount, tenant_id',
                    'error': 'Validation failed'
                }), 400

            logger.info(f"📋 Processing STK Push for tenant: {tenant_id}, amount: {amount}, phone: {phone}")

            # Get tenant
            tenant = Tenant.query.get(tenant_id)
            if not tenant:
                logger.error(f"❌ Tenant not found: {tenant_id}")
                return jsonify({'message': 'Tenant not found'}), 404

            logger.info(f"✅ Tenant found: {tenant.name}")

            # Initialize M-Pesa service
            mpesa = MpesaService()

            # ✅ Use house number as account reference
            account_ref = tenant.houseNo or tenant.unit.unit_number if tenant.unit else str(tenant.id)
            logger.info(f"🏠 Using account reference: {account_ref}")

            # Initiate STK Push
            logger.info(f"📤 Calling M-Pesa STK Push...")
            result = mpesa.stk_push(
                phone_number=phone,
                amount=amount,
                account_reference=account_ref,
                transaction_desc=description
            )

            logger.info(f"📥 M-Pesa result: {result}")

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
                    account_reference=account_ref,
                    payment_for_month=datetime.now().date(),
                    notes=f"STK Push initiated: {description}"
                )

                db.session.add(payment)
                db.session.commit()

                logger.info(f"✅ Payment record created: {payment.id}")

                return jsonify({
                    'message': 'STK Push initiated successfully',
                    'success': True,
                    'checkoutRequestID': result.get('CheckoutRequestID'),
                    'responseCode': '0',
                    'responseDescription': 'Success. Request accepted for processing',
                    'payment_id': payment.id,
                    'account_reference': account_ref
                }), 200
            else:
                error_msg = result.get('error', 'Unknown error')
                logger.error(f"❌ STK Push failed: {error_msg}")
                return jsonify({
                    'message': 'Failed to initiate STK Push',
                    'success': False,
                    'error': error_msg
                }), 400

        except Exception as e:
            logger.error(f"❌ STK Push error: {str(e)}")
            import traceback
            traceback.print_exc()
            return jsonify({
                'message': f'STK Push failed: {str(e)}',
                'success': False,
                'error': str(e)
            }), 500

    @staticmethod
    def mpesa_callback():
        """Handle M-Pesa callback from Safaricom with duplicate detection"""
        try:
            data = request.json
            logger.info(f"Received M-Pesa callback: {data}")

            mpesa = MpesaService()
            parsed = mpesa.parse_callback(data)

            if parsed.get('success'):
                receipt_no = parsed.get('receipt_no')
                amount = parsed.get('amount')
                phone = parsed.get('phone')
                mpesa_code = parsed.get('mpesa_code')
                checkout_id = data.get('Body', {}).get('stkCallback', {}).get('CheckoutRequestID')

                # ✅ Check for duplicate by M-Pesa code
                if mpesa_code:
                    existing = Payment.query.filter_by(mpesa_code=mpesa_code).first()
                    if existing:
                        logger.warning(f"⚠️ DUPLICATE CALLBACK: M-Pesa code {mpesa_code} already processed")
                        return jsonify({'ResultCode': 0, 'ResultDesc': 'Duplicate callback ignored'}), 200

                payment = Payment.query.filter_by(checkout_request_id=checkout_id).first()

                if payment:
                    # ✅ Use the stored account reference to find tenant
                    account_ref = payment.account_reference
                    tenant = None

                    if account_ref:
                        # Try to find by house number
                        tenant = Tenant.query.filter_by(houseNo=account_ref).first()
                        if not tenant:
                            # Try by unit number
                            from App.Models.UnitModel import Unit
                            unit = Unit.query.filter_by(unit_number=account_ref).first()
                            if unit:
                                tenant = Tenant.query.filter_by(unit_id=unit.id).first()

                    # If still no tenant, try by phone
                    if not tenant and phone:
                        tenant = Tenant.query.filter_by(phone=phone).first()

                    if tenant:
                        payment.tenant_id = tenant.id
                        payment.property_id = tenant.property_id
                        payment.unit_id = tenant.unit_id

                    payment.status = 'paid'
                    payment.mpesa_code = mpesa_code
                    payment.mpesa_receipt_number = receipt_no
                    payment.completed_at = datetime.now()
                    payment.receipt_no = receipt_no or payment.receipt_no

                    if tenant:
                        tenant.balance = (tenant.balance or 0) - payment.amount

                    db.session.commit()

                    if tenant:
                        try:
                            NotificationService.send_receipt(tenant, payment)
                        except Exception as e:
                            logger.error(f"Failed to send receipt: {str(e)}")

                    return jsonify({'ResultCode': 0, 'ResultDesc': 'Success'}), 200

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

                payment = Payment.query.filter_by(checkout_request_id=checkout_request_id).first()

                if payment:
                    if result_code == '0':
                        payment.status = 'paid'
                        payment.mpesa_receipt_number = status_data.get('MpesaReceiptNumber')
                        payment.transaction_id = status_data.get('TransactionID')
                        payment.completed_at = datetime.now()

                        tenant = Tenant.query.get(payment.tenant_id)
                        if tenant:
                            tenant.balance = (tenant.balance or 0) - payment.amount

                        db.session.commit()

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
        method = data.get('method', 'whatsapp')

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

    # App/Controllers/PaymentController.py - Add this method

    @staticmethod
    def c2b_callback():
        """
        Handle C2B (Customer to Business) callback from Safaricom
        This is the PRIMARY payment method - called when tenants pay via Paybill
        """
        try:
            data = request.json
            logger.info(f"📥 C2B Callback received: {data}")

            # Extract payment details
            trans_id = data.get('TransID')
            amount = float(data.get('TransAmount', 0))
            bill_ref_number = data.get('BillRefNumber')  # ✅ HOUSE NUMBER!
            msisdn = data.get('MSISDN')
            first_name = data.get('FirstName', '')
            middle_name = data.get('MiddleName', '')
            last_name = data.get('LastName', '')

            logger.info(f"🏠 House Number: {bill_ref_number}")
            logger.info(f"💰 Amount: KSh {amount:,.2f}")
            logger.info(f"📱 Phone: {msisdn}")
            logger.info(f"👤 Sender: {first_name} {last_name}")

            tenant = None
            matched_by = None

            # ✅ STEP 1: Match by Unit Number (House Number) via Unit model
            if bill_ref_number:
                from App.Models.UnitModel import Unit

                # Clean the house number
                house_no_clean = str(bill_ref_number).strip().upper()
                logger.info(f"🔍 Looking for unit: {house_no_clean}")

                # Find the unit by unit_number
                unit = Unit.query.filter_by(unit_number=house_no_clean).first()

                if unit:
                    logger.info(f"✅ Found unit: {unit.unit_number} (ID: {unit.id})")
                    # Find tenant by unit_id
                    tenant = Tenant.query.filter_by(unit_id=unit.id).first()
                    if tenant:
                        matched_by = 'unit_number'
                        logger.info(f"✅ Matched by unit number: {tenant.name} (Unit: {unit.unit_number})")
                    else:
                        logger.warning(f"⚠️ No tenant assigned to unit {unit.unit_number}")
                else:
                    logger.warning(f"⚠️ No unit found with number: {house_no_clean}")

            # ✅ STEP 2: Match by Phone (fallback)
            if not tenant and msisdn:
                phone_clean = ''.join(filter(str.isdigit, msisdn))
                if phone_clean.startswith('0'):
                    phone_clean = '254' + phone_clean[1:]
                elif not phone_clean.startswith('254') and phone_clean.startswith('7'):
                    phone_clean = '254' + phone_clean

                logger.info(f"🔍 Looking for tenant by phone: {phone_clean}")
                tenant = Tenant.query.filter_by(phone=phone_clean).first()
                if tenant:
                    matched_by = 'phone'
                    unit_no = tenant.unit.unit_number if tenant.unit else 'No Unit'
                    logger.info(f"✅ Matched by phone: {tenant.name} (Unit: {unit_no})")

            # ✅ STEP 3: Match by Name (last resort)
            if not tenant and first_name:
                full_name = f"{first_name} {middle_name} {last_name}".strip()
                logger.info(f"🔍 Looking for tenant by name: {full_name}")

                tenants = Tenant.query.filter(
                    Tenant.name.ilike(f'%{full_name}%')
                ).all()

                if len(tenants) == 1:
                    tenant = tenants[0]
                    matched_by = 'name'
                    unit_no = tenant.unit.unit_number if tenant.unit else 'No Unit'
                    logger.info(f"✅ Matched by name: {tenant.name} (Unit: {unit_no})")
                elif len(tenants) > 1:
                    logger.warning(f"⚠️ Multiple tenants found for name: {full_name}")

            # ✅ STEP 4: No tenant found - create pending payment
            if not tenant:
                logger.warning(f"❌ No tenant found for house: {bill_ref_number}")

                # Create pending payment for manual matching
                payment = Payment(
                    amount=amount,
                    payment_method='mpesa',
                    mpesa_code=trans_id,
                    phone_number=msisdn,
                    status='pending',
                    account_reference=bill_ref_number,
                    payment_for_month=datetime.now().date(),
                    notes=f"C2B Payment - House {bill_ref_number} - {first_name} {last_name}"
                )
                db.session.add(payment)
                db.session.commit()

                logger.info(f"⏳ Pending payment created: {payment.id}")

                # Notify caretaker about unmatched payment
                try:
                    from App.Services.NotificationService import NotificationService
                    NotificationService.notify_caretaker_about_unmatched_payment(payment)
                except Exception as e:
                    logger.error(f"Failed to notify caretaker: {str(e)}")

                return jsonify({
                    'ResultCode': 0,
                    'ResultDesc': 'Payment received - manual matching required'
                }), 200

            # ✅ STEP 5: Tenant found - auto-record payment
            receipt_no = f"RCP-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

            # Get house number from unit
            house_no = tenant.unit.unit_number if tenant.unit else bill_ref_number

            payment = Payment(
                property_id=tenant.property_id,
                tenant_id=tenant.id,
                unit_id=tenant.unit_id,
                amount=amount,
                receipt_no=receipt_no,
                payment_method='mpesa',
                mpesa_code=trans_id,
                phone_number=msisdn,
                status='paid',
                account_reference=bill_ref_number,
                payment_for_month=datetime.now().date(),
                notes=f"C2B Payment - House {house_no} - {first_name} {last_name} (Matched by: {matched_by})"
            )

            db.session.add(payment)

            # Update tenant balance
            tenant.balance = (tenant.balance or 0) - amount
            db.session.commit()

            logger.info(f"✅ Auto-recorded: {tenant.name} - KSh {amount:,.2f} (House: {house_no})")

            # Send receipt
            try:
                from App.Services.NotificationService import NotificationService
                NotificationService.send_receipt(tenant, payment)
            except Exception as e:
                logger.error(f"Failed to send receipt: {str(e)}")

            return jsonify({
                'ResultCode': 0,
                'ResultDesc': 'Success'
            }), 200

        except Exception as e:
            logger.error(f"❌ C2B Callback error: {str(e)}")
            import traceback
            traceback.print_exc()
            return jsonify({
                'ResultCode': 1,
                'ResultDesc': f'Error: {str(e)}'
            }), 500

    # App/Controllers/PaymentController.py - Add these methods

    # App/Controllers/PaymentController.py - Fixed allocate_payment

    @staticmethod
    @jwt_required()
    def allocate_payment():
        """Allocate payment to deposit, water, and rent"""
        try:
            # Get payment_id from URL, not from request body
            # The payment_id is passed in the URL, not in the request body
            from flask import request

            # Get the payment_id from the URL
            # This is accessed via the route parameter
            # In Flask, the payment_id is captured from the URL

            # Since we're in a class method, we need to get the payment_id differently
            # Let's get it from the request endpoint
            # The payment_id is part of the URL path

            # Instead, let's use a different approach - get payment_id from the URL
            # by parsing the request path or using the view_args
            from flask import request
            from flask import current_app

            # Get payment_id from request.view_args
            payment_id = request.view_args.get('payment_id') if hasattr(request, 'view_args') else None

            if not payment_id:
                return jsonify({'message': 'Payment ID required'}), 400

            from App.Services.PaymentAllocationService import PaymentAllocationService

            service = PaymentAllocationService(payment_id)
            result = service.allocate()

            if result.get('error'):
                return jsonify({'message': result['error']}), 400

            return jsonify(result), 200

        except Exception as e:
            logger.error(f"Error allocating payment: {str(e)}")
            db.session.rollback()
            return jsonify({'message': str(e)}), 500

    @staticmethod
    @jwt_required()
    def get_payment_allocation(payment_id):
        """Get payment allocation details"""
        try:
            payment = Payment.query.get(payment_id)
            if not payment:
                return jsonify({'message': 'Payment not found'}), 404

            return jsonify({
                'payment': payment.to_dict(),
                'allocations': {
                    'rent': payment.rent_amount,
                    'water': payment.water_amount,
                    'deposit': payment.deposit_amount,
                    'excess': payment.excess_amount,
                    'balance_due': payment.balance_due,
                    'credited_to_next_month': payment.credited_to_next_month
                }
            }), 200

        except Exception as e:
            logger.error(f"Error getting payment allocation: {str(e)}")
            return jsonify({'message': str(e)}), 500

    # App/Controllers/PaymentController.py - Add these methods

    @staticmethod
    @jwt_required()
    def move_payment_to_tenant(payment_id):
        """Move payment from one tenant to another (fix wrong house)"""
        try:
            data = request.json
            new_tenant_id = data.get('new_tenant_id')
            reason = data.get('reason', 'Wrong house number')

            payment = Payment.query.get(payment_id)
            if not payment:
                return jsonify({'message': 'Payment not found'}), 404

            old_tenant = Tenant.query.get(payment.tenant_id)
            new_tenant = Tenant.query.get(new_tenant_id)

            if not new_tenant:
                return jsonify({'message': 'New tenant not found'}), 404

            # Remove payment from old tenant's balance
            if old_tenant:
                old_tenant.balance = (old_tenant.balance or 0) + payment.amount

            # Add payment to new tenant's balance
            new_tenant.balance = (new_tenant.balance or 0) - payment.amount

            # Update payment record
            payment.original_tenant_id = payment.tenant_id
            payment.tenant_id = new_tenant_id
            payment.moved_to_tenant_id = new_tenant_id
            payment.moved_reason = reason
            payment.moved_at = datetime.now()
            payment.moved_by = get_jwt_identity()

            db.session.commit()

            return jsonify({
                'success': True,
                'message': f'Payment moved from {old_tenant.name if old_tenant else "Unknown"} to {new_tenant.name}',
                'payment': payment.to_dict()
            }), 200

        except Exception as e:
            logger.error(f"Error moving payment: {str(e)}")
            db.session.rollback()
            return jsonify({'message': str(e)}), 500

    @staticmethod
    @jwt_required()
    def reverse_payment(payment_id):
        """Reverse/refund a payment"""
        try:
            data = request.json
            reason = data.get('reason', 'Payment reversal requested')
            notes = data.get('notes')
            user_id = get_jwt_identity()

            payment = Payment.query.get(payment_id)
            if not payment:
                return jsonify({'message': 'Payment not found'}), 404

            # Check if already reversed
            if payment.reversed:
                return jsonify({'message': 'Payment already reversed'}), 400

            # Update payment status
            payment.status = 'reversed'
            payment.reversed = True
            payment.reversal_reason = reason
            payment.reversed_at = datetime.now()
            payment.reversed_by = user_id

            # Restore tenant balance
            tenant = Tenant.query.get(payment.tenant_id)
            if tenant:
                tenant.balance = (tenant.balance or 0) + payment.amount

            db.session.commit()

            return jsonify({
                'success': True,
                'message': 'Payment reversed successfully',
                'payment': payment.to_dict()
            }), 200

        except Exception as e:
            logger.error(f"Error reversing payment: {str(e)}")
            db.session.rollback()
            return jsonify({'message': str(e)}), 500

    # App/Controllers/PaymentController.py - Add AI parsing endpoint

    @staticmethod
    @jwt_required()
    def parse_payment_sms():
        """Parse M-Pesa SMS using AI-powered parser"""
        try:
            data = request.json
            sms_text = data.get('sms_text', '')
            property_id = data.get('property_id')

            if not sms_text:
                return jsonify({'error': 'SMS text is required'}), 400

            # Use the AI parser (frontend will handle parsing)
            # We'll use a Python regex-based parser as fallback
            parsed = PaymentController._parse_mpesa_sms(sms_text)

            if not parsed:
                return jsonify({
                    'success': False,
                    'message': 'Could not parse SMS',
                    'parsed': False
                }), 400

            # Find matching tenant
            tenant = None
            candidates = []

            # Try to find by house number
            if parsed.get('house_no'):
                from App.Models.UnitModel import Unit
                house_no_clean = str(parsed['house_no']).strip().upper()

                # Try different formats
                formats = [house_no_clean, house_no_clean.zfill(3), house_no_clean.lstrip('0')]
                formats = list(dict.fromkeys(formats))

                for fmt in formats:
                    unit = Unit.query.filter_by(
                        unit_number=fmt,
                        property_id=property_id
                    ).first()
                    if unit:
                        tenant = Tenant.query.filter_by(unit_id=unit.id, status='active').first()
                        if tenant:
                            parsed['matched_by'] = 'house_number'
                            break

            # If not found by house, try phone
            if not tenant and parsed.get('phone_number'):
                phone_clean = parsed['phone_number']
                tenant = Tenant.query.filter_by(phone=phone_clean).first()
                if tenant:
                    parsed['matched_by'] = 'phone'

            # If not found by phone, try name
            if not tenant and parsed.get('sender_name'):
                name_clean = parsed['sender_name'].strip().lower()
                tenants = Tenant.query.filter(
                    Tenant.name.ilike(f'%{name_clean}%'),
                    Tenant.status == 'active'
                ).all()
                if len(tenants) == 1:
                    tenant = tenants[0]
                    parsed['matched_by'] = 'name'
                elif len(tenants) > 1:
                    candidates = [t.to_dict() for t in tenants]

            if tenant:
                parsed['tenant'] = tenant.to_dict()
                parsed['tenant_id'] = tenant.id
                parsed['matched'] = True
            else:
                parsed['matched'] = False
                if not candidates:
                    parsed['message'] = 'No tenant matched'

            if candidates:
                parsed['candidates'] = candidates

            return jsonify(parsed), 200

        except Exception as e:
            logger.error(f"Error parsing payment SMS: {str(e)}")
            import traceback
            traceback.print_exc()
            return jsonify({'error': str(e)}), 500