# App/Services/PaymentService.py
from App.Extension import db
from App.Models.PaymentModel import Payment
from App.Models.TenantModel import Tenant
from App.Models.PropertyModel import Property
from App.Models.UnitModel import Unit
from App.Services.MpesaService import MpesaService
from App.Services.NotificationService import NotificationService
from datetime import datetime
import uuid
import logging
import re

logger = logging.getLogger(__name__)


class PaymentService:
    """Payment service for RentManager"""

    def __init__(self):
        self.mpesa = MpesaService()

    def process_mpesa_payment(self, tenant_id, amount, phone_number, description="Rent Payment"):
        """Process M-Pesa payment"""
        try:
            tenant = Tenant.query.get(tenant_id)
            if not tenant:
                raise ValueError("Tenant not found")

            # Generate receipt number
            receipt_no = f"RCP-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

            # Get property to generate account reference
            property = Property.query.get(tenant.property_id)
            if not property:
                raise ValueError("Property not found")

            # Generate account reference: PHONE_LAST_8#HOUSE_NO
            account_ref = property.generate_account_reference(
                tenant.unit.unit_number if tenant.unit else "HOUSE"
            )

            # Create payment record
            payment = Payment(
                property_id=tenant.property_id,
                tenant_id=tenant.id,
                unit_id=tenant.unit_id,
                amount=amount,
                receipt_no=receipt_no,
                account_reference=account_ref,
                payment_method='mpesa',
                status='pending',
                phone_number=phone_number,
                payment_for_month=datetime.now().date(),
                payment_date=datetime.now()
            )

            db.session.add(payment)
            db.session.flush()  # Get payment ID

            # Initiate STK Push
            result = self.mpesa.stk_push(
                phone_number=phone_number,
                amount=amount,
                account_reference=account_ref,
                transaction_desc=description
            )

            if result.get('success'):
                # Update payment with M-Pesa details
                payment.checkout_request_id = result.get('CheckoutRequestID')
                payment.merchant_request_id = result.get('MerchantRequestID')
                payment.mpesa_code = result.get('CheckoutRequestID')

                db.session.commit()

                return {
                    'success': True,
                    'payment': payment.to_dict(),
                    'checkout_request_id': result.get('CheckoutRequestID'),
                    'message': 'STK Push initiated successfully'
                }
            else:
                # Failed to initiate STK Push
                payment.status = 'failed'
                payment.result_description = result.get('error', 'STK Push failed')
                db.session.commit()

                return {
                    'success': False,
                    'error': result.get('error', 'Failed to initiate STK Push')
                }

        except Exception as e:
            logger.error(f"Error processing M-Pesa payment: {str(e)}")
            db.session.rollback()
            return {'success': False, 'error': str(e)}

    def process_paybill_payment(self, account_reference, amount, phone_number, mpesa_code):
        """
        Process Paybill payment from M-Pesa callback.
        Account reference format: PHONE_LAST_8#HOUSE_NO (e.g., 40766915#A01)
        """
        try:
            logger.info(f"Processing Paybill payment: {account_reference}, amount: {amount}")

            # Parse account reference
            if '#' not in account_reference:
                raise ValueError(f"Invalid account reference format: {account_reference}")

            phone_last_8, house_no = account_reference.split('#', 1)
            phone_last_8 = phone_last_8.strip()
            house_no = house_no.strip()

            # Find property by phone_last_8
            property = Property.query.filter_by(mpesa_account_prefix=phone_last_8).first()
            if not property:
                raise ValueError(f"Property not found for account: {phone_last_8}")

            # Find tenant by property and house number
            tenant = Tenant.query.join(Tenant.unit).filter(
                Tenant.property_id == property.id,
                Unit.unit_number == house_no
            ).first()

            if not tenant:
                raise ValueError(f"Tenant not found for house: {house_no} in property {property.name}")

            # Generate receipt number
            receipt_no = f"PB-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

            # Create payment - FIXED: use 'paid' instead of 'completed'
            payment = Payment(
                property_id=property.id,
                tenant_id=tenant.id,
                unit_id=tenant.unit_id,
                amount=amount,
                receipt_no=receipt_no,
                account_reference=account_reference,
                phone_number=phone_number,
                mpesa_code=mpesa_code,
                payment_method='mpesa',
                status='paid',  # ✅ CHANGED from 'completed' to 'paid'
                payment_for_month=datetime.now().date(),
                payment_date=datetime.now(),
                completed_at=datetime.now()
            )

            db.session.add(payment)
            db.session.flush()

            # Allocate payment
            from App.Services.PaymentAllocationService import PaymentAllocationService
            allocator = PaymentAllocationService(payment.id)
            allocation_result = allocator.allocate()

            if allocation_result.get('success'):
                return {
                    'success': True,
                    'payment': payment.to_dict(),
                    'allocation': allocation_result,
                    'message': f"Payment received from {tenant.name} (House {house_no})"
                }
            else:
                # If allocation fails, still mark as paid
                payment.status = 'paid'
                db.session.commit()
                return {
                    'success': True,
                    'payment': payment.to_dict(),
                    'message': f"Payment recorded but allocation failed: {allocation_result.get('error', 'Unknown error')}"
                }

        except Exception as e:
            logger.error(f"Error processing Paybill payment: {str(e)}")
            db.session.rollback()
            return {'success': False, 'error': str(e)}

    def confirm_payment(self, payment_id, transaction_data):
        """Confirm payment after callback"""
        try:
            payment = Payment.query.get(payment_id)
            if not payment:
                raise ValueError("Payment not found")

            # Update payment - FIXED: use 'paid' instead of 'completed'
            payment.status = 'paid'  # ✅ CHANGED from 'completed' to 'paid'
            payment.completed_at = datetime.now()
            payment.mpesa_receipt_number = transaction_data.get('mpesa_receipt_number')
            payment.transaction_id = transaction_data.get('transaction_id')
            payment.result_code = transaction_data.get('result_code', '0')
            payment.result_description = transaction_data.get('result_description', 'Success')

            # Update tenant balance
            tenant = Tenant.query.get(payment.tenant_id)
            if tenant:
                tenant.balance = (tenant.balance or 0) - payment.amount

            db.session.commit()

            # Send receipt via WhatsApp
            NotificationService.send_receipt(tenant, payment)

            return {'success': True, 'payment': payment.to_dict()}

        except Exception as e:
            logger.error(f"Error confirming payment: {str(e)}")
            db.session.rollback()
            return {'success': False, 'error': str(e)}

    def process_mpesa_callback(self, callback_data):
        """Process M-Pesa callback"""
        try:
            # Parse callback using MpesaService
            parsed = self.mpesa.parse_callback(callback_data)

            if parsed.get('success'):
                # Find payment by checkout request ID
                checkout_id = callback_data.get('Body', {}).get('stkCallback', {}).get('CheckoutRequestID')
                payment = Payment.query.filter_by(checkout_request_id=checkout_id).first()

                if not payment:
                    # Try by merchant request ID
                    merchant_id = callback_data.get('Body', {}).get('stkCallback', {}).get('MerchantRequestID')
                    payment = Payment.query.filter_by(merchant_request_id=merchant_id).first()

                if payment:
                    # Update payment
                    transaction_data = {
                        'mpesa_receipt_number': parsed.get('receipt_no'),
                        'transaction_id': parsed.get('mpesa_code'),
                        'result_code': parsed.get('result_code', '0'),
                        'result_description': parsed.get('result_desc', 'Success')
                    }

                    return self.confirm_payment(payment.id, transaction_data)

                # If no payment found, check if it's a Paybill payment
                # Get account reference from callback
                account_ref = callback_data.get('Body', {}).get('stkCallback', {}).get('AccountReference')
                if account_ref and '#' in account_ref:
                    amount = parsed.get('amount', 0)
                    phone = parsed.get('phone', '')
                    mpesa_code = parsed.get('mpesa_code', '')
                    return self.process_paybill_payment(account_ref, amount, phone, mpesa_code)

                return {'success': False, 'error': 'Payment not found'}

            return {'success': False, 'error': parsed.get('message', 'Callback processing failed')}

        except Exception as e:
            logger.error(f"Error processing M-Pesa callback: {str(e)}")
            return {'success': False, 'error': str(e)}

    def check_payment_status(self, checkout_request_id):
        """Check payment status"""
        try:
            payment = Payment.query.filter_by(checkout_request_id=checkout_request_id).first()
            if not payment:
                return {'success': False, 'error': 'Payment not found'}

            # Query status from M-Pesa
            result = self.mpesa.query_status(checkout_request_id)

            if result.get('success'):
                data = result.get('data', {})
                result_code = data.get('ResultCode')

                if result_code == '0':
                    # Payment successful
                    return self.confirm_payment(payment.id, {
                        'mpesa_receipt_number': data.get('MpesaReceiptNumber'),
                        'transaction_id': data.get('TransactionID'),
                        'result_code': result_code,
                        'result_description': data.get('ResultDesc', 'Success')
                    })
                else:
                    # Payment failed
                    payment.status = 'failed'
                    payment.failed_at = datetime.now()
                    payment.result_code = result_code
                    payment.result_description = data.get('ResultDesc', 'Payment failed')
                    db.session.commit()

                    return {
                        'success': False,
                        'payment': payment.to_dict(),
                        'message': payment.result_description
                    }

            return {'success': False, 'error': result.get('error', 'Status check failed')}

        except Exception as e:
            logger.error(f"Error checking payment status: {str(e)}")
            return {'success': False, 'error': str(e)}

    def create_manual_payment(self, tenant_id, amount, payment_method='cash', notes=None):
        """Create a manual payment (cash, bank, cheque)"""
        try:
            tenant = Tenant.query.get(tenant_id)
            if not tenant:
                raise ValueError("Tenant not found")

            # Generate receipt number
            receipt_no = f"RCP-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

            payment = Payment(
                property_id=tenant.property_id,
                tenant_id=tenant.id,
                unit_id=tenant.unit_id,
                amount=amount,
                receipt_no=receipt_no,
                payment_method=payment_method,
                status='paid',  # ✅ CHANGED from 'completed' to 'paid'
                payment_for_month=datetime.now().date(),
                payment_date=datetime.now(),
                completed_at=datetime.now(),
                notes=notes
            )

            db.session.add(payment)
            db.session.flush()

            # Allocate payment
            from App.Services.PaymentAllocationService import PaymentAllocationService
            allocator = PaymentAllocationService(payment.id)
            allocation_result = allocator.allocate()

            return {
                'success': True,
                'payment': payment.to_dict(),
                'allocation': allocation_result
            }

        except Exception as e:
            logger.error(f"Error creating manual payment: {str(e)}")
            db.session.rollback()
            return {'success': False, 'error': str(e)}

    def get_payment_history(self, tenant_id=None, property_id=None, status=None, limit=50, offset=0):
        """Get payment history with filters"""
        try:
            query = Payment.query

            if tenant_id:
                query = query.filter_by(tenant_id=tenant_id)
            if property_id:
                query = query.filter_by(property_id=property_id)
            if status:
                query = query.filter_by(status=status)

            total = query.count()
            payments = query.order_by(Payment.payment_date.desc()).limit(limit).offset(offset).all()

            return {
                'success': True,
                'payments': [p.to_dict() for p in payments],
                'total': total,
                'limit': limit,
                'offset': offset
            }

        except Exception as e:
            logger.error(f"Error getting payment history: {str(e)}")
            return {'success': False, 'error': str(e)}

    def get_payment_summary(self, property_id=None):
        """Get payment summary statistics"""
        try:
            query = Payment.query

            if property_id:
                query = query.filter_by(property_id=property_id)

            total_collected = sum([p.amount for p in query.filter_by(status='paid').all()])  # ✅ CHANGED from 'completed' to 'paid'
            pending = query.filter_by(status='pending').count()
            failed = query.filter_by(status='failed').count()

            return {
                'success': True,
                'summary': {
                    'total_collected': total_collected,
                    'pending': pending,
                    'failed': failed,
                    'total_payments': query.count()
                }
            }

        except Exception as e:
            logger.error(f"Error getting payment summary: {str(e)}")
            return {'success': False, 'error': str(e)}