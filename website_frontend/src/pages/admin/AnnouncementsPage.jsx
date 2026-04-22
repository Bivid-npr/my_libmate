// src/pages/admin/AnnouncementsPage.jsx
import React from 'react';
import { FaBullhorn } from 'react-icons/fa';

const AnnouncementsPage = () => {
  return (
    <div>
      <div className="mb-6">
        <h2 className="font-serif text-2xl font-bold text-[#2C1F14]">Announcements</h2>
        <p className="text-[#9A8478] mt-1">Send announcements to members</p>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-[#EAE0D0] p-12 text-center">
        <FaBullhorn className="text-5xl text-[#C4895A]/30 mx-auto mb-4" />
        <h3 className="font-serif text-lg font-bold text-[#2C1F14] mb-2">Announcements Coming Soon</h3>
        <p className="text-[#9A8478]">This feature is currently under development.</p>
      </div>
    </div>
  );
};

export default AnnouncementsPage;