from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import text
from datetime import datetime, date
from ..extensions import db
from ..utils.auth_utils import require_user

borrowings_bp = Blueprint('borrowings', __name__)


@borrowings_bp.route('', methods=['GET'])
@jwt_required()
@require_user
def get_borrowings():
    """Get current user's active borrowings"""
    user_id = int(get_jwt_identity())
    
    result = db.session.execute(
        text("SELECT * FROM vw_active_borrowings WHERE user_id = :user_id ORDER BY due_date ASC"),
        {'user_id': user_id}
    )
    borrowings = [dict(row._mapping) for row in result]
    
    return jsonify(borrowings), 200


@borrowings_bp.route('/history', methods=['GET'])
@jwt_required()
@require_user
def get_borrow_history():
    """Get current user's borrow history"""
    user_id = int(get_jwt_identity())
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    
    query = """
        SELECT * FROM vw_borrow_history 
        WHERE user_id = :user_id
        ORDER BY returned_at DESC
        LIMIT :limit OFFSET :offset
    """
    
    result = db.session.execute(
        text(query),
        {
            'user_id': user_id,
            'limit': per_page,
            'offset': (page - 1) * per_page
        }
    )
    history = [dict(row._mapping) for row in result]
    
    # Get total count
    count_result = db.session.execute(
        text("SELECT COUNT(*) FROM vw_borrow_history WHERE user_id = :user_id"),
        {'user_id': user_id}
    ).first()
    total = count_result[0] if count_result else 0
    
    return jsonify({
        'history': history,
        'total': total,
        'page': page,
        'per_page': per_page,
        'total_pages': (total + per_page - 1) // per_page if total > 0 else 0
    }), 200


@borrowings_bp.route('/borrow/<int:book_id>', methods=['POST'])
@jwt_required()
@require_user
def borrow_book(book_id):
    """Borrow a book"""
    user_id = int(get_jwt_identity())
    
    # Check if user has active membership
    membership = db.session.execute(
        text("""
            SELECT 1 FROM memberships 
            WHERE user_id = :user_id AND status = 'active' AND expiry_date > CURDATE()
        """),
        {'user_id': user_id}
    ).first()
    
    if not membership:
        return jsonify({'error': 'Active membership required to borrow books'}), 403
    
    # Check if book exists and is available
    book = db.session.execute(
        text("SELECT * FROM books WHERE book_id = :book_id AND is_archived = FALSE"),
        {'book_id': book_id}
    ).first()
    
    if not book:
        return jsonify({'error': 'Book not found'}), 404
    
    book_data = dict(book._mapping)
    
    if book_data['available_copies'] < 1:
        return jsonify({'error': 'No copies available'}), 400
    
    # Check if user already borrowed this book
    existing = db.session.execute(
        text("""
            SELECT 1 FROM borrowings 
            WHERE user_id = :user_id AND book_id = :book_id AND status NOT IN ('returned', 'lost')
        """),
        {'user_id': user_id, 'book_id': book_id}
    ).first()
    
    if existing:
        return jsonify({'error': 'You already have this book borrowed'}), 409
    
    # Check borrow limit (max 5 books)
    active_count = db.session.execute(
        text("""
            SELECT COUNT(*) as count FROM borrowings 
            WHERE user_id = :user_id AND status NOT IN ('returned', 'lost')
        """),
        {'user_id': user_id}
    ).first()[0]
    
    if active_count >= 5:
        return jsonify({'error': 'Maximum borrow limit (5 books) reached'}), 400
    
    # Calculate due date (14 days from now)
    due_date = date.today() + datetime.timedelta(days=14)
    
    # Create borrowing record
    db.session.execute(
        text("""
            INSERT INTO borrowings (user_id, book_id, due_date, status)
            VALUES (:user_id, :book_id, :due_date, 'borrowed')
        """),
        {'user_id': user_id, 'book_id': book_id, 'due_date': due_date}
    )
    db.session.commit()
    
    return jsonify({
        'message': 'Book borrowed successfully',
        'due_date': due_date.isoformat()
    }), 201


@borrowings_bp.route('/<int:borrow_id>/renew', methods=['POST'])
@jwt_required()
@require_user
def request_renewal(borrow_id):
    """Request renewal for a borrowed book"""
    user_id = int(get_jwt_identity())
    
    # Check if borrow exists and belongs to user
    result = db.session.execute(
        text("""
            SELECT * FROM borrowings 
            WHERE borrow_id = :borrow_id AND user_id = :user_id 
            AND status IN ('borrowed', 'overdue', 'renewed')
        """),
        {'borrow_id': borrow_id, 'user_id': user_id}
    ).first()
    
    if not result:
        return jsonify({'error': 'Borrow record not found'}), 404
    
    borrow = dict(result._mapping)
    
    # Check renewal count (max 2 renewals)
    if borrow['renewal_count'] >= 2:
        return jsonify({'error': 'Maximum renewals (2) reached for this book'}), 400
    
    # Check if already requested
    if borrow['renewal_requested']:
        return jsonify({'error': 'Renewal already requested for this book'}), 400
    
    # Check if book has reservations
    has_reservations = db.session.execute(
        text("""
            SELECT 1 FROM reservations 
            WHERE book_id = :book_id AND status = 'pending'
        """),
        {'book_id': borrow['book_id']}
    ).first()
    
    if has_reservations:
        return jsonify({'error': 'Cannot renew - book has pending reservations'}), 400
    
    # Request renewal
    db.session.execute(
        text("""
            UPDATE borrowings 
            SET renewal_requested = TRUE, renewal_status = 'pending', updated_at = NOW()
            WHERE borrow_id = :borrow_id
        """),
        {'borrow_id': borrow_id}
    )
    db.session.commit()
    
    return jsonify({'message': 'Renewal request submitted successfully'}), 200


@borrowings_bp.route('/<int:borrow_id>/return', methods=['POST'])
@jwt_required()
@require_user
def return_book(borrow_id):
    """Return a borrowed book"""
    user_id = int(get_jwt_identity())
    
    # Check if borrow exists and belongs to user
    result = db.session.execute(
        text("""
            SELECT * FROM borrowings 
            WHERE borrow_id = :borrow_id AND user_id = :user_id 
            AND status IN ('borrowed', 'overdue', 'renewed')
        """),
        {'borrow_id': borrow_id, 'user_id': user_id}
    ).first()
    
    if not result:
        return jsonify({'error': 'Active borrow record not found'}), 404
    
    # Return the book (trigger will handle the rest)
    db.session.execute(
        text("""
            UPDATE borrowings 
            SET status = 'returned', returned_at = NOW(), updated_at = NOW()
            WHERE borrow_id = :borrow_id
        """),
        {'borrow_id': borrow_id}
    )
    db.session.commit()
    
    return jsonify({'message': 'Book returned successfully'}), 200


@borrowings_bp.route('/<int:borrow_id>/pay-fine', methods=['POST'])
@jwt_required()
@require_user
def pay_fine(borrow_id):
    """Pay fine for an overdue book"""
    user_id = int(get_jwt_identity())
    data = request.get_json()
    payment_method = data.get('payment_method', 'card')
    
    # Check if borrow exists and belongs to user
    result = db.session.execute(
        text("""
            SELECT * FROM borrowings 
            WHERE borrow_id = :borrow_id AND user_id = :user_id
        """),
        {'borrow_id': borrow_id, 'user_id': user_id}
    ).first()
    
    if not result:
        return jsonify({'error': 'Borrow record not found'}), 404
    
    borrow = dict(result._mapping)
    
    # Calculate fine amount
    if borrow['due_date'] < date.today():
        days_overdue = (date.today() - borrow['due_date']).days
        fine_amount = days_overdue * 5.00
    else:
        fine_amount = 0
    
    if fine_amount <= 0:
        return jsonify({'error': 'No fine to pay'}), 400
    
    # Update fine status
    db.session.execute(
        text("""
            UPDATE borrowings 
            SET fine_status = 'paid', fine_paid_at = NOW(), updated_at = NOW()
            WHERE borrow_id = :borrow_id
        """),
        {'borrow_id': borrow_id}
    )
    
    # Also update in history table if exists
    db.session.execute(
        text("""
            UPDATE borrow_history 
            SET fine_status = 'paid'
            WHERE borrow_id = :borrow_id
        """),
        {'borrow_id': borrow_id}
    )
    db.session.commit()
    
    return jsonify({
        'message': 'Fine paid successfully',
        'amount_paid': fine_amount
    }), 200


@borrowings_bp.route('/reserve/<int:book_id>', methods=['POST'])
@jwt_required()
@require_user
def reserve_book(book_id):
    """Reserve a book that's currently unavailable"""
    user_id = int(get_jwt_identity())
    
    # Check if user has active membership
    membership = db.session.execute(
        text("""
            SELECT 1 FROM memberships 
            WHERE user_id = :user_id AND status = 'active' AND expiry_date > CURDATE()
        """),
        {'user_id': user_id}
    ).first()
    
    if not membership:
        return jsonify({'error': 'Active membership required to reserve books'}), 403
    
    # Check if book exists
    book = db.session.execute(
        text("SELECT * FROM books WHERE book_id = :book_id AND is_archived = FALSE"),
        {'book_id': book_id}
    ).first()
    
    if not book:
        return jsonify({'error': 'Book not found'}), 404
    
    book_data = dict(book._mapping)
    
    # Check if book is available
    if book_data['available_copies'] > 0:
        return jsonify({'error': 'Book is available - you can borrow it directly'}), 400
    
    # Check if user already reserved this book
    existing = db.session.execute(
        text("""
            SELECT 1 FROM reservations 
            WHERE user_id = :user_id AND book_id = :book_id AND status = 'pending'
        """),
        {'user_id': user_id, 'book_id': book_id}
    ).first()
    
    if existing:
        return jsonify({'error': 'You already have a pending reservation for this book'}), 409
    
    # Create reservation (expires in 48 hours after book becomes available)
    db.session.execute(
        text("""
            INSERT INTO reservations (user_id, book_id, expires_at, status)
            VALUES (:user_id, :book_id, DATE_ADD(NOW(), INTERVAL 48 HOUR), 'pending')
        """),
        {'user_id': user_id, 'book_id': book_id}
    )
    db.session.commit()
    
    return jsonify({'message': 'Book reserved successfully'}), 201


@borrowings_bp.route('/reservations', methods=['GET'])
@jwt_required()
@require_user
def get_my_reservations():
    """Get current user's reservations"""
    user_id = int(get_jwt_identity())
    
    result = db.session.execute(
        text("""
            SELECT r.*, b.title, b.author, b.cover_image
            FROM reservations r
            JOIN books b ON r.book_id = b.book_id
            WHERE r.user_id = :user_id AND r.status = 'pending'
            ORDER BY r.reserved_at ASC
        """),
        {'user_id': user_id}
    )
    reservations = [dict(row._mapping) for row in result]
    
    return jsonify(reservations), 200


@borrowings_bp.route('/reservations/<int:reservation_id>/cancel', methods=['POST'])
@jwt_required()
@require_user
def cancel_reservation(reservation_id):
    """Cancel a reservation"""
    user_id = int(get_jwt_identity())
    
    result = db.session.execute(
        text("""
            UPDATE reservations 
            SET status = 'cancelled'
            WHERE reservation_id = :reservation_id AND user_id = :user_id AND status = 'pending'
        """),
        {'reservation_id': reservation_id, 'user_id': user_id}
    )
    db.session.commit()
    
    if result.rowcount == 0:
        return jsonify({'error': 'Reservation not found or already processed'}), 404
    
    return jsonify({'message': 'Reservation cancelled successfully'}), 200