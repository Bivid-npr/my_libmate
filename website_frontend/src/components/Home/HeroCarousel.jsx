// src/components/Home/HeroCarousel.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FaArrowRight, FaHeart, FaBook, FaStar, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { booksAPI, usersAPI, trendingAPI, recommendationsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const HeroCarousel = () => {
  const { isAuthenticated } = useAuth();
  const [slides, setSlides] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [wishlist, setWishlist] = useState([]);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const autoRotateRef = useRef(null);

  const CAROUSEL_SIZE = 10;

  // Fetch books with recommendations first, then trending
  useEffect(() => {
    const fetchBooks = async () => {
      try {
        setLoading(true);
        let books = [];
        
        if (isAuthenticated) {
          // FIRST: Get personalized recommendations
          try {
            const recommendations = await recommendationsAPI.getRecommendations(CAROUSEL_SIZE);
            if (recommendations && recommendations.length > 0) {
              books = [...recommendations];
              console.log('✅ Recommendations:', books.map(b => b.book_id));
            }
          } catch (error) {
            console.error('Error fetching recommendations:', error);
          }
          
          // SECOND: Fill remaining slots with trending books
          if (books.length < CAROUSEL_SIZE) {
            const needed = CAROUSEL_SIZE - books.length;
            const trending = await trendingAPI.getTrending(needed + 5);
            
            if (trending && trending.length > 0) {
              const existingIds = new Set(books.map(b => b.book_id));
              const newTrending = trending.filter(b => !existingIds.has(b.book_id));
              books = [...books, ...newTrending.slice(0, needed)];
              console.log('📈 Added trending:', newTrending.slice(0, needed).map(b => b.book_id));
            }
          }
        } else {
          // Guest users see trending
          const trending = await trendingAPI.getTrending(CAROUSEL_SIZE);
          books = trending || [];
        }
        
        // FINAL FALLBACK: If still no books, get regular books
        if (books.length === 0) {
          const response = await booksAPI.getBooks({ per_page: CAROUSEL_SIZE });
          books = response.books || [];
        }
        
        // Fetch full details with descriptions
        const booksWithDetails = await Promise.all(
          books.map(async (book) => {
            try {
              // If book already has description from recommendations view
              if (book.description) {
                return {
                  ...book,
                  short_description: book.description.length > 200 
                    ? book.description.substring(0, 200) + '...'
                    : book.description,
                };
              }
              // Otherwise fetch full details
              const fullBook = await booksAPI.getBook(book.book_id);
              return {
                ...book,
                description: fullBook.book?.description,
                short_description: fullBook.book?.description 
                  ? fullBook.book.description.substring(0, 200) + '...'
                  : 'No description available for this book.',
              };
            } catch (error) {
              return {
                ...book,
                short_description: 'No description available for this book.',
              };
            }
          })
        );
        
        setSlides(booksWithDetails);
        console.log('🎯 Final carousel:', booksWithDetails.map(b => ({ id: b.book_id, title: b.title })));
      } catch (error) {
        console.error('Error fetching books:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchBooks();
  }, [isAuthenticated]);

  // Fetch wishlist
  useEffect(() => {
    const fetchWishlist = async () => {
      if (isAuthenticated) {
        try {
          const userWishlist = await usersAPI.getWishlist();
          setWishlist(userWishlist.map(item => item.book_id));
        } catch (error) {
          console.error('Error fetching wishlist:', error);
        }
      }
    };
    fetchWishlist();
  }, [isAuthenticated]);

  // Start auto-rotate timer
  const startAutoRotate = () => {
    if (autoRotateRef.current) clearInterval(autoRotateRef.current);
    autoRotateRef.current = setInterval(() => {
      if (!isTransitioning && slides.length > 0) {
        goToNext();
      }
    }, 6000);
  };

  // Reset auto-rotate timer (called when user manually navigates)
  const resetAutoRotate = () => {
    if (autoRotateRef.current) clearInterval(autoRotateRef.current);
    startAutoRotate();
  };

  // Initialize auto-rotate when slides are loaded
  useEffect(() => {
    if (slides.length > 0) {
      startAutoRotate();
    }
    return () => {
      if (autoRotateRef.current) clearInterval(autoRotateRef.current);
    };
  }, [slides.length]);

  const goToPrev = () => {
    if (isTransitioning || slides.length === 0) return;
    setIsTransitioning(true);
    resetAutoRotate();
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
    setTimeout(() => setIsTransitioning(false), 500);
  };

  const goToNext = () => {
    if (isTransitioning || slides.length === 0) return;
    setIsTransitioning(true);
    resetAutoRotate();
    setCurrentIndex((prev) => (prev + 1) % slides.length);
    setTimeout(() => setIsTransitioning(false), 500);
  };

  const goToSlide = (index) => {
    if (isTransitioning || index === currentIndex || slides.length === 0) return;
    setIsTransitioning(true);
    resetAutoRotate();
    setCurrentIndex(index);
    setTimeout(() => setIsTransitioning(false), 500);
  };

  const addToWishlist = async (bookId) => {
    if (!isAuthenticated) {
      window.location.href = '/login';
      return;
    }
    try {
      await usersAPI.addToWishlist(bookId);
      setWishlist([...wishlist, bookId]);
    } catch (error) {
      console.error('Error adding to wishlist:', error);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-[500px] bg-gradient-to-r from-[#2C1F14] to-[#4A3728] rounded-2xl animate-pulse flex items-center justify-center">
        <div className="text-[#C4895A]">Loading amazing books...</div>
      </div>
    );
  }

  if (slides.length === 0) {
    return (
      <div className="w-full h-[500px] bg-gradient-to-r from-[#2C1F14] to-[#4A3728] rounded-2xl flex items-center justify-center">
        <div className="text-white">No books available</div>
      </div>
    );
  }

  const currentBook = slides[currentIndex];

  return (
    <div className="relative w-full h-[500px] bg-gradient-to-r from-[#2C1F14] to-[#4A3728] rounded-2xl overflow-hidden shadow-xl">
      {/* Slides Container with Smooth Transition */}
      <div 
        className="relative z-10 h-full flex transition-transform duration-500 ease-in-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {slides.map((book, idx) => (
          <div
            key={book.book_id}
            className="w-full flex-shrink-0 h-full flex flex-col md:flex-row items-center justify-between p-8 md:p-12"
          >
            {/* Left Side */}
            <div className="flex-1 text-white">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#C4895A]/20 rounded-full text-xs font-medium text-[#D4A574] mb-4">
                <FaStar size={12} />
                {isAuthenticated && book.similarity_score ? 'Recommended for You' : 'Featured Book'}
              </div>
              
              <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-bold mb-3 leading-tight">
                {book.title}
              </h2>
              
              <p className="text-[#D4A574] text-sm md:text-base mb-3">
                by {book.author}
              </p>
              
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className={`w-4 h-4 ${i < Math.floor(book.avg_rating || 0) ? 'text-[#C4895A]' : 'text-gray-500'}`} fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <span className="text-sm text-white/60">({book.total_reviews || 0} reviews)</span>
              </div>
              
              <p className="text-white/80 text-sm md:text-base leading-relaxed mb-6 max-w-lg">
                {book.short_description}
              </p>
              
              <div className="flex flex-wrap gap-3">
                <Link 
                  to={`/book/${book.book_id}`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#C4895A] text-white rounded-full text-sm font-medium hover:bg-[#D4A574] transition-all duration-200 hover:scale-105"
                >
                  <FaBook size={14} />
                  View Details
                  <FaArrowRight size={12} />
                </Link>
                
                <button 
                  onClick={() => addToWishlist(book.book_id)}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105 ${
                    wishlist.includes(book.book_id)
                      ? 'bg-[#B85450] text-white'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  <FaHeart size={14} />
                  {wishlist.includes(book.book_id) ? 'In Wishlist' : 'Add to Wishlist'}
                </button>
                
                {book.available_copies > 0 && isAuthenticated && (
                  <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#4A7C59] text-white rounded-full text-sm font-medium hover:bg-[#5A8E69] transition-all duration-200 hover:scale-105">
                    Borrow Now
                  </button>
                )}
              </div>
            </div>
            
            {/* Right Side - Book Cover */}
            <div className="hidden md:block w-64 h-96 bg-gradient-to-br from-[#C4895A]/20 to-[#D4A574]/10 rounded-xl shadow-2xl flex items-center justify-center border border-white/10">
              <div className="text-center">
                <FaBook className="text-6xl text-white/30 mx-auto mb-3" />
                <p className="text-white/40 text-sm">Book Cover</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Navigation Arrows */}
      {slides.length > 1 && (
        <>
          <button 
            onClick={goToPrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/30 hover:bg-black/50 rounded-full flex items-center justify-center text-white transition-all duration-200 z-20 hover:scale-110"
          >
            <FaChevronLeft size={20} />
          </button>
          
          <button 
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/30 hover:bg-black/50 rounded-full flex items-center justify-center text-white transition-all duration-200 z-20 hover:scale-110"
          >
            <FaChevronRight size={20} />
          </button>
        </>
      )}
      
      {/* Dots */}
      {slides.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => goToSlide(idx)}
              className={`transition-all duration-300 rounded-full ${
                idx === currentIndex 
                  ? 'bg-[#C4895A] w-8 h-2' 
                  : 'bg-white/40 w-2 h-2 hover:bg-white/60'
              }`}
            />
          ))}
        </div>
      )}
      
      {/* Counter */}
      <div className="absolute top-4 right-4 z-20 bg-black/30 backdrop-blur-sm rounded-full px-3 py-1 text-xs text-white/80">
        {currentIndex + 1} / {slides.length}
      </div>
    </div>
  );
};

export default HeroCarousel;