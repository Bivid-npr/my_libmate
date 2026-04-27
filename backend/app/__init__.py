from flask import Flask, jsonify, send_from_directory, request
from flask_cors import CORS
from flask_jwt_extended import JWTManager, decode_token
from flask_socketio import SocketIO, join_room
from dotenv import load_dotenv
import os
import bcrypt
from datetime import timedelta
from sqlalchemy import text

from .extensions import db
from .config import Config

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

socketio = SocketIO(cors_allowed_origins="*")


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    db.init_app(app)
    CORS(app, origins=app.config['CORS_ORIGINS'], supports_credentials=True)
    socketio.init_app(app, cors_allowed_origins="*")

    from .services.email_service import init_mail
    init_mail(app)

    app.config["JWT_SECRET_KEY"] = app.config['JWT_SECRET_KEY']
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(days=1)
    JWTManager(app)

    from .api.auth import auth_bp
    from .api.books import books_bp
    from .api.users import users_bp
    from .api.borrowings import borrowings_bp
    from .api.trending import trending_bp
    from .api.new_arrivals import new_arrivals_bp
    from .api.recommendations import recommendations_bp
    from .api.admin import admin_bp
    from .api.membership import membership_bp

    for bp, prefix in [
        (auth_bp, '/api/auth'), (books_bp, '/api/books'), (users_bp, '/api/users'),
        (borrowings_bp, '/api/borrowings'), (trending_bp, '/api/trending'),
        (new_arrivals_bp, '/api/new-arrivals'), (recommendations_bp, '/api/recommendations'),
        (admin_bp, '/api/admin'), (membership_bp, '/api/membership'),
    ]:
        app.register_blueprint(bp, url_prefix=prefix)

    @socketio.on('connect')
    def handle_connect():
        token = request.args.get('token')
        if token:
            try:
                decoded = decode_token(token)
                claims = decoded.get('additional_claims', {}) or {}
                room = 'admin_room' if claims.get('type') == 'admin' else f"user_{decoded.get('sub', '')}"
                join_room(room)
            except Exception:
                join_room('guest_room')
        else:
            join_room('guest_room')

    @app.route('/uploads/<path:filename>')
    def serve_upload(filename):
        return send_from_directory(os.path.join(os.path.dirname(__file__), 'uploads'), filename)

    @app.route('/uploads/photos/<path:filename>')
    def serve_photo(filename):
        folder = os.path.join(os.path.dirname(__file__), 'uploads', 'photos')
        os.makedirs(folder, exist_ok=True)
        return send_from_directory(folder, filename)

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'error': 'Resource not found'}), 404

    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        return jsonify({'error': 'Internal server error'}), 500

    base = os.path.dirname(os.path.abspath(__file__))
    for folder in ['uploads/photos', 'uploads/receipts']:
        os.makedirs(os.path.join(base, folder), exist_ok=True)

    _admin_seeded = False

    @app.before_request
    def seed_default_admin():
        nonlocal _admin_seeded
        if _admin_seeded or request.path.startswith('/socket.io'):
            return
        _admin_seeded = True

        try:
            count = db.session.execute(text("SELECT COUNT(*) FROM admins")).first()[0]
            if count == 0:
                email = os.getenv('DEFAULT_ADMIN_EMAIL', 'admin@libmate.com')
                password = os.getenv('DEFAULT_ADMIN_PASSWORD', 'admin123')
                hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

                db.session.execute(
                    text("INSERT INTO admins (full_name, email, phone, password_hash, is_active) VALUES (:name, :email, :phone, :hash, TRUE)"),
                    {'name': 'Super Admin', 'email': email, 'phone': '', 'hash': hashed}
                )
                db.session.commit()
                print(f"[OK] Default admin created: {email}")
        except Exception as e:
            print(f"[INFO] Admin seed skipped: {e}")

    return app