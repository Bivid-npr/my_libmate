// Mock data matching your database schema
// These will be replaced by API calls when backend is ready

export const mockBooks = [
  { 
    book_id: 1,
    title: 'Atomic Habits', 
    author: 'James Clear', 
    isbn: '9780735211292',
    genre: 'Self-Help', 
    publisher: 'Penguin Random House',
    published_year: 2018,
    language: 'English',
    total_copies: 5,
    available_copies: 3,
    cover_image: null,
    description: 'An easy and proven way to build good habits and break bad ones. No matter your goals, Atomic Habits offers a proven framework for improving every day. James Clear, one of the world\'s leading experts on habit formation, reveals practical strategies that will teach you exactly how to form good habits, break bad ones, and master the tiny behaviors that lead to remarkable results.',
    status: 'available',
    is_archived: false,
    total_borrow_count: 142,
    avg_rating: 4.8,
    total_reviews: 1247,
    // Frontend helper (not in DB, but useful for UI)
    cover_color: 'linear-gradient(145deg,#8B6F5E,#6B4F40)'
  },
  { 
    book_id: 2,
    title: 'Sapiens', 
    author: 'Yuval Noah Harari', 
    isbn: '9780062316097',
    genre: 'History', 
    publisher: 'Harper',
    published_year: 2011,
    language: 'English',
    total_copies: 7,
    available_copies: 5,
    cover_image: null,
    description: 'A brief history of humankind from the Stone Age to the present.',
    status: 'available',
    is_archived: false,
    total_borrow_count: 138,
    avg_rating: 4.7,
    total_reviews: 2156,
    cover_color: 'linear-gradient(145deg,#4A7C59,#2D5A3D)'
  },
  { 
    book_id: 3,
    title: 'Deep Work', 
    author: 'Cal Newport', 
    isbn: '9781455586691',
    genre: 'Productivity', 
    publisher: 'Grand Central Publishing',
    published_year: 2016,
    language: 'English',
    total_copies: 3,
    available_copies: 0,
    cover_image: null,
    description: 'Rules for focused success in a distracted world.',
    status: 'unavailable',
    is_archived: false,
    total_borrow_count: 87,
    avg_rating: 4.6,
    total_reviews: 632,
    cover_color: 'linear-gradient(145deg,#5E6B8B,#3D4F6B)'
  },
  { 
    book_id: 4,
    title: 'Psychology of Money', 
    author: 'Morgan Housel', 
    isbn: '9780857197689',
    genre: 'Finance', 
    publisher: 'Harriman House',
    published_year: 2020,
    language: 'English',
    total_copies: 5,
    available_copies: 3,
    cover_image: null,
    description: 'Timeless lessons on wealth, greed, and happiness.',
    status: 'available',
    is_archived: false,
    total_borrow_count: 98,
    avg_rating: 4.5,
    total_reviews: 723,
    cover_color: 'linear-gradient(145deg,#8B5E6B,#6B3D4A)'
  },
  { 
    book_id: 5,
    title: 'Clean Code', 
    author: 'Robert C. Martin', 
    isbn: '9780132350884',
    genre: 'Computing', 
    publisher: 'Prentice Hall',
    published_year: 2008,
    language: 'English',
    total_copies: 4,
    available_copies: 2,
    cover_image: null,
    description: 'A handbook of agile software craftsmanship and best practices for writing clean, maintainable code.',
    status: 'available',
    is_archived: false,
    total_borrow_count: 92,
    avg_rating: 4.3,
    total_reviews: 734,
    cover_color: 'linear-gradient(145deg,#4A6B7C,#2D4A5A)'
  },
  { 
    book_id: 6,
    title: 'The Pragmatic Programmer', 
    author: 'David Thomas', 
    isbn: '9780201616224',
    genre: 'Computing', 
    publisher: 'Addison-Wesley',
    published_year: 1999,
    language: 'English',
    total_copies: 4,
    available_copies: 3,
    cover_image: null,
    description: 'Your journey to mastery. A guide to becoming a better programmer through practical techniques.',
    status: 'available',
    is_archived: false,
    total_borrow_count: 110,
    avg_rating: 4.7,
    total_reviews: 892,
    cover_color: 'linear-gradient(145deg,#3D5A3D,#2D4A2D)'
  },
  { 
    book_id: 7,
    title: 'Thinking Fast and Slow', 
    author: 'Daniel Kahneman', 
    isbn: '9780374533557',
    genre: 'Psychology', 
    publisher: 'Farrar, Straus and Giroux',
    published_year: 2011,
    language: 'English',
    total_copies: 6,
    available_copies: 3,
    cover_image: null,
    description: 'Explores two systems of thinking and how they shape our judgments and decisions.',
    status: 'available',
    is_archived: false,
    total_borrow_count: 104,
    avg_rating: 4.4,
    total_reviews: 921,
    cover_color: 'linear-gradient(145deg,#7A6B4A,#5A4B2A)'
  },
  { 
    book_id: 8,
    title: 'The 7 Habits of Highly Effective People', 
    author: 'Stephen Covey', 
    isbn: '9780743269513',
    genre: 'Self-Help', 
    publisher: 'Free Press',
    published_year: 1989,
    language: 'English',
    total_copies: 5,
    available_copies: 2,
    cover_image: null,
    description: 'Powerful lessons in personal change through principle-centered living.',
    status: 'available',
    is_archived: false,
    total_borrow_count: 115,
    avg_rating: 4.3,
    total_reviews: 1245,
    cover_color: 'linear-gradient(145deg,#6B4F40,#4A2F20)'
  },
  { 
    book_id: 9,
    title: 'Design Patterns', 
    author: 'Erich Gamma', 
    isbn: '9780201633610',
    genre: 'Computing', 
    publisher: 'Addison-Wesley',
    published_year: 1994,
    language: 'English',
    total_copies: 3,
    available_copies: 0,
    cover_image: null,
    description: 'Elements of reusable object-oriented software. The classic book on software design patterns.',
    status: 'unavailable',
    is_archived: false,
    total_borrow_count: 95,
    avg_rating: 4.6,
    total_reviews: 567,
    cover_color: 'linear-gradient(145deg,#4A7C59,#2D5A3D)'
  },
  { 
    book_id: 10,
    title: 'The Art of War', 
    author: 'Sun Tzu', 
    isbn: '9781590302255',
    genre: 'History', 
    publisher: 'Shambhala',
    published_year: 500,
    language: 'English',
    total_copies: 6,
    available_copies: 4,
    cover_image: null,
    description: 'Ancient military strategy and tactics that have influenced leaders for centuries.',
    status: 'available',
    is_archived: false,
    total_borrow_count: 85,
    avg_rating: 4.3,
    total_reviews: 412,
    cover_color: 'linear-gradient(145deg,#6B6B3D,#4A4A1D)'
  },
];

// Mock trending books (separate table in DB)
export const mockTrendingBooks = [
  { book_id: 1, rank: 1, borrow_count: 142, period_start: '2024-03-01', period_end: '2024-03-31' },
  { book_id: 2, rank: 2, borrow_count: 138, period_start: '2024-03-01', period_end: '2024-03-31' },
  { book_id: 3, rank: 3, borrow_count: 87, period_start: '2024-03-01', period_end: '2024-03-31' },
  { book_id: 7, rank: 4, borrow_count: 104, period_start: '2024-03-01', period_end: '2024-03-31' },
  { book_id: 4, rank: 5, borrow_count: 98, period_start: '2024-03-01', period_end: '2024-03-31' },
];

// Mock reviews (separate table in DB)
export const mockReviews = [
  { review_id: 1, user_id: 1, book_id: 1, rating: 5, review_text: 'This book completely changed how I think about building habits!', created_at: '2025-03-12' },
  { review_id: 2, user_id: 2, book_id: 1, rating: 4, review_text: 'Great practical advice but some parts felt repetitive.', created_at: '2025-02-08' },
  { review_id: 3, user_id: 3, book_id: 2, rating: 5, review_text: 'One of the best books I\'ve read this year.', created_at: '2025-01-20' },
  { review_id: 4, user_id: 1, book_id: 3, rating: 4, review_text: 'Very helpful for improving focus.', created_at: '2025-03-01' },
];

// Mock borrowings (active borrows)
export const mockBorrowings = [
  { borrow_id: 1, user_id: 1, book_id: 1, issued_at: '2025-03-20', due_date: '2025-04-03', status: 'borrowed', renewal_count: 0 },
  { borrow_id: 2, user_id: 1, book_id: 3, issued_at: '2025-03-15', due_date: '2025-03-29', status: 'overdue', renewal_count: 0 },
];

// Mock borrow history (completed borrows)
export const mockBorrowHistory = [
  { history_id: 1, user_id: 1, book_id: 2, issued_at: '2025-01-05', due_date: '2025-01-19', returned_at: '2025-01-18', return_condition: 'good', fine_amount: 0 },
  { history_id: 2, user_id: 1, book_id: 4, issued_at: '2024-12-10', due_date: '2024-12-24', returned_at: '2024-12-28', return_condition: 'good', fine_amount: 15.00 },
];

// Mock wishlist
export const mockWishlist = [
  { wishlist_id: 1, user_id: 1, book_id: 5, added_at: '2025-03-01' },
  { wishlist_id: 2, user_id: 1, book_id: 6, added_at: '2025-03-05' },
  { wishlist_id: 3, user_id: 1, book_id: 8, added_at: '2025-03-10' },
];

// Mock user
export const mockUser = {
  user_id: 1,
  full_name: 'Pujan Gurung',
  email: 'pujan@example.com',
  phone: '+977 9812345678',
  address: 'Kathmandu, Nepal',
  role: 'member',
  is_active: true,
  created_at: '2024-11-15',
};

// Mock membership
export const mockMembership = {
  membership_id: 1,
  user_id: 1,
  duration_months: 6,
  start_date: '2024-11-15',
  expiry_date: '2025-05-15',
  status: 'active',
  card_number: 'SMLIB-2025-0157',
};

// Helper functions that mimic database queries
export const getBookById = (id) => {
  return mockBooks.find(book => book.book_id === parseInt(id));
};

export const getTrendingBooks = () => {
  const trending = mockTrendingBooks.sort((a, b) => a.rank - b.rank);
  return trending.map(t => ({
    ...getBookById(t.book_id),
    rank: t.rank,
    borrow_count: t.borrow_count
  }));
};

export const getNewArrivals = () => {
  return [...mockBooks].sort((a, b) => b.book_id - a.book_id).slice(0, 6);
};

export const getReviewsByBookId = (bookId) => {
  return mockReviews.filter(review => review.book_id === bookId);
};

export const getBookAverageRating = (bookId) => {
  const reviews = getReviewsByBookId(bookId);
  if (reviews.length === 0) return 0;
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  return sum / reviews.length;
};

export const searchBooks = (query) => {
  const lowerQuery = query.toLowerCase();
  return mockBooks.filter(book => 
    book.title.toLowerCase().includes(lowerQuery) ||
    book.author.toLowerCase().includes(lowerQuery) ||
    book.genre.toLowerCase().includes(lowerQuery) ||
    book.description.toLowerCase().includes(lowerQuery)
  );
};

export const getBooksByGenre = (genre) => {
  if (!genre) return mockBooks;
  return mockBooks.filter(book => book.genre === genre);
};

export const getUserBorrowings = (userId) => {
  return mockBorrowings.filter(b => b.user_id === userId);
};

export const getUserBorrowHistory = (userId) => {
  return mockBorrowHistory.filter(b => b.user_id === userId);
};

export const getUserWishlist = (userId) => {
  const wishlistItems = mockWishlist.filter(w => w.user_id === userId);
  return wishlistItems.map(w => getBookById(w.book_id));
};

export const getUserMembership = (userId) => {
  return mockMembership;
};