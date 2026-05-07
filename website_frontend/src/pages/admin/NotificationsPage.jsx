// src/pages/admin/NotificationsPage.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  FaBell, FaCheck, FaBook, FaUser, FaClock, FaExclamationTriangle, 
  FaCheckCircle, FaTimesCircle, FaCreditCard, FaRedo, FaFilter,
  FaChevronDown
} from 'react-icons/fa';
import { io } from 'socket.io-client';
import { adminAPI } from '../../services/api';

// Notification categories for filtering
const NOTIFICATION_CATEGORIES = {
  all: { label: 'All', icon: <FaBell size={12} /> },
  pickup: { label: 'Pickups', icon: <FaBook size={12} />, types: ['new_pickup', 'book_request'] },
  renewal: { label: 'Renewals', icon: <FaRedo size={12} />, types: ['renewal_request', 'renewal_approved', 'renewal_rejected'] },
  membership: { label: 'Memberships', icon: <FaCreditCard size={12} />, types: ['new_membership', 'membership_approved', 'membership_rejected', 'membership_expiry'] },
  overdue: { label: 'Overdue', icon: <FaExclamationTriangle size={12} />, types: ['overdue_notice', 'due_date_reminder', 'fine_generated'] },
  books: { label: 'Books', icon: <FaBook size={12} />, types: ['book_available', 'reservation_fulfilled', 'reservation_expired', 'book_request'] },
  unread: { label: 'Unread', icon: <FaFilter size={12} />, filter: 'unread' },
};

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [showMobileFilter, setShowMobileFilter] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getNotifications();
      setNotifications(res || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();

    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const socket = io({
      query: { token }
    });

    socket.on('new_notification', (data) => {
      setNotifications(prev => [{
        ...data,
        is_read: false,
        created_at: new Date().toISOString()
      }, ...prev]);
      window.dispatchEvent(new Event('notification-read'));
    });

    return () => socket.disconnect();
  }, [fetchNotifications]);

  const markAsRead = async (notificationId) => {
    try {
      await adminAPI.markNotificationRead(notificationId);
      setNotifications(prev => prev.map(n => 
        n.notification_id === notificationId ? { ...n, is_read: true } : n
      ));
      window.dispatchEvent(new Event('notification-read'));
    } catch (error) { 
      console.error('Error marking as read:', error); 
    }
  };

  const markAllAsRead = async () => {
    try {
      await adminAPI.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      window.dispatchEvent(new Event('notification-read'));
    } catch (error) { 
      console.error('Error marking all as read:', error); 
    }
  };

  // Filter notifications based on active category
  const filteredNotifications = useMemo(() => {
    const category = NOTIFICATION_CATEGORIES[activeCategory];
    
    if (!category) return notifications;
    
    if (category.filter === 'unread') {
      return notifications.filter(n => !n.is_read);
    }
    
    if (category.types) {
      return notifications.filter(n => category.types.includes(n.type));
    }
    
    return notifications; // 'all' category
  }, [notifications, activeCategory]);

  // Count notifications per category
  const categoryCounts = useMemo(() => {
    const counts = {
      all: notifications.length,
      unread: notifications.filter(n => !n.is_read).length,
    };
    
    Object.entries(NOTIFICATION_CATEGORIES).forEach(([key, cat]) => {
      if (cat.types) {
        counts[key] = notifications.filter(n => cat.types.includes(n.type)).length;
      }
    });
    
    return counts;
  }, [notifications]);

  const getNotificationIcon = (type) => {
    const icons = {
      'book_request':         <FaBook className="text-blue-500" />,
      'new_pickup':           <FaBook className="text-green-500" />,
      'renewal_request':      <FaRedo className="text-amber-500" />,
      'renewal_approved':     <FaCheckCircle className="text-green-500" />,
      'renewal_rejected':     <FaTimesCircle className="text-red-500" />,
      'overdue_notice':       <FaExclamationTriangle className="text-red-500" />,
      'due_date_reminder':    <FaClock className="text-amber-500" />,
      'book_available':       <FaBook className="text-green-500" />,
      'reservation_fulfilled': <FaCheckCircle className="text-green-500" />,
      'reservation_expired':  <FaTimesCircle className="text-gray-500" />,
      'new_membership':       <FaCreditCard className="text-purple-500" />,
      'membership_approved':  <FaCheckCircle className="text-green-500" />,
      'membership_rejected':  <FaTimesCircle className="text-red-500" />,
      'membership_expiry':    <FaClock className="text-orange-500" />,
      'fine_generated':       <FaExclamationTriangle className="text-red-500" />,
      'smoke_alert':          <FaExclamationTriangle className="text-red-500" />,
      'announcement':         <FaBell className="text-blue-500" />,
    };
    return icons[type] || <FaBell className="text-[#9A8478]" />;
  };

  const getNotificationTypeLabel = (type) => {
    const labels = {
      'book_request':         'Book Request',
      'new_pickup':           'New Pickup',
      'renewal_request':      'Renewal Request',
      'renewal_approved':     'Renewal Approved',
      'renewal_rejected':     'Renewal Rejected',
      'overdue_notice':       'Overdue',
      'due_date_reminder':    'Due Reminder',
      'book_available':       'Available',
      'reservation_fulfilled':'Fulfilled',
      'reservation_expired':  'Expired',
      'new_membership':       'New Member',
      'membership_approved':  'Approved',
      'membership_rejected':  'Rejected',
      'membership_expiry':    'Expiring',
      'fine_generated':       'Fine',
      'smoke_alert':          'Smoke Alert',
      'announcement':         'Announcement',
    };
    return labels[type] || type.replace(/_/g, ' ');
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
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const unreadCount = categoryCounts.unread;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-[#C4895A] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[#9A8478] mt-1">
            {unreadCount > 0 
              ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` 
              : 'All caught up!'
            }
          </p>
        </div>
        {unreadCount > 0 && (
          <button 
            onClick={markAllAsRead} 
            className="text-sm text-[#C4895A] hover:underline font-medium"
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* Category Filter Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-[#EAE0D0] p-1.5 mb-6 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {Object.entries(NOTIFICATION_CATEGORIES).map(([key, cat]) => (
            <button
              key={key}
              onClick={() => setActiveCategory(key)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                activeCategory === key
                  ? 'bg-[#2C1F14] text-white shadow-sm'
                  : 'text-[#4A3728] hover:bg-[#F3EDE3]'
              }`}
            >
              {cat.icon}
              <span>{cat.label}</span>
              {categoryCounts[key] > 0 && (
                <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] rounded-full ${
                  activeCategory === key
                    ? 'bg-white/20 text-white'
                    : 'bg-[#EAE0D0] text-[#6B4F40]'
                }`}>
                  {categoryCounts[key]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {filteredNotifications.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#EAE0D0] p-12 text-center">
          <div className="w-16 h-16 bg-[#F3EDE3] rounded-full flex items-center justify-center mx-auto mb-4">
            <FaBell className="text-[#9A8478] text-2xl" />
          </div>
          <h3 className="font-serif text-lg font-bold text-[#2C1F14] mb-2">
            No notifications
          </h3>
          <p className="text-[#9A8478] text-sm max-w-md mx-auto">
            {activeCategory === 'unread' 
              ? 'All notifications have been read.'
              : activeCategory !== 'all'
                ? `No ${NOTIFICATION_CATEGORIES[activeCategory].label.toLowerCase()} notifications.`
                : 'System notifications will appear here when users reserve books, request renewals, apply for memberships, and more.'
            }
          </p>
        </div>
      ) : (
        /* Notification List */
        <div className="space-y-3">
          {filteredNotifications.map((notification) => (
            <div
              key={notification.notification_id}
              onClick={() => !notification.is_read && markAsRead(notification.notification_id)}
              className={`bg-white rounded-xl border p-4 flex items-start gap-4 transition cursor-pointer hover:shadow-sm border-l-4 ${
                !notification.is_read 
                  ? 'border-l-[#C4895A] bg-[#C4895A]/[0.02]' 
                  : 'border-l-[#EAE0D0]'
              }`}
            >
              {/* Icon */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                !notification.is_read ? 'bg-[#C4895A]/10' : 'bg-[#F3EDE3]'
              }`}>
                {getNotificationIcon(notification.type)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] px-2 py-0.5 bg-[#EAE0D0] rounded-full text-[#6B4F40] uppercase tracking-wide font-medium">
                        {getNotificationTypeLabel(notification.type)}
                      </span>
                      {!notification.is_read && (
                        <span className="w-2 h-2 bg-[#C4895A] rounded-full flex-shrink-0"></span>
                      )}
                    </div>
                    <h4 className={`text-sm ${
                      !notification.is_read 
                        ? 'font-semibold text-[#2C1F14]' 
                        : 'font-medium text-[#4A3728]'
                    }`}>
                      {notification.title}
                    </h4>
                  </div>
                  <span className="text-xs text-[#9A8478] whitespace-nowrap flex-shrink-0">
                    {formatDate(notification.created_at)}
                  </span>
                </div>
                
                <p className="text-sm text-[#9A8478] mt-1 leading-relaxed">
                  {notification.message}
                </p>
                
                {/* Mark as read button for unread */}
                {!notification.is_read && (
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      markAsRead(notification.notification_id); 
                    }} 
                    className="mt-2 text-xs text-[#C4895A] hover:underline flex items-center gap-1"
                  >
                    <FaCheck size={10} /> Mark as read
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Results count */}
      {filteredNotifications.length > 0 && (
        <p className="text-xs text-[#9A8478] text-center mt-4">
          Showing {filteredNotifications.length} of {notifications.length} notifications
          {activeCategory !== 'all' && ` (filtered by ${NOTIFICATION_CATEGORIES[activeCategory].label})`}
        </p>
      )}
    </div>
  );
};

export default NotificationsPage;