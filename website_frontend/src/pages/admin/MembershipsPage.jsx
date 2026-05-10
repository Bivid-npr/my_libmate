// src/pages/admin/MembershipsPage.jsx
import React, { useState, useEffect } from 'react';
import { FaCheck, FaTimes, FaSearch, FaEye, FaReceipt, FaUser, FaEnvelope, FaPhone, FaMapMarker, FaCreditCard, FaPlus, FaUpload, FaTimesCircle } from 'react-icons/fa';
import { adminAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';

const MembershipsPage = () => {
  const [memberships, setMemberships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMembership, setSelectedMembership] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [approving, setApproving] = useState(false);
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

  const handleViewDetails = (membership) => {
    setSelectedMembership(membership);
    setShowDetailModal(true);
  };

  const handleApprove = async () => {
    if (!selectedMembership) return;
    const duration = prompt('Enter membership duration in months (default 12):', selectedMembership.duration_months || '12');
    if (!duration) return;
    setApproving(true);
    try {
      await adminAPI.approveMembership(selectedMembership.membership_id, parseInt(duration));
      showToast('Membership approved successfully!', 'success');
      setShowDetailModal(false);
      setSelectedMembership(null);
      fetchMemberships();
    } catch (e) { showToast(e.message, 'error'); }
    finally { setApproving(false); }
  };

  const handleReject = async () => {
    if (!selectedMembership) return;
    if (!window.confirm('Reject this membership application?')) return;
    try {
      await adminAPI.rejectMembership(selectedMembership.membership_id);
      showToast('Membership rejected', 'success');
      setShowDetailModal(false);
      setSelectedMembership(null);
      fetchMemberships();
    } catch (e) { showToast(e.message, 'error'); }
  };

  const handleCreate = async () => {
    if (!createData.full_name.trim()) { showToast('Full name is required', 'error'); return; }
    if (!createData.profilePhoto) { showToast('Profile photo is required', 'error'); return; }
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
      const response = await fetch('/api/admin/memberships/create', {
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
  const formatDateTime = (d) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A';

  const filtered = memberships.filter(m =>
    m.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
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
          <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 px-4 py-2 bg-[#C4895A] text-white rounded-lg hover:bg-[#D4A574] transition text-sm font-medium whitespace-nowrap">
            <FaPlus size={14} />New Membership
          </button>
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
                  <td className="py-3 px-4"><span className={`text-xs px-2 py-1 rounded-full ${
                    m.status === 'active' ? 'bg-green-100 text-green-700' : m.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}>{m.status}</span></td>
                  <td className="py-3 px-4">
                    <button onClick={() => handleViewDetails(m)} className="p-2 bg-[#C4895A] text-white rounded-lg hover:bg-[#D4A574] transition" title="View Details">
                      <FaEye size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedMembership && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-serif text-2xl font-bold text-[#2C1F14]">Membership Application Review</h2>
                <button onClick={() => setShowDetailModal(false)} className="text-[#9A8478] hover:text-[#2C1F14]"><FaTimes size={20} /></button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="bg-[#F3EDE3] rounded-xl p-4">
                    <h3 className="font-serif text-lg font-bold text-[#2C1F14] mb-3 flex items-center gap-2"><FaUser className="text-[#C4895A]" />Member Information</h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        {selectedMembership.profile_picture ? (
                          <img src={`/uploads/photos/${selectedMembership.profile_picture}`} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-[#C4895A]" />
                        ) : (
                          <div className="w-16 h-16 bg-gradient-to-br from-[#2C1F14] to-[#4A3728] rounded-full flex items-center justify-center">
                            <span className="text-white text-xl font-semibold">{selectedMembership.full_name?.charAt(0) || 'U'}</span>
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-[#2C1F14] text-lg">{selectedMembership.full_name}</p>
                          <p className="text-sm text-[#9A8478] flex items-center gap-1"><FaEnvelope size={12} />{selectedMembership.email}</p>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-[#EAE0D0]">
                        <p className="text-sm text-[#4A3728] flex items-center gap-2"><FaPhone size={12} className="text-[#9A8478]" />{selectedMembership.phone || 'No phone provided'}</p>
                        <p className="text-sm text-[#4A3728] flex items-center gap-2 mt-1"><FaMapMarker size={12} className="text-[#9A8478]" />{selectedMembership.address || 'No address provided'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-[#F3EDE3] rounded-xl p-4">
                    <h3 className="font-serif text-lg font-bold text-[#2C1F14] mb-3 flex items-center gap-2"><FaCreditCard className="text-[#C4895A]" />Membership Details</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div><p className="text-xs text-[#9A8478]">Duration</p><p className="font-semibold text-[#2C1F14]">{selectedMembership.duration_months} months</p></div>
                      <div><p className="text-xs text-[#9A8478]">Requested</p><p className="text-sm text-[#4A3728]">{formatDateTime(selectedMembership.requested_at)}</p></div>
                      <div><p className="text-xs text-[#9A8478]">Payment</p><span className={`inline-block text-xs px-2 py-1 rounded-full ${selectedMembership.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{selectedMembership.payment_status || 'pending'}</span></div>
                      <div><p className="text-xs text-[#9A8478]">Card</p><p className="text-sm font-mono text-[#4A3728]">{selectedMembership.card_number || '—'}</p></div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-[#F3EDE3] rounded-xl p-4">
                    <h3 className="font-serif text-lg font-bold text-[#2C1F14] mb-3">Profile Photo</h3>
                    <div className="flex justify-center">
                      {selectedMembership.profile_picture ? (
                        <img src={`/uploads/photos/${selectedMembership.profile_picture}`} alt="Profile" className="w-48 h-48 rounded-lg object-cover border-2 border-[#C4895A]" />
                      ) : (
                        <div className="w-48 h-48 bg-gray-200 rounded-lg flex items-center justify-center"><FaUser size={48} className="text-gray-400" /></div>
                      )}
                    </div>
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-xs text-yellow-700"><strong>Check:</strong> Verify this is a clear, front-facing photo suitable for a membership card.</p>
                    </div>
                  </div>

                  <div className="bg-[#F3EDE3] rounded-xl p-4">
                    <h3 className="font-serif text-lg font-bold text-[#2C1F14] mb-3 flex items-center gap-2"><FaReceipt className="text-[#C4895A]" />Payment Receipt</h3>
                    {selectedMembership.payment_receipt ? (
                      <div className="text-center">
                        <a href={`/uploads/receipts/${selectedMembership.payment_receipt}`} target="_blank" rel="noopener noreferrer">
                          <img src={`/uploads/receipts/${selectedMembership.payment_receipt}`} alt="Receipt" className="max-h-64 rounded-lg border border-[#EAE0D0] mx-auto" />
                        </a>
                        <a href={`/uploads/receipts/${selectedMembership.payment_receipt}`} target="_blank" rel="noopener noreferrer" className="inline-block mt-2 text-sm text-[#C4895A] hover:underline">Click to view full size</a>
                      </div>
                    ) : (
                      <p className="text-center text-[#9A8478] py-8">No receipt uploaded</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[#EAE0D0]">
                <button onClick={() => setShowDetailModal(false)} className="px-6 py-2 border border-[#EAE0D0] rounded-lg hover:bg-gray-50 transition">Close</button>
                <button onClick={handleReject} className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition flex items-center gap-2"><FaTimes size={14} />Reject</button>
                <button onClick={handleApprove} disabled={approving} className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition flex items-center gap-2 disabled:opacity-50"><FaCheck size={14} />{approving ? 'Approving...' : 'Approve'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

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