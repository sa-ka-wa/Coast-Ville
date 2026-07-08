from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
from App.Controllers.PaymentController import PaymentController
from App.Controllers.TenantController import TenantController
from App.Controllers.PropertyController import PropertyController
from App.Controllers.UnitController import UnitController
from App.Controllers.WaterController import WaterController
from datetime import datetime

api_bp = Blueprint('api', __name__)

# ============================================================
# HEALTH CHECK
# ============================================================
@api_bp.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy', 'message': 'RentManager API is running'}), 200

@api_bp.route('/test', methods=['GET'])
def test():
    return jsonify({'message': 'API is working!'}), 200

@api_bp.route('/protected', methods=['GET'])
@jwt_required()
def protected():
    return jsonify({'message': 'This is a protected route!'}), 200

# ============================================================
# PROPERTY ROUTES
# ============================================================
@api_bp.route('/properties', methods=['GET'])
@jwt_required()
def get_properties():
    return PropertyController.get_properties()

@api_bp.route('/properties', methods=['POST'])
@jwt_required()
def create_property():
    return PropertyController.create_property()

@api_bp.route('/properties/<int:property_id>', methods=['GET'])
@jwt_required()
def get_property(property_id):
    return PropertyController.get_property(property_id)

@api_bp.route('/properties/<int:property_id>', methods=['PUT'])
@jwt_required()
def update_property(property_id):
    return PropertyController.update_property(property_id)

@api_bp.route('/properties/<int:property_id>', methods=['DELETE'])
@jwt_required()
def delete_property(property_id):
    return PropertyController.delete_property(property_id)

@api_bp.route('/properties/<int:property_id>/stats', methods=['GET'])
@jwt_required()
def get_property_stats(property_id):
    return PropertyController.get_property_stats(property_id)

# ============================================================
# TENANT ROUTES
# ============================================================
@api_bp.route('/tenants', methods=['GET'])
@jwt_required()
def get_tenants():
    return TenantController.get_tenants()

@api_bp.route('/tenants', methods=['POST'])
@jwt_required()
def create_tenant():
    return TenantController.create_tenant()

@api_bp.route('/tenants/<int:tenant_id>', methods=['GET'])
@jwt_required()
def get_tenant(tenant_id):
    return TenantController.get_tenant(tenant_id)

@api_bp.route('/tenants/<int:tenant_id>', methods=['PUT'])
@jwt_required()
def update_tenant(tenant_id):
    return TenantController.update_tenant(tenant_id)

@api_bp.route('/tenants/<int:tenant_id>', methods=['DELETE'])
@jwt_required()
def delete_tenant(tenant_id):
    return TenantController.delete_tenant(tenant_id)

@api_bp.route('/tenants/stats', methods=['GET'])
@jwt_required()
def get_tenant_stats():
    return TenantController.get_tenant_stats()

# ============================================================
# TENANT NESTED WATER ROUTES (RESTful - for tenant details page)
# ============================================================
@api_bp.route('/tenants/<int:tenant_id>/water/readings', methods=['GET'])
@jwt_required()
def get_tenant_water_readings(tenant_id):
    """Get water readings for a specific tenant"""
    return WaterController.get_readings_with_tenant(tenant_id)

@api_bp.route('/tenants/<int:tenant_id>/water/readings', methods=['POST'])
@jwt_required()
def create_tenant_water_reading(tenant_id):
    """Create water reading for a specific tenant"""
    return WaterController.create_reading_for_tenant(tenant_id)

@api_bp.route('/tenants/<int:tenant_id>/water/bills', methods=['GET'])
@jwt_required()
def get_tenant_water_bills(tenant_id):
    """Get water bills for a specific tenant"""
    return WaterController.get_bills_for_tenant(tenant_id)

# ============================================================
# WATER ROUTES (Filterable - for admin/overview views)
# ============================================================
@api_bp.route('/water/readings', methods=['GET'])
@jwt_required()
def get_water_readings():
    """Get water readings with filters (tenant_id, property_id, etc.)"""
    return WaterController.get_readings()

@api_bp.route('/water/readings', methods=['POST'])
@jwt_required()
def create_water_reading():
    """Create a new water reading"""
    return WaterController.create_reading()

@api_bp.route('/water/bills', methods=['GET'])
@jwt_required()
def get_water_bills():
    """Get water bills with filters (tenant_id, property_id, status, etc.)"""
    return WaterController.get_bills()

@api_bp.route('/water/bills/generate', methods=['POST'])
@jwt_required()
def generate_water_bill():
    """Generate a water bill from a reading"""
    return WaterController.generate_bill()

@api_bp.route('/water/bills/<int:bill_id>/status', methods=['PATCH'])
@jwt_required()
def update_water_bill_status(bill_id):
    """Update water bill status"""
    return WaterController.update_bill_status(bill_id)

@api_bp.route('/water/consumption/history', methods=['GET'])
@jwt_required()
def get_consumption_history():
    """Get water consumption history for a tenant"""
    return WaterController.get_consumption_history()

@api_bp.route('/water/summary', methods=['GET'])
@jwt_required()
def get_water_summary():
    """Get water billing summary"""
    return WaterController.get_summary()

# ============================================================
# PAYMENT ROUTES
# ============================================================
@api_bp.route('/payments', methods=['GET'])
@jwt_required()
def get_payments():
    return PaymentController.get_payments()

@api_bp.route('/payments', methods=['POST'])
@jwt_required()
def create_payment():
    return PaymentController.create_payment()

@api_bp.route('/payments/confirm', methods=['POST'])
@jwt_required()
def confirm_payment():
    return PaymentController.confirm_payment()

@api_bp.route('/payments/match', methods=['POST'])
@jwt_required()
def match_payment():
    return PaymentController.match_payment()

@api_bp.route('/payments/stats', methods=['GET'])
@jwt_required()
def get_payment_stats():
    return PaymentController.get_payment_stats()

@api_bp.route('/payments/stk-push', methods=['POST'])
@jwt_required()
def initiate_stk_push():
    return PaymentController.initiate_stk_push()

@api_bp.route('/payments/history', methods=['GET'])
@jwt_required()
def get_payment_history():
    return PaymentController.get_payment_history()

@api_bp.route('/payments/<int:payment_id>/receipt', methods=['GET'])
@jwt_required()
def generate_receipt(payment_id):
    return PaymentController.generate_receipt(payment_id)

@api_bp.route('/payments/manual', methods=['POST'])
@jwt_required()
def manual_payment():
    return PaymentController.manual_payment()

@api_bp.route('/payments/status', methods=['POST'])
@jwt_required()
def check_payment_status():
    return PaymentController.check_payment_status()

@api_bp.route('/payments/send-receipt', methods=['POST'])
@jwt_required()
def send_receipt():
    return PaymentController.send_receipt()

@api_bp.route('/payments/summary', methods=['GET'])
@jwt_required()
def get_payment_summary():
    return PaymentController.get_payment_summary()

# ============================================================
# M-PESA CALLBACK (No auth required - called by Safaricom)
# ============================================================
@api_bp.route('/mpesa/callback', methods=['POST'])
def mpesa_callback():
    return PaymentController.mpesa_callback()

# ============================================================
# EXPENSE ROUTES
# ============================================================
@api_bp.route('/expenses', methods=['GET'])
@jwt_required()
def get_expenses():
    return jsonify([]), 200

@api_bp.route('/expenses', methods=['POST'])
@jwt_required()
def create_expense():
    return jsonify({'message': 'Expense created'}), 201

# ============================================================
# REPORT ROUTES
# ============================================================
@api_bp.route('/reports/monthly', methods=['GET'])
@jwt_required()
def get_monthly_report():
    return jsonify({'message': 'Monthly report'}), 200

@api_bp.route('/reports/annual', methods=['GET'])
@jwt_required()
def get_annual_report():
    return jsonify({'message': 'Annual report'}), 200

# ============================================================
# UNIT ROUTES
# ============================================================
@api_bp.route('/units', methods=['GET'])
@jwt_required()
def get_units():
    return UnitController.get_units()

@api_bp.route('/units/available', methods=['GET'])
@jwt_required()
def get_available_units():
    return UnitController.get_available_units()

@api_bp.route('/units/<int:unit_id>', methods=['GET'])
@jwt_required()
def get_unit(unit_id):
    return UnitController.get_unit(unit_id)

@api_bp.route('/units', methods=['POST'])
@jwt_required()
def create_unit():
    return UnitController.create_unit()

@api_bp.route('/units/<int:unit_id>/status', methods=['PATCH'])
@jwt_required()
def update_unit_status(unit_id):
    return UnitController.update_unit_status(unit_id)

# ============================================================
# ROUTES LIST (Debug)
# ============================================================
@api_bp.route('/routes', methods=['GET'])
def list_routes():
    from flask import current_app
    routes = []
    for rule in current_app.url_map.iter_rules():
        methods = list(rule.methods - {'HEAD', 'OPTIONS'})
        routes.append({
            'endpoint': rule.endpoint,
            'methods': methods,
            'path': str(rule)
        })
    return jsonify(routes), 200

# ============================================================
# SCHEDULER ROUTES (UNIQUE - NO DUPLICATES)
# ============================================================

@api_bp.route('/scheduler/run-monthly', methods=['POST'])
@jwt_required()
def scheduler_run_monthly():
    """Manually trigger monthly tasks (rent, water bills, overdue checks)"""
    from App.Services.SchedulerService import SchedulerService
    try:
        result = SchedulerService.run_monthly_tasks()
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@api_bp.route('/scheduler/check-overdue', methods=['GET'])
@jwt_required()
def scheduler_check_overdue():
    """Check for overdue payments and send reminders"""
    from App.Services.SchedulerService import SchedulerService
    try:
        result = SchedulerService.check_overdue_payments()
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@api_bp.route('/scheduler/send-reading-reminders', methods=['POST'])
@jwt_required()
def scheduler_send_reading_reminders():
    """Send reading reminders to caretakers"""
    from App.Services.SchedulerService import SchedulerService
    try:
        result = SchedulerService.send_reading_reminders_to_caretakers()
        return jsonify({'status': 'success', 'notified': result}), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@api_bp.route('/scheduler/generate-water-bills', methods=['POST'])
@jwt_required()
def scheduler_generate_water_bills():
    """Generate water bills from readings taken by caretakers"""
    from App.Services.SchedulerService import SchedulerService
    try:
        result = SchedulerService.generate_monthly_water_bills()
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@api_bp.route('/scheduler/generate-estimated-bills', methods=['POST'])
@jwt_required()
def scheduler_generate_estimated_bills():
    """Generate estimated water bills for tenants without readings"""
    from App.Services.SchedulerService import SchedulerService
    try:
        result = SchedulerService.generate_estimated_water_bills()
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@api_bp.route('/scheduler/status', methods=['GET'])
@jwt_required()
def scheduler_status():
    """Get scheduler status and current date information"""
    today = datetime.now().date()
    return jsonify({
        'today': today.isoformat(),
        'is_first_of_month': today.day == 1,
        'is_after_5th': today.day >= 5,
        'is_23rd': today.day == 23,
        'is_25th': today.day >= 25 and today.day <= 28,
        'is_30th': today.day >= 30,
        'month': today.strftime('%B %Y'),
        'day': today.day,
        'day_name': today.strftime('%A')
    }), 200
@api_bp.route('/scheduler/send-statements', methods=['POST'])
@jwt_required()
def scheduler_send_statements():
    """Manually send monthly statements to all tenants"""
    from App.Services.SchedulerService import SchedulerService
    try:
        result = SchedulerService.send_monthly_statements()
        return jsonify({
            'status': 'success',
            'sent': result,
            'message': f'Monthly statements sent to {result} tenants'
        }), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500