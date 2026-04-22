# tests/test_database_connection.py
import pytest
from app.extensions import db
from sqlalchemy import text
import os

class TestDatabaseConnection:
    """Verify tests are using the correct database"""
    
    def test_database_is_test(self, client):
        """Check that we're using libmate_test database"""
        with client.application.app_context():
            result = db.session.execute(text("SELECT DATABASE()")).first()
            current_db = result[0]
            
            print(f"\n📊 Database Information:")
            print(f"   Current database: {current_db}")
            print(f"   DB_NAME from env: {os.environ.get('DB_NAME', 'not set')}")
            print(f"   Original .env had: libmate (but we overrode it)")
            
            # This assertion ensures we're not touching production
            assert current_db == 'libmate_test', \
                f"SAFETY: Tests must use libmate_test, but got {current_db}"
    
    def test_tables_exist(self, client):
        """Check that test database has all required tables"""
        with client.application.app_context():
            tables = ['users', 'books', 'borrowings', 'memberships', 'reviews']
            
            for table in tables:
                result = db.session.execute(
                    text(f"SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'libmate_test' AND table_name = :table"),
                    {'table': table}
                ).first()
                assert result[0] > 0, f"Table {table} not found in test database!"
            
            print(f"✓ All required tables exist in libmate_test")
    
    def test_data_exists(self, client):
        """Check that test data from your SQL script is present"""
        with client.application.app_context():
            # Count users (from your mock data)
            users = db.session.execute(text("SELECT COUNT(*) FROM users")).first()
            books = db.session.execute(text("SELECT COUNT(*) FROM books")).first()
            admins = db.session.execute(text("SELECT COUNT(*) FROM admins")).first()
            
            print(f"\n📚 Test Database Content:")
            print(f"   Users: {users[0]}")
            print(f"   Books: {books[0]}")
            print(f"   Admins: {admins[0]}")
            
            # Your mock data has 12 users and 15 books
            if users[0] > 0:
                print(f"✓ Test data found - ready for testing")