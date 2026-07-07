# App/Controllers/UnitController.py
from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from App.Extension import db
from App.Models.UnitModel import Unit
from App.Models.PropertyModel import Property
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class UnitController:

    @staticmethod
    @jwt_required()
    def get_units():
        """Get all units (optionally filtered by property)"""
        try:
            property_id = request.args.get('property_id')
            status = request.args.get('status')

            query = Unit.query
            if property_id:
                query = query.filter_by(property_id=property_id)
            if status:
                query = query.filter_by(status=status)

            units = query.order_by(Unit.unit_number).all()
            return jsonify([u.to_dict() for u in units]), 200
        except Exception as e:
            logger.error(f"Error getting units: {str(e)}")
            return jsonify({'error': str(e)}), 500

    @staticmethod
    @jwt_required()
    def get_available_units():
        """Get available units for a property"""
        try:
            property_id = request.args.get('property_id')

            query = Unit.query.filter_by(status='available')
            if property_id:
                query = query.filter_by(property_id=property_id)

            units = query.order_by(Unit.unit_number).all()
            return jsonify([u.to_dict() for u in units]), 200
        except Exception as e:
            logger.error(f"Error getting available units: {str(e)}")
            return jsonify({'error': str(e)}), 500

    @staticmethod
    @jwt_required()
    def get_unit(unit_id):
        """Get a single unit"""
        try:
            unit = Unit.query.get(unit_id)
            if not unit:
                return jsonify({'message': 'Unit not found'}), 404
            return jsonify(unit.to_dict()), 200
        except Exception as e:
            logger.error(f"Error getting unit: {str(e)}")
            return jsonify({'error': str(e)}), 500

    @staticmethod
    @jwt_required()
    def update_unit_status(unit_id):
        """Update unit status"""
        try:
            unit = Unit.query.get(unit_id)
            if not unit:
                return jsonify({'message': 'Unit not found'}), 404

            data = request.json
            status = data.get('status')
            if status:
                unit.status = status
                db.session.commit()

            return jsonify({
                'message': 'Unit status updated successfully',
                'unit': unit.to_dict()
            }), 200
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error updating unit status: {str(e)}")
            return jsonify({'error': str(e)}), 500

    @staticmethod
    @jwt_required()
    def create_unit():
        """Create a new unit"""
        try:
            data = request.json

            unit = Unit(
                property_id=data.get('property_id'),
                unit_number=data.get('unit_number'),
                floor=data.get('floor'),
                unit_type=data.get('unit_type'),
                monthly_rent=data.get('monthly_rent'),
                deposit=data.get('deposit'),
                status=data.get('status', 'available'),
                size_sqft=data.get('size_sqft'),
                bedrooms=data.get('bedrooms'),
                bathrooms=data.get('bathrooms')
            )

            db.session.add(unit)
            db.session.commit()

            return jsonify({
                'message': 'Unit created successfully',
                'unit': unit.to_dict()
            }), 201
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error creating unit: {str(e)}")
            return jsonify({'error': str(e)}), 500