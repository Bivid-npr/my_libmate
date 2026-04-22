from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import check_password_hash, generate_password_hash
from dotenv import load_dotenv
import os
import pymysql

load_dotenv()

# Initialize Flask app
app = Flask(__name__)

# Configuration
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'libmate-secret-key')
app.config['CORS_ORIGINS'] = os.getenv('CORS_ORIGINS', 'http://localhost:5173,http://localhost:3000').split(',')

# Database configuration
app.config['DB_HOST'] = os.getenv('DB_HOST', '127.0.0.1')
app.config['DB_PORT'] = int(os.getenv('DB_PORT', 3306))
app.config['DB_USER'] = os.getenv('DB_USER', 'root')
app.config['DB_PASSWORD'] = os.getenv('DB_PASSWORD', '')
app.config['DB_NAME'] = os.getenv('DB_NAME', 'libmate')

# Initialize extensions
CORS(app, origins=app.config['CORS_ORIGINS'])
jwt = JWTManager(app)


# Database connection helper
def get_db_connection():
    return pymysql.connect(
        host=app.config['DB_HOST'],
        port=app.config['DB_PORT'],
        user=app.config['DB_USER'],
        password=app.config['DB_PASSWORD'],
        database=app.config['DB_NAME'],
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor
    )


# ============================================================
# HEALTH CHECK
# ============================================================
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'message': 'Smart Library API is running!'}), 200


# ============================================================
# BOOKS ENDPOINTS
# ============================================================
@app.route('/api/books', methods=['GET'])
def get_books():
    """Get all books from catalogue view"""
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM vw_book_catalogue ORDER BY book_id")
            books = cursor.fetchall()
        return jsonify({'books': books, 'total': len(books)}), 200
    finally:
        conn.close()


@app.route('/api/books/<int:book_id>', methods=['GET'])
def get_book(book_id):
    """Get single book with reviews"""
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            # Get book details
            cursor.execute("SELECT * FROM vw_book_catalogue WHERE book_id = %s", (book_id,))
            book = cursor.fetchone()
            
            if not book:
                return jsonify({'error': 'Book not found'}), 404
            
            # Get reviews for this book
            cursor.execute("""
                SELECT r.*, u.full_name 
                FROM reviews r
                JOIN users u ON r.user_id = u.user_id
                WHERE r.book_id = %s 
                ORDER BY r.created_at DESC
            """, (book_id,))
            reviews = cursor.fetchall()
        
        return jsonify({'book': book, 'reviews': reviews}), 200
    finally:
        conn.close()


# ============================================================
# TRENDING BOOKS ENDPOINT
# ============================================================
@app.route('/api/trending', methods=['GET'])
def get_trending():
    """Get trending books"""
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM vw_trending_books ORDER BY trend_rank")
            trending = cursor.fetchall()
        return jsonify(trending), 200
    finally:
        conn.close()


# ============================================================
# AUTH ENDPOINTS
# ============================================================
@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({'error': 'Email and password required'}), 400
    
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
            user = cursor.fetchone()
            
            if not user:
                return jsonify({'error': 'Invalid credentials'}), 401
            
            # For mock data, passwords are stored as plain text like 'hash_1', 'hash_2', etc.
            # In production, use check_password_hash(user['password_hash'], password)
            if user['password_hash'] != password:
                return jsonify({'error': 'Invalid credentials'}), 401
            
            # Check active membership
            cursor.execute("""
                SELECT * FROM memberships 
                WHERE user_id = %s AND status = 'active' AND expiry_date > CURDATE()
            """, (user['user_id'],))
            membership = cursor.fetchone()
            
            access_token = create_access_token(identity=str(user['user_id']))
            
            user_data = {
                'user_id': user['user_id'],
                'full_name': user['full_name'],
                'email': user['email'],
                'phone': user['phone'],
                'address': user['address'],
                'role': user['role'],
                'profile_picture': user['profile_picture']
            }
            
            return jsonify({
                'token': access_token,
                'user': user_data,
                'has_active_membership': membership is not None,
                'membership': {
                    'card_number': membership['card_number'] if membership else None,
                    'expiry_date': str(membership['expiry_date']) if membership else None
                } if membership else None
            }), 200
    finally:
        conn.close()


@app.route('/api/auth/me', methods=['GET'])
@jwt_required()
def get_current_user():
    user_id = int(get_jwt_identity())
    
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM users WHERE user_id = %s", (user_id,))
            user = cursor.fetchone()
            
            if not user:
                return jsonify({'error': 'User not found'}), 404
            
            user_data = {
                'user_id': user['user_id'],
                'full_name': user['full_name'],
                'email': user['email'],
                'phone': user['phone'],
                'address': user['address'],
                'role': user['role'],
                'profile_picture': user['profile_picture']
            }
            
            return jsonify({'user': user_data}), 200
    finally:
        conn.close()


# ============================================================
# USER BORROWINGS ENDPOINTS
# ============================================================
@app.route('/api/users/me/borrowings', methods=['GET'])
@jwt_required()
def get_my_borrowings():
    user_id = int(get_jwt_identity())
    
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM vw_active_borrowings WHERE user_id = %s", (user_id,))
            borrowings = cursor.fetchall()
        return jsonify(borrowings), 200
    finally:
        conn.close()


@app.route('/api/users/me/history', methods=['GET'])
@jwt_required()
def get_my_history():
    user_id = int(get_jwt_identity())
    
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM vw_borrow_history WHERE user_id = %s ORDER BY returned_at DESC", (user_id,))
            history = cursor.fetchall()
        return jsonify(history), 200
    finally:
        conn.close()


@app.route('/api/users/me/wishlist', methods=['GET'])
@jwt_required()
def get_my_wishlist():
    user_id = int(get_jwt_identity())
    
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT b.*, w.added_at 
                FROM wishlist w
                JOIN vw_book_catalogue b ON w.book_id = b.book_id
                WHERE w.user_id = %s
                ORDER BY w.added_at DESC
            """, (user_id,))
            wishlist = cursor.fetchall()
        return jsonify(wishlist), 200
    finally:
        conn.close()


@app.route('/api/users/me/wishlist/<int:book_id>', methods=['POST'])
@jwt_required()
def add_to_wishlist(book_id):
    user_id = int(get_jwt_identity())
    
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            # Check if already in wishlist
            cursor.execute(
                "SELECT wishlist_id FROM wishlist WHERE user_id = %s AND book_id = %s",
                (user_id, book_id)
            )
            existing = cursor.fetchone()
            
            if existing:
                return jsonify({'error': 'Book already in wishlist'}), 409
            
            # Add to wishlist
            cursor.execute(
                "INSERT INTO wishlist (user_id, book_id) VALUES (%s, %s)",
                (user_id, book_id)
            )
            conn.commit()
        
        return jsonify({'message': 'Added to wishlist'}), 201
    finally:
        conn.close()


@app.route('/api/users/me/wishlist/<int:book_id>', methods=['DELETE'])
@jwt_required()
def remove_from_wishlist(book_id):
    user_id = int(get_jwt_identity())
    
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "DELETE FROM wishlist WHERE user_id = %s AND book_id = %s",
                (user_id, book_id)
            )
            conn.commit()
        
        return jsonify({'message': 'Removed from wishlist'}), 200
    finally:
        conn.close()


# ============================================================
# REVIEWS ENDPOINT
# ============================================================
@app.route('/api/books/<int:book_id>/reviews', methods=['POST'])
@jwt_required()
def add_review(book_id):
    user_id = int(get_jwt_identity())
    data = request.get_json()
    rating = data.get('rating')
    review_text = data.get('review_text')
    
    if not rating or rating < 1 or rating > 5:
        return jsonify({'error': 'Rating must be between 1 and 5'}), 400
    
    if not review_text or not review_text.strip():
        return jsonify({'error': 'Review text is required'}), 400
    
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            # Check if book exists
            cursor.execute("SELECT book_id FROM books WHERE book_id = %s", (book_id,))
            if not cursor.fetchone():
                return jsonify({'error': 'Book not found'}), 404
            
            # Check if already reviewed
            cursor.execute(
                "SELECT review_id FROM reviews WHERE user_id = %s AND book_id = %s",
                (user_id, book_id)
            )
            if cursor.fetchone():
                return jsonify({'error': 'You have already reviewed this book'}), 409
            
            # Insert review
            cursor.execute("""
                INSERT INTO reviews (user_id, book_id, rating, review_text)
                VALUES (%s, %s, %s, %s)
            """, (user_id, book_id, rating, review_text))
            conn.commit()
        
        return jsonify({'message': 'Review added successfully'}), 201
    finally:
        conn.close()


# ============================================================
# RUN SERVER
# ============================================================
if __name__ == '__main__':
    print("""
    ╔═══════════════════════════════════════════════════════════╗
    ║                                                           ║
    ║   📚 Smart Library Management System - Backend API        ║
    ║                                                           ║
    ║   Server running on: http://localhost:5000                ║
    ║   API Base URL:      http://localhost:5000/api            ║
    ║                                                           ║
    ║   Available endpoints:                                    ║
    ║   - GET  /api/books                                       ║
    ║   - GET  /api/books/:id                                   ║
    ║   - GET  /api/trending                                    ║
    ║   - POST /api/auth/login                                  ║
    ║   - GET  /api/auth/me                                     ║
    ║   - GET  /api/users/me/borrowings                         ║
    ║   - GET  /api/users/me/history                            ║
    ║   - GET  /api/users/me/wishlist                           ║
    ║   - POST /api/books/:id/reviews                           ║
    ║                                                           ║
    ╚═══════════════════════════════════════════════════════════╝
    """)
    app.run(host='0.0.0.0', port=5000, debug=True)