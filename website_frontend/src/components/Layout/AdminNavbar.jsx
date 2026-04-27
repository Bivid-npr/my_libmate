// src/components/admin/AdminNavbar.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FaBell, FaSignOutAlt } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { adminAPI } from '../../services/api';
import logoNav from '../../assets/logo_navx360.svg';

const AdminNavbar = ({ sidebarOpen }) => {
  const { user, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await adminAPI.getNotifications();
      console.log('Fetched admin notifications:', res?.length, 'unread:', res?.filter(n => !n.is_read).length);
      setUnreadCount(res.filter(n => !n.is_read).length);
    } catch (err) {
      console.error('Error fetching admin notifications:', err);
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  return (
    <header className={`fixed top-0 right-0 left-0 z-30 bg-white border-b border-[#EAE0D0] px-6 py-3 transition-all ${sidebarOpen ? 'ml-64' : 'ml-20'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img src={logoNav} alt="LibMate Admin" className="h-8 w-auto" />
          <span className="text-[#C4895A] font-serif text-lg font-bold">Admin Panel</span>
        </div>
        
        <div className="flex items-center gap-4">
          <Link to="/admin/notifications" className="relative p-2 hover:bg-[#FAF7F2] rounded-full transition">
            <FaBell className="text-[#4A3728]" size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-500 text-white text-[11px] rounded-full flex items-center justify-center font-medium px-1">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>
          
          <div className="flex items-center gap-3 pl-4 border-l border-[#EAE0D0]">
            <div className="w-8 h-8 bg-[#C4895A] rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-semibold">{user?.full_name?.charAt(0) || 'A'}</span>
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-[#2C1F14]">{user?.full_name}</p>
              <p className="text-xs text-[#9A8478]">Administrator</p>
            </div>
            <button onClick={logout} className="p-2 hover:bg-red-50 rounded-lg transition text-[#9A8478] hover:text-red-600" title="Logout">
              <FaSignOutAlt size={16} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminNavbar;