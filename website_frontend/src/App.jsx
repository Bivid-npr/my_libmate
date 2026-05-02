// src/App.jsx - COMPLETE FILE
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Layout from './components/Layout/Layout';
import MemberLayout from './components/Layout/MemberLayout';
import AuthLayout from './components/Layout/AuthLayout';
import AdminLayout from './components/Layout/AdminLayout';

// Public Pages
import HomePage from './pages/user/HomePage';
import CataloguePage from './pages/user/CataloguePage';
import TrendingPage from './pages/user/TrendingPage';
import NewArrivalsPage from './pages/user/NewArrivalsPage';
import BookDetailPage from './pages/user/BookDetailPage';

// Member Pages (require login)
import MyBooksPage from './pages/user/MyBooksPage';
import WishlistPage from './pages/user/WishlistPage';
import NotificationsPage from './pages/user/NotificationsPage';
import ProfilePage from './pages/user/ProfilePage';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';

// Admin Pages
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminMembershipsPage from './pages/admin/MembershipsPage';
import AdminBooksPage from './pages/admin/BooksPage';
import AdminUsersPage from './pages/admin/UsersPage';
import UserDetailPage from './pages/admin/UserDetailPage';
import AdminBorrowingsPage from './pages/admin/BorrowingsPage';
import BookRequestsPage from './pages/admin/BookRequestsPage';
import AdminAnnouncementsPage from './pages/admin/AnnouncementsPage';
import AdminSmokeAlertsPage from './pages/admin/SmokeAlertPage';
import AdminNotificationsPage from './pages/admin/NotificationsPage';
import AdminProfilePage from './pages/admin/AdminProfilePage';


// Redirect admin away from user pages
const AdminRedirect = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();
  
  if (loading) return null;
  
  // If admin tries to access user pages, redirect to admin dashboard
  if (isAuthenticated && user?.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }
  
  return children;
};

// Protected Route Component for Member Routes
const ProtectedMemberRoute = ({ children }) => {
  const { isAuthenticated, user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#C4895A] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (user?.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }
  
  return children;
};

// Protected Route Component for Admin Routes
const ProtectedAdminRoute = ({ children }) => {
  const { isAuthenticated, user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#C4895A] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

function AppContent() {
  const { isAuthenticated, user } = useAuth();
  const isAdmin = user?.role === 'admin';

  return (
    <Routes>
      {/* Public routes — admins can view these */}
      <Route path="/" element={
        isAdmin ? <AdminLayout /> : <Layout />
      }>
        <Route index element={<HomePage />} />
        <Route path="catalogue" element={<CataloguePage />} />
        <Route path="trending" element={<TrendingPage />} />
        <Route path="new-arrivals" element={<NewArrivalsPage />} />
        <Route path="book/:id" element={<BookDetailPage />} />
      </Route>

      {/* Member routes — ONLY for non-admin authenticated users */}
      <Route path="/" element={
        isAdmin ? <Navigate to="/admin" replace /> : <MemberLayout />
      }>
        <Route path="my-books" element={
          <ProtectedMemberRoute><MyBooksPage /></ProtectedMemberRoute>
        } />
        <Route path="wishlist" element={
          <ProtectedMemberRoute><WishlistPage /></ProtectedMemberRoute>
        } />
        <Route path="notifications" element={
          <ProtectedMemberRoute><NotificationsPage /></ProtectedMemberRoute>
        } />
        <Route path="profile" element={
          <ProtectedMemberRoute><ProfilePage /></ProtectedMemberRoute>
        } />
      </Route>

      {/* Auth routes */}
      <Route path="/" element={<AuthLayout />}>
        <Route path="login" element={
          isAuthenticated ? (
            <Navigate to={isAdmin ? "/admin" : "/"} replace />
          ) : (
            <LoginPage />
          )
        } />
        <Route path="register" element={
          isAuthenticated ? (
            <Navigate to={isAdmin ? "/admin" : "/"} replace />
          ) : (
            <RegisterPage />
          )
        } />
        <Route path="forgot-password" element={
          isAuthenticated ? (
            <Navigate to={isAdmin ? "/admin" : "/"} replace />
          ) : (
            <ForgotPasswordPage />
          )
        } />
        <Route path="reset-password/:token" element={
          isAuthenticated ? (
            <Navigate to={isAdmin ? "/admin" : "/"} replace />
          ) : (
            <ResetPasswordPage />
          )
        } />
      </Route>

      {/* Admin Routes */}
      <Route path="/admin" element={
        <ProtectedAdminRoute>
          <AdminLayout />
        </ProtectedAdminRoute>
      }>
        <Route index element={<AdminDashboardPage />} />
        <Route path="memberships" element={<AdminMembershipsPage />} />
        <Route path="books" element={<AdminBooksPage />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="users/:userId" element={<UserDetailPage />} />
        <Route path="borrowings" element={<AdminBorrowingsPage />} />
        <Route path="book-requests" element={<BookRequestsPage />} />
        <Route path="announcements" element={<AdminAnnouncementsPage />} />
        <Route path="smoke-alerts" element={<AdminSmokeAlertsPage />} />
        <Route path="notifications" element={<AdminNotificationsPage />} />
        <Route path="profile" element={<AdminProfilePage />} />
        
        <Route path="*" element={
          <div className="text-center py-12">
            <h2 className="font-serif text-2xl font-bold text-[#2C1F14] mb-2">Page Not Found</h2>
            <p className="text-[#9A8478] mb-6">This admin page doesn't exist.</p>
            <Link to="/admin" className="text-[#C4895A] hover:underline">Return to Dashboard</Link>
          </div>
        } />
      </Route>

      {/* Catch all 404 */}
      <Route path="*" element={
        isAdmin ? (
          <Navigate to="/admin" replace />
        ) : (
          <div className="min-h-screen flex items-center justify-center bg-[#FAF7F2]">
            <div className="text-center">
              <h1 className="font-serif text-4xl font-bold text-[#2C1F14] mb-4">404</h1>
              <p className="text-[#9A8478] mb-6">Page not found</p>
              <Link to="/" className="text-[#C4895A] hover:underline">Return Home</Link>
            </div>
          </div>
        )
      } />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
          <AppContent />
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;