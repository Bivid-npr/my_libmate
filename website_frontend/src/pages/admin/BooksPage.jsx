// src/pages/admin/BooksPage.jsx
import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaArchive, FaSearch, FaBook, FaTimes, FaUpload } from 'react-icons/fa';
import { adminAPI, booksAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Link } from 'react-router-dom';

const GENRE_OPTIONS = [
  'Fiction', 'Science Fiction', 'Fantasy', 'Mystery', 'Thriller',
  'Romance', 'Horror', 'Biography', 'History', 'Self-Help',
  'Memoir', 'Literary Fiction', 'Contemporary Fiction',
  'Historical Fiction', 'Psychological Thriller', 'Speculative Fiction',
  'Science', 'Technology', 'Philosophy', 'Poetry', 'Drama', 'Other'
];

const LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Chinese', 'Japanese', 'Russian', 'Italian', 'Portuguese', 'Arabic', 'Hindi', 'Korean', 'Other'];

const BooksPage = () => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGenre, setFilterGenre] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [genres, setGenres] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [editCoverFile, setEditCoverFile] = useState(null);
  const [editCoverPreview, setEditCoverPreview] = useState(null);
  const [newBook, setNewBook] = useState({
    title: '', author: '', isbn: '', genre: '', publisher: '',
    published_year: '', language: 'English', total_copies: 1, description: ''
  });
  const { showToast } = useToast();

  useEffect(() => {
    fetchBooks();
    fetchGenres();
  }, []);

  const fetchBooks = async () => {
    setLoading(true);
    try {
      const data = await booksAPI.getBooks({ per_page: 200 });
      setBooks(data.books || []);
    } catch (error) { showToast('Failed to load books', 'error'); }
    finally { setLoading(false); }
  };

  const fetchGenres = async () => {
    try {
      const data = await booksAPI.getGenres();
      setGenres(data);
    } catch (error) { console.error('Error fetching genres:', error); }
  };

  // Get unique genres from both predefined and database
  const allGenres = [...new Set([...GENRE_OPTIONS, ...genres])].sort();

  const handleCoverChange = (e, isEdit = false) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image too large. Max 5MB', 'error');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      if (isEdit) {
        setEditCoverFile(file);
        setEditCoverPreview(e.target.result);
      } else {
        setCoverFile(file);
        setCoverPreview(e.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddBook = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      Object.keys(newBook).forEach(key => formData.append(key, newBook[key]));
      if (coverFile) formData.append('cover_image', coverFile);
      
      // Use FormData upload endpoint
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/admin/books', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to add book');
      
      showToast('Book added successfully!', 'success');
      setShowAddModal(false);
      resetForm();
      fetchBooks();
    } catch (error) { showToast(error.message || 'Failed to add book', 'error'); }
  };

  const handleEditBook = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      Object.keys(editingBook).forEach(key => {
        if (key !== 'book_id' && key !== 'cover_image' && key !== 'available_copies' && key !== 'total_borrow_count') {
          formData.append(key, editingBook[key] || '');
        }
      });
      if (editCoverFile) formData.append('cover_image', editCoverFile);
      
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/admin/books/${editingBook.book_id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update book');
      
      showToast('Book updated successfully!', 'success');
      setShowEditModal(false);
      setEditingBook(null);
      setEditCoverFile(null);
      setEditCoverPreview(null);
      fetchBooks();
    } catch (error) { showToast(error.message || 'Failed to update book', 'error'); }
  };

  const openEditModal = (book) => {
    setEditingBook({ ...book });
    setEditCoverPreview(book.cover_image ? `http://localhost:5000/uploads/covers/${book.cover_image}` : null);
    setEditCoverFile(null);
    setShowEditModal(true);
  };

  const handleArchiveBook = async (bookId, title) => {
    if (!window.confirm(`Are you sure you want to archive "${title}"?`)) return;
    try {
      await adminAPI.archiveBook(bookId);
      showToast('Book archived successfully', 'success');
      fetchBooks();
    } catch (error) { showToast(error.message || 'Failed to archive book', 'error'); }
  };

  const resetForm = () => {
    setNewBook({ title: '', author: '', isbn: '', genre: '', publisher: '', published_year: '', language: 'English', total_copies: 1, description: '' });
    setCoverFile(null);
    setCoverPreview(null);
  };

  const filteredBooks = books.filter(book => {
    const matchesSearch = book.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          book.author?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          book.isbn?.includes(searchTerm);
    const matchesGenre = !filterGenre || book.genre === filterGenre;
    const matchesStatus = !filterStatus || 
      (filterStatus === 'available' && book.available_copies > 0) ||
      (filterStatus === 'unavailable' && book.available_copies === 0);
    return matchesSearch && matchesGenre && matchesStatus;
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[#2C1F14]">Manage Books</h1>
          <p className="text-[#9A8478] mt-1">Add, edit, and manage library books</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2 bg-[#C4895A] text-white rounded-lg hover:bg-[#D4A574] transition">
          <FaPlus size={14} />Add New Book
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-[#EAE0D0] p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9A8478]" />
            <input type="text" placeholder="Search by title, author, or ISBN..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[#EAE0D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C4895A]" />
          </div>
          <select value={filterGenre} onChange={(e) => setFilterGenre(e.target.value)} className="px-4 py-2 border border-[#EAE0D0] rounded-lg bg-white">
            <option value="">All Genres</option>
            {allGenres.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-4 py-2 border border-[#EAE0D0] rounded-lg bg-white">
            <option value="">All Status</option>
            <option value="available">Available</option>
            <option value="unavailable">Unavailable</option>
          </select>
        </div>
      </div>

      {/* Books Table */}
      <div className="bg-white rounded-xl shadow-sm border border-[#EAE0D0] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-[#C4895A] border-t-transparent rounded-full animate-spin"></div></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#F3EDE3] border-b border-[#EAE0D0]">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-bold uppercase">Cover</th>
                  <th className="text-left py-3 px-4 text-xs font-bold uppercase">Title</th>
                  <th className="text-left py-3 px-4 text-xs font-bold uppercase">Author</th>
                  <th className="text-left py-3 px-4 text-xs font-bold uppercase">Genre</th>
                  <th className="text-left py-3 px-4 text-xs font-bold uppercase">ISBN</th>
                  <th className="text-left py-3 px-4 text-xs font-bold uppercase">Copies</th>
                  <th className="text-left py-3 px-4 text-xs font-bold uppercase">Status</th>
                  <th className="text-left py-3 px-4 text-xs font-bold uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE0D0]">
                {filteredBooks.length === 0 ? (
                  <tr><td colSpan="8" className="py-8 text-center text-[#9A8478]"><FaBook className="text-4xl mx-auto mb-2 opacity-30" />No books found</td></tr>
                ) : (
                  filteredBooks.map((book) => (
                    <tr key={book.book_id} className="hover:bg-[#FAF7F2] transition">
                      <td className="py-3 px-4">
                        {book.cover_image ? (
                          <img src={`http://localhost:5000/uploads/covers/${book.cover_image}`} alt="" className="w-10 h-14 object-cover rounded" />
                        ) : (
                          <div className="w-10 h-14 bg-gradient-to-br from-[#2C1F14] to-[#4A3728] rounded flex items-center justify-center">
                            <FaBook className="text-white/50 text-xs" />
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4"><Link to={`/book/${book.book_id}`} className="font-medium text-[#2C1F14] hover:text-[#C4895A] transition">{book.title}</Link></td>
                      <td className="py-3 px-4 text-[#4A3728]">{book.author}</td>
                      <td className="py-3 px-4 text-[#4A3728]">{book.genre || '—'}</td>
                      <td className="py-3 px-4 text-[#4A3728] text-sm">{book.isbn || '—'}</td>
                      <td className="py-3 px-4 text-[#4A3728]">{book.available_copies} / {book.total_copies}</td>
                      <td className="py-3 px-4">
                        <span className={`text-xs px-2 py-1 rounded-full ${book.available_copies > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {book.available_copies > 0 ? 'Available' : 'Unavailable'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEditModal(book)} className="p-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition" title="Edit"><FaEdit size={12} /></button>
                          <button onClick={() => handleArchiveBook(book.book_id, book.title)} className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition" title="Archive"><FaArchive size={12} /></button>
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

      {/* Add Book Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-serif text-xl font-bold text-[#2C1F14]">Add New Book</h2>
                <button onClick={() => { setShowAddModal(false); resetForm(); }} className="text-[#9A8478] hover:text-[#2C1F14]"><FaTimes size={20} /></button>
              </div>
              <form onSubmit={handleAddBook} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-[#4A3728] mb-1">Cover Image</label>
                    <div className="flex items-center gap-4">
                      <div className="w-24 h-32 bg-[#F3EDE3] rounded-lg flex items-center justify-center border-2 border-dashed border-[#EAE0D0] overflow-hidden">
                        {coverPreview ? <img src={coverPreview} alt="Preview" className="w-full h-full object-cover" /> : <FaUpload className="text-[#9A8478] text-2xl" />}
                      </div>
                      <input type="file" accept="image/*" onChange={(e) => handleCoverChange(e)} className="text-sm" />
                    </div>
                  </div>
                  <div className="col-span-2"><label className="block text-sm font-medium text-[#4A3728] mb-1">Title *</label><input type="text" required value={newBook.title} onChange={(e) => setNewBook({...newBook, title: e.target.value})} className="w-full px-3 py-2 border border-[#EAE0D0] rounded-lg" /></div>
                  <div><label className="block text-sm font-medium text-[#4A3728] mb-1">Author *</label><input type="text" required value={newBook.author} onChange={(e) => setNewBook({...newBook, author: e.target.value})} className="w-full px-3 py-2 border border-[#EAE0D0] rounded-lg" /></div>
                  <div><label className="block text-sm font-medium text-[#4A3728] mb-1">ISBN</label><input type="text" value={newBook.isbn} onChange={(e) => setNewBook({...newBook, isbn: e.target.value})} className="w-full px-3 py-2 border border-[#EAE0D0] rounded-lg" /></div>
                  <div>
                    <label className="block text-sm font-medium text-[#4A3728] mb-1">Genre</label>
                    <select value={newBook.genre} onChange={(e) => setNewBook({...newBook, genre: e.target.value})} className="w-full px-3 py-2 border border-[#EAE0D0] rounded-lg bg-white">
                      <option value="">Select genre</option>
                      {allGenres.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div><label className="block text-sm font-medium text-[#4A3728] mb-1">Publisher</label><input type="text" value={newBook.publisher} onChange={(e) => setNewBook({...newBook, publisher: e.target.value})} className="w-full px-3 py-2 border border-[#EAE0D0] rounded-lg" /></div>
                  <div><label className="block text-sm font-medium text-[#4A3728] mb-1">Published Year</label><input type="number" value={newBook.published_year} onChange={(e) => setNewBook({...newBook, published_year: e.target.value})} className="w-full px-3 py-2 border border-[#EAE0D0] rounded-lg" /></div>
                  <div>
                    <label className="block text-sm font-medium text-[#4A3728] mb-1">Language</label>
                    <select value={newBook.language} onChange={(e) => setNewBook({...newBook, language: e.target.value})} className="w-full px-3 py-2 border border-[#EAE0D0] rounded-lg bg-white">
                      {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <div><label className="block text-sm font-medium text-[#4A3728] mb-1">Total Copies</label><input type="number" min="1" value={newBook.total_copies} onChange={(e) => setNewBook({...newBook, total_copies: parseInt(e.target.value) || 1})} className="w-full px-3 py-2 border border-[#EAE0D0] rounded-lg" /></div>
                  <div className="col-span-2"><label className="block text-sm font-medium text-[#4A3728] mb-1">Description</label><textarea rows="3" value={newBook.description} onChange={(e) => setNewBook({...newBook, description: e.target.value})} className="w-full px-3 py-2 border border-[#EAE0D0] rounded-lg resize-none" /></div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-[#EAE0D0]">
                  <button type="button" onClick={() => { setShowAddModal(false); resetForm(); }} className="px-4 py-2 border border-[#EAE0D0] rounded-lg hover:bg-gray-50 transition">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-[#C4895A] text-white rounded-lg hover:bg-[#D4A574] transition">Add Book</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Book Modal */}
      {showEditModal && editingBook && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-serif text-xl font-bold text-[#2C1F14]">Edit Book</h2>
                <button onClick={() => { setShowEditModal(false); setEditingBook(null); }} className="text-[#9A8478] hover:text-[#2C1F14]"><FaTimes size={20} /></button>
              </div>
              <form onSubmit={handleEditBook} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-[#4A3728] mb-1">Cover Image</label>
                    <div className="flex items-center gap-4">
                      <div className="w-24 h-32 bg-[#F3EDE3] rounded-lg flex items-center justify-center border-2 border-dashed border-[#EAE0D0] overflow-hidden">
                        {editCoverPreview ? <img src={editCoverPreview} alt="Preview" className="w-full h-full object-cover" /> : <FaUpload className="text-[#9A8478] text-2xl" />}
                      </div>
                      <input type="file" accept="image/*" onChange={(e) => handleCoverChange(e, true)} className="text-sm" />
                    </div>
                  </div>
                  <div className="col-span-2"><label className="block text-sm font-medium text-[#4A3728] mb-1">Title *</label><input type="text" required value={editingBook.title} onChange={(e) => setEditingBook({...editingBook, title: e.target.value})} className="w-full px-3 py-2 border border-[#EAE0D0] rounded-lg" /></div>
                  <div><label className="block text-sm font-medium text-[#4A3728] mb-1">Author *</label><input type="text" required value={editingBook.author} onChange={(e) => setEditingBook({...editingBook, author: e.target.value})} className="w-full px-3 py-2 border border-[#EAE0D0] rounded-lg" /></div>
                  <div><label className="block text-sm font-medium text-[#4A3728] mb-1">ISBN</label><input type="text" value={editingBook.isbn || ''} onChange={(e) => setEditingBook({...editingBook, isbn: e.target.value})} className="w-full px-3 py-2 border border-[#EAE0D0] rounded-lg" /></div>
                  <div>
                    <label className="block text-sm font-medium text-[#4A3728] mb-1">Genre</label>
                    <select value={editingBook.genre || ''} onChange={(e) => setEditingBook({...editingBook, genre: e.target.value})} className="w-full px-3 py-2 border border-[#EAE0D0] rounded-lg bg-white">
                      <option value="">Select genre</option>
                      {allGenres.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div><label className="block text-sm font-medium text-[#4A3728] mb-1">Publisher</label><input type="text" value={editingBook.publisher || ''} onChange={(e) => setEditingBook({...editingBook, publisher: e.target.value})} className="w-full px-3 py-2 border border-[#EAE0D0] rounded-lg" /></div>
                  <div><label className="block text-sm font-medium text-[#4A3728] mb-1">Published Year</label><input type="number" value={editingBook.published_year || ''} onChange={(e) => setEditingBook({...editingBook, published_year: e.target.value})} className="w-full px-3 py-2 border border-[#EAE0D0] rounded-lg" /></div>
                  <div>
                    <label className="block text-sm font-medium text-[#4A3728] mb-1">Language</label>
                    <select value={editingBook.language || 'English'} onChange={(e) => setEditingBook({...editingBook, language: e.target.value})} className="w-full px-3 py-2 border border-[#EAE0D0] rounded-lg bg-white">
                      {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <div><label className="block text-sm font-medium text-[#4A3728] mb-1">Total Copies</label><input type="number" min="1" value={editingBook.total_copies || 1} onChange={(e) => setEditingBook({...editingBook, total_copies: parseInt(e.target.value) || 1})} className="w-full px-3 py-2 border border-[#EAE0D0] rounded-lg" /></div>
                  <div className="col-span-2"><label className="block text-sm font-medium text-[#4A3728] mb-1">Description</label><textarea rows="3" value={editingBook.description || ''} onChange={(e) => setEditingBook({...editingBook, description: e.target.value})} className="w-full px-3 py-2 border border-[#EAE0D0] rounded-lg resize-none" /></div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-[#EAE0D0]">
                  <button type="button" onClick={() => { setShowEditModal(false); setEditingBook(null); }} className="px-4 py-2 border border-[#EAE0D0] rounded-lg hover:bg-gray-50 transition">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-[#C4895A] text-white rounded-lg hover:bg-[#D4A574] transition">Save Changes</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BooksPage;