// src/pages/TrendingPage.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaFire, FaStar, FaBook, FaTrophy, FaArrowLeft, FaArrowRight } from 'react-icons/fa';
import { trendingAPI } from '../../services/api';

// Same card component as HomePage
const TrendingBookCard = ({ book }) => {
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
  
  return (
    <div 
      className="book-card cursor-pointer transition-all duration-300 hover:-translate-y-2"
      onClick={() => window.location.href = `/book/${book.book_id}`}
    >
      <div className="relative">
        <div className="book-cover w-full h-[230px] rounded-[12px] flex items-end p-3 relative overflow-hidden shadow-md transition-shadow duration-250 hover:shadow-xl bg-gradient-to-br from-[#2C1F14] to-[#4A3728]">
          <div className="absolute top-0 left-0 right-0 h-[40%] bg-gradient-to-b from-white/15 to-transparent rounded-t-[12px]"></div>
          
          {book.trend_rank && book.trend_rank <= 3 && (
            <span className="absolute top-2 left-2 w-6 h-6 bg-[#C4895A] rounded-full flex items-center justify-center text-white text-[10px] font-bold z-10">
              {book.trend_rank}
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

// Top 10 List Component (Sidebar)
const Top10List = ({ books, period, onPeriodChange, loading }) => {
  const getMedalColor = (rank) => {
    switch(rank) {
      case 1: return 'text-yellow-500';
      case 2: return 'text-gray-400';
      case 3: return 'text-amber-600';
      default: return 'text-[#C4895A]';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-[#EAE0D0] overflow-hidden sticky top-24">
      <div className="bg-gradient-to-r from-[#2C1F14] to-[#4A3728] px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FaTrophy className="text-[#C4895A] text-lg" />
            <h3 className="font-serif font-semibold text-white">Top 10</h3>
          </div>
          <div className="flex bg-white/10 rounded-full p-0.5">
            <button
              onClick={() => onPeriodChange('this_month')}
              className={`px-3 py-1 text-xs rounded-full transition ${
                period === 'this_month' ? 'bg-[#C4895A] text-white' : 'text-white/70 hover:text-white'
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => onPeriodChange('last_month')}
              className={`px-3 py-1 text-xs rounded-full transition ${
                period === 'last_month' ? 'bg-[#C4895A] text-white' : 'text-white/70 hover:text-white'
              }`}
            >
              Last Month
            </button>
          </div>
        </div>
      </div>
      <div className="divide-y divide-[#EAE0D0]">
        {loading ? (
          // Top 10 Loading Skeleton
          Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="px-4 py-3 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-[#EAE0D0]"></div>
                <div className="w-14 h-20 bg-[#EAE0D0] rounded-md"></div>
                <div className="flex-1">
                  <div className="h-4 bg-[#EAE0D0] rounded w-24 mb-2"></div>
                  <div className="h-3 bg-[#EAE0D0] rounded w-20 mb-2"></div>
                  <div className="flex gap-2">
                    <div className="h-3 bg-[#EAE0D0] rounded w-8"></div>
                    <div className="h-3 bg-[#EAE0D0] rounded w-8"></div>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : books.length === 0 ? (
          <div className="p-4 text-center text-[#9A8478] text-sm">No data available</div>
        ) : (
          books.map((book, index) => (
            <div 
              key={book.book_id}
              className="px-4 py-3 hover:bg-[#F3EDE3] cursor-pointer transition"
              onClick={() => window.location.href = `/book/${book.book_id}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm ${getMedalColor(index + 1)}`}>
                  {index + 1}
                </div>
                <div className="w-14 h-20 rounded-md bg-gradient-to-br from-[#2C1F14] to-[#4A3728] flex-shrink-0 overflow-hidden shadow-sm">
                  {book.cover_image ? (
                    <img src={book.cover_image} alt={book.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FaBook size={20} className="text-white/30" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[#2C1F14] truncate text-sm">
                    {book.title}
                  </div>
                  <div className="text-xs text-[#9A8478] truncate mt-0.5">
                    {book.author}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center gap-0.5">
                      <FaStar size={10} className="text-[#C4895A]" />
                      <span className="text-xs text-[#C4895A]">{book.avg_rating || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-0.5 text-xs text-[#9A8478]">
                      <FaFire size={10} />
                      <span>{book.borrow_count}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// Loading Skeleton for Books Grid
const LoadingSkeleton = () => (
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
      <div key={i} className="animate-pulse">
        <div className="w-full h-[230px] bg-[#EAE0D0] rounded-[12px]"></div>
        <div className="pt-2.5">
          <div className="h-3 bg-[#EAE0D0] rounded w-32 mb-2"></div>
          <div className="h-2 bg-[#EAE0D0] rounded w-24 mb-1"></div>
          <div className="flex gap-2">
            <div className="h-2 bg-[#EAE0D0] rounded w-8"></div>
            <div className="h-2 bg-[#EAE0D0] rounded w-12"></div>
          </div>
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

const TrendingPage = () => {
  const [topPeriod, setTopPeriod] = useState('this_month');
  const [allBooks, setAllBooks] = useState([]);
  const [topBooks, setTopBooks] = useState([]);
  const [loadingAll, setLoadingAll] = useState(true);
  const [loadingTop, setLoadingTop] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalBooks, setTotalBooks] = useState(0);

  useEffect(() => {
    const fetchTrendingBooks = async () => {
      try {
        setLoadingAll(true);
        setError(null);
        const data = await trendingAPI.getAllTrendingBooks(currentPage, 12);
        setAllBooks(data.books);
        setTotalPages(data.total_pages);
        setTotalBooks(data.total);
      } catch (error) {
        console.error('Error fetching books:', error);
        setError('Failed to load books. Please try again later.');
      } finally {
        setLoadingAll(false);
      }
    };
    
    fetchTrendingBooks();
  }, [currentPage]);

  useEffect(() => {
    const fetchTop10 = async () => {
      try {
        setLoadingTop(true);
        const data = await trendingAPI.getTopTrending(topPeriod);
        setTopBooks(data);
      } catch (error) {
        console.error('Error fetching top 10:', error);
        setTopBooks([]);
      } finally {
        setLoadingTop(false);
      }
    };
    
    fetchTop10();
  }, [topPeriod]);

  // Proper loading state that matches the actual layout
  if (loadingAll && allBooks.length === 0) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header - Left aligned, matching actual page */}
          <div className="mb-8">
            <div className="h-12 w-64 bg-[#EAE0D0] rounded animate-pulse mb-3"></div>
            <div className="h-5 w-96 bg-[#EAE0D0] rounded animate-pulse"></div>
          </div>

          {/* Two Column Layout - Same as actual page */}
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left Side - Books Grid Loading */}
            <div className="flex-1">
              <div className="mb-4 pt-4">
                <div className="h-4 w-48 bg-[#EAE0D0] rounded animate-pulse"></div>
              </div>
              <LoadingSkeleton />
            </div>

            {/* Right Side - Top 10 Sidebar Loading */}
            <div className="w-85 flex-shrink-0">
              <div className="bg-white rounded-xl shadow-sm border border-[#EAE0D0] overflow-hidden">
                <div className="bg-gradient-to-r from-[#2C1F14] to-[#4A3728] px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 bg-[#C4895A]/50 rounded animate-pulse"></div>
                      <div className="h-5 w-16 bg-white/20 rounded animate-pulse"></div>
                    </div>
                    <div className="flex gap-1">
                      <div className="h-6 w-20 bg-white/10 rounded-full animate-pulse"></div>
                      <div className="h-6 w-20 bg-white/10 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                </div>
                <div className="divide-y divide-[#EAE0D0]">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="px-4 py-3 animate-pulse">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-[#EAE0D0]"></div>
                        <div className="w-14 h-20 bg-[#EAE0D0] rounded-md"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-[#EAE0D0] rounded w-24 mb-2"></div>
                          <div className="h-3 bg-[#EAE0D0] rounded w-20 mb-2"></div>
                          <div className="flex gap-2">
                            <div className="h-3 bg-[#EAE0D0] rounded w-8"></div>
                            <div className="h-3 bg-[#EAE0D0] rounded w-8"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <FaFire className="text-6xl text-[#C4895A]/30 mx-auto mb-4" />
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
    <div className="min-h-screen bg-[#FAF7F2] pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header - Left aligned */}
        <div className="mb-8">
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-[#2C1F14] mb-3">
            Trending Books
          </h1>
          <p className="text-[#9A8478] max-w-2xl">
            Books that have made it to our trending lists
          </p>
        </div>

        {/* Two Column Layout */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Side - Books Catalogue with Pagination */}
          <div className="flex-1">
            {allBooks.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-[#EAE0D0]">
                <FaBook className="text-6xl text-[#C4895A]/30 mx-auto mb-4" />
                <p className="text-[#9A8478]">No trending books found.</p>
              </div>
            ) : (
              <>
                <div className="mb-4 pt-4 text-sm text-[#9A8478]">
                  Showing {allBooks.length} of {totalBooks} trending books
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                  {allBooks.map((book) => (
                    <TrendingBookCard key={book.book_id} book={book} />
                  ))}
                </div>
                
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

          {/* Right Side - Top 10 Sidebar */}
          <div className="w-85 flex-shrink-0">
            <Top10List 
              books={topBooks} 
              period={topPeriod}
              onPeriodChange={setTopPeriod}
              loading={loadingTop}
            /> 
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrendingPage;