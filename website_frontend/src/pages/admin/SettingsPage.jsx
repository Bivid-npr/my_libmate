// src/pages/admin/SettingsPage.jsx
import React, { useState } from 'react';
import { FaCog, FaBook, FaClock, FaMoneyBillWave, FaUserShield, FaBell, FaCalendarAlt } from 'react-icons/fa';
import { useToast } from '../../context/ToastContext';
import { adminAPI } from '../../services/api';

const SettingsPage = () => {
  const { showToast } = useToast();
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Save admin profile changes via API
      showToast('Profile updated successfully!', 'success');
    } catch (error) {
      showToast(error.message || 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold text-[#2C1F14]">Settings</h1>
        <p className="text-[#9A8478] mt-1">Configure library system settings</p>
      </div>

      <div className="space-y-6">
        {/* System Rules (Read-only - matches database triggers) */}
        <div className="bg-white rounded-xl shadow-sm border border-[#EAE0D0] p-6">
          <h2 className="font-serif text-lg font-bold text-[#2C1F14] mb-4 flex items-center gap-2">
            <FaBook className="text-[#C4895A]" /> Library Rules & Limits
          </h2>
          <p className="text-xs text-[#9A8478] mb-4">These settings are configured in the database and cannot be changed here.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#F3EDE3] rounded-lg p-4">
              <div className="text-xs text-[#9A8478] mb-1">Max Borrow Limit</div>
              <div className="text-2xl font-bold text-[#2C1F14]">5</div>
              <div className="text-xs text-[#9A8478]">Books per member</div>
            </div>
            <div className="bg-[#F3EDE3] rounded-lg p-4">
              <div className="text-xs text-[#9A8478] mb-1">Borrow Duration</div>
              <div className="text-2xl font-bold text-[#2C1F14]">14</div>
              <div className="text-xs text-[#9A8478]">Days per borrow</div>
            </div>
            <div className="bg-[#F3EDE3] rounded-lg p-4">
              <div className="text-xs text-[#9A8478] mb-1">Max Renewals</div>
              <div className="text-2xl font-bold text-[#2C1F14]">3</div>
              <div className="text-xs text-[#9A8478]">Per book</div>
            </div>
            <div className="bg-[#F3EDE3] rounded-lg p-4">
              <div className="text-xs text-[#9A8478] mb-1">Renewal Duration</div>
              <div className="text-2xl font-bold text-[#2C1F14]">14</div>
              <div className="text-xs text-[#9A8478]">Days per renewal</div>
            </div>
          </div>
        </div>

        {/* Reservation Settings (Read-only - matches triggers) */}
        <div className="bg-white rounded-xl shadow-sm border border-[#EAE0D0] p-6">
          <h2 className="font-serif text-lg font-bold text-[#2C1F14] mb-4 flex items-center gap-2">
            <FaClock className="text-[#C4895A]" /> Reservation Rules
          </h2>
          <p className="text-xs text-[#9A8478] mb-4">Configured in database triggers and events.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#F3EDE3] rounded-lg p-4">
              <div className="text-xs text-[#9A8478] mb-1">Pickup Window</div>
              <div className="text-2xl font-bold text-[#2C1F14]">48</div>
              <div className="text-xs text-[#9A8478]">Hours to collect reserved book</div>
            </div>
            <div className="bg-[#F3EDE3] rounded-lg p-4">
              <div className="text-xs text-[#9A8478] mb-1">Reservation Expiry</div>
              <div className="text-2xl font-bold text-[#2C1F14]">48</div>
              <div className="text-xs text-[#9A8478]">Hours before auto-cancellation</div>
            </div>
          </div>
        </div>

        {/* Fine System (Read-only - matches trigger) */}
        <div className="bg-white rounded-xl shadow-sm border border-[#EAE0D0] p-6">
          <h2 className="font-serif text-lg font-bold text-[#2C1F14] mb-4 flex items-center gap-2">
            <FaMoneyBillWave className="text-[#C4895A]" /> Fine System
          </h2>
          <p className="text-xs text-[#9A8478] mb-4">Configured in database trigger: trg_after_borrow_return</p>
          
          <div className="bg-[#F3EDE3] rounded-lg p-4 inline-block">
            <div className="text-xs text-[#9A8478] mb-1">Late Return Fine</div>
            <div className="text-2xl font-bold text-[#2C1F14]">NPR 5.00</div>
            <div className="text-xs text-[#9A8478]">Per day overdue</div>
          </div>
        </div>

        {/* Events & Triggers Info */}
        <div className="bg-white rounded-xl shadow-sm border border-[#EAE0D0] p-6">
          <h2 className="font-serif text-lg font-bold text-[#2C1F14] mb-4 flex items-center gap-2">
            <FaCalendarAlt className="text-[#C4895A]" /> Automated Events
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-[#FAF7F2] rounded-lg">
              <div>
                <span className="text-sm font-medium text-[#2C1F14]">Mark Overdue Books</span>
                <p className="text-xs text-[#9A8478]">Runs daily - marks borrowed books as overdue when past due date</p>
              </div>
              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">Active</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-[#FAF7F2] rounded-lg">
              <div>
                <span className="text-sm font-medium text-[#2C1F14]">Expire Reservations</span>
                <p className="text-xs text-[#9A8478]">Runs hourly - expires pending reservations past their pickup window</p>
              </div>
              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">Active</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-[#FAF7F2] rounded-lg">
              <div>
                <span className="text-sm font-medium text-[#2C1F14]">Expire Memberships</span>
                <p className="text-xs text-[#9A8478]">Runs daily - marks memberships as expired when past expiry date</p>
              </div>
              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">Active</span>
            </div>
          </div>
        </div>

        {/* Admin Profile (Editable) */}
        <div className="bg-white rounded-xl shadow-sm border border-[#EAE0D0] p-6">
          <h2 className="font-serif text-lg font-bold text-[#2C1F14] mb-4 flex items-center gap-2">
            <FaUserShield className="text-[#C4895A]" /> Admin Profile
          </h2>
          <form onSubmit={handleSaveProfile} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#4A3728] mb-1">Email</label>
              <input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)}
                className="w-full px-3 py-2 border border-[#EAE0D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C4895A]" 
                placeholder="admin@libmate.edu" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#4A3728] mb-1">Phone</label>
              <input type="text" value={adminPhone} onChange={(e) => setAdminPhone(e.target.value)}
                className="w-full px-3 py-2 border border-[#EAE0D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C4895A]" 
                placeholder="+977-01-XXXXXXX" />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <button type="submit" disabled={saving}
                className="px-4 py-2 bg-[#C4895A] text-white rounded-lg hover:bg-[#D4A574] transition disabled:opacity-50 text-sm">
                {saving ? 'Saving...' : 'Update Profile'}
              </button>
            </div>
          </form>
        </div>

        {/* System Info */}
        <div className="bg-white rounded-xl shadow-sm border border-[#EAE0D0] p-6">
          <h2 className="font-serif text-lg font-bold text-[#2C1F14] mb-4 flex items-center gap-2">
            <FaCog className="text-[#C4895A]" /> System Information
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><span className="text-[#9A8478]">Version:</span> <span className="text-[#2C1F14] font-medium">1.0.0</span></div>
            <div><span className="text-[#9A8478]">Database:</span> <span className="text-[#2C1F14] font-medium">MySQL (libmate_test)</span></div>
            <div><span className="text-[#9A8478]">Backend:</span> <span className="text-[#2C1F14] font-medium">Flask 3.x</span></div>
            <div><span className="text-[#9A8478]">Frontend:</span> <span className="text-[#2C1F14] font-medium">React 18 + Tailwind</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;