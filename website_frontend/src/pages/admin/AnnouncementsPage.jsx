// src/pages/admin/AnnouncementsPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { FaBullhorn, FaTrash, FaPaperPlane, FaUsers, FaClock, FaTimes } from 'react-icons/fa';
import { adminAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';

const AnnouncementsPage = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const { showToast } = useToast();

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminAPI.getAnnouncements();
      setAnnouncements(data || []);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      showToast('Failed to load announcements', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchAnnouncements(); }, [fetchAnnouncements]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      showToast('Title and message are required', 'error');
      return;
    }
    
    setSending(true);
    try {
      const result = await adminAPI.sendAnnouncement(title, message);
      showToast(`Announcement sent to ${result.sent_to} users!`, 'success');
      setTitle('');
      setMessage('');
      setShowForm(false);
      fetchAnnouncements();
    } catch (error) {
      showToast(error.message || 'Failed to send announcement', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      await adminAPI.deleteAnnouncement(id);
      showToast('Announcement deleted', 'success');
      fetchAnnouncements();
    } catch (error) {
      showToast(error.message || 'Failed to delete', 'error');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMins = Math.floor((now - date) / 60000);
    const diffHours = Math.floor((now - date) / 3600000);
    const diffDays = Math.floor((now - date) / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <p className="text-[#9A8478] mt-1 font-medium">Send announcements to all library members</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#C4895A] text-white rounded-lg hover:bg-[#D4A574] transition text-sm font-medium"
        >
          <FaBullhorn size={14} />New Announcement
        </button>
      </div>

      {/* New Announcement Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-serif text-lg font-bold text-[#2C1F14] flex items-center gap-2">
                  <FaBullhorn className="text-[#C4895A]" /> New Announcement
                </h2>
                <button onClick={() => setShowForm(false)} className="text-[#9A8478] hover:text-[#2C1F14]">
                  <FaTimes size={18} />
                </button>
              </div>
              
              <form onSubmit={handleSend}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-[#4A3728] mb-1">Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Library Holiday Closure"
                    className="w-full px-4 py-2 border border-[#EAE0D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C4895A] text-sm"
                    maxLength={255}
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-[#4A3728] mb-1">Message</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Write your announcement message here..."
                    rows={4}
                    className="w-full px-4 py-2 border border-[#EAE0D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C4895A] text-sm resize-none"
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <div className="flex items-start gap-2">
                    <FaUsers className="text-blue-500 mt-0.5" size={14} />
                    <p className="text-xs text-blue-700">
                      This announcement will be sent to all active library members immediately.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setShowForm(false)}
                    className="px-4 py-2 border border-[#EAE0D0] rounded-lg hover:bg-gray-50 transition text-sm">Cancel</button>
                  <button type="submit" disabled={sending || !title.trim() || !message.trim()}
                    className="flex items-center gap-2 px-4 py-2 bg-[#C4895A] text-white rounded-lg hover:bg-[#D4A574] transition text-sm disabled:opacity-50">
                    <FaPaperPlane size={12} />{sending ? 'Sending...' : 'Send Announcement'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Announcements List */}
      <div className="bg-white rounded-xl shadow-sm border border-[#EAE0D0] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-[#C4895A] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-[#F3EDE3] rounded-full flex items-center justify-center mx-auto mb-4">
              <FaBullhorn className="text-[#9A8478] text-2xl" />
            </div>
            <h3 className="font-serif text-lg font-bold text-[#2C1F14] mb-2">No announcements yet</h3>
            <p className="text-[#9A8478] text-sm">Send your first announcement to library members.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#EAE0D0]">
            {announcements.map((ann) => (
              <div key={ann.notification_id} className="p-5 hover:bg-[#FAF7F2] transition">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 bg-[#C4895A]/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <FaBullhorn className="text-[#C4895A]" size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-[#2C1F14]">{ann.title}</h3>
                      <p className="text-sm text-[#9A8478] mt-1 leading-relaxed">{ann.message}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-[#9A8478]">
                        <span className="flex items-center gap-1">
                          <FaClock size={10} /> {formatDate(ann.created_at)}
                        </span>
                        {ann.admin_name && (
                          <span>by {ann.admin_name}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(ann.notification_id)}
                    className="p-1.5 text-[#9A8478] hover:text-red-500 hover:bg-red-50 rounded-lg transition flex-shrink-0"
                    title="Delete announcement"
                  >
                    <FaTrash size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Footer */}
      <div className="mt-6 p-4 bg-[#C4895A]/5 border border-[#C4895A]/20 rounded-xl">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-[#C4895A]/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <FaBullhorn className="text-[#C4895A] text-sm" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-[#C4895A] mb-1">About Announcements</h4>
            <p className="text-xs text-[#9A8478]">
              Announcements are sent as notifications to all active library members. Use this for important updates like holiday closures, new book arrivals, policy changes, or events.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementsPage;