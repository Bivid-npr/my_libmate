# app/api/new_arrivals.py
from flask import Blueprint, request, jsonify
from sqlalchemy import text
from ..extensions import db

new_arrivals_bp = Blueprint('new_arrivals', __name__)


@new_arrivals_bp.route('', methods=['GET'])
def get_new_arrivals():
    """Get recently added books (last 30 days)"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 12, type=int)
    
    # Get paginated new arrivals
    query = """
        SELECT * FROM vw_new_arrivals
        ORDER BY created_at DESC
        LIMIT :limit OFFSET :offset
    """
    
    result = db.session.execute(
        text(query),
        {'limit': per_page, 'offset': (page - 1) * per_page}
    )
    books = [dict(row._mapping) for row in result]
    
    # Get total count
    count_result = db.session.execute(
        text("SELECT COUNT(*) as total FROM vw_new_arrivals")
    ).first()
    total = count_result[0] if count_result else 0
    
    return jsonify({
        'books': books,
        'total': total,
        'page': page,
        'per_page': per_page,
        'total_pages': (total + per_page - 1) // per_page if total > 0 else 0
    }), 200


@new_arrivals_bp.route('/latest', methods=['GET'])
def get_latest_arrivals():
    """Get latest 6 new arrivals for homepage"""
    limit = request.args.get('limit', 6, type=int)
    
    query = """
        SELECT * FROM vw_new_arrivals
        ORDER BY created_at DESC
        LIMIT :limit
    """
    
    result = db.session.execute(text(query), {'limit': limit})
    books = [dict(row._mapping) for row in result]
    
    return jsonify(books), 200


@new_arrivals_bp.route('/count', methods=['GET'])
def get_new_arrivals_count():
    """Get count of new arrivals in last 30 days"""
    result = db.session.execute(
        text("SELECT COUNT(*) as count FROM vw_new_arrivals")
    ).first()
    
    return jsonify({'count': result[0] if result else 0}), 200