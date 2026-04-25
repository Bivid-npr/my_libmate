// src/pages/admin/AdminDashboardPage.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaExclamationTriangle, FaBook, FaUsers, FaExchangeAlt, FaFire, FaCreditCard, FaCheck, FaTimes, FaBookOpen } from 'react-icons/fa';
import { adminAPI, borrowingsAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';

const AdminDashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [bookRequests, setBookRequests] = useState([]);
  const [pendingMemberships, setPendingMemberships] = useState([]);
  const [pendingPickups, setPendingPickups] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [dashboardData, pendingData, requestsData, pickupsData] = await Promise.all([
        adminAPI.getDashboard(),
        adminAPI.getPendingMemberships(),
        adminAPI.getBookRequests('pending'),
        borrowingsAPI.getAllReservations()
      ]);
      
      setStats({
        total_users: dashboardData.total_users || 0,
        total_books: dashboardData.total_books || 0,
        active_borrowings: dashboardData.active_borrowings || 0,
        overdue_borrowings: dashboardData.overdue_borrowings || 0,
        pending_memberships: dashboardData.pending_memberships || 0,
        pending_renewals: dashboardData.pending_renewals || 0,
        revenue_last_30_days: dashboardData.revenue_last_30_days || 0
      });
      
      setBookRequests(requestsData || []);
      setPendingMemberships(pendingData || []);
      setPendingPickups(pickupsData || []);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      showToast('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveMembership = async (membershipId) => {
    try {
      await adminAPI.approveMembership(membershipId);
      showToast('Membership approved successfully!', 'success');
      fetchDashboardData();
    } catch (error) {
      showToast(error.message || 'Failed to approve membership', 'error');
    }
  };

  const handleRejectMembership = async (membershipId) => {
    if (!window.confirm('Are you sure you want to reject this membership?')) return;
    try {
      await adminAPI.rejectMembership(membershipId);
      showToast('Membership rejected', 'success');
      fetchDashboardData();
    } catch (error) {
      showToast(error.message || 'Failed to reject membership', 'error');
    }
  };

  const handleApproveRequest = async (requestId) => {
    try {
      await adminAPI.approveBookRequest(requestId);
      showToast('Book request approved', 'success');
      fetchDashboardData();
    } catch (error) {
      showToast(error.message || 'Failed to approve request', 'error');
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      await adminAPI.rejectBookRequest(requestId);
      showToast('Book request rejected', 'success');
      fetchDashboardData();
    } catch (error) {
      showToast(error.message || 'Failed to reject request', 'error');
    }
  };

  const statCards = stats ? [
    { label: 'Total Members', value: stats.total_users, sub: 'Active users', icon: FaUsers, color: 'bg-blue-500' },
    { label: 'Books Available', value: stats.total_books, sub: 'In catalogue', icon: FaBook, color: 'bg-green-500' },
    { label: 'Active Borrowings', value: stats.active_borrowings, sub: 'Currently borrowed', icon: FaExchangeAlt, color: 'bg-amber-500' },
    { label: 'Pending Pickups', value: pendingPickups.length, sub: 'Awaiting collection', icon: FaBookOpen, color: 'bg-cyan-500' },
    { label: 'Pending Memberships', value: stats.pending_memberships, sub: 'Awaiting approval', icon: FaCreditCard, color: 'bg-purple-500' },
    { label: 'Renewal Requests', value: stats.pending_renewals || 0, sub: 'Pending approval', icon: FaExclamationTriangle, color: 'bg-orange-500' },
  ] : [];

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-[#C4895A] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold text-[#2C1F14]">Admin Dashboard</h1>
        <p className="text-[#9A8478] mt-1">System overview and management</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        {statCards.map((stat, idx) => (
          <div key={idx} className="bg-white rounded-xl shadow-sm border border-[#EAE0D0] p-4">
            <div className={`w-8 h-8 ${stat.color} rounded-lg flex items-center justify-center mb-3`}>
              <stat.icon className="text-white text-sm" />
            </div>
            <div className="text-2xl font-serif font-bold text-[#2C1F14]">{stat.value}</div>
            <div className="text-xs text-[#9A8478] mt-0.5">{stat.label}</div>
            <div className="text-xs text-[#9A8478]">{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Book Requests */}
        <div className="bg-white rounded-xl shadow-sm border border-[#EAE0D0] p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-serif text-xl font-bold text-[#2C1F14]">Recent Book Requests</h2>
            <Link to="/admin/book-requests" className="text-[#C4895A] text-sm hover:underline">View all</Link>
          </div>
          <div className="space-y-3">
            {bookRequests.length === 0 ? (
              <p className="text-center py-6 text-[#9A8478]">No pending book requests</p>
            ) : (
              bookRequests.slice(0, 5).map((item) => (
                <div key={item.request_id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-[#FAF7F2] rounded-lg">
                  <div>
                    <span className="font-semibold text-[#2C1F14]">{item.title}</span>
                    <span className="text-xs text-[#9A8478] ml-2">by {item.author || 'Unknown'}</span>
                    <div className="text-xs text-[#9A8478]">{item.full_name} · {formatDate(item.created_at)}</div>
                    {item.reason && <div className="text-xs text-[#9A8478] mt-1 italic">"{item.reason.substring(0, 80)}{item.reason.length > 80 ? '...' : ''}"</div>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => handleApproveRequest(item.request_id)}
                      className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition" title="Approve"><FaCheck size={12} /></button>
                    <button onClick={() => handleRejectRequest(item.request_id)}
                      className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition" title="Reject"><FaTimes size={12} /></button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pending Membership Requests */}
        <div className="bg-white rounded-xl shadow-sm border border-[#EAE0D0] p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-serif text-xl font-bold text-[#2C1F14]">Pending Membership Requests</h2>
            <Link to="/admin/memberships" className="text-[#C4895A] text-sm hover:underline">View all</Link>
          </div>
          <div className="space-y-3">
            {pendingMemberships.length === 0 ? (
              <p className="text-center py-6 text-[#9A8478]">No pending membership requests</p>
            ) : (
              pendingMemberships.slice(0, 5).map((item) => (
                <div key={item.membership_id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-[#FAF7F2] rounded-lg">
                  <div>
                    <span className="font-semibold text-[#2C1F14]">{item.full_name}</span>
                    <span className="text-xs text-[#9A8478] ml-2">{item.duration_months} months</span>
                    <div className="text-xs text-[#9A8478]">{item.email}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${item.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {item.payment_status === 'paid' ? 'Paid' : 'Pending'}
                    </span>
                    <button onClick={() => handleApproveMembership(item.membership_id)} className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition" title="Approve"><FaCheck size={12} /></button>
                    <button onClick={() => handleRejectMembership(item.membership_id)} className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition" title="Reject"><FaTimes size={12} /></button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;