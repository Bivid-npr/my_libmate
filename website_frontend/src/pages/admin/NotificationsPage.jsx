// src/pages/admin/NotificationsPage.jsx
import React from 'react';
import { FaBell } from 'react-icons/fa';

const NotificationsPage = () => {
  return (
    <div>
      <div className="mb-6">
        <h2 className="font-serif text-2xl font-bold text-[#2C1F14]">Notifications</h2>
        <p className="text-[#9A8478] mt-1">View system notifications</p>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-[#EAE0D0] p-12 text-center">
        <FaBell className="text-5xl text-[#C4895A]/30 mx-auto mb-4" />
        <h3 className="font-serif text-lg font-bold text-[#2C1F14] mb-2">Notifications Coming Soon</h3>
        <p className="text-[#9A8478]">This feature is currently under development.</p>
      </div>
    </div>
  );
};

export default NotificationsPage;