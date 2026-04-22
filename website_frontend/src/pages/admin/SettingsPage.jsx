// src/pages/admin/SettingsPage.jsx
import React from 'react';
import { FaCog } from 'react-icons/fa';

const SettingsPage = () => {
  return (
    <div>
      <div className="mb-6">
        <h2 className="font-serif text-2xl font-bold text-[#2C1F14]">Settings</h2>
        <p className="text-[#9A8478] mt-1">Configure system settings</p>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-[#EAE0D0] p-12 text-center">
        <FaCog className="text-5xl text-[#C4895A]/30 mx-auto mb-4 animate-spin-slow" />
        <h3 className="font-serif text-lg font-bold text-[#2C1F14] mb-2">Settings Coming Soon</h3>
        <p className="text-[#9A8478]">This feature is currently under development.</p>
      </div>
    </div>
  );
};

export default SettingsPage;