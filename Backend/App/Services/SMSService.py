# Backend/App/Services/SMSService.py
import os
import requests
import logging
import json

logger = logging.getLogger(__name__)


class SMSService:
    """SMS Service using Africa's Talking API"""

    # Get credentials from environment variables
    API_KEY = os.getenv('AT_API_KEY')
    USERNAME = os.getenv('AT_USERNAME')
    SENDER_ID = os.getenv('AT_SENDER_ID', 'RENTMGR')  # Max 11 characters

    @classmethod
    def _validate_credentials(cls):
        """Validate that API credentials are set"""
        if not cls.API_KEY or not cls.USERNAME:
            logger.warning("⚠️ Africa's Talking credentials not set. SMS will be logged only.")
            return False
        return True

    @classmethod
    def send_sms(cls, phone, message):
        """Send SMS to a single phone number"""
        if not cls._validate_credentials():
            logger.info(f"📱 [SIMULATED] SMS to {phone}: {message[:100]}...")
            return {'success': True, 'simulated': True, 'message': 'Credentials not configured'}

        # Format phone number
        phone = cls._format_phone(phone)

        # Check if we're using sandbox or production
        username = cls.USERNAME
        if username == 'sandbox':
            logger.info("📱 Using Africa's Talking Sandbox environment")
        else:
            logger.info(f"📱 Using Africa's Talking Production environment for {username}")

        url = "https://api.africastalking.com/version1/messaging"
        headers = {
            "apiKey": cls.API_KEY,
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json"
        }
        data = {
            "username": cls.USERNAME,
            "to": phone,
            "message": message,
            "from": cls.SENDER_ID,
            "enqueue": 1  # Queue if network is congested
        }

        try:
            logger.info(f"📤 Sending SMS to {phone} via Africa's Talking...")

            response = requests.post(url, headers=headers, data=data, timeout=30)

            # Log response status
            logger.info(f"📥 Response status: {response.status_code}")

            # Check if response is JSON
            try:
                result = response.json()
                logger.info(f"📥 Response: {json.dumps(result, indent=2)}")
            except json.JSONDecodeError as e:
                logger.error(f"❌ Failed to parse JSON response: {e}")
                logger.error(f"Raw response: {response.text[:500]}")

                # Check if it's an HTML error page
                if '<html' in response.text.lower():
                    logger.error("❌ Received HTML response instead of JSON - check API endpoint")
                    return {
                        'success': False,
                        'error': 'API returned HTML instead of JSON. Check API URL and credentials.',
                        'raw_response': response.text[:200]
                    }

                return {
                    'success': False,
                    'error': f'Invalid JSON response: {response.text[:100]}',
                    'raw_response': response.text[:200]
                }

            if result.get('SMSMessageData'):
                recipients = result['SMSMessageData']['Recipients']
                for recipient in recipients:
                    if recipient['status'] == 'Success':
                        logger.info(f"✅ SMS sent to {phone}: {recipient.get('messageId', 'N/A')}")
                        return {
                            'success': True,
                            'messageId': recipient.get('messageId'),
                            'phone': phone
                        }
                    else:
                        logger.error(f"❌ SMS failed for {phone}: {recipient.get('status', 'Unknown error')}")
                        return {
                            'success': False,
                            'error': recipient.get('status', 'Unknown error'),
                            'phone': phone
                        }
            elif result.get('error'):
                logger.error(f"❌ SMS API error: {result.get('error')}")
                return {
                    'success': False,
                    'error': result.get('error'),
                    'phone': phone
                }
            else:
                logger.error(f"❌ SMS API error: {result}")
                return {
                    'success': False,
                    'error': str(result),
                    'phone': phone
                }

        except requests.exceptions.Timeout:
            logger.error(f"❌ SMS timeout for {phone}")
            return {'success': False, 'error': 'Timeout', 'phone': phone}
        except requests.exceptions.ConnectionError as e:
            logger.error(f"❌ Connection error: {e}")
            return {'success': False, 'error': f'Connection error: {str(e)}', 'phone': phone}
        except Exception as e:
            logger.error(f"❌ SMS sending error: {str(e)}")
            return {'success': False, 'error': str(e), 'phone': phone}

    @classmethod
    def _format_phone(cls, phone):
        """Format phone number to international format"""
        # Remove any spaces or special characters
        phone = ''.join(filter(str.isdigit, phone))

        # Remove leading 0 and add 254
        if phone.startswith('0'):
            phone = '254' + phone[1:]
        elif phone.startswith('254'):
            pass  # Already in correct format
        elif not phone.startswith('254') and len(phone) == 9:
            # If it's a 9-digit number (e.g., 740766915)
            phone = '254' + phone
        elif not phone.startswith('254'):
            phone = '254' + phone

        return phone

    @classmethod
    def send_bulk_sms(cls, phone_numbers, message):
        """Send SMS to multiple phone numbers"""
        results = []
        for phone in phone_numbers:
            if phone:  # Skip empty phone numbers
                result = cls.send_sms(phone, message)
                results.append(result)
        return results

    @classmethod
    def send_formatted_statement(cls, tenant, rent_amount, water_amount, previous_balance, total_due, month_name):
        """Send a formatted monthly statement to a tenant"""
        if not tenant.phone:
            logger.warning(f"⚠️ {tenant.name} has no phone number, skipping")
            return {'success': False, 'error': 'No phone number'}

        message = cls._create_statement_message(
            tenant, month_name, rent_amount, water_amount,
            previous_balance, total_due
        )

        return cls.send_sms(tenant.phone, message)

    @classmethod
    def _create_statement_message(cls, tenant, month_name, rent_amount, water_amount, previous_balance, total_due):
        """Create formatted monthly statement message"""
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
        lines.append(f"💰 Rent: KSh {rent_amount:,.2f}")
        lines.append(f"💧 Water: KSh {water_amount:,.2f}")

        if previous_balance > 0:
            lines.append(f"⚠️ Previous Balance: KSh {previous_balance:,.2f}")

        lines.append("")
        lines.append("-" * 30)
        lines.append(f"📌 TOTAL DUE: KSh {total_due:,.2f}")
        lines.append("")
        lines.append("📱 PAYMENT INSTRUCTIONS:")
        lines.append("M-Pesa Paybill: 123456")
        lines.append(f"Account Number: RENT-{tenant.id}")
        lines.append("")
        lines.append(f"⏰ Rent Due: 5th {month_name}")
        lines.append("")
        lines.append("Thank you for your continued tenancy.")
        lines.append("")
        lines.append("RentManager System")
        lines.append("📞 Support: 0712345678")

        return "\n".join(lines)