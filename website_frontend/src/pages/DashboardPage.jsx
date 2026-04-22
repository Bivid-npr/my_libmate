import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaClock, FaStar, FaArrowRight, FaBook, FaHeart, FaBell } from 'react-icons/fa';

const DashboardPage = () => {
  const { user } = useAuth();

  const stats = [
    { label: 'Currently Borrowing', value: '2', sub: '/ 3 slots', color: 'text-green-600' },
    { label: 'Active Reservations', value: '1', sub: 'Pending pickup', color: 'text-amber-500' },
    { label: 'Membership Expires', value: '45 days', sub: 'Renew before 15 May', color: 'text-amber-500' },
    { label: 'Unread Notifications', value: '4', sub: '2 due reminders', color: 'text-red-500' },
  ];

  const recommendations = [
    { id: 1, title: 'Clean Code', author: 'Robert C. Martin', genre: 'Computing', rating: 4.3, color: 'from-teal-600 to-teal-800' },
    { id: 2, title: "Man's Search for Meaning", author: 'Viktor Frankl', genre: 'Philosophy', rating: 4.9, color: 'from-amber-600 to-amber-800' },
    { id: 3, title: 'The Lean Startup', author: 'Eric Ries', genre: 'Business', rating: 4.2, color: 'from-stone-600 to-stone-800' },
    { id: 4, title: 'A Brief History of Time', author: 'Stephen Hawking', genre: 'Science', rating: 4.5, color: 'from-blue-600 to-blue-800' },
  ];

  const currentBorrowings = [
    { title: 'Atomic Habits', author: 'James Clear', dueDate: 'Apr 25, 2025', daysLeft: 3, status: 'due-soon' },
    { title: 'Deep Work', author: 'Cal Newport', dueDate: 'Apr 20, 2025', daysLeft: -2, status: 'overdue', fine: 'NPR 10.00' },
  ];

  return (
    <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-40 py-8">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold text-[#2C1F14]">Welcome back, {user?.name || 'Member'}! 👋</h1>
        <p className="text-[#9A8478] mt-1">Here's what's happening in your library today.</p>
        {user?.role === 'guest' && (
          <div className="mt-3 p-3 bg-[#C4895A]/10 border border-[#C4895A]/20 rounded-lg">
            <p className="text-sm text-[#C4895A]">
              You're currently a <strong>guest</strong>. <Link to="/register?upgrade=true" className="underline font-semibold">Upgrade to membership</Link> to borrow books and get personalized recommendations!
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white rounded-xl p-5 shadow-sm border border-[#EAE0D0]">
            <div className="text-xs text-[#9A8478] font-medium uppercase tracking-wider">{stat.label}</div>
            <div className={`font-serif text-3xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-[#9A8478] mt-1">{stat.sub}</div>
          </div>
        ))}
      </div>

      <div className="mb-10">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="font-serif text-2xl font-bold text-[#2C1F14]">Recommended For You</h2>
            <p className="text-[#9A8478] text-sm">Based on your reading history · Cosine similarity</p>
          </div>
          <Link to="/catalogue" className="text-[#C4895A] text-sm flex items-center gap-1 hover:gap-2 transition-all">
            View more <FaArrowRight size={10} />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {recommendations.map((book) => (
            <Link key={book.id} to={`/book/${book.id}`} className="group">
              <div className={`bg-gradient-to-br ${book.color} rounded-xl h-40 flex items-end p-3 mb-2 group-hover:-translate-y-1 transition-all shadow-md`}>
                <span className="text-white text-xs font-serif font-semibold">{book.title}</span>
              </div>
              <div className="text-sm font-semibold truncate text-[#2C1F14]">{book.title}</div>
              <div className="text-xs text-[#9A8478]">{book.author}</div>
              <div className="flex items-center gap-1 mt-1">
                <FaStar className="text-[#C4895A] text-xs" />
                <span className="text-xs">{book.rating}</span>
                <span className="text-xs text-[#9A8478] ml-1">· {book.genre}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="mb-10">
        <h2 className="font-serif text-2xl font-bold text-[#2C1F14] mb-4">Currently Borrowing</h2>
        {currentBorrowings.length > 0 ? (
          <div className="space-y-3">
            {currentBorrowings.map((book, idx) => (
              <div key={idx} className="bg-white rounded-xl p-5 shadow-sm border border-[#EAE0D0] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <div className="font-serif font-bold text-lg text-[#2C1F14]">{book.title}</div>
                  <div className="text-sm text-[#9A8478]">{book.author}</div>
                  <div className={`text-sm mt-1 ${book.status === 'overdue' ? 'text-red-500 font-semibold' : 'text-amber-500'}`}>
                    <FaClock className="inline mr-1 text-xs" /> Due: {book.dueDate} · {book.daysLeft > 0 ? `${book.daysLeft} days left` : `Overdue by ${Math.abs(book.daysLeft)} days`}
                  </div>
                  {book.fine && <div className="text-xs text-red-500 mt-1">Fine: {book.fine}</div>}
                </div>
                <button className="px-4 py-2 text-sm border border-[#EAE0D0] rounded-full hover:border-[#C4895A] hover:text-[#C4895A] transition">
                  Request Renewal
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl p-10 text-center border border-[#EAE0D0]">
            <FaBook className="text-4xl text-[#9A8478] mx-auto mb-3" />
            <p className="text-[#9A8478]">No books borrowed yet. Start exploring our catalogue!</p>
            <Link to="/catalogue" className="inline-block mt-3 text-[#C4895A] hover:underline">Browse Books →</Link>
          </div>
        )}
      </div>

      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-serif text-2xl font-bold text-[#2C1F14]">Recent Notifications</h2>
          <Link to="/notifications" className="text-[#C4895A] text-sm">View all →</Link>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-[#EAE0D0] divide-y divide-[#EAE0D0]">
          <div className="flex gap-3 p-4">
            <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center text-amber-600">⏰</div>
            <div className="flex-1">
              <div className="font-semibold text-sm text-[#2C1F14]">Due Date Reminder</div>
              <div className="text-xs text-[#9A8478]">Atomic Habits is due in 3 days. Return or request renewal.</div>
              <div className="text-xs text-[#9A8478] mt-1">2 hours ago</div>
            </div>
            <div className="w-2 h-2 bg-[#C4895A] rounded-full mt-2"></div>
          </div>
          <div className="flex gap-3 p-4">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600">📗</div>
            <div className="flex-1">
              <div className="font-semibold text-sm text-[#2C1F14]">Book Available</div>
              <div className="text-xs text-[#9A8478]">Deep Work is now available for pickup! Your reservation expires in 48 hours.</div>
              <div className="text-xs text-[#9A8478] mt-1">1 day ago</div>
            </div>
            <div className="w-2 h-2 bg-[#C4895A] rounded-full mt-2"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;