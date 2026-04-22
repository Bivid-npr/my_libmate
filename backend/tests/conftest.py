# tests/conftest.py
import pytest
import bcrypt
import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Force load .env before anything else
from dotenv import load_dotenv
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
load_dotenv(dotenv_path=env_path, override=True)

# Manually set database for testing
os.environ['DB_NAME'] = 'libmate_test'

# Import after env is set
from app import create_app
from app.extensions import db
from sqlalchemy import text

print("\n" + "="*60)
print("TEST CONFIGURATION")
print("="*60)
print(f"DB_NAME: {os.environ.get('DB_NAME', 'NOT SET')}")
print(f"DB_USER: {os.environ.get('DB_USER', 'NOT SET')}")
print(f"DB_PASSWORD: {'*' * len(os.environ.get('DB_PASSWORD', '')) if os.environ.get('DB_PASSWORD') else 'NOT SET'}")
print(f"DB_HOST: {os.environ.get('DB_HOST', 'NOT SET')}")
print("="*60 + "\n")

@pytest.fixture(scope='session')
def app():
    """Create application for testing"""
    app = create_app()
    
    # Test the connection
    with app.app_context():
        try:
            result = db.session.execute(text("SELECT DATABASE()")).first()
            current_db = result[0] if result else 'unknown'
            print(f"✓ Connected to: {current_db}")
            assert current_db == 'libmate_test', f"Wrong database: {current_db}"
        except Exception as e:
            print(f"✗ Connection failed: {e}")
            raise
    
    yield app

@pytest.fixture(scope='function')
def client(app):
    """Create test client"""
    return app.test_client()

@pytest.fixture(scope='function')
def db_session(app):
    """Get database session for testing"""
    with app.app_context():
        yield db.session
        db.session.rollback()

@pytest.fixture(scope='function')
def test_user(client, db_session):
    """Create a test user with proper bcrypt hash"""
    password = 'testpass123'
    password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    
    # Check if user already exists
    existing = db_session.execute(
        text("SELECT user_id FROM users WHERE email = 'test@testuser.com'")
    ).first()
    
    if not existing:
        db_session.execute(
            text("""
                INSERT INTO users (full_name, email, phone, password_hash, address, role, is_active)
                VALUES ('Test User', 'test@testuser.com', '1234567890', :password_hash, '123 Test St', 'guest', TRUE)
            """),
            {'password_hash': password_hash.decode('utf-8')}
        )
        db_session.commit()
    
    # Login to get token
    response = client.post('/api/auth/login', json={
        'email': 'test@testuser.com',
        'password': password
    })
    
    token = response.json['token'] if response.status_code == 200 else None
    
    if not token:
        print(f"⚠️  Login failed: {response.status_code} - {response.data}")
    
    user = db_session.execute(
        text("SELECT * FROM users WHERE email = 'test@testuser.com'")
    ).first()
    
    yield {
        'user_id': user[0] if user else None,
        'email': 'test@testuser.com',
        'password': password,
        'token': token
    }
    
    # Cleanup
    db_session.execute(text("DELETE FROM users WHERE email = 'test@testuser.com'"))
    db_session.commit()

@pytest.fixture(scope='function')
def auth_headers(test_user):
    """Get authentication headers"""
    if test_user['token']:
        return {'Authorization': f'Bearer {test_user["token"]}'}
    return {}

# Add this to tests/conftest.py (right after the other fixtures)

@pytest.fixture(scope='function')
def test_member_user(client, db_session):
    """Create a test user with active membership"""
    from datetime import datetime, timedelta
    import bcrypt
    
    # Hash password
    password = 'memberpass123'
    password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    
    # Check if user exists
    existing = db_session.execute(
        text("SELECT user_id FROM users WHERE email = 'member@testuser.com'")
    ).first()
    
    if not existing:
        # Insert test user
        db_session.execute(
            text("""
                INSERT INTO users (full_name, email, phone, password_hash, address, role, is_active)
                VALUES ('Member User', 'member@testuser.com', '9876543210', :password_hash, '456 Member Ave', 'member', TRUE)
            """),
            {'password_hash': password_hash.decode('utf-8')}
        )
        db_session.commit()
    
    # Get the user
    user = db_session.execute(
        text("SELECT * FROM users WHERE email = 'member@testuser.com'")
    ).first()
    user_id = user[0]
    
    # Check if membership exists
    membership = db_session.execute(
        text("SELECT membership_id FROM memberships WHERE user_id = :user_id AND status = 'active'"),
        {'user_id': user_id}
    ).first()
    
    if not membership:
        # Create membership
        start_date = datetime.now().date()
        expiry_date = start_date + timedelta(days=365)
        
        db_session.execute(
            text("""
                INSERT INTO memberships (user_id, duration_months, start_date, expiry_date, status, payment_status, card_number)
                VALUES (:user_id, 12, :start_date, :expiry_date, 'active', 'paid', 'TEST-12345')
            """),
            {'user_id': user_id, 'start_date': start_date, 'expiry_date': expiry_date}
        )
        db_session.commit()
    
    # Login to get token
    response = client.post('/api/auth/login', json={
        'email': 'member@testuser.com',
        'password': password
    })
    
    token = response.json['token'] if response.status_code == 200 else None
    
    yield {
        'user_id': user_id,
        'email': 'member@testuser.com',
        'password': password,
        'token': token
    }
    
    # Cleanup after test
    db_session.execute(text("DELETE FROM memberships WHERE user_id = :user_id"), {'user_id': user_id})
    db_session.execute(text("DELETE FROM users WHERE email = 'member@testuser.com'"))
    db_session.commit()