from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import text
from ..extensions import db
from ..utils.auth_utils import require_user
import os
from datetime import datetime
from ..services.recommendation_service import RecommendationService


users_bp = Blueprint('users', __name__)


@users_bp.route('/me', methods=['GET'])
@jwt_required()
@require_user
def get_my_profile():
    user_id = int(get_jwt_identity())
    
    result = db.session.execute(
        text("SELECT * FROM vw_member_summary WHERE user_id = :user_id"),
        {'user_id': user_id}
    ).first()
    
    if not result:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify(dict(result._mapping)), 200


@users_bp.route('/me', methods=['PUT'])
@jwt_required()
@require_user
def update_my_profile():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    
    updates = []
    params = {'user_id': user_id}
    
    if 'full_name' in data:
        updates.append("full_name = :full_name")
        params['full_name'] = data['full_name']
    
    if 'phone' in data:
        updates.append("phone = :phone")
        params['phone'] = data['phone']
    
    if 'address' in data:
        updates.append("address = :address")
        params['address'] = data['address']
    
    if updates:
        query = f"UPDATE users SET {', '.join(updates)}, updated_at = NOW() WHERE user_id = :user_id"
        db.session.execute(text(query), params)
        db.session.commit()
    
    return jsonify({'message': 'Profile updated successfully'}), 200


@users_bp.route('/upload-photo', methods=['POST'])
@jwt_required()
@require_user
def upload_profile_photo():
    """Upload profile photo"""
    user_id = int(get_jwt_identity())
    
    print(f"Uploading photo for user: {user_id}")
    
    if 'profile_photo' not in request.files:
        return jsonify({'error': 'No photo provided'}), 400
    
    photo = request.files['profile_photo']
    
    if photo.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    # Validate file type
    allowed_extensions = {'png', 'jpg', 'jpeg', 'webp'}
    file_ext = photo.filename.rsplit('.', 1)[1].lower() if '.' in photo.filename else ''
    
    if file_ext not in allowed_extensions:
        return jsonify({'error': 'Invalid file type. Use PNG, JPG, or WEBP'}), 400
    
    # Get upload folder path
    upload_folder = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads', 'photos')
    os.makedirs(upload_folder, exist_ok=True)
    
    print(f"Saving to: {upload_folder}")
    
    # Delete old photo if exists
    old_photo = db.session.execute(
        text("SELECT profile_picture FROM users WHERE user_id = :user_id"),
        {'user_id': user_id}
    ).first()
    
    if old_photo and old_photo[0]:
        old_photo_path = os.path.join(upload_folder, old_photo[0])
        if os.path.exists(old_photo_path):
            try:
                os.remove(old_photo_path)
                print(f"Deleted old photo: {old_photo_path}")
            except Exception as e:
                print(f"Error deleting old photo: {e}")
    
    # Save new photo
    filename = f"profile_{user_id}_{int(datetime.now().timestamp())}.{file_ext}"
    photo_path = os.path.join(upload_folder, filename)
    photo.save(photo_path)
    print(f"Saved new photo: {filename}")
    
    # Verify file was saved
    if os.path.exists(photo_path):
        print(f"File verified at: {photo_path}")
        print(f"File size: {os.path.getsize(photo_path)} bytes")
    else:
        print("ERROR: File was not saved correctly!")
        return jsonify({'error': 'Failed to save file'}), 500
    
    # Update user record
    db.session.execute(
        text("UPDATE users SET profile_picture = :filename, updated_at = NOW() WHERE user_id = :user_id"),
        {'filename': filename, 'user_id': user_id}
    )
    db.session.commit()
    
    return jsonify({
        'message': 'Profile photo uploaded successfully',
        'filename': filename,
        'url': f'/uploads/photos/{filename}'
    }), 200


@users_bp.route('/remove-photo', methods=['DELETE'])
@jwt_required()
@require_user
def remove_profile_photo():
    """Remove profile photo"""
    user_id = int(get_jwt_identity())
    
    result = db.session.execute(
        text("SELECT profile_picture FROM users WHERE user_id = :user_id"),
        {'user_id': user_id}
    ).first()
    
    if result and result[0]:
        upload_folder = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads', 'photos')
        photo_path = os.path.join(upload_folder, result[0])
        if os.path.exists(photo_path):
            try:
                os.remove(photo_path)
                print(f"Deleted photo: {photo_path}")
            except Exception as e:
                print(f"Error deleting photo: {e}")
    
    db.session.execute(
        text("UPDATE users SET profile_picture = NULL, updated_at = NOW() WHERE user_id = :user_id"),
        {'user_id': user_id}
    )
    db.session.commit()
    
    return jsonify({'message': 'Profile photo removed successfully'}), 200


@users_bp.route('/me/borrowings', methods=['GET'])
@jwt_required()
@require_user
def get_my_borrowings():
    user_id = int(get_jwt_identity())
    
    result = db.session.execute(
        text("SELECT * FROM vw_active_borrowings WHERE user_id = :user_id"),
        {'user_id': user_id}
    )
    borrowings = [dict(row._mapping) for row in result]
    
    return jsonify(borrowings), 200


@users_bp.route('/me/history', methods=['GET'])
@jwt_required()
@require_user
def get_my_history():
    user_id = int(get_jwt_identity())
    
    result = db.session.execute(
        text("SELECT * FROM vw_borrow_history WHERE user_id = :user_id ORDER BY returned_at DESC"),
        {'user_id': user_id}
    )
    history = [dict(row._mapping) for row in result]
    
    return jsonify(history), 200


@users_bp.route('/me/wishlist', methods=['GET'])
@jwt_required()
@require_user
def get_my_wishlist():
    user_id = int(get_jwt_identity())
    
    result = db.session.execute(
        text("""
            SELECT b.*, w.added_at,
                   ROUND(IFNULL(AVG(r.rating), 0), 1) as avg_rating
            FROM wishlist w
            JOIN books b ON w.book_id = b.book_id
            LEFT JOIN reviews r ON b.book_id = r.book_id
            WHERE w.user_id = :user_id AND b.is_archived = FALSE
            GROUP BY b.book_id, w.added_at
            ORDER BY w.added_at DESC
        """),
        {'user_id': user_id}
    )
    wishlist = [dict(row._mapping) for row in result]
    
    return jsonify(wishlist), 200


@users_bp.route('/me/wishlist/<int:book_id>', methods=['POST'])
@jwt_required()
@require_user
def add_to_wishlist(book_id):
    user_id = int(get_jwt_identity())
    
    book = db.session.execute(
        text("SELECT book_id FROM books WHERE book_id = :book_id AND is_archived = FALSE"),
        {'book_id': book_id}
    ).first()
    
    if not book:
        return jsonify({'error': 'Book not found'}), 404
    
    existing = db.session.execute(
        text("SELECT wishlist_id FROM wishlist WHERE user_id = :user_id AND book_id = :book_id"),
        {'user_id': user_id, 'book_id': book_id}
    ).first()
    
    if existing:
        return jsonify({'error': 'Book already in wishlist'}), 409
    
    db.session.execute(
        text("INSERT INTO wishlist (user_id, book_id) VALUES (:user_id, :book_id)"),
        {'user_id': user_id, 'book_id': book_id}
    )
    db.session.commit()

    # Trigger recommendation update for user after adding to wishlist
    RecommendationService.generate_recommendations_for_user(user_id)
    
    return jsonify({'message': 'Added to wishlist'}), 201


@users_bp.route('/me/wishlist/<int:book_id>', methods=['DELETE'])
@jwt_required()
@require_user
def remove_from_wishlist(book_id):
    user_id = int(get_jwt_identity())
    
    result = db.session.execute(
        text("DELETE FROM wishlist WHERE user_id = :user_id AND book_id = :book_id"),
        {'user_id': user_id, 'book_id': book_id}
    )
    db.session.commit()
    
    if result.rowcount == 0:
        return jsonify({'error': 'Book not in wishlist'}), 404
    
    return jsonify({'message': 'Removed from wishlist'}), 200


@users_bp.route('/me/notifications', methods=['GET'])
@jwt_required()
@require_user
def get_my_notifications():
    """Get current user's notifications"""
    user_id = int(get_jwt_identity())
    
    result = db.session.execute(
        text("""
            SELECT n.*, un.is_read, un.read_at
            FROM notifications n
            JOIN user_notifications un ON n.notification_id = un.notification_id
            WHERE un.user_id = :uid
            ORDER BY n.created_at DESC
            LIMIT 50
        """),
        {'uid': user_id}
    )
    notifications = [dict(row._mapping) for row in result]
    return jsonify(notifications), 200


@users_bp.route('/me/notifications/<int:notification_id>/read', methods=['POST'])
@jwt_required()
@require_user
def mark_notification_read(notification_id):
    """Mark a notification as read"""
    user_id = int(get_jwt_identity())
    
    db.session.execute(
        text("UPDATE user_notifications SET is_read = TRUE, read_at = NOW() WHERE user_id = :uid AND notification_id = :nid"),
        {'uid': user_id, 'nid': notification_id}
    )
    db.session.commit()
    return jsonify({'message': 'Marked as read'}), 200


@users_bp.route('/me/notifications/read-all', methods=['POST'])
@jwt_required()
@require_user
def mark_all_notifications_read():
    """Mark all notifications as read"""
    user_id = int(get_jwt_identity())
    
    db.session.execute(
        text("UPDATE user_notifications SET is_read = TRUE, read_at = NOW() WHERE user_id = :uid AND is_read = FALSE"),
        {'uid': user_id}
    )
    db.session.commit()
    return jsonify({'message': 'All marked as read'}), 200