// src/components/models/RequestBookModal.jsx
import React, { useState } from 'react';
import { FaTimes, FaBook } from 'react-icons/fa';
import { booksAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';

const RequestBookModal = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    genre: '',
    reason: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      showToast('Book title is required', 'error');
      return;
    }
    
    setSubmitting(true);
    try {
      await booksAPI.requestBook(formData);
      showToast('Book request submitted! The library will review it.', 'success');
      setFormData({ title: '', author: '', genre: '', reason: '' });
      onClose();
    } catch (error) {
      showToast(error.message || 'Failed to submit request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const genres = [
    'Fiction', 'Science Fiction', 'Fantasy', 'Mystery', 'Biography',
    'History', 'Self-Help', 'Memoir', 'Horror', 'Romance', 'Thriller', 'Other'
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-serif text-xl font-bold text-[#2C1F14] flex items-center gap-2">
              <FaBook className="text-[#C4895A]" />
              Request a Book
            </h2>
            <button onClick={onClose} className="text-[#9A8478] hover:text-[#2C1F14] transition">
              <FaTimes size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#4A3728] mb-1">Book Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter the book title"
                className="w-full px-4 py-2 border border-[#EAE0D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C4895A]"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#4A3728] mb-1">Author</label>
              <input
                type="text"
                value={formData.author}
                onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                placeholder="Author name (if known)"
                className="w-full px-4 py-2 border border-[#EAE0D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C4895A]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#4A3728] mb-1">Genre</label>
              <select
                value={formData.genre}
                onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                className="w-full px-4 py-2 border border-[#EAE0D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C4895A] bg-white"
              >
                <option value="">Select genre</option>
                {genres.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#4A3728] mb-1">Why do you want this book?</label>
              <textarea
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="Brief reason for the request..."
                rows={3}
                className="w-full px-4 py-2 border border-[#EAE0D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C4895A] resize-none"
              />
            </div>

            <div className="bg-[#C4895A]/10 rounded-lg p-3">
              <p className="text-xs text-[#C4895A]">
                The library will review your request. You'll be notified when a decision is made.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-[#EAE0D0] rounded-lg hover:bg-gray-50 transition text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-[#C4895A] text-white rounded-lg hover:bg-[#D4A574] transition text-sm disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RequestBookModal;