# App/Models/PropertyModel.py
from App.Extension import db
from datetime import datetime


class Property(db.Model):
    __tablename__ = 'properties'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    address = db.Column(db.String(255))
    city = db.Column(db.String(50))
    county = db.Column(db.String(50))
    total_units = db.Column(db.Integer, default=0)
    status = db.Column(db.String(20), default='active')
    owner_name = db.Column(db.String(100))
    owner_phone = db.Column(db.String(15))
    owner_email = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships - All defined here
    units = db.relationship('Unit', back_populates='property', cascade='all, delete-orphan')
    tenants = db.relationship('Tenant', back_populates='property')
    payments = db.relationship('Payment', back_populates='property')
    water_bills = db.relationship('WaterBill', back_populates='property')
    expenses = db.relationship('Expense', back_populates='property')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'address': self.address,
            'city': self.city,
            'county': self.county,
            'total_units': self.total_units,
            'status': self.status,
            'owner_name': self.owner_name,
            'owner_phone': self.owner_phone,
            'owner_email': self.owner_email,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }