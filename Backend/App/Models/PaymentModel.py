# App/Models/PaymentModel.py
from App.Extension import db
from datetime import datetime


class Payment(db.Model):
    __tablename__ = 'payments'

    id = db.Column(db.Integer, primary_key=True)
    property_id = db.Column(db.Integer, db.ForeignKey('properties.id'))
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenants.id'))
    unit_id = db.Column(db.Integer, db.ForeignKey('units.id'))

    # Payment details
    amount = db.Column(db.Float, nullable=False)
    receipt_no = db.Column(db.String(50), unique=True)
    payment_date = db.Column(db.DateTime, default=datetime.utcnow)
    payment_method = db.Column(db.String(20))  # mpesa, cash, bank, cheque
    status = db.Column(db.String(20), default='pending')  # pending, completed, failed

    # M-Pesa specific fields
    mpesa_code = db.Column(db.String(50))
    phone_number = db.Column(db.String(20))
    merchant_request_id = db.Column(db.String(50))
    checkout_request_id = db.Column(db.String(50))
    mpesa_receipt_number = db.Column(db.String(50))
    transaction_id = db.Column(db.String(50))
    result_code = db.Column(db.String(10))
    result_description = db.Column(db.String(255))

    # Timestamps
    payment_for_month = db.Column(db.Date)
    completed_at = db.Column(db.DateTime)
    failed_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Notes
    notes = db.Column(db.Text)

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
            'status': self.status,
            'mpesa_code': self.mpesa_code,
            'phone_number': self.phone_number,
            'checkout_request_id': self.checkout_request_id,
            'mpesa_receipt_number': self.mpesa_receipt_number,
            'payment_for_month': self.payment_for_month.isoformat() if self.payment_for_month else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'notes': self.notes,
            'tenantName': self.tenant.name if self.tenant else None,
            'houseNo': self.tenant.unit.unit_number if self.tenant and self.tenant.unit else None
        }