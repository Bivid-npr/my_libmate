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
    phone = data.get('phone', '').strip()
    
    if not email or not password or not full_name:
        return jsonify({'error': 'Email, password, and full name required'}), 400
    
    if '@' not in email or '.' not in email:
        return jsonify({'error': 'Invalid email format'}), 400
    
    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400
    
    # Check if email already exists
    for table, field in [('users', 'user_id'), ('admins', 'admin_id')]:
        exists = db.session.execute(
            text(f"SELECT {field} FROM {table} WHERE email = :email"),
            {'email': email}
        ).first()
        if exists:
            return jsonify({'error': 'Email already in use'}), 409
    
    # Check if phone matches an existing offline member — link accounts
    if phone:
        offline = db.session.execute(
            text("""
                SELECT u.user_id, u.full_name
                FROM users u
                JOIN memberships m ON u.user_id = m.user_id AND m.status = 'active'
                WHERE u.phone = :p AND u.email LIKE '%@libmate.local'
                LIMIT 1
            """),
            {'p': phone}
        ).first()
        
        if offline:
            hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            db.session.execute(
                text("UPDATE users SET email = :e, password_hash = :h, full_name = :n, updated_at = NOW() WHERE user_id = :uid"),
                {'e': email, 'h': hashed, 'n': full_name, 'uid': offline[0]}
            )
            db.session.commit()
            
            user = db.session.execute(
                text("SELECT * FROM users WHERE user_id = :uid"), {'uid': offline[0]}
            ).first()
            user = dict(user._mapping)
            
            token = _create_token(user['user_id'], 'user')
            return jsonify({
                'token': token,
                'user': _build_user_data(user),
                'message': f'Welcome back, {user["full_name"]}! Your existing membership has been linked.'
            }), 200
    
    # Normal registration
    hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    db.session.execute(
        text("""
            INSERT INTO users (full_name, email, phone, address, password_hash, role)
            VALUES (:full_name, :email, :phone, :address, :password_hash, 'guest')
        """),
        {
            'full_name': full_name,
            'email': email,
            'phone': phone,
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


@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    """Send password reset email"""
    from flask_jwt_extended import create_access_token
    
    data = request.get_json()
    email = data.get('email', '').strip()
    
    if not email:
        return jsonify({'error': 'Email is required'}), 400
    
    # Check if user exists (users OR admins)
    user = db.session.execute(
        text("SELECT 'user' as user_type, user_id, full_name, email FROM users WHERE email = :email AND is_active = TRUE"),
        {'email': email}
    ).first()
    
    user_type = 'user'
    if not user:
        user = db.session.execute(
            text("SELECT 'admin' as user_type, admin_id as user_id, full_name, email FROM admins WHERE email = :email AND is_active = TRUE"),
            {'email': email}
        ).first()
        user_type = 'admin'
    
    if not user:
        # Don't reveal if email exists (security)
        return jsonify({'message': 'If an account with that email exists, a reset link has been sent.'}), 200
    
    user = dict(user._mapping)
    
    # Create a short-lived JWT token with email and type embedded
    reset_token = create_access_token(
        identity=str(user['user_id']),
        additional_claims={
            'type': user_type,
            'email': email,
            'purpose': 'password_reset'
        },
        expires_delta=timedelta(hours=1)
    )
    
    # Send email
    reset_link = f"http://localhost:5173/reset-password/{reset_token}"
    
    subject = "LibMate - Password Reset"
    body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #4A3728;">LibMate Library</h2>
        <p>Dear {user['full_name']},</p>
        <p>You requested a password reset. Click the button below to reset your password:</p>
        <div style="text-align: center; margin: 20px 0;">
            <a href="{reset_link}" 
               style="background: #C4895A; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                Reset Password
            </a>
        </div>
        <p>Or copy this link: {reset_link}</p>
        <p style="color: #B85450;">This link expires in 1 hour.</p>
        <p style="color: #9A8478; font-size: 12px; margin-top: 30px;">
            If you didn't request this, please ignore this email.
        </p>
    </div>
    """
    
    from ..services.email_service import send_email
    send_email(email, subject, body)
    
    return jsonify({'message': 'If an account with that email exists, a reset link has been sent.'}), 200


@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    """Reset password using JWT token"""
    from flask_jwt_extended import decode_token
    
    data = request.get_json()
    token = data.get('token', '')
    new_password = data.get('password', '')
    
    if not token or not new_password:
        return jsonify({'error': 'Token and new password are required'}), 400
    
    if len(new_password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400
    
    # Decode and verify the token
    try:
        decoded = decode_token(token)
        
        # The claims might be in 'sub' or directly accessible
        claims = {}
        if hasattr(decoded, 'get'):
            claims = decoded
        else:
            # Try accessing as dictionary keys
            claims = {
                'sub': decoded.get('sub') if hasattr(decoded, 'get') else None,
                'type': decoded.get('type') if hasattr(decoded, 'get') else None,
                'email': decoded.get('email') if hasattr(decoded, 'get') else None,
                'purpose': decoded.get('purpose') if hasattr(decoded, 'get') else None,
            }
        
        # Check if this is a password reset token
        purpose = claims.get('purpose') if hasattr(claims, 'get') else None
        email = claims.get('email') if hasattr(claims, 'get') else None
        user_type = claims.get('type') if hasattr(claims, 'get') else None
        
        if purpose != 'password_reset':
            return jsonify({'error': 'Invalid reset token'}), 400
        
        if not email:
            return jsonify({'error': 'Invalid reset token - no email'}), 400
        
        print(f"Reset password for: {email}, type: {user_type}")
        
    except Exception as e:
        print(f"Token decode error: {str(e)}")
        return jsonify({'error': f'Invalid or expired reset link'}), 400
    
    new_hashed = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    if user_type == 'admin':
        result = db.session.execute(
            text("UPDATE admins SET password_hash = :hash, updated_at = NOW() WHERE email = :email AND is_active = TRUE"),
            {'hash': new_hashed, 'email': email}
        )
    else:
        result = db.session.execute(
            text("UPDATE users SET password_hash = :hash, updated_at = NOW() WHERE email = :email AND is_active = TRUE"),
            {'hash': new_hashed, 'email': email}
        )
    
    db.session.commit()
    
    return jsonify({'message': 'Password reset successful! You can now log in.'}), 200