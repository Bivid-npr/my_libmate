// src/pages/AdminDashboardPage.jsx
import React, { useState } from 'react';
import { FaExclamationTriangle, FaBook, FaUsers, FaExchangeAlt, FaFire, FaCreditCard } from 'react-icons/fa';

const AdminDashboardPage = () => {
  const [smokeAlertActive, setSmokeAlertActive] = useState(true);

  const stats = [
    { label: 'Total Members', value: '382', sub: '+12 this month', icon: FaUsers, color: 'bg-blue-500' },
    { label: 'Books Available', value: '1,847', sub: 'of 2,400 total', icon: FaBook, color: 'bg-green-500' },
    { label: 'Active Borrowings', value: '553', sub: 'across all members', icon: FaExchangeAlt, color: 'bg-amber-500' },
    { label: 'Overdue Books', value: '24', sub: 'NPR 1,200 in fines', icon: FaExclamationTriangle, color: 'bg-red-500' },
    { label: 'Pending Memberships', value: '3', sub: 'Awaiting approval', icon: FaCreditCard, color: 'bg-amber-500' },
    { label: 'Active Smoke Alert', value: '1', sub: 'Detected 2:34 PM', icon: FaFire, color: 'bg-red-500' },
  ];

  const overdueBorrowings = [
    { member: 'Pujan G.', book: 'Deep Work', daysOverdue: 2, fine: 'NPR 10' },
    { member: 'Alice T.', book: 'Clean Code', daysOverdue: 5, fine: 'NPR 25' },
    { member: 'Garima A.', book: 'Sapiens', daysOverdue: 1, fine: 'NPR 5' },
  ];

  const pendingMemberships = [
    { name: 'Rajan K.', duration: '6 months', amount: 'NPR 500', status: 'paid' },
    { name: 'Sita M.', duration: '3 months', amount: 'NPR 200', status: 'pending' },
    { name: 'Hari B.', duration: '12 months', amount: 'NPR 1000', status: 'paid' },
  ];

  return (
    <div>
      {/* Smoke Alert Banner */}
      {smokeAlertActive && (
        <div className="bg-red-500 text-white rounded-lg p-4 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse"></div>
            <span className="font-semibold">⚠ Smoke Detected!</span>
            <span className="text-sm">Sensor: 685 (Threshold: 400) · Device: ESP32-LIB-01</span>
          </div>
          <button 
            onClick={() => setSmokeAlertActive(false)} 
            className="bg-white/20 px-3 py-1 rounded-full text-sm hover:bg-white/30 transition"
          >
            Resolve Alert
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold text-[#2C1F14]">Admin Dashboard</h1>
        <p className="text-[#9A8478] mt-1">System overview and management</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="bg-white rounded-xl shadow-sm border border-[#EAE0D0] p-4">
              <div className={`w-8 h-8 ${stat.color} rounded-lg flex items-center justify-center mb-3`}>
                <Icon className="text-white text-sm" />
              </div>
              <div className="text-2xl font-serif font-bold text-[#2C1F14]">{stat.value}</div>
              <div className="text-xs text-[#9A8478] mt-0.5">{stat.label}</div>
              <div className="text-xs text-[#9A8478]">{stat.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overdue Borrowings */}
        <div className="bg-white rounded-xl shadow-sm border border-[#EAE0D0] p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-serif text-xl font-bold text-[#2C1F14]">Overdue Borrowings</h2>
            <button className="text-[#C4895A] text-sm hover:underline">View all</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-[#EAE0D0]">
                <tr className="text-left text-[#9A8478]">
                  <th className="pb-2 font-semibold">Member</th>
                  <th className="pb-2 font-semibold">Book</th>
                  <th className="pb-2 font-semibold">Overdue</th>
                  <th className="pb-2 font-semibold">Fine</th>
                  <th className="pb-2 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {overdueBorrowings.map((item, idx) => (
                  <tr key={idx} className="border-b border-[#EAE0D0] last:border-0">
                    <td className="py-3 text-[#2C1F14]">{item.member}</td>
                    <td className="py-3 text-[#2C1F14]">{item.book}</td>
                    <td className="py-3">
                      <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full">{item.daysOverdue} days</span>
                    </td>
                    <td className="py-3 text-red-600 font-medium">{item.fine}</td>
                    <td className="py-3">
                      <button className="bg-green-500 text-white text-xs px-3 py-1 rounded-full hover:bg-green-600 transition">
                        Process
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Membership Requests */}
        <div className="bg-white rounded-xl shadow-sm border border-[#EAE0D0] p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-serif text-xl font-bold text-[#2C1F14]">Recent Membership Requests</h2>
            <button className="text-[#C4895A] text-sm hover:underline">View all</button>
          </div>
          <div className="space-y-3">
            {pendingMemberships.map((item, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-[#FAF7F2] rounded-lg">
                <div>
                  <span className="font-semibold text-[#2C1F14]">{item.name}</span>
                  <span className="text-xs text-[#9A8478] ml-2">{item.duration} · {item.amount}</span>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full self-start sm:self-auto ${
                  item.status === 'paid' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {item.status === 'paid' ? 'Paid' : 'Pending'}
                </span>
                <button className={`text-xs px-3 py-1 rounded-full self-start sm:self-auto transition ${
                  item.status === 'paid'
                    ? 'bg-[#C4895A] text-white hover:bg-[#D4A574]'
                    : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                }`}>
                  {item.status === 'paid' ? 'Approve' : 'Review'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;