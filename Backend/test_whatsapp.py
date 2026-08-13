# Backend/test_whatsapp.py
import os
import requests
import json

# Your Meta WhatsApp credentials
ACCESS_TOKEN = "EAAZAVaH6cMXsBSJmvROBr2L1KaFYhIWhLNnjWf75BUThijhBhbkx0zQj6j1BVZCSJb15JHZCdr0K6sZAW93qQyoipZAkn6zgIneaHWFcHtYR8ZCRujljHlXElYuOpzAZBVXe8hfHN6ocW2pPuKMDchCmgRCn5mtd8GyzIZA6A1B9nG8dRZCai0yZAYjhUug3ZCeW441EZCp9cs2s4FOrhhBelFCcUWpyvEfLFTg4exGT0MK1wJbSaVXMW7IS6qRZAqQpCx3SnveYBcE0rfDMBuSMYFkzZA"
PHONE_NUMBER_ID = "1187015114503156"
RECIPIENT_PHONE = "254740766915"  # Samuel Amanaka's phone


# Send test message
def send_whatsapp_template():
    url = f"https://graph.facebook.com/v25.0/{PHONE_NUMBER_ID}/messages"

    headers = {
        "Authorization": f"Bearer {ACCESS_TOKEN}",
        "Content-Type": "application/json"
    }

    payload = {
        "messaging_product": "whatsapp",
        "to": RECIPIENT_PHONE,
        "type": "template",
        "template": {
            "name": "jaspers_market_order_confirmation_v1",
            "language": {
                "code": "en_US"
            },
            "components": [
                {
                    "type": "body",
                    "parameters": [
                        {"type": "text", "text": "Samuel Amanaka"},
                        {"type": "text", "text": "RENT-001"},
                        {"type": "text", "text": "August 2026"}
                    ]
                }
            ]
        }
    }

    print("📤 Sending WhatsApp template message...")
    print(f"📱 To: {RECIPIENT_PHONE}")
    print(f"📋 Template: jaspers_market_order_confirmation_v1")
    print("-" * 50)

    response = requests.post(url, headers=headers, json=payload)

    print(f"📥 Response Status: {response.status_code}")
    print(f"📥 Response Body: {response.text}")

    if response.status_code in [200, 201]:
        print("✅ WhatsApp message sent successfully!")
    else:
        print("❌ Failed to send WhatsApp message")


if __name__ == "__main__":
    send_whatsapp_template()