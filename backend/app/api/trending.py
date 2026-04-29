# app/api/trending.py
from flask import Blueprint, jsonify, request
from sqlalchemy import text
from ..extensions import db

trending_bp = Blueprint('trending', __name__)

@trending_bp.route('', methods=['GET'])
def get_trending():
    """Get trending books from trending_books table"""
    limit = request.args.get('limit', 10, type=int)
    
    query = """
        SELECT 
            b.book_id, b.title, b.author, b.genre, b.cover_image,
            b.available_copies, b.status, b.total_borrow_count,
            COALESCE(ROUND(AVG(r.rating), 1), 0) AS avg_rating,
            COUNT(DISTINCT r.review_id) AS total_reviews
        FROM trending_books t
        JOIN books b ON t.book_id = b.book_id
        LEFT JOIN reviews r ON b.book_id = r.book_id
        WHERE b.is_archived = FALSE
        GROUP BY b.book_id, t.trend_rank
        ORDER BY t.trend_rank ASC
        LIMIT :limit
    """
    
    result = db.session.execute(text(query), {'limit': limit})
    trending = [dict(row._mapping) for row in result]
    
    # Fallback: if trending is empty (no data yet), show popular books
    if not trending:
        fallback = db.session.execute(
            text("""
                SELECT b.book_id, b.title, b.author, b.genre, b.cover_image,
                       b.available_copies, b.status, b.total_borrow_count,
                       COALESCE(ROUND(AVG(r.rating), 1), 0) AS avg_rating,
                       COUNT(DISTINCT r.review_id) AS total_reviews
                FROM books b
                LEFT JOIN reviews r ON b.book_id = r.book_id
                WHERE b.is_archived = FALSE
                GROUP BY b.book_id
                ORDER BY b.total_borrow_count DESC
                LIMIT :limit
            """),
            {'limit': limit}
        )
        trending = [dict(row._mapping) for row in fallback]
    
    return jsonify(trending), 200


@trending_bp.route('/all', methods=['GET'])
def get_all_trending_books():
    """Get ALL books that have ever appeared in trending_books (paginated) - for Trending Page"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    
    count_query = """
        SELECT COUNT(DISTINCT t.book_id) as total
        FROM trending_books t
    """
    count_result = db.session.execute(text(count_query)).first()
    total = count_result[0] if count_result else 0
    
    offset = (page - 1) * per_page
    query = """
        SELECT DISTINCT
            b.book_id,
            b.title,
            b.author,
            b.genre,
            b.cover_image,
            b.available_copies,
            b.status,
            b.total_borrow_count,
            COALESCE(ROUND(AVG(r.rating), 1), 0) AS avg_rating,
            COUNT(DISTINCT r.review_id) AS total_reviews
        FROM trending_books t
        JOIN books b ON t.book_id = b.book_id
        LEFT JOIN reviews r ON b.book_id = r.book_id
        WHERE b.is_archived = FALSE
        GROUP BY b.book_id
        ORDER BY b.total_borrow_count DESC
        LIMIT :limit OFFSET :offset
    """
    
    result = db.session.execute(
        text(query),
        {'limit': per_page, 'offset': offset}
    )
    books = [dict(row._mapping) for row in result]
    
    return jsonify({
        'books': books,
        'total': total,
        'page': page,
        'per_page': per_page,
        'total_pages': (total + per_page - 1) // per_page if total > 0 else 0
    }), 200


@trending_bp.route('/top', methods=['GET'])
def get_top_trending():
    """Get top 10 trending books for This Month or Last Month"""
    period = request.args.get('period', 'this_month')
    
    if period == 'last_month':
        date_condition = """
            period_start = DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 1 MONTH), '%Y-%m-01')
            AND period_end = LAST_DAY(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))
        """
    else:
        date_condition = """
            period_start = DATE_FORMAT(CURDATE(), '%Y-%m-01')
            AND period_end = LAST_DAY(CURDATE())
        """
    
    query = f"""
        SELECT 
            t.trend_rank,
            t.book_id,
            b.title,
            b.author,
            b.genre,
            b.cover_image,
            b.available_copies,
            b.status,
            t.borrow_count,
            COALESCE(ROUND(AVG(r.rating), 1), 0) AS avg_rating,
            COUNT(DISTINCT r.review_id) AS total_reviews
        FROM trending_books t
        JOIN books b ON t.book_id = b.book_id
        LEFT JOIN reviews r ON b.book_id = r.book_id
        WHERE {date_condition}
        GROUP BY t.trend_rank, t.book_id, b.title, b.author, b.genre, 
                 b.cover_image, b.available_copies, b.status, t.borrow_count
        ORDER BY t.trend_rank ASC
        LIMIT 10
    """
    
    result = db.session.execute(text(query))
    trending = [dict(row._mapping) for row in result]
    
    return jsonify(trending), 200


@trending_bp.route('/stats', methods=['GET'])
def get_trending_stats():
    """Get trending statistics"""
    total_trending_query = "SELECT COUNT(DISTINCT book_id) as count FROM trending_books"
    this_month_query = """
        SELECT COUNT(DISTINCT book_id) as count, SUM(borrow_count) as total_borrows
        FROM trending_books
        WHERE period_start = DATE_FORMAT(CURDATE(), '%Y-%m-01')
        AND period_end = LAST_DAY(CURDATE())
    """
    last_month_query = """
        SELECT COUNT(DISTINCT book_id) as count, SUM(borrow_count) as total_borrows
        FROM trending_books
        WHERE period_start = DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 1 MONTH), '%Y-%m-01')
        AND period_end = LAST_DAY(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))
    """
    
    total_result = db.session.execute(text(total_trending_query)).first()
    this_month_result = db.session.execute(text(this_month_query)).first()
    last_month_result = db.session.execute(text(last_month_query)).first()
    
    return jsonify({
        'total_trending_books': total_result[0] if total_result else 0,
        'this_month': {
            'books_count': this_month_result[0] if this_month_result else 0,
            'total_borrows': this_month_result[1] if this_month_result else 0
        },
        'last_month': {
            'books_count': last_month_result[0] if last_month_result else 0,
            'total_borrows': last_month_result[1] if last_month_result else 0
        }
    }), 200