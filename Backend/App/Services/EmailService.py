# Backend/App/Services/EmailService.py
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from datetime import datetime
import logging
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)


class EmailService:
    # Email configuration from environment variables
    SMTP_SERVER = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
    SMTP_PORT = int(os.getenv('MAIL_PORT', 587))
    SMTP_USERNAME = os.getenv('MAIL_USERNAME')
    SMTP_PASSWORD = os.getenv('MAIL_PASSWORD')
    FROM_EMAIL = os.getenv('MAIL_USERNAME') or os.getenv('MAIL_FROM')

    @staticmethod
    def is_configured():
        """Check if email is properly configured"""
        return bool(
            EmailService.SMTP_USERNAME and
            EmailService.SMTP_PASSWORD and
            EmailService.SMTP_SERVER
        )

    @staticmethod
    def send_email(to_email, subject, body, html_body=None, attachments=None):
        """Send an email with optional HTML and attachments"""
        try:
            if not EmailService.is_configured():
                logger.error("❌ Email not configured. Please set MAIL_USERNAME and MAIL_PASSWORD")
                return {"success": False, "error": "Email not configured"}

            # Create message
            msg = MIMEMultipart('alternative')
            msg['From'] = EmailService.FROM_EMAIL or EmailService.SMTP_USERNAME
            msg['To'] = to_email
            msg['Subject'] = subject

            # Attach plain text body
            if body:
                text_part = MIMEText(body, 'plain')
                msg.attach(text_part)

            # Attach HTML body
            if html_body:
                html_part = MIMEText(html_body, 'html')
                msg.attach(html_part)
            elif body:
                # If no HTML but plain text, use plain text
                pass

            # Attach files
            if attachments:
                for attachment in attachments:
                    with open(attachment['path'], 'rb') as f:
                        part = MIMEApplication(f.read(), Name=attachment['filename'])
                        part['Content-Disposition'] = f'attachment; filename="{attachment["filename"]}"'
                        msg.attach(part)

            # Send email
            with smtplib.SMTP(EmailService.SMTP_SERVER, EmailService.SMTP_PORT) as server:
                server.starttls()
                server.login(EmailService.SMTP_USERNAME, EmailService.SMTP_PASSWORD)
                server.send_message(msg)

            logger.info(f"✅ Email sent to {to_email}")
            return {"success": True, "message": "Email sent successfully"}

        except Exception as e:
            logger.error(f"❌ Email send error: {str(e)}")
            return {"success": False, "error": str(e)}

    @staticmethod
    def send_receipt_email(tenant, payment):
        """Send a payment receipt via email"""
        try:
            if not tenant.email:
                return {"success": False, "error": "Tenant has no email address"}

            subject = f"Rent Payment Receipt - {payment.receipt_no}"

            # Plain text body
            body = EmailService.format_receipt_text(tenant, payment)

            # HTML body
            html_body = EmailService.format_receipt_html(tenant, payment)

            result = EmailService.send_email(
                to_email=tenant.email,
                subject=subject,
                body=body,
                html_body=html_body
            )

            if result.get('success'):
                logger.info(f"✅ Receipt email sent to {tenant.email}")
            else:
                logger.error(f"❌ Failed to send receipt email to {tenant.email}: {result.get('error')}")

            return result

        except Exception as e:
            logger.error(f"❌ Error sending receipt email: {str(e)}")
            return {"success": False, "error": str(e)}

    @staticmethod
    def send_statement_email(tenant, month, rent_due, water_due, total_due, balance):
        """Send monthly statement via email"""
        try:
            if not tenant.email:
                return {"success": False, "error": "Tenant has no email address"}

            subject = f"Monthly Statement - {month}"

            # Plain text body
            body = EmailService.format_statement_text(tenant, month, rent_due, water_due, total_due, balance)

            # HTML body
            html_body = EmailService.format_statement_html(tenant, month, rent_due, water_due, total_due, balance)

            result = EmailService.send_email(
                to_email=tenant.email,
                subject=subject,
                body=body,
                html_body=html_body
            )

            if result.get('success'):
                logger.info(f"✅ Statement email sent to {tenant.email}")

            return result

        except Exception as e:
            logger.error(f"❌ Error sending statement email: {str(e)}")
            return {"success": False, "error": str(e)}

    @staticmethod
    def send_rent_reminder_email(tenant, amount, due_date):
        """Send rent reminder via email"""
        try:
            if not tenant.email:
                return {"success": False, "error": "Tenant has no email address"}

            subject = f"Rent Reminder - Due {due_date}"

            body = f"""
Dear {tenant.name},

This is a reminder that your rent payment is due.

House: {tenant.unit.unit_number if tenant.unit else 'N/A'}
Amount: KSh {amount:,.2f}
Due Date: {due_date}

Please make payment to avoid any late fees.

Payment Instructions:
M-Pesa Paybill: 247247
Account: {tenant.unit.unit_number if tenant.unit else tenant.id}

Thank you!

RentManager System
            """

            result = EmailService.send_email(
                to_email=tenant.email,
                subject=subject,
                body=body
            )

            if result.get('success'):
                logger.info(f"✅ Rent reminder email sent to {tenant.email}")

            return result

        except Exception as e:
            logger.error(f"❌ Error sending rent reminder email: {str(e)}")
            return {"success": False, "error": str(e)}

    @staticmethod
    def format_receipt_text(tenant, payment):
        """Format receipt as plain text"""
        lines = []
        lines.append("=" * 50)
        lines.append("🏠 RENT MANAGER - PAYMENT RECEIPT")
        lines.append("=" * 50)
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
        lines.append("=" * 50)
        lines.append("RentManager System")
        lines.append("📞 Support: 0712345678")
        lines.append("=" * 50)

        return "\n".join(lines)

    @staticmethod
    def format_receipt_html(tenant, payment):
        """Format receipt as HTML with styling"""
        return f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {font - family: Arial, sans-serif; color: #333; }
        .container {max - width: 600px; margin: 0 auto; padding: 20px; }
        .header {background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%); color: white; padding: 20px; text-align: center; border-radius: 8px; }
        .content {background: #f5f5f5; padding: 20px; border-radius: 8px; margin-top: 20px; }
        .receipt {background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .amount {font - size: 24px; font-weight: bold; color: #52c41a; }
        .detail {padding: 8px 0; border-bottom: 1px solid #eee; }
        .footer {text - align: center; margin-top: 20px; color: #888; font-size: 12px; }
        .badge {display: inline-block; background: #52c41a; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0;">🏠 RentManager</h1>
            <p style="margin: 5px 0 0;">Payment Receipt</p>
        </div>
        <div class="content">
            <div class="receipt">
                <h2>✅ Payment Received</h2>
                <p><strong>Dear {tenant.name},</strong></p>
                <p>Thank you for your payment. Details below:</p>

                <div class="detail">
                    <strong>📅 Date:</strong> {payment.payment_date.strftime('%d/%m/%Y') if payment.payment_date else datetime.now().strftime('%d/%m/%Y')}
                </div>
                <div class="detail">
                    <strong>🏠 House:</strong> {tenant.unit.unit_number if tenant.unit else 'N/A'}
                </div>
                <div class="detail">
                    <strong>💰 Amount:</strong> <span class="amount">KSh {payment.amount:,.2f}</span>
                </div>
                <div class="detail">
                    <strong>📋 Receipt No:</strong> {payment.receipt_no}
                </div>
                <div class="detail">
                    <strong>📆 Month:</strong> {payment.payment_for_month.strftime('%B %Y') if payment.payment_for_month else 'N/A'}
                </div>

                <h3>Payment Details</h3>
                <div class="detail">
                    <strong>🏠 Rent:</strong> KSh {payment.rent_amount or payment.amount:,.2f}
                </div>
                <div class="detail">
                    <strong>💧 Water:</strong> KSh {payment.water_amount or 0:,.2f}
                </div>

                {f'<p><strong>📝 Note:</strong> {payment.notes}</p>' if payment.notes else ''}

                <p style="margin-top: 20px; color: #52c41a; font-weight: bold;">✅ Payment Confirmed</p>
            </div>
        </div>
        <div class="footer">
            <p>RentManager System | 📞 Support: 0712345678</p>
            <p>This is a system-generated receipt. Please do not reply.</p>
        </div>
    </div>
</body>
</html>
"""

    @staticmethod
    def format_statement_text(tenant, month, rent_due, water_due, total_due, balance):
        """Format statement as plain text"""
        lines = []
        lines.append("=" * 50)
        lines.append(f"🏠 RENT MANAGER - MONTHLY STATEMENT")
        lines.append("=" * 50)
        lines.append("")
        lines.append(f"Dear {tenant.name},")
        lines.append("")
        lines.append(f"📅 Statement for: {month}")
        lines.append(f"🏠 House: {tenant.unit.unit_number if tenant.unit else 'N/A'}")
        lines.append("")
        lines.append("📋 SUMMARY:")
        lines.append("-" * 30)
        lines.append(f"💰 Rent: KSh {rent_due:,.2f}")
        lines.append(f"💧 Water: KSh {water_due:,.2f}")
        lines.append("-" * 30)
        lines.append(f"📌 TOTAL DUE: KSh {total_due:,.2f}")
        lines.append("-" * 30)
        lines.append(f"💰 Balance: KSh {balance:,.2f}")
        lines.append("")
        lines.append("📱 PAYMENT INSTRUCTIONS:")
        lines.append("M-Pesa Paybill: 247247")
        lines.append(f"Account: {tenant.unit.unit_number if tenant.unit else tenant.id}")
        lines.append("")
        lines.append("Thank you for your continued tenancy.")
        lines.append("")
        lines.append("=" * 50)
        lines.append("RentManager System")
        lines.append("📞 Support: 0712345678")
        lines.append("=" * 50)

        return "\n".join(lines)

    @staticmethod
    def format_statement_html(tenant, month, rent_due, water_due, total_due, balance):
        """Format statement as HTML with styling"""
        return f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%); color: white; padding: 20px; text-align: center; border-radius: 8px; }}
        .content {{ background: #f5f5f5; padding: 20px; border-radius: 8px; margin-top: 20px; }}
        .statement {{ background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }}
        .summary {{ background: #f6ffed; padding: 15px; border-radius: 8px; border: 1px solid #b7eb8f; }}
        .total {{ font-size: 20px; font-weight: bold; color: #1890ff; }}
        .balance {{ font-size: 18px; font-weight: bold; color: #52c41a; }}
        .detail {{ padding: 8px 0; border-bottom: 1px solid #eee; }}
        .footer {{ text-align: center; margin-top: 20px; color: #888; font-size: 12px; }}
        .instructions {{ background: #fff7e6; padding: 15px; border-radius: 8px; border: 1px solid #ffd591; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0;">🏠 RentManager</h1>
            <p style="margin: 5px 0 0;">Monthly Statement</p>
        </div>
        <div class="content">
            <div class="statement">
                <h2>📋 Monthly Statement</h2>
                <p><strong>Dear {tenant.name},</strong></p>
                <p>Your statement for {month} is ready.</p>

                <div class="detail">
                    <strong>🏠 House:</strong> {tenant.unit.unit_number if tenant.unit else 'N/A'}
                </div>
                <div class="detail">
                    <strong>📅 Month:</strong> {month}
                </div>

                <h3>📊 Summary</h3>
                <div class="summary">
                    <div class="detail">
                        <strong>💰 Rent:</strong> KSh {rent_due:,.2f}
                    </div>
                    <div class="detail">
                        <strong>💧 Water:</strong> KSh {water_due:,.2f}
                    </div>
                    <hr style="border: 1px dashed #ccc;">
                    <div class="detail">
                        <strong>📌 TOTAL DUE:</strong> <span class="total">KSh {total_due:,.2f}</span>
                    </div>
                    <div class="detail">
                        <strong>💰 Balance:</strong> <span class="balance">KSh {balance:,.2f}</span>
                    </div>
                </div>

                <h3>📱 Payment Instructions</h3>
                <div class="instructions">
                    <p><strong>M-Pesa Paybill:</strong> 247247</p>
                    <p><strong>Account:</strong> {tenant.unit.unit_number if tenant.unit else tenant.id}</p>
                </div>

                <p style="margin-top: 20px; color: #52c41a;">✅ Thank you for your continued tenancy.</p>
            </div>
        </div>
        <div class="footer">
            <p>RentManager System | 📞 Support: 0712345678</p>
            <p>This is a system-generated statement. Please do not reply.</p>
        </div>
    </div>
</body>
</html>
"""