# App/Models/PaymentModel.py
from App.Extension import db
from datetime import datetime


class Payment(db.Model):
    __tablename__ = 'payments'

    id = db.Column(db.Integer, primary_key=True)
    property_id = db.Column(db.Integer, db.ForeignKey('properties.id'))
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenants.id'))
    unit_id = db.Column(db.Integer, db.ForeignKey('units.id'))

    amount = db.Column(db.Float, nullable=False)
    receipt_no = db.Column(db.String(20), unique=True)
    payment_date = db.Column(db.DateTime, default=datetime.utcnow)
    payment_method = db.Column(db.String(20))  # mpesa, cash, bank, cheque
    mpesa_code = db.Column(db.String(20))
    status = db.Column(db.String(20), default='pending')
    payment_for_month = db.Column(db.Date)
    notes = db.Column(db.Text)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'property_id': self.property_id,
            'tenant_id': self.tenant_id,
            'unit_id': self.unit_id,
            'amount': self.amount,
            'receipt_no': self.receipt_no,
            'payment_date': self.payment_date.isoformat() if self.payment_date else None,
            'payment_method': self.payment_method,
            'mpesa_code': self.mpesa_code,
            'status': self.status,
            'payment_for_month': self.payment_for_month.isoformat() if self.payment_for_month else None,
            'tenantName': self.tenant.name if self.tenant else None,
            'houseNo': self.tenant.unit.unit_number if self.tenant and self.tenant.unit else None
        }