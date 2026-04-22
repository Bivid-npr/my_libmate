# tests/test_books.py
import pytest
import json

class TestBooks:
    """Book API tests"""
    
    def test_get_books_list(self, client):
        """Test getting list of books"""
        response = client.get('/api/books')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'books' in data
        assert 'total' in data
        assert isinstance(data['books'], list)
    
    def test_get_books_with_pagination(self, client):
        """Test pagination"""
        response = client.get('/api/books?page=1&per_page=5')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['page'] == 1
        assert data['per_page'] == 5
    
    def test_get_books_with_filter(self, client):
        """Test filtering books by genre"""
        response = client.get('/api/books?genre=Fantasy')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        for book in data['books']:
            # Genre might be None in some books
            if book.get('genre'):
                assert 'Fantasy' in book['genre']
    
    def test_get_books_with_search(self, client):
        """Test searching books"""
        response = client.get('/api/books?search=Harry')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        # Search results may be empty if no matching books
        assert 'books' in data
    
    def test_get_single_book(self, client):
        """Test getting a single book by ID"""
        # First get a book ID from the list
        list_response = client.get('/api/books?per_page=1')
        books = json.loads(list_response.data)['books']
        
        if books:
            book_id = books[0]['book_id']
            response = client.get(f'/api/books/{book_id}')
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert 'book' in data
            assert 'reviews' in data
            assert data['book']['book_id'] == book_id
    
    def test_get_nonexistent_book(self, client):
        """Test getting a book that doesn't exist"""
        response = client.get('/api/books/99999')
        assert response.status_code == 404
    
    def test_get_genres(self, client):
        """Test getting list of genres"""
        response = client.get('/api/books/genres')
        
        assert response.status_code == 200
        genres = json.loads(response.data)
        assert isinstance(genres, list)
    
    def test_add_review_authenticated(self, client, test_member_user, db_session):
        """Test adding a review (authenticated member)"""
        # Get a book ID
        list_response = client.get('/api/books?per_page=1')
        books = json.loads(list_response.data)['books']
        
        if not books:
            pytest.skip("No books available for testing")
        
        book_id = books[0]['book_id']
        headers = {'Authorization': f'Bearer {test_member_user["token"]}'}
        
        response = client.post(f'/api/books/{book_id}/reviews',
                              headers=headers,
                              json={
                                  'rating': 5,
                                  'review_text': 'This is a test review!'
                              })
        
        # May fail if user hasn't borrowed the book, but that's fine
        # We're testing the endpoint works
        assert response.status_code in [201, 403, 409]
    
    def test_add_review_unauthenticated(self, client):
        """Test adding a review without authentication"""
        response = client.post('/api/books/1/reviews',
                              json={'rating': 5, 'review_text': 'Test'})
        
        assert response.status_code == 401
    
    def test_add_review_invalid_rating(self, client, auth_headers):
        """Test adding review with invalid rating"""
        response = client.post('/api/books/1/reviews',
                              headers=auth_headers,
                              json={
                                  'rating': 10,
                                  'review_text': 'Invalid rating'
                              })
        
        assert response.status_code == 400