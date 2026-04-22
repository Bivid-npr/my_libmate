import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaClock, FaStar, FaBook, FaHeart, FaCalendarAlt, FaUndo } from 'react-icons/fa';

const MyBooksPage = () => {
  const [activeTab, setActiveTab] = useState('borrowing');

  const tabs = [
    { id: 'borrowing', label: 'Currently Borrowing', count: 2 },
    { id: 'reservations', label: 'Reservations', count: 1 },
    { id: 'wishlist', label: 'Wishlist', count: 5 },
    { id: 'history', label: 'Borrow History', count: 24 },
  ];

  const currentBorrowings = [
    { id: 1, title: 'Atomic Habits', author: 'James Clear', dueDate: 'Apr 25, 2025', daysLeft: 3, coverColor: 'from-amber-600 to-amber-800', fine: null },
    { id: 2, title: 'Deep Work', author: 'Cal Newport', dueDate: 'Apr 20, 2025', daysLeft: -2, coverColor: 'from-blue-600 to-blue-800', fine: 'NPR 10.00' },
  ];

  const reservations = [
    { id: 3, title: 'The Pragmatic Programmer', author: 'David Thomas', availableDate: 'Apr 28, 2025', position: 1, coverColor: 'from-purple-600 to-purple-800' },
  ];

  const wishlist = [
    { id: 4, title: 'Clean Code', author: 'Robert C. Martin', rating: 4.8, available: true, coverColor: 'from-teal-600 to-teal-800' },
    { id: 5, title: 'Design Patterns', author: 'Erich Gamma', rating: 4.7, available: false, coverColor: 'from-orange-600 to-orange-800' },
    { id: 6, title: 'You Don\'t Know JS', author: 'Kyle Simpson', rating: 4.6, available: true, coverColor: 'from-cyan-600 to-cyan-800' },
    { id: 7, title: 'The Art of War', author: 'Sun Tzu', rating: 4.3, available: true, coverColor: 'from-stone-600 to-stone-800' },
    { id: 8, title: 'Thinking Fast & Slow', author: 'Daniel Kahneman', rating: 4.4, available: true, coverColor: 'from-rose-600 to-rose-800' },
  ];

  const borrowHistory = [
    { id: 9, title: 'Sapiens', author: 'Yuval Noah Harari', borrowed: 'Jan 5, 2025', returned: 'Jan 19, 2025', days: 14, fine: null, condition: 'Good' },
    { id: 10, title: 'Psychology of Money', author: 'Morgan Housel', borrowed: 'Dec 10, 2024', returned: 'Dec 28, 2024', days: 18, fine: 'NPR 15', condition: 'Good' },
    { id: 11, title: 'Thinking Fast & Slow', author: 'Daniel Kahneman', borrowed: 'Nov 1, 2024', returned: 'Nov 14, 2024', days: 13, fine: null, condition: 'Good' },
  ];

  return (
    <div className="bg-[#FAF7F2] min-h-screen py-8">
      <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-40">
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-bold text-[#2C1F14]">My Books</h1>
          <p className="text-[#9A8478] mt-1">Track your borrowing, reservations, and reading history</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-[#EAE0D0] mb-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'text-[#C4895A] border-b-2 border-[#C4895A]'
                  : 'text-[#9A8478] hover:text-[#4A3728]'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Currently Borrowing Tab */}
        {activeTab === 'borrowing' && (
          <div className="space-y-4">
            <div className="bg-[#C4895A]/10 border border-[#C4895A]/20 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2 text-sm text-[#C4895A]">
                <FaBook size={14} />
                <span>You have {currentBorrowings.length} of 3 borrowing slots used.</span>
              </div>
            </div>
            {currentBorrowings.map((book) => (
              <div key={book.id} className="bg-white rounded-xl p-5 shadow-sm border border-[#EAE0D0] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex gap-4">
                  <div className={`w-16 h-24 rounded-lg bg-gradient-to-br ${book.coverColor} flex items-end p-2`}>
                    <span className="text-white text-[8px] font-serif font-semibold">{book.title}</span>
                  </div>
                  <div>
                    <div className="font-serif font-bold text-lg text-[#2C1F14]">{book.title}</div>
                    <div className="text-sm text-[#9A8478]">{book.author}</div>
                    <div className={`text-sm mt-2 flex items-center gap-1 ${book.daysLeft < 0 ? 'text-red-500' : 'text-amber-500'}`}>
                      <FaClock size={12} />
                      <span>Due: {book.dueDate}</span>
                      <span>·</span>
                      <span>{book.daysLeft > 0 ? `${book.daysLeft} days left` : `Overdue by ${Math.abs(book.daysLeft)} days`}</span>
                    </div>
                    {book.fine && <div className="text-xs text-red-500 mt-1">Fine: {book.fine}</div>}
                  </div>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 text-sm border border-[#EAE0D0] rounded-full hover:border-[#C4895A] hover:text-[#C4895A] transition">
                  <FaUndo size={12} />
                  Request Renewal
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Reservations Tab */}
        {activeTab === 'reservations' && (
          <div className="space-y-4">
            {reservations.map((book) => (
              <div key={book.id} className="bg-white rounded-xl p-5 shadow-sm border border-[#EAE0D0] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex gap-4">
                  <div className={`w-16 h-24 rounded-lg bg-gradient-to-br ${book.coverColor} flex items-end p-2`}>
                    <span className="text-white text-[8px] font-serif font-semibold">{book.title}</span>
                  </div>
                  <div>
                    <div className="font-serif font-bold text-lg text-[#2C1F14]">{book.title}</div>
                    <div className="text-sm text-[#9A8478]">{book.author}</div>
                    <div className="text-sm text-blue-600 mt-2 flex items-center gap-1">
                      <FaCalendarAlt size={12} />
                      <span>Available: {book.availableDate}</span>
                    </div>
                    <div className="text-xs text-[#9A8478] mt-1">Position in queue: #{book.position}</div>
                  </div>
                </div>
                <button className="px-4 py-2 text-sm text-red-600 border border-red-200 rounded-full hover:bg-red-50 transition">
                  Cancel Reservation
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Wishlist Tab */}
        {activeTab === 'wishlist' && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {wishlist.map((book) => (
              <div key={book.id} className="group">
                <div className={`bg-gradient-to-br ${book.coverColor} rounded-xl h-48 flex flex-col justify-end p-3 mb-2 group-hover:-translate-y-1 transition-all shadow-md relative`}>
                  <span className="absolute top-2 right-2 text-xs bg-white/20 px-2 py-0.5 rounded-full text-white">
                    {book.available ? 'Available' : 'Unavailable'}
                  </span>
                  <span className="text-white text-sm font-serif font-semibold">{book.title}</span>
                  <span className="text-white/70 text-xs mt-1">{book.author.split(' ')[0]}</span>
                </div>
                <div className="text-sm font-semibold truncate text-[#2C1F14]">{book.title}</div>
                <div className="text-xs text-[#9A8478]">{book.author}</div>
                <div className="flex items-center gap-1 mt-1">
                  <FaStar className="text-[#C4895A] text-xs" />
                  <span className="text-xs">{book.rating}</span>
                </div>
                <button className="mt-2 text-xs text-red-500 hover:text-red-600 transition">
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Borrow History Tab */}
        {activeTab === 'history' && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#F3EDE3]">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-[#4A3728]">Book</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-[#4A3728]">Borrowed</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-[#4A3728]">Returned</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-[#4A3728]">Days</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-[#4A3728]">Condition</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-[#4A3728]">Fine</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE0D0]">
                {borrowHistory.map((book) => (
                  <tr key={book.id} className="hover:bg-[#F3EDE3]/50 transition">
                    <td className="py-3 px-4">
                      <div className="font-medium text-[#2C1F14]">{book.title}</div>
                      <div className="text-xs text-[#9A8478]">{book.author}</div>
                    </td>
                    <td className="py-3 px-4 text-sm text-[#4A3728]">{book.borrowed}</td>
                    <td className="py-3 px-4 text-sm text-[#4A3728]">{book.returned}</td>
                    <td className="py-3 px-4 text-sm text-[#4A3728]">{book.days} days</td>
                    <td className="py-3 px-4">
                      <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">{book.condition}</span>
                    </td>
                    <td className="py-3 px-4 text-sm text-red-500">{book.fine || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyBooksPage;