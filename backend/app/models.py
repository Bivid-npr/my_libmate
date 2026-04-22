from sqlalchemy import text
from .extensions import db

class Admin(db.Model):
    __tablename__ = 'admins'
    
    admin_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    full_name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    phone = db.Column(db.String(20))
    password_hash = db.Column(db.String(255), nullable=False)
    profile_picture = db.Column(db.String(255))
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.TIMESTAMP, server_default=text('CURRENT_TIMESTAMP'))
    updated_at = db.Column(db.TIMESTAMP, server_default=text('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'))
    
    def to_dict(self):
        return {
            'admin_id': self.admin_id,
            'full_name': self.full_name,
            'email': self.email,
            'phone': self.phone,
            'profile_picture': self.profile_picture,
            'is_active': self.is_active,
        }


class User(db.Model):
    __tablename__ = 'users'
    
    user_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    full_name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    phone = db.Column(db.String(20))
    password_hash = db.Column(db.String(255), nullable=False)
    profile_picture = db.Column(db.String(255))
    address = db.Column(db.Text)
    role = db.Column(db.Enum('guest', 'member'), default='guest')
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.TIMESTAMP, server_default=text('CURRENT_TIMESTAMP'))
    updated_at = db.Column(db.TIMESTAMP, server_default=text('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'))
    
    def to_dict(self):
        return {
            'user_id': self.user_id,
            'full_name': self.full_name,
            'email': self.email,
            'phone': self.phone,
            'profile_picture': self.profile_picture,
            'address': self.address,
            'role': self.role,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class Membership(db.Model):
    __tablename__ = 'memberships'
    
    membership_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False)
    duration_months = db.Column(db.Integer, nullable=False)
    requested_at = db.Column(db.TIMESTAMP, server_default=text('CURRENT_TIMESTAMP'))
    approved_at = db.Column(db.TIMESTAMP)
    start_date = db.Column(db.Date)
    expiry_date = db.Column(db.Date)
    processed_by = db.Column(db.Integer, db.ForeignKey('admins.admin_id', ondelete='SET NULL'))
    status = db.Column(db.Enum('pending', 'active', 'expired', 'cancelled', 'rejected'), default='pending')
    payment_receipt = db.Column(db.String(255))
    payment_status = db.Column(db.Enum('unpaid', 'paid'), default='unpaid')
    paid_at = db.Column(db.TIMESTAMP)
    card_number = db.Column(db.String(50), unique=True)
    card_issued_at = db.Column(db.TIMESTAMP)
    updated_at = db.Column(db.TIMESTAMP, server_default=text('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'))


class Book(db.Model):
    __tablename__ = 'books'
    
    book_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    title = db.Column(db.String(255), nullable=False)
    author = db.Column(db.String(150), nullable=False)
    isbn = db.Column(db.String(20), unique=True)
    genre = db.Column(db.String(100))
    publisher = db.Column(db.String(150))
    published_year = db.Column(db.Integer)
    language = db.Column(db.String(50), default='English')
    total_copies = db.Column(db.Integer, default=1)
    available_copies = db.Column(db.Integer, default=1)
    cover_image = db.Column(db.String(255))
    description = db.Column(db.Text)
    status = db.Column(db.Enum('available', 'unavailable'), default='available')
    is_archived = db.Column(db.Boolean, default=False)
    total_borrow_count = db.Column(db.Integer, default=0)
    added_by = db.Column(db.Integer, db.ForeignKey('admins.admin_id', ondelete='SET NULL'))
    created_at = db.Column(db.TIMESTAMP, server_default=text('CURRENT_TIMESTAMP'))
    updated_at = db.Column(db.TIMESTAMP, server_default=text('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'))
    
    def to_dict(self):
        return {
            'book_id': self.book_id,
            'title': self.title,
            'author': self.author,
            'isbn': self.isbn,
            'genre': self.genre,
            'publisher': self.publisher,
            'published_year': self.published_year,
            'language': self.language,
            'total_copies': self.total_copies,
            'available_copies': self.available_copies,
            'cover_image': self.cover_image,
            'description': self.description,
            'status': self.status,
            'total_borrow_count': self.total_borrow_count,
        }


class Borrowing(db.Model):
    __tablename__ = 'borrowings'
    
    borrow_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False)
    book_id = db.Column(db.Integer, db.ForeignKey('books.book_id', ondelete='CASCADE'), nullable=False)
    issued_by = db.Column(db.Integer, db.ForeignKey('admins.admin_id', ondelete='SET NULL'))
    issued_at = db.Column(db.TIMESTAMP, server_default=text('CURRENT_TIMESTAMP'))
    due_date = db.Column(db.Date, nullable=False)
    returned_at = db.Column(db.TIMESTAMP)
    renewal_count = db.Column(db.Integer, default=0)
    renewal_requested = db.Column(db.Boolean, default=False)
    renewal_status = db.Column(db.Enum('none', 'pending', 'approved', 'rejected'), default='none')
    status = db.Column(db.Enum('borrowed', 'overdue', 'renewed', 'returned', 'lost'), default='borrowed')
    fine_status = db.Column(db.Enum('none', 'unpaid', 'paid', 'waived'), default='none')
    fine_paid_at = db.Column(db.TIMESTAMP)
    updated_at = db.Column(db.TIMESTAMP, server_default=text('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'))


class Review(db.Model):
    __tablename__ = 'reviews'
    
    review_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False)
    book_id = db.Column(db.Integer, db.ForeignKey('books.book_id', ondelete='RESTRICT'), nullable=False)
    rating = db.Column(db.Integer, nullable=False)
    review_text = db.Column(db.Text)
    created_at = db.Column(db.TIMESTAMP, server_default=text('CURRENT_TIMESTAMP'))
    updated_at = db.Column(db.TIMESTAMP, server_default=text('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'))


class Wishlist(db.Model):
    __tablename__ = 'wishlist'
    
    wishlist_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False)
    book_id = db.Column(db.Integer, db.ForeignKey('books.book_id', ondelete='RESTRICT'), nullable=False)
    added_at = db.Column(db.TIMESTAMP, server_default=text('CURRENT_TIMESTAMP'))


class Reservation(db.Model):
    __tablename__ = 'reservations'
    
    reservation_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False)
    book_id = db.Column(db.Integer, db.ForeignKey('books.book_id', ondelete='CASCADE'), nullable=False)
    reserved_at = db.Column(db.TIMESTAMP, server_default=text('CURRENT_TIMESTAMP'))
    expires_at = db.Column(db.TIMESTAMP, nullable=False)
    status = db.Column(db.Enum('pending', 'fulfilled', 'cancelled', 'expired'), default='pending')