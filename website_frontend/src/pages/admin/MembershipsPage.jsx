// src/pages/admin/MembershipsPage.jsx
import React, { useState, useEffect } from 'react';
import { FaCheck, FaTimes, FaSearch, FaPlus, FaUser, FaTimesCircle, FaUpload } from 'react-icons/fa';
import { adminAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';

const MembershipsPage = () => {
  const [memberships, setMemberships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createData, setCreateData] = useState({ 
    full_name: '', email: '', phone: '', address: '', duration: '12', 
    profilePhoto: null, paymentReceipt: null, profilePhotoName: '', paymentReceiptName: '' 
  });
  const [creating, setCreating] = useState(false);
  const { showToast } = useToast();

  useEffect(() => { fetchMemberships(); }, [filter]);

  const fetchMemberships = async () => {
    setLoading(true);
    try {
      const data = await adminAPI.getAllMemberships(filter === 'all' ? null : filter);
      setMemberships(data || []);
    } catch { showToast('Failed to load memberships', 'error'); }
    finally { setLoading(false); }
  };

  const handleApprove = async (id, duration) => {
    try { await adminAPI.approveMembership(id, duration || 12); showToast('Membership approved!', 'success'); fetchMemberships(); }
    catch (e) { showToast(e.message, 'error'); }
  };

  const handleReject = async (id) => {
    if (!window.confirm('Reject this membership?')) return;
    try { await adminAPI.rejectMembership(id); showToast('Membership rejected', 'success'); fetchMemberships(); }
    catch (e) { showToast(e.message, 'error'); }
  };

  const handleCreate = async () => {
    if (!createData.full_name.trim()) { showToast('Full name is required', 'error'); return; }
    if (!createData.profilePhoto) { showToast('Profile photo is required for membership card', 'error'); return; }
    
    setCreating(true);
    try {
      const formData = new FormData();
      formData.append('full_name', createData.full_name.trim());
      formData.append('phone', createData.phone.trim());
      formData.append('email', createData.email.trim());
      formData.append('address', createData.address.trim());
      formData.append('duration_months', createData.duration);
      formData.append('profile_photo', createData.profilePhoto);
      if (createData.paymentReceipt) formData.append('payment_receipt', createData.paymentReceipt);

      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/admin/memberships/create', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed');
      
      showToast(result.message || 'Membership created!', 'success');
      setShowCreateModal(false);
      setCreateData({ full_name: '', email: '', phone: '', address: '', duration: '12', profilePhoto: null, paymentReceipt: null, profilePhotoName: '', paymentReceiptName: '' });
      fetchMemberships();
    } catch (e) { showToast(e.message, 'error'); }
    finally { setCreating(false); }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';

  const filtered = memberships.filter(m =>
    m.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[#2C1F14]">Manage Memberships</h1>
          <p className="text-[#9A8478] mt-1">Review applications and manage memberships</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 px-4 py-2 bg-[#C4895A] text-white rounded-lg hover:bg-[#D4A574] transition text-sm font-medium">
          <FaPlus size={14} />New Membership
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-[#EAE0D0] p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex gap-2 flex-wrap">
            {['pending', 'active', 'expired', 'all'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition ${filter === f ? 'bg-[#C4895A] text-white' : 'bg-[#F3EDE3] text-[#4A3728] hover:bg-[#EAE0D0]'}`}>{f}</button>
            ))}
          </div>
          <div className="flex-1 relative">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9A8478]" />
            <input type="text" placeholder="Search by name or email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[#EAE0D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C4895A]" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-[#EAE0D0] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-[#C4895A] border-t-transparent rounded-full animate-spin"></div></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-[#9A8478]">No memberships found</div>
        ) : (
          <div className="overflow-x-auto"><table className="w-full">
            <thead className="bg-[#F3EDE3] border-b border-[#EAE0D0]">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-bold uppercase">Member</th>
                <th className="text-left py-3 px-4 text-xs font-bold uppercase">Duration</th>
                <th className="text-left py-3 px-4 text-xs font-bold uppercase">Start</th>
                <th className="text-left py-3 px-4 text-xs font-bold uppercase">Expiry</th>
                <th className="text-left py-3 px-4 text-xs font-bold uppercase">Card</th>
                <th className="text-left py-3 px-4 text-xs font-bold uppercase">Status</th>
                <th className="text-left py-3 px-4 text-xs font-bold uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE0D0]">
              {filtered.map(m => (
                <tr key={m.membership_id} className="hover:bg-[#FAF7F2] transition">
                  <td className="py-3 px-4"><div className="font-medium text-[#2C1F14]">{m.full_name}</div><div className="text-xs text-[#9A8478]">{m.email}</div></td>
                  <td className="py-3 px-4 text-sm">{m.duration_months} mo</td>
                  <td className="py-3 px-4 text-sm">{formatDate(m.start_date)}</td>
                  <td className="py-3 px-4 text-sm">{formatDate(m.expiry_date)}</td>
                  <td className="py-3 px-4 text-xs font-mono text-[#9A8478]">{m.card_number || '—'}</td>
                  <td className="py-3 px-4"><span className={`text-xs px-2 py-1 rounded-full ${
                    m.status === 'active' ? 'bg-green-100 text-green-700' : m.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}>{m.status}</span></td>
                  <td className="py-3 px-4">
                    {m.status === 'pending' && (
                      <div className="flex gap-1">
                        <button onClick={() => handleApprove(m.membership_id, m.duration_months)} className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600"><FaCheck size={12} /></button>
                        <button onClick={() => handleReject(m.membership_id)} className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600"><FaTimes size={12} /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>

      {/* Create Membership Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-serif text-lg font-bold text-[#2C1F14]">New Membership</h2>
                <button onClick={() => { setShowCreateModal(false); setCreateData({ full_name: '', email: '', phone: '', address: '', duration: '12', profilePhoto: null, paymentReceipt: null, profilePhotoName: '', paymentReceiptName: '' }); }} className="text-[#9A8478] hover:text-[#2C1F14]"><FaTimesCircle size={18} /></button>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleCreate(); }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#4A3728] mb-1">Full Name *</label>
                  <input type="text" value={createData.full_name} onChange={e => setCreateData({...createData, full_name: e.target.value})} 
                    className="w-full px-3 py-2.5 border border-[#EAE0D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C4895A]" placeholder="Member's full name" required />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-[#4A3728] mb-1">Phone</label>
                    <input type="tel" value={createData.phone} onChange={e => setCreateData({...createData, phone: e.target.value})} 
                      className="w-full px-3 py-2.5 border border-[#EAE0D0] rounded-lg" placeholder="Optional" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#4A3728] mb-1">Email</label>
                    <input type="email" value={createData.email} onChange={e => setCreateData({...createData, email: e.target.value})} 
                      className="w-full px-3 py-2.5 border border-[#EAE0D0] rounded-lg" placeholder="Optional" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#4A3728] mb-1">Address</label>
                  <input type="text" value={createData.address} onChange={e => setCreateData({...createData, address: e.target.value})} 
                    className="w-full px-3 py-2.5 border border-[#EAE0D0] rounded-lg" placeholder="Optional" />
                </div>

                {/* Photo & Receipt */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-[#4A3728] mb-1">Profile Photo *</label>
                    <div className="border-2 border-dashed border-[#EAE0D0] rounded-lg p-3 text-center cursor-pointer hover:border-[#C4895A] transition"
                      onClick={() => document.getElementById('profilePhotoInput').click()}>
                      <input id="profilePhotoInput" type="file" accept="image/*" className="hidden"
                        onChange={(e) => setCreateData({...createData, profilePhoto: e.target.files[0], profilePhotoName: e.target.files[0]?.name || ''})} />
                      <FaUpload className="mx-auto text-[#9A8478] mb-1" />
                      <p className="text-xs text-[#9A8478]">{createData.profilePhotoName || 'Upload photo'}</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#4A3728] mb-1">Payment Receipt</label>
                    <div className="border-2 border-dashed border-[#EAE0D0] rounded-lg p-3 text-center cursor-pointer hover:border-[#C4895A] transition"
                      onClick={() => document.getElementById('receiptInput').click()}>
                      <input id="receiptInput" type="file" accept="image/*,.pdf" className="hidden"
                        onChange={(e) => setCreateData({...createData, paymentReceipt: e.target.files[0], paymentReceiptName: e.target.files[0]?.name || ''})} />
                      <FaUpload className="mx-auto text-[#9A8478] mb-1" />
                      <p className="text-xs text-[#9A8478]">{createData.paymentReceiptName || 'Upload receipt'}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#4A3728] mb-1">Duration</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[{ months: 3, price: 'NPR 300' }, { months: 6, price: 'NPR 500' }, { months: 12, price: 'NPR 900' }].map(opt => (
                      <button key={opt.months} type="button"
                        onClick={() => setCreateData({...createData, duration: opt.months.toString()})}
                        className={`p-3 rounded-lg border text-center transition ${createData.duration === opt.months.toString() ? 'border-[#C4895A] bg-[#C4895A]/10 text-[#C4895A]' : 'border-[#EAE0D0] text-[#4A3728] hover:border-[#C4895A]'}`}>
                        <div className="font-semibold text-sm">{opt.months} Months</div>
                        <div className="text-xs">{opt.price}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
                  An account will be created automatically. Card will be issued immediately. The member can later register online using the same phone number to link their account.
                </div>

                <div className="flex gap-3 pt-2 border-t border-[#EAE0D0]">
                  <button type="button" onClick={() => { setShowCreateModal(false); setCreateData({ full_name: '', email: '', phone: '', address: '', duration: '12', profilePhoto: null, paymentReceipt: null, profilePhotoName: '', paymentReceiptName: '' }); }} className="flex-1 px-4 py-2.5 border border-[#EAE0D0] rounded-lg hover:bg-gray-50 text-sm">Cancel</button>
                  <button type="submit" disabled={creating || !createData.full_name.trim() || !createData.profilePhoto} className="flex-1 px-4 py-2.5 bg-[#C4895A] text-white rounded-lg hover:bg-[#D4A574] disabled:opacity-50 text-sm font-medium">
                    {creating ? 'Creating...' : 'Create & Issue Card'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MembershipsPage;