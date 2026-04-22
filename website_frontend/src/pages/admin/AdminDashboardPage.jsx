// src/pages/admin/AdminDashboardPage.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaExclamationTriangle, FaBook, FaUsers, FaExchangeAlt, FaFire, FaCreditCard, FaCheck, FaTimes } from 'react-icons/fa';
import { adminAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';

const AdminDashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [overdueBorrowings, setOverdueBorrowings] = useState([]);
  const [pendingMemberships, setPendingMemberships] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [dashboardData, pendingData] = await Promise.all([
        adminAPI.getDashboard(),
        adminAPI.getPendingMemberships()
      ]);
      
      setStats({
        total_users: dashboardData.total_users || 0,
        total_books: dashboardData.total_books || 0,
        active_borrowings: dashboardData.active_borrowings || 0,
        overdue_borrowings: dashboardData.overdue_borrowings || 0,
        pending_memberships: dashboardData.pending_memberships || 0,
        revenue_last_30_days: dashboardData.revenue_last_30_days || 0
      });
      
      // Fetch overdue borrowings
      const overdueResponse = await adminAPI.getAllBorrowings(1, 10);
      const overdue = overdueResponse.borrowings?.filter(b => b.status === 'overdue') || [];
      setOverdueBorrowings(overdue);
      
      setPendingMemberships(pendingData || []);
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

  const statCards = stats ? [
    { label: 'Total Members', value: stats.total_users, sub: 'Active users', icon: FaUsers, color: 'bg-blue-500' },
    { label: 'Books Available', value: stats.total_books, sub: 'In catalogue', icon: FaBook, color: 'bg-green-500' },
    { label: 'Active Borrowings', value: stats.active_borrowings, sub: 'Currently borrowed', icon: FaExchangeAlt, color: 'bg-amber-500' },
    { label: 'Overdue Books', value: stats.overdue_borrowings, sub: `NPR ${stats.revenue_last_30_days?.toFixed(2) || '0'} in fines`, icon: FaExclamationTriangle, color: 'bg-red-500' },
    { label: 'Pending Memberships', value: stats.pending_memberships, sub: 'Awaiting approval', icon: FaCreditCard, color: 'bg-purple-500' },
    { label: 'Revenue (30d)', value: `NPR ${stats.revenue_last_30_days?.toFixed(0) || '0'}`, sub: 'From fines', icon: FaCreditCard, color: 'bg-emerald-500' },
  ] : [];

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
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
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold text-[#2C1F14]">Admin Dashboard</h1>
        <p className="text-[#9A8478] mt-1">System overview and management</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        {statCards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="bg-white rounded-xl shadow-sm border border-[#EAE0D0] p-4">
              <div className={`w-8 h-8 ${stat.color} rounded-lg flex items-center justify-center mb-3`}>
                <Icon className="text-white text-sm" />
              </div>
              <div className="text-2xl font-serif font-bold text-[#2C1F14]">{stat.value}</div>
              <div className="text-xs text-[#9A8478] mt-0.5">{stat.label}</div>
              <div className="text-xs text-[#9A8478]">{stat.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overdue Borrowings */}
        <div className="bg-white rounded-xl shadow-sm border border-[#EAE0D0] p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-serif text-xl font-bold text-[#2C1F14]">Overdue Borrowings</h2>
            <Link to="/admin/borrowings" className="text-[#C4895A] text-sm hover:underline">View all</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-[#EAE0D0]">
                <tr className="text-left text-[#9A8478]">
                  <th className="pb-2 font-semibold">Member</th>
                  <th className="pb-2 font-semibold">Book</th>
                  <th className="pb-2 font-semibold">Due Date</th>
                  <th className="pb-2 font-semibold">Days Overdue</th>
                  <th className="pb-2 font-semibold">Fine</th>
                </tr>
              </thead>
              <tbody>
                {overdueBorrowings.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-6 text-center text-[#9A8478]">No overdue borrowings</td>
                  </tr>
                ) : (
                  overdueBorrowings.slice(0, 5).map((item) => {
                    const daysOverdue = item.days_overdue || Math.max(0, Math.floor((new Date() - new Date(item.due_date)) / (1000 * 60 * 60 * 24)));
                    const fine = item.current_fine || (daysOverdue * 5).toFixed(2);
                    
                    return (
                      <tr key={item.borrow_id} className="border-b border-[#EAE0D0] last:border-0">
                        <td className="py-3 text-[#2C1F14]">{item.user_name || item.member_name}</td>
                        <td className="py-3 text-[#2C1F14]">{item.book_title}</td>
                        <td className="py-3 text-[#4A3728]">{formatDate(item.due_date)}</td>
                        <td className="py-3">
                          <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full">{daysOverdue} days</span>
                        </td>
                        <td className="py-3 text-red-600 font-medium">NPR {fine}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
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
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      item.payment_status === 'paid' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {item.payment_status === 'paid' ? 'Paid' : 'Pending'}
                    </span>
                    <button 
                      onClick={() => handleApproveMembership(item.membership_id)}
                      className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
                      title="Approve"
                    >
                      <FaCheck size={12} />
                    </button>
                    <button 
                      onClick={() => handleRejectMembership(item.membership_id)}
                      className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                      title="Reject"
                    >
                      <FaTimes size={12} />
                    </button>
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