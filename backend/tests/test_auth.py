# tests/test_auth.py
from sqlalchemy import text
import pytest
import json

class TestAuth:
    """Authentication tests"""
    
    def test_register_success(self, client, db_session):
        """Test successful user registration"""
        response = client.post('/api/auth/register', json={
            'full_name': 'New Test User',
            'email': 'newuser@test.com',
            'password': 'password123',
            'phone': '1112223333',
            'address': '789 New Street'
        })
        
        assert response.status_code == 201
        data = json.loads(response.data)
        assert 'token' in data
        assert data['user']['full_name'] == 'New Test User'
        assert data['user']['email'] == 'newuser@test.com'
        assert data['user']['role'] == 'guest'
        
        # Cleanup
        db_session.execute(text("DELETE FROM users WHERE email = 'newuser@test.com'"))
        db_session.commit()
    
    def test_register_duplicate_email(self, client, test_user):
        """Test registration with existing email"""
        response = client.post('/api/auth/register', json={
            'full_name': 'Duplicate User',
            'email': 'test@testuser.com',  # Already exists from fixture
            'password': 'password123'
        })
        
        assert response.status_code == 409
        data = json.loads(response.data)
        assert 'User already exists' in data['error']
    
    def test_register_invalid_email(self, client):
        """Test registration with invalid email format"""
        response = client.post('/api/auth/register', json={
            'full_name': 'Invalid Email User',
            'email': 'not-an-email',
            'password': 'password123'
        })
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'Invalid email format' in data['error']
    
    def test_register_weak_password(self, client):
        """Test registration with weak password"""
        response = client.post('/api/auth/register', json={
            'full_name': 'Weak Password User',
            'email': 'weak@test.com',
            'password': '123',
            'password': '123'
        })
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'Password must be at least 6 characters' in data['error']
    
    def test_register_missing_fields(self, client):
        """Test registration with missing required fields"""
        response = client.post('/api/auth/register', json={
            'email': 'missing@test.com'
        })
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'Email, password, and full name required' in data['error']
    
    def test_login_success(self, client, test_user):
        """Test successful login"""
        response = client.post('/api/auth/login', json={
            'email': 'test@testuser.com',
            'password': 'testpass123'
        })
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'token' in data
        assert data['user']['email'] == 'test@testuser.com'
        assert 'has_active_membership' in data
    
    def test_login_wrong_password(self, client, test_user):
        """Test login with wrong password"""
        response = client.post('/api/auth/login', json={
            'email': 'test@testuser.com',
            'password': 'wrongpassword'
        })
        
        assert response.status_code == 401
        data = json.loads(response.data)
        assert 'Invalid credentials' in data['error']
    
    def test_login_nonexistent_user(self, client):
        """Test login with non-existent user"""
        response = client.post('/api/auth/login', json={
            'email': 'nonexistent@test.com',
            'password': 'password123'
        })
        
        assert response.status_code == 401
        data = json.loads(response.data)
        assert 'Invalid credentials' in data['error']
    
    def test_login_inactive_user(self, client, db_session):
        """Test login with inactive user account"""
        import bcrypt
        
        # Create inactive user
        password_hash = bcrypt.hashpw('inactive123'.encode('utf-8'), bcrypt.gensalt())
        db_session.execute(
            text("""
                INSERT INTO users (full_name, email, password_hash, is_active)
                VALUES ('Inactive User', 'inactive@test.com', :password_hash, FALSE)
            """),
            {'password_hash': password_hash.decode('utf-8')}
        )
        db_session.commit()
        
        # Try to login
        response = client.post('/api/auth/login', json={
            'email': 'inactive@test.com',
            'password': 'inactive123'
        })
        
        assert response.status_code == 401
        
        # Cleanup
        db_session.execute(text("DELETE FROM users WHERE email = 'inactive@test.com'"))
        db_session.commit()
    
    def test_get_current_user(self, client, auth_headers):
        """Test getting current user profile"""
        response = client.get('/api/auth/me', headers=auth_headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'user' in data
        assert data['user']['email'] == 'test@testuser.com'
    
    def test_get_current_user_no_token(self, client):
        """Test accessing protected endpoint without token"""
        response = client.get('/api/auth/me')
        assert response.status_code == 401
    
    def test_change_password_success(self, client, auth_headers):
        """Test successful password change"""
        response = client.post('/api/auth/change-password',
                              headers=auth_headers,
                              json={
                                  'old_password': 'testpass123',
                                  'new_password': 'newpass456'
                              })
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'Password changed successfully' in data['message']
        
        # Try login with new password
        login_response = client.post('/api/auth/login', json={
            'email': 'test@testuser.com',
            'password': 'newpass456'
        })
        assert login_response.status_code == 200
    
    def test_change_password_wrong_old(self, client, auth_headers):
        """Test password change with wrong old password"""
        response = client.post('/api/auth/change-password',
                              headers=auth_headers,
                              json={
                                  'old_password': 'wrongpassword',
                                  'new_password': 'newpass456'
                              })
        
        assert response.status_code == 401
        data = json.loads(response.data)
        assert 'Invalid current password' in data['error']
    
    def test_change_password_weak_new(self, client, auth_headers):
        """Test password change with weak new password"""
        response = client.post('/api/auth/change-password',
                              headers=auth_headers,
                              json={
                                  'old_password': 'testpass123',
                                  'new_password': '123'
                              })
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'New password must be at least 6 characters' in data['error']