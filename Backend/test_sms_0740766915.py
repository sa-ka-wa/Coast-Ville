import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add the project path
sys.path.append('/root/moringaschool/phase-5/Coast-ville/Backend')

from App.Services.SMSService import SMSService
from App import create_app
from App.Extension import db
from App.Models.TenantModel import Tenant

def test_sms_to_phone():
    """Test sending SMS to 0740766915"""
    
    print("=" * 60)
    print("📱 SMS TEST")
    print("=" * 60)
    
    # Check credentials
    print("\n📋 Checking credentials:")
    print(f"   AT_USERNAME: {os.getenv('AT_USERNAME', 'NOT SET')}")
    print(f"   AT_API_KEY: {'SET' if os.getenv('AT_API_KEY') else 'NOT SET'}")
    print(f"   AT_SENDER_ID: {os.getenv('AT_SENDER_ID', 'NOT SET')}")
    
    app = create_app()
    
    with app.app_context():
        phone = "0740766915"
        
        print(f"\n📱 Testing SMS to {phone}...")
        print("-" * 60)
        
        # Find or create tenant
        tenant = Tenant.query.filter_by(phone=phone).first()
        
        if tenant:
            print(f"✅ Found tenant: {tenant.name} (ID: {tenant.id})")
        else:
            print(f"❌ No tenant found with phone {phone}")
            print("   Creating a test tenant...")
            
            tenant = Tenant(
                name="Test Tenant",
                phone=phone,
                email="test@example.com",
                monthly_rent=15000,
                status="active",
                property_id=1,
                unit_id=1
            )
            db.session.add(tenant)
            db.session.commit()
            print(f"✅ Test tenant created: {tenant.name} (ID: {tenant.id})")
        
        print("\n📤 Sending test SMS...")
        print("-" * 60)
        
        # Send test SMS
        test_message = """🏠 RENT MANAGER - TEST SMS

Dear Test Tenant,

This is a test message from RentManager System.

📱 M-Pesa Paybill: 123456
📋 Account: TEST-123

Thank you for your patience.

RentManager System
📞 Support: 0712345678"""
        
        result = SMSService.send_sms(phone, test_message)
        
        print("\n📊 Result:")
        print("-" * 60)
        
        if result.get('success'):
            print("✅ SMS sent successfully!")
            if result.get('simulated'):
                print("⚠️ Note: This was a simulation (credentials not configured)")
            else:
                print(f"📨 Message ID: {result.get('messageId')}")
                print(f"📱 Phone: {result.get('phone')}")
        else:
            print(f"❌ SMS failed: {result.get('error')}")
            if result.get('raw_response'):
                print(f"📄 Raw response: {result.get('raw_response')}")

if __name__ == "__main__":
    test_sms_to_phone()
