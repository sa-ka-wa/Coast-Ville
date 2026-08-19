# App/Models/PaymentModel.py
from App.Extension import db
from datetime import datetime
from itsdangerous import URLSafeTimedSerializer
from flask import current_app


class Payment(db.Model):
    __tablename__ = 'payments'

    id = db.Column(db.Integer, primary_key=True)
    property_id = db.Column(db.Integer, db.ForeignKey('properties.id'))
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenants.id'))
    unit_id = db.Column(db.Integer, db.ForeignKey('units.id'))

    amount = db.Column(db.Float, nullable=False)
    account_reference = db.Column(db.String(50))
    receipt_no = db.Column(db.String(50), unique=True)
    payment_date = db.Column(db.DateTime, default=datetime.utcnow)
    payment_method = db.Column(db.String(20))

    # M-Pesa specific fields
    phone_number = db.Column(db.String(20))
    checkout_request_id = db.Column(db.String(50))
    merchant_request_id = db.Column(db.String(50))
    mpesa_code = db.Column(db.String(50))
    mpesa_receipt_number = db.Column(db.String(50))
    transaction_id = db.Column(db.String(50))

    # ✅ ALLOCATION FIELDS
    rent_amount = db.Column(db.Float, default=0)
    water_amount = db.Column(db.Float, default=0)
    deposit_amount = db.Column(db.Float, default=0)
    other_amount = db.Column(db.Float, default=0)

    # Payment tracking
    payment_type = db.Column(db.String(20))
    is_deposit = db.Column(db.Boolean, default=False)
    is_water_payment = db.Column(db.Boolean, default=False)

    # Excess/credit tracking
    excess_amount = db.Column(db.Float, default=0)
    balance_due = db.Column(db.Float, default=0)
    credited_to_next_month = db.Column(db.Boolean, default=False)

    # ✅ REMOVED: water_bill_id - we don't need this on Payment

    # Reversal fields
    reversed = db.Column(db.Boolean, default=False)
    reversal_reason = db.Column(db.String(50))
    reversed_at = db.Column(db.DateTime)
    reversed_by = db.Column(db.Integer, db.ForeignKey('users.id'))

    status = db.Column(db.String(20), default='pending')
    payment_for_month = db.Column(db.Date)
    notes = db.Column(db.Text)

    # Result tracking
    result_code = db.Column(db.String(10))
    result_description = db.Column(db.String(255))
    completed_at = db.Column(db.DateTime)
    failed_at = db.Column(db.DateTime)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # ✅ RELATIONSHIPS
    property = db.relationship('Property', back_populates='payments')
    tenant = db.relationship('Tenant', back_populates='payments')
    unit = db.relationship('Unit', back_populates='payments')

    # ✅ Remove water_bill relationship - it's defined on WaterBill side

    def to_dict(self):
        tenant_name = None
        house_no = None
        if self.tenant:
            tenant_name = self.tenant.name
            if self.tenant.unit:
                house_no = self.tenant.unit.unit_number

        return {
            'id': self.id,
            'property_id': self.property_id,
            'tenant_id': self.tenant_id,
            'unit_id': self.unit_id,
            'amount': self.amount,
            'account_reference': self.account_reference,
            'receipt_no': self.receipt_no,
            'payment_date': self.payment_date.isoformat() if self.payment_date else None,
            'payment_method': self.payment_method,
            'phone_number': self.phone_number,
            'mpesa_code': self.mpesa_code,
            'mpesa_receipt_number': self.mpesa_receipt_number,
            'checkout_request_id': self.checkout_request_id,
            'merchant_request_id': self.merchant_request_id,
            'rent_amount': self.rent_amount,
            'water_amount': self.water_amount,
            'deposit_amount': self.deposit_amount,
            'excess_amount': self.excess_amount,
            'balance_due': self.balance_due,
            'credited_to_next_month': self.credited_to_next_month,
            'is_deposit': self.is_deposit,
            'is_water_payment': self.is_water_payment,
            'payment_type': self.payment_type,
            'status': self.status,
            'payment_for_month': self.payment_for_month.isoformat() if self.payment_for_month else None,
            'result_code': self.result_code,
            'result_description': self.result_description,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'notes': self.notes,
            'tenantName': tenant_name,
            'houseNo': house_no,
            'reversed': self.reversed,
            'reversal_reason': self.reversal_reason,
            'reversed_at': self.reversed_at.isoformat() if self.reversed_at else None
        }

    # App/Models/PaymentModel.py - Add these methods at the end of the class

    @classmethod
    def get_monthly_summary(cls, tenant_id, year=None, month=None):
        """
        Get monthly payment summary for a tenant.
        """
        from datetime import datetime
        from sqlalchemy import func

        if year is None or month is None:
            now = datetime.now()
            year = now.year
            month = now.month

        # Get all payments for the tenant in that month
        payments = cls.query.filter(
            cls.tenant_id == tenant_id,
            func.extract('year', cls.payment_for_month) == year,
            func.extract('month', cls.payment_for_month) == month,
            cls.status == 'paid'
        ).all()

        if not payments:
            return {
                'total_paid': 0,
                'total_rent': 0,
                'total_water': 0,
                'total_deposit': 0,
                'total_excess': 0,
                'balance_due': 0,
                'payment_count': 0,
                'month': month,
                'year': year,
                'month_name': datetime(year, month, 1).strftime('%B %Y')
            }

        # Calculate totals
        total_paid = sum([p.amount for p in payments])
        total_rent = sum([p.rent_amount or 0 for p in payments])
        total_water = sum([p.water_amount or 0 for p in payments])
        total_deposit = sum([p.deposit_amount or 0 for p in payments])
        total_excess = sum([p.excess_amount or 0 for p in payments])
        total_balance_due = sum([p.balance_due or 0 for p in payments])

        return {
            'total_paid': total_paid,
            'total_rent': total_rent,
            'total_water': total_water,
            'total_deposit': total_deposit,
            'total_excess': total_excess,
            'balance_due': total_balance_due,
            'payment_count': len(payments),
            'month': month,
            'year': year,
            'month_name': datetime(year, month, 1).strftime('%B %Y')
        }
    def generate_receipt_token(self):
        serializer = URLSafeTimedSerializer(current_app.config['SECRET_KEY'])
        return serializer.dumps(self.id, salt='receipt-token')

    @staticmethod
    def verify_receipt_token(token):
        try:
            serializer = URLSafeTimedSerializer(current_app.config['SECRET_KEY'])
            payment_id = serializer.loads(token, salt='receipt-token', max_age=86400 * 7)  # 7 days
            return payment_id
        except Exception:
            return None