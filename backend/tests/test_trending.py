# tests/test_trending.py
import pytest
import json

class TestTrending:
    """Trending books API tests"""
    
    def test_get_trending_books(self, client):
        """Test getting trending books"""
        response = client.get('/api/trending')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert isinstance(data, list)
    
    def test_get_trending_with_limit(self, client):
        """Test getting trending books with limit"""
        response = client.get('/api/trending?limit=5')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data) <= 5
    
    def test_get_trending_stats(self, client):
        """Test getting trending statistics"""
        response = client.get('/api/trending/stats')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'unique_books' in data or 'total_borrows' in data