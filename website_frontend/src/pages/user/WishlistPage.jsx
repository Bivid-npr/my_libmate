// src/pages/user/WishlistPage.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaHeart, FaTrash, FaBook, FaStar } from 'react-icons/fa';
import { usersAPI } from '../../services/api';

// Same card component as HomePage/NewArrivals
const WishlistCard = ({ book, onRemove }) => {
  const getStatusDisplay = () => {
    if (book.available_copies > 0) {
      return { label: 'Available', color: 'bg-[#4A7C59]/90' };
    }
    
    switch (book.status) {
      case 'reserved':
        return { label: 'Reserved', color: 'bg-[#D4A574]/90' };
      case 'checked_out':
        return { label: 'Checked Out', color: 'bg-[#B85450]/85' };
      case 'unavailable':
        return { label: 'Unavailable', color: 'bg-[#9A8478]/85' };
      default:
        return { label: 'Unavailable', color: 'bg-[#B85450]/85' };
    }
  };
  
  const status = getStatusDisplay();
  
  const handleRemove = (e) => {
    e.stopPropagation();
    onRemove(book.book_id);
  };
  
  return (
    <div 
      className="book-card flex-none w-[185px] cursor-pointer transition-transform duration-250 hover:-translate-y-1.5"
      onClick={() => window.location.href = `/book/${book.book_id}`}
    >
      <div className="relative">
        <div className={`book-cover w-full h-[230px] rounded-[12px] flex items-end p-3 relative overflow-hidden shadow-md transition-shadow duration-250 hover:shadow-xl bg-gradient-to-br from-[#2C1F14] to-[#4A3728]`}>
          <div className="absolute top-0 left-0 right-0 h-[40%] bg-gradient-to-b from-white/15 to-transparent rounded-t-[12px]"></div>
          
          {/* Remove button */}
          <button 
            onClick={handleRemove}
            className="absolute top-2 right-2 w-7 h-7 bg-black/50 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-500 z-10"
          >
            <FaTrash size={12} />
          </button>
          
          <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-semibold z-10 ${status.color} text-white`}>
            {status.label}
          </span>
          
          {book.available_copies > 1 && (
            <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-full bg-black/50 text-white text-[9px] font-medium z-10">
              {book.available_copies} copies
            </span>
          )}
        </div>
      </div>
      
      <div className="book-info pt-2.5 px-0.5">
        <div className="book-title-card font-serif text-[13px] font-semibold text-[#2C1F14] leading-tight line-clamp-2 mb-0.5">
          {book.title}
        </div>
        <div className="book-author-card text-[11.5px] text-[#9A8478] mb-1">
          {book.author}
        </div>
        <div className="book-meta flex items-center gap-1.5 flex-wrap">
          <div className="book-rating flex items-center gap-0.5 text-[11.5px] text-[#C4895A] font-medium">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            {book.avg_rating || 'N/A'}
          </div>
          <span className="book-genre-tag text-[10.5px] px-1.5 py-0.5 bg-[#EAE0D0] rounded-full text-[#6B4F40]">
            {book.genre || 'General'}
          </span>
        </div>
      </div>
    </div>
  );
};

// Loading Skeleton
const LoadingSkeleton = () => (
  <div className="flex flex-wrap gap-[18px]">
    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
      <div key={i} className="flex-none w-[185px] animate-pulse">
        <div className="w-full h-[230px] bg-[#EAE0D0] rounded-[12px]"></div>
        <div className="pt-2.5">
          <div className="h-3 bg-[#EAE0D0] rounded w-32 mb-2"></div>
          <div className="h-2 bg-[#EAE0D0] rounded w-24 mb-1"></div>
          <div className="h-2 bg-[#EAE0D0] rounded w-20"></div>
        </div>
      </div>
    ))}
  </div>
);

const WishlistPage = () => {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchWishlist();
  }, []);

  const fetchWishlist = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await usersAPI.getWishlist();
      setWishlist(data || []);
    } catch (error) {
      console.error('Error fetching wishlist:', error);
      setError('Failed to load wishlist. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromWishlist = async (bookId) => {
    try {
      await usersAPI.removeFromWishlist(bookId);
      // Remove from local state
      setWishlist(wishlist.filter(book => book.book_id !== bookId));
    } catch (error) {
      console.error('Error removing from wishlist:', error);
    }
  };

  if (loading) {
    return (
      <div className="bg-[#FAF7F2] min-h-screen pt-24 pb-12">
        <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-40">
          <div className="mb-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#EAE0D0] rounded-full animate-pulse"></div>
              <div className="h-8 w-48 bg-[#EAE0D0] rounded animate-pulse"></div>
            </div>
            <div className="h-4 w-64 bg-[#EAE0D0] rounded mt-2 animate-pulse"></div>
          </div>
          <LoadingSkeleton />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#FAF7F2] min-h-screen pt-24 pb-12">
        <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-40">
          <div className="text-center py-12 bg-white rounded-xl border border-[#EAE0D0]">
            <FaBook className="text-6xl text-[#C4895A]/30 mx-auto mb-4" />
            <h2 className="text-2xl font-serif text-[#2C1F14] mb-2">Oops! Something went wrong</h2>
            <p className="text-[#9A8478] mb-6">{error}</p>
            <button 
              onClick={fetchWishlist}
              className="px-6 py-2 bg-[#C4895A] text-white rounded-full hover:bg-[#D4A574] transition"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#FAF7F2] min-h-screen pt-24 pb-12">
      <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-40">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <FaHeart className="text-[#C4895A] text-2xl" />
            <h1 className="font-serif text-3xl font-bold text-[#2C1F14]">My Wishlist</h1>
          </div>
          <p className="text-[#9A8478] mt-1">
            Books you plan to read — {wishlist.length} {wishlist.length === 1 ? 'book' : 'books'} saved
          </p>
        </div>

        {wishlist.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-[#EAE0D0]">
            <div className="w-20 h-20 bg-[#C4895A]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaHeart className="text-[#C4895A] text-3xl" />
            </div>
            <p className="text-[#9A8478] mb-4">Your wishlist is empty</p>
            <Link 
              to="/catalogue" 
              className="inline-block px-6 py-2 bg-[#2C1F14] text-white rounded-full hover:bg-[#4A3728] transition"
            >
              Browse Books
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-4 text-sm text-[#9A8478]">
              Showing {wishlist.length} saved {wishlist.length === 1 ? 'book' : 'books'}
            </div>
            <div className="flex flex-wrap gap-[18px]">
              {wishlist.map((book) => (
                <WishlistCard 
                  key={book.book_id} 
                  book={book} 
                  onRemove={handleRemoveFromWishlist}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default WishlistPage;