# App/Models/WaterReadingModel.py
from App.Extension import db
from datetime import datetime


class WaterReading(db.Model):
    __tablename__ = 'water_readings'

    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenants.id'))

    previous_reading = db.Column(db.Float)
    current_reading = db.Column(db.Float)
    units_used = db.Column(db.Float)
    rate = db.Column(db.Float, default=70)
    amount = db.Column(db.Float)
    reading_date = db.Column(db.Date)
    notes = db.Column(db.Text)
    status = db.Column(db.String(20), default='pending')

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'tenant_id': self.tenant_id,
            'tenantName': self.tenant.name if self.tenant else None,
            'houseNo': self.tenant.unit.unit_number if self.tenant and self.tenant.unit else None,
            'previousReading': self.previous_reading,
            'currentReading': self.current_reading,
            'unitsUsed': self.units_used,
            'rate': self.rate,
            'amount': self.amount,
            'readingDate': self.reading_date.isoformat() if self.reading_date else None,
            'status': self.status
        }


class WaterBill(db.Model):
    __tablename__ = 'water_bills'

    id = db.Column(db.Integer, primary_key=True)
    property_id = db.Column(db.Integer, db.ForeignKey('properties.id'))
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenants.id'))
    unit_id = db.Column(db.Integer, db.ForeignKey('units.id'))

    month = db.Column(db.Date)
    water_charge = db.Column(db.Float)
    garbage_charge = db.Column(db.Float, default=300)
    total = db.Column(db.Float)
    status = db.Column(db.String(20), default='pending')

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'property_id': self.property_id,
            'tenant_id': self.tenant_id,
            'unit_id': self.unit_id,
            'tenantName': self.tenant.name if self.tenant else None,
            'houseNo': self.tenant.unit.unit_number if self.tenant and self.tenant.unit else None,
            'month': self.month.isoformat() if self.month else None,
            'waterCharge': self.water_charge,
            'garbageCharge': self.garbage_charge,
            'total': self.total,
            'status': self.status
        }


class Expense(db.Model):
    __tablename__ = 'expenses'

    id = db.Column(db.Integer, primary_key=True)
    property_id = db.Column(db.Integer, db.ForeignKey('properties.id'))

    category = db.Column(db.String(50))
    description = db.Column(db.Text)
    amount = db.Column(db.Float)
    expense_date = db.Column(db.Date)
    receipt_no = db.Column(db.String(20))
    vendor_name = db.Column(db.String(100))
    notes = db.Column(db.Text)
    status = db.Column(db.String(20), default='pending')

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'property_id': self.property_id,
            'category': self.category,
            'description': self.description,
            'amount': self.amount,
            'expense_date': self.expense_date.isoformat() if self.expense_date else None,
            'receipt_no': self.receipt_no,
            'vendor_name': self.vendor_name,
            'notes': self.notes,
            'status': self.status
        }