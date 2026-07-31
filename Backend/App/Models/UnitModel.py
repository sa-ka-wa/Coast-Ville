# App/Models/UnitModel.py
from App.Extension import db
from datetime import datetime


class Unit(db.Model):
    __tablename__ = 'units'

    id = db.Column(db.Integer, primary_key=True)
    property_id = db.Column(db.Integer, db.ForeignKey('properties.id'))
    unit_number = db.Column(db.String(20), nullable=False)
    floor = db.Column(db.String(10))
    unit_type = db.Column(db.String(20))
    monthly_rent = db.Column(db.Float)
    deposit = db.Column(db.Float)
    status = db.Column(db.String(20), default='available')
    size_sqft = db.Column(db.Integer)
    bedrooms = db.Column(db.Integer)
    bathrooms = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships - All defined here
    property = db.relationship('Property', back_populates='units')
    tenant = db.relationship('Tenant', back_populates='unit', uselist=False)
    payments = db.relationship('Payment', back_populates='unit')
    water_bills = db.relationship('WaterBill', back_populates='unit')
    water_readings = db.relationship('WaterReading', back_populates='unit')

    def to_dict(self):
        return {
            'id': self.id,
            'property_id': self.property_id,
            'unit_number': self.unit_number,
            'floor': self.floor,
            'unit_type': self.unit_type,
            'monthly_rent': self.monthly_rent,
            'deposit': self.deposit,
            'status': self.status,
            'size_sqft': self.size_sqft,
            'bedrooms': self.bedrooms,
            'bathrooms': self.bathrooms
        }