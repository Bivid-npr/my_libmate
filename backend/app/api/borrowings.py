from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from sqlalchemy import text
from datetime import datetime, date, timedelta
from ..extensions import db
from ..utils.auth_utils import require_user
from ..services.notification_service import NotificationService
from ..services.recommendation_service import RecommendationService


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
        {'user_id': user_id, 'limit': per_page, 'offset': (page - 1) * per_page}
    )
    history = [dict(row._mapping) for row in result]
    
    count_result = db.session.execute(
        text("SELECT COUNT(*) FROM vw_borrow_history WHERE user_id = :user_id"),
        {'user_id': user_id}
    ).first()
    total = count_result[0] if count_result else 0
    
    return jsonify({
        'history': history, 'total': total, 'page': page,
        'per_page': per_page,
        'total_pages': (total + per_page - 1) // per_page if total > 0 else 0
    }), 200


@borrowings_bp.route('/borrow/<int:book_id>', methods=['POST'])
@jwt_required()
@require_user
def request_pickup(book_id):
    """Creates 48-hour pickup reservation and notifies admins"""
    user_id = int(get_jwt_identity())
    
    membership = db.session.execute(
        text("SELECT 1 FROM memberships WHERE user_id = :uid AND status = 'active' AND expiry_date > CURDATE()"),
        {'uid': user_id}
    ).first()
    if not membership:
        return jsonify({'error': 'Active membership required to borrow books'}), 403
    
    book = db.session.execute(
        text("SELECT * FROM books WHERE book_id = :bid AND is_archived = FALSE"),
        {'bid': book_id}
    ).first()
    if not book:
        return jsonify({'error': 'Book not found'}), 404
    
    book_data = dict(book._mapping)
    if book_data['available_copies'] < 1:
        return jsonify({'error': 'No copies available. You can reserve this book instead.'}), 400
    
    already = db.session.execute(
        text("SELECT 1 FROM borrowings WHERE user_id = :uid AND book_id = :bid AND status NOT IN ('returned','lost')"),
        {'uid': user_id, 'bid': book_id}
    ).first()
    if already:
        return jsonify({'error': 'You already have this book borrowed'}), 409
    
    pending = db.session.execute(
        text("SELECT 1 FROM reservations WHERE user_id = :uid AND book_id = :bid AND status = 'pending'"),
        {'uid': user_id, 'bid': book_id}
    ).first()
    if pending:
        return jsonify({'error': 'You already have a pending reservation for this book'}), 409
    
    count = db.session.execute(
        text("SELECT COUNT(*) as c FROM borrowings WHERE user_id = :uid AND status NOT IN ('returned','lost')"),
        {'uid': user_id}
    ).first()[0]
    if count >= 5:
        return jsonify({'error': 'Maximum borrow limit (5 books) reached'}), 400
    
    db.session.execute(
        text("INSERT INTO reservations (user_id, book_id, expires_at, status, reservation_type) VALUES (:uid, :bid, DATE_ADD(NOW(), INTERVAL 48 HOUR), 'pending', 'pickup')"),
        {'uid': user_id, 'bid': book_id}
    )
    db.session.execute(
        text("UPDATE books SET available_copies = available_copies - 1 WHERE book_id = :bid AND available_copies > 0"),
        {'bid': book_id}
    )
    db.session.commit()
    
    NotificationService.notify_admins_new_pickup(user_id, book_data['title'])
    RecommendationService.generate_recommendations_for_user(user_id)
    
    return jsonify({
        'message': 'Book reserved for pickup! Please visit the library counter within 48 hours.',
        'expires_at': (datetime.now() + timedelta(hours=48)).strftime('%Y-%m-%d %H:%M')
    }), 201


@borrowings_bp.route('/<int:borrow_id>/renew', methods=['POST'])
@jwt_required()
@require_user
def request_renewal(borrow_id):
    """Request renewal for a borrowed book and notify admins"""
    user_id = int(get_jwt_identity())
    
    result = db.session.execute(
        text("SELECT * FROM borrowings WHERE borrow_id = :bid AND user_id = :uid AND status IN ('borrowed','overdue','renewed')"),
        {'bid': borrow_id, 'uid': user_id}
    ).first()
    if not result:
        return jsonify({'error': 'Borrow record not found'}), 404
    
    borrow = dict(result._mapping)
    
    if borrow['renewal_count'] >= 3:
        return jsonify({'error': 'Maximum renewals (3) reached'}), 400
    if borrow['renewal_requested']:
        return jsonify({'error': 'Renewal already requested'}), 400
    
    has_reservations = db.session.execute(
        text("SELECT 1 FROM reservations WHERE book_id = :bid AND status = 'pending'"),
        {'bid': borrow['book_id']}
    ).first()
    if has_reservations:
        return jsonify({'error': 'Cannot renew - book has pending reservations'}), 400
    
    db.session.execute(
        text("UPDATE borrowings SET renewal_requested = TRUE, renewal_status = 'pending', updated_at = NOW() WHERE borrow_id = :bid"),
        {'bid': borrow_id}
    )
    db.session.commit()
    
    book_title = NotificationService._get_book_title(borrow['book_id'])
    NotificationService.notify_admins_renewal_request(user_id, book_title)
    
    return jsonify({'message': 'Renewal request submitted successfully'}), 200


@borrowings_bp.route('/<int:borrow_id>/return', methods=['POST'])
@jwt_required()
@require_user
def return_book(borrow_id):
    """Return a borrowed book"""
    user_id = int(get_jwt_identity())
    
    result = db.session.execute(
        text("SELECT * FROM borrowings WHERE borrow_id = :bid AND user_id = :uid AND status IN ('borrowed','overdue','renewed')"),
        {'bid': borrow_id, 'uid': user_id}
    ).first()
    if not result:
        return jsonify({'error': 'Active borrow record not found'}), 404
    
    db.session.execute(
        text("UPDATE borrowings SET status = 'returned', returned_at = NOW(), updated_at = NOW() WHERE borrow_id = :bid"),
        {'bid': borrow_id}
    )
    db.session.commit()
    
    RecommendationService.generate_recommendations_for_user(user_id)
    
    return jsonify({'message': 'Book returned successfully'}), 200


@borrowings_bp.route('/<int:borrow_id>/pay-fine', methods=['POST'])
@jwt_required()
@require_user
def pay_fine(borrow_id):
    """Pay fine for an overdue book"""
    user_id = int(get_jwt_identity())
    
    result = db.session.execute(
        text("SELECT * FROM borrowings WHERE borrow_id = :bid AND user_id = :uid"),
        {'bid': borrow_id, 'uid': user_id}
    ).first()
    if not result:
        return jsonify({'error': 'Borrow record not found'}), 404
    
    borrow = dict(result._mapping)
    
    if borrow['due_date'] < date.today():
        days_overdue = (date.today() - borrow['due_date']).days
        fine_amount = days_overdue * 5.00
    else:
        fine_amount = 0
    
    if fine_amount <= 0:
        return jsonify({'error': 'No fine to pay'}), 400
    
    db.session.execute(
        text("UPDATE borrowings SET fine_status = 'paid', fine_paid_at = NOW(), updated_at = NOW() WHERE borrow_id = :bid"),
        {'bid': borrow_id}
    )
    db.session.execute(
        text("UPDATE borrow_history SET fine_status = 'paid' WHERE borrow_id = :bid"),
        {'bid': borrow_id}
    )
    db.session.commit()
    return jsonify({'message': 'Fine paid successfully', 'amount_paid': fine_amount}), 200


@borrowings_bp.route('/reserve/<int:book_id>', methods=['POST'])
@jwt_required()
@require_user
def reserve_book(book_id):
    """Reserve a book that's currently unavailable (waitlist)"""
    user_id = int(get_jwt_identity())
    
    membership = db.session.execute(
        text("SELECT 1 FROM memberships WHERE user_id = :uid AND status = 'active' AND expiry_date > CURDATE()"),
        {'uid': user_id}
    ).first()
    if not membership:
        return jsonify({'error': 'Active membership required to reserve books'}), 403
    
    book = db.session.execute(
        text("SELECT * FROM books WHERE book_id = :bid AND is_archived = FALSE"),
        {'bid': book_id}
    ).first()
    if not book:
        return jsonify({'error': 'Book not found'}), 404
    
    book_data = dict(book._mapping)
    
    already_borrowing = db.session.execute(
        text("SELECT 1 FROM borrowings WHERE user_id = :uid AND book_id = :bid AND status NOT IN ('returned','lost')"),
        {'uid': user_id, 'bid': book_id}
    ).first()
    if already_borrowing:
        return jsonify({'error': 'You already have this book borrowed'}), 409
    
    if book_data['available_copies'] > 0:
        return jsonify({'error': 'Book is available - reserve for pickup instead'}), 400
    
    existing = db.session.execute(
        text("SELECT 1 FROM reservations WHERE user_id = :uid AND book_id = :bid AND status = 'pending'"),
        {'uid': user_id, 'bid': book_id}
    ).first()
    if existing:
        return jsonify({'error': 'You already have a pending reservation for this book'}), 409
    
    db.session.execute(
        text("INSERT INTO reservations (user_id, book_id, expires_at, status, reservation_type) VALUES (:uid, :bid, NULL, 'pending', 'waitlist')"),
        {'uid': user_id, 'bid': book_id}
    )
    db.session.commit()
    return jsonify({'message': 'Book reserved successfully! You will be notified when available.'}), 201


# ============================================================
# RESERVATION QUEUE ENDPOINTS
# ============================================================

@borrowings_bp.route('/reservations/all', methods=['GET'])
@jwt_required()
def get_all_reservations():
    """Get pending PICKUP reservations (48-hour window)"""
    claims = get_jwt()
    if claims.get('type') != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    result = db.session.execute(
        text("""
            SELECT r.*, u.full_name, u.email, b.title, b.author
            FROM reservations r
            JOIN users u ON r.user_id = u.user_id
            JOIN books b ON r.book_id = b.book_id
            WHERE r.status = 'pending' AND r.reservation_type = 'pickup'
            ORDER BY r.expires_at ASC
        """)
    )
    return jsonify([dict(row._mapping) for row in result]), 200


@borrowings_bp.route('/reservations/queue', methods=['GET'])
@jwt_required()
def get_reservation_queue():
    """Get WAITLIST reservations grouped by book"""
    claims = get_jwt()
    if claims.get('type') != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    result = db.session.execute(
        text("""
            SELECT 
                b.book_id, b.title, b.author, b.available_copies, b.total_copies,
                COUNT(r.reservation_id) as queue_count,
                MIN(r.reserved_at) as earliest_reservation
            FROM books b
            JOIN reservations r ON b.book_id = r.book_id
            WHERE r.status = 'pending' AND r.reservation_type = 'waitlist'
            GROUP BY b.book_id, b.title, b.author, b.available_copies, b.total_copies
            ORDER BY earliest_reservation ASC
        """)
    )
    return jsonify([dict(row._mapping) for row in result]), 200


@borrowings_bp.route('/reservations/queue/<int:book_id>', methods=['GET'])
@jwt_required()
def get_book_reservation_queue(book_id):
    """Get WAITLIST for a specific book"""
    claims = get_jwt()
    if claims.get('type') != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    result = db.session.execute(
        text("""
            SELECT r.*, u.full_name, u.email, u.phone,
                   ROW_NUMBER() OVER (ORDER BY r.reserved_at ASC) as queue_position
            FROM reservations r
            JOIN users u ON r.user_id = u.user_id
            WHERE r.book_id = :bid AND r.status = 'pending' AND r.reservation_type = 'waitlist'
            ORDER BY r.reserved_at ASC
        """),
        {'bid': book_id}
    )
    return jsonify([dict(row._mapping) for row in result]), 200


@borrowings_bp.route('/reservations/book/<int:book_id>', methods=['GET'])
def get_book_reservations_public(book_id):
    """Public view: show WAITLIST queue for a book"""
    result = db.session.execute(
        text("""
            SELECT r.reservation_id, r.user_id, r.reserved_at, r.status,
                   u.full_name,
                   ROW_NUMBER() OVER (ORDER BY r.reserved_at ASC) as queue_position
            FROM reservations r
            JOIN users u ON r.user_id = u.user_id
            WHERE r.book_id = :bid AND r.status = 'pending' AND r.reservation_type = 'waitlist'
            ORDER BY r.reserved_at ASC
        """),
        {'bid': book_id}
    )
    return jsonify([dict(row._mapping) for row in result]), 200


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
    return jsonify([dict(row._mapping) for row in result]), 200


@borrowings_bp.route('/reservations/<int:reservation_id>/cancel', methods=['POST'])
@jwt_required()
@require_user
def cancel_reservation(reservation_id):
    """Cancel a reservation"""
    user_id = int(get_jwt_identity())
    
    reservation = db.session.execute(
        text("SELECT * FROM reservations WHERE reservation_id = :rid AND user_id = :uid AND status = 'pending'"),
        {'rid': reservation_id, 'uid': user_id}
    ).first()
    if not reservation:
        return jsonify({'error': 'Reservation not found or already processed'}), 404
    
    res = dict(reservation._mapping)
    
    db.session.execute(
        text("UPDATE reservations SET status = 'cancelled' WHERE reservation_id = :rid"),
        {'rid': reservation_id}
    )
    
    # Only restore copy if it was a pickup (not waitlist)
    if res.get('reservation_type') == 'pickup':
        db.session.execute(
            text("UPDATE books SET available_copies = available_copies + 1 WHERE book_id = :bid AND available_copies < total_copies"),
            {'bid': res['book_id']}
        )
    
    db.session.commit()
    return jsonify({'message': 'Reservation cancelled successfully'}), 200