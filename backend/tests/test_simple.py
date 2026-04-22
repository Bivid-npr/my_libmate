# tests/test_simple.py
import pytest

class TestSimple:
    """Simple tests to verify setup"""
    
    def test_database_connection(self, client):
        """Test database connection"""
        from app.extensions import db
        from sqlalchemy import text
        
        with client.application.app_context():
            result = db.session.execute(text("SELECT DATABASE()")).first()
            assert result[0] == 'libmate_test'
            print(f"\n✓ Using database: {result[0]}")
    
    def test_users_exist(self, client):
        """Test that users exist in test database"""
        from app.extensions import db
        from sqlalchemy import text
        
        with client.application.app_context():
            result = db.session.execute(text("SELECT COUNT(*) FROM users")).first()
            print(f"\n✓ Found {result[0]} users in test database")
            assert result[0] > 0
    
    def test_books_exist(self, client):
        """Test that books exist in test database"""
        from app.extensions import db
        from sqlalchemy import text
        
        with client.application.app_context():
            result = db.session.execute(text("SELECT COUNT(*) FROM books")).first()
            print(f"\n✓ Found {result[0]} books in test database")
            assert result[0] > 0
    
    def test_register_endpoint(self, client):
        """Test the register endpoint works"""
        response = client.post('/api/auth/register', json={
            'full_name': 'Quick Test',
            'email': 'quick@test.com',
            'password': 'quick123'
        })
        
        # Should either succeed or say user exists
        assert response.status_code in [201, 409]
        print(f"\n✓ Register endpoint responded with {response.status_code}")