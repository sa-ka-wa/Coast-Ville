# App/Services/MpesaService.py
import requests
import base64
from datetime import datetime
from flask import current_app


class MpesaService:
    """Service for M-Pesa API integration"""

    def __init__(self):
        self.consumer_key = current_app.config.get('MPESA_CONSUMER_KEY')
        self.consumer_secret = current_app.config.get('MPESA_CONSUMER_SECRET')
        self.passkey = current_app.config.get('MPESA_PASSKEY')
        self.shortcode = current_app.config.get('MPESA_SHORTCODE')
        self.environment = current_app.config.get('MPESA_ENVIRONMENT', 'sandbox')

        self.base_url = 'https://sandbox.safaricom.co.ke' if self.environment == 'sandbox' else 'https://api.safaricom.co.ke'

    def get_access_token(self):
        """Get M-Pesa access token"""
        url = f"{self.base_url}/oauth/v1/generate?grant_type=client_credentials"
        response = requests.get(
            url,
            auth=(self.consumer_key, self.consumer_secret)
        )

        if response.status_code == 200:
            return response.json().get('access_token')
        return None

    def stk_push(self, phone_number, amount, account_reference, transaction_desc):
        """Initiate STK Push payment"""
        access_token = self.get_access_token()
        if not access_token:
            return {'error': 'Failed to get access token'}

        # Format phone number (remove leading 0, add 254)
        if phone_number.startswith('0'):
            phone_number = '254' + phone_number[1:]

        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        password = base64.b64encode(f"{self.shortcode}{self.passkey}{timestamp}".encode()).decode()

        url = f"{self.base_url}/mpesa/stkpush/v1/processrequest"
        headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }
        payload = {
            'BusinessShortCode': self.shortcode,
            'Password': password,
            'Timestamp': timestamp,
            'TransactionType': 'CustomerPayBillOnline',
            'Amount': int(amount),
            'PartyA': phone_number,
            'PartyB': self.shortcode,
            'PhoneNumber': phone_number,
            'CallBackURL': 'https://yourdomain.com/api/mpesa/callback',
            'AccountReference': account_reference,
            'TransactionDesc': transaction_desc
        }

        response = requests.post(url, json=payload, headers=headers)

        if response.status_code == 200:
            return response.json()
        return {'error': 'STK Push failed'}

    def parse_callback(self, callback_data):
        """Parse M-Pesa callback data"""
        # Extract payment details from callback
        if 'Body' in callback_data and 'stkCallback' in callback_data['Body']:
            callback = callback_data['Body']['stkCallback']

            if callback['ResultCode'] == 0:
                # Success
                items = callback.get('CallbackMetadata', {}).get('Item', [])
                payment_data = {}
                for item in items:
                    payment_data[item['Name']] = item.get('Value')

                return {
                    'success': True,
                    'receipt_no': payment_data.get('ReceiptNumber'),
                    'amount': payment_data.get('Amount'),
                    'mpesa_code': callback.get('MerchantRequestID'),
                    'phone': payment_data.get('PhoneNumber')
                }
            else:
                # Failed
                return {
                    'success': False,
                    'message': callback.get('ResultDesc', 'Payment failed')
                }

        return {'success': False, 'message': 'Invalid callback data'}