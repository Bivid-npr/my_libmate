import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Layout from './components/Layout/Layout';
import MemberLayout from './components/Layout/MemberLayout';
import AuthLayout from './components/Layout/AuthLayout';
import AdminLayout from './components/Layout/AdminLayout';

// User Pages (these are in pages/user/ but you're importing from pages directly)
import HomePage from './pages/user/HomePage';
import CataloguePage from './pages/user/CataloguePage';
import TrendingPage from './pages/user/TrendingPage';
import NewArrivalsPage from './pages/user/NewArrivalsPage';
import BookDetailPage from './pages/user/BookDetailPage';
import MyBooksPage from './pages/user/MyBooksPage';
import WishlistPage from './pages/user/WishlistPage';
import NotificationsPage from './pages/user/NotificationsPage';
import ProfilePage from './pages/user/ProfilePage';

// Auth Pages (these are in pages/auth/)
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

// Admin Pages (these are in pages/admin/)
import AdminDashboardPage from './pages/admin/AdminDashboardPage';  // Note: Your file is AdminDashboardPage.jsx
import AdminMembershipsPage from './pages/admin/MembershipPage';  // Your file is MembershipPage.jsx (singular)
import AdminBooksPage from './pages/admin/BooksPage';
import AdminUsersPage from './pages/admin/UsersPage';
import AdminBorrowingsPage from './pages/admin/BorrowingsPage';
import AdminAnnouncementsPage from './pages/admin/AnnouncementsPage';
import AdminSmokeAlertsPage from './pages/admin/SmokeAtertPage';  // Note: Typo in filename "SmokeAtertPage"

function AppContent() {
  const { isAuthenticated, isAdmin } = useAuth();

  return (
    <Routes>
      {/* Public routes - shows Navbar */}
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="catalogue" element={<CataloguePage />} />
        <Route path="trending" element={<TrendingPage />} />
        <Route path="new-arrivals" element={<NewArrivalsPage />} />
        <Route path="book/:id" element={<BookDetailPage />} />
      </Route>

      {/* Member routes - requires authentication */}
      <Route path="/" element={<MemberLayout />}>
        <Route path="my-books" element={isAuthenticated ? <MyBooksPage /> : <Navigate to="/login" />} />
        <Route path="wishlist" element={isAuthenticated ? <WishlistPage /> : <Navigate to="/login" />} />
        <Route path="notifications" element={isAuthenticated ? <NotificationsPage /> : <Navigate to="/login" />} />
        <Route path="profile" element={isAuthenticated ? <ProfilePage /> : <Navigate to="/login" />} />
      </Route>

      {/* Auth routes - no navbar */}
      <Route path="/" element={<AuthLayout />}>
        <Route path="login" element={!isAuthenticated ? <LoginPage /> : <Navigate to="/" />} />
        <Route path="register" element={!isAuthenticated ? <RegisterPage /> : <Navigate to="/login" />} />
      </Route>

      {/* Admin Routes - separate layout, requires admin */}
      <Route path="/admin" element={isAdmin ? <AdminLayout /> : <Navigate to="/" />}>
        <Route index element={<AdminDashboardPage />} />
        <Route path="memberships" element={<AdminMembershipsPage />} />
        <Route path="books" element={<AdminBooksPage />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="borrowings" element={<AdminBorrowingsPage />} />
        <Route path="announcements" element={<AdminAnnouncementsPage />} />
        <Route path="smoke-alerts" element={<AdminSmokeAlertsPage />} />
      </Route>
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