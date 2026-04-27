from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import text
from datetime import datetime, timedelta, date  
from ..extensions import db
from ..utils.auth_utils import require_admin
from ..services.notification_service import NotificationService
import os

admin_bp = Blueprint('admin', __name__)


@admin_bp.route('/dashboard', methods=['GET'])
@jwt_required()
@require_admin
def admin_dashboard():
    """Admin dashboard statistics"""
    admin_id = int(get_jwt_identity())
    
    stats = {}
    
    result = db.session.execute(text("SELECT COUNT(*) as total FROM users WHERE is_active = TRUE"))
    stats['total_users'] = result.first()[0]
    
    result = db.session.execute(text("SELECT COUNT(*) as total FROM books WHERE is_archived = FALSE"))
    stats['total_books'] = result.first()[0]
    
    result = db.session.execute(
        text("SELECT COUNT(*) as total FROM borrowings WHERE status NOT IN ('returned', 'lost')")
    )
    stats['active_borrowings'] = result.first()[0]
    
    result = db.session.execute(
        text("SELECT COUNT(*) as total FROM borrowings WHERE due_date < CURDATE() AND status NOT IN ('returned', 'lost')")
    )
    stats['overdue_borrowings'] = result.first()[0]
    
    result = db.session.execute(
        text("SELECT COUNT(*) as total FROM memberships WHERE status = 'pending'")
    )
    stats['pending_memberships'] = result.first()[0]
    
    result = db.session.execute(
        text("SELECT COUNT(*) as total FROM borrowings WHERE renewal_requested = TRUE AND renewal_status = 'pending'")
    )
    stats['pending_renewals'] = result.first()[0]
    
    result = db.session.execute(
        text("""
            SELECT SUM(fine_amount) as total 
            FROM borrow_history 
            WHERE fine_status = 'paid' AND returned_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
        """)
    )
    stats['revenue_last_30_days'] = float(result.first()[0] or 0)
    
    # Add pending pickups count
    result = db.session.execute(
        text("SELECT COUNT(*) as total FROM reservations WHERE status = 'pending'")
    )
    stats['pending_pickups'] = result.first()[0]
    
    # Add book requests count
    result = db.session.execute(
        text("SELECT COUNT(*) as total FROM book_requests WHERE status = 'pending'")
    )
    stats['pending_book_requests'] = result.first()[0]
    
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
    """Add a new book with cover image"""
    admin_id = int(get_jwt_identity())
    
    title = request.form.get('title')
    author = request.form.get('author')
    
    if not title or not author:
        return jsonify({'error': 'Title and author are required'}), 400
    
    published_year = request.form.get('published_year')
    if published_year:
        try:
            year_int = int(published_year)
            if year_int < 1000 or year_int > 2155:
                return jsonify({'error': 'Published year must be between 1000 and 2155'}), 400
        except ValueError:
            published_year = None
    
    cover_filename = None
    if 'cover_image' in request.files:
        file = request.files['cover_image']
        if file.filename and file.filename.strip():
            ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
            if ext in ['jpg', 'jpeg', 'png', 'webp']:
                upload_folder = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads', 'covers')
                os.makedirs(upload_folder, exist_ok=True)
                cover_filename = f"cover_{int(datetime.now().timestamp())}.{ext}"
                file.save(os.path.join(upload_folder, cover_filename))
    
    db.session.execute(
        text("""
            INSERT INTO books (title, author, isbn, genre, publisher, published_year, language, total_copies, available_copies, description, cover_image, added_by)
            VALUES (:title, :author, :isbn, :genre, :publisher, :year, :lang, :copies, :copies, :desc, :cover, :aid)
        """),
        {
            'title': title, 'author': author,
            'isbn': request.form.get('isbn'), 'genre': request.form.get('genre'),
            'publisher': request.form.get('publisher'), 'year': published_year,
            'lang': request.form.get('language', 'English'), 'copies': int(request.form.get('total_copies', 1)),
            'desc': request.form.get('description'), 'cover': cover_filename, 'aid': admin_id
        }
    )
    db.session.commit()
    
    return jsonify({'message': 'Book added successfully'}), 201


@admin_bp.route('/books/<int:book_id>', methods=['PUT'])
@jwt_required()
@require_admin
def update_book(book_id):
    """Update book details with optional cover image"""
    admin_id = int(get_jwt_identity())
    
    updates = []
    params = {'book_id': book_id}
    
    fields = {
        'title': request.form.get('title'),
        'author': request.form.get('author'),
        'isbn': request.form.get('isbn'),
        'genre': request.form.get('genre'),
        'publisher': request.form.get('publisher'),
        'published_year': request.form.get('published_year'),
        'language': request.form.get('language'),
        'description': request.form.get('description'),
        'total_copies': request.form.get('total_copies')
    }
    
    for field, value in fields.items():
        if value is not None:
            updates.append(f"{field} = :{field}")
            params[field] = value
    
    if 'total_copies' in params:
        try:
            new_total = int(params['total_copies'])
            current = db.session.execute(
                text("SELECT total_copies, available_copies FROM books WHERE book_id = :book_id"),
                {'book_id': book_id}
            ).first()
            if current:
                diff = new_total - current[0]
                if diff != 0:
                    updates.append("available_copies = available_copies + :diff")
                    params['diff'] = diff
        except (ValueError, TypeError):
            pass
    
    upload_folder = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads', 'covers')
    
    if 'cover_image' in request.files:
        file = request.files['cover_image']
        if file.filename and file.filename.strip():
            ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
            if ext in ['jpg', 'jpeg', 'png', 'webp']:
                os.makedirs(upload_folder, exist_ok=True)
                
                old_cover = db.session.execute(
                    text("SELECT cover_image FROM books WHERE book_id = :book_id"),
                    {'book_id': book_id}
                ).first()
                if old_cover and old_cover[0]:
                    old_path = os.path.join(upload_folder, old_cover[0])
                    if os.path.exists(old_path):
                        try:
                            os.remove(old_path)
                        except Exception as e:
                            print(f"Error deleting old cover: {e}")
                
                cover_filename = f"cover_{book_id}_{int(datetime.now().timestamp())}.{ext}"
                file.save(os.path.join(upload_folder, cover_filename))
                updates.append("cover_image = :cover_image")
                params['cover_image'] = cover_filename
    
    if updates:
        query = f"UPDATE books SET {', '.join(updates)}, updated_at = NOW() WHERE book_id = :book_id"
        db.session.execute(text(query), params)
        db.session.commit()
    
    return jsonify({'message': 'Book updated successfully'}), 200


@admin_bp.route('/books/<int:book_id>', methods=['DELETE'])
@jwt_required()
@require_admin
def archive_book(book_id):
    """Archive a book (soft delete) - clean up cover file"""
    admin_id = int(get_jwt_identity())
    
    book = db.session.execute(
        text("SELECT cover_image FROM books WHERE book_id = :book_id"),
        {'book_id': book_id}
    ).first()
    
    if book and book[0]:
        upload_folder = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads', 'covers')
        cover_path = os.path.join(upload_folder, book[0])
        if os.path.exists(cover_path):
            try:
                os.remove(cover_path)
            except Exception as e:
                print(f"Error deleting cover during archive: {e}")
    
    db.session.execute(
        text("UPDATE books SET is_archived = TRUE, cover_image = NULL, updated_at = NOW() WHERE book_id = :book_id"),
        {'book_id': book_id}
    )
    db.session.commit()
    
    return jsonify({'message': 'Book archived successfully'}), 200


# ============================================================
# MEMBERSHIP MANAGEMENT (with notification integration)
# ============================================================

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
    """Approve a membership request and notify the user"""
    admin_id = int(get_jwt_identity())
    data = request.get_json()
    
    duration_months = data.get('duration_months', 12)
    card_number = f"LIB-{datetime.now().strftime('%Y%m%d')}-{membership_id:04d}"
    expiry_date = datetime.now() + timedelta(days=30 * duration_months)
    
    # Get user_id from membership
    membership = db.session.execute(
        text("SELECT user_id FROM memberships WHERE membership_id = :mid"),
        {'mid': membership_id}
    ).first()
    
    if not membership:
        return jsonify({'error': 'Membership not found'}), 404
    
    user_id = membership[0]
    
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
    
    # NOTIFY: Send membership approved notification
    NotificationService.notify_user_membership_approved(
        user_id,
        card_number,
        expiry_date.strftime('%Y-%m-%d')
    )
    
    return jsonify({
        'message': 'Membership approved',
        'card_number': card_number,
        'expiry_date': expiry_date.strftime('%Y-%m-%d')
    }), 200


@admin_bp.route('/memberships/<int:membership_id>/reject', methods=['POST'])
@jwt_required()
@require_admin
def reject_membership(membership_id):
    """Reject a membership request and notify the user"""
    admin_id = int(get_jwt_identity())
    
    # Get user_id before rejecting
    membership = db.session.execute(
        text("SELECT user_id FROM memberships WHERE membership_id = :mid"),
        {'mid': membership_id}
    ).first()
    
    if not membership:
        return jsonify({'error': 'Membership not found'}), 404
    
    user_id = membership[0]
    
    db.session.execute(
        text("""
            UPDATE memberships 
            SET status = 'rejected', processed_by = :admin_id
            WHERE membership_id = :membership_id
        """),
        {'admin_id': admin_id, 'membership_id': membership_id}
    )
    db.session.commit()
    
    # NOTIFY: Send membership rejected notification
    NotificationService.notify_user_membership_rejected(user_id)
    
    return jsonify({'message': 'Membership rejected'}), 200


# ============================================================
# BORROWING MANAGEMENT (with notification integration)
# ============================================================

@admin_bp.route('/borrowings', methods=['GET'])
@jwt_required()
@require_admin
def get_all_borrowings():
    """Get all active borrowings (admin view)"""
    admin_id = int(get_jwt_identity())
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    status = request.args.get('status')
    
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
        'borrowings': borrowings, 'total': total, 'page': page,
        'per_page': per_page,
        'total_pages': (total + per_page - 1) // per_page if total > 0 else 0
    }), 200


@admin_bp.route('/borrowings/<int:borrow_id>/renew/approve', methods=['POST'])
@jwt_required()
@require_admin
def approve_renewal(borrow_id):
    """Approve a renewal request and notify the user"""
    admin_id = int(get_jwt_identity())
    
    result = db.session.execute(
        text("SELECT * FROM borrowings WHERE borrow_id = :borrow_id"),
        {'borrow_id': borrow_id}
    ).first()
    
    if not result:
        return jsonify({'error': 'Borrow record not found'}), 404
    
    borrow = dict(result._mapping)
    
    if not borrow['renewal_requested']:
        return jsonify({'error': 'No renewal requested for this book'}), 400
    
    new_due_date = datetime.now() + timedelta(days=14)
    
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
    
    # NOTIFY: Send renewal approved notification to user
    book_title = NotificationService._get_book_title(borrow['book_id'])
    NotificationService.notify_user_renewal_approved(
        borrow['user_id'],
        book_title,
        new_due_date.date().isoformat()
    )
    
    return jsonify({
        'message': 'Renewal approved',
        'new_due_date': new_due_date.date().isoformat()
    }), 200


@admin_bp.route('/borrowings/<int:borrow_id>/renew/reject', methods=['POST'])
@jwt_required()
@require_admin
def reject_renewal(borrow_id):
    """Reject a renewal request and notify the user"""
    admin_id = int(get_jwt_identity())
    
    result = db.session.execute(
        text("SELECT * FROM borrowings WHERE borrow_id = :borrow_id"),
        {'borrow_id': borrow_id}
    ).first()
    
    if not result:
        return jsonify({'error': 'Borrow record not found'}), 404
    
    borrow = dict(result._mapping)
    
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
    
    # NOTIFY: Send renewal rejected notification to user
    book_title = NotificationService._get_book_title(borrow['book_id'])
    NotificationService.notify_user_renewal_rejected(
        borrow['user_id'],
        book_title
    )
    
    return jsonify({'message': 'Renewal rejected'}), 200


@admin_bp.route('/borrowings/confirm-pickup/<int:reservation_id>', methods=['POST'])
@jwt_required()
@require_admin
def confirm_pickup(reservation_id):
    """Admin confirms user has arrived to pick up reserved book"""
    admin_id = int(get_jwt_identity())
    
    try:
        reservation = db.session.execute(
            text("SELECT * FROM reservations WHERE reservation_id = :rid AND status = 'pending'"),
            {'rid': reservation_id}
        ).first()
        
        if not reservation:
            return jsonify({'error': 'Reservation not found or already processed'}), 404
        
        res = dict(reservation._mapping)
        
        # Check membership
        has_membership = db.session.execute(
            text("SELECT 1 FROM memberships WHERE user_id = :uid AND status = 'active' AND expiry_date > CURDATE()"),
            {'uid': res['user_id']}
        ).first()
        
        if not has_membership:
            return jsonify({
                'error': 'Membership required',
                'message': 'User does not have an active membership.'
            }), 400
        
        # Check borrow limit
        active_borrows = db.session.execute(
            text("SELECT COUNT(*) FROM borrowings WHERE user_id = :uid AND status NOT IN ('returned', 'lost')"),
            {'uid': res['user_id']}
        ).first()[0]
        
        if active_borrows >= 5:
            return jsonify({
                'error': 'Borrow limit reached',
                'message': f'User already has {active_borrows}/5 books borrowed.'
            }), 400
        
        # Check duplicate
        already_have = db.session.execute(
            text("SELECT 1 FROM borrowings WHERE user_id = :uid AND book_id = :bid AND status NOT IN ('returned', 'lost')"),
            {'uid': res['user_id'], 'bid': res['book_id']}
        ).first()
        
        if already_have:
            return jsonify({
                'error': 'Already borrowed',
                'message': 'This user already has this book borrowed.'
            }), 400
        
        due_date = date.today() + timedelta(days=14)
        
        db.session.execute(
            text("INSERT INTO borrowings (user_id, book_id, issued_by, due_date, status) VALUES (:uid, :bid, :aid, :due, 'borrowed')"),
            {'uid': res['user_id'], 'bid': res['book_id'], 'aid': admin_id, 'due': due_date}
        )
        db.session.commit()
        
        return jsonify({
            'message': 'Book issued successfully!',
            'due_date': due_date.isoformat(),
            'borrows_remaining': 5 - (active_borrows + 1)
        }), 201
        
    except Exception as e:
        db.session.rollback()
        error_msg = str(e)
        print(f"Confirm pickup error: {error_msg}")
        
        if 'maximum simultaneous borrow limit' in error_msg:
            return jsonify({
                'error': 'Borrow limit reached',
                'message': 'User has reached the maximum of 5 borrowed books.'
            }), 400
        elif 'no active membership' in error_msg:
            return jsonify({
                'error': 'Membership required',
                'message': 'User does not have an active membership.'
            }), 400
        elif 'no available copies' in error_msg:
            return jsonify({
                'error': 'No copies available',
                'message': 'This book has no available copies.'
            }), 400
        elif 'already have' in error_msg.lower():
            return jsonify({
                'error': 'Already borrowed',
                'message': 'User already has this book.'
            }), 400
        else:
            return jsonify({
                'error': 'Failed to issue book',
                'message': error_msg
            }), 500


# ============================================================
# USER MANAGEMENT
# ============================================================

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
        'users': users, 'total': total, 'page': page,
        'per_page': per_page, 'total_pages': (total + per_page - 1) // per_page
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
    
    membership = db.session.execute(
        text("SELECT * FROM memberships WHERE user_id = :user_id ORDER BY requested_at DESC LIMIT 1"),
        {'user_id': user_id}
    ).first()
    
    borrowings = db.session.execute(
        text("""
            SELECT b.*, bk.title, bk.author
            FROM borrowings b
            JOIN books bk ON b.book_id = bk.book_id
            WHERE b.user_id = :user_id AND b.status NOT IN ('returned', 'lost')
        """),
        {'user_id': user_id}
    )
    
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


# ============================================================
# STATISTICS
# ============================================================

@admin_bp.route('/stats/borrowings', methods=['GET'])
@jwt_required()
@require_admin
def get_borrowing_stats():
    """Get borrowing statistics for charts"""
    admin_id = int(get_jwt_identity())
    
    daily = db.session.execute(
        text("""
            SELECT DATE(issued_at) as date, COUNT(*) as count
            FROM borrowings
            WHERE issued_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY DATE(issued_at) ORDER BY date ASC
        """)
    )
    daily_stats = [dict(row._mapping) for row in daily]
    
    top_books = db.session.execute(
        text("""
            SELECT b.book_id, b.title, b.author, COUNT(*) as borrow_count
            FROM borrow_history bh
            JOIN books b ON bh.book_id = b.book_id
            WHERE bh.returned_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY b.book_id ORDER BY borrow_count DESC LIMIT 10
        """)
    )
    top_books_list = [dict(row._mapping) for row in top_books]
    
    genres = db.session.execute(
        text("""
            SELECT genre, COUNT(*) as count
            FROM books WHERE is_archived = FALSE AND genre IS NOT NULL
            GROUP BY genre ORDER BY count DESC
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
    
    monthly = db.session.execute(
        text("""
            SELECT DATE_FORMAT(returned_at, '%Y-%m') as month, SUM(fine_amount) as revenue
            FROM borrow_history
            WHERE fine_status = 'paid' AND returned_at > DATE_SUB(NOW(), INTERVAL 12 MONTH)
            GROUP BY DATE_FORMAT(returned_at, '%Y-%m') ORDER BY month ASC
        """)
    )
    monthly_stats = [dict(row._mapping) for row in monthly]
    
    total = db.session.execute(
        text("SELECT SUM(fine_amount) as total FROM borrow_history WHERE fine_status = 'paid'")
    ).first()[0] or 0
    
    return jsonify({'monthly_revenue': monthly_stats, 'total_revenue': float(total)}), 200


# ============================================================
# BOOK REQUESTS (with notification integration)
# ============================================================

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
    """Approve a book request and notify user"""
    admin_id = int(get_jwt_identity())
    
    request_data = db.session.execute(
        text("SELECT * FROM book_requests WHERE request_id = :rid"),
        {'rid': request_id}
    ).first()
    
    if not request_data:
        return jsonify({'error': 'Request not found'}), 404
    
    req = dict(request_data._mapping)
    
    db.session.execute(
        text("UPDATE book_requests SET status = 'approved', updated_at = NOW() WHERE request_id = :rid"),
        {'rid': request_id}
    )
    db.session.commit()
    
    # NOTIFY: Use notification service
    NotificationService.notify_user_book_request_approved(req['user_id'], req['title'])
    
    return jsonify({'message': 'Book request approved and user notified'}), 200


@admin_bp.route('/book-requests/<int:request_id>/reject', methods=['POST'])
@jwt_required()
@require_admin
def reject_book_request(request_id):
    """Reject a book request and notify user"""
    admin_id = int(get_jwt_identity())
    
    request_data = db.session.execute(
        text("SELECT * FROM book_requests WHERE request_id = :rid"),
        {'rid': request_id}
    ).first()
    
    if not request_data:
        return jsonify({'error': 'Request not found'}), 404
    
    req = dict(request_data._mapping)
    
    db.session.execute(
        text("UPDATE book_requests SET status = 'rejected', updated_at = NOW() WHERE request_id = :rid"),
        {'rid': request_id}
    )
    db.session.commit()
    
    # NOTIFY: Use notification service
    NotificationService.notify_user_book_request_rejected(req['user_id'], req['title'])
    
    return jsonify({'message': 'Book request rejected and user notified'}), 200


# ============================================================
# ADMIN NOTIFICATIONS
# ============================================================

@admin_bp.route('/notifications', methods=['GET'])
@jwt_required()
@require_admin
def get_admin_notifications():
    """Get admin notifications"""
    admin_id = int(get_jwt_identity())
    
    result = db.session.execute(
        text("""
            SELECT n.*, an.is_read, an.read_at
            FROM notifications n
            JOIN admin_notifications an ON n.notification_id = an.notification_id
            WHERE an.admin_id = :aid
            ORDER BY n.created_at DESC
            LIMIT 50
        """),
        {'aid': admin_id}
    )
    notifications = [dict(row._mapping) for row in result]
    return jsonify(notifications), 200


@admin_bp.route('/notifications/<int:notification_id>/read', methods=['POST'])
@jwt_required()
@require_admin
def mark_admin_notification_read(notification_id):
    """Mark admin notification as read"""
    admin_id = int(get_jwt_identity())
    
    db.session.execute(
        text("UPDATE admin_notifications SET is_read = TRUE, read_at = NOW() WHERE admin_id = :aid AND notification_id = :nid"),
        {'aid': admin_id, 'nid': notification_id}
    )
    db.session.commit()
    return jsonify({'message': 'Marked as read'}), 200


@admin_bp.route('/notifications/read-all', methods=['POST'])
@jwt_required()
@require_admin
def mark_all_admin_notifications_read():
    """Mark all admin notifications as read"""
    admin_id = int(get_jwt_identity())
    
    db.session.execute(
        text("UPDATE admin_notifications SET is_read = TRUE, read_at = NOW() WHERE admin_id = :aid AND is_read = FALSE"),
        {'aid': admin_id}
    )
    db.session.commit()
    return jsonify({'message': 'All marked as read'}), 200