// src/pages/admin/BorrowingsPage.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FaUndo, FaCheck, FaTimes, FaClock, FaBookOpen, FaList, FaArrowLeft, FaSearch } from 'react-icons/fa';
import { adminAPI, borrowingsAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';

const TableHeader = ({ columns }) => (
  <thead className="bg-[#F3EDE3] border-b border-[#EAE0D0]">
    <tr>{columns.map((col, i) => <th key={i} className="text-left py-3 px-4 text-xs font-bold text-[#2C1F14] uppercase whitespace-nowrap">{col}</th>)}</tr>
  </thead>
);

const EmptyState = ({ icon: Icon, message }) => (
  <div className="text-center py-12"><Icon className="text-5xl text-[#C4895A]/30 mx-auto mb-4" /><p className="text-[#9A8478]">{message}</p></div>
);

const Spinner = () => (
  <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-[#C4895A] border-t-transparent rounded-full animate-spin"></div></div>
);

const StatusBadge = ({ status }) => {
  const colors = { borrowed: 'bg-blue-100 text-blue-700', overdue: 'bg-red-100 text-red-700', renewed: 'bg-purple-100 text-purple-700', returned: 'bg-green-100 text-green-700' };
  return <span className={`text-xs px-2 py-1 rounded-full ${colors[status] || 'bg-gray-100 text-gray-700'}`}>{status}</span>;
};

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
  
  const [searchBorrowings, setSearchBorrowings] = useState('');
  const [searchPickups, setSearchPickups] = useState('');
  const [searchQueue, setSearchQueue] = useState('');
  const [searchRenewals, setSearchRenewals] = useState('');
  
  const { showToast } = useToast();

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const status = filter === 'all' ? null : filter;
      const [borrowingsRes, reservationsRes, queueRes] = await Promise.all([
        adminAPI.getAllBorrowings(page, status),
        borrowingsAPI.getAllReservations(),
        borrowingsAPI.getReservationQueue()
      ]);
      setBorrowings(borrowingsRes.borrowings || []);
      setReservations(reservationsRes || []);
      setQueueBooks(queueRes || []);
    } catch (error) { showToast('Failed to load data', 'error'); }
    finally { setLoading(false); }
  }, [filter, page, showToast]);

  useEffect(() => { fetchAllData(); }, [fetchAllData]);

  const viewBookQueue = async (bookId) => {
    setLoading(true);
    try {
      const res = await borrowingsAPI.getBookReservationQueue(bookId);
      setSelectedBookQueue(res || []);
      setViewingQueue(true);
    } catch (error) { showToast('Failed to load book queue', 'error'); }
    finally { setLoading(false); }
  };

  const handleApproveRenewal = async (borrowId) => {
    try { await adminAPI.approveRenewal(borrowId); showToast('Renewal approved', 'success'); fetchAllData(); }
    catch (error) { showToast(error.message || 'Failed to approve', 'error'); }
  };

  const handleRejectRenewal = async (borrowId) => {
    try { await adminAPI.rejectRenewal(borrowId); showToast('Renewal rejected', 'success'); fetchAllData(); }
    catch (error) { showToast(error.message || 'Failed to reject', 'error'); }
  };

  const handleConfirmPickup = async (reservationId) => {
    if (!window.confirm('Confirm that the member has arrived to pick up this book?')) return;
    try {
      await adminAPI.confirmPickup(reservationId);
      showToast('Book issued successfully!', 'success');
      if (viewingQueue) setSelectedBookQueue(prev => prev.filter(r => r.reservation_id !== reservationId));
      fetchAllData();
    } catch (error) { showToast(error.message || 'Failed to confirm pickup', 'error'); }
  };

  const formatDate = (ds) => ds ? new Date(ds).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';
  const formatDateTime = (ds) => ds ? new Date(ds).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A';

  const renewalRequests = useMemo(() => 
    borrowings.filter(b => b.renewal_requested && b.renewal_status === 'pending'),
    [borrowings]
  );

  const filteredBorrowings = useMemo(() => {
    if (!searchBorrowings) return borrowings;
    const term = searchBorrowings.toLowerCase();
    return borrowings.filter(b =>
      b.user_name?.toLowerCase().includes(term) ||
      b.email?.toLowerCase().includes(term) ||
      b.book_title?.toLowerCase().includes(term) ||
      b.author?.toLowerCase().includes(term)
    );
  }, [borrowings, searchBorrowings]);

  const filteredPickups = useMemo(() => {
    if (!searchPickups) return reservations;
    const term = searchPickups.toLowerCase();
    return reservations.filter(r =>
      r.full_name?.toLowerCase().includes(term) ||
      r.email?.toLowerCase().includes(term) ||
      r.title?.toLowerCase().includes(term)
    );
  }, [reservations, searchPickups]);

  const filteredQueue = useMemo(() => {
    if (!searchQueue) return queueBooks;
    const term = searchQueue.toLowerCase();
    return queueBooks.filter(b =>
      b.title?.toLowerCase().includes(term) ||
      b.author?.toLowerCase().includes(term)
    );
  }, [queueBooks, searchQueue]);

  const filteredRenewals = useMemo(() => {
    if (!searchRenewals) return renewalRequests;
    const term = searchRenewals.toLowerCase();
    return renewalRequests.filter(b =>
      b.user_name?.toLowerCase().includes(term) ||
      b.email?.toLowerCase().includes(term) ||
      b.book_title?.toLowerCase().includes(term)
    );
  }, [renewalRequests, searchRenewals]);

  const tabs = [
    { id: 'borrowings', label: 'Active Borrowings', icon: FaBookOpen, count: borrowings.length },
    { id: 'pickups', label: 'Pending Pickups', icon: FaClock, count: reservations.length },
    { id: 'queue', label: 'Reservation Queue', icon: FaList, count: queueBooks.length },
    { id: 'renewals', label: 'Renewal Requests', icon: FaUndo, count: renewalRequests.length },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold text-[#2C1F14]">Manage Borrowings</h1>
        <p className="text-[#9A8478] mt-1">Track borrowings, process pickups, manage queue, and handle renewals</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#EAE0D0] mb-6 overflow-x-auto">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => { setActiveTab(tab.id); setViewingQueue(false); setPage(1); }}
            className={`px-6 py-3 text-sm font-medium transition-all duration-200 whitespace-nowrap flex items-center gap-2 ${activeTab === tab.id ? 'text-[#C4895A] border-b-2 border-[#C4895A]' : 'text-[#9A8478] hover:text-[#4A3728]'}`}>
            <tab.icon size={14} />{tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Search bars - ALWAYS RENDERED to prevent focus loss */}
      <div className="bg-white rounded-xl shadow-sm border border-[#EAE0D0] p-4 mb-6">
        {/* Active Borrowings search + filters */}
        {activeTab === 'borrowings' && (
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9A8478]" size={14} />
              <input
                type="text"
                placeholder="Search by member, email, or book..."
                value={searchBorrowings}
                onChange={(e) => setSearchBorrowings(e.target.value)}
                className="w-full pl-9 pr-9 py-2 border border-[#EAE0D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C4895A] text-sm"
              />
              {searchBorrowings && (
                <button onClick={() => setSearchBorrowings('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9A8478] hover:text-[#2C1F14]">
                  <FaTimes size={12} />
                </button>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              {['all', 'borrowed', 'overdue', 'returned'].map((f) => (
                <button key={f} onClick={() => { setFilter(f); setPage(1); }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition whitespace-nowrap ${filter === f ? 'bg-[#C4895A] text-white' : 'bg-[#F3EDE3] text-[#4A3728] hover:bg-[#EAE0D0]'}`}>{f}</button>
              ))}
            </div>
          </div>
        )}

        {/* Pickups search */}
        {activeTab === 'pickups' && (
          <div className="relative max-w-md">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9A8478]" size={14} />
            <input
              type="text"
              placeholder="Search by member name, email, or book title..."
              value={searchPickups}
              onChange={(e) => setSearchPickups(e.target.value)}
              className="w-full pl-9 pr-9 py-2 border border-[#EAE0D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C4895A] text-sm"
            />
            {searchPickups && (
              <button onClick={() => setSearchPickups('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9A8478] hover:text-[#2C1F14]">
                <FaTimes size={12} />
              </button>
            )}
          </div>
        )}

        {/* Queue search */}
        {activeTab === 'queue' && !viewingQueue && (
          <div className="relative max-w-md">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9A8478]" size={14} />
            <input
              type="text"
              placeholder="Search by book title or author..."
              value={searchQueue}
              onChange={(e) => setSearchQueue(e.target.value)}
              className="w-full pl-9 pr-9 py-2 border border-[#EAE0D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C4895A] text-sm"
            />
            {searchQueue && (
              <button onClick={() => setSearchQueue('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9A8478] hover:text-[#2C1F14]">
                <FaTimes size={12} />
              </button>
            )}
          </div>
        )}

        {/* Renewals search */}
        {activeTab === 'renewals' && (
          <div className="relative max-w-md">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9A8478]" size={14} />
            <input
              type="text"
              placeholder="Search by member name, email, or book..."
              value={searchRenewals}
              onChange={(e) => setSearchRenewals(e.target.value)}
              className="w-full pl-9 pr-9 py-2 border border-[#EAE0D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C4895A] text-sm"
            />
            {searchRenewals && (
              <button onClick={() => setSearchRenewals('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9A8478] hover:text-[#2C1F14]">
                <FaTimes size={12} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ========== ACTIVE BORROWINGS ========== */}
      {activeTab === 'borrowings' && (
        <div className="bg-white rounded-xl shadow-sm border border-[#EAE0D0] overflow-hidden">
          {loading ? <Spinner /> : filteredBorrowings.length === 0 ? (
            <EmptyState icon={FaBookOpen} message={searchBorrowings ? "No borrowings match your search" : "No borrowings found"} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <TableHeader columns={['Member', 'Book', 'Issued', 'Due', 'Status', 'Renewals', 'Actions']} />
                <tbody className="divide-y divide-[#EAE0D0]">
                  {filteredBorrowings.map((b) => (
                    <tr key={b.borrow_id} className="hover:bg-[#FAF7F2] transition">
                      <td className="py-3 px-4"><div className="font-medium text-[#2C1F14]">{b.user_name}</div><div className="text-xs text-[#9A8478]">{b.email}</div></td>
                      <td className="py-3 px-4 text-[#2C1F14]">{b.book_title}</td>
                      <td className="py-3 px-4 text-[#4A3728] text-sm">{formatDate(b.issued_at)}</td>
                      <td className="py-3 px-4 text-[#4A3728] text-sm">{formatDate(b.due_date)}</td>
                      <td className="py-3 px-4"><StatusBadge status={b.status} /></td>
                      <td className="py-3 px-4 text-sm text-[#4A3728] text-center">{b.renewal_count || 0} / 3</td>
                      <td className="py-3 px-4">
                        {b.renewal_requested && b.renewal_status === 'pending' ? (
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleApproveRenewal(b.borrow_id)} className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600" title="Approve"><FaCheck size={12} /></button>
                            <button onClick={() => handleRejectRenewal(b.borrow_id)} className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600" title="Reject"><FaTimes size={12} /></button>
                          </div>
                        ) : <span className="text-xs text-[#9A8478]">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========== PENDING PICKUPS ========== */}
      {activeTab === 'pickups' && (
        <div className="bg-white rounded-xl shadow-sm border border-[#EAE0D0] overflow-hidden">
          {loading ? <Spinner /> : filteredPickups.length === 0 ? (
            <EmptyState icon={FaClock} message={searchPickups ? "No pickups match your search" : "No pending pickup reservations"} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <TableHeader columns={['Member', 'Book', 'Reserved', 'Expires', 'Time Left', 'Actions']} />
                <tbody className="divide-y divide-[#EAE0D0]">
                  {filteredPickups.map((res) => {
                    const expiresAt = res.expires_at ? new Date(res.expires_at) : null;
                    const timeLeft = expiresAt ? Math.max(0, Math.floor((expiresAt - new Date()) / 3600000)) : null;
                    return (
                      <tr key={res.reservation_id} className="hover:bg-[#FAF7F2] transition">
                        <td className="py-3 px-4"><div className="font-medium text-[#2C1F14]">{res.full_name || `User #${res.user_id}`}</div><div className="text-xs text-[#9A8478]">{res.email}</div></td>
                        <td className="py-3 px-4 text-[#2C1F14]">{res.title}</td>
                        <td className="py-3 px-4 text-[#4A3728] text-sm">{formatDateTime(res.reserved_at)}</td>
                        <td className="py-3 px-4 text-[#4A3728] text-sm">{expiresAt ? formatDateTime(res.expires_at) : 'No expiry'}</td>
                        <td className="py-3 px-4">
                          {expiresAt ? <span className={`text-xs px-2 py-1 rounded-full ${timeLeft < 6 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{timeLeft > 0 ? `${timeLeft}h remaining` : 'Expired'}</span> : <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">Waitlist</span>}
                        </td>
                        <td className="py-3 px-4"><button onClick={() => handleConfirmPickup(res.reservation_id)} className="px-3 py-1.5 bg-[#C4895A] text-white text-xs rounded-lg hover:bg-[#D4A574] transition">Confirm Pickup</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========== RESERVATION QUEUE ========== */}
      {activeTab === 'queue' && (
        <div>
          {viewingQueue && selectedBookQueue ? (
            <div>
              <button onClick={() => setViewingQueue(false)} className="flex items-center gap-2 text-[#C4895A] hover:underline mb-4 text-sm"><FaArrowLeft size={12} /> Back to Queue</button>
              <div className="bg-white rounded-xl shadow-sm border border-[#EAE0D0] p-6 mb-4"><h3 className="font-serif text-lg font-bold text-[#2C1F14]">{selectedBookQueue[0]?.title || 'Book'} - Reservation Queue</h3><p className="text-sm text-[#9A8478]">{selectedBookQueue.length} user{selectedBookQueue.length !== 1 ? 's' : ''} waiting</p></div>
              <div className="space-y-2">
                {selectedBookQueue.map((user) => (
                  <div key={user.reservation_id} className="bg-white rounded-lg border border-[#EAE0D0] p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4"><span className="w-8 h-8 bg-[#C4895A] text-white rounded-full flex items-center justify-center text-sm font-bold">{user.queue_position}</span><div><div className="font-medium text-[#2C1F14]">{user.full_name}</div><div className="text-xs text-[#9A8478]">{user.email} · {user.phone || 'No phone'}</div><div className="text-xs text-[#9A8478] mt-1">Reserved: {new Date(user.reserved_at).toLocaleDateString()}</div></div></div>
                    <button onClick={() => handleConfirmPickup(user.reservation_id)} className="px-3 py-1.5 bg-[#C4895A] text-white text-xs rounded-lg hover:bg-[#D4A574] transition">Confirm Pickup</button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-[#EAE0D0] overflow-hidden">
              {loading ? <Spinner /> : filteredQueue.length === 0 ? (
                <EmptyState icon={FaList} message={searchQueue ? "No books match your search" : "No books with pending reservations"} />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <TableHeader columns={['Book', 'Author', 'Available', 'Queue', 'First Reserved', 'Actions']} />
                    <tbody className="divide-y divide-[#EAE0D0]">
                      {filteredQueue.map((book) => (
                        <tr key={book.book_id} className="hover:bg-[#FAF7F2] transition cursor-pointer" onClick={() => viewBookQueue(book.book_id)}>
                          <td className="py-3 px-4 font-medium text-[#2C1F14]">{book.title}</td>
                          <td className="py-3 px-4 text-[#4A3728] text-sm">{book.author}</td>
                          <td className="py-3 px-4"><span className={`text-xs px-2 py-1 rounded-full ${book.available_copies > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{book.available_copies}/{book.total_copies}</span></td>
                          <td className="py-3 px-4 text-center font-medium text-[#C4895A]">{book.queue_count}</td>
                          <td className="py-3 px-4 text-[#4A3728] text-sm">{new Date(book.earliest_reservation).toLocaleDateString()}</td>
                          <td className="py-3 px-4"><button onClick={(e) => { e.stopPropagation(); viewBookQueue(book.book_id); }} className="text-[#C4895A] hover:underline text-sm">View Queue</button></td>
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

      {/* ========== RENEWAL REQUESTS ========== */}
      {activeTab === 'renewals' && (
        <div className="bg-white rounded-xl shadow-sm border border-[#EAE0D0] overflow-hidden">
          {loading ? <Spinner /> : filteredRenewals.length === 0 ? (
            <EmptyState icon={FaUndo} message={searchRenewals ? "No renewals match your search" : "No pending renewal requests"} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <TableHeader columns={['Member', 'Book', 'Due Date', 'Renewals', 'Actions']} />
                <tbody className="divide-y divide-[#EAE0D0]">
                  {filteredRenewals.map((b) => (
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