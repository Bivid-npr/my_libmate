// src/pages/HomePage.jsx
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaArrowRight, FaArrowLeft, FaBook, FaRocket, FaDragon, FaSearch, FaUserAlt, FaLandmark, FaHeartbeat, FaPenFancy, FaTheaterMasks, FaRobot, FaMagic, FaBrain } from 'react-icons/fa';
import { trendingAPI, booksAPI, newArrivalsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import HeroCarousel from '../../components/Home/HeroCarousel';
import logoNav from '../../assets/logo_navx360.svg';

// HomePage Compact Card
const HomePageCard = ({ book, showRank = false, rank }) => {
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
      className="book-card flex-none w-[185px] cursor-pointer transition-transform duration-250 hover:-translate-y-1.5"
      onClick={() => window.location.href = `/book/${book.book_id}`}
    >
      <div className={`book-cover w-full h-[230px] rounded-[12px] flex items-end p-3 relative overflow-hidden shadow-md transition-shadow duration-250 hover:shadow-xl bg-gradient-to-br from-[#2C1F14] to-[#4A3728]`}>
        <div className="absolute top-0 left-0 right-0 h-[40%] bg-gradient-to-b from-white/15 to-transparent rounded-t-[12px]"></div>
        {showRank && rank && (
          <span className="absolute top-2 left-2 w-6 h-6 bg-[#C4895A] rounded-full flex items-center justify-center text-white text-[10px] font-bold z-10">
            {rank}
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

// Loading Skeleton Component
const LoadingSkeleton = () => (
  <div className="flex gap-[18px] overflow-x-auto py-2">
    {[1, 2, 3, 4, 5, 6].map((i) => (
      <div key={i} className="flex-none w-[172px] animate-pulse">
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

// Scroll Section Component
const ScrollSection = ({ title, subtitle, viewAllLink, books, showRank, scrollRef, scrollLeft, scrollRight, loading }) => (
  <div className="section py-[20px] reveal opacity-0 translate-y-5 transition-[opacity_transform] duration-600">
    <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-40">
      <div className="section-header flex justify-between items-end mb-5">
        <div>
          <div className="section-title font-serif text-[26px] font-bold text-[#2C1F14] tracking-[-0.3px]">{title}</div>
          <div className="section-sub text-[13px] text-[#9A8478] mt-1">{subtitle}</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-2">
            <Link to={viewAllLink} className="section-link text-[13.5px] font-medium text-[#C4895A] flex items-center gap-1 hover:gap-2 transition-all whitespace-nowrap">
              View all
              <FaArrowRight size={12} />
            </Link>
            <div className="w-px h-4 bg-[#EAE0D0] mx-1"></div>
            <button 
              onClick={() => scrollLeft(scrollRef)}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-[#EAE0D0] hover:bg-[#C4895A] hover:text-white transition-all duration-200"
              aria-label="Scroll left"
            >
              <FaArrowLeft size={14} />
            </button>
            <button 
              onClick={() => scrollRight(scrollRef)}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-[#EAE0D0] hover:bg-[#C4895A] hover:text-white transition-all duration-200"
              aria-label="Scroll right"
            >
              <FaArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
      {loading ? (
        <LoadingSkeleton />
      ) : (
        <div 
          ref={scrollRef}
          className="h-scroll flex gap-[18px] overflow-x-auto py-2 scrollbar-hide scroll-smooth"
          style={{ scrollBehavior: 'smooth' }}
        >
          {books.map((book, index) => (
            <HomePageCard key={book.book_id} book={book} showRank={showRank} rank={showRank ? index + 1 : null} />
          ))}
        </div>
      )}
    </div>
  </div>
);

const HomePage = () => {
  const { isAuthenticated, user } = useAuth();
  const [trendingBooks, setTrendingBooks] = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);
  const [loadingTrending, setLoadingTrending] = useState(true);
  const [loadingNewArrivals, setLoadingNewArrivals] = useState(true);
  const [genres, setGenres] = useState([]);
  const [genreCounts, setGenreCounts] = useState({});
  
  const trendingScrollRef = useRef(null);
  const newArrivalsScrollRef = useRef(null);

  // Fetch trending books
  useEffect(() => {
    const fetchTrending = async () => {
      try {
        setLoadingTrending(true);
        const data = await trendingAPI.getTrending(10);
        setTrendingBooks(data);
      } catch (error) {
        console.error('Error fetching trending books:', error);
        try {
          const booksData = await booksAPI.getBooks({ per_page: 10 });
          setTrendingBooks(booksData.books || []);
        } catch (fallbackError) {
          console.error('Fallback also failed:', fallbackError);
        }
      } finally {
        setLoadingTrending(false);
      }
    };
    
    fetchTrending();
  }, []);

  // Fetch new arrivals
  useEffect(() => {
    const fetchNewArrivals = async () => {
      try {
        setLoadingNewArrivals(true);
        const data = await newArrivalsAPI.getLatest(10);
        setNewArrivals(data);
      } catch (error) {
        console.error('Error fetching new arrivals:', error);
        try {
          const booksData = await booksAPI.getBooks({ per_page: 10 });
          setNewArrivals(booksData.books || []);
        } catch (fallbackError) {
          console.error('Fallback also failed:', fallbackError);
        }
      } finally {
        setLoadingNewArrivals(false);
      }
    };
    
    fetchNewArrivals();
  }, []);

  // Fetch genres and their counts
  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const genresList = await booksAPI.getGenres();
        setGenres(genresList);
        
        const counts = {};
        for (const genre of genresList) {
          try {
            const booksData = await booksAPI.getBooks({ genre, per_page: 1 });
            counts[genre] = booksData.total || 0;
          } catch (e) {
            counts[genre] = 0;
          }
        }
        setGenreCounts(counts);
      } catch (error) {
        console.error('Error fetching genres:', error);
        setGenres(['Fiction', 'Science Fiction', 'Fantasy', 'Mystery', 'Biography', 'History', 'Self-Help', 'Memoir']);
      }
    };
    
    fetchGenres();
  }, []);

  useEffect(() => {
    const revealElements = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.08 });
    revealElements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const isElementInViewport = (el) => {
      const rect = el.getBoundingClientRect();
      return rect.top < window.innerHeight && rect.bottom > 0;
    };

    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      if (e.key === 'ArrowLeft') {
        if (trendingScrollRef.current && isElementInViewport(trendingScrollRef.current)) {
          trendingScrollRef.current.scrollBy({ left: -300, behavior: 'smooth' });
        }
        if (newArrivalsScrollRef.current && isElementInViewport(newArrivalsScrollRef.current)) {
          newArrivalsScrollRef.current.scrollBy({ left: -300, behavior: 'smooth' });
        }
      } else if (e.key === 'ArrowRight') {
        if (trendingScrollRef.current && isElementInViewport(trendingScrollRef.current)) {
          trendingScrollRef.current.scrollBy({ left: 300, behavior: 'smooth' });
        }
        if (newArrivalsScrollRef.current && isElementInViewport(newArrivalsScrollRef.current)) {
          newArrivalsScrollRef.current.scrollBy({ left: 300, behavior: 'smooth' });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const scrollLeft = (ref) => {
    if (ref.current) {
      ref.current.scrollBy({ left: -406, behavior: 'smooth' });
    }
  };

  const scrollRight = (ref) => {
    if (ref.current) {
      ref.current.scrollBy({ left: 406, behavior: 'smooth' });
    }
  };

  // Genre icons mapping with real React Icons
  const getGenreIcon = (genreName) => {
    const iconMap = {
      'Fiction': <FaBook size={28} />,
      'Science Fiction': <FaRocket size={28} />,
      'Fantasy': <FaDragon size={28} />,
      'Mystery': <FaSearch size={28} />,
      'Biography': <FaUserAlt size={28} />,
      'History': <FaLandmark size={28} />,
      'Self-Help': <FaHeartbeat size={28} />,
      'Memoir': <FaPenFancy size={28} />,
      'Literary Fiction': <FaBook size={28} />,
      'Contemporary Fiction': <FaBook size={28} />,
      'Historical Fiction': <FaLandmark size={28} />,
      'Psychological Thriller': <FaTheaterMasks size={28} />,
      'Speculative Fiction': <FaRobot size={28} />,
      'Horror': <FaTheaterMasks size={28} />,
      'Romance': <FaHeartbeat size={28} />,
      'Thriller': <FaSearch size={28} />,
    };
    return iconMap[genreName] || <FaBook size={28} />;
  };

  // Use genres from API or fallback
  const displayGenres = genres.length > 0 ? genres.slice(0, 8) : [
    { name: 'Fiction', count: 142 },
    { name: 'Science Fiction', count: 98 },
    { name: 'Fantasy', count: 115 },
    { name: 'Mystery', count: 76 },
    { name: 'Biography', count: 54 },
    { name: 'History', count: 89 },
    { name: 'Self-Help', count: 63 },
    { name: 'Memoir', count: 41 },
  ];

  return (
    <div className="bg-[#FAF7F2]">
      {/* Hero Section - Conditional based on auth status */}
      <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-40 pt-[80px] pb-12">
        {isAuthenticated ? (
          <HeroCarousel />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center min-h-[70vh]">
            <div className="fade-up animate-[fadeUp_0.5s_ease_both]">
              <div className="hero-tag inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#EAE0D0] rounded-full text-[11.5px] font-medium text-[#6B4F40] uppercase tracking-wide mb-6">
                <span className="w-1.5 h-1.5 bg-[#C4895A] rounded-full animate-[heroPulse_2s_ease_infinite]"></span>
                Smart Library Management System
              </div>
              <h1 className="font-serif text-[clamp(40px,5vw,60px)] font-bold text-[#2C1F14] leading-[1.1] mb-4 tracking-[-1px]">
                Your library,<br /><em className="italic text-[#C4895A] not-italic">anywhere</em> you are.
              </h1>
              <p className="hero-sub text-[16.5px] leading-relaxed text-[#9A8478] font-light max-w-[440px] mb-9">
                Browse thousands of books, track your reading journey, reserve titles, and get AI-powered recommendations — all from one warm corner of the web.
              </p>
              <div className="hero-btns flex gap-3 flex-wrap">
                <Link to="/catalogue" className="inline-flex items-center gap-2 px-[30px] py-[13px] bg-[#2C1F14] text-[#FAF7F2] rounded-full font-medium text-[15px] hover:bg-[#6B4F40] hover:-translate-y-0.5 hover:shadow-lg transition-all duration-250">
                  Explore Books
                  <FaArrowRight size={14} />
                </Link>
                <Link to="/register" className="inline-flex items-center gap-2 px-[30px] py-[13px] bg-transparent text-[#4A3728] rounded-full font-medium text-[15px] border border-[#EAE0D0] hover:border-[#8B6F5E] hover:bg-[#F3EDE3] transition-all duration-250">
                  Become a Member
                </Link>
              </div>
              <div className="hero-stats flex gap-7 mt-11 pt-7 border-t border-[#EAE0D0]">
                <div><div className="font-serif text-[26px] font-bold text-[#2C1F14]">2,400+</div><div className="text-xs text-[#9A8478] mt-0.5">Books available</div></div>
                <div><div className="font-serif text-[26px] font-bold text-[#2C1F14]">380+</div><div className="text-xs text-[#9A8478] mt-0.5">Active members</div></div>
                <div><div className="font-serif text-[26px] font-bold text-[#2C1F14]">{genres.length || 12}</div><div className="text-xs text-[#9A8478] mt-0.5">Genres covered</div></div>
              </div>
            </div>
            <div className="hero-visual relative fade-up animate-[fadeUp_0.5s_ease_both_0.15s]">
              <div className="books-grid-vis grid grid-cols-3 gap-3 p-6 bg-[#F3EDE3] rounded-2xl border border-[#EAE0D0] shadow-xl">
                {trendingBooks.slice(0, 6).map((book, index) => (
                  <div
                    key={book.book_id}
                    className="vis-spine h-[170px] rounded-lg flex items-end p-2.5 cursor-pointer transition-all duration-250 hover:-translate-y-1.5 hover:-rotate-1 hover:shadow-xl overflow-hidden relative bg-gradient-to-br from-[#2C1F14] to-[#4A3728]"
                    onClick={() => window.location.href = `/book/${book.book_id}`}
                  >
                    <div className="absolute top-0 left-0 right-0 h-[35%] bg-gradient-to-b from-white/15 to-transparent rounded-t-lg"></div>
                    <span className="vis-spine-title font-serif text-[10px] text-white/90 font-semibold leading-tight z-10">{book.title}</span>
                  </div>
                ))}
              </div>
              <div className="hero-ai-badge absolute -top-4 -right-4 w-[76px] h-[76px] bg-[#C4895A] rounded-full flex flex-col items-center justify-center shadow-lg animate-[rotateBadge_20s_linear_infinite]">
                <span className="ai-badge-text font-serif text-[10px] text-white text-center font-bold leading-tight">AI<br />Powered</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <ScrollSection 
        title="Trending This Month"
        subtitle="What everyone's reading · Collaborative filtering"
        viewAllLink="/trending"
        books={trendingBooks}
        showRank={false}
        scrollRef={trendingScrollRef}
        scrollLeft={scrollLeft}
        scrollRight={scrollRight}
        loading={loadingTrending}
      />

      <div className="divider h-px bg-gradient-to-r from-transparent via-[#EAE0D0] to-transparent"></div>

      <ScrollSection 
        title="New Arrivals"
        subtitle="Recently added to the collection"
        viewAllLink="/new-arrivals"
        books={newArrivals}
        showRank={false}
        scrollRef={newArrivalsScrollRef}
        scrollLeft={scrollLeft}
        scrollRight={scrollRight}
        loading={loadingNewArrivals}
      />

      <div className="section py-[20px] reveal opacity-0 translate-y-5 transition-[opacity_transform] duration-600">
        <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-40">
          <div className="section-header flex justify-between items-end mb-7">
            <div>
              <div className="section-title font-serif text-[26px] font-bold text-[#2C1F14] tracking-[-0.3px]">Browse by Genre</div>
              <div className="section-sub text-[13px] text-[#9A8478] mt-1">Find exactly what you're looking for</div>
            </div>
          </div>
          <div className="genre-grid grid grid-cols-2 md:grid-cols-4 gap-3.5">
            {displayGenres.map((genre) => {
              const genreName = typeof genre === 'string' ? genre : genre.name;
              const genreCount = typeof genre === 'string' ? (genreCounts[genreName] || 0) : genre.count;
              
              return (
                <Link
                  key={genreName}
                  to={`/catalogue?genre=${encodeURIComponent(genreName)}`}
                  className="genre-card p-6 rounded-[12px] border border-[#EAE0D0] bg-[#F3EDE3] cursor-pointer transition-all duration-200 hover:border-[#D4A574] hover:-translate-y-0.5 hover:shadow-md text-center"
                >
                  <div className="genre-icon text-[#C4895A] flex justify-center mb-2.5">
                    {getGenreIcon(genreName)}
                  </div>
                  <div className="genre-name font-serif text-[15px] font-semibold text-[#2C1F14] mb-0.5">{genreName}</div>
                  <div className="genre-count text-xs text-[#9A8478]">{genreCount} books</div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Membership Banner */}
      <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-40">
        <div className="memb-banner p-8 md:p-12 lg:p-14 bg-[#2C1F14] rounded-2xl grid grid-cols-1 md:grid-cols-[1fr_auto] items-center gap-8 md:gap-10 relative overflow-hidden mb-16 md:mb-20">
          <div className="absolute top-[-80px] right-[160px] w-[300px] h-[300px] rounded-full bg-[#C4895A] opacity-5"></div>
          <div className="relative z-10">
            <div className="memb-tag inline-block px-3 py-1 bg-[#C4895A]/20 rounded-full text-[11px] font-medium text-[#D4A574] uppercase tracking-wide mb-3.5">Membership</div>
            <div className="memb-title font-serif text-2xl md:text-3xl lg:text-[34px] font-bold text-[#FAF7F2] leading-tight tracking-[-0.5px] mb-2.5">
              Unlock the full<br /><em className="italic text-[#D4A574] not-italic">library experience.</em>
            </div>
            <div className="memb-sub text-sm text-[#FAF7F2]/55 leading-relaxed max-w-[480px]">
              Reserve books, track your reading, and get AI-powered personalised recommendations based on your reading history — all with a SmartLib membership.
            </div>
          </div>
          <div className="plan-cards flex flex-col gap-3 z-10">
            <div className="plan-card px-6 py-[18px] bg-[#FAF7F2]/10 border border-[#FAF7F2]/20 rounded-xl cursor-pointer transition-all duration-200 hover:bg-[#FAF7F2]/20 text-center min-w-[140px] md:min-w-[170px]" onClick={() => window.location.href = '/register'}>
              <div className="plan-dur text-xs text-[#FAF7F2]/55 mb-1">3 Months</div>
              <div className="plan-price font-serif text-xl md:text-2xl font-bold text-[#FAF7F2]">NPR 200</div>
              <span className="plan-cta inline-block mt-1.5 text-[11px] text-[#FAF7F2]/60">Get started →</span>
            </div>
            <div className="plan-card px-6 py-[18px] bg-[#C4895A] border border-[#C4895A] rounded-xl cursor-pointer transition-all duration-200 text-center min-w-[140px] md:min-w-[170px]" onClick={() => window.location.href = '/register'}>
              <div className="plan-dur text-xs text-white/80 mb-1">6 Months · Best value</div>
              <div className="plan-price font-serif text-xl md:text-2xl font-bold text-[#FAF7F2]">NPR 500</div>
              <span className="plan-cta inline-block mt-1.5 text-[11px] text-white/80">Get started →</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-12 border-t border-[#EAE0D0] bg-[#F3EDE3]">
        <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-40">
          <div className="footer-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 mb-9">
            <div>
              {/* Logo Section - Updated with actual logo */}
              <Link to="/" className="nav-logo flex items-center gap-2.5 mb-3.5">
                <img 
                  src={logoNav} 
                  alt="LibMate Logo" 
                  className="h-12 w-auto"
                />
              </Link>
              <p className="footer-desc text-[13.5px] text-[#9A8478] leading-relaxed my-3.5 mb-[18px]">
                A smart, modern library management system bringing books and readers together with AI and IoT technology.
              </p>
              <div className="footer-contact text-[13px] text-[#9A8478] leading-8">
                <strong className="text-[#4A3728]">Phone:</strong> +977-01-XXXXXXX<br />
                <strong className="text-[#4A3728]">Email:</strong> library@libmate.edu.np<br />
                <strong className="text-[#4A3728]">Address:</strong> Kathmandu, Nepal
              </div>
            </div>
            {/* Rest of the footer columns remain the same */}
            <div>
              <div className="footer-col-title font-serif text-[14px] font-bold text-[#2C1F14] mb-3.5">Explore</div>
              <ul className="footer-links space-y-2">
                <li><Link to="/catalogue" className="text-[13.5px] text-[#9A8478] hover:text-[#C4895A] transition-colors">Book Catalogue</Link></li>
                <li><Link to="/trending" className="text-[13.5px] text-[#9A8478] hover:text-[#C4895A] transition-colors">Trending Books</Link></li>
                <li><Link to="/new-arrivals" className="text-[13.5px] text-[#9A8478] hover:text-[#C4895A] transition-colors">New Arrivals</Link></li>
                <li><Link to="/catalogue" className="text-[13.5px] text-[#9A8478] hover:text-[#C4895A] transition-colors">Browse Genres</Link></li>
              </ul>
            </div>
            <div>
              <div className="footer-col-title font-serif text-[14px] font-bold text-[#2C1F14] mb-3.5">Account</div>
              <ul className="footer-links space-y-2">
                <li><Link to="/login" className="text-[13.5px] text-[#9A8478] hover:text-[#C4895A] transition-colors">Log In</Link></li>
                <li><Link to="/register" className="text-[13.5px] text-[#9A8478] hover:text-[#C4895A] transition-colors">Register</Link></li>
                <li><Link to="/my-books" className="text-[13.5px] text-[#9A8478] hover:text-[#C4895A] transition-colors">My Books</Link></li>
                <li><Link to="/profile" className="text-[13.5px] text-[#9A8478] hover:text-[#C4895A] transition-colors">Membership</Link></li>
              </ul>
            </div>
            <div>
              <div className="footer-col-title font-serif text-[14px] font-bold text-[#2C1F14] mb-3.5">Help</div>
              <ul className="footer-links space-y-2">
                <li><a href="#" className="text-[13.5px] text-[#9A8478] hover:text-[#C4895A] transition-colors">How to Borrow</a></li>
                <li><a href="#" className="text-[13.5px] text-[#9A8478] hover:text-[#C4895A] transition-colors">Library Rules</a></li>
                <li><a href="#" className="text-[13.5px] text-[#9A8478] hover:text-[#C4895A] transition-colors">Fine Policy</a></li>
                <li><a href="#" className="text-[13.5px] text-[#9A8478] hover:text-[#C4895A] transition-colors">Request a Book</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom pt-5 border-t border-[#EAE0D0] flex flex-col md:flex-row justify-between items-center text-[12.5px] text-[#9A8478] gap-2">
            <span>© 2025 LibMate · The British College · Group 01</span>
            <span>BSc (Hons) Artificial Intelligence</span>
          </div>
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes heroPulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(0.7); }
          }
          @keyframes rotateBadge {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .reveal.visible {
            opacity: 1 !important;
            transform: translateY(0) !important;
          }
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
          .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `
      }} />
    </div>
  );
};

export default HomePage;