from flask import request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from flask import Blueprint
from app.extensions import db
from app.models import Book, Borrowing
import requests
import json
import os

ai_chat_bp = Blueprint('ai_chat', __name__)

@ai_chat_bp.route('/search', methods=['POST'])
@jwt_required()
def ai_search():
    data = request.get_json()
    query = data.get('query', '').strip()
    if not query:
        return jsonify({'error': 'Query is required'}), 400

    user_id = get_jwt_identity()
    
    # 1. Get user's borrowing history for personalization
    borrowed_books = db.session.query(Borrowing.book_id).filter_by(user_id=user_id).all()
    book_ids = [b[0] for b in borrowed_books]
    user_genres = []
    user_authors = []
    if book_ids:
        books = Book.query.filter(Book.id.in_(book_ids)).all()
        user_genres = list(set([b.genre for b in books if b.genre]))
        user_authors = list(set([b.author for b in books if b.author]))
    
    # 2. Call OpenRouter (free LLM) to parse query
    system_prompt = """
You are a library search assistant. Convert the user's natural language query into a JSON object with these fields:
- title_keywords: list of words (max 5) from the title if mentioned
- author: specific author name if mentioned, else null
- genre: one of [fiction, mystery, thriller, romance, sci-fi, fantasy, biography, history, self-help, children, other]
- min_year: integer
- max_year: integer
- free_text: important concepts (plot elements, themes, settings) – max 10 words
If a field is not mentioned, set it to null.
Output ONLY valid JSON, no extra text.
"""
    
    # Prepare OpenRouter request
    openrouter_key = current_app.config.get('OPENROUTER_API_KEY')
    openrouter_url = current_app.config.get('OPENROUTER_BASE_URL', 'https://openrouter.ai/api/v1') + '/chat/completions'
    model = current_app.config.get('OPENROUTER_MODEL', 'meta-llama/llama-3-8b-instruct:free')
    
    headers = {
        'Authorization': f'Bearer {openrouter_key}',
        'Content-Type': 'application/json',
        'HTTP-Referer': current_app.config.get('OPENROUTER_SITE_URL', 'http://localhost:5173'),
        'X-Title': current_app.config.get('OPENROUTER_SITE_NAME', 'LibMate')
    }
    
    payload = {
        'model': model,
        'messages': [
            {'role': 'system', 'content': system_prompt},
            {'role': 'user', 'content': query}
        ],
        'temperature': 0.2,
        'max_tokens': 300
    }
    
    try:
        response = requests.post(openrouter_url, headers=headers, json=payload, timeout=15)
        response.raise_for_status()
        result = response.json()
        llm_output = result['choices'][0]['message']['content'].strip()
        # Clean up possible markdown code blocks
        if llm_output.startswith('```json'):
            llm_output = llm_output[7:]
        if llm_output.endswith('```'):
            llm_output = llm_output[:-3]
        parsed = json.loads(llm_output)
    except Exception as e:
        current_app.logger.error(f"OpenRouter error: {e}")
        # Fallback: treat the whole query as free text search
        parsed = {
            'title_keywords': [],
            'author': None,
            'genre': None,
            'min_year': None,
            'max_year': None,
            'free_text': query
        }
    
    # 3. Build SQL query with user preference boosting
    # (same as before, but using SQLAlchemy text)
    # We'll use raw SQL for simplicity, but ensure it's safe
    from sqlalchemy import text
    
    # Base query with relevance score
    sql = """
        SELECT b.*, 
               (CASE WHEN b.genre IN :preferred_genres THEN 1 ELSE 0 END +
                CASE WHEN b.author IN :preferred_authors THEN 1 ELSE 0 END) AS relevance_score
        FROM books b
        WHERE 1=1
    """
    params = {
        'preferred_genres': tuple(user_genres) if user_genres else ('',),
        'preferred_authors': tuple(user_authors) if user_authors else ('',)
    }
    conditions = []
    
    if parsed.get('genre'):
        conditions.append("b.genre = :genre")
        params['genre'] = parsed['genre']
    if parsed.get('author'):
        conditions.append("b.author LIKE :author")
        params['author'] = f"%{parsed['author']}%"
    if parsed.get('min_year'):
        conditions.append("b.publication_year >= :min_year")
        params['min_year'] = parsed['min_year']
    if parsed.get('max_year'):
        conditions.append("b.publication_year <= :max_year")
        params['max_year'] = parsed['max_year']
    
    # Full-text search
    search_text = ' '.join(parsed.get('title_keywords', []) + [parsed.get('free_text', '')])
    if search_text:
        conditions.append("MATCH(b.title, b.description, b.author) AGAINST (:search IN NATURAL LANGUAGE MODE)")
        params['search'] = search_text
    
    if conditions:
        sql += " AND " + " AND ".join(conditions)
    
    sql += " ORDER BY relevance_score DESC, b.id LIMIT 20"
    
    try:
        result = db.session.execute(text(sql), params)
        books = [dict(row._mapping) for row in result]
    except Exception as e:
        current_app.logger.error(f"DB error: {e}")
        books = []
    
    return jsonify({
        'query': query,
        'results': books,
        'personalized': bool(user_genres or user_authors)
    })