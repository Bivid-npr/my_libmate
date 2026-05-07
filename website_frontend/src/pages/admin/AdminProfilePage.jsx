// src/pages/admin/AdminProfilePage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { FaUser, FaEnvelope, FaPhone, FaCamera, FaUpload, FaTrash, FaLock, FaExclamationTriangle, FaSignOutAlt, FaUserShield } from 'react-icons/fa';
import { adminAPI, authAPI } from '../../services/api';

const AdminProfilePage = () => {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [photoTimestamp, setPhotoTimestamp] = useState(Date.now());
  
  const [profileData, setProfileData] = useState({
    full_name: '',
    phone: ''
  });
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [deletePassword, setDeletePassword] = useState('');
  
  const fileInputRef = useRef(null);
  const photoMenuRef = useRef(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (photoMenuRef.current && !photoMenuRef.current.contains(event.target)) {
        setShowPhotoMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const data = await adminAPI.getAdminProfile();
      setProfile(data);
      setProfileData({
        full_name: data.full_name || '',
        phone: data.phone || ''
      });
      setPhotoTimestamp(Date.now());
    } catch (error) {
      showToast('Failed to load profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      showToast('Photo too large. Max 5MB', 'error');
      return;
    }
    
    setPhotoUploading(true);
    setShowPhotoMenu(false);
    
    try {
      const formData = new FormData();
      formData.append('profile_photo', file);
      
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await fetch('/api/admin/profile/upload-photo', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to upload');
      
      showToast('Profile photo updated!', 'success');
      
      // Refresh user data
      const userResponse = await authAPI.getCurrentUser();
      localStorage.setItem('user', JSON.stringify(userResponse.user));
      fetchProfile();
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setPhotoUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = async () => {
    if (!window.confirm('Remove your profile photo?')) return;
    setShowPhotoMenu(false);
    setPhotoUploading(true);
    
    try {
      await adminAPI.updateAdminProfile({ profile_picture: null });
      // Call remove endpoint
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      await fetch('/api/admin/profile/remove-photo', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      showToast('Photo removed', 'success');
      const userResponse = await authAPI.getCurrentUser();
      localStorage.setItem('user', JSON.stringify(userResponse.user));
      fetchProfile();
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await adminAPI.updateAdminProfile(profileData);
      showToast('Profile updated!', 'success');
      setIsEditing(false);
      fetchProfile();
    } catch (error) {
      showToast(error.message || 'Failed to update', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return;
    }
    
    setSaving(true);
    try {
      await adminAPI.changeAdminPassword(passwordData.currentPassword, passwordData.newPassword);
      showToast('Password changed successfully!', 'success');
      setShowPasswordForm(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      showToast(error.message || 'Failed to change password', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivateAccount = async () => {
    if (!deletePassword) {
      showToast('Please enter your password', 'error');
      return;
    }
    
    setSaving(true);
    try {
      await adminAPI.deactivateAdminAccount(deletePassword);
      showToast('Account deactivated', 'success');
      logout();
      navigate('/login');
    } catch (error) {
      showToast(error.message || 'Failed to deactivate', 'error');
    } finally {
      setSaving(false);
    }
  };

  const getProfilePhotoUrl = () => {
    if (profile?.profile_picture) {
      return `/uploads/photos/${profile.profile_picture}?t=${photoTimestamp}`;
    }
    return null;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-[#C4895A] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left - Profile Card */}
        <div className="bg-white rounded-xl shadow-sm border border-[#EAE0D0] p-6">
          <div className="text-center mb-6">
            <div className="relative inline-block" ref={photoMenuRef}>
              {getProfilePhotoUrl() ? (
                <img
                  src={getProfilePhotoUrl()}
                  alt={profile?.full_name}
                  className="w-24 h-24 rounded-full object-cover border-4 border-[#C4895A] mx-auto"
                />
              ) : (
                <div className="w-24 h-24 bg-gradient-to-br from-[#2C1F14] to-[#4A3728] rounded-full flex items-center justify-center mx-auto border-4 border-[#C4895A]">
                  <FaUserShield className="text-white text-3xl" />
                </div>
              )}
              <button
                onClick={() => setShowPhotoMenu(!showPhotoMenu)}
                disabled={photoUploading}
                className="absolute bottom-0 right-0 w-8 h-8 bg-[#C4895A] rounded-full flex items-center justify-center text-white hover:bg-[#D4A574] transition shadow-md"
              >
                <FaCamera size={14} />
              </button>
              
              {showPhotoMenu && (
                <div className="absolute top-full mt-2 right-0 bg-white rounded-lg shadow-lg border border-[#EAE0D0] z-10 min-w-[150px]">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full px-4 py-2 text-left text-sm text-[#2C1F14] hover:bg-[#FAF7F2] rounded-t-lg flex items-center gap-2"
                  >
                    <FaUpload size={12} /> Upload Photo
                  </button>
                  {getProfilePhotoUrl() && (
                    <button
                      onClick={handleRemovePhoto}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 rounded-b-lg flex items-center gap-2 border-t border-[#EAE0D0]"
                    >
                      <FaTrash size={12} /> Remove Photo
                    </button>
                  )}
                </div>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>
            
            <h2 className="font-serif text-xl font-bold text-[#2C1F14] mt-4">{profile?.full_name}</h2>
            <span className="inline-block px-2 py-0.5 bg-[#C4895A]/10 text-[#C4895A] text-xs rounded-full font-medium mt-1">
              Administrator
            </span>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2 text-[#4A3728]">
              <FaEnvelope className="text-[#9A8478]" size={14} />
              {profile?.email}
            </div>
            <div className="flex items-center gap-2 text-[#4A3728]">
              <FaPhone className="text-[#9A8478]" size={14} />
              {profile?.phone || 'Not provided'}
            </div>
            <div className="flex items-center gap-2 text-[#4A3728]">
              <FaUser className="text-[#9A8478]" size={14} />
              Active since {formatDate(profile?.created_at)}
            </div>
          </div>
        </div>

        {/* Right - Forms */}
        <div className="lg:col-span-2 space-y-6">
          {/* Edit Details */}
          <div className="bg-white rounded-xl shadow-sm border border-[#EAE0D0] p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-serif text-lg font-bold text-[#2C1F14]">Personal Details</h2>
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 text-sm text-[#C4895A] border border-[#C4895A] rounded-lg hover:bg-[#C4895A] hover:text-white transition"
                >
                  Edit
                </button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-sm border border-[#EAE0D0] rounded-lg hover:bg-gray-50 transition">Cancel</button>
                  <button onClick={handleSaveProfile} disabled={saving} className="px-4 py-2 text-sm bg-[#C4895A] text-white rounded-lg hover:bg-[#D4A574] transition disabled:opacity-50">
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              )}
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#4A3728] mb-1">Full Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={profileData.full_name}
                    onChange={(e) => setProfileData({...profileData, full_name: e.target.value})}
                    className="w-full px-4 py-2 border border-[#EAE0D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C4895A]"
                  />
                ) : (
                  <div className="px-4 py-2 bg-[#FAF7F2] rounded-lg text-[#2C1F14]">{profileData.full_name}</div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[#4A3728] mb-1">Email</label>
                <div className="px-4 py-2 bg-[#FAF7F2] rounded-lg text-[#2C1F14]">{profile?.email}</div>
                <p className="text-xs text-[#9A8478] mt-1">Email cannot be changed</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[#4A3728] mb-1">Phone</label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                    className="w-full px-4 py-2 border border-[#EAE0D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C4895A]"
                  />
                ) : (
                  <div className="px-4 py-2 bg-[#FAF7F2] rounded-lg text-[#2C1F14]">{profileData.phone || 'Not provided'}</div>
                )}
              </div>
            </div>
          </div>

          {/* Change Password */}
          <div className="bg-white rounded-xl shadow-sm border border-[#EAE0D0] p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-serif text-lg font-bold text-[#2C1F14] flex items-center gap-2">
                <FaLock className="text-[#C4895A]" size={16} /> Change Password
              </h2>
              {!showPasswordForm && (
                <button
                  onClick={() => setShowPasswordForm(true)}
                  className="px-4 py-2 text-sm text-[#C4895A] border border-[#C4895A] rounded-lg hover:bg-[#C4895A] hover:text-white transition"
                >
                  Change
                </button>
              )}
            </div>
            
            {showPasswordForm && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#4A3728] mb-1">Current Password</label>
                  <input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                    className="w-full px-4 py-2 border border-[#EAE0D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C4895A]"
                    placeholder="Enter current password"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#4A3728] mb-1">New Password</label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                    className="w-full px-4 py-2 border border-[#EAE0D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C4895A]"
                    placeholder="Min 6 characters"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#4A3728] mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                    className="w-full px-4 py-2 border border-[#EAE0D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C4895A]"
                    placeholder="Repeat new password"
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowPasswordForm(false)} className="px-4 py-2 text-sm border border-[#EAE0D0] rounded-lg hover:bg-gray-50 transition">Cancel</button>
                  <button onClick={handleChangePassword} disabled={saving} className="px-4 py-2 text-sm bg-[#C4895A] text-white rounded-lg hover:bg-[#D4A574] transition disabled:opacity-50">
                    {saving ? 'Changing...' : 'Update Password'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Deactivate Account */}
          <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-serif text-lg font-bold text-red-600 flex items-center gap-2">
                <FaExclamationTriangle size={16} /> Danger Zone
              </h2>
            </div>
            
            <p className="text-sm text-[#9A8478] mb-4">
              Deactivating your account will prevent you from accessing the admin panel. This can only be undone by another admin.
            </p>
            
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition flex items-center gap-2"
              >
                <FaSignOutAlt size={14} /> Deactivate Account
              </button>
            ) : (
              <div className="space-y-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700 font-medium">Enter your password to confirm deactivation:</p>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className="w-full px-4 py-2 border border-red-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Your password"
                />
                <div className="flex gap-2">
                  <button onClick={() => { setShowDeleteConfirm(false); setDeletePassword(''); }} className="px-4 py-2 text-sm border border-[#EAE0D0] rounded-lg hover:bg-gray-50 transition">Cancel</button>
                  <button onClick={handleDeactivateAccount} disabled={saving || !deletePassword} className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition disabled:opacity-50">
                    {saving ? 'Deactivating...' : 'Confirm Deactivation'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminProfilePage;