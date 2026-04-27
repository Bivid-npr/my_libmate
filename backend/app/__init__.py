from flask import Flask, jsonify, send_from_directory, request
from flask_cors import CORS
from flask_jwt_extended import JWTManager, decode_token
from flask_socketio import SocketIO, join_room, leave_room
from dotenv import load_dotenv
import os
from datetime import timedelta
import schedule
import threading
import time

from .extensions import db
from .config import Config

load_dotenv()

# Create SocketIO instance
socketio = SocketIO(cors_allowed_origins="*")

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # Initialize extensions
    db.init_app(app)
    CORS(app, origins=app.config['CORS_ORIGINS'], supports_credentials=True)
    socketio.init_app(app, cors_allowed_origins="*")
    
    # JWT Configuration
    app.config["JWT_SECRET_KEY"] = app.config['JWT_SECRET_KEY']
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(days=1)
    jwt = JWTManager(app)
    
    # Register blueprints
    from .api.auth import auth_bp
    from .api.books import books_bp
    from .api.users import users_bp
    from .api.borrowings import borrowings_bp
    from .api.trending import trending_bp
    from .api.new_arrivals import new_arrivals_bp
    from .api.recommendations import recommendations_bp
    from .api.admin import admin_bp
    from .api.membership import membership_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(books_bp, url_prefix='/api/books')
    app.register_blueprint(users_bp, url_prefix='/api/users')
    app.register_blueprint(borrowings_bp, url_prefix='/api/borrowings')
    app.register_blueprint(trending_bp, url_prefix='/api/trending')
    app.register_blueprint(new_arrivals_bp, url_prefix='/api/new-arrivals')
    app.register_blueprint(recommendations_bp, url_prefix='/api/recommendations')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(membership_bp, url_prefix='/api/membership')
    
    # SocketIO Events
    @socketio.on('connect')
    def handle_connect():
        """Handle client connection - join appropriate room based on token"""
        token = request.args.get('token')
        if token:
            try:
                decoded = decode_token(token)
                claims = decoded.get('additional_claims', {}) if hasattr(decoded, 'get') else {}
                identity = decoded.get('sub', '')
                
                if claims.get('type') == 'admin' or (isinstance(claims, dict) and claims.get('type') == 'admin'):
                    join_room('admin_room')
                    print(f'Admin {identity} connected to socket')
                elif claims.get('type') == 'user' or (isinstance(claims, dict) and claims.get('type') == 'user'):
                    join_room(f'user_{identity}')
                    print(f'User {identity} connected to socket')
            except Exception as e:
                print(f'Token decode failed: {e}')
                join_room('admin_room')  # Fallback
        else:
            # Guest connection - just join a general room
            join_room('guest_room')
            print('Guest connected to socket')
    
    @socketio.on('disconnect')
    def handle_disconnect():
        print('Client disconnected from socket')
    
    # Serve uploaded files
    @app.route('/uploads/<path:filename>')
    def serve_upload(filename):
        uploads_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
        return send_from_directory(uploads_dir, filename)
    
    @app.route('/uploads/photos/<path:filename>')
    def serve_photo(filename):
        photos_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads', 'photos')
        os.makedirs(photos_dir, exist_ok=True)
        return send_from_directory(photos_dir, filename)
    
    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'error': 'Resource not found'}), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        return jsonify({'error': 'Internal server error'}), 500
    
    # Create upload directories if they don't exist
    with app.app_context():
        uploads_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads', 'photos')
        os.makedirs(uploads_dir, exist_ok=True)
        receipts_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads', 'receipts')
        os.makedirs(receipts_dir, exist_ok=True)
    
    # Start background scheduler for periodic tasks
    def run_scheduler():
        while True:
            schedule.run_pending()
            time.sleep(60)
    
    if app.config.get('FLASK_ENV') == 'production':
        from .services.notification_service import NotificationService
        from .services.recommendation_service import RecommendationService
        
        schedule.every().day.at("00:00").do(NotificationService.send_due_date_reminders)
        schedule.every().day.at("00:00").do(NotificationService.send_overdue_notices)
        schedule.every().monday.at("02:00").do(RecommendationService.update_trending_books)
        
        scheduler_thread = threading.Thread(target=run_scheduler, daemon=True)
        scheduler_thread.start()
    
    return app