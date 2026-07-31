# App/Models/WaterReadingModel.py
from App.Extension import db
from datetime import datetime


# App/Models/WaterReadingModel.py - Update the WaterReading class

class WaterReading(db.Model):
    __tablename__ = 'water_readings'

    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenants.id'))
    unit_id = db.Column(db.Integer, db.ForeignKey('units.id'))  # ✅ Add this field
    previous_reading = db.Column(db.Float)
    current_reading = db.Column(db.Float)
    units_used = db.Column(db.Float)
    rate = db.Column(db.Float, default=70)
    amount = db.Column(db.Float)
    reading_date = db.Column(db.Date)
    notes = db.Column(db.Text)
    status = db.Column(db.String(50), default='pending')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    tenant = db.relationship('Tenant', back_populates='water_readings')
    unit = db.relationship('Unit', back_populates='water_readings')  # ✅ Add relationship

    @classmethod
    def get_latest_reading_for_unit(cls, unit_id):
        """Get the most recent water reading for a unit"""
        try:
            reading = cls.query.filter_by(unit_id=unit_id) \
                .order_by(cls.reading_date.desc()) \
                .first()
            return reading
        except Exception as e:
            print(f"Error getting latest reading for unit: {e}")
            return None

    @classmethod
    def get_previous_reading_for_tenant(cls, tenant_id):
        """Get the previous reading for a tenant"""
        try:
            # First get the tenant to get their unit
            from App.Models.TenantModel import Tenant
            tenant = Tenant.query.get(tenant_id)
            if not tenant:
                return 0

            # Get the latest reading for this unit
            latest = cls.get_latest_reading_for_unit(tenant.unit_id)
            if latest:
                return latest.current_reading
            return 0
        except Exception as e:
            print(f"Error getting previous reading for tenant: {e}")
            return 0

    @classmethod
    def get_previous_reading_for_unit(cls, unit_id):
        """Get the previous reading for a unit (for new tenants)"""
        try:
            latest = cls.get_latest_reading_for_unit(unit_id)
            if latest:
                return latest.current_reading
            return 0
        except Exception as e:
            print(f"Error getting previous reading for unit: {e}")
            return 0

    def to_dict(self):
        return {
            'id': self.id,
            'tenant_id': self.tenant_id,
            'unit_id': self.unit_id,
            'tenant_name': self.tenant.name if self.tenant else None,
            'house_no': self.unit.unit_number if self.unit else None,
            'previous_reading': self.previous_reading,
            'current_reading': self.current_reading,
            'units_used': self.units_used,
            'rate': self.rate,
            'amount': self.amount,
            'reading_date': self.reading_date.isoformat() if self.reading_date else None,
            'notes': self.notes,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


# App/Models/WaterReadingModel.py - Update the WaterBill class

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

    # Water bill tracking fields
    paid_amount = db.Column(db.Float, default=0)
    total_remaining = db.Column(db.Float, default=0)
    paid_at = db.Column(db.DateTime)
    payment_id = db.Column(db.Integer, db.ForeignKey('payments.id'))

    # ✅ Relationships
    property = db.relationship('Property', back_populates='water_bills')
    tenant = db.relationship('Tenant', back_populates='water_bills')
    unit = db.relationship('Unit', back_populates='water_bills')

    # ✅ Payment relationship
    payment = db.relationship(
        'Payment',
        foreign_keys=[payment_id],
        uselist=False
    )

    def to_dict(self):
        return {
            'id': self.id,
            'property_id': self.property_id,
            'tenant_id': self.tenant_id,
            'unit_id': self.unit_id,
            'tenantName': self.tenant.name if self.tenant else None,
            'houseNo': self.unit.unit_number if self.unit else None,
            'month': self.month.isoformat() if self.month else None,
            'waterCharge': self.water_charge,
            'garbageCharge': self.garbage_charge,
            'total': self.total,
            'status': self.status,
            'paid_amount': self.paid_amount,
            'total_remaining': self.total_remaining,
            'paid_at': self.paid_at.isoformat() if self.paid_at else None,
            'payment_id': self.payment_id
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

    property = db.relationship('Property', back_populates='expenses')

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