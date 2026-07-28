# test_payment_scenarios.py

from App import create_app
from App.Extension import db
from App.Services.PaymentAllocationService import PaymentAllocationService
from App.Models.TenantModel import Tenant
from App.Models.PaymentModel import Payment
from App.Models.UnitModel import Unit
from App.Models.WaterReadingModel import WaterBill
from datetime import datetime, timedelta

app = create_app()

with app.app_context():
    print("=" * 60)
    print("PAYMENT ALLOCATION SCENARIOS")
    print("=" * 60)

    # Get or create tenant
    tenant = Tenant.query.filter_by(email='test@tenant.com').first()
    if not tenant:
        unit = Unit.query.first()
        if not unit:
            # Create a unit if none exists
            unit = Unit(
                property_id=1,
                unit_number='101',
                monthly_rent=15000,
                deposit=30000,
                status='available'
            )
            db.session.add(unit)
            db.session.commit()

        tenant = Tenant(
            name='Test Tenant',
            email='test@tenant.com',
            phone='254712345678',
            property_id=1,
            unit_id=unit.id if unit else None,
            monthly_rent=15000,
            deposit=30000,
            deposit_paid=False,
            deposit_paid_amount=0,
            balance=0,
            status='active'
        )
        db.session.add(tenant)
        db.session.commit()
        print(f"✅ Created test tenant: {tenant.name}")

    # Reset tenant deposit status
    tenant.deposit_paid = False
    tenant.deposit_paid_amount = 0
    tenant.balance = 0
    db.session.commit()

    # Scenario 1: First Payment - Deposit Only
    print("\n📌 SCENARIO 1: First Payment - Deposit Only")
    print("Tenant pays: KSh 30,000 (Deposit)")
    print("Expected: ✅ Deposit paid in full")

    payment1 = Payment(
        tenant_id=tenant.id,
        property_id=1,
        unit_id=tenant.unit_id,
        amount=30000,
        payment_date=datetime.now(),
        payment_method='mpesa',
        payment_for_month=datetime.now().date(),
        status='pending'
    )
    db.session.add(payment1)
    db.session.commit()

    service = PaymentAllocationService(payment1.id)
    result = service.allocate()
    print(f"Result: {result['message']}")
    print(f"Deposit remaining: KSh {result['deposit_remaining']:,.2f}")

    # Scenario 2: Deposit + Rent
    print("\n📌 SCENARIO 2: Deposit + Rent")
    print("Tenant pays: KSh 45,000 (Deposit 30,000 + Rent 15,000)")

    # Reset tenant for clean scenario
    tenant.deposit_paid = False
    tenant.deposit_paid_amount = 0
    tenant.balance = 0
    db.session.commit()

    payment2 = Payment(
        tenant_id=tenant.id,
        property_id=1,
        unit_id=tenant.unit_id,
        amount=45000,
        payment_date=datetime.now(),
        payment_method='mpesa',
        payment_for_month=datetime.now().date(),
        status='pending'
    )
    db.session.add(payment2)
    db.session.commit()

    service = PaymentAllocationService(payment2.id)
    result = service.allocate()
    print(f"Result: {result['message']}")
    print(f"Deposit remaining: KSh {result['deposit_remaining']:,.2f}")

    # Scenario 3: Half Deposit + Full Rent
    print("\n📌 SCENARIO 3: Half Deposit + Full Rent")
    print("Tenant pays: KSh 30,000 (Deposit 15,000 + Rent 15,000)")

    # Reset tenant for clean scenario
    tenant.deposit_paid = False
    tenant.deposit_paid_amount = 0
    tenant.balance = 0
    db.session.commit()

    payment3 = Payment(
        tenant_id=tenant.id,
        property_id=1,
        unit_id=tenant.unit_id,
        amount=30000,
        payment_date=datetime.now(),
        payment_method='mpesa',
        payment_for_month=datetime.now().date(),
        status='pending'
    )
    db.session.add(payment3)
    db.session.commit()

    service = PaymentAllocationService(payment3.id)
    result = service.allocate()
    print(f"Result: {result['message']}")
    print(f"Deposit remaining: KSh {result['deposit_remaining']:,.2f}")

    # Scenario 4: Remaining Deposit + Rent + Water
    print("\n📌 SCENARIO 4: Remaining Deposit + Rent + Water")
    print("Tenant pays: KSh 31,500 (Deposit 15,000 + Rent 15,000 + Water 1,500)")

    # ✅ Use 'pending' (allowed by constraint)
    water_bill = WaterBill(
        tenant_id=tenant.id,
        property_id=1,
        unit_id=tenant.unit_id,
        month=datetime.now().date(),
        water_charge=1500,
        garbage_charge=0,
        total=1500,
        status='pending',  # ✅ Changed from 'unpaid' to 'pending'
        paid_amount=0,
        total_remaining=1500
    )
    db.session.add(water_bill)
    db.session.commit()

    # Scenario 5: Overpayment - Credit to Next Month
    print("\n📌 SCENARIO 5: Overpayment - Credit to Next Month")
    print("Tenant pays: KSh 20,000 (Rent 15,000 + Excess 5,000)")

    # Reset tenant for clean scenario
    tenant.deposit_paid = True  # Deposit already paid
    tenant.deposit_paid_amount = 30000
    tenant.balance = 0
    db.session.commit()

    payment5 = Payment(
        tenant_id=tenant.id,
        property_id=1,
        unit_id=tenant.unit_id,
        amount=20000,
        payment_date=datetime.now(),
        payment_method='mpesa',
        payment_for_month=datetime.now().date(),
        status='pending'
    )
    db.session.add(payment5)
    db.session.commit()

    service = PaymentAllocationService(payment5.id)
    result = service.allocate()
    print(f"Result: {result['message']}")
    print(f"Excess credit: KSh {result['excess']:,.2f}")

    print("\n" + "=" * 60)
    print("ALL SCENARIOS COMPLETED")