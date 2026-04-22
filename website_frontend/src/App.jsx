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

// Admin Pages
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminMembershipsPage from './pages/admin/MembershipsPage';
import AdminBooksPage from './pages/admin/BooksPage';
import AdminUsersPage from './pages/admin/UsersPage';
import AdminBorrowingsPage from './pages/admin/BorrowingsPage';
import AdminAnnouncementsPage from './pages/admin/AnnouncementsPage';
import AdminSmokeAlertsPage from './pages/admin/SmokeAtertPage';
import AdminNotificationsPage from './pages/admin/NotificationsPage';
import AdminSettingsPage from './pages/admin/SettingsPage';

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
      {/* Public routes - accessible to everyone */}
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="catalogue" element={<CataloguePage />} />
        <Route path="trending" element={<TrendingPage />} />
        <Route path="new-arrivals" element={<NewArrivalsPage />} />
        <Route path="book/:id" element={<BookDetailPage />} />
      </Route>

      {/* Member routes - requires authentication, NOT admin */}
      <Route path="/" element={<MemberLayout />}>
        <Route path="my-books" element={
          <ProtectedMemberRoute>
            <MyBooksPage />
          </ProtectedMemberRoute>
        } />
        <Route path="wishlist" element={
          <ProtectedMemberRoute>
            <WishlistPage />
          </ProtectedMemberRoute>
        } />
        <Route path="notifications" element={
          <ProtectedMemberRoute>
            <NotificationsPage />
          </ProtectedMemberRoute>
        } />
        <Route path="profile" element={
          <ProtectedMemberRoute>
            <ProfilePage />
          </ProtectedMemberRoute>
        } />
      </Route>

      {/* Auth routes - no navbar, redirect if already logged in */}
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
      </Route>

      {/* Admin Routes - separate layout, requires admin */}
      <Route path="/admin" element={
        <ProtectedAdminRoute>
          <AdminLayout />
        </ProtectedAdminRoute>
      }>
        <Route index element={<AdminDashboardPage />} />
        <Route path="memberships" element={<AdminMembershipsPage />} />
        <Route path="books" element={<AdminBooksPage />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="borrowings" element={<AdminBorrowingsPage />} />
        <Route path="announcements" element={<AdminAnnouncementsPage />} />
        <Route path="smoke-alerts" element={<AdminSmokeAlertsPage />} />
        <Route path="notifications" element={<AdminNotificationsPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
        
        {/* Admin 404 - stays within AdminLayout */}
        <Route path="*" element={
          <div className="text-center py-12">
            <h2 className="font-serif text-2xl font-bold text-[#2C1F14] mb-2">Page Not Found</h2>
            <p className="text-[#9A8478] mb-6">This admin page doesn't exist.</p>
            <Link to="/admin" className="text-[#C4895A] hover:underline">
              Return to Dashboard
            </Link>
          </div>
        } />
      </Route>

      {/* Catch all - 404 for non-admin routes */}
      <Route path="*" element={
        <Layout>
          <div className="min-h-screen flex items-center justify-center bg-[#FAF7F2]">
            <div className="text-center">
              <h1 className="font-serif text-4xl font-bold text-[#2C1F14] mb-4">404</h1>
              <p className="text-[#9A8478] mb-6">Page not found</p>
              <Link to="/" className="text-[#C4895A] hover:underline">Return Home</Link>
            </div>
          </div>
        </Layout>
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