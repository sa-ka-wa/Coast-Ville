from flask import request, jsonify, make_response
from flask_jwt_extended import jwt_required, get_jwt_identity
from App.Extension import db
from App.Models.TenantModel import Tenant
from App.Models.UnitModel import Unit
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class TenantController:

    @staticmethod
    @jwt_required()
    def get_tenants():
        """Get all tenants (optionally filtered by property)"""
        try:
            print("=" * 50)
            print("🔍 GET /tenants called")
            
            property_id = request.args.get('property_id')
            print(f"📌 property_id: {property_id}")
            
            user_id = get_jwt_identity()
            print(f"👤 User ID from token: {user_id}")
            
            print("📊 Querying all tenants...")
            query = Tenant.query
            if property_id:
                query = query.filter_by(property_id=property_id)
            
            tenants = query.all()
            print(f"📊 Found {len(tenants)} tenants in database")
            
            result = [t.to_dict() for t in tenants]
            print(f"📤 Returning {len(result)} tenants")
            print("=" * 50)
            
            response = make_response(jsonify(result), 200)
            response.headers['Access-Control-Allow-Origin'] = '*'
            return response
        except Exception as e:
            print(f"❌ Error: {str(e)}")
            import traceback
            traceback.print_exc()
            response = make_response(jsonify({'error': str(e)}), 500)
            response.headers['Access-Control-Allow-Origin'] = '*'
            return response

    @staticmethod
    @jwt_required()
    def get_tenant(tenant_id):
        """Get a single tenant"""
        try:
            print(f"🔍 Getting tenant {tenant_id}")
            tenant = Tenant.query.get(tenant_id)
            if not tenant:
                print(f"❌ Tenant {tenant_id} not found")
                response = make_response(jsonify({'message': 'Tenant not found'}), 404)
                response.headers['Access-Control-Allow-Origin'] = '*'
                return response
            print(f"✅ Found tenant: {tenant.name}")
            response = make_response(jsonify(tenant.to_dict()), 200)
            response.headers['Access-Control-Allow-Origin'] = '*'
            return response
        except Exception as e:
            print(f"❌ Error: {str(e)}")
            response = make_response(jsonify({'error': str(e)}), 500)
            response.headers['Access-Control-Allow-Origin'] = '*'
            return response

    @staticmethod
    @jwt_required()
    def create_tenant():
        """Create a new tenant"""
        try:
            data = request.json
            print(f"📝 Creating tenant: {data.get('name')}")
            
            if data.get('unit_id'):
                unit = Unit.query.get(data.get('unit_id'))
                if unit and unit.status != 'available':
                    response = make_response(jsonify({'message': 'Unit is not available'}), 400)
                    response.headers['Access-Control-Allow-Origin'] = '*'
                    return response

            tenant = Tenant(
                property_id=data.get('property_id'),
                unit_id=data.get('unit_id'),
                name=data.get('name'),
                phone=data.get('phone'),
                email=data.get('email'),
                id_number=data.get('id_number'),
                monthly_rent=data.get('monthly_rent'),
                deposit=data.get('deposit'),
                move_in_date=datetime.strptime(data.get('move_in_date'), '%Y-%m-%d').date() if data.get('move_in_date') else None,
                status='active',
                emergency_contact_name=data.get('emergency_contact_name'),
                emergency_contact_phone=data.get('emergency_contact_phone'),
                notes=data.get('notes')
            )

            db.session.add(tenant)

            if data.get('unit_id'):
                unit = Unit.query.get(data.get('unit_id'))
                if unit:
                    unit.status = 'occupied'

            db.session.commit()
            print(f"✅ Tenant created with ID: {tenant.id}")

            response = make_response(jsonify({
                'message': 'Tenant created successfully',
                'tenant': tenant.to_dict()
            }), 201)
            response.headers['Access-Control-Allow-Origin'] = '*'
            return response
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error creating tenant: {str(e)}")
            import traceback
            traceback.print_exc()
            response = make_response(jsonify({'error': str(e)}), 500)
            response.headers['Access-Control-Allow-Origin'] = '*'
            return response

    @staticmethod
    @jwt_required()
    def update_tenant(tenant_id):
        """Update a tenant"""
        try:
            tenant = Tenant.query.get(tenant_id)
            if not tenant:
                response = make_response(jsonify({'message': 'Tenant not found'}), 404)
                response.headers['Access-Control-Allow-Origin'] = '*'
                return response

            data = request.json
            tenant.name = data.get('name', tenant.name)
            tenant.phone = data.get('phone', tenant.phone)
            tenant.email = data.get('email', tenant.email)
            tenant.id_number = data.get('id_number', tenant.id_number)
            tenant.monthly_rent = data.get('monthly_rent', tenant.monthly_rent)
            tenant.deposit = data.get('deposit', tenant.deposit)
            tenant.balance = data.get('balance', tenant.balance)
            tenant.status = data.get('status', tenant.status)
            tenant.emergency_contact_name = data.get('emergency_contact_name', tenant.emergency_contact_name)
            tenant.emergency_contact_phone = data.get('emergency_contact_phone', tenant.emergency_contact_phone)
            tenant.notes = data.get('notes', tenant.notes)
            tenant.updated_at = datetime.utcnow()

            db.session.commit()
            print(f"✅ Tenant {tenant_id} updated")

            response = make_response(jsonify({
                'message': 'Tenant updated successfully',
                'tenant': tenant.to_dict()
            }), 200)
            response.headers['Access-Control-Allow-Origin'] = '*'
            return response
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error updating tenant: {str(e)}")
            response = make_response(jsonify({'error': str(e)}), 500)
            response.headers['Access-Control-Allow-Origin'] = '*'
            return response

    @staticmethod
    @jwt_required()
    def delete_tenant(tenant_id):
        """Delete a tenant"""
        try:
            tenant = Tenant.query.get(tenant_id)
            if not tenant:
                response = make_response(jsonify({'message': 'Tenant not found'}), 404)
                response.headers['Access-Control-Allow-Origin'] = '*'
                return response

            if tenant.unit_id:
                unit = Unit.query.get(tenant.unit_id)
                if unit:
                    unit.status = 'available'

            db.session.delete(tenant)
            db.session.commit()
            print(f"✅ Tenant {tenant_id} deleted")

            response = make_response(jsonify({'message': 'Tenant deleted successfully'}), 200)
            response.headers['Access-Control-Allow-Origin'] = '*'
            return response
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error deleting tenant: {str(e)}")
            response = make_response(jsonify({'error': str(e)}), 500)
            response.headers['Access-Control-Allow-Origin'] = '*'
            return response

    @staticmethod
    @jwt_required()
    def get_tenant_stats():
        """Get tenant statistics"""
        try:
            property_id = request.args.get('property_id')
            print(f"📊 Getting tenant stats for property: {property_id}")
            
            query = Tenant.query
            if property_id:
                query = query.filter_by(property_id=property_id)
            
            tenants = query.all()
            print(f"📊 Found {len(tenants)} tenants")
            
            stats = {
                'total': len(tenants),
                'active': len([t for t in tenants if t.status == 'active']),
                'vacating': len([t for t in tenants if t.status == 'vacating']),
                'vacated': len([t for t in tenants if t.status == 'vacated'])
            }
            
            print(f"📤 Returning stats: {stats}")
            
            response = make_response(jsonify(stats), 200)
            response.headers['Access-Control-Allow-Origin'] = '*'
            return response
        except Exception as e:
            print(f"❌ Error getting tenant stats: {str(e)}")
            import traceback
            traceback.print_exc()
            response = make_response(jsonify({'error': str(e)}), 500)
            response.headers['Access-Control-Allow-Origin'] = '*'
            return response
