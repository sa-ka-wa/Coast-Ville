# App/Services/MpesaService.py
import os
import requests
import base64
from datetime import datetime
import json
from flask import current_app


class MpesaService:
    """Service for M-Pesa API integration"""

    def __init__(self):
        self.init_mpesa_config()

    def init_mpesa_config(self):
        """Initialize M-Pesa configuration from environment variables"""
        # M-Pesa API Credentials
        self.mpesa_shortcode = os.getenv('MPESA_SHORTCODE', '174379')
        self.mpesa_passkey = os.getenv('MPESA_PASSKEY', '')
        self.mpesa_callback_url = os.getenv('MPESA_CALLBACK_URL',
                                            'https://rentmanager-backend.onrender.com/api/mpesa/callback')
        self.mpesa_consumer_key = os.getenv('MPESA_CONSUMER_KEY', '')
        self.mpesa_consumer_secret = os.getenv('MPESA_CONSUMER_SECRET', '')
        self.env = os.getenv('MPESA_ENV', 'sandbox')  # sandbox or production

        # Set base URL based on environment
        if self.env == 'sandbox':
            self.base_url = 'https://sandbox.safaricom.co.ke'
        else:
            self.base_url = 'https://api.safaricom.co.ke'

        # Log configuration (without exposing secrets)
        print(f"M-Pesa Configuration:")
        print(f"  Environment: {self.env}")
        print(f"  Shortcode: {self.mpesa_shortcode}")
        print(f"  Callback URL: {self.mpesa_callback_url}")
        print(f"  Base URL: {self.base_url}")
        print(f"  Consumer Key: {'*' * 10 if self.mpesa_consumer_key else 'Not Set'}")
        print(f"  Passkey: {'*' * 10 if self.mpesa_passkey else 'Not Set'}")

    def get_access_token(self):
        """Get M-Pesa access token"""
        if not self.mpesa_consumer_key or not self.mpesa_consumer_secret:
            return {'success': False, 'error': 'M-Pesa credentials not configured'}

        url = f"{self.base_url}/oauth/v1/generate?grant_type=client_credentials"
        try:
            response = requests.get(
                url,
                auth=(self.mpesa_consumer_key, self.mpesa_consumer_secret),
                timeout=30
            )
            if response.status_code == 200:
                token = response.json().get('access_token')
                return {'success': True, 'token': token}
            return {'success': False, 'error': response.text}
        except Exception as e:
            print(f"Error getting access token: {e}")
            return {'success': False, 'error': str(e)}

    def stk_push(self, phone_number, amount, account_reference, transaction_desc):
        """Initiate STK Push payment"""
        # Validate configuration
        if not self.mpesa_consumer_key or not self.mpesa_consumer_secret:
            return {'success': False, 'error': 'M-Pesa credentials not configured'}

        # Get access token
        token_result = self.get_access_token()
        if not token_result.get('success'):
            return {'success': False, 'error': token_result.get('error', 'Failed to get access token')}

        access_token = token_result.get('token')

        # Format phone number (remove leading 0, add 254)
        phone_number = self.format_phone_number(phone_number)

        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        password = base64.b64encode(f"{self.mpesa_shortcode}{self.mpesa_passkey}{timestamp}".encode()).decode()

        url = f"{self.base_url}/mpesa/stkpush/v1/processrequest"
        headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }
        payload = {
            'BusinessShortCode': self.mpesa_shortcode,
            'Password': password,
            'Timestamp': timestamp,
            'TransactionType': 'CustomerPayBillOnline',
            'Amount': int(amount),
            'PartyA': phone_number,
            'PartyB': self.mpesa_shortcode,
            'PhoneNumber': phone_number,
            'CallBackURL': self.mpesa_callback_url,
            'AccountReference': account_reference[:20],  # Max 20 characters
            'TransactionDesc': transaction_desc[:20] if transaction_desc else 'Rent Payment'
        }

        try:
            response = requests.post(url, json=payload, headers=headers, timeout=30)
            if response.status_code == 200:
                response_data = response.json()
                return {
                    'success': True,
                    'data': response_data,
                    'CheckoutRequestID': response_data.get('CheckoutRequestID')
                }
            return {'success': False, 'error': response.text}
        except Exception as e:
            print(f"STK Push error: {e}")
            return {'success': False, 'error': str(e)}

    def format_phone_number(self, phone_number):
        """Format phone number to international format"""
        # Remove any non-digit characters
        phone_number = ''.join(filter(str.isdigit, phone_number))

        # If starts with 0, remove and add 254
        if phone_number.startswith('0'):
            phone_number = '254' + phone_number[1:]
        # If starts with 254, keep as is
        elif phone_number.startswith('254'):
            pass
        # If starts with 7, add 254
        elif phone_number.startswith('7'):
            phone_number = '254' + phone_number

        return phone_number

    def query_status(self, checkout_request_id):
        """Query STK Push status"""
        token_result = self.get_access_token()
        if not token_result.get('success'):
            return {'success': False, 'error': token_result.get('error', 'Failed to get access token')}

        access_token = token_result.get('token')

        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        password = base64.b64encode(f"{self.mpesa_shortcode}{self.mpesa_passkey}{timestamp}".encode()).decode()

        url = f"{self.base_url}/mpesa/stkpushquery/v1/query"
        headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }
        payload = {
            'BusinessShortCode': self.mpesa_shortcode,
            'Password': password,
            'Timestamp': timestamp,
            'CheckoutRequestID': checkout_request_id
        }

        try:
            response = requests.post(url, json=payload, headers=headers, timeout=30)
            if response.status_code == 200:
                return {'success': True, 'data': response.json()}
            return {'success': False, 'error': response.text}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def parse_callback(self, callback_data):
        """Parse M-Pesa callback data"""
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
                    'phone': payment_data.get('PhoneNumber'),
                    'result_code': '0',
                    'result_desc': 'Success'
                }
            else:
                # Failed
                return {
                    'success': False,
                    'message': callback.get('ResultDesc', 'Payment failed'),
                    'result_code': callback.get('ResultCode'),
                    'result_desc': callback.get('ResultDesc')
                }

        return {'success': False, 'message': 'Invalid callback data'}

    def simulate_payment(self, phone_number, amount, account_reference):
        """Simulate a payment for testing (sandbox only)"""
        if self.env != 'sandbox':
            return {'success': False, 'error': 'Simulation only available in sandbox'}

        return {
            'success': True,
            'data': {
                'MerchantRequestID': f'mock-{datetime.now().strftime("%Y%m%d%H%M%S")}',
                'CheckoutRequestID': f'ws_CO_{datetime.now().strftime("%Y%m%d%H%M%S")}',
                'ResponseCode': '0',
                'ResponseDescription': 'Success. Request accepted for processing',
                'CustomerMessage': 'We have received your payment request. You will receive a confirmation shortly.'
            }
        }