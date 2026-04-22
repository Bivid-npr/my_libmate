// src/pages/admin/BorrowingsPage.jsx
import React, { useState, useEffect } from 'react';
import { FaSearch, FaUndo, FaCheck, FaTimes } from 'react-icons/fa';
import { adminAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';

const BorrowingsPage = () => {
  const [borrowings, setBorrowings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const { showToast } = useToast();

  useEffect(() => {
    fetchBorrowings();
  }, [filter, page]);

  const fetchBorrowings = async () => {
    setLoading(true);
    try {
      const status = filter === 'all' ? null : filter;
      const data = await adminAPI.getAllBorrowings(page, status);
      setBorrowings(data.borrowings || []);
    } catch (error) {
      showToast('Failed to load borrowings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRenewal = async (borrowId) => {
    try {
      await adminAPI.approveRenewal(borrowId);
      showToast('Renewal approved', 'success');
      fetchBorrowings();
    } catch (error) {
      showToast(error.message || 'Failed to approve renewal', 'error');
    }
  };

  const handleRejectRenewal = async (borrowId) => {
    try {
      await adminAPI.rejectRenewal(borrowId);
      showToast('Renewal rejected', 'success');
      fetchBorrowings();
    } catch (error) {
      showToast(error.message || 'Failed to reject renewal', 'error');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold text-[#2C1F14]">Manage Borrowings</h1>
        <p className="text-[#9A8478] mt-1">Track and manage all book borrowings</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-[#EAE0D0] p-4 mb-6">
        <div className="flex gap-2">
          {['all', 'borrowed', 'overdue', 'returned'].map((f) => (
            <button key={f} onClick={() => { setFilter(f); setPage(1); }} className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${filter === f ? 'bg-[#C4895A] text-white' : 'bg-[#F3EDE3] text-[#4A3728] hover:bg-[#EAE0D0]'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Borrowings Table */}
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
                  <th className="text-left py-3 px-4 text-xs font-bold text-[#2C1F14] uppercase">Member</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-[#2C1F14] uppercase">Book</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-[#2C1F14] uppercase">Issued</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-[#2C1F14] uppercase">Due</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-[#2C1F14] uppercase">Status</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-[#2C1F14] uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE0D0]">
                {borrowings.length === 0 ? (
                  <tr><td colSpan="6" className="py-8 text-center text-[#9A8478]">No borrowings found</td></tr>
                ) : (
                  borrowings.map((b) => (
                    <tr key={b.borrow_id} className="hover:bg-[#FAF7F2] transition">
                      <td className="py-3 px-4">
                        <div className="font-medium text-[#2C1F14]">{b.user_name}</div>
                        <div className="text-xs text-[#9A8478]">{b.email}</div>
                      </td>
                      <td className="py-3 px-4 text-[#2C1F14]">{b.book_title}</td>
                      <td className="py-3 px-4 text-[#4A3728] text-sm">{formatDate(b.issued_at)}</td>
                      <td className="py-3 px-4 text-[#4A3728] text-sm">{formatDate(b.due_date)}</td>
                      <td className="py-3 px-4">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          b.status === 'borrowed' ? 'bg-blue-100 text-blue-700' :
                          b.status === 'overdue' ? 'bg-red-100 text-red-700' :
                          b.status === 'returned' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                        }`}>{b.status}</span>
                        {b.renewal_requested && <span className="ml-2 text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">Renewal</span>}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {b.renewal_requested && b.renewal_status === 'pending' && (
                            <>
                              <button onClick={() => handleApproveRenewal(b.borrow_id)} className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600" title="Approve"><FaCheck size={12} /></button>
                              <button onClick={() => handleRejectRenewal(b.borrow_id)} className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600" title="Reject"><FaTimes size={12} /></button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default BorrowingsPage;