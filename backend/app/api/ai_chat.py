from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import text
from app.extensions import db
import json
from groq import Groq

ai_chat_bp = Blueprint('ai_chat', __name__)

# ----------------------------------------------------------------------
# Simple keyword‑based relevance filter (fast, book‑friendly)
# ----------------------------------------------------------------------
def check_relevance(query, history=[]):
    query_lower = query.lower()
    # Always pass if contains obvious book terms
    book_terms = [
        'book', 'read', 'author', 'genre', 'suggest', 'recommend',
        'mystery', 'fantasy', 'sci-fi', 'romance', 'thriller',
        'biography', 'history', 'harry', 'potter', 'novel', 'story',
        'similar', 'like', 'what else', 'enjoyed', 'loved'
    ]
    if any(term in query_lower for term in book_terms):
        return True
    # Short follow‑up (e.g., "tell me more") is allowed if there is history
    if len(query.split()) <= 3 and history:
        return True
    # Block clearly non‑book topics
    off_topic = ['weather', 'sports', 'politics', 'cooking recipe', 'stock market']
    if any(term in query_lower for term in off_topic):
        return False
    # Default: assume relevant
    return True

# ----------------------------------------------------------------------
# Fallback parser (when API fails)
# ----------------------------------------------------------------------
def fallback_parse(query):
    return {
        'title_keywords': [],
        'author': None,
        'genre': None,
        'min_year': None,
        'max_year': None,
        'free_text': query
    }

# ----------------------------------------------------------------------
# Main LLM parsing (Groq) with an improved prompt
# ----------------------------------------------------------------------
def parse_with_llm(query, history=[]):
    api_key = current_app.config.get('GROQ_API_KEY')
    if not api_key:
        return fallback_parse(query), "I'm using simple keyword search."

    client = Groq(api_key=api_key)

    # Build conversation context (last 4 exchanges)
    context = ""
    if history:
        last_messages = history[-8:]  # up to 4 pairs
        context = "Previous conversation:\n"
        for msg in last_messages:
            role = "User" if msg['role'] == 'user' else "Assistant"
            context += f"{role}: {msg['content']}\n"
        context += "\n"

    system_prompt = f"""You are a friendly, knowledgeable librarian at a public library. {context}
Your task: Interpret the user's request and output a JSON object.

The user may ask for:
- Specific filters: genre, author, year range, title keywords.
- Recommendations based on a book they liked (e.g., "I liked Harry Potter, what else?"). In that case, extract the genre or similar keywords from that book.
- A general suggestion (e.g., "suggest a good book"). Then leave all fields empty, and you will give a general response.

Output fields:
- "title_keywords": list of important words from the title (max 5)
- "author": author name if mentioned
- "genre": one of [fiction, mystery, thriller, romance, sci-fi, fantasy, biography, history, self-help, children, other]
- "min_year": integer
- "max_year": integer
- "free_text": important concepts (max 5 words)

Also output a short, warm "response" that tells the user what you understood and what you'll look for. For example:
- "Let me find you some mystery books."
- "I'll search for books similar to Harry Potter."
- "I'll show you the latest sci-fi novels."

Output format: valid JSON like:
{{"response": "your sentence", "parsed": {{...}}}}

If the request is off-topic (e.g., weather, sports), output {{"response": "I only help with book questions.", "parsed": null}}.

Do not add any extra text outside JSON."""

    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": query}
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.3,
            max_tokens=300,
        )
        content = chat_completion.choices[0].message.content
        # Clean markdown
        if content.startswith('```json'):
            content = content[7:]
        if content.endswith('```'):
            content = content[:-3]
        data = json.loads(content)
        friendly_response = data.get('response', "Let me find some books for you.")
        parsed = data.get('parsed')
        if parsed is None:
            # Off‑topic response from LLM
            return None, friendly_response
        # Ensure defaults
        parsed.setdefault('title_keywords', [])
        parsed.setdefault('author', None)
        parsed.setdefault('genre', None)
        parsed.setdefault('min_year', None)
        parsed.setdefault('max_year', None)
        parsed.setdefault('free_text', '')
        return parsed, friendly_response
    except Exception as e:
        print(f"Groq error details: {type(e).__name__}: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"Response status: {e.response.status_code}")
            print(f"Response text: {e.response.text}")
        current_app.logger.error(f"Groq API error: {e}")
        return fallback_parse(query), "I'll use keyword search instead."

# ----------------------------------------------------------------------
# Search books – works with partial filters (genre only, author only, etc.)
# ----------------------------------------------------------------------
def search_books(parsed, user_genres):
    conditions = []
    params = {}

    # Genre
    if parsed.get('genre'):
        conditions.append("LOWER(genre) = LOWER(:genre)")
        params['genre'] = parsed['genre']

    # Author
    if parsed.get('author'):
        conditions.append("LOWER(author) LIKE LOWER(:author)")
        params['author'] = f"%{parsed['author']}%"

    # Year range
    if parsed.get('min_year'):
        conditions.append("published_year >= :min_year")
        params['min_year'] = parsed['min_year']
    if parsed.get('max_year'):
        conditions.append("published_year <= :max_year")
        params['max_year'] = parsed['max_year']

    # ---- SAFE HANDLING FOR title_keywords AND free_text ----
    free_text = parsed.get('free_text') or ''
    if isinstance(free_text, list):
        free_text = ' '.join(str(x) for x in free_text)
    elif not isinstance(free_text, str):
        free_text = str(free_text)

    title_keywords = parsed.get('title_keywords') or []
    if isinstance(title_keywords, list):
        # Flatten nested lists and convert to strings
        flat = []
        for item in title_keywords:
            if isinstance(item, list):
                flat.extend([str(x) for x in item])
            else:
                flat.append(str(item))
        title_keywords = flat
    else:
        title_keywords = [str(title_keywords)] if title_keywords else []

    all_text = ' '.join(title_keywords + [free_text])
    if all_text:
        words = [w for w in all_text.lower().split() if len(w) > 2]
        if words:
            word_conds = []
            for i, w in enumerate(words):
                param = f'kw_{i}'
                word_conds.append(f"(LOWER(title) LIKE :{param} OR LOWER(author) LIKE :{param} OR LOWER(genre) LIKE :{param})")
                params[param] = f'%{w}%'
            conditions.append(f"({' OR '.join(word_conds)})")

    if not conditions:
        return []

    where_clause = " AND ".join(conditions)

    # Personalization order
    if user_genres:
        genre_list = ', '.join([f"'{g}'" for g in user_genres])
        order_by = f"CASE WHEN LOWER(genre) IN ({genre_list}) THEN 1 ELSE 0 END DESC, title"
    else:
        order_by = "title"

    sql = f"""
        SELECT book_id as id, title, author, genre, published_year, 
               available_copies, cover_image
        FROM vw_book_catalogue
        WHERE {where_clause}
        ORDER BY {order_by}
        LIMIT 20
    """

    try:
        result = db.session.execute(text(sql), params)
        books = [dict(row._mapping) for row in result]
        return books
    except Exception as e:
        current_app.logger.error(f"Search SQL error: {e}")
        # Fallback simple keyword search
        fallback_term = free_text or ' '.join(title_keywords) or parsed.get('genre') or ''
        if not fallback_term:
            return []
        fallback_sql = """
            SELECT book_id as id, title, author, genre, published_year,
                   available_copies, cover_image
            FROM vw_book_catalogue
            WHERE LOWER(title) LIKE :search OR LOWER(author) LIKE :search
            ORDER BY title
            LIMIT 20
        """
        result = db.session.execute(text(fallback_sql), {'search': f'%{fallback_term.lower()}%'})
        return [dict(row._mapping) for row in result]   

# ----------------------------------------------------------------------
# Main search endpoint
# ----------------------------------------------------------------------
@ai_chat_bp.route('/search', methods=['POST'])
@jwt_required()
def search():
    data = request.get_json()
    query = data.get('query', '').strip()
    history = data.get('history', [])

    if not query:
        return jsonify({'error': 'Query is required'}), 400

    # 1. Relevance filter (simple)
    if not check_relevance(query, history):
        return jsonify({
            'query': query,
            'results': [],
            'personalized': False,
            'relevance': False,
            'response': "I'm a library assistant – I can only help with book‑related questions. 📚 Ask me about authors, genres, titles, or recommendations!"
        })

    user_id = get_jwt_identity()

    # 2. Get user's borrowed genres (personalization)
    borrowed_genres_sql = """
        SELECT DISTINCT b.genre 
        FROM borrowings br
        JOIN books b ON br.book_id = b.book_id
        WHERE br.user_id = :user_id AND b.genre IS NOT NULL
    """
    genre_result = db.session.execute(text(borrowed_genres_sql), {'user_id': int(user_id)})
    user_genres = [row[0] for row in genre_result]

    # 3. Parse query with Groq
    parsed, friendly_response = parse_with_llm(query, history)

    # If parsed is None, it means the LLM responded as off‑topic
    if parsed is None:
        return jsonify({
            'query': query,
            'results': [],
            'personalized': False,
            'relevance': False,
            'response': friendly_response
        })

    # 4. Search books
    books = search_books(parsed, user_genres)

    # Determine if AI used any filter (for frontend badge)
    used_ai = bool(parsed.get('genre') or parsed.get('author') or parsed.get('min_year') or parsed.get('max_year') or parsed.get('title_keywords'))

    return jsonify({
        'query': query,
        'results': books,
        'personalized': bool(user_genres),
        'relevance': True,
        'response': friendly_response,
        'parsed': parsed,
        'ai_mode': used_ai
    })

# ----------------------------------------------------------------------
# Test endpoint
# ----------------------------------------------------------------------
@ai_chat_bp.route('/test', methods=['GET'])
@jwt_required()
def test():
    return jsonify({"message": "AI Chat backend is alive!", "books": []})