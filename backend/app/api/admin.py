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


# ============================================================
# MEMBERSHIP MANAGEMENT (with notification integration)
# ============================================================
@admin_bp.route('/memberships/all', methods=['GET'])
@jwt_required()
@require_admin
def get_all_memberships():
    """Get all memberships with optional status filter"""
    admin_id = int(get_jwt_identity())
    status = request.args.get('status')
    
    query = """
        SELECT m.*, u.full_name, u.email, u.phone, u.address, u.profile_picture
        FROM memberships m
        JOIN users u ON m.user_id = u.user_id
        WHERE 1=1
    """
    params = {}
    
    if status and status != 'all':
        query += " AND m.status = :status"
        params['status'] = status
    
    query += " ORDER BY m.requested_at DESC"
    
    result = db.session.execute(text(query), params)
    memberships = [dict(row._mapping) for row in result]
    
    return jsonify(memberships), 200


@admin_bp.route('/memberships/create', methods=['POST'])
@jwt_required()
@require_admin
def admin_create_membership():
    """Admin creates a membership for offline walk-in member"""
    admin_id = int(get_jwt_identity())
    
    full_name = request.form.get('full_name', '').strip()
    phone = request.form.get('phone', '').strip()
    email = request.form.get('email', '').strip()
    address = request.form.get('address', '').strip()
    duration_months = int(request.form.get('duration_months', 12))
    
    if not full_name:
        return jsonify({'error': 'Full name is required'}), 400
    
    # Check if user exists by phone or email
    user_id = None
    if phone:
        existing = db.session.execute(
            text("SELECT user_id FROM users WHERE phone = :p AND is_active = TRUE"),
            {'p': phone}
        ).first()
        if existing:
            user_id = existing[0]
    
    if not user_id and email:
        existing = db.session.execute(
            text("SELECT user_id FROM users WHERE email = :e AND is_active = TRUE"),
            {'e': email}
        ).first()
        if existing:
            user_id = existing[0]
    
    # Create new user if not found
    if not user_id:
        if not email:
            email = f"offline_{int(datetime.now().timestamp())}@libmate.local"
        
        # Make sure email is unique
        email_exists = db.session.execute(
            text("SELECT user_id FROM users WHERE email = :e"), {'e': email}
        ).first()
        if email_exists:
            email = f"offline_{int(datetime.now().timestamp())}_{phone or 'member'}@libmate.local"
        
        import bcrypt
        hashed = bcrypt.hashpw('offline123'.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        result = db.session.execute(
            text("""
                INSERT INTO users (full_name, email, phone, address, password_hash, role)
                VALUES (:n, :e, :p, :a, :h, 'member')
            """),
            {'n': full_name, 'e': email, 'p': phone, 'a': address, 'h': hashed}
        )
        db.session.commit()
        user_id = result.lastrowid
    
    # Verify user exists
    if not user_id:
        return jsonify({'error': 'Failed to create user account'}), 500
    
    # Check no active membership
    existing = db.session.execute(
        text("SELECT 1 FROM memberships WHERE user_id = :uid AND status = 'active'"),
        {'uid': user_id}
    ).first()
    
    if existing:
        return jsonify({'error': 'User already has an active membership'}), 400
    
    # Handle photo
    profile_photo = request.files.get('profile_photo')
    photo_filename = None
    if profile_photo and profile_photo.filename:
        ext = profile_photo.filename.rsplit('.', 1)[1].lower() if '.' in profile_photo.filename else 'jpg'
        upload_folder = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads', 'photos')
        os.makedirs(upload_folder, exist_ok=True)
        photo_filename = f"profile_{user_id}_{int(datetime.now().timestamp())}.{ext}"
        profile_photo.save(os.path.join(upload_folder, photo_filename))
        db.session.execute(
            text("UPDATE users SET profile_picture = :pic WHERE user_id = :uid"),
            {'pic': photo_filename, 'uid': user_id}
        )
        db.session.commit()
    
    # Handle receipt
    payment_receipt = request.files.get('payment_receipt')
    receipt_filename = None
    if payment_receipt and payment_receipt.filename:
        ext = payment_receipt.filename.rsplit('.', 1)[1].lower() if '.' in payment_receipt.filename else 'jpg'
        upload_folder = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads', 'receipts')
        os.makedirs(upload_folder, exist_ok=True)
        receipt_filename = f"receipt_{user_id}_{int(datetime.now().timestamp())}.{ext}"
        payment_receipt.save(os.path.join(upload_folder, receipt_filename))
    
    # Create membership
    card_number = f"LIB-{datetime.now().strftime('%Y%m%d')}-{user_id:04d}"
    
    db.session.execute(
        text("""
            INSERT INTO memberships (user_id, duration_months, start_date, expiry_date, 
                                     status, payment_status, card_number, card_issued_at, 
                                     approved_at, processed_by, payment_receipt)
            VALUES (:uid, :dur, CURDATE(), DATE_ADD(CURDATE(), INTERVAL :dur MONTH),
                    'active', 'paid', :card, NOW(), NOW(), :aid, :receipt)
        """),
        {'uid': user_id, 'dur': duration_months, 'card': card_number, 'aid': admin_id, 'receipt': receipt_filename}
    )
    db.session.commit()
    
    return jsonify({
        'message': f'Membership created for {full_name}',
        'card_number': card_number,
        'user_id': user_id,
        'email': email
    }), 201

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
    
    # Always exclude returned/lost from active view
    query = """
        SELECT b.*, u.full_name as user_name, u.email, bk.title as book_title, bk.author
        FROM borrowings b
        JOIN users u ON b.user_id = u.user_id
        JOIN books bk ON b.book_id = bk.book_id
        WHERE b.status IN ('borrowed', 'overdue', 'renewed')
    """
    count_query = """
        SELECT COUNT(*) as total
        FROM borrowings b
        JOIN users u ON b.user_id = u.user_id
        JOIN books bk ON b.book_id = bk.book_id
        WHERE b.status IN ('borrowed', 'overdue', 'renewed')
    """
    params = {}
    count_params = {}
    
    if status and status != 'all' and status in ('borrowed', 'overdue', 'renewed'):
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

        # Mark reservation as fulfilled
        db.session.execute(
            text("UPDATE reservations SET status = 'fulfilled' WHERE reservation_id = :rid"),
            {'rid': reservation_id}
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
        
@admin_bp.route('/borrowings/issue', methods=['POST'])
@jwt_required()
@require_admin
def admin_issue_book():
    """Admin manually issues a book to a member"""
    admin_id = int(get_jwt_identity())
    data = request.get_json()
    
    user_id = data.get('user_id')
    book_id = data.get('book_id')
    due_days = data.get('due_days', 14)
    
    if not user_id or not book_id:
        return jsonify({'error': 'User ID and Book ID are required'}), 400
    
    # Check membership
    has_membership = db.session.execute(
        text("SELECT 1 FROM memberships WHERE user_id = :uid AND status = 'active' AND expiry_date > CURDATE()"),
        {'uid': user_id}
    ).first()
    
    if not has_membership:
        return jsonify({'error': 'User does not have an active membership'}), 400
    
    # Check borrow limit
    active = db.session.execute(
        text("SELECT COUNT(*) FROM borrowings WHERE user_id = :uid AND status NOT IN ('returned', 'lost')"),
        {'uid': user_id}
    ).first()[0]
    
    if active >= 5:
        return jsonify({'error': f'User already has {active}/5 books borrowed. They must return one first.'}), 400
    
    # Check duplicate
    dup = db.session.execute(
        text("SELECT 1 FROM borrowings WHERE user_id = :uid AND book_id = :bid AND status NOT IN ('returned', 'lost')"),
        {'uid': user_id, 'bid': book_id}
    ).first()
    
    if dup:
        return jsonify({'error': 'User already has this book borrowed'}), 400
    
    # Check book availability
    book = db.session.execute(
        text("SELECT available_copies, title FROM books WHERE book_id = :bid AND is_archived = FALSE"),
        {'bid': book_id}
    ).first()
    
    if not book:
        return jsonify({'error': 'Book not found'}), 404
    
    if book[0] < 1:
        return jsonify({'error': 'No copies available'}), 400
    
    due_date = date.today() + timedelta(days=due_days)
    
    db.session.execute(
        text("INSERT INTO borrowings (user_id, book_id, issued_by, due_date, status) VALUES (:uid, :bid, :aid, :due, 'borrowed')"),
        {'uid': user_id, 'bid': book_id, 'aid': admin_id, 'due': due_date}
    )
    db.session.commit()
    
    return jsonify({
        'message': f'Book "{book[1]}" issued successfully',
        'due_date': due_date.isoformat()
    }), 201
        

@admin_bp.route('/borrowings/<int:borrow_id>/return', methods=['POST'])
@jwt_required()
@require_admin
def admin_return_book(borrow_id):
    """Admin marks a book as returned with condition"""
    admin_id = int(get_jwt_identity())
    data = request.get_json()
    return_condition = data.get('condition', 'good')
    
    if return_condition not in ('good', 'damaged', 'lost'):
        return jsonify({'error': 'Invalid condition'}), 400
    
    result = db.session.execute(
        text("SELECT * FROM borrowings WHERE borrow_id = :bid AND status NOT IN ('returned', 'lost')"),
        {'bid': borrow_id}
    ).first()
    
    if not result:
        return jsonify({'error': 'This book has already been returned or is no longer active.'}), 400
    
    borrow = dict(result._mapping)
    
    db.session.execute(
        text("UPDATE borrowings SET status = 'returned', returned_at = NOW(), updated_at = NOW() WHERE borrow_id = :bid"),
        {'bid': borrow_id}
    )
    
    # Update the borrow_history entry with condition and returned_to
    db.session.execute(
        text("""
            UPDATE borrow_history SET return_condition = :cond, returned_to = :aid, fine_status = :fs
            WHERE borrow_id = :bid
        """),
        {'cond': return_condition, 'aid': admin_id, 'bid': borrow_id,
         'fs': 'unpaid' if borrow['due_date'] < date.today() else 'none'}
    )
    
    db.session.commit()
    
    # Trigger AI recommendations
    from ..services.recommendation_service import RecommendationService
    RecommendationService.generate_recommendations_for_user(borrow['user_id'])
    
    # Notify waitlist
    next_res = db.session.execute(
        text("""
            SELECT r.user_id, b.title FROM reservations r
            JOIN books b ON r.book_id = b.book_id
            WHERE r.book_id = :bid AND r.status = 'pending' AND r.reservation_type = 'waitlist'
            ORDER BY r.reserved_at ASC LIMIT 1
        """),
        {'bid': borrow['book_id']}
    ).first()
    
    if next_res:
        NotificationService.notify_user_book_available(next_res[0], next_res[1])
    
    return jsonify({'message': 'Book returned successfully', 'condition': return_condition}), 200


@admin_bp.route('/borrowings/history', methods=['GET'])
@jwt_required()
@require_admin
def get_borrow_history_admin():
    """Get all borrow history with pagination and search"""
    admin_id = int(get_jwt_identity())
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    search = request.args.get('search', '')
    
    query = """SELECT * FROM vw_borrow_history WHERE 1=1"""
    count_query = """SELECT COUNT(*) as total FROM vw_borrow_history WHERE 1=1"""
    params = {}
    
    if search:
        query += " AND (member_name LIKE :s OR member_email LIKE :s OR book_title LIKE :s)"
        count_query += " AND (member_name LIKE :s OR member_email LIKE :s OR book_title LIKE :s)"
        params['s'] = f'%{search}%'
    
    total = db.session.execute(text(count_query), params).first()[0]
    
    query += " ORDER BY returned_at DESC LIMIT :limit OFFSET :offset"
    params['limit'] = per_page
    params['offset'] = (page - 1) * per_page
    
    result = db.session.execute(text(query), params)
    history = [dict(row._mapping) for row in result]
    
    return jsonify({
        'history': history, 'total': total, 'page': page,
        'per_page': per_page,
        'total_pages': (total + per_page - 1) // per_page if total > 0 else 0
    }), 200


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

# ============================================================
# ARCHIVED BOOKS MANAGEMENT
# ============================================================

@admin_bp.route('/books/<int:book_id>', methods=['DELETE'])
@jwt_required()
@require_admin
def archive_book(book_id):
    """Archive a book (soft delete) - KEEPS cover image for restoration"""
    admin_id = int(get_jwt_identity())
    
    # Check if book exists and isn't already archived
    book = db.session.execute(
        text("SELECT book_id, title, is_archived FROM books WHERE book_id = :book_id"),
        {'book_id': book_id}
    ).first()
    
    if not book:
        return jsonify({'error': 'Book not found'}), 404
    
    if book[2]:  # already archived
        return jsonify({'error': 'Book is already archived'}), 400
    
    # Archive WITHOUT deleting cover image or setting it to NULL
    db.session.execute(
        text("UPDATE books SET is_archived = TRUE, updated_at = NOW() WHERE book_id = :book_id"),
        {'book_id': book_id}
    )
    db.session.commit()
    
    return jsonify({'message': f'"{book[1]}" archived successfully'}), 200

@admin_bp.route('/books/archived', methods=['GET'])
@jwt_required()
@require_admin
def get_archived_books():
    """Get all archived books"""
    admin_id = int(get_jwt_identity())
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    search = request.args.get('search', '')
    
    query = """
        SELECT * FROM books 
        WHERE is_archived = TRUE
    """
    count_query = "SELECT COUNT(*) as total FROM books WHERE is_archived = TRUE"
    params = {}
    count_params = {}
    
    if search:
        query += " AND (title LIKE :search OR author LIKE :search OR isbn LIKE :search)"
        count_query += " AND (title LIKE :search OR author LIKE :search OR isbn LIKE :search)"
        params['search'] = f'%{search}%'
        count_params['search'] = f'%{search}%'
    
    total_result = db.session.execute(text(count_query), count_params).first()
    total = total_result[0] if total_result else 0
    
    query += " ORDER BY updated_at DESC LIMIT :limit OFFSET :offset"
    params['limit'] = per_page
    params['offset'] = (page - 1) * per_page
    
    result = db.session.execute(text(query), params)
    books = [dict(row._mapping) for row in result]
    
    return jsonify({
        'books': books, 'total': total, 'page': page,
        'per_page': per_page,
        'total_pages': (total + per_page - 1) // per_page if total > 0 else 0
    }), 200


@admin_bp.route('/books/<int:book_id>/restore', methods=['POST'])
@jwt_required()
@require_admin
def restore_book(book_id):
    """Restore an archived book"""
    admin_id = int(get_jwt_identity())
    
    book = db.session.execute(
        text("SELECT book_id, title, is_archived FROM books WHERE book_id = :bid"),
        {'bid': book_id}
    ).first()
    
    if not book:
        return jsonify({'error': 'Book not found'}), 404
    
    if not book[2]:
        return jsonify({'error': 'Book is not archived'}), 400
    
    # Restore the book - cover_image stays intact
    db.session.execute(
        text("UPDATE books SET is_archived = FALSE, updated_at = NOW() WHERE book_id = :bid"),
        {'bid': book_id}
    )
    db.session.commit()
    
    return jsonify({'message': f'"{book[1]}" restored successfully'}), 200


# ============================================================
# ARCHIVED / INACTIVE USERS MANAGEMENT
# ============================================================

@admin_bp.route('/users/inactive', methods=['GET'])
@jwt_required()
@require_admin
def get_inactive_users():
    """Get all inactive/deactivated users"""
    admin_id = int(get_jwt_identity())
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    search = request.args.get('search', '')
    
    query = """
        SELECT u.*, 
               (SELECT COUNT(*) FROM borrowings b WHERE b.user_id = u.user_id AND b.status NOT IN ('returned', 'lost')) as active_borrows,
               (SELECT COUNT(*) FROM borrow_history bh WHERE bh.user_id = u.user_id) as total_books_read,
               (SELECT COUNT(*) FROM memberships m WHERE m.user_id = u.user_id) as total_memberships
        FROM users u
        WHERE u.is_active = FALSE
    """
    count_query = "SELECT COUNT(*) as total FROM users u WHERE u.is_active = FALSE"
    params = {}
    count_params = {}
    
    if search:
        query += " AND (u.full_name LIKE :search OR u.email LIKE :search)"
        count_query += " AND (u.full_name LIKE :search OR u.email LIKE :search)"
        params['search'] = f'%{search}%'
        count_params['search'] = f'%{search}%'
    
    total_result = db.session.execute(text(count_query), count_params).first()
    total = total_result[0] if total_result else 0
    
    query += " ORDER BY u.updated_at DESC LIMIT :limit OFFSET :offset"
    params['limit'] = per_page
    params['offset'] = (page - 1) * per_page
    
    result = db.session.execute(text(query), params)
    users = [dict(row._mapping) for row in result]
    
    return jsonify({
        'users': users, 'total': total, 'page': page,
        'per_page': per_page,
        'total_pages': (total + per_page - 1) // per_page if total > 0 else 0
    }), 200


# ============================================================
# ANNOUNCEMENTS
# ============================================================

@admin_bp.route('/announcements', methods=['GET'])
@jwt_required()
@require_admin
def get_announcements():
    """Get all announcements"""
    admin_id = int(get_jwt_identity())
    
    result = db.session.execute(
        text("""
            SELECT n.*
            FROM notifications n
            WHERE n.type = 'announcement'
            ORDER BY n.created_at DESC
            LIMIT 50
        """)
    )
    announcements = [dict(row._mapping) for row in result]
    return jsonify(announcements), 200


@admin_bp.route('/announcements/send', methods=['POST'])
@jwt_required()
@require_admin
def send_announcement():
    """Send an announcement to all users"""
    admin_id = int(get_jwt_identity())
    data = request.get_json()
    
    title = data.get('title', '').strip()
    message = data.get('message', '').strip()
    
    if not title or not message:
        return jsonify({'error': 'Title and message are required'}), 400
    
    # Insert notification
    db.session.execute(
        text("INSERT INTO notifications (type, title, message) VALUES ('announcement', :title, :message)"),
        {'title': title, 'message': message}
    )
    notification_id = db.session.execute(text("SELECT LAST_INSERT_ID()")).first()[0]
    
    # Send to all active users
    db.session.execute(
        text("""
            INSERT INTO user_notifications (user_id, notification_id)
            SELECT user_id, :nid FROM users WHERE is_active = TRUE
        """),
        {'nid': notification_id}
    )
    
    # Also add to admin_notifications for tracking
    db.session.execute(
        text("INSERT INTO admin_notifications (admin_id, notification_id) VALUES (:aid, :nid)"),
        {'aid': admin_id, 'nid': notification_id}
    )
    
    db.session.commit()
    
    # WebSocket notify all users
    from ..api.socket_events import notify_user_socket
    
    # Get all active user IDs
    users = db.session.execute(
        text("SELECT user_id FROM users WHERE is_active = TRUE")
    ).fetchall()
    
    for user in users:
        notify_user_socket(user[0], {
            'notification_id': notification_id,
            'type': 'announcement',
            'title': title,
            'message': message,
            'is_read': False
        })
    
    return jsonify({
        'message': 'Announcement sent successfully',
        'sent_to': len(users)
    }), 201


@admin_bp.route('/announcements/<int:notification_id>', methods=['DELETE'])
@jwt_required()
@require_admin
def delete_announcement(notification_id):
    """Delete an announcement"""
    admin_id = int(get_jwt_identity())
    
    db.session.execute(
        text("DELETE FROM user_notifications WHERE notification_id = :nid"),
        {'nid': notification_id}
    )
    db.session.execute(
        text("DELETE FROM admin_notifications WHERE notification_id = :nid"),
        {'nid': notification_id}
    )
    db.session.execute(
        text("DELETE FROM notifications WHERE notification_id = :nid AND type = 'announcement'"),
        {'nid': notification_id}
    )
    db.session.commit()
    
    return jsonify({'message': 'Announcement deleted'}), 200

# ============================================================
# ADMIN PROFILE
# ============================================================

@admin_bp.route('/profile', methods=['GET'])
@jwt_required()
@require_admin
def get_admin_profile():
    """Get current admin's profile"""
    admin_id = int(get_jwt_identity())
    
    result = db.session.execute(
        text("SELECT admin_id, full_name, email, phone, profile_picture, is_active, created_at, updated_at FROM admins WHERE admin_id = :aid"),
        {'aid': admin_id}
    ).first()
    
    if not result:
        return jsonify({'error': 'Admin not found'}), 404
    
    admin = dict(result._mapping)
    return jsonify(admin), 200


@admin_bp.route('/profile', methods=['PUT'])
@jwt_required()
@require_admin
def update_admin_profile():
    """Update admin's profile"""
    admin_id = int(get_jwt_identity())
    data = request.get_json()
    
    updates = []
    params = {'admin_id': admin_id}
    
    if 'full_name' in data and data['full_name']:
        updates.append("full_name = :full_name")
        params['full_name'] = data['full_name'].strip()
    
    if 'phone' in data:
        updates.append("phone = :phone")
        params['phone'] = data['phone'].strip() if data['phone'] else None
    
    if updates:
        updates.append("updated_at = NOW()")
        query = f"UPDATE admins SET {', '.join(updates)} WHERE admin_id = :admin_id"
        db.session.execute(text(query), params)
        db.session.commit()
    
    return jsonify({'message': 'Profile updated successfully'}), 200


@admin_bp.route('/profile/upload-photo', methods=['POST'])
@jwt_required()
@require_admin
def upload_admin_photo():
    """Upload admin profile photo"""
    admin_id = int(get_jwt_identity())
    
    if 'profile_photo' not in request.files:
        return jsonify({'error': 'No photo provided'}), 400
    
    photo = request.files['profile_photo']
    if not photo.filename:
        return jsonify({'error': 'No file selected'}), 400
    
    allowed_extensions = {'png', 'jpg', 'jpeg', 'webp'}
    file_ext = photo.filename.rsplit('.', 1)[1].lower() if '.' in photo.filename else ''
    
    if file_ext not in allowed_extensions:
        return jsonify({'error': 'Invalid file type. Use PNG, JPG, or WEBP'}), 400
    
    if photo.content_length and photo.content_length > 5 * 1024 * 1024:
        return jsonify({'error': 'Photo too large. Max 5MB'}), 400
    
    upload_folder = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads', 'photos')
    os.makedirs(upload_folder, exist_ok=True)
    
    # Delete old photo
    old = db.session.execute(
        text("SELECT profile_picture FROM admins WHERE admin_id = :aid"),
        {'aid': admin_id}
    ).first()
    
    if old and old[0]:
        old_path = os.path.join(upload_folder, old[0])
        if os.path.exists(old_path):
            os.remove(old_path)
    
    filename = f"admin_{admin_id}_{int(datetime.now().timestamp())}.{file_ext}"
    photo.save(os.path.join(upload_folder, filename))
    
    db.session.execute(
        text("UPDATE admins SET profile_picture = :pic, updated_at = NOW() WHERE admin_id = :aid"),
        {'pic': filename, 'aid': admin_id}
    )
    db.session.commit()
    
    return jsonify({'message': 'Photo uploaded', 'filename': filename}), 200


@admin_bp.route('/profile/remove-photo', methods=['DELETE'])
@jwt_required()
@require_admin
def remove_admin_photo():
    """Remove admin profile photo"""
    admin_id = int(get_jwt_identity())
    
    old = db.session.execute(
        text("SELECT profile_picture FROM admins WHERE admin_id = :aid"),
        {'aid': admin_id}
    ).first()
    
    if old and old[0]:
        upload_folder = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads', 'photos')
        old_path = os.path.join(upload_folder, old[0])
        if os.path.exists(old_path):
            os.remove(old_path)
    
    db.session.execute(
        text("UPDATE admins SET profile_picture = NULL, updated_at = NOW() WHERE admin_id = :aid"),
        {'aid': admin_id}
    )
    db.session.commit()
    
    return jsonify({'message': 'Photo removed'}), 200


@admin_bp.route('/profile/change-password', methods=['POST'])
@jwt_required()
@require_admin
def change_admin_password():
    """Change admin password"""
    admin_id = int(get_jwt_identity())
    data = request.get_json()
    
    current_password = data.get('current_password', '')
    new_password = data.get('new_password', '')
    
    if not current_password or not new_password:
        return jsonify({'error': 'Current and new password are required'}), 400
    
    if len(new_password) < 6:
        return jsonify({'error': 'New password must be at least 6 characters'}), 400
    
    # Get current hash
    result = db.session.execute(
        text("SELECT password_hash FROM admins WHERE admin_id = :aid"),
        {'aid': admin_id}
    ).first()
    
    if not result:
        return jsonify({'error': 'Admin not found'}), 404
    
    import bcrypt
    
    if not bcrypt.checkpw(current_password.encode('utf-8'), result[0].encode('utf-8')):
        return jsonify({'error': 'Current password is incorrect'}), 400
    
    new_hash = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    db.session.execute(
        text("UPDATE admins SET password_hash = :hash, updated_at = NOW() WHERE admin_id = :aid"),
        {'hash': new_hash, 'aid': admin_id}
    )
    db.session.commit()
    
    return jsonify({'message': 'Password changed successfully'}), 200


@admin_bp.route('/profile/deactivate', methods=['POST'])
@jwt_required()
@require_admin
def deactivate_admin_account():
    """Deactivate own admin account"""
    admin_id = int(get_jwt_identity())
    data = request.get_json()
    
    password = data.get('password', '')
    
    if not password:
        return jsonify({'error': 'Password required to confirm deactivation'}), 400
    
    import bcrypt
    
    result = db.session.execute(
        text("SELECT password_hash FROM admins WHERE admin_id = :aid"),
        {'aid': admin_id}
    ).first()
    
    if not result:
        return jsonify({'error': 'Admin not found'}), 404
    
    if not bcrypt.checkpw(password.encode('utf-8'), result[0].encode('utf-8')):
        return jsonify({'error': 'Password is incorrect'}), 400
    
    db.session.execute(
        text("UPDATE admins SET is_active = FALSE, updated_at = NOW() WHERE admin_id = :aid"),
        {'aid': admin_id}
    )
    db.session.commit()
    
    return jsonify({'message': 'Account deactivated. You will be logged out.'}), 200

# ============================================================
# ADMIN MANAGEMENT (admin managing other admins)
# ============================================================

@admin_bp.route('/admins', methods=['GET'])
@jwt_required()
@require_admin
def get_all_admins():
    """Get all admins"""
    admin_id = int(get_jwt_identity())
    
    result = db.session.execute(
        text("""
            SELECT admin_id, full_name, email, phone, profile_picture, is_active, created_at
            FROM admins
            ORDER BY created_at DESC
        """)
    )
    admins = [dict(row._mapping) for row in result]
    return jsonify(admins), 200


@admin_bp.route('/admins', methods=['POST'])
@jwt_required()
@require_admin
def create_admin():
    """Create a new admin account"""
    current_admin_id = int(get_jwt_identity())
    data = request.get_json()
    
    full_name = data.get('full_name', '').strip()
    email = data.get('email', '').strip()
    password = data.get('password', '').strip()
    phone = data.get('phone', '').strip()
    
    if not full_name or not email or not password:
        return jsonify({'error': 'Full name, email, and password are required'}), 400
    
    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400
    
    # Check if email already exists in admins or users
    existing = db.session.execute(
        text("SELECT admin_id FROM admins WHERE email = :email UNION SELECT user_id FROM users WHERE email = :email"),
        {'email': email}
    ).first()
    
    if existing:
        return jsonify({'error': 'Email already in use'}), 409
    
    import bcrypt
    hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    db.session.execute(
        text("""
            INSERT INTO admins (full_name, email, phone, password_hash, is_active)
            VALUES (:full_name, :email, :phone, :password_hash, TRUE)
        """),
        {'full_name': full_name, 'email': email, 'phone': phone, 'password_hash': hashed}
    )
    db.session.commit()
    
    return jsonify({'message': f'Admin "{full_name}" created successfully'}), 201


@admin_bp.route('/admins/<int:target_admin_id>', methods=['DELETE'])
@jwt_required()
@require_admin
def remove_admin(target_admin_id):
    """Deactivate an admin account (can't delete yourself)"""
    current_admin_id = int(get_jwt_identity())
    
    if current_admin_id == target_admin_id:
        return jsonify({'error': 'You cannot deactivate your own account. Use the profile deactivation instead.'}), 400
    
    db.session.execute(
        text("UPDATE admins SET is_active = FALSE, updated_at = NOW() WHERE admin_id = :aid"),
        {'aid': target_admin_id}
    )
    db.session.commit()
    
    return jsonify({'message': 'Admin deactivated successfully'}), 200

# ============================================================
# SMOKE ALERTS (IoT Integration)
# ============================================================

@admin_bp.route('/smoke-alert', methods=['POST'])
def receive_smoke_alert():
    """Receive smoke alert from IoT device (no auth - device sends directly)"""
    data = request.get_json()
    device_id = request.args.get('device_id', 'esp8266-01')
    status = data.get('status', '')
    sensor_value = data.get('sensor_value', 0)
    
    if status == 'smoke_detected':
        # Insert smoke alert record
        db.session.execute(
            text("""
                INSERT INTO smoke_alerts (device_id, sensor_value, threshold_value, status, detected_at)
                VALUES (:device_id, :sensor_value, :threshold, 'active', NOW())
            """),
            {'device_id': device_id, 'sensor_value': sensor_value, 'threshold': 170}
        )
        db.session.commit()
        
        # Notify all admins
        title = "Smoke Detected!"
        message = f"Smoke detected by device '{device_id}'. Sensor reading: {sensor_value}. Immediate attention required."
        
        db.session.execute(
            text("INSERT INTO notifications (type, title, message) VALUES ('smoke_alert', :title, :message)"),
            {'title': title, 'message': message}
        )
        notification_id = db.session.execute(text("SELECT LAST_INSERT_ID()")).first()[0]
        
        db.session.execute(
            text("INSERT INTO admin_notifications (admin_id, notification_id) SELECT admin_id, :nid FROM admins WHERE is_active = TRUE"),
            {'nid': notification_id}
        )
        db.session.commit()
        
        # WebSocket alert to all connected admins
        from ..api.socket_events import notify_admins_socket
        notify_admins_socket({
            'notification_id': notification_id,
            'type': 'smoke_alert',
            'title': title,
            'message': message,
            'is_read': False
        })
        
        return jsonify({'message': 'Alert received', 'alert_id': notification_id}), 201
    
    return jsonify({'message': 'Status received'}), 200


@admin_bp.route('/smoke-alerts', methods=['GET'])
@jwt_required()
@require_admin
def get_smoke_alerts():
    """Get smoke alert history"""
    admin_id = int(get_jwt_identity())
    
    result = db.session.execute(
        text("""
            SELECT * FROM smoke_alerts 
            ORDER BY detected_at DESC 
            LIMIT 50
        """)
    )
    alerts = [dict(row._mapping) for row in result]
    return jsonify(alerts), 200


@admin_bp.route('/smoke-alerts/<int:alert_id>/resolve', methods=['POST'])
@jwt_required()
@require_admin
def resolve_smoke_alert(alert_id):
    """Mark a smoke alert as resolved"""
    admin_id = int(get_jwt_identity())
    data = request.get_json()
    
    db.session.execute(
        text("""
            UPDATE smoke_alerts 
            SET status = 'resolved', resolved_by = :aid, resolved_at = NOW(), 
                resolution_note = :note
            WHERE alert_id = :alert_id
        """),
        {'aid': admin_id, 'note': data.get('note', 'Resolved by admin'), 'alert_id': alert_id}
    )
    db.session.commit()
    
    return jsonify({'message': 'Alert resolved'}), 200