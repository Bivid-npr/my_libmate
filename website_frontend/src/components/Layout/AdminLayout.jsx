// src/components/Layout/AdminLayout.jsx
import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  FaTachometerAlt, FaBook, FaUsers, FaExchangeAlt, 
  FaBullhorn, FaFire, FaSignOutAlt, FaChevronLeft, FaChevronRight,
  FaCreditCard, FaBell, FaCog
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import LoadingScreen from './LoadingScreen';
import logoNav from '../../assets/logo_navx360.svg';

const AdminLayoutContent = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, loading } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
    { path: '/admin/announcements', label: 'Announcements', icon: FaBullhorn },
    { path: '/admin/smoke-alerts', label: 'Smoke Alerts', icon: FaFire },
    { path: '/admin/notifications', label: 'Notifications', icon: FaBell },
    { path: '/admin/settings', label: 'Settings', icon: FaCog },
  ];

  const sidebarWidth = sidebarCollapsed ? 'w-20' : 'w-64';

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 z-40 h-screen transition-all duration-300 bg-[#2C1F14] shadow-xl ${sidebarWidth}`}>
        <div className="flex items-center justify-between p-4 border-b border-[#4A3728]">
          <div className={`flex items-center gap-2 ${sidebarCollapsed && 'justify-center w-full'}`}>
            <img src={logoNav} alt="LibMate" className="h-8 w-auto" />
            {!sidebarCollapsed && <span className="text-white font-serif text-lg font-bold">Admin</span>}
          </div>
          <button 
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)} 
            className="text-[#9A8478] hover:text-white transition"
          >
            {sidebarCollapsed ? <FaChevronRight size={16} /> : <FaChevronLeft size={16} />}
          </button>
        </div>

        <nav className="mt-6 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || 
              (item.path !== '/admin' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all mb-1 ${
                  isActive ? 'bg-[#C4895A] text-white' : 'text-[#9A8478] hover:bg-[#4A3728] hover:text-white'
                }`}
                title={sidebarCollapsed ? item.label : ''}
              >
                <Icon size={18} />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[#4A3728]">
          <div className={`flex items-center gap-3 mb-3 ${sidebarCollapsed && 'justify-center'}`}>
            <div className="w-8 h-8 bg-[#C4895A] rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-semibold">{user?.full_name?.charAt(0) || 'A'}</span>
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{user?.full_name}</p>
                <p className="text-[#9A8478] text-xs">Administrator</p>
              </div>
            )}
          </div>
          <button 
            onClick={handleLogout} 
            className={`flex items-center gap-3 w-full px-3 py-2 text-[#9A8478] hover:bg-[#4A3728] hover:text-white rounded-lg transition ${sidebarCollapsed && 'justify-center'}`}
            title={sidebarCollapsed ? 'Logout' : ''}
          >
            <FaSignOutAlt size={18} />
            {!sidebarCollapsed && <span className="text-sm">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
        <header className="bg-white border-b border-[#EAE0D0] px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-serif font-bold text-[#2C1F14]">
                {navItems.find(item => 
                  item.path === location.pathname || 
                  (item.path !== '/admin' && location.pathname.startsWith(item.path))
                )?.label || 'Admin'}
              </h1>
              <p className="text-sm text-[#9A8478] mt-0.5">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
        </header>
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

const AdminLayout = () => {
  return <AdminLayoutContent />;
};

export default AdminLayout;