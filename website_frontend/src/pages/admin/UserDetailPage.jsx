// src/pages/admin/UserDetailPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FaArrowLeft, FaUser, FaEnvelope, FaPhone, FaMapMarker, FaCalendar, FaBook, FaBookOpen, FaClock, FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa';
import { adminAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';

const UserDetailPage = () => {
  const { userId } = useParams();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    fetchUserDetails();
  }, [userId]);

  const fetchUserDetails = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || sessionStorage.getItem('token')}` }
      });
      const data = await response.json();
      setUserData(data);
    } catch (error) {
      showToast('Failed to load user details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  const calculateDaysLeft = (dueDate) => {
    const due = new Date(dueDate);
    const today = new Date();
    return Math.ceil((due - today) / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-[#C4895A] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="text-center py-12">
        <p className="text-[#9A8478]">User not found</p>
        <Link to="/admin/users" className="text-[#C4895A] hover:underline mt-2 inline-block">Back to Users</Link>
      </div>
    );
  }

  const { user, membership, active_borrowings, total_books_read } = userData;

  return (
    <div>
      <Link to="/admin/users" className="flex items-center gap-2 text-[#C4895A] hover:underline mb-6 text-sm">
        <FaArrowLeft size={12} /> Back to Users
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left - User Profile Card */}
        <div className="bg-white rounded-xl shadow-sm border border-[#EAE0D0] p-6">
          <div className="flex items-center gap-4 mb-6">
            {user.profile_picture ? (
              <img src={`/uploads/photos/${user.profile_picture}`} alt="" className="w-16 h-16 rounded-full object-cover" />
            ) : (
              <div className="w-16 h-16 bg-gradient-to-br from-[#2C1F14] to-[#4A3728] rounded-full flex items-center justify-center">
                <span className="text-white text-xl font-bold">{user.full_name?.charAt(0) || 'U'}</span>
              </div>
            )}
            <div>
              <h2 className="font-serif text-xl font-bold text-[#2C1F14]">{user.full_name}</h2>
              <span className={`text-xs px-2 py-1 rounded-full ${user.role === 'member' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                {user.role}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-[#4A3728]">
              <FaEnvelope className="text-[#9A8478]" size={14} />
              {user.email}
            </div>
            <div className="flex items-center gap-2 text-sm text-[#4A3728]">
              <FaPhone className="text-[#9A8478]" size={14} />
              {user.phone || 'Not provided'}
            </div>
            <div className="flex items-center gap-2 text-sm text-[#4A3728]">
              <FaMapMarker className="text-[#9A8478]" size={14} />
              {user.address || 'Not provided'}
            </div>
            <div className="flex items-center gap-2 text-sm text-[#4A3728]">
              <FaCalendar className="text-[#9A8478]" size={14} />
              Joined: {formatDate(user.created_at)}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 mt-6 pt-6 border-t border-[#EAE0D0]">
            <div className="bg-[#F3EDE3] rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-[#2C1F14]">{active_borrowings?.length || 0}</div>
              <div className="text-xs text-[#9A8478]">Active Borrows</div>
            </div>
            <div className="bg-[#F3EDE3] rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-[#2C1F14]">{total_books_read || 0}</div>
              <div className="text-xs text-[#9A8478]">Books Read</div>
            </div>
          </div>
        </div>

        {/* Right - Active Borrowings & Membership */}
        <div className="lg:col-span-2 space-y-6">
          {/* Membership Card */}
          {membership && (
            <div className="bg-gradient-to-br from-[#2C1F14] to-[#4A3728] rounded-xl shadow-lg p-6 text-white">
              <h3 className="font-serif text-lg font-bold mb-4">Membership</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-xs text-white/50">Status</div>
                  <div className="text-sm font-medium capitalize">{membership.status}</div>
                </div>
                <div>
                  <div className="text-xs text-white/50">Duration</div>
                  <div className="text-sm font-medium">{membership.duration_months} months</div>
                </div>
                <div>
                  <div className="text-xs text-white/50">Start Date</div>
                  <div className="text-sm font-medium">{formatDate(membership.start_date)}</div>
                </div>
                <div>
                  <div className="text-xs text-white/50">Expiry Date</div>
                  <div className="text-sm font-medium text-[#D4A574]">{formatDate(membership.expiry_date)}</div>
                </div>
              </div>
              {membership.card_number && (
                <div className="mt-4 pt-4 border-t border-white/20">
                  <div className="text-xs text-white/50">Card Number</div>
                  <div className="font-mono text-sm tracking-wider">{membership.card_number}</div>
                </div>
              )}
            </div>
          )}

          {/* Active Borrowings */}
          <div className="bg-white rounded-xl shadow-sm border border-[#EAE0D0] p-6">
            <h3 className="font-serif text-lg font-bold text-[#2C1F14] mb-4 flex items-center gap-2">
              <FaBookOpen className="text-[#C4895A]" />
              Active Borrowings ({active_borrowings?.length || 0})
            </h3>
            
            {!active_borrowings || active_borrowings.length === 0 ? (
              <p className="text-center py-6 text-[#9A8478]">No active borrowings</p>
            ) : (
              <div className="space-y-3">
                {active_borrowings.map((borrowing) => {
                  const daysLeft = calculateDaysLeft(borrowing.due_date);
                  const isOverdue = daysLeft < 0;
                  
                  return (
                    <div key={borrowing.borrow_id} className="flex items-center justify-between p-3 bg-[#FAF7F2] rounded-lg">
                      <div className="flex items-center gap-3">
                        <FaBook className="text-[#C4895A]" />
                        <div>
                          <Link to={`/book/${borrowing.book_id}`} className="font-medium text-[#2C1F14] hover:text-[#C4895A] transition">
                            {borrowing.title}
                          </Link>
                          <div className="text-xs text-[#9A8478]">{borrowing.author}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm flex items-center gap-1 ${isOverdue ? 'text-red-500' : 'text-[#4A3728]'}`}>
                          {isOverdue ? <FaExclamationTriangle size={12} /> : <FaClock size={12} />}
                          Due: {formatDate(borrowing.due_date)}
                        </div>
                        <div className={`text-xs ${isOverdue ? 'text-red-500 font-medium' : 'text-[#9A8478]'}`}>
                          {isOverdue ? `${Math.abs(daysLeft)} days overdue` : `${daysLeft} days left`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDetailPage;