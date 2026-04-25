// src/pages/admin/BorrowingsPage.jsx
import React, { useState, useEffect } from 'react';
import { FaUndo, FaCheck, FaTimes, FaClock, FaBookOpen, FaList, FaArrowLeft } from 'react-icons/fa';
import { adminAPI, borrowingsAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';

const BorrowingsPage = () => {
  const [borrowings, setBorrowings] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [queueBooks, setQueueBooks] = useState([]);
  const [selectedBookQueue, setSelectedBookQueue] = useState(null);
  const [viewingQueue, setViewingQueue] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('borrowings');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const { showToast } = useToast();

  useEffect(() => {
    if (activeTab === 'borrowings' || activeTab === 'renewals') {
      fetchBorrowings();
    } else if (activeTab === 'pickups') {
      fetchPickups();
    } else if (activeTab === 'queue') {
      fetchQueue();
    }
  }, [filter, page, activeTab]);

  const fetchBorrowings = async () => {
    setLoading(true);
    try {
      const status = filter === 'all' ? null : filter;
      const data = await adminAPI.getAllBorrowings(page, status);
      setBorrowings(data.borrowings || []);
    } catch (error) { showToast('Failed to load borrowings', 'error'); }
    finally { setLoading(false); }
  };

  const fetchPickups = async () => {
    setLoading(true);
    try {
      const data = await borrowingsAPI.getAllReservations();
      setReservations(data || []);
    } catch (error) { showToast('Failed to load pickup reservations', 'error'); }
    finally { setLoading(false); }
  };

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const data = await borrowingsAPI.getReservationQueue();
      setQueueBooks(data || []);
    } catch (error) { showToast('Failed to load reservation queue', 'error'); }
    finally { setLoading(false); }
  };

  const viewBookQueue = async (bookId) => {
    setLoading(true);
    try {
      const data = await borrowingsAPI.getBookReservationQueue(bookId);
      setSelectedBookQueue(data || []);
      setViewingQueue(true);
    } catch (error) { showToast('Failed to load book queue', 'error'); }
    finally { setLoading(false); }
  };

  const handleApproveRenewal = async (borrowId) => {
    try { await adminAPI.approveRenewal(borrowId); showToast('Renewal approved', 'success'); fetchBorrowings(); }
    catch (error) { showToast(error.message || 'Failed to approve renewal', 'error'); }
  };

  const handleRejectRenewal = async (borrowId) => {
    try { await adminAPI.rejectRenewal(borrowId); showToast('Renewal rejected', 'success'); fetchBorrowings(); }
    catch (error) { showToast(error.message || 'Failed to reject renewal', 'error'); }
  };

  const handleConfirmPickup = async (reservationId) => {
    if (!window.confirm('Confirm that the member has arrived to pick up this book?')) return;
    try {
      await adminAPI.confirmPickup(reservationId);
      showToast('Book issued successfully!', 'success');
      if (viewingQueue) {
        setSelectedBookQueue(prev => prev.filter(r => r.reservation_id !== reservationId));
        fetchQueue();
      } else {
        fetchPickups();
      }
    } catch (error) { showToast(error.message || 'Failed to confirm pickup', 'error'); }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const tabs = [
    { id: 'borrowings', label: 'Active Borrowings', icon: FaBookOpen },
    { id: 'pickups', label: 'Pending Pickups', icon: FaClock },
    { id: 'queue', label: 'Reservation Queue', icon: FaList },
    { id: 'renewals', label: 'Renewal Requests', icon: FaUndo },
  ];

  const renewalRequests = borrowings.filter(b => b.renewal_requested && b.renewal_status === 'pending');

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold text-[#2C1F14]">Manage Borrowings</h1>
        <p className="text-[#9A8478] mt-1">Track borrowings, process pickups, manage queue, and handle renewals</p>
      </div>

      <div className="flex gap-1 border-b border-[#EAE0D0] mb-6 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const count = tab.id === 'borrowings' ? borrowings.length : 
                       tab.id === 'pickups' ? reservations.length : 
                       tab.id === 'queue' ? queueBooks.length :
                       renewalRequests.length;
          return (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); setViewingQueue(false); setPage(1); }}
              className={`px-6 py-3 text-sm font-medium transition-all duration-200 whitespace-nowrap flex items-center gap-2 ${activeTab === tab.id ? 'text-[#C4895A] border-b-2 border-[#C4895A]' : 'text-[#9A8478] hover:text-[#4A3728]'}`}>
              <Icon size={14} />{tab.label} ({count})
            </button>
          );
        })}
      </div>

      {activeTab === 'borrowings' && (
        <div className="bg-white rounded-xl shadow-sm border border-[#EAE0D0] p-4 mb-6">
          <div className="flex gap-2 flex-wrap">
            {['all', 'borrowed', 'overdue', 'returned'].map((f) => (
              <button key={f} onClick={() => { setFilter(f); setPage(1); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${filter === f ? 'bg-[#C4895A] text-white' : 'bg-[#F3EDE3] text-[#4A3728] hover:bg-[#EAE0D0]'}`}>{f}</button>
            ))}
          </div>
        </div>
      )}

      {/* Active Borrowings */}
      {activeTab === 'borrowings' && (
        <div className="bg-white rounded-xl shadow-sm border border-[#EAE0D0] overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-[#C4895A] border-t-transparent rounded-full animate-spin"></div></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#F3EDE3] border-b border-[#EAE0D0]">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-bold uppercase">Member</th>
                    <th className="text-left py-3 px-4 text-xs font-bold uppercase">Book</th>
                    <th className="text-left py-3 px-4 text-xs font-bold uppercase">Issued</th>
                    <th className="text-left py-3 px-4 text-xs font-bold uppercase">Due</th>
                    <th className="text-left py-3 px-4 text-xs font-bold uppercase">Status</th>
                    <th className="text-left py-3 px-4 text-xs font-bold uppercase">Renewals</th>
                    <th className="text-left py-3 px-4 text-xs font-bold uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAE0D0]">
                  {borrowings.length === 0 ? (
                    <tr><td colSpan="7" className="py-8 text-center text-[#9A8478]">No borrowings found</td></tr>
                  ) : (
                    borrowings.map((b) => (
                      <tr key={b.borrow_id} className="hover:bg-[#FAF7F2] transition">
                        <td className="py-3 px-4"><div className="font-medium text-[#2C1F14]">{b.user_name}</div><div className="text-xs text-[#9A8478]">{b.email}</div></td>
                        <td className="py-3 px-4 text-[#2C1F14]">{b.book_title}</td>
                        <td className="py-3 px-4 text-[#4A3728] text-sm">{formatDate(b.issued_at)}</td>
                        <td className="py-3 px-4 text-[#4A3728] text-sm">{formatDate(b.due_date)}</td>
                        <td className="py-3 px-4">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            b.status === 'borrowed' ? 'bg-blue-100 text-blue-700' : b.status === 'overdue' ? 'bg-red-100 text-red-700' :
                            b.status === 'renewed' ? 'bg-purple-100 text-purple-700' : b.status === 'returned' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                          }`}>{b.status}</span>
                        </td>
                        <td className="py-3 px-4 text-sm text-[#4A3728] text-center">{b.renewal_count || 0} / 3</td>
                        <td className="py-3 px-4">
                          {b.renewal_requested && b.renewal_status === 'pending' ? (
                            <div className="flex items-center gap-2">
                              <button onClick={() => handleApproveRenewal(b.borrow_id)} className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600" title="Approve"><FaCheck size={12} /></button>
                              <button onClick={() => handleRejectRenewal(b.borrow_id)} className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600" title="Reject"><FaTimes size={12} /></button>
                            </div>
                          ) : (<span className="text-xs text-[#9A8478]">—</span>)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Pending Pickups */}
      {activeTab === 'pickups' && (
        <div className="bg-white rounded-xl shadow-sm border border-[#EAE0D0] overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-[#C4895A] border-t-transparent rounded-full animate-spin"></div></div>
          ) : reservations.length === 0 ? (
            <div className="text-center py-12"><FaClock className="text-5xl text-[#C4895A]/30 mx-auto mb-4" /><p className="text-[#9A8478]">No pending pickup reservations</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#F3EDE3] border-b border-[#EAE0D0]">
                  <tr><th className="text-left py-3 px-4 text-xs font-bold uppercase">Member</th><th className="text-left py-3 px-4 text-xs font-bold uppercase">Book</th><th className="text-left py-3 px-4 text-xs font-bold uppercase">Reserved</th><th className="text-left py-3 px-4 text-xs font-bold uppercase">Expires</th><th className="text-left py-3 px-4 text-xs font-bold uppercase">Time Left</th><th className="text-left py-3 px-4 text-xs font-bold uppercase">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-[#EAE0D0]">
                  {reservations.map((res) => {
                    const expiresAt = res.expires_at ? new Date(res.expires_at) : null;
                    const now = new Date();
                    const timeLeft = expiresAt ? Math.max(0, Math.floor((expiresAt - now) / (1000 * 60 * 60))) : null;
                    return (
                      <tr key={res.reservation_id} className="hover:bg-[#FAF7F2] transition">
                        <td className="py-3 px-4"><div className="font-medium text-[#2C1F14]">{res.full_name || `User #${res.user_id}`}</div><div className="text-xs text-[#9A8478]">{res.email}</div></td>
                        <td className="py-3 px-4 text-[#2C1F14]">{res.title}</td>
                        <td className="py-3 px-4 text-[#4A3728] text-sm">{formatDateTime(res.reserved_at)}</td>
                        <td className="py-3 px-4 text-[#4A3728] text-sm">{expiresAt ? formatDateTime(res.expires_at) : 'No expiry'}</td>
                        <td className="py-3 px-4">
                          {expiresAt ? (
                            <span className={`text-xs px-2 py-1 rounded-full ${timeLeft < 6 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{timeLeft > 0 ? `${timeLeft}h remaining` : 'Expired'}</span>
                          ) : (
                            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">Waitlist</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <button onClick={() => handleConfirmPickup(res.reservation_id)} className="px-3 py-1.5 bg-[#C4895A] text-white text-xs rounded-lg hover:bg-[#D4A574] transition">Confirm Pickup</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Reservation Queue */}
      {activeTab === 'queue' && (
        <div>
          {viewingQueue && selectedBookQueue ? (
            <div>
              <button onClick={() => setViewingQueue(false)} className="flex items-center gap-2 text-[#C4895A] hover:underline mb-4 text-sm"><FaArrowLeft size={12} /> Back to Queue</button>
              <div className="bg-white rounded-xl shadow-sm border border-[#EAE0D0] p-6 mb-4">
                <h3 className="font-serif text-lg font-bold text-[#2C1F14]">{selectedBookQueue[0]?.title || 'Book'} - Reservation Queue</h3>
                <p className="text-sm text-[#9A8478]">{selectedBookQueue.length} user{selectedBookQueue.length !== 1 ? 's' : ''} waiting</p>
              </div>
              <div className="space-y-2">
                {selectedBookQueue.map((user) => (
                  <div key={user.reservation_id} className="bg-white rounded-lg border border-[#EAE0D0] p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="w-8 h-8 bg-[#C4895A] text-white rounded-full flex items-center justify-center text-sm font-bold">{user.queue_position}</span>
                      <div>
                        <div className="font-medium text-[#2C1F14]">{user.full_name}</div>
                        <div className="text-xs text-[#9A8478]">{user.email} · {user.phone || 'No phone'}</div>
                        <div className="text-xs text-[#9A8478] mt-1">Reserved: {new Date(user.reserved_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <button onClick={() => handleConfirmPickup(user.reservation_id)} className="px-3 py-1.5 bg-[#C4895A] text-white text-xs rounded-lg hover:bg-[#D4A574] transition">Confirm Pickup</button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-[#EAE0D0] overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-[#C4895A] border-t-transparent rounded-full animate-spin"></div></div>
              ) : queueBooks.length === 0 ? (
                <div className="text-center py-12"><FaList className="text-5xl text-[#C4895A]/30 mx-auto mb-4" /><p className="text-[#9A8478]">No books with pending reservations</p></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#F3EDE3] border-b border-[#EAE0D0]">
                      <tr><th className="text-left py-3 px-4 text-xs font-bold uppercase">Book</th><th className="text-left py-3 px-4 text-xs font-bold uppercase">Author</th><th className="text-left py-3 px-4 text-xs font-bold uppercase">Available</th><th className="text-left py-3 px-4 text-xs font-bold uppercase">Queue</th><th className="text-left py-3 px-4 text-xs font-bold uppercase">First Reserved</th><th className="text-left py-3 px-4 text-xs font-bold uppercase">Actions</th></tr>
                    </thead>
                    <tbody className="divide-y divide-[#EAE0D0]">
                      {queueBooks.map((book) => (
                        <tr key={book.book_id} className="hover:bg-[#FAF7F2] transition cursor-pointer" onClick={() => viewBookQueue(book.book_id)}>
                          <td className="py-3 px-4 font-medium text-[#2C1F14]">{book.title}</td>
                          <td className="py-3 px-4 text-[#4A3728] text-sm">{book.author}</td>
                          <td className="py-3 px-4"><span className={`text-xs px-2 py-1 rounded-full ${book.available_copies > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{book.available_copies}/{book.total_copies}</span></td>
                          <td className="py-3 px-4 text-center font-medium text-[#C4895A]">{book.queue_count}</td>
                          <td className="py-3 px-4 text-[#4A3728] text-sm">{new Date(book.earliest_reservation).toLocaleDateString()}</td>
                          <td className="py-3 px-4"><button onClick={(e) => { e.stopPropagation(); viewBookQueue(book.book_id); }} className="text-[#C4895A] hover:underline text-sm">View Queue →</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Renewal Requests */}
      {activeTab === 'renewals' && (
        <div className="bg-white rounded-xl shadow-sm border border-[#EAE0D0] overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-[#C4895A] border-t-transparent rounded-full animate-spin"></div></div>
          ) : renewalRequests.length === 0 ? (
            <div className="text-center py-12"><FaUndo className="text-5xl text-[#C4895A]/30 mx-auto mb-4" /><p className="text-[#9A8478]">No pending renewal requests</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#F3EDE3] border-b border-[#EAE0D0]">
                  <tr><th className="text-left py-3 px-4 text-xs font-bold uppercase">Member</th><th className="text-left py-3 px-4 text-xs font-bold uppercase">Book</th><th className="text-left py-3 px-4 text-xs font-bold uppercase">Due Date</th><th className="text-left py-3 px-4 text-xs font-bold uppercase">Renewals</th><th className="text-left py-3 px-4 text-xs font-bold uppercase">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-[#EAE0D0]">
                  {renewalRequests.map((b) => (
                    <tr key={b.borrow_id} className="hover:bg-[#FAF7F2] transition">
                      <td className="py-3 px-4"><div className="font-medium text-[#2C1F14]">{b.user_name}</div><div className="text-xs text-[#9A8478]">{b.email}</div></td>
                      <td className="py-3 px-4 text-[#2C1F14]">{b.book_title}</td>
                      <td className="py-3 px-4 text-[#4A3728] text-sm">{formatDate(b.due_date)}</td>
                      <td className="py-3 px-4 text-[#4A3728] text-center">{b.renewal_count || 0} / 3</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleApproveRenewal(b.borrow_id)} className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600" title="Approve"><FaCheck size={12} /></button>
                          <button onClick={() => handleRejectRenewal(b.borrow_id)} className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600" title="Reject"><FaTimes size={12} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BorrowingsPage;