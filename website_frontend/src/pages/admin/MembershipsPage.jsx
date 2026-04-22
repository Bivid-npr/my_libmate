// src/pages/admin/MembershipsPage.jsx
import React, { useState, useEffect } from 'react';
import { FaCheck, FaTimes, FaSearch, FaEye, FaReceipt, FaUser, FaEnvelope, FaPhone, FaMapMarker, FaCalendar, FaCreditCard } from 'react-icons/fa';
import { adminAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';

const MembershipsPage = () => {
  const [memberships, setMemberships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMembership, setSelectedMembership] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [approving, setApproving] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    fetchMemberships();
  }, [filter]);

  const fetchMemberships = async () => {
    setLoading(true);
    try {
      const data = await adminAPI.getPendingMemberships();
      setMemberships(data || []);
    } catch (error) {
      showToast('Failed to load memberships', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (membership) => {
    setSelectedMembership(membership);
    setShowDetailModal(true);
  };

  const handleApprove = async () => {
    if (!selectedMembership) return;
    
    const duration = prompt('Enter membership duration in months (default 12):', '12');
    if (!duration) return;
    
    setApproving(true);
    try {
      await adminAPI.approveMembership(selectedMembership.membership_id, parseInt(duration));
      showToast('Membership approved successfully!', 'success');
      setShowDetailModal(false);
      setSelectedMembership(null);
      fetchMemberships();
    } catch (error) {
      showToast(error.message || 'Failed to approve membership', 'error');
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!selectedMembership) return;
    
    const reason = prompt('Reason for rejection (optional):');
    if (reason === null) return; // User cancelled
    
    try {
      await adminAPI.rejectMembership(selectedMembership.membership_id);
      showToast('Membership rejected', 'success');
      setShowDetailModal(false);
      setSelectedMembership(null);
      fetchMemberships();
    } catch (error) {
      showToast(error.message || 'Failed to reject membership', 'error');
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

  const filteredMemberships = memberships.filter(m => 
    m.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold text-[#2C1F14]">Manage Memberships</h1>
        <p className="text-[#9A8478] mt-1">Review and process membership applications</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-[#EAE0D0] p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex gap-2">
            <button 
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === 'pending' ? 'bg-[#C4895A] text-white' : 'bg-[#F3EDE3] text-[#4A3728] hover:bg-[#EAE0D0]'
              }`}
            >
              Pending
            </button>
            <button 
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === 'all' ? 'bg-[#C4895A] text-white' : 'bg-[#F3EDE3] text-[#4A3728] hover:bg-[#EAE0D0]'
              }`}
            >
              All
            </button>
          </div>
          <div className="flex-1 relative">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9A8478]" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[#EAE0D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C4895A]"
            />
          </div>
        </div>
      </div>

      {/* Memberships Table */}
      <div className="bg-white rounded-xl shadow-sm border border-[#EAE0D0] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-[#C4895A] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#F3EDE3] border-b border-[#EAE0D0]">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-bold text-[#2C1F14] uppercase tracking-wide">Member</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-[#2C1F14] uppercase tracking-wide">Duration</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-[#2C1F14] uppercase tracking-wide">Requested</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-[#2C1F14] uppercase tracking-wide">Payment</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-[#2C1F14] uppercase tracking-wide">Status</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-[#2C1F14] uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE0D0]">
                {filteredMemberships.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-[#9A8478]">
                      No membership requests found
                    </td>
                  </tr>
                ) : (
                  filteredMemberships.map((membership) => (
                    <tr key={membership.membership_id} className="hover:bg-[#FAF7F2] transition">
                      <td className="py-3 px-4">
                        <div className="font-medium text-[#2C1F14]">{membership.full_name}</div>
                        <div className="text-xs text-[#9A8478]">{membership.email}</div>
                      </td>
                      <td className="py-3 px-4 text-[#4A3728]">{membership.duration_months} months</td>
                      <td className="py-3 px-4 text-[#4A3728] text-sm">{formatDate(membership.requested_at)}</td>
                      <td className="py-3 px-4">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          membership.payment_status === 'paid' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {membership.payment_status || 'pending'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          membership.status === 'pending' 
                            ? 'bg-yellow-100 text-yellow-700' 
                            : membership.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {membership.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <button 
                          onClick={() => handleViewDetails(membership)}
                          className="p-2 bg-[#C4895A] text-white rounded-lg hover:bg-[#D4A574] transition"
                          title="View Details"
                        >
                          <FaEye size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Membership Detail Modal */}
      {showDetailModal && selectedMembership && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-serif text-2xl font-bold text-[#2C1F14]">Membership Application Review</h2>
                <button 
                  onClick={() => setShowDetailModal(false)}
                  className="text-[#9A8478] hover:text-[#2C1F14] transition"
                >
                  <FaTimes size={20} />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Member Info */}
                <div className="space-y-4">
                  <div className="bg-[#F3EDE3] rounded-xl p-4">
                    <h3 className="font-serif text-lg font-bold text-[#2C1F14] mb-3 flex items-center gap-2">
                      <FaUser className="text-[#C4895A]" />
                      Member Information
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        {selectedMembership.profile_picture ? (
                          <img 
                            src={`http://localhost:5000/uploads/photos/${selectedMembership.profile_picture}`}
                            alt={selectedMembership.full_name}
                            className="w-16 h-16 rounded-full object-cover border-2 border-[#C4895A]"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gradient-to-br from-[#2C1F14] to-[#4A3728] rounded-full flex items-center justify-center">
                            <span className="text-white text-xl font-semibold">
                              {selectedMembership.full_name?.charAt(0) || 'U'}
                            </span>
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-[#2C1F14] text-lg">{selectedMembership.full_name}</p>
                          <p className="text-sm text-[#9A8478] flex items-center gap-1">
                            <FaEnvelope size={12} /> {selectedMembership.email}
                          </p>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-[#EAE0D0]">
                        <p className="text-sm text-[#4A3728] flex items-center gap-2">
                          <FaPhone size={12} className="text-[#9A8478]" />
                          {selectedMembership.phone || 'No phone provided'}
                        </p>
                        <p className="text-sm text-[#4A3728] flex items-center gap-2 mt-1">
                          <FaMapMarker size={12} className="text-[#9A8478]" />
                          {selectedMembership.address || 'No address provided'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#F3EDE3] rounded-xl p-4">
                    <h3 className="font-serif text-lg font-bold text-[#2C1F14] mb-3 flex items-center gap-2">
                      <FaCreditCard className="text-[#C4895A]" />
                      Membership Details
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-[#9A8478]">Duration</p>
                        <p className="font-semibold text-[#2C1F14]">{selectedMembership.duration_months} months</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#9A8478]">Amount</p>
                        <p className="font-semibold text-[#2C1F14]">
                          NPR {selectedMembership.duration_months === 3 ? '200' : 
                               selectedMembership.duration_months === 6 ? '500' : 
                               selectedMembership.duration_months === 12 ? '900' : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-[#9A8478]">Requested</p>
                        <p className="text-sm text-[#4A3728]">{formatDate(selectedMembership.requested_at)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#9A8478]">Payment Status</p>
                        <span className={`inline-block text-xs px-2 py-1 rounded-full ${
                          selectedMembership.payment_status === 'paid' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {selectedMembership.payment_status || 'pending'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Photo & Receipt */}
                <div className="space-y-4">
                  {/* Profile Photo Review */}
                  <div className="bg-[#F3EDE3] rounded-xl p-4">
                    <h3 className="font-serif text-lg font-bold text-[#2C1F14] mb-3">Profile Photo for Membership Card</h3>
                    <div className="flex justify-center">
                      {selectedMembership.profile_picture ? (
                        <img 
                          src={`http://localhost:5000/uploads/photos/${selectedMembership.profile_picture}`}
                          alt="Profile"
                          className="w-48 h-48 rounded-lg object-cover border-2 border-[#C4895A]"
                        />
                      ) : (
                        <div className="w-48 h-48 bg-gray-200 rounded-lg flex items-center justify-center">
                          <FaUser size={48} className="text-gray-400" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-center text-[#9A8478] mt-2">
                      This photo will appear on the membership card
                    </p>
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-xs text-yellow-700">
                        <strong>Admin Check:</strong> Verify this is a clear, front-facing photo suitable for a membership card.
                      </p>
                    </div>
                  </div>

                  {/* Payment Receipt */}
                  <div className="bg-[#F3EDE3] rounded-xl p-4">
                    <h3 className="font-serif text-lg font-bold text-[#2C1F14] mb-3 flex items-center gap-2">
                      <FaReceipt className="text-[#C4895A]" />
                      Payment Receipt
                    </h3>
                    {selectedMembership.payment_receipt ? (
                      <div className="text-center">
                        <a 
                          href={`http://localhost:5000/uploads/receipts/${selectedMembership.payment_receipt}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block"
                        >
                          <img 
                            src={`http://localhost:5000/uploads/receipts/${selectedMembership.payment_receipt}`}
                            alt="Payment Receipt"
                            className="max-h-64 rounded-lg border border-[#EAE0D0] mx-auto"
                          />
                        </a>
                        <a 
                          href={`http://localhost:5000/uploads/receipts/${selectedMembership.payment_receipt}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block mt-2 text-sm text-[#C4895A] hover:underline"
                        >
                          Click to view full size
                        </a>
                      </div>
                    ) : (
                      <p className="text-center text-[#9A8478] py-8">No receipt uploaded</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[#EAE0D0]">
                <button 
                  onClick={() => setShowDetailModal(false)}
                  className="px-6 py-2 border border-[#EAE0D0] rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleReject}
                  className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition flex items-center gap-2"
                >
                  <FaTimes size={14} />
                  Reject Application
                </button>
                <button 
                  onClick={handleApprove}
                  disabled={approving}
                  className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition flex items-center gap-2 disabled:opacity-50"
                >
                  <FaCheck size={14} />
                  {approving ? 'Approving...' : 'Approve Application'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Approve/Reject from table (optional) */}
      {selectedMembership && !showDetailModal && null}
    </div>
  );
};

export default MembershipsPage;