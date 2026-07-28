# App/Models/TenantModel.py
from App.Extension import db
from datetime import datetime


class Tenant(db.Model):
    __tablename__ = 'tenants'

    id = db.Column(db.Integer, primary_key=True)
    property_id = db.Column(db.Integer, db.ForeignKey('properties.id'))
    unit_id = db.Column(db.Integer, db.ForeignKey('units.id'))

    name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(15))
    email = db.Column(db.String(100))
    id_number = db.Column(db.String(20))
    monthly_rent = db.Column(db.Float)
    deposit = db.Column(db.Float)
    balance = db.Column(db.Float, default=0)
    move_in_date = db.Column(db.Date)
    move_out_date = db.Column(db.Date)
    status = db.Column(db.String(20), default='active')
    emergency_contact_name = db.Column(db.String(100))
    emergency_contact_phone = db.Column(db.String(15))
    notes = db.Column(db.Text)
    deposit_paid = db.Column(db.Boolean, default=False)
    deposit_paid_amount = db.Column(db.Float, default=0)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships - All defined here
    property = db.relationship('Property', back_populates='tenants')
    unit = db.relationship('Unit', back_populates='tenant')
    payments = db.relationship('Payment', back_populates='tenant')
    water_readings = db.relationship('WaterReading', back_populates='tenant')
    water_bills = db.relationship('WaterBill', back_populates='tenant')

    def to_dict(self):
        house_no = None
        if self.unit:
            house_no = self.unit.unit_number

        return {
            'id': self.id,
            'property_id': self.property_id,
            'unit_id': self.unit_id,
            'name': self.name,
            'phone': self.phone,
            'email': self.email,
            'id_number': self.id_number,
            'monthly_rent': self.monthly_rent,
            'deposit': self.deposit,
            'balance': self.balance,
            'move_in_date': self.move_in_date.isoformat() if self.move_in_date else None,
            'move_out_date': self.move_out_date.isoformat() if self.move_out_date else None,
            'status': self.status,
            'emergency_contact_name': self.emergency_contact_name,
            'emergency_contact_phone': self.emergency_contact_phone,
            'notes': self.notes,
            'houseNo': house_no if house_no else None
        }

    # App/Models/TenantModel.py - Add these methods at the end of the class

    def get_monthly_statement(self, year=None, month=None):
        """
        Get complete monthly statement for this tenant.
        Returns: {
            'tenant': dict,
            'month': str,
            'rent_due': float,
            'water_due': float,
            'total_due': float,
            'total_paid': float,
            'balance': float,  # Positive = owes, Negative = credit
            'payments': list,
            'water_bills': list
        }
        """
        from datetime import datetime
        from sqlalchemy import func
        from App.Models.PaymentModel import Payment
        from App.Models.WaterReadingModel import WaterBill

        if year is None or month is None:
            now = datetime.now()
            year = now.year
            month = now.month

        month_name = datetime(year, month, 1).strftime('%B %Y')

        # Get payments for this month
        payments = Payment.query.filter(
            Payment.tenant_id == self.id,
            func.extract('year', Payment.payment_for_month) == year,
            func.extract('month', Payment.payment_for_month) == month,
            Payment.status == 'paid'
        ).all()

        # Get water bills for this month
        water_bills = WaterBill.query.filter(
            WaterBill.tenant_id == self.id,
            func.extract('year', WaterBill.month) == year,
            func.extract('month', WaterBill.month) == month
        ).all()

        # Calculate totals
        total_paid = sum([p.amount for p in payments])
        total_rent_paid = sum([p.rent_amount or 0 for p in payments])
        total_water_paid = sum([p.water_amount or 0 for p in payments])

        # Rent due (monthly rent)
        rent_due = self.monthly_rent or 0

        # Water due
        water_due = sum([b.total for b in water_bills if b.status != 'paid'])

        # Total due = rent + water
        total_due = rent_due + water_due

        # Balance = total_due - total_paid
        # Positive = owes money, Negative = has credit
        balance = total_due - total_paid

        # Check for excess from previous months (credit)
        total_excess = sum([p.excess_amount or 0 for p in payments])

        return {
            'tenant': self.to_dict(),
            'month': month_name,
            'year': year,
            'month_num': month,
            'rent_due': rent_due,
            'water_due': water_due,
            'total_due': total_due,
            'total_paid': total_paid,
            'total_rent_paid': total_rent_paid,
            'total_water_paid': total_water_paid,
            'balance': balance,
            'total_excess': total_excess,
            'payment_count': len(payments),
            'payments': [p.to_dict() for p in payments],
            'water_bills': [b.to_dict() for b in water_bills],
            'has_credit': total_excess > 0,
            'credit_amount': total_excess if total_excess > 0 else 0,
            'status': 'paid' if balance <= 0 else 'partial' if total_paid > 0 else 'unpaid'
        }

    @classmethod
    def get_all_tenant_statements(cls, property_id=None, year=None, month=None):
        """
        Get monthly statements for all tenants.
        """
        from datetime import datetime

        if year is None or month is None:
            now = datetime.now()
            year = now.year
            month = now.month

        query = cls.query.filter_by(status='active')
        if property_id:
            query = query.filter_by(property_id=property_id)

        tenants = query.all()
        statements = []
        total_collected = 0
        total_due = 0
        total_balance = 0

        for tenant in tenants:
            statement = tenant.get_monthly_statement(year, month)
            statements.append(statement)
            total_collected += statement['total_paid']
            total_due += statement['total_due']
            total_balance += statement['balance']

        return {
            'statements': statements,
            'summary': {
                'total_tenants': len(tenants),
                'total_collected': total_collected,
                'total_due': total_due,
                'total_balance': total_balance,
                'month': datetime(year, month, 1).strftime('%B %Y'),
                'year': year,
                'month_num': month
            }
        }