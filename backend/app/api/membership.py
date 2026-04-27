from flask import Blueprint, request, jsonify, send_from_directory
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import text
from ..extensions import db
from ..utils.auth_utils import require_user
import os
from datetime import datetime
from ..services.notification_service import NotificationService


membership_bp = Blueprint('membership', __name__)


@membership_bp.route('/apply', methods=['POST'])
@jwt_required()
@require_user
def apply_membership():
    """Apply for a membership with photo and receipt"""
    user_id = int(get_jwt_identity())
    
    # Get form data
    duration_months = request.form.get('duration_months', 6, type=int)
    full_name = request.form.get('full_name')
    phone = request.form.get('phone')
    address = request.form.get('address')
    
    # Get files
    profile_photo = request.files.get('profile_photo')
    payment_receipt = request.files.get('payment_receipt')
    
    # Check if user already has an active membership
    existing = db.session.execute(
        text("SELECT membership_id FROM memberships WHERE user_id = :user_id AND status = 'active'"),
        {'user_id': user_id}
    ).first()
    
    if existing:
        return jsonify({'error': 'You already have an active membership'}), 409
    
    # Check for pending application
    pending = db.session.execute(
        text("SELECT membership_id FROM memberships WHERE user_id = :user_id AND status = 'pending'"),
        {'user_id': user_id}
    ).first()
    
    if pending:
        return jsonify({'error': 'You already have a pending membership application'}), 409
    
    # Update user profile with new details
    updates = []
    params = {'user_id': user_id}
    
    if full_name:
        updates.append("full_name = :full_name")
        params['full_name'] = full_name
    
    if phone:
        updates.append("phone = :phone")
        params['phone'] = phone
    
    if address:
        updates.append("address = :address")
        params['address'] = address
    
    if updates:
        query = f"UPDATE users SET {', '.join(updates)}, updated_at = NOW() WHERE user_id = :user_id"
        db.session.execute(text(query), params)
    
    # Save profile photo if uploaded
    photo_filename = None
    if profile_photo and profile_photo.filename:
        allowed_extensions = {'png', 'jpg', 'jpeg', 'webp'}
        file_ext = profile_photo.filename.rsplit('.', 1)[1].lower() if '.' in profile_photo.filename else ''
        
        if file_ext in allowed_extensions:
            upload_folder = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads', 'photos')
            os.makedirs(upload_folder, exist_ok=True)
            
            photo_filename = f"profile_{user_id}_{int(datetime.now().timestamp())}.{file_ext}"
            profile_photo.save(os.path.join(upload_folder, photo_filename))
            
            # Update user profile picture
            db.session.execute(
                text("UPDATE users SET profile_picture = :photo WHERE user_id = :user_id"),
                {'photo': photo_filename, 'user_id': user_id}
            )
    
    # Save payment receipt
    receipt_filename = None
    if payment_receipt and payment_receipt.filename:
        receipt_ext = payment_receipt.filename.rsplit('.', 1)[1].lower() if '.' in payment_receipt.filename else 'png'
        upload_folder = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads', 'receipts')
        os.makedirs(upload_folder, exist_ok=True)
        
        receipt_filename = f"receipt_{user_id}_{int(datetime.now().timestamp())}.{receipt_ext}"
        payment_receipt.save(os.path.join(upload_folder, receipt_filename))
    
    # Create membership application
    db.session.execute(
        text("""
            INSERT INTO memberships (user_id, duration_months, status, payment_status, payment_receipt)
            VALUES (:user_id, :duration_months, 'pending', 'paid', :receipt)
        """),
        {'user_id': user_id, 'duration_months': duration_months, 'receipt': receipt_filename}
    )
    db.session.commit()

    NotificationService.notify_admins_new_membership(user_id, duration_months)
    
    return jsonify({'message': 'Membership application submitted successfully! Awaiting admin approval.'}), 201


@membership_bp.route('/status', methods=['GET'])
@jwt_required()
@require_user
def get_membership_status():
    """Get current user's membership status"""
    user_id = int(get_jwt_identity())
    
    # Get the latest membership application
    result = db.session.execute(
        text("""
            SELECT 
                m.membership_id,
                m.duration_months,
                m.start_date,
                m.expiry_date,
                m.status,
                m.payment_status,
                m.card_number,
                m.requested_at,
                DATEDIFF(m.expiry_date, CURDATE()) AS days_remaining
            FROM memberships m
            WHERE m.user_id = :user_id
            ORDER BY m.requested_at DESC
            LIMIT 1
        """),
        {'user_id': user_id}
    ).first()
    
    if not result:
        return jsonify({
            'status': 'none',
            'has_membership': False
        }), 200
    
    membership = dict(result._mapping)
    membership['has_membership'] = (membership['status'] == 'active')
    
    return jsonify(membership), 200


@membership_bp.route('/qr-code', methods=['GET'])
def get_qr_code():
    """Get the membership payment QR code"""
    try:
        qr_folder = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'static', 'qr')
        
        if not os.path.exists(qr_folder):
            return jsonify({'error': 'QR code folder not found'}), 404
        
        allowed_extensions = {'png', 'jpg', 'jpeg', 'webp'}
        qr_file = None
        
        for file in os.listdir(qr_folder):
            if file.lower().startswith('membership_qr'):
                ext = file.split('.')[-1].lower() if '.' in file else ''
                if ext in allowed_extensions:
                    qr_file = file
                    break
        
        if not qr_file:
            return jsonify({'error': 'QR code image not found'}), 404
        
        return send_from_directory(qr_folder, qr_file)
        
    except Exception as e:
        print(f"Error serving QR code: {str(e)}")
        return jsonify({'error': 'QR code not available'}), 404