# backend/app/services/notification_service.py
"""
Centralized notification service for LibMate.
All notifications flow through this service to ensure consistency.
Handles both user and admin notifications with real-time WebSocket support.
"""
from sqlalchemy import text
from datetime import datetime
from ..extensions import db
from ..api.socket_events import notify_admins_socket, notify_user_socket
import logging

logger = logging.getLogger(__name__)


class NotificationService:
    
    # ============================================================
    # HELPERS
    # ============================================================
    
    @staticmethod
    def _get_user_name(user_id):
        """Get user's full name"""
        result = db.session.execute(
            text("SELECT full_name FROM users WHERE user_id = :uid"),
            {'uid': user_id}
        ).first()
        return result[0] if result else 'Unknown User'
    
    @staticmethod
    def _get_book_title(book_id):
        """Get book's title"""
        result = db.session.execute(
            text("SELECT title FROM books WHERE book_id = :bid"),
            {'bid': book_id}
        ).first()
        return result[0] if result else 'Unknown Book'
    
    @staticmethod
    def _insert_notification(notification_type, title, message):
        """Insert into notifications table and return ID"""
        try:
            db.session.execute(
                text("INSERT INTO notifications (type, title, message) VALUES (:type, :title, :message)"),
                {'type': notification_type, 'title': title, 'message': message}
            )
            result = db.session.execute(text("SELECT LAST_INSERT_ID()")).first()
            return result[0] if result else None
        except Exception as e:
            logger.error(f"Error inserting notification: {str(e)}")
            db.session.rollback()
            return None
    
    @staticmethod
    def _assign_to_user(notification_id, user_id):
        """Assign notification to a specific user"""
        if notification_id and user_id:
            try:
                db.session.execute(
                    text("INSERT INTO user_notifications (user_id, notification_id) VALUES (:uid, :nid)"),
                    {'uid': user_id, 'nid': notification_id}
                )
                db.session.commit()
            except Exception as e:
                logger.error(f"Error assigning notification to user {user_id}: {str(e)}")
                db.session.rollback()
    
    @staticmethod
    def _assign_to_all_admins(notification_id):
        """Assign notification to all active admins"""
        if notification_id:
            try:
                db.session.execute(
                    text("""
                        INSERT INTO admin_notifications (admin_id, notification_id) 
                        SELECT admin_id, :nid FROM admins WHERE is_active = TRUE
                    """),
                    {'nid': notification_id}
                )
                db.session.commit()
            except Exception as e:
                logger.error(f"Error assigning notification to admins: {str(e)}")
                db.session.rollback()
    
    @staticmethod
    def _create_user_notification(user_id, notification_type, title, message):
        """Create and assign a notification for a specific user"""
        nid = NotificationService._insert_notification(notification_type, title, message)
        if nid:
            NotificationService._assign_to_user(nid, user_id)
            # Send real-time WebSocket notification
            notify_user_socket(user_id, {
                'notification_id': nid,
                'type': notification_type,
                'title': title,
                'message': message,
                'is_read': False
            })
            logger.info(f"User notification created for user {user_id}: {title}")
        return nid
    
    @staticmethod
    def _create_admin_notification(notification_type, title, message):
        """Create and assign a notification for all admins"""
        nid = NotificationService._insert_notification(notification_type, title, message)
        if nid:
            NotificationService._assign_to_all_admins(nid)
            # Send real-time WebSocket notification
            notify_admins_socket({
                'notification_id': nid,
                'type': notification_type,
                'title': title,
                'message': message,
                'is_read': False
            })
            logger.info(f"Admin notification created: {title}")
        return nid
    
    # ============================================================
    # ADMIN NOTIFICATIONS (new things admins need to act on)
    # ============================================================
    
    @staticmethod
    def notify_admins_new_pickup(user_id, book_title):
        """When a user reserves a book for pickup"""
        user_name = NotificationService._get_user_name(user_id)
        title = "New Pickup Reservation"
        message = f"{user_name} has reserved '{book_title}' for pickup. They have 48 hours to collect it."
        return NotificationService._create_admin_notification('book_request', title, message)
    
    @staticmethod
    def notify_admins_renewal_request(user_id, book_title):
        """When a user requests a renewal"""
        user_name = NotificationService._get_user_name(user_id)
        title = "Renewal Request"
        message = f"{user_name} has requested to renew '{book_title}'."
        return NotificationService._create_admin_notification('renewal_request', title, message)
    
    @staticmethod
    def notify_admins_new_membership(user_id, duration_months):
        """When a user applies for membership"""
        user_name = NotificationService._get_user_name(user_id)
        title = "New Membership Application"
        message = f"{user_name} has applied for a {duration_months}-month membership. Requires admin review."
        return NotificationService._create_admin_notification('new_membership', title, message)
    
    @staticmethod
    def notify_admins_book_request(user_id, book_title):
        """When a user requests a book purchase"""
        user_name = NotificationService._get_user_name(user_id)
        title = "Book Purchase Request"
        message = f"{user_name} has requested the library purchase '{book_title}'."
        return NotificationService._create_admin_notification('book_request', title, message)
    
    # ============================================================
    # USER NOTIFICATIONS (notifying users about their account/books)
    # ============================================================
    
    @staticmethod
    def notify_user_membership_approved(user_id, card_number, expiry_date):
        """When admin approves their membership"""
        title = "Membership Approved"
        message = f"Your membership has been approved. Card number: {card_number}. Valid until {expiry_date}."
        return NotificationService._create_user_notification(user_id, 'membership_approved', title, message)
    
    @staticmethod
    def notify_user_membership_rejected(user_id):
        """When admin rejects their membership"""
        title = "Membership Application Update"
        message = "Your membership application was not approved. Please visit the library for more information."
        return NotificationService._create_user_notification(user_id, 'membership_rejected', title, message)
    
    @staticmethod
    def notify_user_renewal_approved(user_id, book_title, new_due_date):
        """When admin approves their renewal"""
        title = "Renewal Approved"
        message = f"Your renewal for '{book_title}' has been approved. New due date: {new_due_date}."
        return NotificationService._create_user_notification(user_id, 'renewal_approved', title, message)
    
    @staticmethod
    def notify_user_renewal_rejected(user_id, book_title):
        """When admin rejects their renewal"""
        title = "Renewal Rejected"
        message = f"Your renewal request for '{book_title}' was rejected. Please return the book by the due date."
        return NotificationService._create_user_notification(user_id, 'renewal_rejected', title, message)
    
    @staticmethod
    def notify_user_book_available(user_id, book_title):
        """When a reserved book becomes available for pickup"""
        title = "Book Available for Pickup"
        message = f"'{book_title}' is now available. Visit the library within 48 hours to collect it."
        return NotificationService._create_user_notification(user_id, 'book_available', title, message)
    
    @staticmethod
    def notify_user_book_request_approved(user_id, book_title):
        """When admin approves book purchase request"""
        title = "Book Request Approved"
        message = f"Your request for '{book_title}' has been approved. The library will add this book soon."
        return NotificationService._create_user_notification(user_id, 'book_request', title, message)
    
    @staticmethod
    def notify_user_book_request_rejected(user_id, book_title):
        """When admin rejects book purchase request"""
        title = "Book Request Update"
        message = f"Your request for '{book_title}' could not be fulfilled at this time."
        return NotificationService._create_user_notification(user_id, 'book_request', title, message)
    
    @staticmethod
    def notify_user_due_date_reminder(user_id, book_title, due_date, days_left):
        """3 days before book is due"""
        title = "Due Date Reminder"
        message = f"'{book_title}' is due in {days_left} day(s) on {due_date}. Please return or renew it."
        return NotificationService._create_user_notification(user_id, 'due_date_reminder', title, message)
    
    @staticmethod
    def notify_user_overdue(user_id, book_title, days_overdue, fine_amount):
        """When a book becomes overdue"""
        title = "Overdue Book Notice"
        message = f"'{book_title}' is {days_overdue} day(s) overdue. Current fine: NPR {fine_amount:.2f}. Please return immediately."
        return NotificationService._create_user_notification(user_id, 'overdue_notice', title, message)
    
    @staticmethod
    def notify_user_fine_generated(user_id, book_title, fine_amount):
        """When a fine is generated on return"""
        title = "Fine Generated"
        message = f"A fine of NPR {fine_amount:.2f} has been added for '{book_title}'. Please pay at the library."
        return NotificationService._create_user_notification(user_id, 'fine_generated', title, message)
    
    @staticmethod
    def notify_user_membership_expiring(user_id, expiry_date, days_left):
        """When membership is about to expire"""
        title = "Membership Expiring Soon"
        message = f"Your membership expires on {expiry_date} ({days_left} days remaining). Renew to continue borrowing."
        return NotificationService._create_user_notification(user_id, 'membership_expiry', title, message)
    
    # ============================================================
    # SCHEDULED TASKS (called by scheduler)
    # ============================================================
    
    @staticmethod
    def send_due_date_reminders():
        """Send reminders for books due in 2 days"""
        try:
            due_soon = db.session.execute(
                text("""
                    SELECT b.user_id, bk.title, b.due_date,
                           DATEDIFF(b.due_date, CURDATE()) as days_left
                    FROM borrowings b
                    JOIN books bk ON b.book_id = bk.book_id
                    WHERE b.status IN ('borrowed', 'renewed')
                      AND DATEDIFF(b.due_date, CURDATE()) = 2
                """)
            ).fetchall()
            
            for row in due_soon:
                NotificationService.notify_user_due_date_reminder(
                    row[0], row[1], str(row[2]), row[3]
                )
            
            logger.info(f"Sent {len(due_soon)} due date reminders")
            
        except Exception as e:
            logger.error(f"Error sending due date reminders: {str(e)}")
    
    @staticmethod
    def send_overdue_notices():
        """Send notices for overdue books"""
        try:
            overdue = db.session.execute(
                text("""
                    SELECT b.user_id, bk.title,
                           DATEDIFF(CURDATE(), b.due_date) as days_overdue,
                           DATEDIFF(CURDATE(), b.due_date) * 5.00 as fine
                    FROM borrowings b
                    JOIN books bk ON b.book_id = bk.book_id
                    WHERE b.status = 'overdue'
                      AND b.fine_status != 'paid'
                      AND DATEDIFF(CURDATE(), b.due_date) > 0
                """)
            ).fetchall()
            
            for row in overdue:
                NotificationService.notify_user_overdue(row[0], row[1], row[2], row[3])
            
            logger.info(f"Sent {len(overdue)} overdue notices")
            
        except Exception as e:
            logger.error(f"Error sending overdue notices: {str(e)}")
    
    @staticmethod
    def send_membership_expiry_warnings():
        """Send warnings for memberships expiring in 7 days"""
        try:
            expiring = db.session.execute(
                text("""
                    SELECT m.user_id, m.expiry_date,
                           DATEDIFF(m.expiry_date, CURDATE()) as days_left
                    FROM memberships m
                    WHERE m.status = 'active'
                      AND DATEDIFF(m.expiry_date, CURDATE()) = 7
                """)
            ).fetchall()
            
            for row in expiring:
                NotificationService.notify_user_membership_expiring(
                    row[0], str(row[1]), row[2]
                )
            
            logger.info(f"Sent {len(expiring)} membership expiry warnings")
            
        except Exception as e:
            logger.error(f"Error sending membership expiry warnings: {str(e)}")