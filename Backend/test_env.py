# test_env.py
import os
from dotenv import load_dotenv

# Force load .env
load_dotenv(override=True)

print("=== Environment Variables ===")
print(f"MPESA_CONSUMER_KEY: {os.getenv('MPESA_CONSUMER_KEY', 'NOT SET')[:20]}...")
print(f"MPESA_CONSUMER_SECRET: {os.getenv('MPESA_CONSUMER_SECRET', 'NOT SET')[:20]}...")
print(f"MPESA_PASSKEY: {os.getenv('MPESA_PASSKEY', 'NOT SET')[:20]}...")
print(f"MPESA_SHORTCODE: {os.getenv('MPESA_SHORTCODE', 'NOT SET')}")
print(f"MPESA_ENV: {os.getenv('MPESA_ENV', 'NOT SET')}")

# Test if the new key starts with 8Vg7
key = os.getenv('MPESA_CONSUMER_KEY', '')
if key.startswith('8Vg7'):
    print("✅ NEW credentials loaded!")
else:
    print(f"❌ OLD credentials still loaded: {key[:20]}...")