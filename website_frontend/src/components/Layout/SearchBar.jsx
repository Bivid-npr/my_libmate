// src/components/SearchBar.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FaSearch, FaChevronDown } from 'react-icons/fa';

const SearchBar = () => {
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [searchType, setSearchType] = useState(searchParams.get('type') || 'all');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update input when URL changes
  useEffect(() => {
    const q = searchParams.get('q');
    const type = searchParams.get('type');
    if (q) {
      setSearchQuery(q);
      setSearchType(type || 'all');
    } else {
      setSearchQuery('');
      setSearchType('all');
    }
  }, [searchParams]);

  const searchOptions = [
    { value: 'all', label: 'All' },
    { value: 'title', label: 'Title' },
    { value: 'author', label: 'Author' },
    { value: 'isbn', label: 'ISBN' },
    { value: 'genre', label: 'Genre' },
  ];

  const getPlaceholder = () => {
    switch (searchType) {
      case 'title': return 'Search by book title...';
      case 'author': return 'Search by author name...';
      case 'isbn': return 'Search by ISBN...';
      case 'genre': return 'Search by genre...';
      default: return 'Search by title, author, ISBN, or genre...';
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/catalogue?q=${encodeURIComponent(searchQuery)}&type=${searchType}`);
    } else {
      navigate('/catalogue');
    }
  };

  const handleSearchTypeSelect = (type) => {
    setSearchType(type);
    setIsDropdownOpen(false);
    // If there's already a search query, re-search with new type
    if (searchQuery.trim()) {
      navigate(`/catalogue?q=${encodeURIComponent(searchQuery)}&type=${type}`);
    }
  };

  return (
    <div className="sticky top-16 z-40 px-4 md:px-8 py-3 bg-transparent">
      <div className="max-w-3xl mx-auto">
        <form onSubmit={handleSearch} className="relative flex items-center">
          {/* Category Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 px-4 py-3 bg-white border border-[#EAE0D0] rounded-l-xl text-sm font-medium text-[#4A3728] hover:bg-[#F3EDE3] transition-all duration-200 whitespace-nowrap"
            >
              {searchOptions.find(opt => opt.value === searchType)?.label}
              <FaChevronDown size={12} className={`transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-32 bg-white border border-[#EAE0D0] rounded-lg shadow-lg z-50 overflow-hidden">
                {searchOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSearchTypeSelect(option.value)}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors duration-150 ${
                      searchType === option.value
                        ? 'bg-[#C4895A] text-white'
                        : 'text-[#4A3728] hover:bg-[#F3EDE3]'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Search Input */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <FaSearch className="h-5 w-5 text-[#9A8478]" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={getPlaceholder()}
              className="w-full pl-11 pr-4 py-2.5 text-base border-y border-[#EAE0D0] bg-white focus:border-[#C4895A] focus:outline-none focus:ring-1 focus:ring-[#C4895A]/20 transition-all"
              style={{ borderLeft: 'none', borderRight: 'none' }}
            />
            {/* Clear button */}
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  navigate('/catalogue');
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9A8478] hover:text-[#4A3728] transition"
              >
                ✕
              </button>
            )}
          </div>
          
          {/* Search Button */}
          <button
            type="submit"
            className="px-6 py-2.5 bg-[#C4895A] text-white font-medium rounded-r-xl hover:bg-[#D4A574] transition-all duration-200 flex items-center justify-center whitespace-nowrap"
          >
            <FaSearch className="mr-2" size={14} />
            Search
          </button>
        </form>
      </div>
    </div>
  );
};

export default SearchBar;