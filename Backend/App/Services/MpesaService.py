# App/Services/MpesaService.py
import os
import requests
import base64
from datetime import datetime
import json
import logging

logger = logging.getLogger(__name__)


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
        self.env = os.getenv('MPESA_ENV', 'sandbox')

        # Set base URL based on environment
        if self.env == 'sandbox':
            self.base_url = 'https://sandbox.safaricom.co.ke'
        else:
            self.base_url = 'https://api.safaricom.co.ke'

        print(f"M-Pesa Configuration:")
        print(f"  Environment: {self.env}")
        print(f"  Shortcode: {self.mpesa_shortcode}")
        print(f"  Callback URL: {self.mpesa_callback_url}")
        print(f"  Base URL: {self.base_url}")
        print(f"  Consumer Key: {'*' * 10 if self.mpesa_consumer_key else 'Not Set'}")
        print(f"  Passkey: {'*' * 10 if self.mpesa_passkey else 'Not Set'}")

    def get_access_token(self):
        """Get M-Pesa access token"""
        try:
            logger.info("🔑 Getting M-Pesa access token...")

            if not self.mpesa_consumer_key or not self.mpesa_consumer_secret:
                logger.error("❌ M-Pesa credentials not configured")
                return {'success': False, 'error': 'M-Pesa credentials not configured'}

            url = f"{self.base_url}/oauth/v1/generate?grant_type=client_credentials"
            response = requests.get(
                url,
                auth=(self.mpesa_consumer_key, self.mpesa_consumer_secret),
                timeout=30
            )

            if response.status_code == 200:
                data = response.json()
                token = data.get('access_token')
                if token:
                    logger.info("✅ Access token obtained successfully")
                    return {'success': True, 'token': token}
                else:
                    logger.error(f"❌ No token in response: {data}")
                    return {'success': False, 'error': 'No access token in response'}
            else:
                logger.error(f"❌ Failed to get token: {response.text}")
                return {'success': False, 'error': response.text}

        except Exception as e:
            logger.error(f"❌ Error getting access token: {str(e)}")
            import traceback
            traceback.print_exc()
            return {'success': False, 'error': str(e)}

    def stk_push(self, phone_number, amount, account_reference, transaction_desc):
        """Initiate STK Push payment"""
        try:
            logger.info(f"🔧 STK Push called with: phone={phone_number}, amount={amount}")

            if not self.mpesa_consumer_key or not self.mpesa_consumer_secret:
                logger.error("❌ M-Pesa credentials not configured")
                return {'success': False, 'error': 'M-Pesa credentials not configured'}

            token_result = self.get_access_token()
            if not token_result.get('success'):
                return {'success': False, 'error': token_result.get('error', 'Failed to get access token')}

            access_token = token_result.get('token')
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
                'AccountReference': account_reference[:20],
                'TransactionDesc': transaction_desc[:20] if transaction_desc else 'Rent Payment'
            }

            response = requests.post(url, json=payload, headers=headers, timeout=30)

            if response.status_code == 200:
                response_data = response.json()
                if response_data.get('ResponseCode') == '0':
                    return {
                        'success': True,
                        'data': response_data,
                        'CheckoutRequestID': response_data.get('CheckoutRequestID'),
                        'MerchantRequestID': response_data.get('MerchantRequestID'),
                        'ResponseDescription': response_data.get('ResponseDescription')
                    }
                else:
                    error_msg = response_data.get('errorMessage') or response_data.get('ResponseDescription') or 'STK Push failed'
                    return {'success': False, 'error': error_msg}
            else:
                return {'success': False, 'error': f"HTTP {response.status_code}: {response.text}"}

        except Exception as e:
            logger.error(f"❌ STK Push error: {str(e)}")
            import traceback
            traceback.print_exc()
            return {'success': False, 'error': str(e)}

    def format_phone_number(self, phone_number):
        """Format phone number to international format"""
        phone_number = ''.join(filter(str.isdigit, phone_number))
        if phone_number.startswith('0'):
            phone_number = '254' + phone_number[1:]
        elif phone_number.startswith('7'):
            phone_number = '254' + phone_number
        return phone_number

    def query_status(self, checkout_request_id):
        """Query STK Push status"""
        try:
            logger.info(f"🔍 Querying status for: {checkout_request_id}")

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

            response = requests.post(url, json=payload, headers=headers, timeout=30)

            if response.status_code == 200:
                return {'success': True, 'data': response.json()}
            return {'success': False, 'error': response.text}

        except Exception as e:
            logger.error(f"❌ Query status error: {str(e)}")
            return {'success': False, 'error': str(e)}

    def parse_callback(self, callback_data):
        """Parse M-Pesa callback data"""
        try:
            logger.info("📥 Parsing M-Pesa callback")

            if 'Body' in callback_data and 'stkCallback' in callback_data['Body']:
                callback = callback_data['Body']['stkCallback']

                if callback['ResultCode'] == 0:
                    items = callback.get('CallbackMetadata', {}).get('Item', [])
                    payment_data = {}
                    for item in items:
                        payment_data[item['Name']] = item.get('Value')

                    return {
                        'success': True,
                        'receipt_no': payment_data.get('MpesaReceiptNumber'),
                        'amount': payment_data.get('Amount'),
                        'mpesa_code': callback.get('MerchantRequestID'),
                        'phone': payment_data.get('PhoneNumber'),
                        'result_code': '0',
                        'result_desc': 'Success',
                        'account_reference': payment_data.get('AccountReference')
                    }
                else:
                    return {
                        'success': False,
                        'message': callback.get('ResultDesc', 'Payment failed'),
                        'result_code': callback.get('ResultCode'),
                        'result_desc': callback.get('ResultDesc')
                    }

            return {'success': False, 'message': 'Invalid callback data'}

        except Exception as e:
            logger.error(f"❌ Parse callback error: {str(e)}")
            return {'success': False, 'error': str(e)}

    def parse_account_reference(self, account_reference):
        """
        Parse account reference in various formats:
        - 177914#11
        - 177914 11
        - 177914-11
        - 177914_11
        - 17791411 (without separator)
        """
        if not account_reference:
            return None

        separators = ['#', ' ', '-', '_', '|', '/', ':']

        for sep in separators:
            if sep in account_reference:
                parts = account_reference.split(sep)
                if len(parts) >= 2:
                    account_prefix = parts[0].strip()
                    house_no = ''.join(parts[1:]).strip()
                    return {
                        'account_prefix': account_prefix,
                        'house_no': house_no,
                        'separator': sep,
                        'original': account_reference
                    }

        known_prefixes = ['911936', '177914']
        for prefix in known_prefixes:
            if account_reference.startswith(prefix):
                remaining = account_reference[len(prefix):]
                if remaining:
                    return {
                        'account_prefix': prefix,
                        'house_no': remaining,
                        'separator': 'none',
                        'original': account_reference
                    }

        return None

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