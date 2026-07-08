# Backend/App/Services/SchedulerService.py
from datetime import datetime, timedelta
from sqlalchemy import and_
from App.Extension import db
from App.Models.TenantModel import Tenant
from App.Models.PaymentModel import Payment
from App.Models.WaterReadingModel import WaterReading, WaterBill
from App.Models.UnitModel import Unit
from App.Models.PropertyModel import Property
from App.Models.UserModel import User
import logging

logger = logging.getLogger(__name__)


class SchedulerService:

    @staticmethod
    def run_monthly_tasks():
        """Run all monthly tasks"""
        results = {
            'status': 'success',
            'rent_generated': 0,
            'water_bills_generated': 0,
            'overdue_notifications': 0,
            'reading_reminders': 0,
            'monthly_statements_sent': 0,
            'errors': []
        }

        try:
            today = datetime.now().date()

            # 1. Generate rent bills on the 1st
            if today.day == 1:
                rent_result = SchedulerService.generate_monthly_rent()
                results['rent_generated'] = rent_result
                logger.info(f"💰 Rent generated: {rent_result} tenants")

                # 2. Send monthly statements to tenants (after generating rent)
                statement_result = SchedulerService.send_monthly_statements()
                results['monthly_statements_sent'] = statement_result
                logger.info(f"📱 Monthly statements sent to {statement_result} tenants")

            # 3. Send reading reminders to caretakers on the 23rd
            if today.day == 23:
                reminder_result = SchedulerService.send_reading_reminders_to_caretakers()
                results['reading_reminders'] = reminder_result
                logger.info(f"💧 Reading reminders sent to {reminder_result} caretakers")

            # 4. Generate water bills on the 25th (if readings taken)
            if today.day >= 25 and today.day <= 28:
                water_result = SchedulerService.generate_monthly_water_bills()
                results['water_bills_generated'] = water_result
                logger.info(f"💧 Water bills generated: {water_result}")

            # 5. Check overdue payments daily (after 5th)
            if today.day >= 5:
                overdue_result = SchedulerService.check_overdue_payments()
                results['overdue_notifications'] = overdue_result
                logger.info(f"📱 Overdue notifications sent: {overdue_result}")

            # 6. Generate estimated bills on the 30th/31st for missing readings
            if today.day >= 30:
                estimated_result = SchedulerService.generate_estimated_water_bills()
                results['estimated_bills'] = estimated_result
                logger.info(f"📊 Estimated bills generated: {estimated_result}")

            logger.info("✅ Monthly tasks completed: %s", results)

        except Exception as e:
            logger.error("❌ Monthly tasks failed: %s", str(e))
            results['errors'].append(str(e))
            results['status'] = 'failed'

        return results

    @staticmethod
    def generate_monthly_rent():
        """Generate rent for all active tenants on the 1st"""
        try:
            today = datetime.now().date()
            month_start = today.replace(day=1)

            # Get all active tenants
            tenants = Tenant.query.filter_by(status='active').all()
            count = 0

            for tenant in tenants:
                # Check if rent already exists for this month
                existing_payment = Payment.query.filter(
                    Payment.tenant_id == tenant.id,
                    Payment.payment_for_month == month_start
                ).first()

                if not existing_payment:
                    # Create a pending rent record
                    payment = Payment(
                        property_id=tenant.property_id,
                        tenant_id=tenant.id,
                        unit_id=tenant.unit_id,
                        amount=tenant.monthly_rent or 0,
                        receipt_no=f"RENT-{today.strftime('%Y%m')}-{tenant.id}",
                        payment_date=datetime.utcnow(),
                        payment_method='pending',
                        status='pending',
                        payment_for_month=month_start,
                        notes=f"Rent for {month_start.strftime('%B %Y')} - Auto-generated",
                        created_at=datetime.utcnow()
                    )
                    db.session.add(payment)
                    count += 1

            db.session.commit()
            logger.info(f"💰 Generated {count} rent records for {month_start.strftime('%B %Y')}")
            return count

        except Exception as e:
            db.session.rollback()
            logger.error(f"Failed to generate rent: {str(e)}")
            raise

    @staticmethod
    def send_monthly_statements():
        """Send monthly statements to all active tenants on the 1st"""
        try:
            today = datetime.now().date()
            month_name = today.strftime('%B %Y')

            # Import SMSService
            from App.Services.SMSService import SMSService

            # Get all active tenants
            tenants = Tenant.query.filter_by(status='active').all()
            sent_count = 0
            failed_count = 0

            for tenant in tenants:
                if not tenant.phone:
                    logger.info(f"⚠️ {tenant.name} has no phone number, skipping")
                    continue

                # Get rent for this month
                rent_payment = Payment.query.filter(
                    Payment.tenant_id == tenant.id,
                    Payment.payment_for_month == today.replace(day=1)
                ).first()

                # Get water bill for this month
                water_bill = WaterBill.query.filter(
                    WaterBill.tenant_id == tenant.id,
                    WaterBill.month == today.replace(day=1)
                ).first()

                # Get previous balance (unpaid from previous months)
                previous_payments = Payment.query.filter(
                    Payment.tenant_id == tenant.id,
                    Payment.payment_for_month < today.replace(day=1),
                    Payment.status == 'pending'
                ).all()

                previous_balance = sum(p.amount for p in previous_payments)

                # Calculate total due
                rent_amount = rent_payment.amount if rent_payment else 0
                water_amount = water_bill.total if water_bill else 0
                total_due = rent_amount + water_amount + previous_balance

                # Create statement message
                message = SchedulerService._create_monthly_statement(
                    tenant,
                    month_name,
                    rent_amount,
                    water_amount,
                    previous_balance,
                    total_due,
                    rent_payment,
                    water_bill
                )

                # Send SMS using SMSService
                try:
                    result = SMSService.send_sms(tenant.phone, message)

                    if result.get('success'):
                        sent_count += 1
                        # Update payment and bill notes
                        if rent_payment:
                            rent_payment.notes = f"Monthly statement sent on {today}"
                        if water_bill:
                            water_bill.notes = f"Monthly statement sent on {today}"
                        logger.info(f"✅ Statement sent to {tenant.name} ({tenant.phone})")
                    else:
                        failed_count += 1
                        logger.error(
                            f"❌ Failed to send statement to {tenant.name}: {result.get('error', 'Unknown error')}")

                except Exception as e:
                    failed_count += 1
                    logger.error(f"❌ Error sending statement to {tenant.name}: {str(e)}")

            db.session.commit()
            logger.info(f"📱 Sent {sent_count} monthly statements ({failed_count} failed)")
            return sent_count

        except Exception as e:
            db.session.rollback()
            logger.error(f"Failed to send monthly statements: {str(e)}")
            raise

    @staticmethod
    def _create_monthly_statement(tenant, month_name, rent_amount, water_amount, previous_balance, total_due,
                                  rent_payment, water_bill):
        """Create formatted monthly statement message"""
        # Build the statement
        lines = []
        lines.append("🏠 RENT MANAGER - MONTHLY STATEMENT")
        lines.append("")
        lines.append(f"Dear {tenant.name},")
        lines.append("")
        lines.append(f"📅 Statement for: {month_name}")
        lines.append(f"🏠 House: {tenant.unit.unit_number if tenant.unit else 'N/A'}")
        lines.append(f"📍 Property: {tenant.property.name if tenant.property else 'N/A'}")
        lines.append("")
        lines.append("📋 DETAILS:")
        lines.append("-" * 30)

        if rent_payment:
            lines.append(f"💰 Rent: KSh {rent_amount:,.2f}")
        else:
            lines.append(f"💰 Rent: KSh 0.00")

        if water_bill:
            lines.append(f"💧 Water: KSh {water_amount:,.2f}")
        else:
            lines.append(f"💧 Water: KSh 0.00")

        if previous_balance > 0:
            lines.append(f"⚠️ Previous Balance: KSh {previous_balance:,.2f}")

        lines.append("")
        lines.append("-" * 30)
        lines.append(f"📌 TOTAL DUE: KSh {total_due:,.2f}")
        lines.append("")

        # Payment instructions
        lines.append("📱 PAYMENT INSTRUCTIONS:")
        lines.append("M-Pesa Paybill: 123456")
        lines.append(f"Account Number: RENT-{tenant.id}")
        lines.append("")

        # Payment deadlines
        if rent_payment and rent_payment.status == 'pending':
            lines.append(f"⏰ Rent Due: 5th {month_name}")
        if water_bill and water_bill.status == 'pending':
            lines.append(f"⏰ Water Due: 10th {month_name}")

        lines.append("")
        lines.append("Thank you for your continued tenancy.")
        lines.append("")
        lines.append("RentManager System")
        lines.append("📞 Support: 0712345678")

        return "\n".join(lines)

    @staticmethod
    def generate_monthly_water_bills():
        """Generate water bills from readings taken by caretakers (on 25th-28th)"""
        try:
            today = datetime.now().date()
            month_start = today.replace(day=1)

            # Get all active tenants
            tenants = Tenant.query.filter_by(status='active').all()
            count = 0
            no_reading = []

            for tenant in tenants:
                # Get the latest reading for this tenant (from current month)
                latest_reading = WaterReading.query.filter(
                    WaterReading.tenant_id == tenant.id,
                    WaterReading.reading_date >= month_start,
                    WaterReading.reading_date <= today
                ).order_by(WaterReading.reading_date.desc()).first()

                if latest_reading and latest_reading.status != 'billed':
                    # Check if bill already exists for this month
                    existing_bill = WaterBill.query.filter(
                        WaterBill.tenant_id == tenant.id,
                        WaterBill.month == month_start
                    ).first()

                    if not existing_bill:
                        bill = WaterBill(
                            property_id=tenant.property_id,
                            tenant_id=tenant.id,
                            unit_id=tenant.unit_id,
                            month=month_start,
                            water_charge=latest_reading.amount,
                            garbage_charge=300,
                            total=latest_reading.amount + 300,
                            status='pending',
                            created_at=datetime.utcnow()
                        )
                        db.session.add(bill)
                        latest_reading.status = 'billed'
                        count += 1
                else:
                    no_reading.append({
                        'tenant': tenant.name,
                        'house': tenant.unit.unit_number if tenant.unit else 'N/A'
                    })

            db.session.commit()
            logger.info(f"💧 Generated {count} water bills for {month_start.strftime('%B %Y')}")
            if no_reading:
                logger.info(f"⏭️ {len(no_reading)} tenants with no reading: {no_reading}")
            return {
                'generated': count,
                'no_reading': len(no_reading),
                'details': no_reading[:10]  # Show first 10
            }

        except Exception as e:
            db.session.rollback()
            logger.error(f"Failed to generate water bills: {str(e)}")
            raise

    @staticmethod
    def check_overdue_payments():
        """Check for overdue payments and notify tenants"""
        try:
            today = datetime.now().date()
            month_start = today.replace(day=1)

            # Import SMSService
            from App.Services.SMSService import SMSService

            # Check if it's after the 5th
            if today.day < 5:
                logger.info("📋 Before 5th, no overdue checks needed")
                return {'status': 'Before 5th', 'notified': 0}

            # Get all pending payments for this month
            pending_payments = Payment.query.filter(
                Payment.status == 'pending',
                Payment.payment_for_month == month_start
            ).all()

            # Also check water bills
            pending_water_bills = WaterBill.query.filter(
                WaterBill.status == 'pending',
                WaterBill.month == month_start
            ).all()

            notified_count = 0
            already_notified = 0

            # Send reminders for rent
            for payment in pending_payments:
                tenant = Tenant.query.get(payment.tenant_id)
                if tenant and tenant.phone:
                    if payment.notes and 'Overdue reminder sent on' in payment.notes:
                        already_notified += 1
                        continue

                    days_overdue = (today - payment.payment_for_month).days
                    message = SchedulerService._create_overdue_message(tenant, payment, days_overdue)

                    try:
                        result = SMSService.send_sms(tenant.phone, message)
                        if result.get('success'):
                            notified_count += 1
                            payment.notes = f"Overdue reminder sent on {today}"
                            logger.info(f"✅ Rent overdue notice sent to {tenant.name} ({tenant.phone})")
                        else:
                            logger.error(f"❌ Failed to send overdue notice to {tenant.name}: {result.get('error')}")
                    except Exception as e:
                        logger.error(f"❌ Error sending overdue notice to {tenant.name}: {str(e)}")

            # Send reminders for water bills
            for bill in pending_water_bills:
                tenant = Tenant.query.get(bill.tenant_id)
                if tenant and tenant.phone:
                    # Check if already notified
                    if bill.notes and 'Overdue reminder sent on' in bill.notes:
                        already_notified += 1
                        continue

                    days_overdue = (today - bill.month).days
                    message = SchedulerService._create_water_overdue_message(tenant, bill, days_overdue)

                    try:
                        result = SMSService.send_sms(tenant.phone, message)
                        if result.get('success'):
                            notified_count += 1
                            bill.notes = f"Overdue reminder sent on {today}"
                            logger.info(f"✅ Water bill overdue notice sent to {tenant.name} ({tenant.phone})")
                        else:
                            logger.error(
                                f"❌ Failed to send water overdue notice to {tenant.name}: {result.get('error')}")
                    except Exception as e:
                        logger.error(f"❌ Error sending water overdue notice to {tenant.name}: {str(e)}")

            db.session.commit()
            logger.info(f"📱 Sent {notified_count} overdue reminders (already notified: {already_notified})")
            return {'notified': notified_count, 'already_notified': already_notified}

        except Exception as e:
            logger.error(f"Failed to check overdue payments: {str(e)}")
            raise

    @staticmethod
    def _create_overdue_message(tenant, payment, days_overdue):
        """Create overdue rent notification message"""
        return f"""⚠️ RENT OVERDUE NOTICE

Dear {tenant.name},

Your rent of KSh {payment.amount:,.2f} for {payment.payment_for_month.strftime('%B %Y')} is now {days_overdue} days overdue.

Please make payment immediately to avoid penalties.

🏠 Property: {tenant.property.name if tenant.property else 'N/A'}
📅 Due Date: {payment.payment_for_month.strftime('%d %B %Y')}
💰 Amount Due: KSh {payment.amount:,.2f}
📱 M-Pesa Paybill: 123456
📋 Account: RENT-{tenant.id}

Thank you.

RentManager System"""

    @staticmethod
    def _create_water_overdue_message(tenant, bill, days_overdue):
        """Create overdue water bill notification message"""
        return f"""⚠️ WATER BILL OVERDUE NOTICE

Dear {tenant.name},

Your water bill of KSh {bill.total:,.2f} for {bill.month.strftime('%B %Y')} is now {days_overdue} days overdue.

Please make payment immediately to avoid penalties.

🏠 Property: {tenant.property.name if tenant.property else 'N/A'}
📅 Due Date: {bill.month.strftime('%d %B %Y')}
💰 Amount Due: KSh {bill.total:,.2f}
📱 M-Pesa Paybill: 123456
📋 Account: WATER-{tenant.id}

Thank you.

RentManager System"""

    @staticmethod
    def send_reading_reminders_to_caretakers():
        """Send reminders to caretakers to take water readings (on the 23rd)"""
        try:
            today = datetime.now().date()
            month_name = today.strftime('%B %Y')

            # Import SMSService
            from App.Services.SMSService import SMSService

            # Get all caretakers
            caretakers = User.query.filter_by(role='caretaker').all()
            notified_count = 0

            for caretaker in caretakers:
                if caretaker.phone:
                    # Get properties assigned to this caretaker
                    properties = Property.query.filter_by(
                        owner_id=caretaker.id
                    ).all() if caretaker.id else []

                    property_names = [p.name for p in properties] if properties else ['All properties']

                    message = f"""📋 WATER READING REMINDER

    Dear {caretaker.name},

    This is a reminder to take water meter readings for:
    {' • ' + ' • '.join(property_names)}

    📅 Reading Period: 25th - 30th {month_name}
    📋 Please record readings for all active tenants

    How to record:
    1. Go to RentManager app
    2. Navigate to Meter Readings
    3. Click "New Reading" or use "Quick Entry"
    4. Enter previous and current readings
    5. Submit

    ⚠️ Please complete readings by 30th {month_name} for billing.

    Thank you!

    RentManager System"""

                    # Send SMS
                    try:
                        result = SMSService.send_sms(caretaker.phone, message)
                        if result.get('success'):
                            notified_count += 1
                            logger.info(f"✅ Reading reminder sent to caretaker {caretaker.name} ({caretaker.phone})")
                        else:
                            logger.error(
                                f"❌ Failed to send reading reminder to {caretaker.name}: {result.get('error')}")
                    except Exception as e:
                        logger.error(f"❌ Error sending reading reminder to {caretaker.name}: {str(e)}")

            logger.info(f"💧 Sent {notified_count} reading reminders to caretakers")
            return notified_count

        except Exception as e:
            logger.error(f"Failed to send reading reminders: {str(e)}")
            raise

    @staticmethod
    def generate_estimated_water_bills():
        """Generate estimated water bills for tenants without readings (on 30th/31st)"""
        try:
            today = datetime.now().date()
            month_start = today.replace(day=1)

            # Get all active tenants
            tenants = Tenant.query.filter_by(status='active').all()
            count = 0
            estimated = []

            for tenant in tenants:
                # Check if reading exists for this month
                reading = WaterReading.query.filter(
                    WaterReading.tenant_id == tenant.id,
                    WaterReading.reading_date >= month_start
                ).first()

                if reading:
                    continue

                # Check if bill already exists
                existing_bill = WaterBill.query.filter(
                    WaterBill.tenant_id == tenant.id,
                    WaterBill.month == month_start
                ).first()

                if not existing_bill:
                    # Use average consumption from previous months
                    avg_units = SchedulerService._calculate_average_consumption(tenant.id)
                    estimated_amount = avg_units * 70  # Rate of 70 per unit

                    bill = WaterBill(
                        property_id=tenant.property_id,
                        tenant_id=tenant.id,
                        unit_id=tenant.unit_id,
                        month=month_start,
                        water_charge=estimated_amount,
                        garbage_charge=300,
                        total=estimated_amount + 300,
                        status='pending',
                        notes=f"⚠️ ESTIMATED BILL - No reading submitted for {month_start.strftime('%B %Y')}",
                        created_at=datetime.utcnow()
                    )
                    db.session.add(bill)
                    count += 1
                    estimated.append({
                        'tenant': tenant.name,
                        'house': tenant.unit.unit_number if tenant.unit else 'N/A',
                        'estimated_amount': estimated_amount
                    })

            db.session.commit()
            logger.info(f"📊 Generated {count} estimated water bills")
            if estimated:
                logger.info(f"📊 Estimated bills: {estimated[:5]}")  # Show first 5
            return {
                'generated': count,
                'estimated': estimated[:10]  # Show first 10
            }

        except Exception as e:
            db.session.rollback()
            logger.error(f"Failed to generate estimated bills: {str(e)}")
            raise

    @staticmethod
    def _calculate_average_consumption(tenant_id):
        """Calculate average water consumption for a tenant over the last 3 months"""
        try:
            readings = WaterReading.query.filter(
                WaterReading.tenant_id == tenant_id
            ).order_by(WaterReading.reading_date.desc()).limit(3).all()

            if not readings:
                return 30  # Default average

            total_units = sum(r.units_used or 0 for r in readings)
            return round(total_units / len(readings), 2)

        except Exception as e:
            logger.error(f"Failed to calculate average consumption: {str(e)}")
            return 30  # Default average