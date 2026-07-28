# App/Controllers/AuthController.py
from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from App.Models.UserModel import User
from App.Extension import db


class AuthController:
    @staticmethod
    @jwt_required()
    def switch_role():
        """Switch user role between admin and caretaker"""
        try:
            user_id = get_jwt_identity()
            data = request.get_json()
            new_role = data.get('role')

            if new_role not in ['admin', 'caretaker']:
                return jsonify({'message': 'Invalid role'}), 400

            user = User.query.get(user_id)
            if not user:
                return jsonify({'message': 'User not found'}), 404

            # Check if user has the requested role
            available_roles = [user.role]
            if user.secondary_role:
                available_roles.append(user.secondary_role)

            if new_role not in available_roles:
                return jsonify({'message': 'User does not have this role'}), 403

            # Switch the role
            user.role = new_role
            db.session.commit()

            return jsonify({
                'message': 'Role switched successfully',
                'user': user.to_dict()
            }), 200

        except Exception as e:
            db.session.rollback()
            return jsonify({'message': f'Error switching role: {str(e)}'}), 500

    @staticmethod
    @jwt_required()
    def get_current_user():
        """Get current user information"""
        try:
            user_id = get_jwt_identity()
            user = User.query.get(user_id)

            if not user:
                return jsonify({'message': 'User not found'}), 404

            return jsonify(user.to_dict()), 200

        except Exception as e:
            return jsonify({'message': f'Error fetching user: {str(e)}'}), 500