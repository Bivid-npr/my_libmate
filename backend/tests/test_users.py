# tests/test_users.py
import pytest
import json

class TestUsers:
    """User API tests"""
    
    def test_get_my_profile(self, client, auth_headers):
        """Test getting current user's profile"""
        response = client.get('/api/users/me', headers=auth_headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'user_id' in data or 'full_name' in data
    
    def test_update_my_profile(self, client, auth_headers):
        """Test updating user profile"""
        response = client.put('/api/users/me',
                             headers=auth_headers,
                             json={
                                 'phone': '9998887777',
                                 'address': 'Updated Address, New City'
                             })
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'Profile updated successfully' in data['message']
    
    def test_get_my_borrowings(self, client, auth_headers):
        """Test getting user's active borrowings"""
        response = client.get('/api/users/me/borrowings', headers=auth_headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert isinstance(data, list)
    
    def test_get_my_history(self, client, auth_headers):
        """Test getting user's borrow history"""
        response = client.get('/api/users/me/history', headers=auth_headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert isinstance(data, list)
    
    def test_get_my_wishlist(self, client, auth_headers):
        """Test getting user's wishlist"""
        response = client.get('/api/users/me/wishlist', headers=auth_headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert isinstance(data, list)
    
    def test_add_to_wishlist(self, client, auth_headers, db_session):
        """Test adding a book to wishlist"""
        # Get a book ID
        list_response = client.get('/api/books?per_page=1')
        books = json.loads(list_response.data)['books']
        
        if not books:
            pytest.skip("No books available for testing")
        
        book_id = books[0]['book_id']
        
        response = client.post(f'/api/users/me/wishlist/{book_id}',
                              headers=auth_headers)
        
        assert response.status_code in [201, 409]  # 201 created, 409 already exists
    
    def test_remove_from_wishlist(self, client, auth_headers):
        """Test removing a book from wishlist"""
        response = client.delete('/api/users/me/wishlist/1',
                                headers=auth_headers)
        
        assert response.status_code in [200, 404]  # 200 success, 404 not found
    
    def test_get_recommendations(self, client, auth_headers):
        """Test getting book recommendations"""
        response = client.get('/api/users/me/recommendations', headers=auth_headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert isinstance(data, list)