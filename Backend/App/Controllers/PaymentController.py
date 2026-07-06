# App/Controllers/PaymentController.py
from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from App.Extension import db
from App.Models.PaymentModel import Payment
from App.Models.TenantModel import Tenant
from App.Models.PropertyModel import Property
from datetime import datetime
import uuid


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

        # In production, this would call Safaricom Daraja API
        # For now, return mock response

        return jsonify({
            'message': 'STK Push initiated successfully',
            'checkoutRequestID': f'ws_CO_{datetime.now().strftime("%Y%m%d%H%M%S")}',
            'responseCode': '0',
            'responseDescription': 'Success. Request accepted for processing'
        }), 200

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