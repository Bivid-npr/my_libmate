import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaClock, FaStar, FaBook, FaHeart, FaCalendarAlt, FaUndo, FaTrash, FaExclamationTriangle } from 'react-icons/fa';
import { usersAPI, borrowingsAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';

const MyBooksPage = () => {
  const [activeTab, setActiveTab] = useState('borrowing');
  const [loading, setLoading] = useState(true);
  const [borrowings, setBorrowings] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [history, setHistory] = useState([]);
  const { showToast } = useToast();

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [borrowingsData, wishlistData, historyData, reservationsData] = await Promise.all([
        usersAPI.getMyBorrowings(),
        usersAPI.getWishlist(),
        usersAPI.getMyHistory(),
        fetchReservations()
      ]);
      
      setBorrowings(borrowingsData || []);
      setWishlist(wishlistData || []);
      setHistory(historyData || []);
      setReservations(reservationsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      showToast('Failed to load your books', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchReservations = async () => {
    try {
      const response = await borrowingsAPI.getMyReservations?.() || [];
      return response;
    } catch (error) {
      console.error('Error fetching reservations:', error);
      return [];
    }
  };

  const handleRenewalRequest = async (borrowId) => {
    try {
      await borrowingsAPI.requestRenewal(borrowId);
      showToast('Renewal request submitted! Awaiting admin approval.', 'success');
      fetchAllData();
    } catch (error) {
      showToast(error.message || 'Failed to request renewal', 'error');
    }
  };

  const handleCancelReservation = async (reservationId) => {
    if (!window.confirm('Are you sure you want to cancel this reservation?')) return;
    
    try {
      await borrowingsAPI.cancelReservation?.(reservationId);
      showToast('Reservation cancelled successfully', 'success');
      fetchAllData();
    } catch (error) {
      showToast(error.message || 'Failed to cancel reservation', 'error');
    }
  };

  const handleRemoveFromWishlist = async (bookId) => {
    try {
      await usersAPI.removeFromWishlist(bookId);
      showToast('Removed from wishlist', 'success');
      setWishlist(prev => prev.filter(book => book.book_id !== bookId));
    } catch (error) {
      showToast(error.message || 'Failed to remove from wishlist', 'error');
    }
  };

  const handleReturnBook = async (borrowId) => {
    if (!window.confirm('Confirm return of this book?')) return;
    
    try {
      await borrowingsAPI.returnBook(borrowId);
      showToast('Book returned successfully', 'success');
      fetchAllData();
    } catch (error) {
      showToast(error.message || 'Failed to return book', 'error');
    }
  };

  const calculateDaysLeft = (dueDate) => {
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = due - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const tabCounts = {
    borrowing: borrowings.length,
    reservations: reservations.length,
    wishlist: wishlist.length,
    history: history.length
  };

  const tabs = [
    { id: 'borrowing', label: 'Currently Borrowing' },
    { id: 'reservations', label: 'Reservations' },
    { id: 'wishlist', label: 'Wishlist' },
    { id: 'history', label: 'Borrow History' },
  ];

  if (loading) {
    return (
      <div className="bg-[#FAF7F2] min-h-screen py-8 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#C4895A] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#9A8478]">Loading your books...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#FAF7F2] min-h-screen py-8">
      <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-40">
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-bold text-[#2C1F14]">My Books</h1>
          <p className="text-[#9A8478] mt-1">Track your borrowing, reservations, and reading history</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-[#EAE0D0] mb-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'text-[#C4895A] border-b-2 border-[#C4895A]'
                  : 'text-[#9A8478] hover:text-[#4A3728]'
              }`}
            >
              {tab.label} ({tabCounts[tab.id]})
            </button>
          ))}
        </div>

        {/* Currently Borrowing Tab - List Card Style */}
        {activeTab === 'borrowing' && (
          <div className="space-y-3">
            {borrowings.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-[#EAE0D0]">
                <FaBook className="text-6xl text-[#C4895A]/30 mx-auto mb-4" />
                <p className="text-[#9A8478] mb-4">You don't have any books borrowed currently.</p>
                <Link to="/catalogue" className="px-6 py-2 bg-[#C4895A] text-white rounded-full hover:bg-[#D4A574] transition inline-block">
                  Browse Catalogue
                </Link>
              </div>
            ) : (
              <>
                <div className="bg-[#C4895A]/10 border border-[#C4895A]/20 rounded-xl p-4 mb-2">
                  <div className="flex items-center gap-2 text-sm text-[#C4895A]">
                    <FaBook size={14} />
                    <span>You have {borrowings.length} of 5 borrowing slots used.</span>
                  </div>
                </div>
                {borrowings.map((book) => {
                  const daysLeft = calculateDaysLeft(book.due_date);
                  const isOverdue = daysLeft < 0;
                  
                  return (
                    <div key={book.borrow_id} className="bg-white rounded-xl p-5 shadow-sm border border-[#EAE0D0] hover:shadow-md transition-shadow">
                      <div className="flex flex-col sm:flex-row gap-4">
                        {/* Book Cover */}
                        <Link to={`/book/${book.book_id}`} className="sm:w-[80px] flex-shrink-0">
                          <div className="w-full sm:w-[80px] h-[120px] rounded-lg bg-gradient-to-br from-[#2C1F14] to-[#4A3728] flex items-end p-2">
                            <span className="text-white text-[10px] font-serif font-semibold line-clamp-2">{book.book_title || book.title}</span>
                          </div>
                        </Link>
                        
                        {/* Book Info */}
                        <div className="flex-1 min-w-0">
                          <Link to={`/book/${book.book_id}`} className="font-serif text-lg font-bold text-[#2C1F14] hover:text-[#C4895A] transition">
                            {book.book_title || book.title}
                          </Link>
                          <div className="text-sm text-[#9A8478] mb-2">{book.author}</div>
                          
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                            <div className={`flex items-center gap-1 text-sm ${isOverdue ? 'text-red-500' : 'text-amber-600'}`}>
                              <FaClock size={12} />
                              <span>Due: {formatDate(book.due_date)}</span>
                              <span className="mx-1">·</span>
                              <span className={isOverdue ? 'font-medium' : ''}>
                                {isOverdue ? `Overdue by ${Math.abs(daysLeft)} days` : `${daysLeft} days left`}
                              </span>
                            </div>
                            
                            {book.current_fine > 0 && (
                              <span className="text-sm text-red-500">
                                Fine: NPR {parseFloat(book.current_fine).toFixed(2)}
                              </span>
                            )}
                            
                            {book.renewal_requested && (
                              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                                Renewal Pending
                              </span>
                            )}
                            
                            {isOverdue && (
                              <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full flex items-center gap-1">
                                <FaExclamationTriangle size={10} />
                                Overdue
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex sm:flex-col gap-2 sm:w-[140px] flex-shrink-0">
                          {!book.renewal_requested && daysLeft <= 3 && daysLeft > 0 && (
                            <button 
                              onClick={() => handleRenewalRequest(book.borrow_id)}
                              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm border border-[#EAE0D0] rounded-lg hover:border-[#C4895A] hover:text-[#C4895A] transition whitespace-nowrap"
                            >
                              <FaUndo size={12} />
                              Renew
                            </button>
                          )}
                          <button 
                            onClick={() => handleReturnBook(book.borrow_id)}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm bg-[#2C1F14] text-white rounded-lg hover:bg-[#4A3728] transition whitespace-nowrap"
                          >
                            Return
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}

        {/* Reservations Tab - List Card Style */}
        {activeTab === 'reservations' && (
          <div className="space-y-3">
            {reservations.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-[#EAE0D0]">
                <FaCalendarAlt className="text-6xl text-[#C4895A]/30 mx-auto mb-4" />
                <p className="text-[#9A8478] mb-4">You don't have any active reservations.</p>
                <Link to="/catalogue" className="px-6 py-2 bg-[#C4895A] text-white rounded-full hover:bg-[#D4A574] transition inline-block">
                  Browse Books
                </Link>
              </div>
            ) : (
              reservations.map((book) => (
                <div key={book.reservation_id} className="bg-white rounded-xl p-5 shadow-sm border border-[#EAE0D0] hover:shadow-md transition-shadow">
                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* Book Cover */}
                    <Link to={`/book/${book.book_id}`} className="sm:w-[80px] flex-shrink-0">
                      <div className="w-full sm:w-[80px] h-[120px] rounded-lg bg-gradient-to-br from-[#2C1F14] to-[#4A3728] flex items-end p-2">
                        <span className="text-white text-[10px] font-serif font-semibold line-clamp-2">{book.title}</span>
                      </div>
                    </Link>
                    
                    {/* Book Info */}
                    <div className="flex-1 min-w-0">
                      <Link to={`/book/${book.book_id}`} className="font-serif text-lg font-bold text-[#2C1F14] hover:text-[#C4895A] transition">
                        {book.title}
                      </Link>
                      <div className="text-sm text-[#9A8478] mb-2">{book.author}</div>
                      
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        <div className="flex items-center gap-1 text-sm text-blue-600">
                          <FaCalendarAlt size={12} />
                          <span>Reserved: {formatDate(book.reserved_at)}</span>
                        </div>
                        <span className="text-sm text-[#9A8478]">
                          Expires: {formatDate(book.expires_at)}
                        </span>
                        {book.position && (
                          <span className="text-xs px-2 py-1 bg-[#EAE0D0] text-[#6B4F40] rounded-full">
                            Queue Position: #{book.position}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="sm:w-[140px] flex-shrink-0">
                      <button 
                        onClick={() => handleCancelReservation(book.reservation_id)}
                        className="w-full px-3 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Wishlist Tab - Grid Card Style (matching catalogue grid) */}
        {activeTab === 'wishlist' && (
          <div>
            {wishlist.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-[#EAE0D0]">
                <FaHeart className="text-6xl text-[#C4895A]/30 mx-auto mb-4" />
                <p className="text-[#9A8478] mb-4">Your wishlist is empty.</p>
                <Link to="/catalogue" className="px-6 py-2 bg-[#C4895A] text-white rounded-full hover:bg-[#D4A574] transition inline-block">
                  Discover Books
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
                {wishlist.map((book) => (
                  <div key={book.book_id} className="group">
                    {/* Book Card - Matching CataloguePage BookGridCard */}
                    <Link to={`/book/${book.book_id}`} className="block">
                      <div className="book-cover w-full h-[230px] rounded-[12px] flex items-end p-3 relative overflow-hidden shadow-md transition-transform duration-250 hover:-translate-y-1.5 hover:shadow-xl bg-gradient-to-br from-[#2C1F14] to-[#4A3728]">
                        <div className="absolute top-0 left-0 right-0 h-[40%] bg-gradient-to-b from-white/15 to-transparent rounded-t-[12px]"></div>
                        
                        <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-semibold z-10 ${
                          book.available_copies > 0 
                            ? 'bg-[#4A7C59]/90 text-white' 
                            : 'bg-[#B85450]/85 text-white'
                        }`}>
                          {book.available_copies > 0 ? 'Available' : 'Unavailable'}
                        </span>
                        
                        {book.available_copies > 1 && (
                          <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-full bg-black/50 text-white text-[9px] font-medium z-10">
                            {book.available_copies} copies
                          </span>
                        )}
                        
                        <span className="absolute bottom-2 left-3 z-10 font-serif text-[13px] font-semibold text-white leading-tight line-clamp-2">
                          {book.title}
                        </span>
                      </div>
                    </Link>
                    
                    <div className="book-info pt-2.5 px-0.5">
                      <div className="text-sm text-[#9A8478] mb-1">{book.author}</div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <div className="flex items-center gap-0.5 text-[11.5px] text-[#C4895A] font-medium">
                          <FaStar size={11} />
                          {book.avg_rating ? parseFloat(book.avg_rating).toFixed(1) : 'N/A'}
                        </div>
                        <span className="text-[10.5px] px-1.5 py-0.5 bg-[#EAE0D0] rounded-full text-[#6B4F40]">
                          {book.genre || 'General'}
                        </span>
                      </div>
                      <button 
                        onClick={() => handleRemoveFromWishlist(book.book_id)}
                        className="mt-2 text-xs text-red-500 hover:text-red-600 transition flex items-center gap-1"
                      >
                        <FaTrash size={10} />
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Borrow History Tab - Table Style (clean and professional) */}
        {activeTab === 'history' && (
          <div>
            {history.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-[#EAE0D0]">
                <FaBook className="text-6xl text-[#C4895A]/30 mx-auto mb-4" />
                <p className="text-[#9A8478]">No borrowing history yet.</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-[#EAE0D0] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#F3EDE3] border-b border-[#EAE0D0]">
                      <tr>
                        <th className="text-left py-3 px-4 text-xs font-bold text-[#2C1F14] uppercase tracking-wide">Book</th>
                        <th className="text-left py-3 px-4 text-xs font-bold text-[#2C1F14] uppercase tracking-wide">Borrowed</th>
                        <th className="text-left py-3 px-4 text-xs font-bold text-[#2C1F14] uppercase tracking-wide">Returned</th>
                        <th className="text-left py-3 px-4 text-xs font-bold text-[#2C1F14] uppercase tracking-wide">Days</th>
                        <th className="text-left py-3 px-4 text-xs font-bold text-[#2C1F14] uppercase tracking-wide">Fine</th>
                        <th className="text-left py-3 px-4 text-xs font-bold text-[#2C1F14] uppercase tracking-wide">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EAE0D0]">
                      {history.map((book) => (
                        <tr key={book.history_id || book.borrow_id} className="hover:bg-[#F3EDE3]/30 transition">
                          <td className="py-3 px-4">
                            <Link to={`/book/${book.book_id}`} className="font-medium text-[#2C1F14] hover:text-[#C4895A] transition">
                              {book.book_title || book.title}
                            </Link>
                            <div className="text-xs text-[#9A8478]">{book.author}</div>
                          </td>
                          <td className="py-3 px-4 text-sm text-[#4A3728]">{formatDate(book.issued_at)}</td>
                          <td className="py-3 px-4 text-sm text-[#4A3728]">{formatDate(book.returned_at)}</td>
                          <td className="py-3 px-4 text-sm text-[#4A3728]">{book.days_borrowed || '—'}</td>
                          <td className="py-3 px-4 text-sm">
                            {book.fine_amount > 0 ? (
                              <span className="text-red-500">NPR {parseFloat(book.fine_amount).toFixed(2)}</span>
                            ) : (
                              <span className="text-[#9A8478]">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              book.was_overdue 
                                ? 'bg-red-100 text-red-700' 
                                : 'bg-green-100 text-green-700'
                            }`}>
                              {book.was_overdue ? 'Overdue' : 'On Time'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyBooksPage;