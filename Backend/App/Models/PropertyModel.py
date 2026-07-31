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

    # ✅ NEW: M-Pesa Paybill Configuration
    mpesa_paybill = db.Column(db.String(20))  # Paybill number (e.g., 247247)
    mpesa_account_prefix = db.Column(db.String(20))  # Last 8 digits of phone (e.g., 40766915)

    # ✅ NEW: Property-specific billing settings
    water_rate = db.Column(db.Float, default=70.0)
    garbage_fee = db.Column(db.Float, default=300.0)
    late_fee_percentage = db.Column(db.Float, default=5.0)

    # ✅ NEW: Payment configuration
    payment_phone_number = db.Column(db.String(20))  # M-Pesa phone number
    payment_account_name = db.Column(db.String(100))  # Account name for payments

    # Bank details (optional)
    bank_name = db.Column(db.String(100))
    bank_account_number = db.Column(db.String(50))
    bank_branch = db.Column(db.String(100))

    # ✅ NEW: Contact information
    manager_name = db.Column(db.String(100))
    manager_phone = db.Column(db.String(15))
    manager_email = db.Column(db.String(100))
    office_hours = db.Column(db.String(100))
    emergency_contact = db.Column(db.String(15))

    # ✅ NEW: Property features
    amenities = db.Column(db.Text)
    parking_spaces = db.Column(db.Integer, default=0)
    has_security = db.Column(db.Boolean, default=False)
    has_water = db.Column(db.Boolean, default=True)
    has_electricity = db.Column(db.Boolean, default=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
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

            # M-Pesa Paybill
            'mpesa_paybill': self.mpesa_paybill,
            'mpesa_account_prefix': self.mpesa_account_prefix,

            # Billing settings
            'water_rate': self.water_rate,
            'garbage_fee': self.garbage_fee,
            'late_fee_percentage': self.late_fee_percentage,

            # Payment info
            'payment_phone_number': self.payment_phone_number,
            'payment_account_name': self.payment_account_name,
            'bank_name': self.bank_name,
            'bank_account_number': self.bank_account_number,
            'bank_branch': self.bank_branch,

            # Contact info
            'manager_name': self.manager_name,
            'manager_phone': self.manager_phone,
            'manager_email': self.manager_email,
            'office_hours': self.office_hours,
            'emergency_contact': self.emergency_contact,

            # Features
            'amenities': self.amenities,
            'parking_spaces': self.parking_spaces,
            'has_security': self.has_security,
            'has_water': self.has_water,
            'has_electricity': self.has_electricity,

            'created_at': self.created_at.isoformat() if self.created_at else None
        }

    def get_payment_instructions(self):
        """Get payment instructions for this property"""
        instructions = []
        if self.mpesa_paybill:
            instructions.append(f"Paybill: {self.mpesa_paybill}")
        if self.mpesa_account_prefix:
            instructions.append(
                f"Account: {self.mpesa_account_prefix}#HOUSE_NO (e.g., {self.mpesa_account_prefix}#A01)")
        if self.payment_phone_number:
            instructions.append(f"Alternative: M-Pesa {self.payment_phone_number}")
        if self.payment_account_name:
            instructions.append(f"Account Name: {self.payment_account_name}")
        if self.bank_name and self.bank_account_number:
            instructions.append(f"Bank: {self.bank_name} (Account: {self.bank_account_number})")
        return instructions

    def generate_account_reference(self, house_no):
        """Generate account reference for M-Pesa payment"""
        # Format: PHONE_LAST_8#HOUSE (e.g., 40766915#A01)
        if self.mpesa_account_prefix:
            return f"{self.mpesa_account_prefix}#{house_no}"
        return house_no

    def calculate_water_bill(self, units_used):
        """Calculate water bill using property's rate"""
        return units_used * (self.water_rate or 70.0)

    def calculate_garbage_fee(self):
        """Get garbage fee for this property"""
        return self.garbage_fee or 300.0

    def calculate_late_fee(self, amount_due):
        """Calculate late fee based on property's percentage"""
        return amount_due * (self.late_fee_percentage or 5.0) / 100.0