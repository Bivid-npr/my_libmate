from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt
import bcrypt
from sqlalchemy import text
from ..extensions import db

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/login', methods=['POST'])
def login():
    """Login for both users and admins"""
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({'error': 'Email and password required'}), 400
    
    # Try regular users table first
    user_result = db.session.execute(
        text("SELECT * FROM users WHERE email = :email AND is_active = TRUE"),
        {'email': email}
    ).first()
    
    if user_result:
        user = dict(user_result._mapping)
        
        # Verify password
        try:
            if not bcrypt.checkpw(password.encode('utf-8'), user['password_hash'].encode('utf-8')):
                return jsonify({'error': 'Invalid credentials'}), 401
        except Exception:
            return jsonify({'error': 'Invalid credentials'}), 401
        
        # Create token with type='user' claim
        access_token = create_access_token(
            identity=str(user['user_id']),
            additional_claims={'type': 'user'}
        )
        
        user_data = {
            'user_id': user['user_id'],
            'full_name': user['full_name'],
            'email': user['email'],
            'phone': user['phone'],
            'address': user['address'],
            'role': user['role'],
            'profile_picture': user['profile_picture']
        }
        
        return jsonify({
            'token': access_token,
            'user': user_data,
            'is_admin': False
        }), 200
    
    # Try admins table
    admin_result = db.session.execute(
        text("SELECT * FROM admins WHERE email = :email AND is_active = TRUE"),
        {'email': email}
    ).first()
    
    if admin_result:
        admin = dict(admin_result._mapping)
        
        # Verify password
        try:
            if not bcrypt.checkpw(password.encode('utf-8'), admin['password_hash'].encode('utf-8')):
                return jsonify({'error': 'Invalid credentials'}), 401
        except Exception:
            return jsonify({'error': 'Invalid credentials'}), 401
        
        # Create token with type='admin' claim
        access_token = create_access_token(
            identity=str(admin['admin_id']),
            additional_claims={'type': 'admin'}
        )
        
        admin_data = {
            'user_id': admin['admin_id'],
            'full_name': admin['full_name'],
            'email': admin['email'],
            'phone': admin['phone'],
            'role': 'admin',
            'profile_picture': admin['profile_picture']
        }
        
        return jsonify({
            'token': access_token,
            'user': admin_data,
            'is_admin': True
        }), 200
    
    return jsonify({'error': 'Invalid credentials'}), 401


@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new regular user"""
    data = request.get_json()
    
    # Validate required fields
    if not data.get('email') or not data.get('password') or not data.get('full_name'):
        return jsonify({'error': 'Email, password, and full name required'}), 400
    
    # Validate email format
    if '@' not in data['email'] or '.' not in data['email']:
        return jsonify({'error': 'Invalid email format'}), 400
    
    # Validate password strength
    if len(data['password']) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400
    
    # Check if user already exists in users table
    existing_user = db.session.execute(
        text("SELECT user_id FROM users WHERE email = :email"),
        {'email': data['email']}
    ).first()
    
    if existing_user:
        return jsonify({'error': 'User already exists'}), 409
    
    # Check if email exists in admins table
    existing_admin = db.session.execute(
        text("SELECT admin_id FROM admins WHERE email = :email"),
        {'email': data['email']}
    ).first()
    
    if existing_admin:
        return jsonify({'error': 'Email already in use'}), 409
    
    # Hash password with bcrypt
    hashed = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt())
    
    # Insert new user (as guest initially)
    db.session.execute(
        text("""
            INSERT INTO users (full_name, email, phone, address, password_hash, role)
            VALUES (:full_name, :email, :phone, :address, :password_hash, 'guest')
        """),
        {
            'full_name': data['full_name'],
            'email': data['email'],
            'phone': data.get('phone'),
            'address': data.get('address'),
            'password_hash': hashed.decode('utf-8')
        }
    )
    db.session.commit()
    
    # Get the newly created user
    result = db.session.execute(
        text("SELECT * FROM users WHERE email = :email"),
        {'email': data['email']}
    ).first()
    
    user = dict(result._mapping)
    
    # Create token with type='user' claim
    access_token = create_access_token(
        identity=str(user['user_id']),
        additional_claims={'type': 'user'}
    )
    
    user_data = {
        'user_id': user['user_id'],
        'full_name': user['full_name'],
        'email': user['email'],
        'phone': user['phone'],
        'address': user['address'],
        'role': user['role'],
        'profile_picture': user['profile_picture']
    }
    
    return jsonify({
        'token': access_token,
        'user': user_data
    }), 201


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """Get current authenticated user/admin info"""
    identity = get_jwt_identity()
    claims = get_jwt()
    token_type = claims.get('type')
    
    if not identity or not token_type:
        return jsonify({'error': 'Invalid token'}), 401
    
    user_id = int(identity)
    
    if token_type == 'user':
        user_result = db.session.execute(
            text("SELECT * FROM users WHERE user_id = :user_id AND is_active = TRUE"),
            {'user_id': user_id}
        ).first()
        
        if not user_result:
            return jsonify({'error': 'User not found'}), 404
        
        user = dict(user_result._mapping)
        
        # Check active membership
        membership = db.session.execute(
            text("""
                SELECT * FROM memberships 
                WHERE user_id = :user_id AND status = 'active' AND expiry_date > CURDATE()
            """),
            {'user_id': user_id}
        ).first()
        
        user_data = {
            'user_id': user['user_id'],
            'full_name': user['full_name'],
            'email': user['email'],
            'phone': user['phone'],
            'address': user['address'],
            'role': user['role'],
            'profile_picture': user['profile_picture'],
            'created_at': user['created_at'].isoformat() if user['created_at'] else None
        }
        
        return jsonify({
            'user': user_data,
            'has_active_membership': membership is not None,
            'membership': dict(membership._mapping) if membership else None,
            'is_admin': False
        }), 200
    
    elif token_type == 'admin':
        admin_result = db.session.execute(
            text("SELECT * FROM admins WHERE admin_id = :admin_id AND is_active = TRUE"),
            {'admin_id': user_id}
        ).first()
        
        if not admin_result:
            return jsonify({'error': 'Admin not found'}), 404
        
        admin = dict(admin_result._mapping)
        
        admin_data = {
            'user_id': admin['admin_id'],
            'full_name': admin['full_name'],
            'email': admin['email'],
            'phone': admin['phone'],
            'role': 'admin',
            'profile_picture': admin['profile_picture'],
            'created_at': admin['created_at'].isoformat() if admin['created_at'] else None
        }
        
        return jsonify({
            'user': admin_data,
            'is_admin': True
        }), 200
    
    return jsonify({'error': 'Invalid token type'}), 401


@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    """Change password for regular users only"""
    claims = get_jwt()
    identity = get_jwt_identity()
    data = request.get_json()
    
    # Only regular users can change password here
    if claims.get('type') != 'user':
        return jsonify({'error': 'Only regular users can change password here'}), 403
    
    old_password = data.get('old_password')
    new_password = data.get('new_password')
    
    if not old_password or not new_password:
        return jsonify({'error': 'Old and new password required'}), 400
    
    if len(new_password) < 6:
        return jsonify({'error': 'New password must be at least 6 characters'}), 400
    
    user_id = int(identity)
    
    # Get current user
    result = db.session.execute(
        text("SELECT password_hash FROM users WHERE user_id = :user_id"),
        {'user_id': user_id}
    ).first()
    
    if not result:
        return jsonify({'error': 'User not found'}), 404
    
    # Verify old password - return 400 instead of 401
    if not bcrypt.checkpw(old_password.encode('utf-8'), result[0].encode('utf-8')):
        return jsonify({'error': 'Invalid current password'}), 400  # ← Changed from 401 to 400
    
    # Hash new password
    new_hashed = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt())
    
    # Update password
    db.session.execute(
        text("UPDATE users SET password_hash = :password_hash, updated_at = NOW() WHERE user_id = :user_id"),
        {'password_hash': new_hashed.decode('utf-8'), 'user_id': user_id}
    )
    db.session.commit()
    
    return jsonify({'message': 'Password changed successfully'}), 200


@auth_bp.route('/debug-token', methods=['GET'])
@jwt_required()
def debug_token():
    """Debug endpoint to check token info"""
    identity = get_jwt_identity()
    claims = get_jwt()
    
    return jsonify({
        'identity': identity,
        'type': claims.get('type'),
        'all_claims': claims
    }), 200