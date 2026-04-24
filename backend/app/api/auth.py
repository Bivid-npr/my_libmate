from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt
from datetime import timedelta
import bcrypt
from sqlalchemy import text
from ..extensions import db

auth_bp = Blueprint('auth', __name__)

# Constants
USER_FIELDS = ['user_id', 'full_name', 'email', 'phone', 'address', 'role', 'profile_picture']
ADMIN_FIELDS = ['admin_id', 'full_name', 'email', 'phone', 'profile_picture']

def _build_user_data(row, is_admin=False):
    """Build standardized user data dict"""
    if is_admin:
        return {
            'user_id': row['admin_id'],
            'full_name': row['full_name'],
            'email': row['email'],
            'phone': row['phone'],
            'role': 'admin',
            'profile_picture': row['profile_picture']
        }
    return {
        'user_id': row['user_id'],
        'full_name': row['full_name'],
        'email': row['email'],
        'phone': row['phone'],
        'address': row.get('address'),
        'role': row['role'],
        'profile_picture': row['profile_picture']
    }

def _verify_password(password, password_hash):
    """Verify bcrypt password"""
    try:
        return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))
    except Exception:
        return False

def _create_token(user_id, user_type, remember_me=False):
    """Create JWT token with proper expiration"""
    expires = timedelta(days=7) if remember_me else timedelta(hours=2)
    return create_access_token(
        identity=str(user_id),
        additional_claims={'type': user_type},
        expires_delta=expires
    )


@auth_bp.route('/login', methods=['POST'])
def login():
    """Login for both users and admins"""
    data = request.get_json()
    email = data.get('email', '').strip()
    password = data.get('password', '')
    remember_me = data.get('remember_me', False)
    
    if not email or not password:
        return jsonify({'error': 'Email and password required'}), 400
    
    # Try users table
    user = db.session.execute(
        text("SELECT * FROM users WHERE email = :email AND is_active = TRUE"),
        {'email': email}
    ).first()
    
    if user:
        user = dict(user._mapping)
        if not _verify_password(password, user['password_hash']):
            return jsonify({'error': 'Invalid credentials'}), 401
        
        token = _create_token(user['user_id'], 'user', remember_me)
        return jsonify({
            'token': token,
            'user': _build_user_data(user),
            'is_admin': False
        }), 200
    
    # Try admins table
    admin = db.session.execute(
        text("SELECT * FROM admins WHERE email = :email AND is_active = TRUE"),
        {'email': email}
    ).first()
    
    if admin:
        admin = dict(admin._mapping)
        if not _verify_password(password, admin['password_hash']):
            return jsonify({'error': 'Invalid credentials'}), 401
        
        token = _create_token(admin['admin_id'], 'admin', remember_me)
        return jsonify({
            'token': token,
            'user': _build_user_data(admin, is_admin=True),
            'is_admin': True
        }), 200
    
    return jsonify({'error': 'Invalid credentials'}), 401


@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new regular user"""
    data = request.get_json()
    email = data.get('email', '').strip()
    password = data.get('password', '')
    full_name = data.get('full_name', '').strip()
    
    if not email or not password or not full_name:
        return jsonify({'error': 'Email, password, and full name required'}), 400
    
    if '@' not in email or '.' not in email:
        return jsonify({'error': 'Invalid email format'}), 400
    
    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400
    
    # Check existing
    for table, field in [('users', 'user_id'), ('admins', 'admin_id')]:
        exists = db.session.execute(
            text(f"SELECT {field} FROM {table} WHERE email = :email"),
            {'email': email}
        ).first()
        if exists:
            return jsonify({'error': 'Email already in use'}), 409
    
    hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    db.session.execute(
        text("""
            INSERT INTO users (full_name, email, phone, address, password_hash, role)
            VALUES (:full_name, :email, :phone, :address, :password_hash, 'guest')
        """),
        {
            'full_name': full_name,
            'email': email,
            'phone': data.get('phone'),
            'address': data.get('address'),
            'password_hash': hashed
        }
    )
    db.session.commit()
    
    user = db.session.execute(
        text("SELECT * FROM users WHERE email = :email"),
        {'email': email}
    ).first()
    user = dict(user._mapping)
    
    token = _create_token(user['user_id'], 'user')
    return jsonify({
        'token': token,
        'user': _build_user_data(user)
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
        user = db.session.execute(
            text("SELECT * FROM users WHERE user_id = :user_id AND is_active = TRUE"),
            {'user_id': user_id}
        ).first()
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        user = dict(user._mapping)
        membership = db.session.execute(
            text("SELECT * FROM memberships WHERE user_id = :user_id AND status = 'active' AND expiry_date > CURDATE()"),
            {'user_id': user_id}
        ).first()
        
        return jsonify({
            'user': {**_build_user_data(user), 'created_at': user['created_at'].isoformat() if user.get('created_at') else None},
            'has_active_membership': membership is not None,
            'membership': dict(membership._mapping) if membership else None,
            'is_admin': False
        }), 200
    
    elif token_type == 'admin':
        admin = db.session.execute(
            text("SELECT * FROM admins WHERE admin_id = :admin_id AND is_active = TRUE"),
            {'admin_id': user_id}
        ).first()
        
        if not admin:
            return jsonify({'error': 'Admin not found'}), 404
        
        admin = dict(admin._mapping)
        return jsonify({
            'user': {**_build_user_data(admin, is_admin=True), 'created_at': admin['created_at'].isoformat() if admin.get('created_at') else None},
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
    
    if claims.get('type') != 'user':
        return jsonify({'error': 'Only regular users can change password here'}), 403
    
    old_password = data.get('old_password', '')
    new_password = data.get('new_password', '')
    
    if not old_password or not new_password:
        return jsonify({'error': 'Old and new password required'}), 400
    
    if len(new_password) < 6:
        return jsonify({'error': 'New password must be at least 6 characters'}), 400
    
    user_id = int(identity)
    result = db.session.execute(
        text("SELECT password_hash FROM users WHERE user_id = :user_id"),
        {'user_id': user_id}
    ).first()
    
    if not result:
        return jsonify({'error': 'User not found'}), 404
    
    if not _verify_password(old_password, result[0]):
        return jsonify({'error': 'Invalid current password'}), 400
    
    new_hashed = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    db.session.execute(
        text("UPDATE users SET password_hash = :hash, updated_at = NOW() WHERE user_id = :user_id"),
        {'hash': new_hashed, 'user_id': user_id}
    )
    db.session.commit()
    
    return jsonify({'message': 'Password changed successfully'}), 200