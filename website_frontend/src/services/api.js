// src/services/api.js

export const API_BASE_URL = import.meta.env.DEV ? 'http://localhost:5000/api' : '/api';

const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');

const isAuthEndpoint = (endpoint) => 
  endpoint.includes('/auth/login') || endpoint.includes('/auth/register');

const clearAuthData = () => {
  ['token', 'user', 'rememberMe'].forEach(key => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
};

// src/services/api.js - Update the apiRequest function

export const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = { 'Content-Type': 'application/json' };
  
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  try {
    const response = await fetch(url, { headers, ...options });
    
    // Try to parse response as JSON
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      throw new Error(`Server error: ${response.status}`);
    }
    
    if (response.status === 401) {
      if (isAuthEndpoint(endpoint)) throw new Error(data.error || 'Invalid credentials');
      if (!['/login', '/register'].includes(window.location.pathname)) {
        clearAuthData();
        window.location.href = '/login';
      }
      throw new Error('Session expired. Please login again.');
    }
    
    if (!response.ok) {
      // Extract the actual error message
      const errorMsg = data.error || data.message || data.msg || 'Something went wrong';
      throw new Error(errorMsg);
    }
    
    return data;
  } catch (error) {
    if (!isAuthEndpoint(endpoint)) console.error('API Error:', error);
    throw error;
  }
};

// ============ AUTH API ============
export const authAPI = {
  login: (email, password, rememberMe = false) => 
    apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({ email, password, remember_me: rememberMe }) }),
  register: (userData) => apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
  getCurrentUser: () => apiRequest('/auth/me'),
  changePassword: (oldPassword, newPassword) => 
    apiRequest('/auth/change-password', { method: 'POST', body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }) }),
  forgotPassword: (email) => 
    apiRequest('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (token, password) => 
    apiRequest('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) }),
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
  getNotifications: () => apiRequest('/users/me/notifications'),
  markNotificationRead: (id) => apiRequest(`/users/me/notifications/${id}/read`, { method: 'POST' }),
  markAllNotificationsRead: () => apiRequest('/users/me/notifications/read-all', { method: 'POST' }),
};

// ============ MEMBERSHIP API ============
export const membershipAPI = {
  apply: async (formData) => {
    const response = await fetch(`${API_BASE_URL}/membership/apply`, {
      method: 'POST', headers: { 'Authorization': `Bearer ${getToken()}` }, body: formData
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
  getAllReservations: () => apiRequest('/borrowings/reservations/all'),
  getReservationQueue: () => apiRequest('/borrowings/reservations/queue'),
  getBookReservationQueue: (bookId) => apiRequest(`/borrowings/reservations/queue/${bookId}`),
  getBookReservationsPublic: (bookId) => apiRequest(`/borrowings/reservations/book/${bookId}`),
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
  createMembership: (userId, durationMonths = 12, userData = null) => {
    const body = userData || { user_id: userId, duration_months: durationMonths };
    return apiRequest('/admin/memberships/create', { method: 'POST', body: JSON.stringify(body) });
  },
  getAllMemberships: (status = null) => {
    let url = '/admin/memberships/all';
    if (status && status !== 'all') url += `?status=${status}`;
    return apiRequest(url);
  },
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
  confirmPickup: (reservationId) => apiRequest(`/admin/borrowings/confirm-pickup/${reservationId}`, { method: 'POST' }),
  issueBook: (userId, bookId, dueDays = 14) => 
    apiRequest('/admin/borrowings/issue', { method: 'POST', body: JSON.stringify({ user_id: userId, book_id: bookId, due_days: dueDays }) }),
  returnBook: (borrowId, condition = 'good') => 
    apiRequest(`/admin/borrowings/${borrowId}/return`, { method: 'POST', body: JSON.stringify({ condition }) }),
  getBorrowHistory: (page = 1, search = '') => {
    let url = `/admin/borrowings/history?page=${page}&per_page=20`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    return apiRequest(url);
  },
  getNotifications: () => apiRequest('/admin/notifications'),
  markNotificationRead: (id) => apiRequest(`/admin/notifications/${id}/read`, { method: 'POST' }),
  markAllNotificationsRead: () => apiRequest('/admin/notifications/read-all', { method: 'POST' }),
  getArchivedBooks: (page = 1, search = '') => {
    let url = `/admin/books/archived?page=${page}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    return apiRequest(url);
  },
  restoreBook: (bookId) => apiRequest(`/admin/books/${bookId}/restore`, { method: 'POST' }),
  getInactiveUsers: (page = 1, search = '') => {
    let url = `/admin/users/inactive?page=${page}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    return apiRequest(url);
  },
  activateUser: (userId) => apiRequest(`/admin/users/${userId}/activate`, { method: 'POST' }),
  getAnnouncements: () => apiRequest('/admin/announcements'),
  sendAnnouncement: (title, message) => 
    apiRequest('/admin/announcements/send', { method: 'POST', body: JSON.stringify({ title, message }) }),
  deleteAnnouncement: (id) => apiRequest(`/admin/announcements/${id}`, { method: 'DELETE' }),
  getAdminProfile: () => apiRequest('/admin/profile'),
  updateAdminProfile: (data) => apiRequest('/admin/profile', { method: 'PUT', body: JSON.stringify(data) }),
  changeAdminPassword: (currentPassword, newPassword) => 
    apiRequest('/admin/profile/change-password', { method: 'POST', body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }) }),
  deactivateAdminAccount: (password) => 
    apiRequest('/admin/profile/deactivate', { method: 'POST', body: JSON.stringify({ password }) }),
  getAdmins: () => apiRequest('/admin/admins'),
  createAdmin: (data) => apiRequest('/admin/admins', { method: 'POST', body: JSON.stringify(data) }),
  removeAdmin: (id) => apiRequest(`/admin/admins/${id}`, { method: 'DELETE' }),
  getSmokeAlerts: () => apiRequest('/admin/smoke-alerts'),
  resolveSmokeAlert: (id, note) => apiRequest(`/admin/smoke-alerts/${id}/resolve`, { method: 'POST', body: JSON.stringify({ note }) }),
};