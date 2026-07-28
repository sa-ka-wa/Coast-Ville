from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from App.Services.SMSService import SMSService
from App.Models.TenantModel import Tenant
from App.Models.PaymentModel import Payment
from App.Models.WaterReadingModel import WaterBill
import logging

logger = logging.getLogger(__name__)


class SMSController:

    @staticmethod
    @jwt_required()
    def send_test_sms():
        """Send test SMS to verify configuration"""
        data = request.json
        phone = data.get('phone')

        if not phone:
            return jsonify({'error': 'Phone number required'}), 400

        result = SMSService.send_test_sms(phone)
        return jsonify(result), 200 if result.get('success') else 400

    @staticmethod
    @jwt_required()
    def send_rent_reminder():
        """Send rent reminder to tenant"""
        data = request.json
        tenant_id = data.get('tenant_id')
        month = data.get('month')

        if not tenant_id:
            return jsonify({'error': 'Tenant ID required'}), 400

        tenant = Tenant.query.get(tenant_id)
        if not tenant:
            return jsonify({'error': 'Tenant not found'}), 404

        from datetime import datetime
        month_name = month or datetime.now().strftime('%B %Y')
        result = SMSService.send_rent_reminder(tenant, month_name)
        return jsonify(result), 200 if result.get('success') else 400

    @staticmethod
    @jwt_required()
    def send_bulk_rent_reminders():
        """Send rent reminders to all active tenants"""
        data = request.json
        property_id = data.get('property_id')
        month = data.get('month')

        from datetime import datetime
        month_name = month or datetime.now().strftime('%B %Y')

        query = Tenant.query.filter_by(status='active')
        if property_id:
            query = query.filter_by(property_id=property_id)

        tenants = query.all()
        results = []

        for tenant in tenants:
            result = SMSService.send_rent_reminder(tenant, month_name)
            results.append({
                'tenant_id': tenant.id,
                'tenant_name': tenant.name,
                'sent': result.get('success', False),
                'simulated': result.get('simulated', False)
            })

        return jsonify({
            'total': len(tenants),
            'sent': sum(1 for r in results if r['sent']),
            'results': results
        }), 200

    @staticmethod
    @jwt_required()
    def send_receipt():
        """Send payment receipt to tenant"""
        data = request.json
        payment_id = data.get('payment_id')
        tenant_id = data.get('tenant_id')

        if payment_id:
            payment = Payment.query.get(payment_id)
            if not payment:
                return jsonify({'error': 'Payment not found'}), 404
            tenant = Tenant.query.get(payment.tenant_id)
        elif tenant_id:
            tenant = Tenant.query.get(tenant_id)
            if not tenant:
                return jsonify({'error': 'Tenant not found'}), 404
            payment = Payment.query.filter_by(tenant_id=tenant_id).order_by(Payment.payment_date.desc()).first()
        else:
            return jsonify({'error': 'Payment ID or Tenant ID required'}), 400

        if not payment:
            return jsonify({'error': 'No payment found'}), 404

        result = SMSService.send_rent_payment_receipt(tenant, payment)
        return jsonify(result), 200 if result.get('success') else 400

    @staticmethod
    @jwt_required()
    def send_water_bill():
        """Send water bill notification to tenant"""
        data = request.json
        water_bill_id = data.get('water_bill_id')
        tenant_id = data.get('tenant_id')

        if water_bill_id:
            water_bill = WaterBill.query.get(water_bill_id)
            if not water_bill:
                return jsonify({'error': 'Water bill not found'}), 404
            tenant = Tenant.query.get(water_bill.tenant_id)
        elif tenant_id:
            tenant = Tenant.query.get(tenant_id)
            if not tenant:
                return jsonify({'error': 'Tenant not found'}), 404
            water_bill = WaterBill.query.filter_by(tenant_id=tenant_id).order_by(WaterBill.month.desc()).first()
        else:
            return jsonify({'error': 'Water bill ID or Tenant ID required'}), 400

        if not water_bill:
            return jsonify({'error': 'No water bill found'}), 404

        result = SMSService.send_water_bill_notification(tenant, water_bill)
        return jsonify(result), 200 if result.get('success') else 400

    @staticmethod
    @jwt_required()
    def send_statement():
        """Send monthly statement to tenant"""
        data = request.json
        tenant_id = data.get('tenant_id')
        month = data.get('month')

        if not tenant_id:
            return jsonify({'error': 'Tenant ID required'}), 400

        tenant = Tenant.query.get(tenant_id)
        if not tenant:
            return jsonify({'error': 'Tenant not found'}), 404

        from datetime import datetime
        month_date = datetime.strptime(month, '%Y-%m') if month else datetime.now()
        month_name = month_date.strftime('%B %Y')

        payments = Payment.query.filter_by(
            tenant_id=tenant_id,
            payment_for_month=month_date.replace(day=1)
        ).filter(Payment.status == 'paid').all()

        rent_amount = sum([p.rent_amount or 0 for p in payments])
        water_amount = sum([p.water_amount or 0 for p in payments])
        total_paid = sum([p.amount for p in payments])

        previous_balance = tenant.balance or 0
        expected_rent = tenant.monthly_rent or 0
        total_due = expected_rent + previous_balance - total_paid

        result = SMSService.send_monthly_statement(
            tenant, month_name, rent_amount, water_amount, previous_balance, total_due
        )
        return jsonify(result), 200 if result.get('success') else 400

    @staticmethod
    @jwt_required()
    def send_admin_notification():
        """Send admin notification"""
        data = request.json
        notification_type = data.get('type', 'test')

        if notification_type == 'payment':
            tenant_id = data.get('tenant_id')
            tenant = Tenant.query.get(tenant_id) if tenant_id else None
            payment_id = data.get('payment_id')
            payment = Payment.query.get(payment_id) if payment_id else None

            if not tenant or not payment:
                return jsonify({'error': 'Tenant and payment required'}), 400

            result = SMSService.notify_admin_payment_received(tenant, payment, payment.amount)
        else:
            result = SMSService.send_test_sms(SMSService.ADMIN_PHONE)

        return jsonify(result), 200 if result.get('success') else 400

    @staticmethod
    @jwt_required()
    def get_sms_history():
        """Get SMS history"""
        return jsonify({
            'history': [
                {
                    'id': 1,
                    'to': '254740766915',
                    'message': 'Test SMS',
                    'sent_at': '2026-07-14T07:52:00',
                    'status': 'sent'
                }
            ]
        }), 200
