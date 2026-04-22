// src/pages/admin/UsersPage.jsx
import React, { useState, useEffect } from 'react';
import { FaSearch, FaEye, FaUserSlash, FaUserCheck } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { adminAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { showToast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, [page, searchTerm]);

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

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold text-[#2C1F14]">Manage Users</h1>
        <p className="text-[#9A8478] mt-1">View and manage library members</p>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border border-[#EAE0D0] p-4 mb-6">
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9A8478]" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2 border border-[#EAE0D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C4895A]"
          />
        </div>
      </div>

      {/* Users Table */}
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
                            <button className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition" title="Activate">
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 border rounded-lg disabled:opacity-50">Previous</button>
          <span className="px-4 py-2">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-4 py-2 border rounded-lg disabled:opacity-50">Next</button>
        </div>
      )}
    </div>
  );
};

export default UsersPage;