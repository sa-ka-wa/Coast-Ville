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

    # Relationships
    units = db.relationship('Unit', backref='property', lazy=True, cascade='all, delete-orphan')
    tenants = db.relationship('Tenant', backref='property', lazy=True)
    payments = db.relationship('Payment', backref='property', lazy=True)
    water_bills = db.relationship('WaterBill', backref='property', lazy=True)
    expenses = db.relationship('Expense', backref='property', lazy=True)

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