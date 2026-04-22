from sqlalchemy import text
from datetime import datetime, timedelta
from ..extensions import db
import logging

logger = logging.getLogger(__name__)


class NotificationService:
    
    @staticmethod
    def create_notification(user_id, notification_type, title, message):
        """Create a notification for a user"""
        try:
            # Insert notification
            result = db.session.execute(
                text("""
                    INSERT INTO notifications (type, title, message)
                    VALUES (:type, :title, :message)
                """),
                {'type': notification_type, 'title': title, 'message': message}
            )
            
            notification_id = result.lastrowid
            
            # Link to user
            db.session.execute(
                text("""
                    INSERT INTO user_notifications (user_id, notification_id)
                    VALUES (:user_id, :notification_id)
                """),
                {'user_id': user_id, 'notification_id': notification_id}
            )
            
            db.session.commit()
            logger.info(f"Created notification for user {user_id}: {title}")
            
        except Exception as e:
            logger.error(f"Error creating notification: {str(e)}")
            db.session.rollback()
    
    @staticmethod
    def send_due_date_reminders():
        """Send reminders for books due in 2 days"""
        try:
            due_soon = db.session.execute(
                text("""
                    SELECT b.borrow_id, b.user_id, u.email, u.full_name, bk.title, b.due_date
                    FROM borrowings b
                    JOIN users u ON b.user_id = u.user_id
                    JOIN books bk ON b.book_id = bk.book_id
                    WHERE b.status NOT IN ('returned', 'lost')
                      AND b.due_date = DATE_ADD(CURDATE(), INTERVAL 2 DAY)
                """)
            ).fetchall()
            
            for borrow in due_soon:
                NotificationService.create_notification(
                    user_id=borrow.user_id,
                    notification_type='due_date_reminder',
                    title='Book Due Soon',
                    message=f'Your borrowed book "{borrow.title}" is due on {borrow.due_date}. Please return it on time to avoid fines.'
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
                    SELECT b.borrow_id, b.user_id, u.email, u.full_name, bk.title, 
                           b.due_date, DATEDIFF(CURDATE(), b.due_date) as days_overdue
                    FROM borrowings b
                    JOIN users u ON b.user_id = u.user_id
                    JOIN books bk ON b.book_id = bk.book_id
                    WHERE b.status NOT IN ('returned', 'lost')
                      AND b.due_date < CURDATE()
                      AND b.fine_status != 'paid'
                """)
            ).fetchall()
            
            for borrow in overdue:
                fine_amount = borrow.days_overdue * 5.00
                NotificationService.create_notification(
                    user_id=borrow.user_id,
                    notification_type='overdue_notice',
                    title='Book Overdue',
                    message=f'Your borrowed book "{borrow.title}" is {borrow.days_overdue} days overdue. Current fine: ₹{fine_amount:.2f}. Please return it soon.'
                )
            
            logger.info(f"Sent {len(overdue)} overdue notices")
            
        except Exception as e:
            logger.error(f"Error sending overdue notices: {str(e)}")
    
    @staticmethod
    def send_membership_expiry_warnings():
        """Send warnings for memberships expiring in 7 days"""
        try:
            expiring = db.session.execute(
                text("""
                    SELECT m.user_id, u.full_name, u.email, m.expiry_date
                    FROM memberships m
                    JOIN users u ON m.user_id = u.user_id
                    WHERE m.status = 'active'
                      AND m.expiry_date = DATE_ADD(CURDATE(), INTERVAL 7 DAY)
                """)
            ).fetchall()
            
            for membership in expiring:
                NotificationService.create_notification(
                    user_id=membership.user_id,
                    notification_type='membership_expiry',
                    title='Membership Expiring Soon',
                    message=f'Your library membership will expire on {membership.expiry_date}. Please renew to continue borrowing books.'
                )
            
            logger.info(f"Sent {len(expiring)} membership expiry warnings")
            
        except Exception as e:
            logger.error(f"Error sending membership expiry warnings: {str(e)}")