// src/components/Layout/Navbar.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  FaBell, FaBars, FaTimes, FaBook, FaUser, 
  FaHeart, FaFire, FaStar, FaCrown, FaUserPlus,
  FaHome, FaUserCircle
} from 'react-icons/fa';
import logoNav from '../../assets/logo_navx360.svg';

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [photoTimestamp, setPhotoTimestamp] = useState(Date.now());

  // Update timestamp when user photo changes
  useEffect(() => {
    setPhotoTimestamp(Date.now());
  }, [user?.profile_picture]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Get user's first name or initial
  const getUserName = () => {
    if (!user) return 'U';
    const fullName = user.full_name || user.name || '';
    if (fullName) {
      return fullName.split(' ')[0];
    }
    return 'U';
  };

  // Get profile photo URL
  const getProfilePhotoUrl = () => {
    if (user?.profile_picture) {
      return `http://localhost:5000/uploads/photos/${user.profile_picture}?t=${photoTimestamp}`;
    }
    return null;
  };

  // Quick links for all users
  const quickLinks = [
    { icon: FaBook, label: 'Catalogue', href: '/catalogue' },
    { icon: FaFire, label: 'Trending', href: '/trending' },
    { icon: FaStar, label: 'New Arrivals', href: '/new-arrivals' },
  ];

  // Member-specific quick links (only shown when logged in)
  const memberLinks = [
    { icon: FaBook, label: 'My Books', href: '/my-books' },
    { icon: FaHeart, label: 'Wishlist', href: '/wishlist' },
    { icon: FaCrown, label: 'Membership', href: '/profile' },
  ];

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#FAF7F2]/95 backdrop-blur-md border-b border-[#EAE0D0] h-16 px-4 md:px-8 shadow-sm">
        <div className="max-w-7xl mx-auto h-full flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center shrink-0 group">
            <img 
              src={logoNav} 
              alt="LibMate Logo" 
              className="h-14 w-auto group-hover:scale-105 transition-transform duration-300"
            />
          </Link>

          {/* Quick Links */}
          <div className="hidden md:flex items-center gap-1 bg-[#F3EDE3]/80 rounded-full px-2 py-1">
            {quickLinks.map((link, idx) => {
              const Icon = link.icon;
              return (
                <Link
                  key={idx}
                  to={link.href}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#4A3728] hover:text-[#C4895A] hover:bg-white rounded-full transition-all duration-200"
                >
                  <Icon size={16} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
            
            {/* Divider */}
            <div className="w-px h-6 bg-[#EAE0D0] mx-1"></div>
            
            {/* Member Links (if logged in) */}
            {isAuthenticated && memberLinks.map((link, idx) => {
              const Icon = link.icon;
              return (
                <Link
                  key={idx}
                  to={link.href}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#4A3728] hover:text-[#C4895A] hover:bg-white rounded-full transition-all duration-200"
                >
                  <Icon size={16} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Right Side - User Actions */}
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <>
                <Link to="/notifications" className="relative p-2 hover:bg-[#F3EDE3] rounded-full transition">
                  <FaBell className="text-[#4A3728] text-lg" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-[#B85450] rounded-full ring-2 ring-[#FAF7F2]"></span>
                </Link>
                
                {/* Profile Icon with Photo */}
                <Link to="/profile" className="flex items-center gap-2 px-3 py-2 hover:bg-[#F3EDE3] rounded-full transition">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-[#2C1F14] to-[#4A3728] flex items-center justify-center">
                    {getProfilePhotoUrl() ? (
                      <img 
                        src={getProfilePhotoUrl()} 
                        alt={user?.full_name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.style.display = 'none';
                          e.target.parentElement.innerHTML = `<span class="text-[#FAF7F2] text-sm font-semibold">${user?.full_name?.charAt(0) || 'U'}</span>`;
                        }}
                      />
                    ) : (
                      <span className="text-[#FAF7F2] text-sm font-semibold">
                        {user?.full_name?.charAt(0) || user?.name?.charAt(0) || 'U'}
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-medium text-[#4A3728] hidden md:block">{getUserName()}</span>
                </Link>
                
                {user?.role === 'admin' && (
                  <Link to="/admin" className="px-3 py-1.5 text-sm font-medium text-[#C4895A] bg-[#C4895A]/10 rounded-full hover:bg-[#C4895A]/20 transition">
                    Admin
                  </Link>
                )}
                <button onClick={handleLogout} className="px-4 py-1.5 text-sm text-[#B85450] hover:bg-[#FEE2E2] rounded-full transition">
                  Logout
                </button>
              </>
            ) : (
              <div className="flex gap-2">
                <Link to="/login" className="px-4 py-1.5 text-sm text-[#4A3728] border border-[#EAE0D0] rounded-full hover:border-[#C4895A] hover:text-[#C4895A] hover:bg-[#F3EDE3] transition-all duration-200">
                  Log in
                </Link>
                <Link to="/register" className="flex items-center gap-2 px-4 py-1.5 text-sm bg-[#2C1F14] text-[#FAF7F2] rounded-full hover:bg-[#4A3728] transition shadow-sm">
                  <FaUserPlus size={14} />
                  <span>Join Free</span>
                </Link>
              </div>
            )}
            
            {/* Mobile Menu Button */}
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 hover:bg-[#F3EDE3] rounded-full transition">
              {mobileMenuOpen ? <FaTimes size={20} className="text-[#4A3728]" /> : <FaBars size={20} className="text-[#4A3728]" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="fixed top-16 left-0 right-0 z-40 bg-[#FAF7F2] border-b border-[#EAE0D0] shadow-xl p-4 md:hidden max-h-[calc(100vh-64px)] overflow-y-auto">
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-center mb-3 pb-2 border-b border-[#EAE0D0]">
              <img src={logoNav} alt="LibMate Logo" className="h-8 w-auto" />
            </div>
            <div className="text-xs font-semibold text-[#9A8478] uppercase tracking-wider px-3 mb-2">Quick Links</div>
            {quickLinks.map((link, idx) => {
              const Icon = link.icon;
              return (
                <Link
                  key={idx}
                  to={link.href}
                  className="flex items-center gap-3 px-4 py-3 text-[#4A3728] hover:bg-[#F3EDE3] rounded-xl transition"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Icon size={18} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
            
            {isAuthenticated && (
              <>
                <div className="text-xs font-semibold text-[#9A8478] uppercase tracking-wider px-3 mt-2 mb-2">My Library</div>
                {memberLinks.map((link, idx) => {
                  const Icon = link.icon;
                  return (
                    <Link
                      key={idx}
                      to={link.href}
                      className="flex items-center gap-3 px-4 py-3 text-[#4A3728] hover:bg-[#F3EDE3] rounded-xl transition"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Icon size={18} />
                      <span>{link.label}</span>
                    </Link>
                  );
                })}
              </>
            )}
            
            <div className="h-px bg-[#EAE0D0] my-2"></div>
            {isAuthenticated ? (
              <>
                <Link to="/notifications" className="flex items-center gap-3 px-4 py-3 text-[#4A3728] hover:bg-[#F3EDE3] rounded-xl" onClick={() => setMobileMenuOpen(false)}>
                  <FaBell size={18} />
                  <span>Notifications</span>
                </Link>
                <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 text-[#B85450] hover:bg-[#FEE2E2] rounded-xl w-full text-left">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="flex items-center gap-3 px-4 py-3 text-[#4A3728] border border-[#EAE0D0] rounded-xl hover:border-[#C4895A] hover:text-[#C4895A] hover:bg-[#F3EDE3] transition-all duration-200" onClick={() => setMobileMenuOpen(false)}>
                  Log in
                </Link>
                <Link to="/register" className="flex items-center gap-3 px-4 py-3 bg-[#2C1F14] text-[#FAF7F2] rounded-xl justify-center" onClick={() => setMobileMenuOpen(false)}>
                  Join Free
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;