import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { FaStar, FaRegStar, FaHeart, FaRegHeart, FaBookOpen, FaShare, FaStarHalfAlt, FaUsers, FaEdit, FaTrash } from 'react-icons/fa';
import { booksAPI, usersAPI, borrowingsAPI } from '../../services/api';

const BookDetailPage = () => {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  
  // State
  const [book, setBook] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isWishlisted, setIsWishlisted] = useState(false);
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

  // Memoized book ID
  const bookId = parseInt(id);

  // Fetch book details
  const fetchBookDetails = useCallback(async () => {
    if (!bookId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await booksAPI.getBook(bookId);
      setBook(response.book);
      setReviews(response.reviews || []);
      
      // Check user's review and wishlist if authenticated
      if (isAuthenticated && user) {
        const userRev = response.reviews?.find(r => r.user_id === user.user_id);
        if (userRev) {
          setUserReview(userRev);
          setRating(userRev.rating);
          setReviewText(userRev.review_text);
        }
        
        try {
          const wishlist = await usersAPI.getWishlist();
          setIsWishlisted(wishlist.some(item => item.book_id === bookId));
        } catch (err) {
          console.error('Error checking wishlist:', err);
        }
      }
    } catch (err) {
      console.error('Error fetching book:', err);
      setError(err.message || 'Failed to load book details');
      showToast('Failed to load book details', 'error');
    } finally {
      setLoading(false);
    }
  }, [bookId, isAuthenticated, user, showToast]);

  // Fetch reservations
  const fetchReservations = useCallback(async () => {
    if (!bookId) return;
    
    setReservationsLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/books/${bookId}/reservations`);
      if (response.ok) {
        const data = await response.json();
        setReservations(data);
      }
    } catch (err) {
      console.error('Error fetching reservations:', err);
    } finally {
      setReservationsLoading(false);
    }
  }, [bookId]);

  // Initial load
  useEffect(() => {
    fetchBookDetails();
  }, [fetchBookDetails]);

  // Handle tab change
  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    if (tab === 'queue' && reservations.length === 0) {
      fetchReservations();
    }
  }, [reservations.length, fetchReservations]);

  // Handle wishlist toggle
  const handleWishlistToggle = useCallback(async () => {
    if (!isAuthenticated) {
      showToast('Please log in to add to wishlist', 'error');
      return;
    }
    
    try {
      if (isWishlisted) {
        await usersAPI.removeFromWishlist(bookId);
        showToast('Removed from wishlist', 'success');
      } else {
        await usersAPI.addToWishlist(bookId);
        showToast('Added to wishlist', 'success');
      }
      setIsWishlisted(!isWishlisted);
    } catch (err) {
      showToast(err.message || 'Failed to update wishlist', 'error');
    }
  }, [isAuthenticated, isWishlisted, bookId, showToast]);

  // Handle borrow
  const handleBorrow = useCallback(async () => {
    if (!isAuthenticated) {
      showToast('Please log in to borrow books', 'error');
      return;
    }
    if (user?.role === 'guest') {
      showToast('Please become a member to borrow books', 'error');
      return;
    }
    if (book?.available_copies === 0) {
      showToast('This book is currently unavailable. You can reserve it.', 'error');
      return;
    }
    
    setBorrowing(true);
    try {
      await borrowingsAPI.borrowBook(bookId);
      showToast('Book borrowed successfully!', 'success');
      await fetchBookDetails();
    } catch (err) {
      showToast(err.message || 'Failed to borrow book', 'error');
    } finally {
      setBorrowing(false);
    }
  }, [isAuthenticated, user?.role, book?.available_copies, bookId, showToast, fetchBookDetails]);

  // Handle reserve
  const handleReserve = useCallback(async () => {
    if (!isAuthenticated) {
      showToast('Please log in to reserve books', 'error');
      return;
    }
    if (user?.role === 'guest') {
      showToast('Please become a member to reserve books', 'error');
      return;
    }
    
    setReserving(true);
    try {
      await borrowingsAPI.reserveBook(bookId);
      showToast('Reservation placed! You\'ll be notified when available.', 'success');
      await fetchReservations();
    } catch (err) {
      showToast(err.message || 'Failed to reserve book', 'error');
    } finally {
      setReserving(false);
    }
  }, [isAuthenticated, user?.role, bookId, showToast, fetchReservations]);

  // Handle share
  const handleShare = useCallback(() => {
    navigator.clipboard.writeText(window.location.href);
    showToast('Link copied to clipboard!', 'success');
  }, [showToast]);

  // Handle review submit
  const handleReviewSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      showToast('Please log in to leave a review', 'error');
      return;
    }
    if (rating === 0) {
      showToast('Please select a rating', 'error');
      return;
    }
    if (!reviewText.trim()) {
      showToast('Please write your review', 'error');
      return;
    }
    
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
      
      if (!editingReview) {
        setReviewText('');
        setRating(0);
      }
      setEditingReview(false);
    } catch (err) {
      showToast(err.message || 'Failed to submit review', 'error');
    } finally {
      setSubmitting(false);
    }
  }, [isAuthenticated, rating, reviewText, editingReview, userReview, bookId, user?.user_id, showToast]);

  // Handle edit review
  const handleEditReview = useCallback(() => {
    if (userReview) {
      setRating(userReview.rating);
      setReviewText(userReview.review_text);
      setEditingReview(true);
    }
  }, [userReview]);

  // Handle delete review
  const handleDeleteReview = useCallback(async () => {
    if (!window.confirm('Are you sure you want to delete your review?')) {
      return;
    }
    
    try {
      await booksAPI.deleteReview(bookId, userReview.review_id);
      showToast('Review deleted successfully', 'success');
      setUserReview(null);
      setReviewText('');
      setRating(0);
      setEditingReview(false);
      
      const response = await booksAPI.getBook(bookId);
      setReviews(response.reviews || []);
    } catch (err) {
      showToast(err.message || 'Failed to delete review', 'error');
    }
  }, [bookId, userReview, showToast]);

  // Helper functions
  const getProfilePhotoUrl = useCallback((photo) => {
    if (photo) {
      return `http://localhost:5000/uploads/photos/${photo}`;
    }
    return null;
  }, []);

  // Computed values
  const avgRating = book?.avg_rating ? parseFloat(book.avg_rating) : 0;
  const totalReviews = book?.total_reviews ? parseInt(book.total_reviews) : 0;
  const availableCopies = book?.available_copies ? parseInt(book.available_copies) : 0;
  const totalCopies = book?.total_copies ? parseInt(book.total_copies) : 0;
  const borrowCount = book?.total_borrow_count ? parseInt(book.total_borrow_count) : 0;

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#C4895A] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#9A8478]">Loading book details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !book) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="font-serif text-2xl font-bold text-[#2C1F14] mb-2">Something went wrong</h2>
          <p className="text-[#9A8478] mb-6">{error}</p>
          <button 
            onClick={fetchBookDetails}
            className="inline-flex items-center gap-2 px-6 py-2 bg-[#2C1F14] text-white rounded-full hover:bg-[#4A3728] transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Not found state
  if (!book) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📚</div>
          <h2 className="font-serif text-2xl font-bold text-[#2C1F14] mb-2">Book Not Found</h2>
          <p className="text-[#9A8478] mb-6">The book you're looking for doesn't exist.</p>
          <Link to="/catalogue" className="inline-flex items-center gap-2 px-6 py-2 bg-[#2C1F14] text-white rounded-full hover:bg-[#4A3728] transition">
            Back to Catalogue
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#FAF7F2] min-h-screen py-16">
      <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-40">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-[#9A8478] mb-8">
          <Link to="/" className="hover:text-[#C4895A] transition">Home</Link>
          <span>/</span>
          <Link to="/catalogue" className="hover:text-[#C4895A] transition">Catalogue</Link>
          <span>/</span>
          <span className="text-[#C4895A]">{book.title}</span>
        </nav>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Column - Book Cover & Buttons */}
          <div className="lg:w-[280px] flex-shrink-0">
            {/* Book Cover */}
            <div className="rounded-2xl aspect-[2/3] w-full flex flex-col justify-end p-5 shadow-xl relative overflow-hidden mb-4 bg-gradient-to-br from-[#2C1F14] to-[#4A3728]">
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>
              {book.cover_image && (
                <img 
                  src={`http://localhost:5000/uploads/covers/${book.cover_image}`}
                  alt={book.title}
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={(e) => e.target.style.display = 'none'}
                />
              )}
              <button 
                onClick={handleShare} 
                className="absolute top-3 right-3 w-8 h-8 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-white hover:bg-white/30 transition"
                aria-label="Share book"
              >
                <FaShare size={12} />
              </button>
              <div className="relative z-10">
                <h1 className="font-serif text-base font-bold text-white mb-0.5 line-clamp-2">{book.title}</h1>
                <p className="text-white/80 text-[10px]">by {book.author}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 w-full">
              {availableCopies > 0 ? (
                <button 
                  onClick={handleBorrow} 
                  disabled={borrowing}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#2C1F14] text-white rounded-lg hover:bg-[#4A3728] transition text-sm font-medium disabled:opacity-50"
                >
                  <FaBookOpen size={14} />
                  {borrowing ? 'Processing...' : 'Borrow This Book'}
                </button>
              ) : (
                <button 
                  onClick={handleReserve}
                  disabled={reserving}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#C4895A] text-white rounded-lg hover:bg-[#D4A574] transition text-sm font-medium disabled:opacity-50"
                >
                  {reserving ? 'Processing...' : 'Reserve This Book'}
                </button>
              )}
              <button 
                onClick={handleWishlistToggle} 
                className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 border rounded-lg transition text-sm font-medium ${
                  isWishlisted 
                    ? 'border-red-500 text-red-500 bg-red-50' 
                    : 'border-[#EAE0D0] text-[#4A3728] hover:border-[#C4895A] hover:text-[#C4895A]'
                }`}
              >
                {isWishlisted ? <FaHeart size={14} /> : <FaRegHeart size={14} />}
                {isWishlisted ? 'In Wishlist' : 'Add to Wishlist'}
              </button>
            </div>
          </div>

          {/* Right Column - Book Details */}
          <div className="flex-1">
            {/* Genre Tags */}
            <div className="flex flex-wrap gap-2 mb-3">
              {book.genre && <span className="px-2.5 py-1 bg-[#EAE0D0] text-[#6B4F40] text-xs rounded-full">{book.genre}</span>}
              <span className="px-2.5 py-1 bg-[#EAE0D0] text-[#6B4F40] text-xs rounded-full">{book.language || 'English'}</span>
              {book.published_year && <span className="px-2.5 py-1 bg-[#EAE0D0] text-[#6B4F40] text-xs rounded-full">{book.published_year}</span>}
            </div>

            {/* Title & Author */}
            <h1 className="font-serif text-3xl font-bold text-[#2C1F14] mb-1">{book.title}</h1>
            <p className="text-[#9A8478] text-sm mb-4">
              {book.author} · {book.publisher || 'Unknown Publisher'} · ISBN: {book.isbn || 'N/A'}
            </p>

            {/* Stats Row */}
            <div className="flex flex-wrap items-center gap-6 mb-6 pb-4 border-b border-[#EAE0D0]">
              <div>
                <div className="text-xs text-[#9A8478] uppercase tracking-wide">Available Copies</div>
                <div className="text-xl font-bold text-[#2C1F14]">
                  {availableCopies} <span className="text-sm font-normal text-[#9A8478]">/ {totalCopies}</span>
                </div>
              </div>
              <div>
                <div className="text-xs text-[#9A8478] uppercase tracking-wide">Times Borrowed</div>
                <div className="text-xl font-bold text-[#2C1F14]">{borrowCount}</div>
              </div>
              <div>
                <div className="text-xs text-[#9A8478] uppercase tracking-wide">Rating</div>
                <div className="flex items-center gap-1">
                  <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_, i) => {
                      const starValue = i + 1;
                      return (
                        <span key={i}>
                          {starValue <= Math.floor(avgRating) ? (
                            <FaStar className="text-yellow-400 text-sm" />
                          ) : starValue === Math.ceil(avgRating) && avgRating % 1 >= 0.5 ? (
                            <FaStarHalfAlt className="text-yellow-400 text-sm" />
                          ) : (
                            <FaRegStar className="text-gray-300 text-sm" />
                          )}
                        </span>
                      );
                    })}
                  </div>
                  <span className="text-sm font-medium text-[#2C1F14]">{avgRating.toFixed(1)}</span>
                  <span className="text-xs text-[#9A8478]">({totalReviews} reviews)</span>
                </div>
              </div>
            </div>

            {/* Description */}
            <section className="mb-6">
              <h3 className="font-serif text-lg font-bold text-[#2C1F14] mb-2">Description</h3>
              <p className="text-[#4A3728] text-sm leading-relaxed">{book.description || 'No description available.'}</p>
            </section>

            {/* Tabs: Reviews & Reservation Queue */}
            <section className="mt-8">
              <div className="flex items-center gap-6 border-b border-[#EAE0D0] mb-5">
                <button 
                  onClick={() => handleTabChange('reviews')}
                  className={`pb-2.5 text-sm font-medium transition-all ${activeTab === 'reviews' ? 'text-[#C4895A] border-b-2 border-[#C4895A]' : 'text-[#9A8478] hover:text-[#4A3728]'}`}
                >
                  Reviews ({totalReviews})
                </button>
                <button 
                  onClick={() => handleTabChange('queue')}
                  className={`pb-2.5 text-sm font-medium transition-all ${activeTab === 'queue' ? 'text-[#C4895A] border-b-2 border-[#C4895A]' : 'text-[#9A8478] hover:text-[#4A3728]'}`}
                >
                  Reservation Queue
                </button>
              </div>

              {/* Reviews Tab */}
              {activeTab === 'reviews' && (
                <div>
                  {/* Write Review Section */}
                  {isAuthenticated && (!userReview || editingReview) && (
                    <div className="bg-[#F3EDE3] rounded-xl p-5 mb-6">
                      <h3 className="font-serif text-base font-bold text-[#2C1F14] mb-3">
                        {editingReview ? 'Edit Your Review' : 'Write a Review'}
                      </h3>
                      <form onSubmit={handleReviewSubmit}>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-sm text-[#4A3728]">Your Rating:</span>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onMouseEnter={() => setHoverRating(star)}
                                onMouseLeave={() => setHoverRating(0)}
                                onClick={() => setRating(star)}
                                className="focus:outline-none"
                              >
                                {(hoverRating || rating) >= star ? (
                                  <FaStar className="text-yellow-400 text-base" />
                                ) : (
                                  <FaRegStar className="text-gray-400 text-base" />
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                        <textarea 
                          value={reviewText} 
                          onChange={(e) => setReviewText(e.target.value)} 
                          placeholder="Share your thoughts about this book..." 
                          rows={3} 
                          className="w-full px-4 py-2 text-sm border border-[#EAE0D0] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#C4895A] resize-none"
                          disabled={submitting}
                        />
                        <div className="flex gap-2 mt-3">
                          <button 
                            type="submit" 
                            disabled={submitting}
                            className="px-4 py-1.5 text-sm bg-[#C4895A] text-white rounded-lg hover:bg-[#D4A574] transition disabled:opacity-50"
                          >
                            {submitting ? 'Submitting...' : (editingReview ? 'Update Review' : 'Submit Review')}
                          </button>
                          {editingReview && (
                            <button 
                              type="button"
                              onClick={() => {
                                setEditingReview(false);
                                setReviewText('');
                                setRating(0);
                              }}
                              className="px-4 py-1.5 text-sm border border-[#EAE0D0] text-[#4A3728] rounded-lg hover:bg-gray-50 transition"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </form>
                    </div>
                  )}

                  {/* User's Existing Review */}
                  {userReview && !editingReview && (
                    <div className="bg-[#F3EDE3] rounded-xl p-5 mb-6">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-serif text-base font-bold text-[#2C1F14]">Your Review</h3>
                        <div className="flex gap-2">
                          <button onClick={handleEditReview} className="text-[#9A8478] hover:text-[#C4895A] transition" aria-label="Edit review">
                            <FaEdit size={14} />
                          </button>
                          <button onClick={handleDeleteReview} className="text-[#9A8478] hover:text-red-500 transition" aria-label="Delete review">
                            <FaTrash size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 mb-2">
                        {[...Array(5)].map((_, i) => (
                          <FaStar key={i} className={`text-sm ${i < userReview.rating ? 'text-yellow-400' : 'text-gray-300'}`} />
                        ))}
                      </div>
                      <p className="text-[#4A3728] text-sm leading-relaxed">{userReview.review_text}</p>
                    </div>
                  )}

                  {/* Reviews List */}
                  <div className="space-y-4">
                    {reviews.filter(r => !userReview || r.review_id !== userReview.review_id).length > 0 ? (
                      reviews.filter(r => !userReview || r.review_id !== userReview.review_id).map((review) => (
                        <article key={review.review_id} className="pb-4 border-b border-[#EAE0D0] last:border-0">
                          <div className="flex items-center gap-3 mb-2">
                            {getProfilePhotoUrl(review.profile_picture) ? (
                              <img 
                                src={getProfilePhotoUrl(review.profile_picture)} 
                                alt={review.full_name}
                                className="w-9 h-9 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-9 h-9 bg-gradient-to-br from-[#2C1F14] to-[#4A3728] rounded-full flex items-center justify-center text-white text-xs font-medium">
                                {review.full_name?.charAt(0) || 'U'}
                              </div>
                            )}
                            <div>
                              <div className="font-medium text-sm text-[#2C1F14]">{review.full_name}</div>
                              <div className="flex items-center gap-1">
                                <div className="flex items-center gap-0.5">
                                  {[...Array(5)].map((_, i) => (
                                    <FaStar key={i} className={`text-[10px] ${i < review.rating ? 'text-yellow-400' : 'text-gray-300'}`} />
                                  ))}
                                </div>
                                <span className="text-[10px] text-[#9A8478]">
                                  {review.created_at ? new Date(review.created_at).toLocaleDateString() : 'Recently'}
                                </span>
                              </div>
                            </div>
                          </div>
                          <p className="text-[#4A3728] text-sm leading-relaxed ml-12">{review.review_text}</p>
                        </article>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-[#9A8478]">No reviews yet. Be the first to review this book!</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Reservation Queue Tab */}
              {activeTab === 'queue' && (
                <div className="bg-[#F3EDE3] rounded-xl p-8">
                  {reservationsLoading ? (
                    <div className="text-center">
                      <div className="w-8 h-8 border-2 border-[#C4895A] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                      <p className="text-[#9A8478] text-sm">Loading reservations...</p>
                    </div>
                  ) : reservations.length > 0 ? (
                    <div className="space-y-3">
                      <h4 className="font-medium text-[#2C1F14] mb-3">Current Reservation Queue ({reservations.length})</h4>
                      {reservations.map((res, index) => (
                        <div key={res.reservation_id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 bg-[#C4895A] text-white rounded-full flex items-center justify-center text-xs font-medium">
                              {index + 1}
                            </span>
                            <span className="text-sm text-[#2C1F14]">{res.user_name || res.full_name || `User #${res.user_id}`}</span>
                          </div>
                          <span className="text-xs text-[#9A8478]">
                            Reserved: {res.reserved_at ? new Date(res.reserved_at).toLocaleDateString() : 'Recently'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center">
                      <FaUsers className="text-4xl text-[#9A8478] mx-auto mb-3" />
                      <p className="text-[#4A3728] text-sm mb-3">No active reservations for this book.</p>
                      {availableCopies === 0 && isAuthenticated && user?.role === 'member' && (
                        <button 
                          onClick={handleReserve}
                          disabled={reserving}
                          className="px-4 py-2 bg-[#C4895A] text-white rounded-lg hover:bg-[#D4A574] transition text-sm disabled:opacity-50"
                        >
                          {reserving ? 'Processing...' : 'Be the first to reserve'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookDetailPage;