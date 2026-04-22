"""
JWT Authentication Utilities
Handles dual user/admin tables with proper token validation
"""
from flask_jwt_extended import get_jwt, get_jwt_identity
from functools import wraps
from flask import jsonify


def get_user_id():
    """
    Extract user ID from JWT for regular users.
    Raises ValueError if token is for admin or invalid.
    """
    claims = get_jwt()
    identity = get_jwt_identity()
    
    if not identity:
        raise ValueError('No identity found in token')
    
    # Check if this is a user token
    if claims.get('type') != 'user':
        raise ValueError('This endpoint requires a regular user token')
    
    return int(identity)


def get_admin_id():
    """
    Extract admin ID from JWT for administrators.
    Raises ValueError if token is for regular user or invalid.
    """
    claims = get_jwt()
    identity = get_jwt_identity()
    
    if not identity:
        raise ValueError('No identity found in token')
    
    # Check if this is an admin token
    if claims.get('type') != 'admin':
        raise ValueError('This endpoint requires an admin token')
    
    return int(identity)


def get_current_id():
    """
    Get current ID regardless of type (use with caution).
    Returns tuple: (id, type) where type is 'user' or 'admin'
    """
    claims = get_jwt()
    identity = get_jwt_identity()
    
    if not identity:
        raise ValueError('No identity found in token')
    
    return int(identity), claims.get('type')


def require_user(f):
    """Decorator: Only allow regular users"""
    @wraps(f)
    def decorated(*args, **kwargs):
        try:
            claims = get_jwt()
            if claims.get('type') != 'user':
                return jsonify({'error': 'This endpoint requires a regular user account'}), 403
        except Exception as e:
            return jsonify({'error': 'Invalid or expired token'}), 401
        return f(*args, **kwargs)
    return decorated


def require_admin(f):
    """Decorator: Only allow admins"""
    @wraps(f)
    def decorated(*args, **kwargs):
        try:
            claims = get_jwt()
            if claims.get('type') != 'admin':
                return jsonify({'error': 'This endpoint requires an admin account'}), 403
        except Exception as e:
            return jsonify({'error': 'Invalid or expired token'}), 401
        return f(*args, **kwargs)
    return decorated