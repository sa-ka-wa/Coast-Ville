# App/Controllers/WaterController.py
from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from App.Extension import db
from App.Models.WaterReadingModel import WaterReading, WaterBill
from App.Models.TenantModel import Tenant
from App.Models.UserModel import User
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


class WaterController:

    @staticmethod
    @jwt_required()
    def get_readings():
        """Get water readings (optionally filtered by tenant or property)"""
        try:
            # Get user from token (for logging only)
            current_user_id = get_jwt_identity()
            user = User.query.get(current_user_id)

            # Get filter parameters
            tenant_id = request.args.get('tenant_id')
            property_id = request.args.get('property_id')
            status = request.args.get('status')
            start_date = request.args.get('start_date')
            end_date = request.args.get('end_date')

            print(f"📡 GET /water/readings called with property_id: {property_id}, tenant_id: {tenant_id}")

            query = WaterReading.query

            # Filter by tenant_id if provided
            if tenant_id:
                query = query.filter_by(tenant_id=tenant_id)

            # Filter by property_id if provided
            if property_id:
                query = query.join(Tenant).filter(Tenant.property_id == property_id)

            # Filter by status if provided
            if status:
                query = query.filter_by(status=status)

            # Filter by date range if provided
            if start_date:
                query = query.filter(WaterReading.reading_date >= start_date)
            if end_date:
                query = query.filter(WaterReading.reading_date <= end_date)

            # ✅ REMOVED: user.property_id check since User doesn't have this field

            readings = query.order_by(WaterReading.reading_date.desc()).all()

            # Manually build response with tenant info
            result = []
            for r in readings:
                # Get house number from unit relationship
                house_no = 'N/A'
                if r.tenant and r.tenant.unit:
                    house_no = r.tenant.unit.unit_number

                result.append({
                    'id': r.id,
                    'tenant_id': r.tenant_id,
                    'tenant_name': r.tenant.name if r.tenant else 'Unknown',
                    'house_no': house_no,
                    'previous_reading': r.previous_reading,
                    'current_reading': r.current_reading,
                    'units_used': r.units_used,
                    'rate': r.rate,
                    'amount': r.amount,
                    'reading_date': r.reading_date.isoformat() if r.reading_date else None,
                    'notes': r.notes,
                    'status': r.status,
                    'created_at': r.created_at.isoformat() if r.created_at else None,
                    'updated_at': r.updated_at.isoformat() if r.updated_at else None,
                })

            print(f"📊 Found {len(result)} water readings" +
                  (f" for property {property_id}" if property_id else "") +
                  (f" for tenant {tenant_id}" if tenant_id else ""))

            return jsonify(result), 200

        except Exception as e:
            print(f"Error getting readings: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({'error': str(e)}), 500

    @staticmethod
    @jwt_required()
    def get_bills():
        """Get water bills (optionally filtered by tenant or property)"""
        try:
            # Get user from token (for logging only)
            current_user_id = get_jwt_identity()
            user = User.query.get(current_user_id)

            # Get filter parameters
            tenant_id = request.args.get('tenant_id')
            property_id = request.args.get('property_id')
            status = request.args.get('status')

            print(f"📡 GET /water/bills called with property_id: {property_id}, tenant_id: {tenant_id}")

            query = WaterBill.query

            if tenant_id:
                query = query.filter_by(tenant_id=tenant_id)
            if property_id:
                query = query.filter_by(property_id=property_id)
            if status:
                query = query.filter_by(status=status)

            # ✅ REMOVED: user.property_id check since User doesn't have this field

            bills = query.order_by(WaterBill.month.desc()).all()

            print(f"📊 Found {len(bills)} water bills" +
                  (f" for property {property_id}" if property_id else "") +
                  (f" for tenant {tenant_id}" if tenant_id else ""))

            return jsonify([b.to_dict() for b in bills]), 200

        except Exception as e:
            print(f"Error getting bills: {e}")
            return jsonify({'error': str(e)}), 500

    @staticmethod
    @jwt_required()
    def get_summary():
        """Get water billing summary"""
        try:
            # Get user from token (for logging only)
            current_user_id = get_jwt_identity()
            user = User.query.get(current_user_id)

            property_id = request.args.get('property_id')

            print(f"📡 GET /water/summary called with property_id: {property_id}")

            query = WaterBill.query
            if property_id:
                query = query.filter_by(property_id=property_id)

            # ✅ REMOVED: user.property_id check since User doesn't have this field

            bills = query.all()

            # Get readings with same property filter
            readings_query = WaterReading.query
            if property_id:
                readings_query = readings_query.join(Tenant).filter(Tenant.property_id == property_id)

            readings = readings_query.all()

            total_readings = len(readings)
            total_amount = sum([b.total or 0 for b in bills])
            pending = len([b for b in bills if b.status == 'pending'])

            # Calculate average consumption
            avg_consumption = 0
            if readings:
                total_units = sum([r.units_used or 0 for r in readings])
                avg_consumption = round(total_units / len(readings), 2)

            return jsonify({
                'totalReadings': total_readings,
                'totalAmount': total_amount,
                'pending': pending,
                'averageConsumption': avg_consumption
            }), 200

        except Exception as e:
            print(f"Error getting summary: {e}")
            return jsonify({'error': str(e)}), 500

    @staticmethod
    @jwt_required()
    def get_readings_with_tenant(tenant_id):
        """Get water readings for a specific tenant - Nested RESTful approach"""
        try:
            tenant = Tenant.query.get(tenant_id)
            if not tenant:
                return jsonify({'error': 'Tenant not found'}), 404

            readings = WaterReading.query.filter_by(tenant_id=tenant_id) \
                .order_by(WaterReading.reading_date.desc()).all()

            print(f"📊 Found {len(readings)} water readings for tenant {tenant_id}")

            return jsonify([r.to_dict() for r in readings]), 200
        except Exception as e:
            print(f"Error getting readings for tenant: {e}")
            return jsonify({'error': str(e)}), 500

    @staticmethod
    @jwt_required()
    def get_bills_for_tenant(tenant_id):
        """Get water bills for a specific tenant - Nested RESTful approach"""
        try:
            tenant = Tenant.query.get(tenant_id)
            if not tenant:
                return jsonify({'error': 'Tenant not found'}), 404

            bills = WaterBill.query.filter_by(tenant_id=tenant_id) \
                .order_by(WaterBill.month.desc()).all()

            print(f"📊 Found {len(bills)} water bills for tenant {tenant_id}")

            return jsonify([b.to_dict() for b in bills]), 200
        except Exception as e:
            print(f"Error getting bills for tenant: {e}")
            return jsonify({'error': str(e)}), 500

    # App/Controllers/WaterController.py - Replace the create_reading method

    @staticmethod
    @jwt_required()
    def create_reading():
        """Create a new water reading"""
        try:
            data = request.json

            # Get user from token (for logging only)
            current_user_id = get_jwt_identity()
            user = User.query.get(current_user_id)

            # Verify tenant exists
            tenant_id = data.get('tenant_id')
            if not tenant_id:
                return jsonify({'error': 'tenant_id is required'}), 400

            tenant = Tenant.query.get(tenant_id)
            if not tenant:
                return jsonify({'error': 'Tenant not found'}), 404

            # ✅ Convert to float - THIS IS THE KEY FIX
            try:
                previous_reading = float(data.get('previous_reading', 0))
                current_reading = float(data.get('current_reading', 0))
            except (TypeError, ValueError) as e:
                return jsonify({'error': f'Invalid reading values: {str(e)}'}), 400

            units_used = current_reading - previous_reading

            if units_used < 0:
                return jsonify({'error': 'Current reading must be greater than previous reading'}), 400

            rate = float(data.get('rate', 70))
            amount = units_used * rate

            # Get reading date
            reading_date = data.get('reading_date')
            if reading_date:
                try:
                    reading_date = datetime.strptime(reading_date, '%Y-%m-%d').date()
                except ValueError:
                    reading_date = datetime.now().date()
            else:
                reading_date = datetime.now().date()

            reading = WaterReading(
                tenant_id=tenant_id,
                previous_reading=previous_reading,
                current_reading=current_reading,
                units_used=units_used,
                rate=rate,
                amount=amount,
                reading_date=reading_date,
                notes=data.get('notes'),
                status='pending'
            )

            db.session.add(reading)
            db.session.commit()

            print(f"✅ New water reading created for tenant {tenant_id}")

            return jsonify({
                'message': 'Water reading submitted successfully',
                'reading': reading.to_dict()
            }), 201

        except Exception as e:
            db.session.rollback()
            print(f"Error creating reading: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({'error': str(e)}), 500

    @staticmethod
    @jwt_required()
    def generate_bill():
        """Generate a water bill from a reading"""
        try:
            data = request.json
            reading_id = data.get('reading_id')

            reading = WaterReading.query.get(reading_id)
            if not reading:
                return jsonify({'message': 'Reading not found'}), 404

            tenant = Tenant.query.get(reading.tenant_id)
            if not tenant:
                return jsonify({'message': 'Tenant not found'}), 404

            # Get user from token (for logging only)
            current_user_id = get_jwt_identity()
            user = User.query.get(current_user_id)

            # ✅ REMOVED: user.property_id check since User doesn't have this field

            # Check if bill already exists for this month
            existing_bill = WaterBill.query.filter_by(
                tenant_id=tenant.id,
                month=reading.reading_date.replace(day=1)
            ).first()

            if existing_bill:
                return jsonify({'message': 'Bill already exists for this month'}), 400

            bill = WaterBill(
                property_id=tenant.property_id,
                tenant_id=tenant.id,
                unit_id=tenant.unit_id,
                month=reading.reading_date.replace(day=1),
                water_charge=reading.amount,
                garbage_charge=300,
                total=reading.amount + 300,
                status='pending'
            )

            db.session.add(bill)
            reading.status = 'billed'
            db.session.commit()

            print(f"✅ Water bill generated for tenant {tenant.id} for month {bill.month}")

            return jsonify({
                'message': 'Water bill generated successfully',
                'bill': bill.to_dict()
            }), 201

        except Exception as e:
            db.session.rollback()
            print(f"Error generating bill: {e}")
            return jsonify({'error': str(e)}), 500

    @staticmethod
    @jwt_required()
    def update_bill_status(bill_id):
        """Update water bill status"""
        try:
            bill = WaterBill.query.get(bill_id)
            if not bill:
                return jsonify({'message': 'Bill not found'}), 404

            # Get user from token (for logging only)
            current_user_id = get_jwt_identity()
            user = User.query.get(current_user_id)

            # ✅ REMOVED: user.property_id check since User doesn't have this field

            data = request.json
            bill.status = data.get('status', bill.status)

            db.session.commit()

            print(f"✅ Bill {bill_id} status updated to {bill.status}")

            return jsonify({
                'message': 'Bill status updated successfully',
                'bill': bill.to_dict()
            }), 200

        except Exception as e:
            db.session.rollback()
            print(f"Error updating bill status: {e}")
            return jsonify({'error': str(e)}), 500

    @staticmethod
    @jwt_required()
    def get_consumption_history():
        """Get water consumption history for a tenant or property"""
        try:
            tenant_id = request.args.get('tenant_id')
            property_id = request.args.get('property_id')

            # If no filters provided, return empty array with message
            if not tenant_id and not property_id:
                return jsonify([]), 200

            # Start with base query
            query = WaterReading.query

            # Filter by tenant_id if provided
            if tenant_id:
                # Verify tenant exists
                tenant = Tenant.query.get(tenant_id)
                if not tenant:
                    return jsonify({'error': 'Tenant not found'}), 404

                query = query.filter_by(tenant_id=tenant_id)

            # Filter by property_id if provided
            elif property_id:
                query = query.join(Tenant).filter(Tenant.property_id == property_id)

            readings = query.order_by(WaterReading.reading_date).all()

            # Group by month
            monthly_data = {}
            for r in readings:
                if r.reading_date:
                    month_key = r.reading_date.strftime('%Y-%m')
                    if month_key not in monthly_data:
                        monthly_data[month_key] = 0
                    monthly_data[month_key] += r.units_used or 0

            result = [{'month': k, 'units': v} for k, v in monthly_data.items()]

            return jsonify(result), 200

        except Exception as e:
            print(f"Error getting consumption history: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({'error': str(e)}), 500

    # App/Controllers/WaterController.py - Update the quick_enter_readings method

    @staticmethod
    @jwt_required()
    def quick_enter_readings():
        """Quick water reading entry - enter multiple readings at once"""
        try:
            data = request.json
            readings = data.get('readings', [])
            property_id = data.get('property_id')

            # Get user from token (for logging only)
            current_user_id = get_jwt_identity()
            user = User.query.get(current_user_id)

            results = []
            errors = []

            for reading_data in readings:
                try:
                    tenant_id = reading_data.get('tenant_id')
                    # ✅ Convert to float and handle potential None/null values
                    previous = float(reading_data.get('previous_reading') or 0)
                    current = float(reading_data.get('current_reading') or 0)

                    # Verify tenant exists and belongs to property
                    tenant = Tenant.query.get(tenant_id)
                    if not tenant:
                        errors.append(f"Tenant {tenant_id} not found")
                        continue

                    if property_id and tenant.property_id != property_id:
                        errors.append(f"Tenant {tenant.name} not in property")
                        continue

                    # Calculate values
                    units_used = current - previous
                    if units_used < 0:
                        errors.append(
                            f"Invalid reading for {tenant.name}: Current ({current}) must be greater than previous ({previous})")
                        continue

                    rate = float(reading_data.get('rate', 70))
                    amount = units_used * rate

                    reading = WaterReading(
                        tenant_id=tenant_id,
                        previous_reading=previous,
                        current_reading=current,
                        units_used=units_used,
                        rate=rate,
                        amount=amount,
                        reading_date=datetime.strptime(reading_data.get('reading_date'),
                                                       '%Y-%m-%d').date() if reading_data.get(
                            'reading_date') else datetime.now().date(),
                        notes=reading_data.get('notes', 'Quick entry'),
                        status='pending'
                    )

                    db.session.add(reading)
                    results.append({
                        'tenant_id': tenant_id,
                        'tenant_name': tenant.name,
                        'units_used': units_used,
                        'amount': amount
                    })

                except ValueError as e:
                    errors.append(f"Invalid number format for tenant {tenant_id}: {str(e)}")
                except Exception as e:
                    errors.append(str(e))

            db.session.commit()

            return jsonify({
                'message': f'Added {len(results)} readings',
                'results': results,
                'errors': errors
            }), 201

        except Exception as e:
            db.session.rollback()
            logger.error(f"Quick entry failed: {str(e)}")
            return jsonify({'error': str(e)}), 500