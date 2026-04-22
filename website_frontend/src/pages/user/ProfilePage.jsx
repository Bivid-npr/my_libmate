// src/pages/ProfilePage.jsx - COMPLETE FILE
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { FaUser, FaEnvelope, FaPhone, FaMapMarker, FaCamera, FaCreditCard, FaCalendarAlt, FaUpload, FaQrcode, FaCheckCircle, FaExclamationTriangle, FaUserCircle, FaTrash } from 'react-icons/fa';
import { usersAPI, membershipAPI, authAPI } from '../../services/api';

const ProfilePage = () => {
  const { user, updateProfile, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [showMembershipForm, setShowMembershipForm] = useState(false);
  const [membershipData, setMembershipData] = useState({
    duration: '6',
    paymentReceipt: null,
    paymentReceiptName: ''
  });
  const [membershipStatus, setMembershipStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoValidation, setPhotoValidation] = useState(null);
  const [photoTimestamp, setPhotoTimestamp] = useState(Date.now());
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const fileInputRef = useRef(null);
  const receiptInputRef = useRef(null);
  const photoMenuRef = useRef(null);
  
  const [profileData, setProfileData] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || ''
  });

  const isMember = user?.role === 'member';

  // Update profileData when user changes
  useEffect(() => {
    if (user) {
      setProfileData({
        full_name: user.full_name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || ''
      });
      setPhotoTimestamp(Date.now());
    }
  }, [user]);

  // Close photo menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (photoMenuRef.current && !photoMenuRef.current.contains(event.target)) {
        setShowPhotoMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch membership status
  useEffect(() => {
    const fetchMembership = async () => {
      if (!isAuthenticated) return;
      
      try {
        const status = await membershipAPI.getStatus();
        setMembershipStatus(status);
      } catch (error) {
        console.error('Error fetching membership:', error);
      }
    };
    
    fetchMembership();
  }, [isAuthenticated]);

  // Validate profile photo
  const validatePhoto = (file) => {
    if (file.size > 5 * 1024 * 1024) {
      return { valid: false, error: 'Photo too large. Max 5MB' };
    }
    
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'Invalid format. Use JPG, PNG, or WEBP' };
    }
    
    return { valid: true, error: null };
  };

  const handleProfilePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setPhotoUploading(true);
    setPhotoValidation(null);
    setShowPhotoMenu(false);
    
    try {
      const validation = validatePhoto(file);
      
      if (!validation.valid) {
        setPhotoValidation({ valid: false, error: validation.error });
        showToast(validation.error, 'error');
        return;
      }
      
      const formData = new FormData();
      formData.append('profile_photo', file);
      
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/users/upload-photo', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload photo');
      }
      
      setPhotoValidation({ valid: true, error: null });
      showToast('Profile photo updated successfully!', 'success');
      
      // Refresh user data and reload page to update context
      const userResponse = await authAPI.getCurrentUser();
      localStorage.setItem('user', JSON.stringify(userResponse.user));
      window.location.reload();
      
    } catch (error) {
      setPhotoValidation({ valid: false, error: error.message });
      showToast(error.message, 'error');
    } finally {
      setPhotoUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePhoto = async () => {
    if (!window.confirm('Are you sure you want to remove your profile photo?')) {
      return;
    }
    
    setPhotoUploading(true);
    setShowPhotoMenu(false);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/users/remove-photo', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove photo');
      }
      
      showToast('Profile photo removed successfully', 'success');
      
      const userResponse = await authAPI.getCurrentUser();
      localStorage.setItem('user', JSON.stringify(userResponse.user));
      window.location.reload();
      
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleChange = (e) => {
    setProfileData({ ...profileData, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      await updateProfile({
        full_name: profileData.full_name,
        phone: profileData.phone,
        address: profileData.address
      });
      
      setIsEditing(false);
    } catch (error) {
      showToast(error.message || 'Failed to update profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showToast('New passwords do not match', 'error');
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return;
    }
    
    try {
      setLoading(true);
      await authAPI.changePassword(passwordData.currentPassword, passwordData.newPassword);
      showToast('Password changed successfully!', 'success');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      showToast(error.message || 'Failed to change password', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReceiptUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      showToast('File too large. Max 5MB', 'error');
      return;
    }
    
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      showToast('Invalid file type. Use PNG, JPG, or PDF', 'error');
      return;
    }
    
    setMembershipData({ 
      ...membershipData, 
      paymentReceipt: file,
      paymentReceiptName: file.name 
    });
    showToast('Receipt selected successfully!', 'success');
  };

  const handleMembershipSubmit = async (e) => {
    e.preventDefault();
    
    if (!user?.profile_picture) {
      showToast('Please upload a profile photo first. A clear photo is required for your membership card.', 'error');
      return;
    }
    
    if (!membershipData.paymentReceipt) {
      showToast('Please upload payment receipt first', 'error');
      return;
    }
    
    const confirmPhoto = window.confirm(
      'Your current profile photo will be used on your membership card.\n\n' +
      'Requirements:\n' +
      '• Clear, front-facing photo\n' +
      '• Face clearly visible\n' +
      '• Good lighting\n\n' +
      'Do you want to proceed with this photo?'
    );
    
    if (!confirmPhoto) {
      return;
    }
    
    try {
      setLoading(true);
      
      const formData = new FormData();
      formData.append('duration_months', membershipData.duration);
      formData.append('payment_receipt', membershipData.paymentReceipt);
      
      if (profileData.full_name !== user?.full_name) {
        formData.append('full_name', profileData.full_name);
      }
      if (profileData.phone !== user?.phone) {
        formData.append('phone', profileData.phone);
      }
      if (profileData.address !== user?.address) {
        formData.append('address', profileData.address);
      }
      
      await membershipAPI.apply(formData);
      showToast('Membership request submitted! Awaiting admin approval.', 'success');
      setShowMembershipForm(false);
      
      setMembershipData({
        duration: '6',
        paymentReceipt: null,
        paymentReceiptName: ''
      });
      
      const status = await membershipAPI.getStatus();
      setMembershipStatus(status);
    } catch (error) {
      showToast(error.message || 'Failed to submit membership request', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getProfilePhotoUrl = () => {
    if (user?.profile_picture) {
      return `http://localhost:5000/uploads/photos/${user.profile_picture}?t=${photoTimestamp}`;
    }
    return null;
  };

  if (!user) {
    return (
      <div className="bg-[#FAF7F2] min-h-screen py-8 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#C4895A] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#9A8478]">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#FAF7F2] min-h-screen py-8">
      <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-40">
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-bold text-[#2C1F14]">My Profile</h1>
          <p className="text-[#9A8478] mt-1">Manage your account details and membership</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Editable Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Details Card */}
            <div className="bg-white rounded-xl shadow-sm border border-[#EAE0D0] p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-serif text-xl font-bold text-[#2C1F14]">Personal Details</h2>
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 text-sm text-[#C4895A] border border-[#C4895A] rounded-full hover:bg-[#C4895A] hover:text-white transition"
                  >
                    Edit Details
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-full hover:bg-gray-50 transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={loading}
                      className="px-4 py-2 text-sm bg-[#2C1F14] text-white rounded-full hover:bg-[#4A3728] transition disabled:opacity-50"
                    >
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-6 mb-6">
                <div className="relative" ref={photoMenuRef}>
                  {getProfilePhotoUrl() ? (
                    <img 
                      src={getProfilePhotoUrl()} 
                      alt={user?.full_name}
                      className="w-20 h-20 rounded-full object-cover border-2 border-[#C4895A]"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.style.display = 'none';
                        e.target.parentElement.innerHTML = `
                          <div class="w-20 h-20 bg-gradient-to-br from-[#2C1F14] to-[#4A3728] rounded-full flex items-center justify-center">
                            <span class="text-white text-2xl font-semibold">${user?.full_name?.charAt(0) || 'U'}</span>
                          </div>
                        `;
                      }}
                    />
                  ) : (
                    <div className="w-20 h-20 bg-gradient-to-br from-[#2C1F14] to-[#4A3728] rounded-full flex items-center justify-center">
                      <span className="text-white text-2xl font-semibold">{user?.full_name?.charAt(0) || 'U'}</span>
                    </div>
                  )}
                  <button 
                    onClick={() => setShowPhotoMenu(!showPhotoMenu)}
                    className="absolute bottom-0 right-0 w-8 h-8 bg-[#C4895A] rounded-full flex items-center justify-center text-white text-sm hover:bg-[#D4A574] transition"
                    disabled={photoUploading}
                  >
                    <FaCamera size={14} />
                  </button>
                  
                  {/* Photo Menu Dropdown */}
                  {showPhotoMenu && (
                    <div className="absolute top-full mt-2 right-0 bg-white rounded-lg shadow-lg border border-[#EAE0D0] z-10 min-w-[160px]">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full px-4 py-2 text-left text-sm text-[#2C1F14] hover:bg-[#FAF7F2] rounded-t-lg transition flex items-center gap-2"
                      >
                        <FaCamera size={12} />
                        <span>Upload New Photo</span>
                      </button>
                      {getProfilePhotoUrl() && (
                        <button
                          onClick={handleRemovePhoto}
                          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 rounded-b-lg transition flex items-center gap-2 border-t border-[#EAE0D0]"
                        >
                          <FaTrash size={12} />
                          <span>Remove Photo</span>
                        </button>
                      )}
                    </div>
                  )}
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleProfilePhotoUpload}
                    className="hidden"
                  />
                </div>
                <div>
                  <div className="font-serif text-xl font-bold text-[#2C1F14]">{user?.full_name}</div>
                  <div className="text-sm text-[#9A8478]">Member since {formatDate(user?.created_at)}</div>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs ${
                    isMember ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {isMember ? 'Active Member' : 'Guest'}
                  </span>
                </div>
              </div>

              {/* Photo validation message */}
              {photoValidation && (
                <div className={`mb-4 p-3 rounded-lg text-sm ${
                  photoValidation.valid 
                    ? 'bg-green-50 text-green-700 border border-green-200' 
                    : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                }`}>
                  <div className="flex items-center gap-2">
                    {photoValidation.valid ? (
                      <FaCheckCircle className="text-green-500" />
                    ) : (
                      <FaExclamationTriangle className="text-yellow-500" />
                    )}
                    <span>{photoValidation.valid ? 'Profile photo meets membership requirements!' : photoValidation.error}</span>
                  </div>
                </div>
              )}

              {/* Photo requirements hint */}
              {!user?.profile_picture && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700 border border-blue-200">
                  <p className="font-medium mb-1">Profile Photo Required for Membership!</p>
                  <p className="text-xs">Please upload a clear, front-facing photo. This will be used on your membership card.</p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#4A3728] mb-1">Full Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="full_name"
                      value={profileData.full_name}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-[#EAE0D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C4895A] focus:border-transparent"
                    />
                  ) : (
                    <div className="px-4 py-2 bg-[#FAF7F2] rounded-lg text-[#2C1F14]">{profileData.full_name}</div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#4A3728] mb-1">Email Address</label>
                  <div className="px-4 py-2 bg-[#FAF7F2] rounded-lg text-[#2C1F14]">{profileData.email}</div>
                  <p className="text-xs text-[#9A8478] mt-1">Email cannot be changed</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#4A3728] mb-1">Phone Number</label>
                  {isEditing ? (
                    <input
                      type="tel"
                      name="phone"
                      value={profileData.phone}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-[#EAE0D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C4895A] focus:border-transparent"
                    />
                  ) : (
                    <div className="px-4 py-2 bg-[#FAF7F2] rounded-lg text-[#2C1F14]">{profileData.phone || 'Not provided'}</div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#4A3728] mb-1">Address</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="address"
                      value={profileData.address}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-[#EAE0D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C4895A] focus:border-transparent"
                    />
                  ) : (
                    <div className="px-4 py-2 bg-[#FAF7F2] rounded-lg text-[#2C1F14]">{profileData.address || 'Not provided'}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Change Password Card */}
            <div className="bg-white rounded-xl shadow-sm border border-[#EAE0D0] p-6">
              <h2 className="font-serif text-xl font-bold text-[#2C1F14] mb-4">Change Password</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#4A3728] mb-1">Current Password</label>
                  <input
                    type="password"
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    className="w-full px-4 py-2 border border-[#EAE0D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C4895A] focus:border-transparent"
                    placeholder="Enter current password"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#4A3728] mb-1">New Password</label>
                  <input
                    type="password"
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    className="w-full px-4 py-2 border border-[#EAE0D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C4895A] focus:border-transparent"
                    placeholder="Min 6 characters"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#4A3728] mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    className="w-full px-4 py-2 border border-[#EAE0D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C4895A] focus:border-transparent"
                    placeholder="Repeat new password"
                  />
                </div>
                <button 
                  onClick={handlePasswordSubmit}
                  disabled={loading}
                  className="px-4 py-2 bg-[#2C1F14] text-white rounded-lg hover:bg-[#4A3728] transition disabled:opacity-50"
                >
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - Membership Card or Request Form */}
          <div className="space-y-6">
            {isMember && membershipStatus?.has_membership ? (
              // Membership Card (for members)
              <div className="bg-gradient-to-br from-[#2C1F14] to-[#4A3728] rounded-xl shadow-lg p-6 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#C4895A]/10 rounded-full -mr-16 -mt-16"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-[#C4895A]/10 rounded-full -ml-12 -mb-12"></div>
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="text-xs text-[#9A8478] uppercase tracking-wider">LibMate Membership Card</div>
                      <div className="font-serif text-xl font-bold mt-1">{user?.full_name}</div>
                    </div>
                    {getProfilePhotoUrl() ? (
                      <img 
                        src={getProfilePhotoUrl()} 
                        alt={user?.full_name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-white"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-[#C4895A] rounded-full flex items-center justify-center">
                        <FaUserCircle className="text-white text-2xl" />
                      </div>
                    )}
                  </div>
                  <div className="mb-4">
                    <div className="text-sm font-mono tracking-wider">{membershipStatus.card_number || 'Processing...'}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/20">
                    <div>
                      <div className="text-xs text-white/50">Member Since</div>
                      <div className="text-sm font-medium">{formatDate(membershipStatus.start_date)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-white/50">Valid Until</div>
                      <div className="text-sm font-medium text-[#D4A574]">{formatDate(membershipStatus.expiry_date)}</div>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/20">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/50">Status</span>
                      <span className="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full">Active</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : membershipStatus?.status === 'pending' ? (
              // Pending Membership
              <div className="bg-white rounded-xl shadow-sm border border-[#EAE0D0] p-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-[#C4895A]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-[#C4895A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                  
                  <h3 className="font-serif text-xl font-bold text-[#2C1F14] mb-2">Pending Approval</h3>
                  <p className="text-sm text-[#9A8478] mb-4">
                    Your membership application is under review
                  </p>
                  
                  <div className="border-t border-[#EAE0D0] pt-4">
                    <p className="text-xs text-[#9A8478]">
                      Submitted: {formatDate(membershipStatus?.requested_at)}
                    </p>
                    <p className="text-xs text-[#9A8478] mt-1">
                      You will receive a notification once approved
                    </p>
                  </div>
                </div>
              </div>
            ) : showMembershipForm ? (
              // Membership Request Form
              <div className="bg-white rounded-xl shadow-sm border border-[#EAE0D0] p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-serif text-lg font-bold text-[#2C1F14]">Request Membership</h3>
                  <button
                    onClick={() => setShowMembershipForm(false)}
                    className="text-[#9A8478] hover:text-[#C4895A] transition"
                  >
                    ✕
                  </button>
                </div>
                
                {/* Photo Requirement Warning */}
                {!user?.profile_picture && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <FaExclamationTriangle className="text-red-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-red-700">Profile Photo Required</p>
                        <p className="text-xs text-red-600 mt-1">
                          Please upload a clear, front-facing photo above before applying for membership. 
                          This will be used on your membership card.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                <form onSubmit={handleMembershipSubmit}>
                  {/* Duration Selection */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-[#4A3728] mb-2">Select Duration</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setMembershipData({ ...membershipData, duration: '3' })}
                        className={`p-3 rounded-lg border text-center transition ${
                          membershipData.duration === '3'
                            ? 'border-[#C4895A] bg-[#C4895A]/10 text-[#C4895A]'
                            : 'border-[#EAE0D0] text-[#4A3728] hover:border-[#C4895A]'
                        }`}
                      >
                        <div className="font-semibold">3 Months</div>
                        <div className="text-sm">NPR 200</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setMembershipData({ ...membershipData, duration: '6' })}
                        className={`p-3 rounded-lg border text-center transition ${
                          membershipData.duration === '6'
                            ? 'border-[#C4895A] bg-[#C4895A]/10 text-[#C4895A]'
                            : 'border-[#EAE0D0] text-[#4A3728] hover:border-[#C4895A]'
                        }`}
                      >
                        <div className="font-semibold">6 Months</div>
                        <div className="text-sm">NPR 500 <span className="text-xs text-green-600">(Best value)</span></div>
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-3 mt-3">
                      <button
                        type="button"
                        onClick={() => setMembershipData({ ...membershipData, duration: '12' })}
                        className={`p-3 rounded-lg border text-center transition ${
                          membershipData.duration === '12'
                            ? 'border-[#C4895A] bg-[#C4895A]/10 text-[#C4895A]'
                            : 'border-[#EAE0D0] text-[#4A3728] hover:border-[#C4895A]'
                        }`}
                      >
                        <div className="font-semibold">12 Months</div>
                        <div className="text-sm">NPR 900</div>
                      </button>
                    </div>
                  </div>

                  {/* QR Code for Payment */}
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg text-center">
                    <label className="block text-sm font-medium text-[#4A3728] mb-3">Scan to Pay</label>
                    <div className="flex justify-center mb-3">
                      <img 
                        src={membershipAPI.getQRCode()} 
                        alt="Payment QR Code"
                        className="w-48 h-48 border border-[#EAE0D0] rounded-lg"
                        onError={(e) => {
                          e.target.src = 'https://via.placeholder.com/200?text=QR+Code';
                        }}
                      />
                    </div>
                    <p className="text-xs text-[#9A8478]">
                      Scan this QR code with your payment app to complete the payment
                    </p>
                  </div>

                  {/* Receipt Upload */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-[#4A3728] mb-2">Upload Payment Receipt</label>
                    <div 
                      className="border-2 border-dashed border-[#EAE0D0] rounded-lg p-4 text-center hover:border-[#C4895A] transition cursor-pointer"
                      onClick={() => receiptInputRef.current?.click()}
                    >
                      <input
                        type="file"
                        ref={receiptInputRef}
                        className="hidden"
                        accept="image/png,image/jpeg,image/jpg,application/pdf"
                        onChange={handleReceiptUpload}
                      />
                      <FaUpload className="mx-auto text-2xl text-[#9A8478] mb-2" />
                      <p className="text-sm text-[#9A8478]">
                        {membershipData.paymentReceiptName || 'Click to upload payment screenshot'}
                      </p>
                      <p className="text-xs text-[#9A8478] mt-1">PNG, JPG, PDF up to 5MB</p>
                    </div>
                    {membershipData.paymentReceiptName && (
                      <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                        <FaCheckCircle className="text-green-500" size={12} />
                        Receipt selected: {membershipData.paymentReceiptName}
                      </p>
                    )}
                  </div>

                  {/* Photo Preview for Membership Card */}
                  {getProfilePhotoUrl() && (
                    <div className="mb-4 p-3 bg-[#F3EDE3] rounded-lg">
                      <p className="text-xs text-[#C4895A] font-medium mb-2">Profile Photo for Membership Card</p>
                      <div className="flex items-center gap-3">
                        <img 
                          src={getProfilePhotoUrl()} 
                          alt="Profile"
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        <div>
                          <p className="text-xs text-[#9A8478]">This photo will appear on your membership card</p>
                          <p className="text-xs text-yellow-600 mt-1">
                            <FaExclamationTriangle className="inline mb-1 mr-1 text-yellow-500" size={11} />
                            Will be reviewed by the admin 
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* User Details Preview */}
                  <div className="mb-4 p-3 bg-[#F3EDE3] rounded-lg">
                    <p className="text-xs text-[#C4895A] font-medium mb-2">Your Information</p>
                    <div className="space-y-1 text-sm">
                      <p><span className="text-[#9A8478]">Name:</span> {user?.full_name}</p>
                      <p><span className="text-[#9A8478]">Email:</span> {user?.email}</p>
                      <p><span className="text-[#9A8478]">Phone:</span> {user?.phone || 'Not provided'}</p>
                    </div>
                  </div>

                  <div className="bg-[#C4895A]/10 rounded-lg p-3 mb-4">
                    <p className="text-xs text-[#C4895A] text-center">
                      After payment, upload the receipt. Admin will review your application including your profile photo. 
                      If the photo doesn't meet requirements, your membership may be rejected.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !membershipData.paymentReceipt || !user?.profile_picture}
                    className="w-full py-2 bg-[#C4895A] text-white rounded-lg hover:bg-[#D4A574] transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Submitting...' : 'Submit Request'}
                  </button>
                </form>
              </div>
            ) : (
              // Membership CTA
              <div className="bg-white rounded-xl shadow-sm border border-[#EAE0D0] p-6 text-center">
                <div className="w-16 h-16 bg-[#C4895A]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FaCreditCard className="text-[#C4895A] text-2xl" />
                </div>
                <h3 className="font-serif text-lg font-bold text-[#2C1F14] mb-2">Become a Member</h3>
                <p className="text-sm text-[#9A8478] mb-4">
                  Unlock exclusive benefits: borrow books, get AI recommendations, and more!
                </p>
                <ul className="text-left text-sm text-[#9A8478] mb-4 space-y-1">
                  <li>✓ Borrow up to 5 books at a time</li>
                  <li>✓ AI-powered book recommendations</li>
                  <li>✓ Reserve unavailable books</li>
                  <li>✓ Priority support</li>
                </ul>
                
                {!user?.profile_picture && (
                  <div className="mb-4 p-2 bg-yellow-50 rounded-lg text-xs text-yellow-700">
                    ⚠️ Profile photo required for membership
                  </div>
                )}
                
                <button
                  onClick={() => setShowMembershipForm(true)}
                  disabled={!user?.profile_picture}
                  className={`w-full py-2 rounded-lg transition ${
                    user?.profile_picture 
                      ? 'bg-[#C4895A] text-white hover:bg-[#D4A574]' 
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                  title={!user?.profile_picture ? "Please upload a profile photo first" : ""}
                >
                  Request Membership
                </button>
                
                {!user?.profile_picture && (
                  <p className="text-xs text-[#9A8478] mt-2">
                    Upload a profile photo above to enable membership
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;