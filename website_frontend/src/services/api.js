// src/services/api.js

const API_BASE_URL = 'http://localhost:5000/api';

const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');

const isAuthEndpoint = (endpoint) => 
  endpoint.includes('/auth/login') || endpoint.includes('/auth/register');

const clearAuthData = () => {
  ['token', 'user', 'rememberMe'].forEach(key => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
};

const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = { 'Content-Type': 'application/json' };
  
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  try {
    const response = await fetch(url, { headers, ...options });
    const data = await response.json();
    
    if (response.status === 401) {
      if (isAuthEndpoint(endpoint)) {
        throw new Error(data.error || 'Invalid credentials');
      }
      if (!['/login', '/register'].includes(window.location.pathname)) {
        clearAuthData();
        window.location.href = '/login';
      }
      throw new Error('Session expired. Please login again.');
    }
    
    if (!response.ok) throw new Error(data.error || 'Something went wrong');
    
    return data;
  } catch (error) {
    if (!isAuthEndpoint(endpoint)) console.error('API Error:', error);
    throw error;
  }
};

// ============ AUTH API ============
export const authAPI = {
  login: (email, password, rememberMe = false) => 
    apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, remember_me: rememberMe })
    }),
  register: (userData) => apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
  getCurrentUser: () => apiRequest('/auth/me'),
  changePassword: (oldPassword, newPassword) => 
    apiRequest('/auth/change-password', { method: 'POST', body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }) }),
};

// ============ BOOKS API ============
export const booksAPI = {
  getBooks: (params = {}) => apiRequest(`/books?${new URLSearchParams(params)}`),
  getBook: (bookId) => apiRequest(`/books/${bookId}`),
  getGenres: () => apiRequest('/books/genres'),
  addReview: (bookId, rating, reviewText) => 
    apiRequest(`/books/${bookId}/reviews`, { method: 'POST', body: JSON.stringify({ rating, review_text: reviewText }) }),
  updateReview: (bookId, reviewId, rating, reviewText) => 
    apiRequest(`/books/${bookId}/reviews/${reviewId}`, { method: 'PUT', body: JSON.stringify({ rating, review_text: reviewText }) }),
  deleteReview: (bookId, reviewId) => apiRequest(`/books/${bookId}/reviews/${reviewId}`, { method: 'DELETE' }),
  requestBook: (bookData) => apiRequest('/books/request', { method: 'POST', body: JSON.stringify(bookData) }),
  getMyRequests: () => apiRequest('/books/requests'),
};

// ============ USERS API ============
export const usersAPI = {
  getProfile: () => apiRequest('/users/me'),
  updateProfile: (profileData) => apiRequest('/users/me', { method: 'PUT', body: JSON.stringify(profileData) }),
  getMyBorrowings: () => apiRequest('/users/me/borrowings'),
  getMyHistory: () => apiRequest('/users/me/history'),
  getWishlist: () => apiRequest('/users/me/wishlist'),
  addToWishlist: (bookId) => apiRequest(`/users/me/wishlist/${bookId}`, { method: 'POST' }),
  removeFromWishlist: (bookId) => apiRequest(`/users/me/wishlist/${bookId}`, { method: 'DELETE' }),
  getRecommendations: (limit = 10) => recommendationsAPI.getRecommendations(limit),
};

// ============ MEMBERSHIP API ============
export const membershipAPI = {
  apply: async (formData) => {
    const response = await fetch(`${API_BASE_URL}/membership/apply`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${getToken()}` },
      body: formData
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Application failed');
    return data;
  },
  getStatus: () => apiRequest('/membership/status'),
  getQRCode: () => `${API_BASE_URL}/membership/qr-code`,
};

// ============ BORROWINGS API ============
export const borrowingsAPI = {
  getMyBorrowings: () => apiRequest('/borrowings'),
  getHistory: (page = 1, perPage = 20) => apiRequest(`/borrowings/history?page=${page}&per_page=${perPage}`),
  requestRenewal: (borrowId) => apiRequest(`/borrowings/${borrowId}/renew`, { method: 'POST' }),
  returnBook: (borrowId) => apiRequest(`/borrowings/${borrowId}/return`, { method: 'POST' }),
  payFine: (borrowId, paymentMethod = 'card') => 
    apiRequest(`/borrowings/${borrowId}/pay-fine`, { method: 'POST', body: JSON.stringify({ payment_method: paymentMethod }) }),
  borrowBook: (bookId) => apiRequest(`/borrowings/borrow/${bookId}`, { method: 'POST' }),
  reserveBook: (bookId) => apiRequest(`/borrowings/reserve/${bookId}`, { method: 'POST' }),
  getReservations: (bookId) => apiRequest(`/borrowings/reservations/${bookId}`),
  getMyReservations: () => apiRequest('/borrowings/reservations'),
  cancelReservation: (reservationId) => apiRequest(`/borrowings/reservations/${reservationId}/cancel`, { method: 'POST' }),
};

// ============ TRENDING API ============
export const trendingAPI = {
  getTrending: (limit = 10) => apiRequest(`/trending?limit=${limit}`),
  getAllTrendingBooks: (page = 1, perPage = 12) => apiRequest(`/trending/all?page=${page}&per_page=${perPage}`),
  getTopTrending: (period = 'this_month') => apiRequest(`/trending/top?period=${period}`),
  getTrendingStats: () => apiRequest('/trending/stats'),
};

// ============ NEW ARRIVALS API ============
export const newArrivalsAPI = {
  getNewArrivals: (page = 1, perPage = 12) => apiRequest(`/new-arrivals?page=${page}&per_page=${perPage}`),
  getLatest: (limit = 6) => apiRequest(`/new-arrivals/latest?limit=${limit}`),
  getCount: () => apiRequest('/new-arrivals/count'),
};

// ============ RECOMMENDATIONS API ============
export const recommendationsAPI = {
  getRecommendations: (limit = 10) => apiRequest(`/recommendations?limit=${limit}`),
  refreshRecommendations: () => apiRequest('/recommendations/refresh', { method: 'POST' }),
  hasRecommendations: () => apiRequest('/recommendations/has-recommendations'),
};

// ============ ADMIN API ============
export const adminAPI = {
  getDashboard: () => apiRequest('/admin/dashboard'),
  getPendingMemberships: () => apiRequest('/admin/memberships/pending'),
  approveMembership: (id, duration = 12) => 
    apiRequest(`/admin/memberships/${id}/approve`, { method: 'POST', body: JSON.stringify({ duration_months: duration }) }),
  rejectMembership: (id) => apiRequest(`/admin/memberships/${id}/reject`, { method: 'POST' }),
  getAllBorrowings: (page = 1, status = null) => {
    let url = `/admin/borrowings?page=${page}`;
    if (status) url += `&status=${status}`;
    return apiRequest(url);
  },
  approveRenewal: (id) => apiRequest(`/admin/borrowings/${id}/renew/approve`, { method: 'POST' }),
  rejectRenewal: (id) => apiRequest(`/admin/borrowings/${id}/renew/reject`, { method: 'POST' }),
  getAllUsers: (page = 1, search = '') => {
    let url = `/admin/users?page=${page}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    return apiRequest(url);
  },
  deactivateUser: (id) => apiRequest(`/admin/users/${id}/deactivate`, { method: 'POST' }),
  addBook: (data) => apiRequest('/admin/books', { method: 'POST', body: JSON.stringify(data) }),
  updateBook: (id, data) => apiRequest(`/admin/books/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  archiveBook: (id) => apiRequest(`/admin/books/${id}`, { method: 'DELETE' }),
  getBookRequests: (status = null) => {
    let url = '/admin/book-requests';
    if (status) url += `?status=${status}`;
    return apiRequest(url);
  },
  approveBookRequest: (id) => apiRequest(`/admin/book-requests/${id}/approve`, { method: 'POST' }),
  rejectBookRequest: (id) => apiRequest(`/admin/book-requests/${id}/reject`, { method: 'POST' }),
};