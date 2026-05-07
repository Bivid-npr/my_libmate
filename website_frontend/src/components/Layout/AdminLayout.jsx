// src/components/Layout/AdminLayout.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  FaTachometerAlt, FaBook, FaUsers, FaExchangeAlt, 
  FaBullhorn, FaFire, FaSignOutAlt, FaChevronLeft, FaChevronRight,
  FaCreditCard, FaBell, FaBookOpen, FaUserShield
} from 'react-icons/fa';
import { io } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { adminAPI } from '../../services/api';
import LoadingScreen from './LoadingScreen';
import logoNav from '../../assets/logo_navx360.svg';
import logoIcon from '../../assets/logo_icon.svg';

const AdminLayoutContent = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, loading } = useAuth();
  const { showToast } = useToast();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await adminAPI.getNotifications();
      setUnreadCount(res.filter(n => !n.is_read).length);
    } catch (err) {}
  }, []);

  // WebSocket for real-time notifications + initial fetch
  useEffect(() => {
    fetchUnreadCount();

    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const socket = io({
      query: { token }
    });

    socket.on('new_notification', (data) => {
      setUnreadCount(prev => prev + 1);
      showToast(data.message || data.title, 'info');
    });

    // Listen for notification-read events from NotificationsPage
    const handleNotificationRead = () => fetchUnreadCount();
    window.addEventListener('notification-read', handleNotificationRead);

    return () => {
      socket.disconnect();
      window.removeEventListener('notification-read', handleNotificationRead);
    };
  }, [fetchUnreadCount, showToast]);

  // Refetch count when navigating between pages
  useEffect(() => {
    fetchUnreadCount();
  }, [location.pathname, fetchUnreadCount]);

  if (loading) return <LoadingScreen />;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/admin', label: 'Dashboard', icon: FaTachometerAlt },
    { path: '/admin/memberships', label: 'Memberships', icon: FaCreditCard },
    { path: '/admin/books', label: 'Manage Books', icon: FaBook },
    { path: '/admin/users', label: 'Manage Users', icon: FaUsers },
    { path: '/admin/borrowings', label: 'Borrowings', icon: FaExchangeAlt },
    { path: '/admin/book-requests', label: 'Book Requests', icon: FaBookOpen },
    { path: '/admin/announcements', label: 'Announcements', icon: FaBullhorn },
    { path: '/admin/smoke-alerts', label: 'Smoke Alerts', icon: FaFire },
    { path: '/admin/notifications', label: 'Notifications', icon: FaBell },
  ];

  // Check if profile is active
  const isProfileActive = location.pathname === '/admin/profile';
  const sidebarWidth = sidebarCollapsed ? 'w-20' : 'w-64';

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      {/* Navbar  */}
      <aside className={`fixed top-0 left-0 z-40 h-screen transition-all duration-300 bg-[#EFE8DC] shadow-xl ${sidebarWidth}`}>
        <div className="flex items-center justify-between p-4 border-b border-[#4A3728]">
          <div className={`flex items-center gap-2 ${sidebarCollapsed && 'justify-center w-full'}`}>
            <img 
              src={sidebarCollapsed ? logoIcon : logoNav} 
              alt="LibMate" 
              className={sidebarCollapsed ? "h-12 w-auto" : "h-12 w-auto"} 
            />
          </div>
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="text-[#9A8478] hover:text-white transition">
            {sidebarCollapsed ? <FaChevronRight size={16} /> : <FaChevronLeft size={16} />}
          </button>
        </div>
        <nav className="mt-6 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path));
            return (
              <Link key={item.path} to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all mb-1 ${isActive ? 'bg-[#C4895A] text-white' : 'text-[#9A8478] hover:bg-[#4A3728] hover:text-white'}`}
                title={sidebarCollapsed ? item.label : ''}>
                <Icon size={18} />{!sidebarCollapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Section - Profile + Logout */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[#4A3728]">
          {/* Profile Link */}
          <Link
            to="/admin/profile"
            className={`flex items-center gap-3 mb-3 p-2 rounded-lg transition ${
              isProfileActive ? 'bg-[#C4895A]' : 'bg-[#D4C5B0] hover:bg-[#4A3728]'
            } ${sidebarCollapsed && 'justify-center'}`}
          >
            {user?.profile_picture ? (
              <img
                src={`http://localhost:5000/uploads/photos/${user.profile_picture}`}
                alt={user?.full_name}
                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-8 h-8 bg-[#C4895A] rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-semibold">{user?.full_name?.charAt(0) || 'A'}</span>
              </div>
            )}
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${isProfileActive ? 'text-white' : 'text-white'}`}>
                  {user?.full_name}
                </p>
                <p className={`text-xs ${isProfileActive ? 'text-white/70' : 'text-[#9A8478]'}`}>
                  Administrator
                </p>
              </div>
            )}
          </Link>

          {/* Logout Button */}
          <button onClick={handleLogout}
            className={`flex items-center gap-3 w-full px-3 py-2 text-[#9A8478] hover:bg-[#4A3728] hover:text-white rounded-lg transition ${sidebarCollapsed && 'justify-center'}`}>
            <FaSignOutAlt size={18} />{!sidebarCollapsed && <span className="text-sm">Logout</span>}
          </button>
        </div>
      </aside>

      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
        <header className="bg-white border-b border-[#EAE0D0] px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-serif font-bold text-[#2C1F14]">
                {location.pathname === '/admin/profile' 
                  ? 'My Profile' 
                  : navItems.find(item => item.path === location.pathname || (item.path !== '/admin' && location.pathname.startsWith(item.path)))?.label || 'Admin'}
              </h1>
              <p className="text-sm text-[#9A8478] mt-0.5">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <Link to="/admin/notifications" className="relative p-2 hover:bg-[#FAF7F2] rounded-full transition">
              <FaBell className="text-[#4A3728]" size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-500 text-white text-[11px] rounded-full flex items-center justify-center font-medium px-1">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
          </div>
        </header>
        <main className="p-6"><Outlet /></main>
      </div>
    </div>
  );
};

const AdminLayout = () => <AdminLayoutContent />;

export default AdminLayout;