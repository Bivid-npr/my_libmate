// src/pages/admin/BookRequestsPage.jsx
import React, { useState, useEffect } from 'react';
import { FaCheck, FaTimes, FaSearch, FaBook, FaUser, FaCalendar, FaEnvelope, FaFilter, FaTimesCircle } from 'react-icons/fa';
import { adminAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';

const BookRequestsPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending'); // pending, approved, rejected, all
  const [searchTerm, setSearchTerm] = useState('');
  const { showToast } = useToast();

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const data = await adminAPI.getBookRequests(filter === 'all' ? null : filter);
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching book requests:', error);
      showToast('Failed to load book requests', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId, title) => {
    if (!window.confirm(`Approve request for "${title}"?`)) return;
    
    try {
      await adminAPI.approveBookRequest(requestId);
      showToast('Book request approved! User will be notified.', 'success');
      fetchRequests();
    } catch (error) {
      showToast(error.message || 'Failed to approve request', 'error');
    }
  };

  const handleReject = async (requestId, title) => {
    if (!window.confirm(`Are you sure you want to reject "${title}"?`)) return;
    
    try {
      await adminAPI.rejectBookRequest(requestId);
      showToast('Book request rejected. User will be notified.', 'success');
      fetchRequests();
    } catch (error) {
      showToast(error.message || 'Failed to reject request', 'error');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      approved: 'bg-green-100 text-green-700 border-green-200',
      rejected: 'bg-red-100 text-red-700 border-red-200'
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${styles[status] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
        {status === 'pending' && <FaFilter size={10} />}
        {status === 'approved' && <FaCheck size={10} />}
        {status === 'rejected' && <FaTimesCircle size={10} />}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const filteredRequests = requests.filter(req => 
    req.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.author?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-[#EAE0D0] p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Status Filter Buttons */}
          <div className="flex gap-2 flex-wrap">
            {[
              { value: 'pending', label: 'Pending' },
              { value: 'approved', label: 'Approved' },
              { value: 'rejected', label: 'Rejected' },
              { value: 'all', label: 'All Requests' }
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  filter === value
                    ? 'bg-[#2C1F14] text-white shadow-md'
                    : 'bg-[#F3EDE3] text-[#4A3728] hover:bg-[#EAE0D0]'
                }`}
              >
                {label}
                {value === 'pending' && requests.filter(r => r.status === 'pending').length > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center bg-[#C4895A] text-white text-xs rounded-full w-5 h-5">
                    {requests.filter(r => r.status === 'pending').length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="flex-1 relative">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9A8478]" />
            <input
              type="text"
              placeholder="Search by title, author, or requester..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[#EAE0D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C4895A] text-sm"
            />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { 
            label: 'Pending', 
            count: requests.filter(r => r.status === 'pending').length,
            icon: FaFilter, 
            color: 'bg-yellow-500' 
          },
          { 
            label: 'Approved', 
            count: requests.filter(r => r.status === 'approved').length,
            icon: FaCheck, 
            color: 'bg-green-500' 
          },
          { 
            label: 'Total Requests', 
            count: requests.length,
            icon: FaBook, 
            color: 'bg-blue-500' 
          }
        ].map((stat, idx) => (
          <div key={idx} className="bg-white rounded-xl shadow-sm border border-[#EAE0D0] p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center`}>
                <stat.icon className="text-white text-sm" />
              </div>
              <div>
                <div className="text-2xl font-bold text-[#2C1F14]">{stat.count}</div>
                <div className="text-xs text-[#9A8478]">{stat.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Requests List */}
      <div className="bg-white rounded-xl shadow-sm border border-[#EAE0D0] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-[#C4895A] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-[#F3EDE3] rounded-full flex items-center justify-center mx-auto mb-4">
              <FaBook className="text-[#9A8478] text-2xl" />
            </div>
            <h3 className="font-serif text-lg font-bold text-[#2C1F14] mb-2">No requests found</h3>
            <p className="text-[#9A8478] text-sm max-w-md mx-auto">
              {filter === 'pending' 
                ? 'No pending book requests at this time. Check back later.'
                : `No ${filter} requests match your search.`}
            </p>
          </div>
        ) : (
          <div className="space-y-4 p-4">
            {filteredRequests.map((request) => (
              <div 
                key={request.request_id} 
                className="bg-[#FAF7F2] rounded-xl p-5 border border-[#EAE0D0] hover:border-[#C4895A]/30 transition-all"
              >
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  {/* Book Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3 mb-2">
                      <div className="w-10 h-10 bg-gradient-to-br from-[#2C1F14] to-[#4A3728] rounded-lg flex items-center justify-center flex-shrink-0">
                        <FaBook className="text-white text-sm" />
                      </div>
                      <div>
                        <h3 className="font-serif text-lg font-bold text-[#2C1F14] leading-tight">
                          {request.title}
                        </h3>
                        {request.author && (
                          <p className="text-sm text-[#9A8478]">by {request.author}</p>
                        )}
                        {request.genre && (
                          <span className="inline-block mt-1 px-2 py-0.5 bg-[#EAE0D0] text-[#6B4F40] text-xs rounded-full">
                            {request.genre}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Reason */}
                    {request.reason && (
                      <div className="ml-13 mb-3 p-3 bg-white rounded-lg border border-[#EAE0D0]">
                        <p className="text-xs text-[#9A8478] uppercase tracking-wide mb-1 font-medium">Reason for Request</p>
                        <p className="text-sm text-[#4A3728] leading-relaxed italic">
                          "{request.reason}"
                        </p>
                      </div>
                    )}

                    {/* Requester Info */}
                    <div className="ml-13 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#9A8478]">
                      <div className="flex items-center gap-1">
                        <FaUser size={11} />
                        <span className="font-medium text-[#4A3728]">{request.full_name}</span>
                      </div>
                      {request.email && (
                        <div className="flex items-center gap-1">
                          <FaEnvelope size={11} />
                          <span>{request.email}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <FaCalendar size={11} />
                        <span>Requested: {formatDate(request.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status & Actions */}
                  <div className="flex lg:flex-col items-center gap-3 flex-shrink-0">
                    {getStatusBadge(request.status)}
                    
                    {request.status === 'pending' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleApprove(request.request_id, request.title)}
                          className="flex items-center gap-1.5 px-4 py-2 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600 transition shadow-sm"
                          title="Approve this request"
                        >
                          <FaCheck size={12} />
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(request.request_id, request.title)}
                          className="flex items-center gap-1.5 px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition shadow-sm"
                          title="Reject this request"
                        >
                          <FaTimes size={12} />
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Banner */}
      <div className="mt-6 p-4 bg-[#C4895A]/5 border border-[#C4895A]/20 rounded-xl">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-[#C4895A]/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <FaBook className="text-[#C4895A] text-sm" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-[#C4895A] mb-1">About Book Requests</h4>
            <p className="text-xs text-[#9A8478]">
              Users can submit book purchase requests from the Catalogue page. When you approve a request, the user will be notified.
              Consider checking if the book is already available in the library before approving.
              You can then add the book to the catalogue through the{' '}
              <a href="/admin/books" className="text-[#C4895A] hover:underline">Manage Books</a> page.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookRequestsPage;