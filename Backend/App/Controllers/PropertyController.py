# App/Controllers/PropertyController.py
from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from App.Extension import db
from App.Models.PropertyModel import Property
from datetime import datetime


class PropertyController:

    @staticmethod
    @jwt_required()
    def get_properties():
        """Get all properties"""
        properties = Property.query.all()
        return jsonify([p.to_dict() for p in properties]), 200

    @staticmethod
    @jwt_required()
    def get_property(property_id):
        """Get a single property"""
        property = Property.query.get(property_id)
        if not property:
            return jsonify({'message': 'Property not found'}), 404
        return jsonify(property.to_dict()), 200

    @staticmethod
    @jwt_required()
    def create_property():
        """Create a new property"""
        data = request.json

        property = Property(
            name=data.get('name'),
            address=data.get('address'),
            city=data.get('city'),
            county=data.get('county'),
            total_units=data.get('total_units', 0),
            owner_name=data.get('owner_name'),
            owner_phone=data.get('owner_phone'),
            owner_email=data.get('owner_email'),
            status='active'
        )

        db.session.add(property)
        db.session.commit()

        return jsonify({
            'message': 'Property created successfully',
            'property': property.to_dict()
        }), 201

    @staticmethod
    @jwt_required()
    def update_property(property_id):
        """Update a property"""
        property = Property.query.get(property_id)
        if not property:
            return jsonify({'message': 'Property not found'}), 404

        data = request.json
        property.name = data.get('name', property.name)
        property.address = data.get('address', property.address)
        property.city = data.get('city', property.city)
        property.county = data.get('county', property.county)
        property.total_units = data.get('total_units', property.total_units)
        property.owner_name = data.get('owner_name', property.owner_name)
        property.owner_phone = data.get('owner_phone', property.owner_phone)
        property.owner_email = data.get('owner_email', property.owner_email)
        property.status = data.get('status', property.status)
        property.updated_at = datetime.utcnow()

        db.session.commit()

        return jsonify({
            'message': 'Property updated successfully',
            'property': property.to_dict()
        }), 200

    @staticmethod
    @jwt_required()
    def delete_property(property_id):
        """Delete a property"""
        property = Property.query.get(property_id)
        if not property:
            return jsonify({'message': 'Property not found'}), 404

        db.session.delete(property)
        db.session.commit()

        return jsonify({'message': 'Property deleted successfully'}), 200

    @staticmethod
    @jwt_required()
    def get_property_stats(property_id):
        """Get property statistics"""
        property = Property.query.get(property_id)
        if not property:
            return jsonify({'message': 'Property not found'}), 404

        # Get stats from related models
        total_units = property.total_units
        occupied = len([u for u in property.units if u.status == 'occupied'])
        vacant = total_units - occupied

        # Calculate rent stats
        total_rent = sum([t.monthly_rent or 0 for t in property.tenants if t.status == 'active'])
        total_collected = sum([p.amount for p in property.payments if p.status == 'paid'])
        balance = total_rent - total_collected

        return jsonify({
            'totalUnits': total_units,
            'occupied': occupied,
            'vacant': vacant,
            'expectedRent': total_rent,
            'collected': total_collected,
            'balance': balance,
            'waterPending': len([w for w in property.water_bills if w.status == 'pending'])
        }), 200