from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt_identity
from sqlalchemy import text
from ..extensions import db

def admin_required(fn):
    """Decorator to check if the current user is an admin"""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        user_id = get_jwt_identity()
        
        # Check if user is admin (users table has role column)
        # Note: In your schema, admins are in separate table
        # For admin endpoints, we'll check if user exists in admins table
        result = db.session.execute(
            text("SELECT admin_id FROM admins WHERE admin_id = :user_id AND is_active = TRUE"),
            {'user_id': user_id}
        ).first()
        
        if not result:
            return jsonify({'error': 'Admin access required'}), 403
        
        return fn(*args, **kwargs)
    return wrapper


def member_required(fn):
    """Decorator to check if the current user has an active membership"""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        user_id = get_jwt_identity()
        
        result = db.session.execute(
            text("""
                SELECT membership_id FROM memberships 
                WHERE user_id = :user_id AND status = 'active' AND expiry_date > CURDATE()
            """),
            {'user_id': user_id}
        ).first()
        
        if not result:
            return jsonify({'error': 'Active membership required for this action'}), 403
        
        return fn(*args, **kwargs)
    return wrapper