from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from App.Extension import db
from App.Models.UserModel import User
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.json
    
    if User.query.filter_by(email=data.get('email')).first():
        return jsonify({'message': 'User already exists'}), 400
    
    user = User(
        name=data.get('name'),
        email=data.get('email'),
        password=generate_password_hash(data.get('password')),
        phone=data.get('phone'),
        role=data.get('role', 'caretaker')
    )
    
    db.session.add(user)
    db.session.commit()
    
    return jsonify({
        'message': 'User registered successfully',
        'user': user.to_dict()
    }), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.json
        email = data.get('email')
        password = data.get('password')
        
        logger.info(f"🔐 Login attempt: {email}")
        
        user = User.query.filter_by(email=email).first()
        
        if not user:
            logger.warning(f"❌ User not found: {email}")
            return jsonify({'message': 'Invalid credentials'}), 401
        
        if not check_password_hash(user.password, password):
            logger.warning(f"❌ Invalid password for: {email}")
            return jsonify({'message': 'Invalid credentials'}), 401
        
        # IMPORTANT: Convert ID to string for JWT
        user_id = str(user.id)
        access_token = create_access_token(identity=user_id)
        logger.info(f"✅ Login successful: {email} with user_id: {user_id}")
        
        return jsonify({
            'token': access_token,
            'user': user.to_dict()
        }), 200
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        return jsonify({'message': str(e)}), 500

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    try:
        user_id = get_jwt_identity()
        logger.info(f"🔍 Getting user with ID: {user_id}")
        
        # Convert string back to int for database query
        user = User.query.get(int(user_id))
        
        if not user:
            logger.warning(f"❌ User not found with ID: {user_id}")
            return jsonify({'message': 'User not found'}), 404
        
        logger.info(f"✅ User found: {user.email}")
        return jsonify(user.to_dict()), 200
    except Exception as e:
        logger.error(f"Error in /me: {str(e)}")
        return jsonify({'message': str(e)}), 400

@auth_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(int(user_id))
        
        if not user:
            return jsonify({'message': 'User not found'}), 404
        
        data = request.json
        user.name = data.get('name', user.name)
        user.phone = data.get('phone', user.phone)
        user.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'message': 'Profile updated successfully',
            'user': user.to_dict()
        }), 200
    except Exception as e:
        logger.error(f"Profile update error: {str(e)}")
        return jsonify({'message': str(e)}), 400

@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(int(user_id))
        
        if not user:
            return jsonify({'message': 'User not found'}), 404
        
        data = request.json
        current_password = data.get('current_password')
        new_password = data.get('new_password')
        
        if not check_password_hash(user.password, current_password):
            return jsonify({'message': 'Current password is incorrect'}), 401
        
        user.password = generate_password_hash(new_password)
        user.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({'message': 'Password changed successfully'}), 200
    except Exception as e:
        logger.error(f"Password change error: {str(e)}")
        return jsonify({'message': str(e)}), 400
