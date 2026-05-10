// src/pages/admin/BorrowingsPage.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FaUndo, FaCheck, FaTimes, FaClock, FaBookOpen, FaList, FaArrowLeft, FaSearch, FaUndoAlt, FaHistory, FaPlus, FaUser, FaChevronRight } from 'react-icons/fa';
import { adminAPI, borrowingsAPI, booksAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';

// ── Helpers ──────────────────────────────────────────────────

const parseDate = (d) => {
  if (!d) return null;
  let m = d.match(/(\d{4})-(\d{2})-(\d{2})[\sT](\d{2}):(\d{2})/);
  if (m) return new Date(m[1], m[2] - 1, m[3], m[4], m[5]);
  const months = { Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11 };
  const parts = d.split(' ');
  if (parts.length >= 5 && months[parts[2]] !== undefined) {
    const tm = parts[4].split(':');
    return new Date(parts[3], months[parts[2]], parts[1], tm[0], tm[1]);
  }
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? null : dt;
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';

const fmtDateTime = (d) => {
  const p = parseDate(d);
  return p ? p.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : 'N/A';
};

// ── Sub-components ───────────────────────────────────────────

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
  const c = { borrowed: 'bg-blue-100 text-blue-700', overdue: 'bg-red-100 text-red-700', renewed: 'bg-purple-100 text-purple-700' };
  return <span className={`text-xs px-2 py-1 rounded-full ${c[status] || 'bg-gray-100 text-gray-700'}`}>{status}</span>;
};

const ConditionBadge = ({ condition }) => {
  const c = { good: 'bg-green-100 text-green-700', damaged: 'bg-yellow-100 text-yellow-700', lost: 'bg-red-100 text-red-700' };
  return <span className={`text-xs px-2 py-1 rounded-full capitalize ${c[condition] || 'bg-gray-100 text-gray-700'}`}>{condition}</span>;
};

// ── Return Modal ─────────────────────────────────────────────

const ReturnModal = ({ borrow, onClose, onSuccess }) => {
  const [condition, setCondition] = useState('good');
  const [returning, setReturning] = useState(false);
  const { showToast } = useToast();
  if (!borrow) return null;

  const handleReturn = async () => {
    setReturning(true);
    try {
      await adminAPI.returnBook(borrow.borrow_id, condition);
      showToast(`"${borrow.book_title}" returned (${condition})`, 'success');
      onSuccess();
    } catch (e) { showToast(e.message, 'error'); }
    finally { setReturning(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-sm w-full">
        <div className="p-6">
          <h2 className="font-serif text-lg font-bold text-[#2C1F14] mb-2">Return Book</h2>
          <div className="text-sm text-[#9A8478] mb-4 space-y-1">
            <p><strong>{borrow.book_title}</strong></p>
            <p>Member: {borrow.user_name}</p>
            <p>Due: {new Date(borrow.due_date).toLocaleDateString()}</p>
          </div>
          <label className="block text-sm font-medium text-[#4A3728] mb-2">Condition</label>
          <div className="flex gap-2 mb-6">
            {['good', 'damaged', 'lost'].map(c => (
              <button key={c} onClick={() => setCondition(c)}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium capitalize transition ${condition === c ? 'bg-[#C4895A] text-white' : 'bg-[#F3EDE3] text-[#4A3728] hover:bg-[#EAE0D0]'}`}>{c}</button>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-[#EAE0D0] rounded-lg hover:bg-gray-50 text-sm">Cancel</button>
            <button onClick={handleReturn} disabled={returning} className="flex-1 px-4 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 text-sm font-medium">{returning ? 'Returning...' : 'Confirm Return'}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Manual Issue Modal ───────────────────────────────────────

const ManualIssueModal = ({ onClose, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [searchUser, setSearchUser] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchBook, setSearchBook] = useState('');
  const [books, setBooks] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [dueDays, setDueDays] = useState(14);
  const [issuing, setIssuing] = useState(false);
  const { showToast } = useToast();

  const searchUsers = async (term) => {
    setSearchUser(term);
    if (term.length < 2) { setUsers([]); return; }
    try { const r = await adminAPI.getAllUsers(1, term); setUsers(r.users?.filter(u => u.is_active && u.role === 'member') || []); } catch {}
  };

  const searchBooks = async (term) => {
    setSearchBook(term);
    if (term.length < 2) { setBooks([]); return; }
    try { const r = await booksAPI.getBooks({ search: term, per_page: 10 }); setBooks(r.books?.filter(b => b.available_copies > 0) || []); } catch {}
  };

  const handleIssue = async () => {
    if (!selectedUser || !selectedBook) return;
    setIssuing(true);
    try {
      await adminAPI.issueBook(selectedUser.user_id, selectedBook.book_id, dueDays);
      showToast(`"${selectedBook.title}" issued to ${selectedUser.full_name}`, 'success');
      onSuccess();
    } catch (e) { showToast(e.message, 'error'); }
    finally { setIssuing(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-y-auto">
        <div className="p-6 border-b border-[#EAE0D0]">
          <div className="flex justify-between items-center">
            <h2 className="font-serif text-lg font-bold text-[#2C1F14]">Issue Book</h2>
            <button onClick={onClose} className="text-[#9A8478] hover:text-[#2C1F14]"><FaTimes size={18} /></button>
          </div>
          <div className="flex items-center gap-2 mt-3">
            {['Member', 'Book', 'Confirm'].map((l, i) => (
              <React.Fragment key={l}>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${step >= i+1 ? 'bg-[#C4895A] text-white' : 'bg-[#EAE0D0] text-[#9A8478]'}`}>{l}</span>
                {i < 2 && <FaChevronRight size={10} className="text-[#9A8478]" />}
              </React.Fragment>
            ))}
          </div>
        </div>
        <div className="p-6">
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-sm text-[#9A8478]">Search for a library member</p>
              <div className="relative"><FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9A8478]" size={14} /><input type="text" placeholder="Type name or email..." value={searchUser} onChange={(e) => searchUsers(e.target.value)} className="w-full pl-9 pr-4 py-2.5 border border-[#EAE0D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C4895A] text-sm" autoFocus /></div>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {users.length === 0 && searchUser.length >= 2 && <p className="text-sm text-[#9A8478] text-center py-4">No members found</p>}
                {users.map(u => (
                  <button key={u.user_id} onClick={() => { setSelectedUser(u); setStep(2); }} className="w-full text-left p-3 rounded-lg hover:bg-[#F3EDE3] transition flex items-center justify-between">
                    <div><div className="font-medium text-[#2C1F14] text-sm">{u.full_name}</div><div className="text-xs text-[#9A8478]">{u.email} · {u.active_borrows || 0}/5</div></div>
                    <FaChevronRight size={12} className="text-[#9A8478]" />
                  </button>
                ))}
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-[#F3EDE3] rounded-lg"><FaUser size={14} className="text-[#C4895A]" /><span className="text-sm font-medium text-[#2C1F14]">{selectedUser?.full_name}</span><button onClick={() => setStep(1)} className="ml-auto text-xs text-[#C4895A] hover:underline">Change</button></div>
              <p className="text-sm text-[#9A8478]">Search for an available book</p>
              <div className="relative"><FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9A8478]" size={14} /><input type="text" placeholder="Type title or author..." value={searchBook} onChange={(e) => searchBooks(e.target.value)} className="w-full pl-9 pr-4 py-2.5 border border-[#EAE0D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C4895A] text-sm" autoFocus /></div>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {books.length === 0 && searchBook.length >= 2 && <p className="text-sm text-[#9A8478] text-center py-4">No available books</p>}
                {books.map(b => (
                  <button key={b.book_id} onClick={() => { setSelectedBook(b); setStep(3); }} className="w-full text-left p-3 rounded-lg hover:bg-[#F3EDE3] transition flex items-center justify-between">
                    <div><div className="font-medium text-[#2C1F14] text-sm">{b.title}</div><div className="text-xs text-[#9A8478]">{b.author} · {b.available_copies} available</div></div>
                    <FaChevronRight size={12} className="text-[#9A8478]" />
                  </button>
                ))}
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-4">
              <div className="p-4 bg-[#F3EDE3] rounded-xl space-y-3">
                <div className="flex items-center gap-3"><FaUser size={16} className="text-[#C4895A]" /><div><div className="font-medium text-[#2C1F14]">{selectedUser?.full_name}</div><div className="text-xs text-[#9A8478]">{selectedUser?.email}</div></div><button onClick={() => setStep(1)} className="ml-auto text-xs text-[#C4895A] hover:underline">Change</button></div>
                <hr className="border-[#EAE0D0]" />
                <div className="flex items-center gap-3"><FaBookOpen size={16} className="text-[#C4895A]" /><div><div className="font-medium text-[#2C1F14]">{selectedBook?.title}</div><div className="text-xs text-[#9A8478]">{selectedBook?.author}</div></div><button onClick={() => setStep(2)} className="ml-auto text-xs text-[#C4895A] hover:underline">Change</button></div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#4A3728] mb-1">Due Date</label>
                <select value={dueDays} onChange={(e) => setDueDays(parseInt(e.target.value))} className="w-full px-3 py-2 border border-[#EAE0D0] rounded-lg bg-white text-sm">
                  {[7, 14, 21, 30].map(d => <option key={d} value={d}>{d} days — due {new Date(Date.now() + d*86400000).toLocaleDateString('en-US', {month:'short', day:'numeric'})}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep(2)} className="flex-1 px-4 py-2.5 border border-[#EAE0D0] rounded-lg hover:bg-gray-50 transition text-sm font-medium">Back</button>
                <button onClick={handleIssue} disabled={issuing} className="flex-1 px-4 py-2.5 bg-[#C4895A] text-white rounded-lg hover:bg-[#D4A574] transition text-sm font-medium disabled:opacity-50">{issuing ? 'Issuing...' : 'Confirm & Issue'}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────

const BorrowingsPage = () => {
  const [borrowings, setBorrowings] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [queueBooks, setQueueBooks] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyCount, setHistoryCount] = useState(0);
  const [selectedBookQueue, setSelectedBookQueue] = useState(null);
  const [selectedQueueBook, setSelectedQueueBook] = useState(null);
  const [viewingQueue, setViewingQueue] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('borrowings');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [searchBorrowings, setSearchBorrowings] = useState('');
  const [searchPickups, setSearchPickups] = useState('');
  const [searchQueue, setSearchQueue] = useState('');
  const [searchRenewals, setSearchRenewals] = useState('');
  const [searchHistory, setSearchHistory] = useState('');
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [returnModal, setReturnModal] = useState(null);
  const { showToast } = useToast();

  useEffect(() => {
    (async () => { try { const r = await adminAPI.getBorrowHistory(1, ''); setHistoryCount(r.total || 0); } catch {} })();
  }, []);

  const fetchBorrowingsData = useCallback(async () => {
    setLoading(true);
    try {
      const s = filter === 'all' ? null : filter;
      const [b, r, q] = await Promise.all([adminAPI.getAllBorrowings(page, s), borrowingsAPI.getAllReservations(), borrowingsAPI.getReservationQueue()]);
      setBorrowings(b.borrowings || []); setReservations(r || []); setQueueBooks(q || []);
    } catch { showToast('Failed to load data', 'error'); }
    finally { setLoading(false); }
  }, [filter, page, showToast]);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try { const r = await adminAPI.getBorrowHistory(1, searchHistory); setHistory(r.history || []); setHistoryCount(r.total || 0); }
    catch { showToast('Failed to load history', 'error'); }
    finally { setLoading(false); }
  }, [searchHistory, showToast]);

  useEffect(() => { activeTab === 'history' ? fetchHistory() : fetchBorrowingsData(); }, [activeTab, fetchBorrowingsData, fetchHistory]);

  const viewBookQueue = async (bookId) => {
    setLoading(true);
    try {
      const queue = await borrowingsAPI.getBookReservationQueue(bookId) || [];
      setSelectedBookQueue(queue);
      setSelectedQueueBook(queueBooks.find(b => b.book_id === bookId));
      setViewingQueue(true);
    } catch { showToast('Failed to load queue', 'error'); }
    finally { setLoading(false); }
  };

  const handleConfirmPickup = async (reservationId) => {
    if (!window.confirm('Confirm pickup?')) return;
    try { await adminAPI.confirmPickup(reservationId); showToast('Book issued!', 'success'); if (viewingQueue) setSelectedBookQueue(p => p.filter(r => r.reservation_id !== reservationId)); fetchBorrowingsData(); }
    catch (e) { showToast(e.message, 'error'); }
  };

  const handleApproveRenewal = async (id) => { try { await adminAPI.approveRenewal(id); showToast('Renewal approved', 'success'); fetchBorrowingsData(); } catch (e) { showToast(e.message, 'error'); } };
  const handleRejectRenewal = async (id) => { try { await adminAPI.rejectRenewal(id); showToast('Renewal rejected', 'success'); fetchBorrowingsData(); } catch (e) { showToast(e.message, 'error'); } };

  const renewalRequests = useMemo(() => borrowings.filter(b => b.renewal_requested && b.renewal_status === 'pending'), [borrowings]);

  const filterFn = (data, term, fields) => {
    if (!term) return data;
    const t = term.toLowerCase();
    return data.filter(d => fields.some(f => (d[f] || '').toLowerCase().includes(t)));
  };

  const filteredBorrowings = useMemo(() => filterFn(borrowings, searchBorrowings, ['user_name', 'email', 'book_title']), [borrowings, searchBorrowings]);
  const filteredPickups = useMemo(() => filterFn(reservations, searchPickups, ['full_name', 'email', 'title']), [reservations, searchPickups]);
  const filteredQueue = useMemo(() => filterFn(queueBooks, searchQueue, ['title', 'author']), [queueBooks, searchQueue]);
  const filteredRenewals = useMemo(() => filterFn(renewalRequests, searchRenewals, ['user_name', 'email', 'book_title']), [renewalRequests, searchRenewals]);
  const filteredHistory = useMemo(() => filterFn(history, searchHistory, ['member_name', 'member_email', 'book_title']), [history, searchHistory]);

  const tabs = [
    { id: 'borrowings', label: 'Active Borrowings', icon: FaBookOpen, count: borrowings.length },
    { id: 'pickups', label: 'Pending Pickups', icon: FaClock, count: reservations.length },
    { id: 'queue', label: 'Waitlist', icon: FaList, count: queueBooks.length },
    { id: 'renewals', label: 'Renewals', icon: FaUndo, count: renewalRequests.length },
    { id: 'history', label: 'History', icon: FaHistory, count: historyCount },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div className="flex gap-1 border-b border-[#EAE0D0] overflow-x-auto">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); setViewingQueue(false); setSelectedQueueBook(null); setPage(1); }}
              className={`px-6 py-3 text-sm font-medium transition-all duration-200 whitespace-nowrap flex items-center gap-2 ${activeTab === tab.id ? 'text-[#C4895A] border-b-2 border-[#C4895A]' : 'text-[#9A8478] hover:text-[#4A3728]'}`}>
              <tab.icon size={14} />{tab.label} ({tab.count})
            </button>
          ))}
        </div>
        <button onClick={() => setShowIssueModal(true)} className="flex items-center gap-2 px-4 py-2 bg-[#C4895A] text-white rounded-lg hover:bg-[#D4A574] transition text-sm font-medium"><FaPlus size={14} />Issue Book</button>
      </div>

      {/* Search Bar */}
      {!(activeTab === 'queue' && viewingQueue) && (
        <div className="bg-white rounded-xl shadow-sm border border-[#EAE0D0] p-4 mb-6">
          {activeTab === 'borrowings' && (
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="relative max-w-md w-full">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9A8478]" size={14} />
                <input type="text" placeholder="Search borrowings..." value={searchBorrowings} onChange={e => setSearchBorrowings(e.target.value)}
                  className="w-full pl-9 pr-9 py-2 border border-[#EAE0D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C4895A] text-sm" />
                {searchBorrowings && <button onClick={() => setSearchBorrowings('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9A8478] hover:text-[#2C1F14]"><FaTimes size={12} /></button>}
              </div>
              <div className="flex gap-2 flex-wrap">
                {['all', 'borrowed', 'overdue'].map(f => (
                  <button key={f} onClick={() => { setFilter(f); setPage(1); }} className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition ${filter === f ? 'bg-[#C4895A] text-white' : 'bg-[#F3EDE3] text-[#4A3728] hover:bg-[#EAE0D0]'}`}>{f}</button>
                ))}
              </div>
            </div>
          )}
          {activeTab === 'pickups' && (
            <div className="relative max-w-md w-full">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9A8478]" size={14} />
              <input type="text" placeholder="Search pickups..." value={searchPickups} onChange={e => setSearchPickups(e.target.value)}
                className="w-full pl-9 pr-9 py-2 border border-[#EAE0D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C4895A] text-sm" />
              {searchPickups && <button onClick={() => setSearchPickups('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9A8478] hover:text-[#2C1F14]"><FaTimes size={12} /></button>}
            </div>
          )}
          {activeTab === 'queue' && (
            <div className="relative max-w-md w-full">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9A8478]" size={14} />
              <input type="text" placeholder="Search waitlist..." value={searchQueue} onChange={e => setSearchQueue(e.target.value)}
                className="w-full pl-9 pr-9 py-2 border border-[#EAE0D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C4895A] text-sm" />
              {searchQueue && <button onClick={() => setSearchQueue('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9A8478] hover:text-[#2C1F14]"><FaTimes size={12} /></button>}
            </div>
          )}
          {activeTab === 'renewals' && (
            <div className="relative max-w-md w-full">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9A8478]" size={14} />
              <input type="text" placeholder="Search renewals..." value={searchRenewals} onChange={e => setSearchRenewals(e.target.value)}
                className="w-full pl-9 pr-9 py-2 border border-[#EAE0D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C4895A] text-sm" />
              {searchRenewals && <button onClick={() => setSearchRenewals('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9A8478] hover:text-[#2C1F14]"><FaTimes size={12} /></button>}
            </div>
          )}
          {activeTab === 'history' && (
            <div className="relative max-w-md w-full">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9A8478]" size={14} />
              <input type="text" placeholder="Search history..." value={searchHistory} onChange={e => setSearchHistory(e.target.value)}
                className="w-full pl-9 pr-9 py-2 border border-[#EAE0D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C4895A] text-sm" />
              {searchHistory && <button onClick={() => setSearchHistory('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9A8478] hover:text-[#2C1F14]"><FaTimes size={12} /></button>}
            </div>
          )}
        </div>
      )}

      {/* BORROWINGS */}
      {activeTab === 'borrowings' && (
        <div className="bg-white rounded-xl shadow-sm border border-[#EAE0D0] overflow-hidden">
          {loading ? <Spinner /> : filteredBorrowings.length === 0 ? <EmptyState icon={FaBookOpen} message="No active borrowings" /> : (
            <div className="overflow-x-auto"><table className="w-full"><TableHeader columns={['Member', 'Book', 'Issued', 'Due', 'Status', 'Renewals', '']} />
              <tbody className="divide-y divide-[#EAE0D0]">
                {filteredBorrowings.map(b => (
                  <tr key={b.borrow_id} className="hover:bg-[#FAF7F2] transition">
                    <td className="py-3 px-4"><div className="font-medium text-[#2C1F14]">{b.user_name}</div><div className="text-xs text-[#9A8478]">{b.email}</div></td>
                    <td className="py-3 px-4 text-[#2C1F14]">{b.book_title}</td>
                    <td className="py-3 px-4 text-sm text-[#4A3728]">{fmtDate(b.issued_at)}</td>
                    <td className="py-3 px-4 text-sm text-[#4A3728]">{fmtDate(b.due_date)}</td>
                    <td className="py-3 px-4"><StatusBadge status={b.status} /></td>
                    <td className="py-3 px-4 text-sm text-center text-[#4A3728]">{b.renewal_count || 0}/3</td>
                    <td className="py-3 px-4"><button onClick={() => setReturnModal(b)} className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-500 text-white text-xs font-medium rounded-lg hover:bg-blue-600 transition"><FaUndoAlt size={11} />Return</button></td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </div>
      )}

      {/* PICKUPS */}
      {activeTab === 'pickups' && (
        <div className="bg-white rounded-xl shadow-sm border border-[#EAE0D0] overflow-hidden">
          {loading ? <Spinner /> : filteredPickups.length === 0 ? <EmptyState icon={FaClock} message="No pending pickups" /> : (
            <div className="overflow-x-auto"><table className="w-full"><TableHeader columns={['Member', 'Book', 'Reserved', 'Expires', 'Time Left', '']} />
              <tbody className="divide-y divide-[#EAE0D0]">
                {filteredPickups.map(r => {
                    const ex = parseDate(r.expires_at);
                    const tl = ex ? Math.max(0, Math.floor((ex.getTime() - Date.now()) / 3600000)) : null;
                  return (
                    <tr key={r.reservation_id} className="hover:bg-[#FAF7F2] transition">
                      <td className="py-3 px-4"><div className="font-medium text-[#2C1F14]">{r.full_name || `User #${r.user_id}`}</div><div className="text-xs text-[#9A8478]">{r.email}</div></td>
                      <td className="py-3 px-4 text-[#2C1F14]">{r.title}</td>
                      <td className="py-3 px-4 text-sm text-[#4A3728]">{fmtDateTime(r.reserved_at)}</td>
                      <td className="py-3 px-4 text-sm text-[#4A3728]">{ex && !isNaN(ex.getTime()) ? fmtDateTime(r.expires_at) : '—'}</td>
                      <td className="py-3 px-4">{tl !== null ? <span className={`text-xs px-2 py-1 rounded-full ${tl < 6 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{tl > 0 ? `${tl}h left` : 'Expired'}</span> : <span className="text-xs text-[#9A8478]">—</span>}</td>
                      <td className="py-3 px-4"><button onClick={() => handleConfirmPickup(r.reservation_id)} className="px-3 py-1.5 bg-[#C4895A] text-white text-xs rounded-lg hover:bg-[#D4A574] transition">Confirm</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table></div>
          )}
        </div>
      )}

      {/* QUEUE */}
      {activeTab === 'queue' && (
        <div>
          {viewingQueue && selectedBookQueue ? (
            <div>
              <button onClick={() => { setViewingQueue(false); setSelectedQueueBook(null); }} className="flex items-center gap-2 text-[#C4895A] hover:underline mb-4 text-sm"><FaArrowLeft size={12} /> Back</button>
              <div className="bg-white rounded-xl shadow-sm border border-[#EAE0D0] p-6 mb-4">
                <h3 className="font-serif text-lg font-bold text-[#2C1F14]">{selectedQueueBook?.title || 'Book'} — Waitlist</h3>
                <p className="text-sm text-[#9A8478]">{selectedQueueBook?.author && `by ${selectedQueueBook.author} · `}{selectedBookQueue.length} waiting</p>
              </div>
              <div className="space-y-2">{selectedBookQueue.map(u => (
                <div key={u.reservation_id} className="bg-white rounded-lg border border-[#EAE0D0] p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4"><span className="w-8 h-8 bg-[#C4895A] text-white rounded-full flex items-center justify-center text-sm font-bold">{u.queue_position}</span><div><div className="font-medium text-[#2C1F14]">{u.full_name}</div><div className="text-xs text-[#9A8478]">{u.email} · {u.phone || 'No phone'}</div><div className="text-xs text-[#9A8478] mt-1">Reserved: {new Date(u.reserved_at).toLocaleDateString()}</div></div></div>
                  <button onClick={() => handleConfirmPickup(u.reservation_id)} className="px-3 py-1.5 bg-[#C4895A] text-white text-xs rounded-lg hover:bg-[#D4A574] transition">Confirm</button>
                </div>
              ))}</div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-[#EAE0D0] overflow-hidden">
              {loading ? <Spinner /> : filteredQueue.length === 0 ? <EmptyState icon={FaList} message="No waitlist" /> : (
                <div className="overflow-x-auto"><table className="w-full"><TableHeader columns={['Book', 'Author', 'Available', 'Queue', 'First Reserved', '']} />
                  <tbody className="divide-y divide-[#EAE0D0]">{filteredQueue.map(b => (
                    <tr key={b.book_id} className="hover:bg-[#FAF7F2] transition cursor-pointer" onClick={() => viewBookQueue(b.book_id)}>
                      <td className="py-3 px-4 font-medium text-[#2C1F14]">{b.title}</td><td className="py-3 px-4 text-sm text-[#4A3728]">{b.author}</td>
                      <td className="py-3 px-4"><span className={`text-xs px-2 py-1 rounded-full ${b.available_copies > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{b.available_copies}/{b.total_copies}</span></td>
                      <td className="py-3 px-4 text-center font-medium text-[#C4895A]">{b.queue_count}</td>
                      <td className="py-3 px-4 text-sm text-[#4A3728]">{new Date(b.earliest_reservation).toLocaleDateString()}</td>
                      <td className="py-3 px-4"><button onClick={e => { e.stopPropagation(); viewBookQueue(b.book_id); }} className="text-[#C4895A] hover:underline text-sm">View</button></td>
                    </tr>
                  ))}</tbody>
                </table></div>
              )}
            </div>
          )}
        </div>
      )}

      {/* RENEWALS */}
      {activeTab === 'renewals' && (
        <div className="bg-white rounded-xl shadow-sm border border-[#EAE0D0] overflow-hidden">
          {loading ? <Spinner /> : filteredRenewals.length === 0 ? <EmptyState icon={FaUndo} message="No pending renewals" /> : (
            <div className="overflow-x-auto"><table className="w-full"><TableHeader columns={['Member', 'Book', 'Due Date', 'Renewals', '']} />
              <tbody className="divide-y divide-[#EAE0D0]">{filteredRenewals.map(b => (
                <tr key={b.borrow_id} className="hover:bg-[#FAF7F2] transition">
                  <td className="py-3 px-4"><div className="font-medium text-[#2C1F14]">{b.user_name}</div><div className="text-xs text-[#9A8478]">{b.email}</div></td>
                  <td className="py-3 px-4 text-[#2C1F14]">{b.book_title}</td>
                  <td className="py-3 px-4 text-sm text-[#4A3728]">{fmtDate(b.due_date)}</td>
                  <td className="py-3 px-4 text-sm text-center">{b.renewal_count || 0}/3</td>
                  <td className="py-3 px-4"><div className="flex items-center gap-2"><button onClick={() => handleApproveRenewal(b.borrow_id)} className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600"><FaCheck size={12} /></button><button onClick={() => handleRejectRenewal(b.borrow_id)} className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600"><FaTimes size={12} /></button></div></td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </div>
      )}

      {/* HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-xl shadow-sm border border-[#EAE0D0] overflow-hidden">
          {loading ? <Spinner /> : filteredHistory.length === 0 ? <EmptyState icon={FaHistory} message="No borrow history" /> : (
            <div className="overflow-x-auto"><table className="w-full"><TableHeader columns={['Member', 'Book', 'Issued', 'Due', 'Returned', 'Days', 'Cond.', 'Status', 'Fine']} />
              <tbody className="divide-y divide-[#EAE0D0]">{filteredHistory.map(h => (
                <tr key={h.history_id} className="hover:bg-[#FAF7F2] transition">
                  <td className="py-3 px-4"><div className="font-medium text-[#2C1F14]">{h.member_name}</div><div className="text-xs text-[#9A8478]">{h.member_email}</div></td>
                  <td className="py-3 px-4 text-[#2C1F14]">{h.book_title}</td>
                  <td className="py-3 px-4 text-sm text-[#4A3728]">{fmtDate(h.issued_at)}</td>
                  <td className="py-3 px-4 text-sm text-[#4A3728]">{fmtDate(h.due_date)}</td>
                  <td className="py-3 px-4 text-sm text-[#4A3728]">{fmtDate(h.returned_at)}</td>
                  <td className="py-3 px-4 text-sm text-center">{h.days_borrowed}</td>
                  <td className="py-3 px-4"><ConditionBadge condition={h.return_condition} /></td>
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${h.was_overdue ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {h.was_overdue ? 'Overdue' : 'On Time'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm">{h.fine_amount > 0 ? `NPR ${parseFloat(h.fine_amount).toFixed(2)}` : '—'}</td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </div>
      )}

      {showIssueModal && <ManualIssueModal onClose={() => setShowIssueModal(false)} onSuccess={() => { setShowIssueModal(false); fetchBorrowingsData(); }} />}
      {returnModal && <ReturnModal borrow={returnModal} onClose={() => setReturnModal(null)} onSuccess={() => { setReturnModal(null); fetchBorrowingsData(); }} />}
    </div>
  );
};

export default BorrowingsPage;