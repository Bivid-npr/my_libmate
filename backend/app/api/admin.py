from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import text
from datetime import datetime, timedelta, date  
from ..extensions import db
from ..utils.auth_utils import require_admin

admin_bp = Blueprint('admin', __name__)


@admin_bp.route('/dashboard', methods=['GET'])
@jwt_required()
@require_admin
def admin_dashboard():
    """Admin dashboard statistics"""
    admin_id = int(get_jwt_identity())
    
    # Get various stats
    stats = {}
    
    # Total users
    result = db.session.execute(text("SELECT COUNT(*) as total FROM users WHERE is_active = TRUE"))
    stats['total_users'] = result.first()[0]
    
    # Total books
    result = db.session.execute(text("SELECT COUNT(*) as total FROM books WHERE is_archived = FALSE"))
    stats['total_books'] = result.first()[0]
    
    # Active borrowings
    result = db.session.execute(
        text("SELECT COUNT(*) as total FROM borrowings WHERE status NOT IN ('returned', 'lost')")
    )
    stats['active_borrowings'] = result.first()[0]
    
    # Overdue borrowings
    result = db.session.execute(
        text("SELECT COUNT(*) as total FROM borrowings WHERE due_date < CURDATE() AND status NOT IN ('returned', 'lost')")
    )
    stats['overdue_borrowings'] = result.first()[0]
    
    # Pending memberships
    result = db.session.execute(
        text("SELECT COUNT(*) as total FROM memberships WHERE status = 'pending'")
    )
    stats['pending_memberships'] = result.first()[0]
    
    # Pending renewals
    result = db.session.execute(
        text("SELECT COUNT(*) as total FROM borrowings WHERE renewal_requested = TRUE AND renewal_status = 'pending'")
    )
    stats['pending_renewals'] = result.first()[0]
    
    # Total revenue from fines (last 30 days)
    result = db.session.execute(
        text("""
            SELECT SUM(fine_amount) as total 
            FROM borrow_history 
            WHERE fine_status = 'paid' AND returned_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
        """)
    )
    stats['revenue_last_30_days'] = float(result.first()[0] or 0)
    
    # Recent activities
    recent_borrows = db.session.execute(
        text("""
            SELECT b.borrow_id, u.full_name as user_name, bk.title as book_title, b.issued_at
            FROM borrowings b
            JOIN users u ON b.user_id = u.user_id
            JOIN books bk ON b.book_id = bk.book_id
            ORDER BY b.issued_at DESC
            LIMIT 10
        """)
    )
    stats['recent_borrows'] = [dict(row._mapping) for row in recent_borrows]
    
    return jsonify(stats), 200


@admin_bp.route('/books', methods=['POST'])
@jwt_required()
@require_admin
def add_book():
    """Add a new book"""
    data = request.get_json()
    admin_id = int(get_jwt_identity())
    
    # Validate required fields
    if not data.get('title') or not data.get('author'):
        return jsonify({'error': 'Title and author are required'}), 400
    
    # Insert book
    result = db.session.execute(
        text("""
            INSERT INTO books (title, author, isbn, genre, publisher, published_year, 
                             language, total_copies, available_copies, description, added_by)
            VALUES (:title, :author, :isbn, :genre, :publisher, :published_year,
                    :language, :total_copies, :total_copies, :description, :added_by)
        """),
        {
            'title': data['title'],
            'author': data['author'],
            'isbn': data.get('isbn'),
            'genre': data.get('genre'),
            'publisher': data.get('publisher'),
            'published_year': data.get('published_year'),
            'language': data.get('language', 'English'),
            'total_copies': data.get('total_copies', 1),
            'description': data.get('description'),
            'added_by': admin_id
        }
    )
    db.session.commit()
    
    # Get the inserted book_id
    book_id = db.session.execute(text("SELECT LAST_INSERT_ID() as id")).first()[0]
    
    return jsonify({'message': 'Book added successfully', 'book_id': book_id}), 201


@admin_bp.route('/books/<int:book_id>', methods=['PUT'])
@jwt_required()
@require_admin
def update_book(book_id):
    """Update book details"""
    data = request.get_json()
    admin_id = int(get_jwt_identity())
    
    updates = []
    params = {'book_id': book_id}
    
    updatable_fields = ['title', 'author', 'isbn', 'genre', 'publisher', 
                       'published_year', 'language', 'total_copies', 'description']
    
    for field in updatable_fields:
        if field in data:
            updates.append(f"{field} = :{field}")
            params[field] = data[field]
    
    # Handle total_copies affecting available_copies
    if 'total_copies' in data:
        current = db.session.execute(
            text("SELECT total_copies, available_copies FROM books WHERE book_id = :book_id"),
            {'book_id': book_id}
        ).first()
        
        if current:
            diff = data['total_copies'] - current[0]
            if diff != 0:
                updates.append("available_copies = available_copies + :diff")
                params['diff'] = diff
    
    if updates:
        query = f"UPDATE books SET {', '.join(updates)}, updated_at = NOW() WHERE book_id = :book_id"
        db.session.execute(text(query), params)
        db.session.commit()
    
    return jsonify({'message': 'Book updated successfully'}), 200


@admin_bp.route('/books/<int:book_id>', methods=['DELETE'])
@jwt_required()
@require_admin
def archive_book(book_id):
    """Archive a book (soft delete)"""
    admin_id = int(get_jwt_identity())
    
    db.session.execute(
        text("UPDATE books SET is_archived = TRUE, updated_at = NOW() WHERE book_id = :book_id"),
        {'book_id': book_id}
    )
    db.session.commit()
    
    return jsonify({'message': 'Book archived successfully'}), 200


@admin_bp.route('/memberships/pending', methods=['GET'])
@jwt_required()
@require_admin
def get_pending_memberships():
    """Get all pending membership requests"""
    admin_id = int(get_jwt_identity())
    
    result = db.session.execute(
        text("""
            SELECT m.*, u.full_name, u.email, u.phone, u.address, u.profile_picture
            FROM memberships m
            JOIN users u ON m.user_id = u.user_id
            WHERE m.status = 'pending'
            ORDER BY m.requested_at ASC
        """)
    )
    memberships = [dict(row._mapping) for row in result]
    
    return jsonify(memberships), 200


@admin_bp.route('/memberships/<int:membership_id>/approve', methods=['POST'])
@jwt_required()
@require_admin
def approve_membership(membership_id):
    """Approve a membership request"""
    admin_id = int(get_jwt_identity())
    data = request.get_json()
    
    duration_months = data.get('duration_months', 12)
    
    # Generate card number
    card_number = f"LIB-{datetime.now().strftime('%Y%m%d')}-{membership_id:04d}"
    
    # Update membership
    db.session.execute(
        text("""
            UPDATE memberships 
            SET status = 'active',
                approved_at = NOW(),
                start_date = CURDATE(),
                expiry_date = DATE_ADD(CURDATE(), INTERVAL :duration_months MONTH),
                processed_by = :admin_id,
                payment_status = 'paid',
                paid_at = NOW(),
                card_number = :card_number,
                card_issued_at = NOW()
            WHERE membership_id = :membership_id
        """),
        {
            'duration_months': duration_months,
            'admin_id': admin_id,
            'card_number': card_number,
            'membership_id': membership_id
        }
    )
    db.session.commit()
    
    return jsonify({'message': 'Membership approved', 'card_number': card_number}), 200


@admin_bp.route('/memberships/<int:membership_id>/reject', methods=['POST'])
@jwt_required()
@require_admin
def reject_membership(membership_id):
    """Reject a membership request"""
    admin_id = int(get_jwt_identity())
    
    db.session.execute(
        text("""
            UPDATE memberships 
            SET status = 'rejected', processed_by = :admin_id
            WHERE membership_id = :membership_id
        """),
        {'admin_id': admin_id, 'membership_id': membership_id}
    )
    db.session.commit()
    
    return jsonify({'message': 'Membership rejected'}), 200


@admin_bp.route('/borrowings', methods=['GET'])
@jwt_required()
@require_admin
def get_all_borrowings():
    """Get all active borrowings (admin view)"""
    admin_id = int(get_jwt_identity())
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    status = request.args.get('status')
    
    # Use separate clean queries instead of broken replace()
    query = """
        SELECT b.*, u.full_name as user_name, u.email, bk.title as book_title, bk.author
        FROM borrowings b
        JOIN users u ON b.user_id = u.user_id
        JOIN books bk ON b.book_id = bk.book_id
        WHERE 1=1
    """
    count_query = """
        SELECT COUNT(*) as total
        FROM borrowings b
        JOIN users u ON b.user_id = u.user_id
        JOIN books bk ON b.book_id = bk.book_id
        WHERE 1=1
    """
    params = {}
    count_params = {}
    
    if status:
        query += " AND b.status = :status"
        count_query += " AND b.status = :status"
        params['status'] = status
        count_params['status'] = status
    
    total_result = db.session.execute(text(count_query), count_params).first()
    total = total_result[0] if total_result else 0
    
    query += " ORDER BY b.due_date ASC LIMIT :limit OFFSET :offset"
    params['limit'] = per_page
    params['offset'] = (page - 1) * per_page
    
    result = db.session.execute(text(query), params)
    borrowings = [dict(row._mapping) for row in result]
    
    return jsonify({
        'borrowings': borrowings,
        'total': total,
        'page': page,
        'per_page': per_page,
        'total_pages': (total + per_page - 1) // per_page if total > 0 else 0
    }), 200


@admin_bp.route('/borrowings/<int:borrow_id>/renew/approve', methods=['POST'])
@jwt_required()
@require_admin
def approve_renewal(borrow_id):
    """Approve a renewal request"""
    admin_id = int(get_jwt_identity())
    
    # Get current borrow record
    result = db.session.execute(
        text("SELECT * FROM borrowings WHERE borrow_id = :borrow_id"),
        {'borrow_id': borrow_id}
    ).first()
    
    if not result:
        return jsonify({'error': 'Borrow record not found'}), 404
    
    borrow = dict(result._mapping)
    
    # Check if renewal was requested
    if not borrow['renewal_requested']:
        return jsonify({'error': 'No renewal requested for this book'}), 400
    
    # Calculate new due date (extend by 14 days)
    new_due_date = datetime.now() + timedelta(days=14)
    
    # Update borrow record
    db.session.execute(
        text("""
            UPDATE borrowings 
            SET renewal_count = renewal_count + 1,
                renewal_requested = FALSE,
                renewal_status = 'approved',
                due_date = :new_due_date,
                status = 'renewed',
                updated_at = NOW()
            WHERE borrow_id = :borrow_id
        """),
        {'borrow_id': borrow_id, 'new_due_date': new_due_date.date()}
    )
    db.session.commit()
    
    return jsonify({
        'message': 'Renewal approved', 
        'new_due_date': new_due_date.date().isoformat()
    }), 200


@admin_bp.route('/borrowings/<int:borrow_id>/renew/reject', methods=['POST'])
@jwt_required()
@require_admin
def reject_renewal(borrow_id):
    """Reject a renewal request"""
    admin_id = int(get_jwt_identity())
    
    db.session.execute(
        text("""
            UPDATE borrowings 
            SET renewal_requested = FALSE,
                renewal_status = 'rejected',
                updated_at = NOW()
            WHERE borrow_id = :borrow_id
        """),
        {'borrow_id': borrow_id}
    )
    db.session.commit()
    
    return jsonify({'message': 'Renewal rejected'}), 200


@admin_bp.route('/users', methods=['GET'])
@jwt_required()
@require_admin
def get_all_users():
    """Get all users (admin view)"""
    admin_id = int(get_jwt_identity())
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    search = request.args.get('search')
    
    query = """
        SELECT u.*, 
               (SELECT COUNT(*) FROM borrowings b WHERE b.user_id = u.user_id AND b.status NOT IN ('returned', 'lost')) as active_borrows,
               (SELECT COUNT(*) FROM memberships m WHERE m.user_id = u.user_id AND m.status = 'active') as has_active_membership
        FROM users u
        WHERE 1=1
    """
    params = {}
    
    if search:
        query += " AND (u.full_name LIKE :search OR u.email LIKE :search)"
        params['search'] = f'%{search}%'
    
    # Get total count
    count_query = query.replace("SELECT u.*,", "SELECT COUNT(*) as total FROM (SELECT u.user_id") + ") as temp"
    # Simpler count query
    count_params = params.copy()
    count_query_simple = "SELECT COUNT(*) as total FROM users u WHERE 1=1"
    if search:
        count_query_simple += " AND (u.full_name LIKE :search OR u.email LIKE :search)"
    total_result = db.session.execute(text(count_query_simple), count_params).first()
    total = total_result[0] if total_result else 0
    
    query += " ORDER BY u.created_at DESC LIMIT :limit OFFSET :offset"
    params['limit'] = per_page
    params['offset'] = (page - 1) * per_page
    
    result = db.session.execute(text(query), params)
    users = [dict(row._mapping) for row in result]
    
    return jsonify({
        'users': users,
        'total': total,
        'page': page,
        'per_page': per_page,
        'total_pages': (total + per_page - 1) // per_page
    }), 200


@admin_bp.route('/users/<int:user_id>', methods=['GET'])
@jwt_required()
@require_admin
def get_user_details(user_id):
    """Get detailed info about a specific user"""
    admin_id = int(get_jwt_identity())
    
    user = db.session.execute(
        text("SELECT * FROM users WHERE user_id = :user_id"),
        {'user_id': user_id}
    ).first()
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    user_data = dict(user._mapping)
    
    # Get membership info
    membership = db.session.execute(
        text("""
            SELECT * FROM memberships 
            WHERE user_id = :user_id 
            ORDER BY requested_at DESC 
            LIMIT 1
        """),
        {'user_id': user_id}
    ).first()
    
    # Get active borrowings
    borrowings = db.session.execute(
        text("""
            SELECT b.*, bk.title, bk.author
            FROM borrowings b
            JOIN books bk ON b.book_id = bk.book_id
            WHERE b.user_id = :user_id AND b.status NOT IN ('returned', 'lost')
        """),
        {'user_id': user_id}
    )
    
    # Get history count
    history_count = db.session.execute(
        text("SELECT COUNT(*) as total FROM borrow_history WHERE user_id = :user_id"),
        {'user_id': user_id}
    ).first()[0]
    
    return jsonify({
        'user': user_data,
        'membership': dict(membership._mapping) if membership else None,
        'active_borrowings': [dict(row._mapping) for row in borrowings],
        'total_books_read': history_count
    }), 200


@admin_bp.route('/users/<int:user_id>/deactivate', methods=['POST'])
@jwt_required()
@require_admin
def deactivate_user(user_id):
    """Deactivate a user account"""
    admin_id = int(get_jwt_identity())
    
    db.session.execute(
        text("UPDATE users SET is_active = FALSE, updated_at = NOW() WHERE user_id = :user_id"),
        {'user_id': user_id}
    )
    db.session.commit()
    
    return jsonify({'message': 'User deactivated successfully'}), 200


@admin_bp.route('/users/<int:user_id>/activate', methods=['POST'])
@jwt_required()
@require_admin
def activate_user(user_id):
    """Activate a user account"""
    admin_id = int(get_jwt_identity())
    
    db.session.execute(
        text("UPDATE users SET is_active = TRUE, updated_at = NOW() WHERE user_id = :user_id"),
        {'user_id': user_id}
    )
    db.session.commit()
    
    return jsonify({'message': 'User activated successfully'}), 200


@admin_bp.route('/stats/borrowings', methods=['GET'])
@jwt_required()
@require_admin
def get_borrowing_stats():
    """Get borrowing statistics for charts"""
    admin_id = int(get_jwt_identity())
    
    # Daily borrowings for last 30 days
    daily = db.session.execute(
        text("""
            SELECT 
                DATE(issued_at) as date,
                COUNT(*) as count
            FROM borrowings
            WHERE issued_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY DATE(issued_at)
            ORDER BY date ASC
        """)
    )
    daily_stats = [dict(row._mapping) for row in daily]
    
    # Top books
    top_books = db.session.execute(
        text("""
            SELECT 
                b.book_id,
                b.title,
                b.author,
                COUNT(*) as borrow_count
            FROM borrow_history bh
            JOIN books b ON bh.book_id = b.book_id
            WHERE bh.returned_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY b.book_id
            ORDER BY borrow_count DESC
            LIMIT 10
        """)
    )
    top_books_list = [dict(row._mapping) for row in top_books]
    
    # Genre distribution
    genres = db.session.execute(
        text("""
            SELECT 
                genre,
                COUNT(*) as count
            FROM books
            WHERE is_archived = FALSE AND genre IS NOT NULL
            GROUP BY genre
            ORDER BY count DESC
        """)
    )
    genre_stats = [dict(row._mapping) for row in genres]
    
    return jsonify({
        'daily_borrowings': daily_stats,
        'top_books': top_books_list,
        'genre_distribution': genre_stats
    }), 200


@admin_bp.route('/stats/revenue', methods=['GET'])
@jwt_required()
@require_admin
def get_revenue_stats():
    """Get revenue statistics"""
    admin_id = int(get_jwt_identity())
    
    # Monthly revenue
    monthly = db.session.execute(
        text("""
            SELECT 
                DATE_FORMAT(returned_at, '%Y-%m') as month,
                SUM(fine_amount) as revenue
            FROM borrow_history
            WHERE fine_status = 'paid' AND returned_at > DATE_SUB(NOW(), INTERVAL 12 MONTH)
            GROUP BY DATE_FORMAT(returned_at, '%Y-%m')
            ORDER BY month ASC
        """)
    )
    monthly_stats = [dict(row._mapping) for row in monthly]
    
    # Total revenue
    total = db.session.execute(
        text("SELECT SUM(fine_amount) as total FROM borrow_history WHERE fine_status = 'paid'")
    ).first()[0] or 0
    
    return jsonify({
        'monthly_revenue': monthly_stats,
        'total_revenue': float(total)
    }), 200


@admin_bp.route('/book-requests', methods=['GET'])
@jwt_required()
@require_admin
def get_book_requests():
    """Get all book purchase requests"""
    admin_id = int(get_jwt_identity())
    filter_status = request.args.get('status')
    
    query = """
        SELECT br.*, u.full_name, u.email
        FROM book_requests br
        JOIN users u ON br.user_id = u.user_id
        WHERE 1=1
    """
    params = {}
    
    if filter_status and filter_status != 'all':
        query += " AND br.status = :status"
        params['status'] = filter_status
    
    query += " ORDER BY br.created_at DESC"
    
    result = db.session.execute(text(query), params)
    requests = [dict(row._mapping) for row in result]
    
    return jsonify(requests), 200


@admin_bp.route('/book-requests/<int:request_id>/approve', methods=['POST'])
@jwt_required()
@require_admin
def approve_book_request(request_id):
    """Approve a book request"""
    admin_id = int(get_jwt_identity())
    
    db.session.execute(
        text("UPDATE book_requests SET status = 'approved', updated_at = NOW() WHERE request_id = :request_id"),
        {'request_id': request_id}
    )
    db.session.commit()
    
    return jsonify({'message': 'Book request approved'}), 200


@admin_bp.route('/book-requests/<int:request_id>/reject', methods=['POST'])
@jwt_required()
@require_admin
def reject_book_request(request_id):
    """Reject a book request"""
    admin_id = int(get_jwt_identity())
    
    db.session.execute(
        text("UPDATE book_requests SET status = 'rejected', updated_at = NOW() WHERE request_id = :request_id"),
        {'request_id': request_id}
    )
    db.session.commit()
    
    return jsonify({'message': 'Book request rejected'}), 200


@admin_bp.route('/borrowings/confirm-pickup/<int:reservation_id>', methods=['POST'])
@jwt_required()
@require_admin
def confirm_pickup(reservation_id):
    """Admin confirms user has arrived to pick up reserved book"""
    admin_id = int(get_jwt_identity())
    
    reservation = db.session.execute(
        text("SELECT * FROM reservations WHERE reservation_id = :rid AND status = 'pending'"),
        {'rid': reservation_id}
    ).first()
    if not reservation:
        return jsonify({'error': 'Reservation not found or already processed'}), 404
    
    res = dict(reservation._mapping)
    due_date = date.today() + timedelta(days=14)
    
    # Create borrowing record - trigger handles status/counts correctly
    db.session.execute(
        text("INSERT INTO borrowings (user_id, book_id, issued_by, due_date, status) VALUES (:uid, :bid, :aid, :due, 'borrowed')"),
        {'uid': res['user_id'], 'bid': res['book_id'], 'aid': admin_id, 'due': due_date}
    )
    db.session.commit()
    
    return jsonify({'message': 'Book issued successfully!', 'due_date': due_date.isoformat()}), 201