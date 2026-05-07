// src/pages/admin/UsersPage.jsx
import React, { useState, useEffect } from 'react';
import { FaSearch, FaEye, FaUserSlash, FaUserCheck, FaUserShield, FaPlus, FaTrash, FaTimes } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { adminAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('members'); // 'members' or 'admins'
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ full_name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [submitting, setSubmitting] = useState(false);
  const [activatingId, setActivatingId] = useState(null);
  const { showToast } = useToast();
  const { user: currentUser } = useAuth();

  useEffect(() => {
    if (activeTab === 'members') fetchUsers();
    else fetchAdmins();
  }, [page, searchTerm, activeTab]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await adminAPI.getAllUsers(page, searchTerm);
      setUsers(data.users || []);
      setTotalPages(data.total_pages || 1);
    } catch (error) {
      showToast('Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const data = await adminAPI.getAdmins();
      const filtered = searchTerm 
        ? data.filter(a => a.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || a.email?.toLowerCase().includes(searchTerm.toLowerCase()))
        : data;
      setAdmins(filtered || []);
      setTotalPages(1);
    } catch (error) {
      showToast('Failed to load admins', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async (userId, name) => {
    if (!window.confirm(`Are you sure you want to deactivate ${name}?`)) return;
    try {
      await adminAPI.deactivateUser(userId);
      showToast('User deactivated successfully', 'success');
      fetchUsers();
    } catch (error) {
      showToast(error.message || 'Failed to deactivate user', 'error');
    }
  };

  const handleActivate = async (userId, name) => {
    if (!window.confirm(`Reactivate ${name}'s account?`)) return;
    setActivatingId(userId);
    try {
      await adminAPI.activateUser(userId);
      showToast(`${name}'s account reactivated!`, 'success');
      fetchUsers();
    } catch (error) {
      showToast(error.message || 'Failed to reactivate', 'error');
    } finally {
      setActivatingId(null);
    }
  };

  const handleRemoveAdmin = async (adminId, name) => {
    if (!window.confirm(`Deactivate admin "${name}"?`)) return;
    try {
      await adminAPI.removeAdmin(adminId);
      showToast('Admin deactivated', 'success');
      fetchAdmins();
    } catch (error) {
      showToast(error.message || 'Failed to deactivate admin', 'error');
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    if (newAdmin.password !== newAdmin.confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }
    if (newAdmin.password.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await adminAPI.createAdmin({
        full_name: newAdmin.full_name,
        email: newAdmin.email,
        phone: newAdmin.phone,
        password: newAdmin.password
      });
      showToast('Admin created successfully!', 'success');
      setShowAddAdminModal(false);
      setNewAdmin({ full_name: '', email: '', phone: '', password: '', confirmPassword: '' });
      fetchAdmins();
    } catch (error) {
      showToast(error.message || 'Failed to create admin', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#EAE0D0] mb-6">
        <button
          onClick={() => { setActiveTab('members'); setPage(1); }}
          className={`px-6 py-3 text-sm font-medium transition-all duration-200 ${activeTab === 'members' ? 'text-[#C4895A] border-b-2 border-[#C4895A]' : 'text-[#9A8478] hover:text-[#4A3728]'}`}
        >
          Members
        </button>
        <button
          onClick={() => { setActiveTab('admins'); setPage(1); }}
          className={`px-6 py-3 text-sm font-medium transition-all duration-200 ${activeTab === 'admins' ? 'text-[#C4895A] border-b-2 border-[#C4895A]' : 'text-[#9A8478] hover:text-[#4A3728]'}`}
        >
          <FaUserShield size={12} className="inline mr-1" />Administrators
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border border-[#EAE0D0] p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative flex-1 max-w-md w-full">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9A8478]" />
            <input
              type="text"
              placeholder={activeTab === 'members' ? "Search by name or email..." : "Search admins..."}
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2 border border-[#EAE0D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C4895A]"
            />
          </div>
          {activeTab === 'admins' && (
            <button
              onClick={() => setShowAddAdminModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#C4895A] text-white rounded-lg hover:bg-[#D4A574] transition text-sm font-medium whitespace-nowrap"
            >
              <FaPlus size={14} />Add Admin
            </button>
          )}
        </div>
      </div>

      {/* Members Table */}
      {activeTab === 'members' && (
        <div className="bg-white rounded-xl shadow-sm border border-[#EAE0D0] overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-8 h-8 border-4 border-[#C4895A] border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#F3EDE3] border-b border-[#EAE0D0]">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-bold text-[#2C1F14] uppercase tracking-wide">Member</th>
                    <th className="text-left py-3 px-4 text-xs font-bold text-[#2C1F14] uppercase tracking-wide">Email</th>
                    <th className="text-left py-3 px-4 text-xs font-bold text-[#2C1F14] uppercase tracking-wide">Role</th>
                    <th className="text-left py-3 px-4 text-xs font-bold text-[#2C1F14] uppercase tracking-wide">Joined</th>
                    <th className="text-left py-3 px-4 text-xs font-bold text-[#2C1F14] uppercase tracking-wide">Borrows</th>
                    <th className="text-left py-3 px-4 text-xs font-bold text-[#2C1F14] uppercase tracking-wide">Status</th>
                    <th className="text-left py-3 px-4 text-xs font-bold text-[#2C1F14] uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAE0D0]">
                  {users.length === 0 ? (
                    <tr><td colSpan="7" className="py-8 text-center text-[#9A8478]">No users found</td></tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.user_id} className="hover:bg-[#FAF7F2] transition">
                        <td className="py-3 px-4">
                          <div className="font-medium text-[#2C1F14]">{user.full_name}</div>
                        </td>
                        <td className="py-3 px-4 text-[#4A3728]">{user.email}</td>
                        <td className="py-3 px-4">
                          <span className={`text-xs px-2 py-1 rounded-full ${user.role === 'member' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[#4A3728] text-sm">{formatDate(user.created_at)}</td>
                        <td className="py-3 px-4 text-[#4A3728]">{user.active_borrows || 0}</td>
                        <td className="py-3 px-4">
                          <span className={`text-xs px-2 py-1 rounded-full ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {user.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Link to={`/admin/users/${user.user_id}`} className="p-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition" title="View">
                              <FaEye size={12} />
                            </Link>
                            {user.is_active ? (
                              <button onClick={() => handleDeactivate(user.user_id, user.full_name)} className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition" title="Deactivate">
                                <FaUserSlash size={12} />
                              </button>
                            ) : (
                              <button onClick={() => handleActivate(user.user_id, user.full_name)} disabled={activatingId === user.user_id} className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition disabled:opacity-50" title="Activate">
                                <FaUserCheck size={12} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Admins Table */}
      {activeTab === 'admins' && (
        <div className="bg-white rounded-xl shadow-sm border border-[#EAE0D0] overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-8 h-8 border-4 border-[#C4895A] border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : admins.length === 0 ? (
            <div className="text-center py-16">
              <FaUserShield className="text-5xl text-[#9A8478] mx-auto mb-4" />
              <p className="text-[#9A8478]">No admins found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#F3EDE3] border-b border-[#EAE0D0]">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-bold text-[#2C1F14] uppercase">Admin</th>
                    <th className="text-left py-3 px-4 text-xs font-bold text-[#2C1F14] uppercase">Email</th>
                    <th className="text-left py-3 px-4 text-xs font-bold text-[#2C1F14] uppercase">Phone</th>
                    <th className="text-left py-3 px-4 text-xs font-bold text-[#2C1F14] uppercase">Joined</th>
                    <th className="text-left py-3 px-4 text-xs font-bold text-[#2C1F14] uppercase">Status</th>
                    <th className="text-left py-3 px-4 text-xs font-bold text-[#2C1F14] uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAE0D0]">
                  {admins.map((admin) => (
                    <tr key={admin.admin_id} className="hover:bg-[#FAF7F2] transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {admin.profile_picture ? (
                            <img src={`/uploads/photos/${admin.profile_picture}`} alt="" className="w-9 h-9 rounded-full object-cover" />
                          ) : (
                            <div className="w-9 h-9 bg-[#C4895A] rounded-full flex items-center justify-center">
                              <FaUserShield className="text-white text-sm" />
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-[#2C1F14]">{admin.full_name}</div>
                            {admin.admin_id === currentUser?.user_id && (
                              <span className="text-xs text-[#C4895A]">You</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[#4A3728] text-sm">{admin.email}</td>
                      <td className="py-3 px-4 text-[#4A3728] text-sm">{admin.phone || '—'}</td>
                      <td className="py-3 px-4 text-[#9A8478] text-sm">{formatDate(admin.created_at)}</td>
                      <td className="py-3 px-4">
                        <span className={`text-xs px-2 py-1 rounded-full ${admin.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {admin.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {admin.admin_id !== currentUser?.user_id && admin.is_active && (
                          <button onClick={() => handleRemoveAdmin(admin.admin_id, admin.full_name)} className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition" title="Deactivate">
                            <FaTrash size={12} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Pagination (only for members) */}
      {activeTab === 'members' && totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 border rounded-lg disabled:opacity-50">Previous</button>
          <span className="px-4 py-2">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-4 py-2 border rounded-lg disabled:opacity-50">Next</button>
        </div>
      )}

      {/* Add Admin Modal */}
      {showAddAdminModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-serif text-xl font-bold text-[#2C1F14]">Add New Admin</h2>
                <button onClick={() => setShowAddAdminModal(false)} className="text-[#9A8478] hover:text-[#2C1F14]"><FaTimes size={20} /></button>
              </div>
              <form onSubmit={handleCreateAdmin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#4A3728] mb-1">Full Name *</label>
                  <input type="text" value={newAdmin.full_name} onChange={(e) => setNewAdmin({...newAdmin, full_name: e.target.value})} className="w-full px-3 py-2 border border-[#EAE0D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C4895A]" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#4A3728] mb-1">Email *</label>
                  <input type="email" value={newAdmin.email} onChange={(e) => setNewAdmin({...newAdmin, email: e.target.value})} className="w-full px-3 py-2 border border-[#EAE0D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C4895A]" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#4A3728] mb-1">Phone</label>
                  <input type="tel" value={newAdmin.phone} onChange={(e) => setNewAdmin({...newAdmin, phone: e.target.value})} className="w-full px-3 py-2 border border-[#EAE0D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C4895A]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#4A3728] mb-1">Password *</label>
                  <input type="password" value={newAdmin.password} onChange={(e) => setNewAdmin({...newAdmin, password: e.target.value})} className="w-full px-3 py-2 border border-[#EAE0D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C4895A]" placeholder="Min 6 characters" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#4A3728] mb-1">Confirm Password *</label>
                  <input type="password" value={newAdmin.confirmPassword} onChange={(e) => setNewAdmin({...newAdmin, confirmPassword: e.target.value})} className="w-full px-3 py-2 border border-[#EAE0D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C4895A]" placeholder="Repeat password" required />
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-[#EAE0D0]">
                  <button type="button" onClick={() => setShowAddAdminModal(false)} className="px-4 py-2 border border-[#EAE0D0] rounded-lg hover:bg-gray-50 transition">Cancel</button>
                  <button type="submit" disabled={submitting} className="px-4 py-2 bg-[#C4895A] text-white rounded-lg hover:bg-[#D4A574] transition disabled:opacity-50">{submitting ? 'Creating...' : 'Create Admin'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;