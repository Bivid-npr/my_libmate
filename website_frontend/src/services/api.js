// src/services/api.js

// API Base URL - Change this to your backend URL
const API_BASE_URL = 'http://localhost:5000/api';

// Helper function to get auth token
const getToken = () => localStorage.getItem('token');

// Check if this is a login/register request (should not redirect on 401)
const isAuthEndpoint = (endpoint) => {
  return endpoint.includes('/auth/login') || 
         endpoint.includes('/auth/register');
};

// Generic API request function
const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };
  
  // Add token if it exists
  const token = getToken();
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }
  
  const config = {
    headers: defaultHeaders,
    ...options,
  };
  
  try {
    const response = await fetch(url, config);
    const data = await response.json();
    
    // Handle 401 Unauthorized
    if (response.status === 401) {
      // Only redirect for non-auth endpoints (actual session expiration)
      if (!isAuthEndpoint(endpoint)) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        throw new Error('Session expired. Please login again.');
      }
      // For auth endpoints (login/register), just throw the error message
      throw new Error(data.error || 'Invalid credentials');
    }
    
    if (!response.ok) {
      throw new Error(data.error || 'Something went wrong');
    }
    
    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// ============ AUTH API ============
export const authAPI = {
  login: (email, password) => 
    apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),
  
  register: (userData) => 
    apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    }),
  
  getCurrentUser: () => 
    apiRequest('/auth/me'),
  
  changePassword: (oldPassword, newPassword) => 
    apiRequest('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ old_password: oldPassword, new_password: newPassword })
    }),
};

// ============ BOOKS API ============
export const booksAPI = {
  getBooks: (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return apiRequest(`/books${queryParams ? `?${queryParams}` : ''}`);
  },
  
  getBook: (bookId) => 
    apiRequest(`/books/${bookId}`),
  
  getGenres: () => 
    apiRequest('/books/genres'),
  
  addReview: (bookId, rating, reviewText) => 
    apiRequest(`/books/${bookId}/reviews`, {
      method: 'POST',
      body: JSON.stringify({ rating, review_text: reviewText })
    }),
  
  updateReview: (bookId, reviewId, rating, reviewText) => 
    apiRequest(`/books/${bookId}/reviews/${reviewId}`, {
      method: 'PUT',
      body: JSON.stringify({ rating, review_text: reviewText })
    }),
  
  deleteReview: (bookId, reviewId) => 
    apiRequest(`/books/${bookId}/reviews/${reviewId}`, {
      method: 'DELETE'
    }),
};

// ============ USERS API ============
export const usersAPI = {
  getProfile: () => 
    apiRequest('/users/me'),
  
  updateProfile: (profileData) => 
    apiRequest('/users/me', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    }),
  
  getMyBorrowings: () => 
    apiRequest('/users/me/borrowings'),
  
  getMyHistory: () => 
    apiRequest('/users/me/history'),
  
  getWishlist: () => 
    apiRequest('/users/me/wishlist'),
  
  addToWishlist: (bookId) => 
    apiRequest(`/users/me/wishlist/${bookId}`, {
      method: 'POST'
    }),
  
  removeFromWishlist: (bookId) => 
    apiRequest(`/users/me/wishlist/${bookId}`, {
      method: 'DELETE'
    }),
  
  // This will be redirected to recommendationsAPI (kept for backward compatibility)
  getRecommendations: (limit = 10) => 
    recommendationsAPI.getRecommendations(limit),
};


// ============ MEMBERSHIP API ============
export const membershipAPI = {
  // Apply for membership with file uploads
  apply: async (formData) => {
    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/membership/apply`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
        // Don't set Content-Type - let browser set it with boundary for FormData
      },
      body: formData
    });
    
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Application failed');
    }
    return data;
  },
  
  // Get membership status
  getStatus: () => 
    apiRequest('/membership/status'),
  
  // Get QR code URL
  getQRCode: () => 
    `${API_BASE_URL}/membership/qr-code`,
};


// ============ BORROWINGS API ============
export const borrowingsAPI = {
  getMyBorrowings: () => 
    apiRequest('/borrowings'),
  
  getHistory: (page = 1, perPage = 20) => 
    apiRequest(`/borrowings/history?page=${page}&per_page=${perPage}`),
  
  requestRenewal: (borrowId) => 
    apiRequest(`/borrowings/${borrowId}/renew`, {
      method: 'POST'
    }),
  
  returnBook: (borrowId) => 
    apiRequest(`/borrowings/${borrowId}/return`, {
      method: 'POST'
    }),
  
  payFine: (borrowId, paymentMethod = 'card') => 
    apiRequest(`/borrowings/${borrowId}/pay-fine`, {
      method: 'POST',
      body: JSON.stringify({ payment_method: paymentMethod })
    }),
  
  borrowBook: (bookId) => 
    apiRequest(`/borrowings/borrow/${bookId}`, {
      method: 'POST'
    }),
  
  reserveBook: (bookId) => 
    apiRequest(`/borrowings/reserve/${bookId}`, {
      method: 'POST'
    }),
  
  getReservations: (bookId) =>
    apiRequest(`/borrowings/reservations/${bookId}`),
};

// ============ TRENDING API ============
export const trendingAPI = {
  getTrending: (limit = 10) => 
    apiRequest(`/trending?limit=${limit}`),
  
  getAllTrendingBooks: (page = 1, perPage = 12) => 
    apiRequest(`/trending/all?page=${page}&per_page=${perPage}`),
  
  getTopTrending: (period = 'this_month') => 
    apiRequest(`/trending/top?period=${period}`),
  
  getTrendingStats: () => 
    apiRequest('/trending/stats'),
};

// ============ NEW ARRIVALS API ============
export const newArrivalsAPI = {
  getNewArrivals: (page = 1, perPage = 12) =>  
    apiRequest(`/new-arrivals?page=${page}&per_page=${perPage}`),
  
  getLatest: (limit = 6) => 
    apiRequest(`/new-arrivals/latest?limit=${limit}`),
  
  getCount: () => 
    apiRequest('/new-arrivals/count'),
};

// ============ RECOMMENDATIONS API ============
export const recommendationsAPI = {
  getRecommendations: (limit = 10) => 
    apiRequest(`/recommendations?limit=${limit}`),
  
  refreshRecommendations: () => 
    apiRequest('/recommendations/refresh', { method: 'POST' }),
  
  hasRecommendations: () => 
    apiRequest('/recommendations/has-recommendations'),
};


// ============ ADMIN API ============
export const adminAPI = {
  getDashboard: () => 
    apiRequest('/admin/dashboard'),
  
  getPendingMemberships: () => 
    apiRequest('/admin/memberships/pending'),
  
  approveMembership: (membershipId, durationMonths = 12) => 
    apiRequest(`/admin/memberships/${membershipId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ duration_months: durationMonths })
    }),
  
  rejectMembership: (membershipId) => 
    apiRequest(`/admin/memberships/${membershipId}/reject`, {
      method: 'POST'
    }),
  
  getAllBorrowings: (page = 1, status = null) => {
    let url = `/admin/borrowings?page=${page}`;
    if (status) url += `&status=${status}`;
    return apiRequest(url);
  },
  
  approveRenewal: (borrowId) => 
    apiRequest(`/admin/borrowings/${borrowId}/renew/approve`, {
      method: 'POST'
    }),
  
  rejectRenewal: (borrowId) => 
    apiRequest(`/admin/borrowings/${borrowId}/renew/reject`, {
      method: 'POST'
    }),
  
  getAllUsers: (page = 1, search = '') => 
    apiRequest(`/admin/users?page=${page}${search ? `&search=${search}` : ''}`),
  
  deactivateUser: (userId) => 
    apiRequest(`/admin/users/${userId}/deactivate`, {
      method: 'POST'
    }),
  
  addBook: (bookData) => 
    apiRequest('/admin/books', {
      method: 'POST',
      body: JSON.stringify(bookData)
    }),
  
  updateBook: (bookId, bookData) => 
    apiRequest(`/admin/books/${bookId}`, {
      method: 'PUT',
      body: JSON.stringify(bookData)
    }),
  
  archiveBook: (bookId) => 
    apiRequest(`/admin/books/${bookId}`, {
      method: 'DELETE'
    }),
};

export default {
  auth: authAPI,
  books: booksAPI,
  users: usersAPI,
  borrowings: borrowingsAPI,
  trending: trendingAPI,
  newArrivals: newArrivalsAPI,
  recommendations: recommendationsAPI,
  membership: membershipAPI,
  admin: adminAPI,
};