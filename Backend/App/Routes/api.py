# App/Routes/api.py
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required

api_bp = Blueprint('api', __name__)

# Health check
@api_bp.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy', 'message': 'RentManager API is running'}), 200

# Simple test route
@api_bp.route('/test', methods=['GET'])
def test():
    return jsonify({'message': 'API is working!'}), 200

# Protected test route
@api_bp.route('/protected', methods=['GET'])
@jwt_required()
def protected():
    return jsonify({'message': 'This is a protected route!'}), 200

# Property routes
@api_bp.route('/properties', methods=['GET'])
def get_properties():
    return jsonify([]), 200

@api_bp.route('/properties', methods=['POST'])
def create_property():
    return jsonify({'message': 'Property created'}), 201

# Tenant routes
@api_bp.route('/tenants', methods=['GET'])
def get_tenants():
    return jsonify([]), 200

@api_bp.route('/tenants', methods=['POST'])
def create_tenant():
    return jsonify({'message': 'Tenant created'}), 201

# Payment routes
@api_bp.route('/payments', methods=['GET'])
def get_payments():
    return jsonify([]), 200

@api_bp.route('/payments', methods=['POST'])
def create_payment():
    return jsonify({'message': 'Payment created'}), 201

# Water routes
@api_bp.route('/water/readings', methods=['GET'])
def get_readings():
    return jsonify([]), 200

@api_bp.route('/water/bills', methods=['GET'])
def get_bills():
    return jsonify([]), 200

# Expense routes
@api_bp.route('/expenses', methods=['GET'])
def get_expenses():
    return jsonify([]), 200

@api_bp.route('/expenses', methods=['POST'])
def create_expense():
    return jsonify({'message': 'Expense created'}), 201

# Report routes
@api_bp.route('/reports/monthly', methods=['GET'])
def get_monthly_report():
    return jsonify({'message': 'Monthly report'}), 200

@api_bp.route('/reports/annual', methods=['GET'])
def get_annual_report():
    return jsonify({'message': 'Annual report'}), 200
