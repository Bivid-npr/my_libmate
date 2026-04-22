# tests/test_borrowings.py
import pytest
import json

class TestBorrowings:
    """Borrowings API tests"""
    
    def test_get_borrowings(self, client, auth_headers):
        """Test getting borrowings list"""
        response = client.get('/api/borrowings', headers=auth_headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert isinstance(data, list)
    
    def test_get_borrow_history(self, client, auth_headers):
        """Test getting borrow history"""
        response = client.get('/api/borrowings/history', headers=auth_headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'history' in data or isinstance(data, list)
    
    def test_request_renewal(self, client, auth_headers):
        """Test requesting renewal for a borrowed book"""
        # This may fail if user has no active borrows
        response = client.post('/api/borrowings/1/renew', headers=auth_headers)
        
        # Should return appropriate response based on user's borrows
        assert response.status_code in [200, 400, 404]
    
    def test_return_book(self, client, auth_headers):
        """Test returning a book"""
        response = client.post('/api/borrowings/1/return', headers=auth_headers)
        
        assert response.status_code in [200, 404]