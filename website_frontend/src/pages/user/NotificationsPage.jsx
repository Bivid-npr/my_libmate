// src/pages/user/NotificationsPage.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { FaBell, FaBook, FaCheck, FaTimes, FaClock, FaExclamationTriangle } from 'react-icons/fa';
import { io } from 'socket.io-client';
import { usersAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';

const NotificationsPage = () => {
  const { isAuthenticated, user } = useAuth();
  const { showToast } = useToast();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
      
      // Connect to WebSocket with token for user identification
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const socket = io({query: { token }});
      
      socket.on('user_notification', (data) => {
        setNotifications(prev => [data, ...prev]);
        showToast(data.message || data.title, 'info');
        window.dispatchEvent(new Event('notification-read'));
      });
      
      return () => socket.disconnect();
    }
  }, [isAuthenticated]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await usersAPI.getNotifications();
      setNotifications(res || []);
    } catch (error) { console.error('Error fetching notifications:', error); }
    finally { setLoading(false); }
  };

  const markAsRead = async (notificationId) => {
    try {
      await usersAPI.markNotificationRead(notificationId);
      setNotifications(prev => prev.map(n => n.notification_id === notificationId ? { ...n, is_read: true } : n));
      window.dispatchEvent(new Event('notification-read'));
    } catch (error) { console.error('Error marking notification as read:', error); }
  };

  const markAllAsRead = async () => {
    try {
      await usersAPI.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      window.dispatchEvent(new Event('notification-read'));
    } catch (error) { console.error('Error marking all as read:', error); }
  };

  const getNotificationIcon = (type) => {
    const icons = {
      book_request: <FaBook className="text-blue-500" />,
      book_available: <FaCheck className="text-green-500" />,
      membership_approved: <FaCheck className="text-green-500" />,
      membership_rejected: <FaTimes className="text-red-500" />,
      due_date_reminder: <FaClock className="text-amber-500" />,
      overdue_notice: <FaExclamationTriangle className="text-red-500" />,
      renewal_approved: <FaCheck className="text-green-500" />,
      renewal_rejected: <FaTimes className="text-red-500" />,
    };
    return icons[type] || <FaBell className="text-[#C4895A]" />;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString), now = new Date();
    const diffMins = Math.floor((now - date) / 60000);
    const diffHours = Math.floor((now - date) / 3600000);
    const diffDays = Math.floor((now - date) / 86400000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return (
      <div className="bg-[#FAF7F2] min-h-screen pt-24 pb-12">
        <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-40">
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-[#C4895A] border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#FAF7F2] min-h-screen pt-24 pb-12">
      <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-40">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-serif text-3xl font-bold text-[#2C1F14]">Notifications</h1>
            <p className="text-[#9A8478] mt-1">{unreadCount > 0 ? `You have ${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}</p>
          </div>
          {unreadCount > 0 && <button onClick={markAllAsRead} className="text-sm text-[#C4895A] hover:underline">Mark all as read</button>}
        </div>

        {notifications.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#EAE0D0] p-12 text-center">
            <FaBell className="text-5xl text-[#C4895A]/30 mx-auto mb-4" />
            <h3 className="font-serif text-lg font-bold text-[#2C1F14] mb-2">No notifications yet</h3>
            <p className="text-[#9A8478]">When you receive notifications, they'll appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div key={notification.notification_id}
                className={`bg-white rounded-xl border p-4 flex items-start gap-4 transition cursor-pointer hover:shadow-sm ${!notification.is_read ? 'border-[#C4895A]/30 bg-[#C4895A]/5' : 'border-[#EAE0D0]'}`}
                onClick={() => !notification.is_read && markAsRead(notification.notification_id)}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${!notification.is_read ? 'bg-[#C4895A]/10' : 'bg-[#F3EDE3]'}`}>
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className={`text-sm ${!notification.is_read ? 'font-semibold text-[#2C1F14]' : 'font-medium text-[#4A3728]'}`}>{notification.title}</h4>
                    <span className="text-xs text-[#9A8478] whitespace-nowrap">{formatDate(notification.created_at)}</span>
                  </div>
                  <p className="text-sm text-[#9A8478] mt-1">{notification.message}</p>
                  {!notification.is_read && <span className="inline-block mt-2 w-2 h-2 bg-[#C4895A] rounded-full"></span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;