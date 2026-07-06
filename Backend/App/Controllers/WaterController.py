# App/Controllers/WaterController.py
from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from App.Extension import db
from App.Models.WaterReadingModel import WaterReading, WaterBill
from App.Models.TenantModel import Tenant
from datetime import datetime, timedelta


class WaterController:

    @staticmethod
    @jwt_required()
    def get_readings():
        """Get water readings (optionally filtered by tenant or property)"""
        tenant_id = request.args.get('tenant_id')
        property_id = request.args.get('property_id')

        query = WaterReading.query

        if tenant_id:
            query = query.filter_by(tenant_id=tenant_id)
        if property_id:
            query = query.join(Tenant).filter(Tenant.property_id == property_id)

        readings = query.order_by(WaterReading.reading_date.desc()).all()
        return jsonify([r.to_dict() for r in readings]), 200

    @staticmethod
    @jwt_required()
    def create_reading():
        """Create a new water reading"""
        data = request.json

        units_used = data.get('current_reading') - data.get('previous_reading')
        rate = data.get('rate', 70)
        amount = units_used * rate

        reading = WaterReading(
            tenant_id=data.get('tenant_id'),
            previous_reading=data.get('previous_reading'),
            current_reading=data.get('current_reading'),
            units_used=units_used,
            rate=rate,
            amount=amount,
            reading_date=datetime.strptime(data.get('reading_date'), '%Y-%m-%d').date() if data.get(
                'reading_date') else datetime.now().date(),
            notes=data.get('notes'),
            status='pending'
        )

        db.session.add(reading)
        db.session.commit()

        return jsonify({
            'message': 'Water reading submitted successfully',
            'reading': reading.to_dict()
        }), 201

    @staticmethod
    @jwt_required()
    def get_bills():
        """Get water bills (optionally filtered by tenant or property)"""
        tenant_id = request.args.get('tenant_id')
        property_id = request.args.get('property_id')
        status = request.args.get('status')

        query = WaterBill.query

        if tenant_id:
            query = query.filter_by(tenant_id=tenant_id)
        if property_id:
            query = query.filter_by(property_id=property_id)
        if status:
            query = query.filter_by(status=status)

        bills = query.order_by(WaterBill.month.desc()).all()
        return jsonify([b.to_dict() for b in bills]), 200

    @staticmethod
    @jwt_required()
    def generate_bill():
        """Generate a water bill from a reading"""
        data = request.json
        reading_id = data.get('reading_id')

        reading = WaterReading.query.get(reading_id)
        if not reading:
            return jsonify({'message': 'Reading not found'}), 404

        tenant = Tenant.query.get(reading.tenant_id)
        if not tenant:
            return jsonify({'message': 'Tenant not found'}), 404

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

        return jsonify({
            'message': 'Water bill generated successfully',
            'bill': bill.to_dict()
        }), 201

    @staticmethod
    @jwt_required()
    def update_bill_status(bill_id):
        """Update water bill status"""
        bill = WaterBill.query.get(bill_id)
        if not bill:
            return jsonify({'message': 'Bill not found'}), 404

        data = request.json
        bill.status = data.get('status', bill.status)

        db.session.commit()

        return jsonify({
            'message': 'Bill status updated successfully',
            'bill': bill.to_dict()
        }), 200

    @staticmethod
    @jwt_required()
    def get_consumption_history():
        """Get water consumption history for a tenant"""
        tenant_id = request.args.get('tenant_id')

        if not tenant_id:
            return jsonify({'message': 'Tenant ID required'}), 400

        readings = WaterReading.query.filter_by(tenant_id=tenant_id).order_by(WaterReading.reading_date).all()

        # Group by month
        monthly_data = {}
        for r in readings:
            month_key = r.reading_date.strftime('%Y-%m')
            if month_key not in monthly_data:
                monthly_data[month_key] = 0
            monthly_data[month_key] += r.units_used or 0

        result = [{'month': k, 'units': v} for k, v in monthly_data.items()]

        return jsonify(result), 200

    @staticmethod
    @jwt_required()
    def get_summary():
        """Get water billing summary"""
        property_id = request.args.get('property_id')

        query = WaterBill.query
        if property_id:
            query = query.filter_by(property_id=property_id)

        bills = query.all()

        total_readings = WaterReading.query.count()
        total_amount = sum([b.total or 0 for b in bills])
        pending = len([b for b in bills if b.status == 'pending'])

        # Calculate average consumption
        readings = WaterReading.query.all()
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