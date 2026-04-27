// src/pages/admin/NotificationsPage.jsx
import React, { useState, useEffect } from 'react';
import { FaBell, FaCheck, FaBook, FaUser, FaClock, FaExclamationTriangle, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import { io } from 'socket.io-client';
import { adminAPI } from '../../services/api';

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchNotifications();

    // WebSocket for real-time updates
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const socket = io('http://localhost:5000', {
      query: { token }
    });

    socket.on('new_notification', (data) => {
      // Add new notification to top of list
      setNotifications(prev => [{
        ...data,
        is_read: false,
        created_at: new Date().toISOString()
      }, ...prev]);
      window.dispatchEvent(new Event('notification-read'));
    });

    return () => socket.disconnect();
  }, [filter]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getNotifications();
      let data = res || [];
      if (filter === 'unread') {
        data = data.filter(n => !n.is_read);
      }
      setNotifications(data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await adminAPI.markNotificationRead(notificationId);
      setNotifications(prev => prev.map(n => n.notification_id === notificationId ? { ...n, is_read: true } : n));
      window.dispatchEvent(new Event('notification-read'));
    } catch (error) { console.error('Error marking as read:', error); }
  };

  const markAllAsRead = async () => {
    try {
      await adminAPI.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      window.dispatchEvent(new Event('notification-read'));
    } catch (error) { console.error('Error marking all as read:', error); }
  };

  const getNotificationIcon = (type) => {
    const icons = {
      book_request: <FaBook className="text-blue-500" />,
      new_pickup: <FaBook className="text-green-500" />,
      membership_approved: <FaCheckCircle className="text-green-500" />,
      membership_rejected: <FaTimesCircle className="text-red-500" />,
      renewal_request: <FaClock className="text-amber-500" />,
      overdue_notice: <FaExclamationTriangle className="text-red-500" />,
      new_membership: <FaUser className="text-purple-500" />,
    };
    return icons[type] || <FaBell className="text-[#C4895A]" />;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMins = Math.floor((now - date) / 60000);
    const diffHours = Math.floor((now - date) / 3600000);
    const diffDays = Math.floor((now - date) / 86400000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-[#C4895A] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[#2C1F14]">Notifications</h1>
          <p className="text-[#9A8478] mt-1">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-[#F3EDE3] rounded-lg p-1">
            <button onClick={() => setFilter('all')} className={`px-3 py-1.5 text-xs rounded-md transition ${filter === 'all' ? 'bg-[#C4895A] text-white' : 'text-[#4A3728] hover:bg-[#EAE0D0]'}`}>All</button>
            <button onClick={() => setFilter('unread')} className={`px-3 py-1.5 text-xs rounded-md transition ${filter === 'unread' ? 'bg-[#C4895A] text-white' : 'text-[#4A3728] hover:bg-[#EAE0D0]'}`}>Unread</button>
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllAsRead} className="text-sm text-[#C4895A] hover:underline">Mark all as read</button>
          )}
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#EAE0D0] p-12 text-center">
          <FaBell className="text-5xl text-[#C4895A]/30 mx-auto mb-4" />
          <h3 className="font-serif text-lg font-bold text-[#2C1F14] mb-2">No notifications</h3>
          <p className="text-[#9A8478]">System notifications will appear here when users reserve books or request renewals.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div
              key={notification.notification_id}
              onClick={() => !notification.is_read && markAsRead(notification.notification_id)}
              className={`bg-white rounded-xl border p-4 flex items-start gap-4 transition cursor-pointer hover:shadow-sm border-l-4 ${
                !notification.is_read ? 'border-l-[#C4895A] bg-[#C4895A]/[0.02]' : 'border-[#EAE0D0]'
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${!notification.is_read ? 'bg-[#C4895A]/10' : 'bg-[#F3EDE3]'}`}>
                {getNotificationIcon(notification.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h4 className={`text-sm ${!notification.is_read ? 'font-semibold text-[#2C1F14]' : 'font-medium text-[#4A3728]'}`}>{notification.title}</h4>
                  <span className="text-xs text-[#9A8478] whitespace-nowrap">{formatDate(notification.created_at)}</span>
                </div>
                <p className="text-sm text-[#9A8478] mt-1">{notification.message}</p>
                {!notification.is_read && (
                  <button onClick={(e) => { e.stopPropagation(); markAsRead(notification.notification_id); }} className="mt-2 text-xs text-[#C4895A] hover:underline flex items-center gap-1">
                    <FaCheck size={10} /> Mark as read
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;