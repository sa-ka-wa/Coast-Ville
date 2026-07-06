# App/Services/NotificationService.py
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import requests
from flask import current_app


class NotificationService:
    """Service for sending notifications"""

    @staticmethod
    def send_email(to_email, subject, body):
        """Send email notification"""
        try:
            msg = MIMEMultipart()
            msg['From'] = current_app.config.get('MAIL_USERNAME')
            msg['To'] = to_email
            msg['Subject'] = subject

            msg.attach(MIMEText(body, 'html'))

            server = smtplib.SMTP(
                current_app.config.get('MAIL_SERVER', 'smtp.gmail.com'),
                current_app.config.get('MAIL_PORT', 587)
            )
            server.starttls()
            server.login(
                current_app.config.get('MAIL_USERNAME'),
                current_app.config.get('MAIL_PASSWORD')
            )
            server.send_message(msg)
            server.quit()

            return {'success': True}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    @staticmethod
    def send_sms(phone_number, message):
        """Send SMS notification"""
        # This would integrate with an SMS service like Twilio, Africa's Talking, etc.
        # For now, return mock response
        return {'success': True, 'message': 'SMS sent successfully'}

    @staticmethod
    def send_whatsapp(phone_number, message):
        """Send WhatsApp notification"""
        # This would integrate with WhatsApp Business API
        # For now, return mock response
        return {'success': True, 'message': 'WhatsApp message sent successfully'}

    @staticmethod
    def send_receipt(tenant, payment, method='whatsapp'):
        """Send receipt to tenant"""
        receipt_data = {
            'tenant': tenant.to_dict(),
            'payment': payment.to_dict(),
            'message': f"""
                🏠 Rent Receipt

                Receipt No: {payment.receipt_no}
                Date: {payment.payment_date.strftime('%d/%m/%Y')}
                Tenant: {tenant.name}
                House: {tenant.unit.unit_number if tenant.unit else 'N/A'}

                Amount: Ksh {payment.amount:,.2f}
                Method: {payment.payment_method.upper()}
                Status: ✅ PAID

                Thank you for your payment!
            """
        }

        if method == 'whatsapp':
            return NotificationService.send_whatsapp(tenant.phone, receipt_data['message'])
        elif method == 'sms':
            return NotificationService.send_sms(tenant.phone, receipt_data['message'])
        elif method == 'email':
            return NotificationService.send_email(
                tenant.email,
                'Rent Payment Receipt',
                receipt_data['message']
            )

        return {'success': False, 'error': 'Invalid method'}
