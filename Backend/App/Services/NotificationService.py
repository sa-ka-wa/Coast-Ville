# Backend/App/Services/NotificationService.py
import logging
from App.Services.WhatsAppService import WhatsAppService
from App.Services.EmailService import EmailService

logger = logging.getLogger(__name__)


class NotificationService:
    """Unified notification service for WhatsApp, Email, and SMS"""

    @staticmethod
    def send_receipt(tenant, payment, methods=None):
        """
        Send payment receipt via multiple channels
        methods: list of ['whatsapp', 'email', 'sms']
        """
        if methods is None:
            methods = ['whatsapp', 'email']  # Default channels

        results = {}

        if 'whatsapp' in methods:
            logger.info(f"📱 Sending WhatsApp receipt to {tenant.name}")
            result = WhatsAppService.send_bill_receipt(tenant, payment)
            results['whatsapp'] = result

        if 'email' in methods and tenant.email:
            logger.info(f"📧 Sending email receipt to {tenant.name}")
            result = EmailService.send_receipt_email(tenant, payment)
            results['email'] = result
        elif 'email' in methods:
            logger.warning(f"⚠️ No email address for {tenant.name}")
            results['email'] = {'success': False, 'error': 'No email address'}

        return results

    @staticmethod
    def send_monthly_statement(tenant, month, rent_due, water_due, total_due, balance, methods=None):
        """Send monthly statement via multiple channels"""
        if methods is None:
            methods = ['whatsapp', 'email']

        results = {}

        if 'whatsapp' in methods:
            result = WhatsAppService.send_monthly_statement(tenant, month, rent_due, water_due, total_due, balance)
            results['whatsapp'] = result

        if 'email' in methods and tenant.email:
            result = EmailService.send_statement_email(tenant, month, rent_due, water_due, total_due, balance)
            results['email'] = result

        return results

    @staticmethod
    def send_rent_reminder(tenant, amount, due_date, methods=None):
        """Send rent reminder via multiple channels"""
        if methods is None:
            methods = ['whatsapp', 'email']

        results = {}

        if 'whatsapp' in methods:
            result = WhatsAppService.send_rent_reminder(tenant, amount, due_date)
            results['whatsapp'] = result

        if 'email' in methods and tenant.email:
            result = EmailService.send_rent_reminder_email(tenant, amount, due_date)
            results['email'] = result

        return results

    @staticmethod
    def send_sms(phone, message):
        """Send SMS notification (placeholder - implement with SMS service)"""
        logger.info(f"📱 Sending SMS to {phone}: {message[:50]}...")
        # TODO: Implement SMS service (e.g., Africa's Talking, Twilio)
        return {"success": True, "message": "SMS sent (placeholder)"}

    @staticmethod
    def notify_caretaker_about_unmatched_payment(payment):
        """Notify caretaker about an unmatched payment"""
        # This would typically go to the caretaker's WhatsApp or email
        # For now, log it
        logger.info(f"⚠️ Unmatched payment: {payment.id} - Amount: {payment.amount}")
        return {"success": True, "message": "Caretaker notified"}