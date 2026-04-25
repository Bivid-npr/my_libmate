import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { FaStar, FaRegStar, FaHeart, FaRegHeart, FaBookOpen, FaShare, FaStarHalfAlt, FaUsers, FaEdit, FaTrash, FaClock, FaUser, FaCalendarAlt } from 'react-icons/fa';
import { booksAPI, usersAPI, borrowingsAPI } from '../../services/api';

const BookDetailPage = () => {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  
  const [book, setBook] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isCurrentlyBorrowing, setIsCurrentlyBorrowing] = useState(false);
  const [reviewText, setReviewText] = useState('');
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [activeTab, setActiveTab] = useState('reviews');
  const [submitting, setSubmitting] = useState(false);
  const [userReview, setUserReview] = useState(null);
  const [editingReview, setEditingReview] = useState(false);
  const [reservations, setReservations] = useState([]);
  const [reservationsLoading, setReservationsLoading] = useState(false);
  const [borrowing, setBorrowing] = useState(false);
  const [reserving, setReserving] = useState(false);
  const [error, setError] = useState(null);
  const [showPickupModal, setShowPickupModal] = useState(false);

  const bookId = parseInt(id);

  const fetchBookDetails = useCallback(async () => {
    if (!bookId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await booksAPI.getBook(bookId);
      setBook(response.book);
      setReviews(response.reviews || []);
      if (isAuthenticated && user) {
        const userRev = response.reviews?.find(r => r.user_id === user.user_id);
        if (userRev) { setUserReview(userRev); setRating(userRev.rating); setReviewText(userRev.review_text); }
        try {
          const wishlist = await usersAPI.getWishlist();
          setIsWishlisted(wishlist.some(item => item.book_id === bookId));
        } catch (err) { console.error('Error checking wishlist:', err); }
        // Check if user is currently borrowing this book
        try {
          const borrowings = await usersAPI.getMyBorrowings();
          setIsCurrentlyBorrowing(borrowings.some(b => b.book_id === bookId));
        } catch (err) { console.error('Error checking borrowings:', err); }
      }
    } catch (err) {
      console.error('Error fetching book:', err);
      setError(err.message || 'Failed to load book details');
      showToast('Failed to load book details', 'error');
    } finally { setLoading(false); }
  }, [bookId, isAuthenticated, user, showToast]);

  const fetchReservations = useCallback(async () => {
    if (!bookId) return;
    setReservationsLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/books/${bookId}/reservations`);
      if (response.ok) { const data = await response.json(); setReservations(data); }
    } catch (err) { console.error('Error fetching reservations:', err); }
    finally { setReservationsLoading(false); }
  }, [bookId]);

  useEffect(() => { fetchBookDetails(); }, [fetchBookDetails]);

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    if (tab === 'queue' && reservations.length === 0) { fetchReservations(); }
  }, [reservations.length, fetchReservations]);

  const handleWishlistToggle = useCallback(async () => {
    if (!isAuthenticated) { showToast('Please log in to add to wishlist', 'error'); return; }
    try {
      if (isWishlisted) { await usersAPI.removeFromWishlist(bookId); showToast('Removed from wishlist', 'success'); }
      else { await usersAPI.addToWishlist(bookId); showToast('Added to wishlist', 'success'); }
      setIsWishlisted(!isWishlisted);
    } catch (err) { showToast(err.message || 'Failed to update wishlist', 'error'); }
  }, [isAuthenticated, isWishlisted, bookId, showToast]);

  const handleBorrow = () => {
    if (!isAuthenticated) { showToast('Please log in to borrow books', 'error'); return; }
    if (user?.role === 'guest') { showToast('Please become a member to borrow books', 'error'); return; }
    if (availableCopies === 0) { showToast('This book is currently unavailable. You can join the waitlist.', 'error'); return; }
    setShowPickupModal(true);
  };

  const confirmPickup = async () => {
    setShowPickupModal(false);
    setBorrowing(true);
    try {
      const result = await borrowingsAPI.borrowBook(bookId);
      showToast(result.message || 'Book reserved for pickup! Visit the library within 48 hours.', 'success');
      fetchBookDetails();
    } catch (err) {
      showToast(err.message || 'Failed to reserve book', 'error');
    } finally { setBorrowing(false); }
  };

  const handleReserve = useCallback(async () => {
    if (!isAuthenticated) { showToast('Please log in to reserve books', 'error'); return; }
    if (user?.role === 'guest') { showToast('Please become a member to reserve books', 'error'); return; }
    setReserving(true);
    try {
      await borrowingsAPI.reserveBook(bookId);
      showToast('Reservation placed! You\'ll be notified when available.', 'success');
      await fetchReservations();
    } catch (err) { showToast(err.message || 'Failed to reserve book', 'error'); }
    finally { setReserving(false); }
  }, [isAuthenticated, user?.role, bookId, showToast, fetchReservations]);

  const handleShare = useCallback(() => {
    navigator.clipboard.writeText(window.location.href);
    showToast('Link copied to clipboard!', 'success');
  }, [showToast]);

  const handleReviewSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!isAuthenticated) { showToast('Please log in to leave a review', 'error'); return; }
    if (rating === 0) { showToast('Please select a rating', 'error'); return; }
    if (!reviewText.trim()) { showToast('Please write your review', 'error'); return; }
    setSubmitting(true);
    try {
      if (editingReview && userReview) {
        await booksAPI.updateReview(bookId, userReview.review_id, rating, reviewText);
        showToast('Review updated successfully!', 'success');
      } else {
        await booksAPI.addReview(bookId, rating, reviewText);
        showToast('Review submitted! Thank you for your feedback.', 'success');
      }
      const response = await booksAPI.getBook(bookId);
      setReviews(response.reviews || []);
      const userRev = response.reviews?.find(r => r.user_id === user?.user_id);
      setUserReview(userRev);
      if (!editingReview) { setReviewText(''); setRating(0); }
      setEditingReview(false);
    } catch (err) { showToast(err.message || 'Failed to submit review', 'error'); }
    finally { setSubmitting(false); }
  }, [isAuthenticated, rating, reviewText, editingReview, userReview, bookId, user?.user_id, showToast]);

  const handleEditReview = useCallback(() => {
    if (userReview) { setRating(userReview.rating); setReviewText(userReview.review_text); setEditingReview(true); }
  }, [userReview]);

  const handleDeleteReview = useCallback(async () => {
    if (!window.confirm('Are you sure you want to delete your review?')) return;
    try {
      await booksAPI.deleteReview(bookId, userReview.review_id);
      showToast('Review deleted successfully', 'success');
      setUserReview(null); setReviewText(''); setRating(0); setEditingReview(false);
      const response = await booksAPI.getBook(bookId);
      setReviews(response.reviews || []);
    } catch (err) { showToast(err.message || 'Failed to delete review', 'error'); }
  }, [bookId, userReview, showToast]);

  const getProfilePhotoUrl = useCallback((photo) => {
    if (photo) return `http://localhost:5000/uploads/photos/${photo}`;
    return null;
  }, []);

  const avgRating = book?.avg_rating ? parseFloat(book.avg_rating) : 0;
  const totalReviews = book?.total_reviews ? parseInt(book.total_reviews) : 0;
  const availableCopies = book?.available_copies ? parseInt(book.available_copies) : 0;
  const totalCopies = book?.total_copies ? parseInt(book.total_copies) : 0;
  const borrowCount = book?.total_borrow_count ? parseInt(book.total_borrow_count) : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
        <div className="text-center"><div className="w-12 h-12 border-4 border-[#C4895A] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div><p className="text-[#9A8478]">Loading book details...</p></div>
      </div>
    );
  }

  if (error && !book) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
        <div className="text-center"><div className="text-6xl mb-4">😕</div><h2 className="font-serif text-2xl font-bold text-[#2C1F14] mb-2">Something went wrong</h2><p className="text-[#9A8478] mb-6">{error}</p><button onClick={fetchBookDetails} className="inline-flex items-center gap-2 px-6 py-2 bg-[#2C1F14] text-white rounded-full hover:bg-[#4A3728] transition">Try Again</button></div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
        <div className="text-center"><div className="text-6xl mb-4">📚</div><h2 className="font-serif text-2xl font-bold text-[#2C1F14] mb-2">Book Not Found</h2><p className="text-[#9A8478] mb-6">The book you're looking for doesn't exist.</p><Link to="/catalogue" className="inline-flex items-center gap-2 px-6 py-2 bg-[#2C1F14] text-white rounded-full hover:bg-[#4A3728] transition">Back to Catalogue</Link></div>
      </div>
    );
  }

  return (
    <div className="bg-[#FAF7F2] min-h-screen py-16">
      <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-40">
        <nav className="flex items-center gap-2 text-sm text-[#9A8478] mb-8">
          <Link to="/" className="hover:text-[#C4895A] transition">Home</Link><span>/</span>
          <Link to="/catalogue" className="hover:text-[#C4895A] transition">Catalogue</Link><span>/</span>
          <span className="text-[#C4895A]">{book.title}</span>
        </nav>

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:w-[280px] flex-shrink-0">
            <div className="rounded-2xl aspect-[2/3] w-full flex flex-col justify-end p-5 shadow-xl relative overflow-hidden mb-4 bg-gradient-to-br from-[#2C1F14] to-[#4A3728]">
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>
              {book.cover_image && <img src={`http://localhost:5000/uploads/covers/${book.cover_image}`} alt={book.title} className="absolute inset-0 w-full h-full object-cover" onError={(e) => e.target.style.display = 'none'} />}
              <button onClick={handleShare} className="absolute top-3 right-3 w-8 h-8 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-white hover:bg-white/30 transition" aria-label="Share book"><FaShare size={12} /></button>
              <div className="relative z-10"><h1 className="font-serif text-base font-bold text-white mb-0.5 line-clamp-2">{book.title}</h1><p className="text-white/80 text-[10px]">by {book.author}</p></div>
            </div>

            {/* Action Buttons - UPDATED with isCurrentlyBorrowing check */}
            <div className="space-y-2 w-full">
              {isCurrentlyBorrowing ? (
                <div className="w-full text-center py-2.5 bg-green-50 text-green-700 rounded-lg text-sm font-medium border border-green-200">
                  <FaBookOpen size={14} className="inline mr-2" />
                  You are currently borrowing this book
                </div>
              ) : availableCopies > 0 ? (
                <button onClick={handleBorrow} disabled={borrowing} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#2C1F14] text-white rounded-lg hover:bg-[#4A3728] transition text-sm font-medium disabled:opacity-50">
                  <FaBookOpen size={14} />{borrowing ? 'Processing...' : 'Reserve for Pickup'}
                </button>
              ) : (
                <button onClick={handleReserve} disabled={reserving} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#C4895A] text-white rounded-lg hover:bg-[#D4A574] transition text-sm font-medium disabled:opacity-50">
                  {reserving ? 'Processing...' : 'Join Waitlist'}
                </button>
              )}
              <button onClick={handleWishlistToggle} className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 border rounded-lg transition text-sm font-medium ${isWishlisted ? 'border-red-500 text-red-500 bg-red-50' : 'border-[#EAE0D0] text-[#4A3728] hover:border-[#C4895A] hover:text-[#C4895A]'}`}>
                {isWishlisted ? <FaHeart size={14} /> : <FaRegHeart size={14} />}{isWishlisted ? 'In Wishlist' : 'Add to Wishlist'}
              </button>
            </div>
          </div>

          {/* ... rest of the component stays exactly the same ... */}
          <div className="flex-1">
            <div className="flex flex-wrap gap-2 mb-3">
              {book.genre && <span className="px-2.5 py-1 bg-[#EAE0D0] text-[#6B4F40] text-xs rounded-full">{book.genre}</span>}
              <span className="px-2.5 py-1 bg-[#EAE0D0] text-[#6B4F40] text-xs rounded-full">{book.language || 'English'}</span>
              {book.published_year && <span className="px-2.5 py-1 bg-[#EAE0D0] text-[#6B4F40] text-xs rounded-full">{book.published_year}</span>}
            </div>
            <h1 className="font-serif text-3xl font-bold text-[#2C1F14] mb-1">{book.title}</h1>
            <p className="text-[#9A8478] text-sm mb-4">{book.author} · {book.publisher || 'Unknown Publisher'} · ISBN: {book.isbn || 'N/A'}</p>
            <div className="flex flex-wrap items-center gap-6 mb-6 pb-4 border-b border-[#EAE0D0]">
              <div><div className="text-xs text-[#9A8478] uppercase tracking-wide">Available Copies</div><div className="text-xl font-bold text-[#2C1F14]">{availableCopies} <span className="text-sm font-normal text-[#9A8478]">/ {totalCopies}</span></div></div>
              <div><div className="text-xs text-[#9A8478] uppercase tracking-wide">Times Borrowed</div><div className="text-xl font-bold text-[#2C1F14]">{borrowCount}</div></div>
              <div><div className="text-xs text-[#9A8478] uppercase tracking-wide">Rating</div>
                <div className="flex items-center gap-1">
                  <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_, i) => { const starValue = i + 1; return (<span key={i}>{starValue <= Math.floor(avgRating) ? <FaStar className="text-yellow-400 text-sm" /> : starValue === Math.ceil(avgRating) && avgRating % 1 >= 0.5 ? <FaStarHalfAlt className="text-yellow-400 text-sm" /> : <FaRegStar className="text-gray-300 text-sm" />}</span>); })}
                  </div>
                  <span className="text-sm font-medium text-[#2C1F14]">{avgRating.toFixed(1)}</span>
                  <span className="text-xs text-[#9A8478]">({totalReviews} reviews)</span>
                </div>
              </div>
            </div>
            <section className="mb-6"><h3 className="font-serif text-lg font-bold text-[#2C1F14] mb-2">Description</h3><p className="text-[#4A3728] text-sm leading-relaxed">{book.description || 'No description available.'}</p></section>
            {/* Reviews & Queue tabs stay the same */}
          </div>
        </div>
      </div>

      {/* Pickup Confirmation Modal */}
      {showPickupModal && book && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-[#C4895A]/10 rounded-full flex items-center justify-center mx-auto mb-4"><FaBookOpen className="text-[#C4895A] text-2xl" /></div>
                <h3 className="font-serif text-xl font-bold text-[#2C1F14] mb-2">Confirm Pickup Reservation</h3>
                <p className="text-sm text-[#9A8478]">You are about to reserve this book for pickup</p>
              </div>
              <div className="bg-[#F3EDE3] rounded-lg p-4 mb-4"><p className="font-semibold text-[#2C1F14]">{book.title}</p><p className="text-sm text-[#9A8478]">by {book.author}</p></div>
              <div className="space-y-3 mb-6">
                <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg"><FaClock className="text-amber-600 mt-0.5 flex-shrink-0" size={16} /><div><p className="text-sm font-medium text-amber-800">48-Hour Pickup Window</p><p className="text-xs text-amber-700">Visit the library counter within 48 hours. Reservation expires automatically.</p></div></div>
                <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg"><FaUser className="text-blue-600 mt-0.5 flex-shrink-0" size={16} /><div><p className="text-sm font-medium text-blue-800">Library Counter Visit Required</p><p className="text-xs text-blue-700">Bring your membership card. The librarian will complete the process.</p></div></div>
                <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg"><FaCalendarAlt className="text-green-600 mt-0.5 flex-shrink-0" size={16} /><div><p className="text-sm font-medium text-green-800">14-Day Borrowing Period</p><p className="text-xs text-green-700">Once issued, keep the book for 14 days. Renewals available.</p></div></div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowPickupModal(false)} className="flex-1 px-4 py-2.5 border border-[#EAE0D0] rounded-lg hover:bg-gray-50 transition text-sm font-medium">Cancel</button>
                <button onClick={confirmPickup} className="flex-1 px-4 py-2.5 bg-[#C4895A] text-white rounded-lg hover:bg-[#D4A574] transition text-sm font-medium">Confirm Reservation</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookDetailPage;