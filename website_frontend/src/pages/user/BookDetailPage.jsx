import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { FaStar, FaRegStar, FaHeart, FaRegHeart, FaBookOpen, FaShare, FaStarHalfAlt, FaUsers } from 'react-icons/fa';
import { getBookById, getReviewsByBookId } from '../../data/mockData';

const BookDetailPage = () => {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const [book, setBook] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [reviewText, setReviewText] = useState('');
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [activeTab, setActiveTab] = useState('reviews');

  useEffect(() => {
    setTimeout(() => {
      const bookData = getBookById(id);
      const reviewsData = getReviewsByBookId(parseInt(id));
      setBook(bookData);
      setReviews(reviewsData);
      setLoading(false);
    }, 500);
  }, [id]);

  const handleWishlistToggle = () => {
    if (!isAuthenticated) {
      showToast('Please log in to add to wishlist', 'error');
      return;
    }
    setIsWishlisted(!isWishlisted);
    showToast(isWishlisted ? 'Removed from wishlist' : 'Added to wishlist', 'success');
  };

  const handleBorrow = () => {
    if (!isAuthenticated) {
      showToast('Please log in to borrow books', 'error');
      return;
    }
    if (user?.role === 'guest') {
      showToast('Please become a member to borrow books', 'error');
      return;
    }
    if (book.available_copies === 0) {
      showToast('This book is currently unavailable. You can reserve it.', 'error');
      return;
    }
    showToast('Please visit the library counter to borrow this book', 'success');
  };

  const handleReserve = () => {
    if (!isAuthenticated) {
      showToast('Please log in to reserve books', 'error');
      return;
    }
    if (user?.role === 'guest') {
      showToast('Please become a member to reserve books', 'error');
      return;
    }
    showToast('Reservation placed! You\'ll be notified when available.', 'success');
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    showToast('Link copied to clipboard!', 'success');
  };

  const handleReviewSubmit = (e) => {
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
    showToast('Review submitted! Thank you for your feedback.', 'success');
    setReviewText('');
    setRating(0);
  };

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

  const avgRating = book.avg_rating || 0;

  return (
    <div className="bg-[#FAF7F2] min-h-screen py-12">
      <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-40">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-[#9A8478] mb-8">
          <Link to="/" className="hover:text-[#C4895A] transition">Home</Link>
          <span>/</span>
          <Link to="/catalogue" className="hover:text-[#C4895A] transition">Catalogue</Link>
          <span>/</span>
          <span className="text-[#C4895A]">{book.title}</span>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Column - Book Cover & Buttons */}
          <div className="lg:w-[280px] flex-shrink-0">
            {/* Book Cover */}
            <div className={`rounded-2xl aspect-[2/3] w-full flex flex-col justify-end p-5 shadow-xl relative overflow-hidden mb-4`} style={{ background: book.cover_color }}>
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>
              <div className="absolute top-3 right-3">
                <button onClick={handleShare} className="w-8 h-8 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-white hover:bg-white/30 transition">
                  <FaShare size={12} />
                </button>
              </div>
              <div className="relative z-10">
                <h1 className="font-serif text-base font-bold text-white mb-0.5 line-clamp-2">{book.title}</h1>
                <p className="text-white/80 text-[10px]">by {book.author}</p>
              </div>
            </div>

            {/* Action Buttons - Same width as cover */}
            <div className="space-y-2 w-full">
              {book.available_copies > 0 ? (
                <button onClick={handleBorrow} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#2C1F14] text-white rounded-lg hover:bg-[#4A3728] transition text-sm font-medium">
                  <FaBookOpen size={14} />
                  Borrow This Book
                </button>
              ) : (
                <button onClick={handleReserve} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#C4895A] text-white rounded-lg hover:bg-[#D4A574] transition text-sm font-medium">
                  Reserve This Book
                </button>
              )}
              <button onClick={handleWishlistToggle} className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 border rounded-lg transition text-sm font-medium ${isWishlisted ? 'border-red-500 text-red-500 bg-red-50' : 'border-[#EAE0D0] text-[#4A3728] hover:border-[#C4895A] hover:text-[#C4895A]'}`}>
                {isWishlisted ? <FaHeart size={14} /> : <FaRegHeart size={14} />}
                {isWishlisted ? 'In Wishlist' : 'Add to Wishlist'}
              </button>
            </div>
          </div>

          {/* Right Column - Book Details */}
          <div className="flex-1">
            {/* Genre Tags */}
            <div className="flex flex-wrap gap-2 mb-3">
              <span className="px-2.5 py-1 bg-[#EAE0D0] text-[#6B4F40] text-xs rounded-full">{book.genre}</span>
              <span className="px-2.5 py-1 bg-[#EAE0D0] text-[#6B4F40] text-xs rounded-full">{book.language}</span>
              <span className="px-2.5 py-1 bg-[#EAE0D0] text-[#6B4F40] text-xs rounded-full">{book.published_year}</span>
            </div>

            {/* Title & Author */}
            <h1 className="font-serif text-3xl font-bold text-[#2C1F14] mb-1">{book.title}</h1>
            <p className="text-[#9A8478] text-sm mb-4">{book.author} · {book.publisher} · ISBN: {book.isbn}</p>

            {/* Stats Row */}
            <div className="flex flex-wrap items-center gap-6 mb-6 pb-4 border-b border-[#EAE0D0]">
              <div>
                <div className="text-xs text-[#9A8478] uppercase tracking-wide">Available Copies</div>
                <div className="text-xl font-bold text-[#2C1F14]">{book.available_copies} <span className="text-sm font-normal text-[#9A8478]">/ {book.total_copies}</span></div>
              </div>
              <div>
                <div className="text-xs text-[#9A8478] uppercase tracking-wide">Times Borrowed</div>
                <div className="text-xl font-bold text-[#2C1F14]">{book.total_borrow_count}</div>
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
                          ) : starValue === Math.ceil(avgRating) && avgRating % 1 !== 0 ? (
                            <FaStarHalfAlt className="text-yellow-400 text-sm" />
                          ) : (
                            <FaRegStar className="text-gray-300 text-sm" />
                          )}
                        </span>
                      );
                    })}
                  </div>
                  <span className="text-sm font-medium text-[#2C1F14]">{avgRating}</span>
                  <span className="text-xs text-[#9A8478]">({book.total_reviews || 0} reviews)</span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="mb-6">
              <h3 className="font-serif text-lg font-bold text-[#2C1F14] mb-2">Description</h3>
              <p className="text-[#4A3728] text-sm leading-relaxed">{book.description}</p>
            </div>

            {/* Tabs: Reviews & Reservation Queue */}
            <div className="mt-8">
              <div className="flex items-center gap-6 border-b border-[#EAE0D0] mb-5">
                <button 
                  onClick={() => setActiveTab('reviews')}
                  className={`pb-2.5 text-sm font-medium transition-all ${activeTab === 'reviews' ? 'text-[#C4895A] border-b-2 border-[#C4895A]' : 'text-[#9A8478] hover:text-[#4A3728]'}`}
                >
                  Reviews
                </button>
                <button 
                  onClick={() => setActiveTab('queue')}
                  className={`pb-2.5 text-sm font-medium transition-all ${activeTab === 'queue' ? 'text-[#C4895A] border-b-2 border-[#C4895A]' : 'text-[#9A8478] hover:text-[#4A3728]'}`}
                >
                  Reservation Queue
                </button>
              </div>

              {/* Reviews Tab */}
              {activeTab === 'reviews' && (
                <div>
                  {/* Write Review Section */}
                  <div className="bg-[#F3EDE3] rounded-xl p-5 mb-6">
                    <h3 className="font-serif text-base font-bold text-[#2C1F14] mb-3">Write a Review</h3>
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
                        rows="3" 
                        className="w-full px-4 py-2 text-sm border border-[#EAE0D0] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#C4895A] resize-none"
                      ></textarea>
                      <button type="submit" className="mt-3 px-4 py-1.5 text-sm bg-[#C4895A] text-white rounded-lg hover:bg-[#D4A574] transition">
                        Submit Review
                      </button>
                    </form>
                  </div>

                  {/* Reviews List */}
                  <div className="space-y-4">
                    {reviews.length > 0 ? (
                      reviews.map((review) => (
                        <div key={review.review_id} className="pb-4 border-b border-[#EAE0D0] last:border-0">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-9 h-9 bg-gradient-to-br from-[#2C1F14] to-[#4A3728] rounded-full flex items-center justify-center text-white text-xs font-medium">
                              {review.user_id === 1 ? 'PG' : review.user_id === 2 ? 'AT' : 'BN'}
                            </div>
                            <div>
                              <div className="font-medium text-sm text-[#2C1F14]">
                                {review.user_id === 1 ? 'Pujan G.' : review.user_id === 2 ? 'Alice T.' : 'Bibidh N.'}
                              </div>
                              <div className="flex items-center gap-1">
                                <div className="flex items-center gap-0.5">
                                  {[...Array(5)].map((_, i) => (
                                    <FaStar key={i} className={`text-[10px] ${i < review.rating ? 'text-yellow-400' : 'text-gray-300'}`} />
                                  ))}
                                </div>
                                <span className="text-[10px] text-[#9A8478]">{new Date(review.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                          <p className="text-[#4A3728] text-sm leading-relaxed ml-12">{review.review_text}</p>
                        </div>
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
                <div className="bg-[#F3EDE3] rounded-xl p-8 text-center">
                  <FaUsers className="text-4xl text-[#9A8478] mx-auto mb-3" />
                  <p className="text-[#4A3728] text-sm mb-3">No active reservations for this book.</p>
                  {book.available_copies === 0 && (
                    <button 
                      onClick={handleReserve} 
                      className="px-4 py-2 bg-[#C4895A] text-white rounded-lg hover:bg-[#D4A574] transition text-sm"
                    >
                      Be the first to reserve
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookDetailPage;