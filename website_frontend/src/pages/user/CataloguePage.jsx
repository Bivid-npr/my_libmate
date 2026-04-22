// src/pages/CataloguePage.jsx
import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FaStar, FaThLarge, FaList, FaArrowLeft, FaArrowRight, FaTimes, FaBook } from 'react-icons/fa';
import { booksAPI } from '../../services/api';

// Language options
const LANGUAGES = [
  'English', 'Spanish', 'French', 'German', 'Chinese', 
  'Japanese', 'Russian', 'Italian', 'Portuguese', 'Arabic',
  'Hindi', 'Korean', 'Dutch', 'Swedish', 'Norwegian'
];

// Same card component as HomePage for Grid View
const BookGridCard = ({ book }) => {
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
      className="book-card cursor-pointer transition-transform duration-250 hover:-translate-y-1.5"
      onClick={() => window.location.href = `/book/${book.book_id}`}
    >
      <div className="book-cover w-full h-[230px] rounded-[12px] flex items-end p-3 relative overflow-hidden shadow-md transition-shadow duration-250 hover:shadow-xl bg-gradient-to-br from-[#2C1F14] to-[#4A3728]">
        <div className="absolute top-0 left-0 right-0 h-[40%] bg-gradient-to-b from-white/15 to-transparent rounded-t-[12px]"></div>
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

// Your original List Card - preserved exactly
const BookListCard = ({ book }) => (
  <div className="book-list-item flex gap-4 p-2.5 bg-[#F3EDE3] border border-[#EAE0D0] rounded-[12px] cursor-pointer hover:shadow-md hover:border-[#C4895A] transition-all" onClick={() => window.location.href = `/book/${book.book_id}`}>
    {/* Cover Image */}
    <div className="list-cover w-[100px] h-[150px] rounded-lg flex items-end p-2 overflow-hidden relative shadow-md flex-shrink-0 bg-gradient-to-br from-[#2C1F14] to-[#4A3728]">
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent rounded-lg"></div>
      <span className="list-cover-title font-serif text-[10px] text-white/90 font-semibold leading-tight z-10 line-clamp-2">{book.title}</span>
    </div>
    
    <div className="list-info flex-1 min-w-0">
      <div className="list-title font-serif text-lg font-bold text-[#2C1F14] mb-1 truncate">{book.title}</div>
      <div className="list-author text-sm text-[#9A8478] mb-2">{book.author} · {book.published_year || 'N/A'}</div>
      <div className="list-desc text-sm text-[#4A3728] leading-relaxed line-clamp-2 mb-3">{book.description || 'No description available.'}</div>
      <div className="list-meta flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1">
          <div className="book-rating flex items-center gap-0.5 text-xs text-[#C4895A]">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            {book.avg_rating || 'N/A'}
          </div>
          <span className="text-xs text-[#9A8478]">({book.total_reviews || 0})</span>
        </div>
        <span className="book-genre-tag text-[10.5px] px-1.5 py-0.5 bg-[#EAE0D0] rounded-full text-[#6B4F40]">{book.genre || 'General'}</span>
        {book.language && (
          <span className="text-xs text-[#9A8478]">{book.language}</span>
        )}
        <span className="text-xs text-[#9A8478]">{book.total_borrow_count || 0} borrows</span>
        <span className={`text-xs font-medium ${book.available_copies > 0 ? 'text-green-600' : 'text-red-600'}`}>
          {book.available_copies > 0 ? 'Available' : 'Unavailable'}
        </span>
      </div>
    </div>
    
    {/* Two Buttons */}
    <div className="list-action flex flex-col gap-2 justify-center flex-shrink-0">
      <button 
        className="px-5 py-2 text-sm font-medium rounded-lg border border-[#2C1F14] bg-[#2C1F14] text-white hover:bg-[#4A3728] hover:border-[#4A3728] transition whitespace-nowrap"
        onClick={(e) => e.stopPropagation()}
      >
        {book.available_copies > 0 ? 'Borrow' : 'Reserve'}
      </button>
      <button 
        className="px-5 py-2 text-sm font-medium rounded-lg border border-[#EAE0D0] bg-white text-[#4A3728] hover:border-[#C4895A] hover:text-[#C4895A] transition whitespace-nowrap"
        onClick={(e) => e.stopPropagation()}
      >
        Add to Wishlist
      </button>
    </div>
  </div>
);

// Loading Skeleton
const LoadingSkeleton = () => (
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
      <div key={i} className="animate-pulse">
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

const CataloguePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalBooks, setTotalBooks] = useState(0);
  const [sortOption, setSortOption] = useState('popular');
  
  // Search state from URL
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [searchType, setSearchType] = useState(searchParams.get('type') || 'all');
  
  // Filter states
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [selectedLanguages, setSelectedLanguages] = useState([]);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');
  
  // Static genres from API (won't disappear when filtering)
  const [allGenres, setAllGenres] = useState([]);
  
  // Temporary year values for the input fields
  const [tempYearFrom, setTempYearFrom] = useState('');
  const [tempYearTo, setTempYearTo] = useState('');

  // Fetch all genres once on mount
  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const genres = await booksAPI.getGenres();
        setAllGenres(genres);
      } catch (error) {
        console.error('Error fetching genres:', error);
      }
    };
    fetchGenres();
  }, []);

  // Read search params from URL
  useEffect(() => {
    const q = searchParams.get('q');
    const type = searchParams.get('type');
    const genre = searchParams.get('genre');
    const lang = searchParams.get('language');
    
    if (q) {
      setSearchQuery(q);
      setSearchType(type || 'all');
    } else {
      setSearchQuery('');
      setSearchType('all');
    }
    
    // Handle multiple genres from URL (comma-separated)
    if (genre) {
      setSelectedGenres(genre.split(','));
    } else {
      setSelectedGenres([]);
    }
    
    // Handle multiple languages from URL (comma-separated)
    if (lang) {
      setSelectedLanguages(lang.split(','));
    } else {
      setSelectedLanguages([]);
    }
  }, [searchParams]);

  // Fetch books from API
  useEffect(() => {
    const fetchBooks = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const params = {
          page: currentPage,
          per_page: 12,
        };
        
        if (searchQuery) {
          params.search = searchQuery;
        }
        
        // Handle multiple genres - send as comma-separated string
        if (selectedGenres.length > 0) {
          params.genre = selectedGenres.join(',');
        }
        
        // Handle multiple languages - send as comma-separated string
        if (selectedLanguages.length > 0) {
          params.language = selectedLanguages.join(',');
        }
        
        if (availableOnly) {
          params.available_only = true;
        }
        
        if (yearFrom) {
          params.year_from = yearFrom;
        }
        if (yearTo) {
          params.year_to = yearTo;
        }
        
        console.log('Fetching books with params:', params); // Debug log
        
        const data = await booksAPI.getBooks(params);
        setBooks(data.books || []);
        setTotalPages(data.total_pages || 1);
        setTotalBooks(data.total || 0);
      } catch (error) {
        console.error('Error fetching books:', error);
        setError('Failed to load books. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchBooks();
  }, [currentPage, selectedGenres, selectedLanguages, availableOnly, yearFrom, yearTo, searchQuery]);

  // Update URL when filters change
  useEffect(() => {
    const params = {};
    if (selectedGenres.length > 0) {
      params.genre = selectedGenres.join(',');
    }
    if (selectedLanguages.length > 0) {
      params.language = selectedLanguages.join(',');
    }
    if (searchQuery) {
      params.q = searchQuery;
      params.type = searchType;
    }
    setSearchParams(params);
  }, [selectedGenres, selectedLanguages, searchQuery, searchType, setSearchParams]);

  // Sort books
  const getSortedBooks = () => {
    let sorted = [...books];
    
    switch (sortOption) {
      case 'rating':
        sorted.sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0));
        break;
      case 'title':
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'newest':
        sorted.sort((a, b) => (b.published_year || 0) - (a.published_year || 0));
        break;
      case 'popular':
        sorted.sort((a, b) => (b.total_borrow_count || 0) - (a.total_borrow_count || 0));
        break;
      default:
        break;
    }
    
    return sorted;
  };

  const sortedBooks = getSortedBooks();

  const clearAllFilters = () => {
    setSelectedGenres([]);
    setSelectedLanguages([]);
    setAvailableOnly(false);
    setYearFrom('');
    setYearTo('');
    setTempYearFrom('');
    setTempYearTo('');
    setSearchQuery('');
    setSearchType('all');
    setSearchParams({});
    setCurrentPage(1);
  };

  const applyYearFilter = () => {
    setYearFrom(tempYearFrom);
    setYearTo(tempYearTo);
    setCurrentPage(1);
  };

  const hasActiveFilters = selectedGenres.length > 0 || 
                           selectedLanguages.length > 0 || 
                           availableOnly || 
                           yearFrom || 
                           yearTo;

  if (loading && books.length === 0) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] pt-24 pb-12">
        <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-40">
          <div className="results-header mb-5">
            <div className="h-8 bg-[#EAE0D0] rounded w-48 mb-2 animate-pulse"></div>
          </div>
          <LoadingSkeleton />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] pt-24 pb-12">
        <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-40">
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
    <div className="bg-[#FAF7F2] min-h-screen pt-24 pb-12">
      <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-40">
        <div className="results-layout grid grid-cols-1 md:grid-cols-[240px_1fr] gap-8">
          {/* Filter Sidebar */}
          <aside className="filter-sidebar sticky top-24">
            {/* Active Filters */}
            {hasActiveFilters && (
              <div className="filter-block bg-[#F3EDE3] border border-[#EAE0D0] rounded-[12px] p-4 mb-3">
                <div className="filter-block-title text-xs font-bold text-[#2C1F14] uppercase tracking-wide mb-3">
                  Active Filters
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedGenres.map(genre => (
                    <span key={genre} className="inline-flex items-center gap-1 px-2 py-1 bg-[#C4895A]/10 text-[#C4895A] text-xs rounded-full">
                      {genre}
                      <button onClick={() => setSelectedGenres(selectedGenres.filter(g => g !== genre))}>
                        <FaTimes size={10} />
                      </button>
                    </span>
                  ))}
                  {selectedLanguages.map(lang => (
                    <span key={lang} className="inline-flex items-center gap-1 px-2 py-1 bg-[#C4895A]/10 text-[#C4895A] text-xs rounded-full">
                      {lang}
                      <button onClick={() => setSelectedLanguages(selectedLanguages.filter(l => l !== lang))}>
                        <FaTimes size={10} />
                      </button>
                    </span>
                  ))}
                  {availableOnly && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#C4895A]/10 text-[#C4895A] text-xs rounded-full">
                      Available Only
                      <button onClick={() => setAvailableOnly(false)}>
                        <FaTimes size={10} />
                      </button>
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Availability Filter */}
            <div className="filter-block bg-[#F3EDE3] border border-[#EAE0D0] rounded-[12px] p-4 mb-3">
              <div className="filter-block-title text-xs font-bold text-[#2C1F14] uppercase tracking-wide mb-3">
                Availability
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={availableOnly} 
                  onChange={() => {
                    setAvailableOnly(!availableOnly);
                    setCurrentPage(1);
                  }}
                  className="accent-[#C4895A]" 
                />
                <span className="text-[13px] text-[#4A3728]">Available only</span>
              </label>
            </div>

            {/* Genre Filter - Checkboxes for multiple selection */}
            <div className="filter-block bg-[#F3EDE3] border border-[#EAE0D0] rounded-[12px] p-4 mb-3">
              <div className="filter-block-title text-xs font-bold text-[#2C1F14] uppercase tracking-wide mb-3">
                Genre
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                <label className="flex items-center gap-2 cursor-pointer pb-2 border-b border-[#EAE0D0]">
                  <input 
                    type="checkbox" 
                    checked={selectedGenres.length === 0}
                    onChange={() => setSelectedGenres([])}
                    className="accent-[#C4895A]" 
                  />
                  <span className="text-[13px] font-medium text-[#2C1F14]">All Genres</span>
                </label>
                {allGenres.map((genre) => (
                  <label key={genre} className="flex items-center gap-2 cursor-pointer ml-1">
                    <input 
                      type="checkbox" 
                      checked={selectedGenres.includes(genre)}
                      onChange={() => {
                        if (selectedGenres.includes(genre)) {
                          setSelectedGenres(selectedGenres.filter(g => g !== genre));
                        } else {
                          setSelectedGenres([...selectedGenres, genre]);
                        }
                        setCurrentPage(1);
                      }}
                      className="accent-[#C4895A]" 
                    />
                    <span className="text-[13px] text-[#4A3728]">{genre}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Language Filter */}
            <div className="filter-block bg-[#F3EDE3] border border-[#EAE0D0] rounded-[12px] p-4 mb-3">
              <div className="filter-block-title text-xs font-bold text-[#2C1F14] uppercase tracking-wide mb-3">
                Language
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                <label className="flex items-center gap-2 cursor-pointer pb-2 border-b border-[#EAE0D0]">
                  <input 
                    type="checkbox" 
                    checked={selectedLanguages.length === 0}
                    onChange={() => setSelectedLanguages([])}
                    className="accent-[#C4895A]" 
                  />
                  <span className="text-[13px] font-medium text-[#2C1F14]">All Languages</span>
                </label>
                {LANGUAGES.map((language) => (
                  <label key={language} className="flex items-center gap-2 cursor-pointer ml-1">
                    <input 
                      type="checkbox" 
                      checked={selectedLanguages.includes(language)}
                      onChange={() => {
                        if (selectedLanguages.includes(language)) {
                          setSelectedLanguages(selectedLanguages.filter(l => l !== language));
                        } else {
                          setSelectedLanguages([...selectedLanguages, language]);
                        }
                        setCurrentPage(1);
                      }}
                      className="accent-[#C4895A]" 
                    />
                    <span className="text-[13px] text-[#4A3728]">{language}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Published Year Filter with Apply button */}
            <div className="filter-block bg-[#F3EDE3] border border-[#EAE0D0] rounded-[12px] p-4 mb-3">
              <div className="filter-block-title text-xs font-bold text-[#2C1F14] uppercase tracking-wide mb-3">
                Published Year
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-[10px] text-[#9A8478] mb-1">From</div>
                  <input 
                    type="number" 
                    placeholder="2000" 
                    value={tempYearFrom} 
                    onChange={(e) => setTempYearFrom(e.target.value)} 
                    className="w-full px-2 py-1.5 text-xs border border-[#EAE0D0] rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#C4895A]"
                  />
                </div>
                <div>
                  <div className="text-[10px] text-[#9A8478] mb-1">To</div>
                  <input 
                    type="number" 
                    placeholder="2026" 
                    value={tempYearTo} 
                    onChange={(e) => setTempYearTo(e.target.value)} 
                    className="w-full px-2 py-1.5 text-xs border border-[#EAE0D0] rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#C4895A]"
                  />
                </div>
              </div>
              <button 
                onClick={applyYearFilter}
                className="w-full mt-2 py-1.5 text-xs bg-[#C4895A] text-white rounded-lg hover:bg-[#D4A574] transition"
              >
                Apply Year Range
              </button>
            </div>

            <button 
              onClick={clearAllFilters}
              className="w-full py-2 text-sm border border-[#EAE0D0] rounded-full hover:border-[#C4895A] hover:text-[#C4895A] transition"
            >
              Clear all filters
            </button>
          </aside>

          {/* Results Main */}
          <div>
            <div className="results-header flex justify-between items-center mb-5 flex-wrap gap-3">
              <div className="results-count text-sm text-[#9A8478]">
                {sortedBooks.length} results
              </div>
              <div className="results-controls flex items-center gap-3">
                <div className="view-toggle flex gap-1 p-1 bg-[#F3EDE3] rounded-lg border border-[#EAE0D0]">
                  <button 
                    onClick={() => setViewMode('grid')} 
                    className={`view-btn w-7 h-7 rounded-md flex items-center justify-center transition ${viewMode === 'grid' ? 'bg-[#2C1F14] text-white' : 'text-[#9A8478] hover:bg-[#EAE0D0]'}`}
                  >
                    <FaThLarge size={12} />
                  </button>
                  <button 
                    onClick={() => setViewMode('list')} 
                    className={`view-btn w-7 h-7 rounded-md flex items-center justify-center transition ${viewMode === 'list' ? 'bg-[#2C1F14] text-white' : 'text-[#9A8478] hover:bg-[#EAE0D0]'}`}
                  >
                    <FaList size={12} />
                  </button>
                </div>
                <select 
                  className="sort-sel px-3 py-1.5 text-xs border border-[#EAE0D0] rounded-lg bg-[#F3EDE3] text-[#2C1F14] outline-none cursor-pointer"
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value)}
                >
                  <option value="popular">Most Popular</option>
                  <option value="rating">Highest Rated</option>
                  <option value="title">Title A–Z</option>
                  <option value="newest">Newest First</option>
                </select>
              </div>
            </div>

            {sortedBooks.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-[#EAE0D0]">
                <FaBook className="text-6xl text-[#C4895A]/30 mx-auto mb-4" />
                <p className="text-[#9A8478]">No books found matching your criteria.</p>
                <button 
                  onClick={clearAllFilters}
                  className="mt-4 px-6 py-2 bg-[#C4895A] text-white rounded-full hover:bg-[#D4A574] transition"
                >
                  Clear Filters
                </button>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                {sortedBooks.map(book => (
                  <BookGridCard key={book.book_id} book={book} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {sortedBooks.map(book => (
                  <BookListCard key={book.book_id} book={book} />
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            )}

            {/* Request Book Prompt */}
            <div className="request-prompt mt-8 p-5 bg-[#F3EDE3] border border-[#EAE0D0] rounded-[12px] flex flex-col sm:flex-row justify-between items-center gap-4">
              <div>
                <div className="text-sm font-medium text-[#2C1F14] mb-1">Can't find what you're looking for?</div>
                <div className="text-xs text-[#9A8478]">Request a book and we'll try to add it to the library.</div>
              </div>
              <button className="px-4 py-2 text-sm border border-[#EAE0D0] rounded-full hover:border-[#C4895A] hover:text-[#C4895A] transition">
                Request a Book
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CataloguePage;