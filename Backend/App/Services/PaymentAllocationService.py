# App/Services/PaymentAllocationService.py

from App.Extension import db
from App.Models.TenantModel import Tenant
from App.Models.PaymentModel import Payment
from App.Models.WaterReadingModel import WaterBill
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class PaymentAllocationService:
    """Smart payment allocation service"""

    def __init__(self, payment_id):
        self.payment = Payment.query.get(payment_id)
        self.tenant = Tenant.query.get(self.payment.tenant_id) if self.payment else None
        self.allocations = []
        self.remaining = 0

    def allocate(self):
        """Main allocation method"""
        if not self.payment or not self.tenant:
            return {'error': 'Payment or tenant not found'}

        self.remaining = self.payment.amount

        # Track what's already paid
        deposit_paid = self.get_deposit_paid()
        deposit_total = self.tenant.deposit or 0
        deposit_remaining = max(0, deposit_total - deposit_paid)

        # Get outstanding water bills
        water_bills = self.get_outstanding_water_bills()
        total_water_owed = sum([b.total for b in water_bills])

        # Get current month rent
        current_rent = self.tenant.monthly_rent or 0

        result = {
            'success': False,
            'allocations': [],
            'message': '',
            'deposit_remaining': deposit_remaining,
            'water_remaining': total_water_owed,
            'rent_remaining': current_rent,
            'excess': 0,
            'balance_due': 0,
            'total_allocated': 0
        }

        # === SCENARIO 1: First Payment is Deposit ===
        if deposit_remaining > 0:
            self.allocate_deposit(deposit_remaining, result)

        # === SCENARIO 2: Allocate to Water Bills ===
        if self.remaining > 0:
            self.allocate_water(water_bills, result)

        # === SCENARIO 3: Allocate to Rent ===
        if self.remaining > 0:
            self.allocate_rent(current_rent, result)

        # Save the allocations
        self.save_allocations(result)

        return result

    def allocate_deposit(self, deposit_remaining, result):
        """Allocate payment to deposit first"""
        if self.remaining <= 0:
            return

        if self.remaining >= deposit_remaining:
            # Full deposit paid
            amount = deposit_remaining
            self.payment.deposit_amount = amount
            self.payment.is_deposit = True
            self.tenant.deposit_paid = True
            self.tenant.deposit_paid_amount = (self.tenant.deposit_paid_amount or 0) + amount
            result['allocations'].append({
                'type': 'deposit',
                'amount': amount,
                'description': f'🏦 Deposit paid in full: KSh {amount:,.2f}',
                'status': 'complete'
            })
            self.remaining -= amount
            result['deposit_remaining'] = 0
        else:
            # Partial deposit paid
            amount = self.remaining
            self.payment.deposit_amount = amount
            self.payment.is_deposit = True
            self.tenant.deposit_paid_amount = (self.tenant.deposit_paid_amount or 0) + amount
            result['allocations'].append({
                'type': 'deposit_partial',
                'amount': amount,
                'description': f'🏦 Partial deposit: KSh {amount:,.2f} (Remaining: KSh {deposit_remaining - amount:,.2f})',
                'status': 'partial'
            })
            self.remaining = 0
            result['deposit_remaining'] = deposit_remaining - amount

    def allocate_water(self, water_bills, result):
        """Allocate payment to water bills"""
        if self.remaining <= 0:
            return

        total_allocated = 0

        for bill in water_bills:
            if self.remaining <= 0:
                break

            if bill.status == 'paid':
                continue

            if self.remaining >= bill.total:
                # Full water bill paid
                amount = bill.total
                self.payment.water_amount += amount
                self.payment.is_water_payment = True
                bill.status = 'paid'
                bill.paid_at = datetime.now()
                bill.payment_id = self.payment.id
                bill.paid_amount = bill.total
                bill.total_remaining = 0
                result['allocations'].append({
                    'type': 'water',
                    'amount': amount,
                    'description': f'💧 Water bill paid: {bill.month.strftime("%B %Y")} - KSh {amount:,.2f}',
                    'status': 'complete'
                })
                self.remaining -= amount
                total_allocated += amount
            else:
                # Partial water bill
                amount = self.remaining
                self.payment.water_amount += amount
                self.payment.is_water_payment = True
                bill.paid_amount = (bill.paid_amount or 0) + amount
                bill.total_remaining = bill.total - bill.paid_amount
                result['allocations'].append({
                    'type': 'water_partial',
                    'amount': amount,
                    'description': f'💧 Partial water bill: KSh {amount:,.2f} (Remaining: KSh {bill.total - amount:,.2f})',
                    'status': 'partial'
                })
                self.remaining = 0
                total_allocated += amount

        result['water_remaining'] = total_allocated

    def allocate_rent(self, current_rent, result):
        """Allocate payment to rent"""
        if self.remaining <= 0:
            return

        if self.remaining >= current_rent:
            # Full rent paid
            amount = current_rent
            self.payment.rent_amount = amount
            result['allocations'].append({
                'type': 'rent',
                'amount': amount,
                'description': f'🏠 Rent paid: KSh {amount:,.2f} ({self.payment.payment_for_month.strftime("%B %Y") if self.payment.payment_for_month else "Current Month"})',
                'status': 'complete'
            })
            self.remaining -= amount
            result['rent_remaining'] = 0

            # Check for excess (goes to next month)
            if self.remaining > 0:
                self.payment.excess_amount = self.remaining
                self.payment.credited_to_next_month = True
                result['allocations'].append({
                    'type': 'excess',
                    'amount': self.remaining,
                    'description': f'💰 Excess credited to next month: KSh {self.remaining:,.2f}',
                    'status': 'credit'
                })
                result['excess'] = self.remaining
                self.remaining = 0
        else:
            # Partial rent paid
            amount = self.remaining
            self.payment.rent_amount = amount
            self.payment.balance_due = current_rent - amount
            result['allocations'].append({
                'type': 'rent_partial',
                'amount': amount,
                'description': f'⚠️ Partial rent: KSh {amount:,.2f} (Balance due: KSh {current_rent - amount:,.2f})',
                'status': 'partial'
            })
            result['balance_due'] = current_rent - amount
            result['rent_remaining'] = current_rent - amount
            self.remaining = 0

    def get_deposit_paid(self):
        """Get total deposit paid by tenant"""
        payments = Payment.query.filter_by(
            tenant_id=self.tenant.id,
            is_deposit=True
        ).all()
        return sum([p.deposit_amount or 0 for p in payments])

    def get_outstanding_water_bills(self):
        """Get outstanding water bills for tenant"""
        return WaterBill.query.filter_by(
            tenant_id=self.tenant.id,
            status='unpaid'
        ).order_by(WaterBill.month).all()

    def save_allocations(self, result):
        """Save allocation results to database"""
        # Set payment type
        if self.payment.is_deposit and self.payment.water_amount > 0 and self.payment.rent_amount > 0:
            self.payment.payment_type = 'combined'
        elif self.payment.is_deposit:
            self.payment.payment_type = 'deposit'
        elif self.payment.is_water_payment:
            self.payment.payment_type = 'water'
        else:
            self.payment.payment_type = 'rent'

        # Update payment status
        self.payment.status = 'paid'
        self.payment.completed_at = datetime.now()

        # Update tenant balance (total allocated minus excess)
        total_allocated = sum([a['amount'] for a in result['allocations'] if a['type'] not in ['excess']])
        self.tenant.balance = (self.tenant.balance or 0) - total_allocated

        db.session.commit()
        result['success'] = True
        result['total_allocated'] = total_allocated
        result['message'] = self.format_result_message(result)

        logger.info(f"Payment {self.payment.id} allocated: {result}")

        return result

    def format_result_message(self, result):
        """Format allocation result for display"""
        parts = []

        deposit_alloc = [a for a in result['allocations'] if 'deposit' in a['type']]
        if deposit_alloc:
            parts.append(f"🏦 Deposit: {sum([a['amount'] for a in deposit_alloc]):,.2f}")

        water_alloc = [a for a in result['allocations'] if 'water' in a['type']]
        if water_alloc:
            parts.append(f"💧 Water: {sum([a['amount'] for a in water_alloc]):,.2f}")

        rent_alloc = [a for a in result['allocations'] if a['type'] in ['rent', 'rent_partial']]
        if rent_alloc:
            parts.append(f"🏠 Rent: {sum([a['amount'] for a in rent_alloc]):,.2f}")

        if result['excess'] > 0:
            parts.append(f"💰 Credit: {result['excess']:,.2f}")

        if result['balance_due'] > 0:
            parts.append(f"⚠️ Balance due: {result['balance_due']:,.2f}")

        return " | ".join(parts)