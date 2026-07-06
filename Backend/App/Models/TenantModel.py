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

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    payments = db.relationship('Payment', backref='tenant', lazy=True)
    water_readings = db.relationship('WaterReading', backref='tenant', lazy=True)
    water_bills = db.relationship('WaterBill', backref='tenant', lazy=True)

    def to_dict(self):
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
            'houseNo': self.unit.unit_number if self.unit else None
        }