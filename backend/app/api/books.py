from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import text
from ..extensions import db
from ..utils.auth_utils import require_user
from ..services.notification_service import NotificationService


books_bp = Blueprint('books', __name__)


@books_bp.route('', methods=['GET'])
def get_books():
    """Get all books from vw_book_catalogue"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 12, type=int)
    genre = request.args.get('genre')
    language = request.args.get('language')
    search = request.args.get('search')
    search_type = request.args.get('type', 'all')  # ADDED: Search type
    available_only = request.args.get('available_only', 'false').lower() == 'true'
    year_from = request.args.get('year_from', type=int)
    year_to = request.args.get('year_to', type=int)
    sort_by = request.args.get('sort_by', 'title')
    
    query = "SELECT * FROM vw_book_catalogue WHERE 1=1"
    count_query = "SELECT COUNT(*) as total FROM vw_book_catalogue WHERE 1=1"
    params = {}
    count_params = {}
    
    # Handle search with type-specific filtering
    if search:
        if search_type == 'title':
            query += " AND title LIKE :search"
            count_query += " AND title LIKE :search"
        elif search_type == 'author':
            query += " AND author LIKE :search"
            count_query += " AND author LIKE :search"
        elif search_type == 'isbn':
            query += " AND isbn LIKE :search"
            count_query += " AND isbn LIKE :search"
        elif search_type == 'genre':
            query += " AND genre LIKE :search"
            count_query += " AND genre LIKE :search"
        else:  # 'all' - search across multiple fields
            query += " AND (title LIKE :search OR author LIKE :search OR isbn LIKE :search OR genre LIKE :search)"
            count_query += " AND (title LIKE :search OR author LIKE :search OR isbn LIKE :search OR genre LIKE :search)"
        
        params['search'] = f'%{search}%'
        count_params['search'] = f'%{search}%'
    
    # Handle multiple genres (comma-separated) - this is for FILTER sidebar
    if genre:
        genres_list = genre.split(',')
        if len(genres_list) == 1:
            query += " AND genre = :genre"
            count_query += " AND genre = :genre"
            params['genre'] = genres_list[0]
            count_params['genre'] = genres_list[0]
        else:
            genre_conditions = " OR ".join([f"genre = :genre_{i}" for i in range(len(genres_list))])
            query += f" AND ({genre_conditions})"
            count_query += f" AND ({genre_conditions})"
            for i, g in enumerate(genres_list):
                params[f'genre_{i}'] = g
                count_params[f'genre_{i}'] = g
    
    # Handle multiple languages (comma-separated)
    if language:
        languages_list = language.split(',')
        if len(languages_list) == 1:
            query += " AND language = :language"
            count_query += " AND language = :language"
            params['language'] = languages_list[0]
            count_params['language'] = languages_list[0]
        else:
            language_conditions = " OR ".join([f"language = :lang_{i}" for i in range(len(languages_list))])
            query += f" AND ({language_conditions})"
            count_query += f" AND ({language_conditions})"
            for i, lang in enumerate(languages_list):
                params[f'lang_{i}'] = lang
                count_params[f'lang_{i}'] = lang
    
    if available_only:
        query += " AND available_copies > 0"
        count_query += " AND available_copies > 0"
    
    if year_from:
        query += " AND published_year >= :year_from"
        count_query += " AND published_year >= :year_from"
        params['year_from'] = year_from
        count_params['year_from'] = year_from
    
    if year_to:
        query += " AND published_year <= :year_to"
        count_query += " AND published_year <= :year_to"
        params['year_to'] = year_to
        count_params['year_to'] = year_to
    
    # Get total count
    total_result = db.session.execute(text(count_query), count_params).first()
    total = total_result[0] if total_result else 0
    
    # Add sorting and pagination
    allowed_sorts = ['title', 'author', 'published_year', 'avg_rating', 'total_borrow_count']
    if sort_by in allowed_sorts:
        query += f" ORDER BY {sort_by}"
    else:
        query += " ORDER BY title"
    
    query += " LIMIT :limit OFFSET :offset"
    params['limit'] = per_page
    params['offset'] = (page - 1) * per_page
    
    result = db.session.execute(text(query), params)
    books = [dict(row._mapping) for row in result]
    
    return jsonify({
        'books': books,
        'total': total,
        'page': page,
        'per_page': per_page,
        'total_pages': (total + per_page - 1) // per_page if total > 0 else 0
    }), 200


@books_bp.route('/genres', methods=['GET'])
def get_genres():
    """Get all unique genres"""
    result = db.session.execute(
        text("SELECT DISTINCT genre FROM books WHERE genre IS NOT NULL AND is_archived = FALSE ORDER BY genre")
    )
    genres = [row[0] for row in result]
    return jsonify(genres), 200


@books_bp.route('/languages', methods=['GET'])
def get_languages():
    """Get all unique languages"""
    result = db.session.execute(
        text("SELECT DISTINCT language FROM books WHERE language IS NOT NULL AND is_archived = FALSE ORDER BY language")
    )
    languages = [row[0] for row in result]
    return jsonify(languages), 200


@books_bp.route('/<int:book_id>', methods=['GET'])
def get_book(book_id):
    """Get single book with reviews"""
    from flask_jwt_extended import verify_jwt_in_request, get_jwt, get_jwt_identity
    
    # Check if admin is requesting
    is_admin = False
    try:
        verify_jwt_in_request(optional=True)
        claims = get_jwt()
        if claims and claims.get('type') == 'admin':
            is_admin = True
    except Exception as e:
        is_admin = False
    
    # For admins: query books table directly (bypasses the view's is_archived filter)
    # For regular users/guests: use the view which filters archived books
    if is_admin:
        result = db.session.execute(
            text("""
                SELECT 
                    b.book_id, b.title, b.author, b.isbn, b.genre, 
                    b.publisher, b.published_year, b.language,
                    b.total_copies, b.available_copies, b.status,
                    b.total_borrow_count, b.description, b.cover_image,
                    b.is_archived,
                    COALESCE(ROUND(AVG(r.rating), 1), 0) AS avg_rating,
                    COUNT(r.review_id) AS total_reviews
                FROM books b
                LEFT JOIN reviews r ON b.book_id = r.book_id
                WHERE b.book_id = :book_id
                GROUP BY b.book_id, b.title, b.author, b.isbn, b.genre,
                         b.publisher, b.published_year, b.language,
                         b.total_copies, b.available_copies, b.status,
                         b.total_borrow_count, b.description, b.cover_image,
                         b.is_archived
            """),
            {'book_id': book_id}
        ).first()
    else:
        result = db.session.execute(
            text("SELECT * FROM vw_book_catalogue WHERE book_id = :book_id"),
            {'book_id': book_id}
        ).first()
    
    if not result:
        return jsonify({'error': 'Book not found'}), 404
    
    book = dict(result._mapping)
    
    reviews = db.session.execute(
        text("""
            SELECT r.*, u.full_name, u.profile_picture
            FROM reviews r
            JOIN users u ON r.user_id = u.user_id
            WHERE r.book_id = :book_id 
            ORDER BY r.created_at DESC
        """),
        {'book_id': book_id}
    ).fetchall()
    
    in_wishlist = False
    try:
        identity = get_jwt_identity()
        if identity:
            user_id = int(identity)
            wishlist_check = db.session.execute(
                text("SELECT 1 FROM wishlist WHERE user_id = :user_id AND book_id = :book_id"),
                {'user_id': user_id, 'book_id': book_id}
            ).first()
            in_wishlist = wishlist_check is not None
    except:
        pass
    
    return jsonify({
        'book': book,
        'reviews': [dict(r._mapping) for r in reviews],
        'in_wishlist': in_wishlist
    }), 200


@books_bp.route('/<int:book_id>/reviews', methods=['POST'])
@jwt_required()
@require_user
def add_review(book_id):
    """Add a review for a book"""
    data = request.get_json()
    user_id = int(get_jwt_identity())
    rating = data.get('rating')
    review_text = data.get('review_text')
    
    if not rating or rating < 1 or rating > 5:
        return jsonify({'error': 'Rating must be between 1 and 5'}), 400
    
    if not review_text or not review_text.strip():
        return jsonify({'error': 'Review text is required'}), 400
    
    book = db.session.execute(
        text("SELECT book_id FROM books WHERE book_id = :book_id AND is_archived = FALSE"),
        {'book_id': book_id}
    ).first()
    
    if not book:
        return jsonify({'error': 'Book not found'}), 404
    
    existing = db.session.execute(
        text("SELECT review_id FROM reviews WHERE user_id = :user_id AND book_id = :book_id"),
        {'user_id': user_id, 'book_id': book_id}
    ).first()
    
    if existing:
        return jsonify({'error': 'You have already reviewed this book'}), 409
    
    db.session.execute(
        text("""
            INSERT INTO reviews (user_id, book_id, rating, review_text)
            VALUES (:user_id, :book_id, :rating, :review_text)
        """),
        {'user_id': user_id, 'book_id': book_id, 'rating': rating, 'review_text': review_text}
    )
    db.session.commit()
    
    return jsonify({'message': 'Review added successfully'}), 201


@books_bp.route('/<int:book_id>/reviews/<int:review_id>', methods=['PUT'])
@jwt_required()
@require_user
def update_review(book_id, review_id):
    """Update user's own review"""
    user_id = int(get_jwt_identity())
    data = request.get_json()
    
    review = db.session.execute(
        text("""
            SELECT review_id FROM reviews 
            WHERE review_id = :review_id AND user_id = :user_id AND book_id = :book_id
        """),
        {'review_id': review_id, 'user_id': user_id, 'book_id': book_id}
    ).first()
    
    if not review:
        return jsonify({'error': 'Review not found or unauthorized'}), 404
    
    rating = data.get('rating')
    review_text = data.get('review_text')
    
    if rating and (rating < 1 or rating > 5):
        return jsonify({'error': 'Rating must be between 1 and 5'}), 400
    
    updates = []
    params = {'review_id': review_id}
    
    if rating is not None:
        updates.append("rating = :rating")
        params['rating'] = rating
    
    if review_text is not None:
        updates.append("review_text = :review_text")
        params['review_text'] = review_text
    
    if updates:
        updates.append("updated_at = NOW()")
        query = f"UPDATE reviews SET {', '.join(updates)} WHERE review_id = :review_id"
        db.session.execute(text(query), params)
        db.session.commit()
    
    return jsonify({'message': 'Review updated successfully'}), 200


@books_bp.route('/<int:book_id>/reviews/<int:review_id>', methods=['DELETE'])
@jwt_required()
@require_user
def delete_review(book_id, review_id):
    """Delete user's own review"""
    user_id = int(get_jwt_identity())
    
    result = db.session.execute(
        text("""
            DELETE FROM reviews 
            WHERE review_id = :review_id AND user_id = :user_id AND book_id = :book_id
        """),
        {'review_id': review_id, 'user_id': user_id, 'book_id': book_id}
    )
    db.session.commit()
    
    if result.rowcount == 0:
        return jsonify({'error': 'Review not found or unauthorized'}), 404
    
    return jsonify({'message': 'Review deleted successfully'}), 200


@books_bp.route('/search', methods=['GET'])
def search_books():
    """Quick search endpoint for autocomplete"""
    q = request.args.get('q', '')
    search_type = request.args.get('type', 'all')
    
    if len(q) < 2:
        return jsonify([]), 200
    
    # Build search condition based on type
    if search_type == 'title':
        where_clause = "title LIKE :q"
    elif search_type == 'author':
        where_clause = "author LIKE :q"
    elif search_type == 'isbn':
        where_clause = "isbn LIKE :q"
    elif search_type == 'genre':
        where_clause = "genre LIKE :q"
    else:
        where_clause = "(title LIKE :q OR author LIKE :q)"
    
    result = db.session.execute(
        text(f"""
            SELECT book_id, title, author, cover_image
            FROM books
            WHERE {where_clause} AND is_archived = FALSE
            LIMIT 10
        """),
        {'q': f'%{q}%'}
    )
    
    books = [dict(row._mapping) for row in result]
    return jsonify(books), 200

@books_bp.route('/request', methods=['POST'])
@jwt_required()
@require_user
def request_book():
    """Submit a book purchase request"""
    user_id = int(get_jwt_identity())
    data = request.get_json()
    
    title = data.get('title')
    author = data.get('author', '')
    genre = data.get('genre', '')
    reason = data.get('reason', '')
    
    if not title:
        return jsonify({'error': 'Book title is required'}), 400
    
    # Check if book already exists
    existing = db.session.execute(
        text("SELECT book_id FROM books WHERE LOWER(title) = LOWER(:title) AND is_archived = FALSE LIMIT 1"),
        {'title': title.strip()}
    ).first()
    
    if existing:
        return jsonify({'error': 'A similar book already exists in the library'}), 409
    
    # Check if user already requested this
    duplicate = db.session.execute(
        text("SELECT request_id FROM book_requests WHERE user_id = :user_id AND title LIKE :title AND status = 'pending'"),
        {'user_id': user_id, 'title': f'%{title}%'}
    ).first()
    
    if duplicate:
        return jsonify({'error': 'You have already requested this book'}), 409
    
    # Insert request
    db.session.execute(
        text("""
            INSERT INTO book_requests (user_id, title, author, genre, reason, status)
            VALUES (:user_id, :title, :author, :genre, :reason, 'pending')
        """),
        {
            'user_id': user_id,
            'title': title,
            'author': author,
            'genre': genre,
            'reason': reason
        }
    )
    db.session.commit()

    NotificationService.notify_admins_book_request(user_id, title)
    
    return jsonify({'message': 'Book request submitted successfully! The library will review your request.'}), 201


@books_bp.route('/requests', methods=['GET'])
@jwt_required()
@require_user
def get_my_requests():
    """Get current user's book requests"""
    user_id = int(get_jwt_identity())
    
    result = db.session.execute(
        text("""
            SELECT * FROM book_requests 
            WHERE user_id = :user_id 
            ORDER BY created_at DESC
        """),
        {'user_id': user_id}
    )
    requests = [dict(row._mapping) for row in result]
    
    return jsonify(requests), 200