# app/api/recommendations.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import text
from ..extensions import db
from ..utils.auth_utils import require_user

recommendations_bp = Blueprint('recommendations', __name__)


@recommendations_bp.route('', methods=['GET'])
@jwt_required()
@require_user
def get_recommendations():
    """Get personalized book recommendations for logged-in user"""
    user_id = int(get_jwt_identity())
    limit = request.args.get('limit', 10, type=int)
    
    # Try to get stored recommendations
    result = db.session.execute(
        text("""
            SELECT * FROM vw_recommendations
            WHERE user_id = :user_id
            ORDER BY similarity_score DESC
            LIMIT :limit
        """),
        {'user_id': user_id, 'limit': limit}
    )
    recommendations = [dict(row._mapping) for row in result]
    
    # If no recommendations, generate them now using AI
    if not recommendations:
        from ..services.recommendation_service import RecommendationService
        RecommendationService.generate_recommendations_for_user(user_id, limit)
        
        # Fetch again after generation
        result = db.session.execute(
            text("""
                SELECT * FROM vw_recommendations
                WHERE user_id = :user_id
                ORDER BY similarity_score DESC
                LIMIT :limit
            """),
            {'user_id': user_id, 'limit': limit}
        )
        recommendations = [dict(row._mapping) for row in result]
    
    # If still empty, fall back to trending
    if not recommendations:
        fallback = db.session.execute(
            text("""
                SELECT * FROM vw_trending_books 
                WHERE available_copies > 0
                LIMIT :limit
            """),
            {'limit': limit}
        )
        recommendations = [dict(row._mapping) for row in fallback]
    
    return jsonify(recommendations), 200


@recommendations_bp.route('/refresh', methods=['POST'])
@jwt_required()
@require_user
def refresh_recommendations():
    """Trigger recommendation engine refresh for current user"""
    user_id = int(get_jwt_identity())
    
    # Get user's reading history
    history = db.session.execute(
        text("""
            SELECT book_id, genre FROM borrow_history bh
            JOIN books b ON bh.book_id = b.book_id
            WHERE bh.user_id = :user_id
            ORDER BY bh.returned_at DESC
            LIMIT 20
        """),
        {'user_id': user_id}
    ).fetchall()
    
    if not history:
        return jsonify({'message': 'Not enough reading history for recommendations'}), 200
    
    # Simple recommendation logic: find books with same genres
    genres = list(set([row[1] for row in history if row[1]]))
    
    if genres:
        # Delete old recommendations
        db.session.execute(
            text("DELETE FROM recommendations WHERE user_id = :user_id"),
            {'user_id': user_id}
        )
        
        # Insert new recommendations
        placeholders = ','.join([f':genre_{i}' for i in range(len(genres))])
        params = {'user_id': user_id}
        for i, g in enumerate(genres):
            params[f'genre_{i}'] = g
        
        db.session.execute(
            text(f"""
                INSERT INTO recommendations (user_id, book_id, similarity_score)
                SELECT DISTINCT :user_id, b.book_id, 0.8 as score
                FROM books b
                WHERE b.genre IN ({placeholders})
                AND b.is_archived = FALSE
                AND b.book_id NOT IN (
                    SELECT book_id FROM borrow_history WHERE user_id = :user_id
                )
                LIMIT 20
            """),
            params
        )
        db.session.commit()
    
    return jsonify({
        'message': 'Recommendations refreshed',
        'user_id': user_id
    }), 200


@recommendations_bp.route('/has-recommendations', methods=['GET'])
@jwt_required()
@require_user
def has_recommendations():
    """Check if user has any recommendations"""
    user_id = int(get_jwt_identity())
    
    result = db.session.execute(
        text("SELECT COUNT(*) as count FROM recommendations WHERE user_id = :user_id"),
        {'user_id': user_id}
    ).first()
    
    return jsonify({
        'has_recommendations': result[0] > 0, 
        'count': result[0]
    }), 200