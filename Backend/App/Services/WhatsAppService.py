# Backend/App/Services/WhatsAppService.py
import os
import requests
import json
import logging
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)


class WhatsAppService:
    # ✅ Read from environment variables
    WHATSAPP_ACCESS_TOKEN = os.getenv('WHATSAPP_ACCESS_TOKEN')
    WHATSAPP_PHONE_NUMBER_ID = os.getenv('WHATSAPP_PHONE_NUMBER_ID')
    WHATSAPP_API_VERSION = os.getenv('WHATSAPP_API_VERSION', 'v18.0')
    WHATSAPP_FROM_NUMBER = os.getenv('WHATSAPP_FROM_NUMBER')

    # Construct the API URL
    WHATSAPP_API_URL = f"https://graph.facebook.com/{WHATSAPP_API_VERSION}/{WHATSAPP_PHONE_NUMBER_ID}/messages"

    @staticmethod
    def is_configured():
        """Check if WhatsApp is properly configured"""
        return bool(
            WhatsAppService.WHATSAPP_ACCESS_TOKEN and
            WhatsAppService.WHATSAPP_PHONE_NUMBER_ID and
            WhatsAppService.WHATSAPP_ACCESS_TOKEN != 'YOUR_ACCESS_TOKEN'
        )

    @staticmethod
    def send_whatsapp_message(to_phone, message, message_type="text"):
        """Send a WhatsApp message using WhatsApp Business API"""
        try:
            if not WhatsAppService.is_configured():
                logger.error("❌ WhatsApp not configured. Please set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID")
                return {"success": False, "error": "WhatsApp not configured"}

            # Clean phone number
            phone = WhatsAppService._clean_phone_number(to_phone)

            # Prepare the payload
            payload = {
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": phone,
            }

            if message_type == "text":
                payload["type"] = "text"
                payload["text"] = {
                    "preview_url": False,
                    "body": message
                }
            elif message_type == "template":
                payload["type"] = "template"
                payload["template"] = message

            headers = {
                "Authorization": f"Bearer {WhatsAppService.WHATSAPP_ACCESS_TOKEN}",
                "Content-Type": "application/json"
            }

            logger.info(f"📤 Sending WhatsApp message to {phone}")

            response = requests.post(
                WhatsAppService.WHATSAPP_API_URL,
                headers=headers,
                json=payload,
                timeout=30
            )

            if response.status_code in [200, 201]:
                logger.info(f"✅ WhatsApp message sent to {phone}")
                return {
                    "success": True,
                    "data": response.json(),
                    "message_id": response.json().get('messages', [{}])[0].get('id')
                }
            else:
                logger.error(f"❌ WhatsApp API error: {response.text}")
                return {
                    "success": False,
                    "error": response.text,
                    "status_code": response.status_code
                }

        except requests.exceptions.Timeout:
            logger.error("❌ WhatsApp API timeout")
            return {"success": False, "error": "Request timeout"}
        except Exception as e:
            logger.error(f"❌ WhatsApp send error: {str(e)}")
            return {"success": False, "error": str(e)}

    @staticmethod
    def send_template_message(to_phone, template_name, components=None):
        """Send a WhatsApp template message"""
        template = {
            "name": template_name,
            "language": {"code": "en"}
        }

        if components:
            template["components"] = components

        return WhatsAppService.send_whatsapp_message(
            to_phone,
            template,
            message_type="template"
        )

    @staticmethod
    def send_bill_receipt(tenant, payment):
        """Send a bill receipt via WhatsApp"""
        try:
            if not tenant.phone:
                return {"success": False, "error": "Tenant has no phone number"}

            # Format the receipt message
            message = WhatsAppService.format_receipt_message(tenant, payment)

            # Send via WhatsApp
            result = WhatsAppService.send_whatsapp_message(tenant.phone, message)

            # Log the result
            if result.get('success'):
                logger.info(f"✅ Receipt sent to {tenant.name} via WhatsApp")
            else:
                logger.error(f"❌ Failed to send receipt to {tenant.name}: {result.get('error')}")

            return result

        except Exception as e:
            logger.error(f"❌ Error sending receipt: {str(e)}")
            return {"success": False, "error": str(e)}

    @staticmethod
    def format_receipt_message(tenant, payment):
        """Format a receipt message for WhatsApp"""
        lines = []
        lines.append("🏠 RENT MANAGER - PAYMENT RECEIPT")
        lines.append("")
        lines.append(f"Dear {tenant.name},")
        lines.append("")
        lines.append("✅ Payment Received")
        lines.append("")
        lines.append(
            f"📅 Date: {payment.payment_date.strftime('%d/%m/%Y') if payment.payment_date else datetime.now().strftime('%d/%m/%Y')}")
        lines.append(f"🏠 House: {tenant.unit.unit_number if tenant.unit else 'N/A'}")
        lines.append(f"💰 Amount: KSh {payment.amount:,.2f}")
        lines.append(f"📋 Receipt No: {payment.receipt_no}")
        lines.append(f"📆 Month: {payment.payment_for_month.strftime('%B %Y') if payment.payment_for_month else 'N/A'}")
        lines.append("")
        lines.append("Payment Details:")
        lines.append(f"• Rent: KSh {payment.rent_amount or payment.amount:,.2f}")
        lines.append(f"• Water: KSh {payment.water_amount or 0:,.2f}")
        lines.append("")
        if payment.notes:
            lines.append(f"📝 Note: {payment.notes}")
            lines.append("")
        lines.append("Thank you for your payment!")
        lines.append("")
        lines.append("RentManager System")
        lines.append("📞 Support: 0712345678")

        return "\n".join(lines)

    @staticmethod
    def send_monthly_statement(tenant, month, rent_due, water_due, total_due, balance):
        """Send monthly statement via WhatsApp"""
        try:
            if not tenant.phone:
                return {"success": False, "error": "Tenant has no phone number"}

            lines = []
            lines.append("🏠 RENT MANAGER - MONTHLY STATEMENT")
            lines.append("")
            lines.append(f"Dear {tenant.name},")
            lines.append("")
            lines.append(f"📅 Statement for: {month}")
            lines.append(f"🏠 House: {tenant.unit.unit_number if tenant.unit else 'N/A'}")
            lines.append("")
            lines.append("📋 SUMMARY:")
            lines.append("─" * 30)
            lines.append(f"💰 Rent: KSh {rent_due:,.2f}")
            lines.append(f"💧 Water: KSh {water_due:,.2f}")
            lines.append("─" * 30)
            lines.append(f"📌 TOTAL DUE: KSh {total_due:,.2f}")
            lines.append("─" * 30)
            lines.append(f"💰 Balance: KSh {balance:,.2f}")
            lines.append("")
            lines.append("📱 PAYMENT INSTRUCTIONS:")
            lines.append("M-Pesa Paybill: 247247")
            lines.append(f"Account: {tenant.unit.unit_number if tenant.unit else tenant.id}")
            lines.append("")
            lines.append("Thank you for your continued tenancy.")
            lines.append("")
            lines.append("RentManager System")
            lines.append("📞 Support: 0712345678")

            message = "\n".join(lines)

            return WhatsAppService.send_whatsapp_message(tenant.phone, message)

        except Exception as e:
            logger.error(f"❌ Error sending monthly statement: {str(e)}")
            return {"success": False, "error": str(e)}

    @staticmethod
    def send_rent_reminder(tenant, amount, due_date):
        """Send rent reminder via WhatsApp"""
        try:
            if not tenant.phone:
                return {"success": False, "error": "Tenant has no phone number"}

            lines = []
            lines.append("🔔 RENT REMINDER")
            lines.append("")
            lines.append(f"Dear {tenant.name},")
            lines.append("")
            lines.append("This is a reminder that your rent payment is due.")
            lines.append("")
            lines.append(f"🏠 House: {tenant.unit.unit_number if tenant.unit else 'N/A'}")
            lines.append(f"💰 Amount: KSh {amount:,.2f}")
            lines.append(f"📅 Due Date: {due_date}")
            lines.append("")
            lines.append("Please make payment to avoid any late fees.")
            lines.append("")
            lines.append("📱 PAYMENT:")
            lines.append("M-Pesa Paybill: 247247")
            lines.append(f"Account: {tenant.unit.unit_number if tenant.unit else tenant.id}")
            lines.append("")
            lines.append("Thank you!")
            lines.append("")
            lines.append("RentManager System")

            message = "\n".join(lines)

            return WhatsAppService.send_whatsapp_message(tenant.phone, message)

        except Exception as e:
            logger.error(f"❌ Error sending rent reminder: {str(e)}")
            return {"success": False, "error": str(e)}

    @staticmethod
    def _clean_phone_number(phone):
        """Clean and format phone number for WhatsApp API"""
        # Remove any non-digit characters
        phone = ''.join(filter(str.isdigit, str(phone)))

        # Remove leading 0 or 254
        if phone.startswith('0'):
            phone = '254' + phone[1:]
        elif phone.startswith('254'):
            phone = '254' + phone[3:]

        # Ensure it starts with 254
        if not phone.startswith('254'):
            phone = '254' + phone

        # WhatsApp requires no '+' for the API, but includes it for display
        return phone

        # Add this inside the WhatsAppService class, after _clean_phone_number

    @staticmethod
    def generate_receipt_link(tenant, payment, receipt_url=None):
        """
        Generate a wa.me link with a pre‑filled receipt message.
        If receipt_url is provided, it will be included instead of the detailed payment breakdown.
        """
        import urllib.parse

        lines = []
        lines.append("🏠 RENT MANAGER - PAYMENT RECEIPT")
        lines.append("")
        lines.append(f"Dear {tenant.name},")
        lines.append("")
        lines.append("✅ Payment Received")
        lines.append("")
        lines.append(
            f"📅 Date: {payment.payment_date.strftime('%d/%m/%Y') if payment.payment_date else datetime.now().strftime('%d/%m/%Y')}")
        lines.append(f"🏠 House: {tenant.unit.unit_number if tenant.unit else 'N/A'}")
        lines.append(f"💰 Amount: KSh {payment.amount:,.2f}")
        lines.append(f"📋 Receipt No: {payment.receipt_no}")
        lines.append(
            f"📆 Month: {payment.payment_for_month.strftime('%B %Y') if payment.payment_for_month else 'N/A'}")
        lines.append("")
        if receipt_url:
            lines.append("🔗 View your professional receipt here:")
            lines.append(receipt_url)
        else:
            lines.append("Payment Details:")
            lines.append(f"• Rent: KSh {payment.rent_amount or payment.amount:,.2f}")
            lines.append(f"• Water: KSh {payment.water_amount or 0:,.2f}")
            lines.append("")
        if payment.notes:
            lines.append(f"📝 Note: {payment.notes}")
            lines.append("")
        lines.append("Thank you for your payment!")
        lines.append("")
        lines.append("RentManager System")
        lines.append("📞 Support: 0712345678")

        message = "\n".join(lines)
        phone = tenant.phone
        phone = ''.join(filter(str.isdigit, phone))
        if phone.startswith('0'):
            phone = '254' + phone[1:]
        elif not phone.startswith('254'):
            phone = '254' + phone

        encoded_message = urllib.parse.quote(message)
        link = f"https://wa.me/{phone}?text={encoded_message}"
        return link