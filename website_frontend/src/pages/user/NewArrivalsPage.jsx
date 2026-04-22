// src/pages/NewArrivalsPage.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaArrowLeft, FaArrowRight, FaBook } from 'react-icons/fa';
import { newArrivalsAPI } from '../../services/api';

// Same card component as HomePage
const NewArrivalsCard = ({ book }) => {
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
  
  // Calculate days since added (if created_at exists)
  const getDaysSinceAdded = () => {
    if (!book.created_at) return null;
    const addedDate = new Date(book.created_at);
    const today = new Date();
    const diffTime = Math.abs(today - addedDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };
  
  const daysSinceAdded = getDaysSinceAdded();
  
  return (
    <div 
      className="book-card flex-none w-[185px] cursor-pointer transition-transform duration-250 hover:-translate-y-1.5"
      onClick={() => window.location.href = `/book/${book.book_id}`}
    >
      <div className={`book-cover w-full h-[230px] rounded-[12px] flex items-end p-3 relative overflow-hidden shadow-md transition-shadow duration-250 hover:shadow-xl bg-gradient-to-br from-[#2C1F14] to-[#4A3728]`}>
        <div className="absolute top-0 left-0 right-0 h-[40%] bg-gradient-to-b from-white/15 to-transparent rounded-t-[12px]"></div>
        
        {/* NEW badge for books added within 7 days */}
        {daysSinceAdded !== null && daysSinceAdded <= 7 && (
          <span className="absolute top-2 left-2 w-12 h-5 bg-[#C4895A] rounded-full flex items-center justify-center text-white text-[9px] font-bold z-10">
            NEW
          </span>
        )}
        
        <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-semibold z-10 ${status.color} text-white`}>
          {status.label}
        </span>
        
        {book.available_copies > 1 && (
          <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-full bg-black/50 text-white text-[9px] font-medium z-10">
            {book.available_copies} copies
          </span>
        )}
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

// Loading Skeleton (matching homepage style)
const LoadingSkeleton = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
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

// Pagination Component
const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  const pages = [];
  const maxVisible = 5;
  
  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let endPage = Math.min(totalPages, startPage + maxVisible - 1);
  
  if (endPage - startPage + 1 < maxVisible) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }
  
  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }
  
  return (
    <div className="flex justify-center items-center gap-2 mt-8 mb-4">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-2 rounded-lg border border-[#EAE0D0] hover:bg-[#F3EDE3] disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        <FaArrowLeft size={14} />
      </button>
      
      {startPage > 1 && (
        <>
          <button onClick={() => onPageChange(1)} className="px-3 py-1 rounded-lg hover:bg-[#F3EDE3] transition">1</button>
          {startPage > 2 && <span className="px-2">...</span>}
        </>
      )}
      
      {pages.map(page => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={`px-3 py-1 rounded-lg transition ${
            page === currentPage ? 'bg-[#C4895A] text-white' : 'hover:bg-[#F3EDE3]'
          }`}
        >
          {page}
        </button>
      ))}
      
      {endPage < totalPages && (
        <>
          {endPage < totalPages - 1 && <span className="px-2">...</span>}
          <button onClick={() => onPageChange(totalPages)} className="px-3 py-1 rounded-lg hover:bg-[#F3EDE3] transition">
            {totalPages}
          </button>
        </>
      )}
      
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-2 rounded-lg border border-[#EAE0D0] hover:bg-[#F3EDE3] disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        <FaArrowRight size={14} />
      </button>
    </div>
  );
};

const NewArrivalsPage = () => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalBooks, setTotalBooks] = useState(0);

  useEffect(() => {
    const fetchNewArrivals = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await newArrivalsAPI.getNewArrivals(currentPage, 15);
        setBooks(data.books || []);
        setTotalPages(data.total_pages || 1);
        setTotalBooks(data.total || 0);
      } catch (error) {
        console.error('Error fetching new arrivals:', error);
        setError('Failed to load new arrivals. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchNewArrivals();
  }, [currentPage]);

  if (loading && books.length === 0) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h1 className="font-serif text-4xl md:text-5xl font-bold text-[#2C1F14] mb-3">
              New Arrivals
            </h1>
            <p className="text-[#9A8478] max-w-2xl mx-auto">
              Recently added books to our collection
            </p>
          </div>
          <LoadingSkeleton />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <FaBook className="text-6xl text-[#C4895A]/30 mx-auto mb-4" />
            <h2 className="text-2xl font-serif text-[#2C1F14] mb-2">Oops! Something went wrong</h2>
            <p className="text-[#9A8478] mb-6">{error}</p>
            <button 
              onClick={() => window.location.reload()}
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
    <div className="min-h-screen bg-[#FAF7F2] pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-[#2C1F14] mb-3">
            New Arrivals
          </h1>
          <p className="text-[#9A8478] max-w-2xl mx-auto">
            Recently added books to our collection
          </p>
        </div>

  

        {/* Books Grid - Using same flex layout as homepage */}
        {books.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-[#EAE0D0]">
            <FaBook className="text-6xl text-[#C4895A]/30 mx-auto mb-4" />
            <p className="text-[#9A8478]">No new arrivals found.</p>
          </div>
        ) : (
          <>
            <div className="mb-4 text-sm text-[#9A8478]">
              Showing {books.length} of {totalBooks} new books
            </div>
            <div className="flex flex-wrap gap-[18px]">
              {books.map((book) => (
                <NewArrivalsCard key={book.book_id} book={book} />
              ))}
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default NewArrivalsPage;