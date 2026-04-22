// src/pages/admin/BooksPage.jsx
import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaArchive, FaSearch, FaBook } from 'react-icons/fa';
import { adminAPI, booksAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Link } from 'react-router-dom';

const BooksPage = () => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGenre, setFilterGenre] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [genres, setGenres] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
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
      const data = await booksAPI.getBooks({ per_page: 100 });
      setBooks(data.books || []);
    } catch (error) {
      showToast('Failed to load books', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchGenres = async () => {
    try {
      const data = await booksAPI.getGenres();
      setGenres(data);
    } catch (error) {
      console.error('Error fetching genres:', error);
    }
  };

  const handleAddBook = async (e) => {
    e.preventDefault();
    try {
      await adminAPI.addBook(newBook);
      showToast('Book added successfully!', 'success');
      setShowAddModal(false);
      setNewBook({
        title: '', author: '', isbn: '', genre: '', publisher: '',
        published_year: '', language: 'English', total_copies: 1, description: ''
      });
      fetchBooks();
    } catch (error) {
      showToast(error.message || 'Failed to add book', 'error');
    }
  };

  const handleArchiveBook = async (bookId, title) => {
    if (!window.confirm(`Are you sure you want to archive "${title}"?`)) return;
    
    try {
      await adminAPI.archiveBook(bookId);
      showToast('Book archived successfully', 'success');
      fetchBooks();
    } catch (error) {
      showToast(error.message || 'Failed to archive book', 'error');
    }
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
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#C4895A] text-white rounded-lg hover:bg-[#D4A574] transition"
        >
          <FaPlus size={14} />
          Add New Book
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-[#EAE0D0] p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9A8478]" />
            <input
              type="text"
              placeholder="Search by title, author, or ISBN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[#EAE0D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C4895A]"
            />
          </div>
          <select 
            value={filterGenre}
            onChange={(e) => setFilterGenre(e.target.value)}
            className="px-4 py-2 border border-[#EAE0D0] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#C4895A]"
          >
            <option value="">All Genres</option>
            {genres.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-[#EAE0D0] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#C4895A]"
          >
            <option value="">All Status</option>
            <option value="available">Available</option>
            <option value="unavailable">Unavailable</option>
          </select>
        </div>
      </div>

      {/* Books Table */}
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
                  <th className="text-left py-3 px-4 text-xs font-bold text-[#2C1F14] uppercase tracking-wide">Title</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-[#2C1F14] uppercase tracking-wide">Author</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-[#2C1F14] uppercase tracking-wide">Genre</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-[#2C1F14] uppercase tracking-wide">ISBN</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-[#2C1F14] uppercase tracking-wide">Copies</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-[#2C1F14] uppercase tracking-wide">Status</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-[#2C1F14] uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE0D0]">
                {filteredBooks.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-[#9A8478]">
                      <FaBook className="text-4xl mx-auto mb-2 opacity-30" />
                      No books found
                    </td>
                  </tr>
                ) : (
                  filteredBooks.map((book) => (
                    <tr key={book.book_id} className="hover:bg-[#FAF7F2] transition">
                      <td className="py-3 px-4">
                        <Link to={`/book/${book.book_id}`} className="font-medium text-[#2C1F14] hover:text-[#C4895A] transition">
                          {book.title}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-[#4A3728]">{book.author}</td>
                      <td className="py-3 px-4 text-[#4A3728]">{book.genre || '—'}</td>
                      <td className="py-3 px-4 text-[#4A3728] text-sm">{book.isbn || '—'}</td>
                      <td className="py-3 px-4 text-[#4A3728]">
                        {book.available_copies} / {book.total_copies}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          book.available_copies > 0 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {book.available_copies > 0 ? 'Available' : 'Unavailable'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Link 
                            to={`/admin/books/${book.book_id}/edit`}
                            className="p-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                            title="Edit"
                          >
                            <FaEdit size={12} />
                          </Link>
                          <button 
                            onClick={() => handleArchiveBook(book.book_id, book.title)}
                            className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                            title="Archive"
                          >
                            <FaArchive size={12} />
                          </button>
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
              <h2 className="font-serif text-xl font-bold text-[#2C1F14] mb-4">Add New Book</h2>
              <form onSubmit={handleAddBook} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-[#4A3728] mb-1">Title *</label>
                    <input type="text" required value={newBook.title} onChange={(e) => setNewBook({...newBook, title: e.target.value})} className="w-full px-3 py-2 border border-[#EAE0D0] rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#4A3728] mb-1">Author *</label>
                    <input type="text" required value={newBook.author} onChange={(e) => setNewBook({...newBook, author: e.target.value})} className="w-full px-3 py-2 border border-[#EAE0D0] rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#4A3728] mb-1">ISBN</label>
                    <input type="text" value={newBook.isbn} onChange={(e) => setNewBook({...newBook, isbn: e.target.value})} className="w-full px-3 py-2 border border-[#EAE0D0] rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#4A3728] mb-1">Genre</label>
                    <input type="text" value={newBook.genre} onChange={(e) => setNewBook({...newBook, genre: e.target.value})} className="w-full px-3 py-2 border border-[#EAE0D0] rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#4A3728] mb-1">Publisher</label>
                    <input type="text" value={newBook.publisher} onChange={(e) => setNewBook({...newBook, publisher: e.target.value})} className="w-full px-3 py-2 border border-[#EAE0D0] rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#4A3728] mb-1">Published Year</label>
                    <input type="number" value={newBook.published_year} onChange={(e) => setNewBook({...newBook, published_year: e.target.value})} className="w-full px-3 py-2 border border-[#EAE0D0] rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#4A3728] mb-1">Language</label>
                    <select value={newBook.language} onChange={(e) => setNewBook({...newBook, language: e.target.value})} className="w-full px-3 py-2 border border-[#EAE0D0] rounded-lg">
                      <option>English</option><option>Spanish</option><option>French</option><option>German</option><option>Chinese</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#4A3728] mb-1">Total Copies</label>
                    <input type="number" min="1" value={newBook.total_copies} onChange={(e) => setNewBook({...newBook, total_copies: parseInt(e.target.value)})} className="w-full px-3 py-2 border border-[#EAE0D0] rounded-lg" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-[#4A3728] mb-1">Description</label>
                    <textarea rows="3" value={newBook.description} onChange={(e) => setNewBook({...newBook, description: e.target.value})} className="w-full px-3 py-2 border border-[#EAE0D0] rounded-lg" />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-[#EAE0D0]">
                  <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 border border-[#EAE0D0] rounded-lg hover:bg-gray-50 transition">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-[#C4895A] text-white rounded-lg hover:bg-[#D4A574] transition">Add Book</button>
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