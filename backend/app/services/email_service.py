from flask import current_app
from flask_mail import Mail, Message
from sqlalchemy import text
from ..extensions import db
import logging

logger = logging.getLogger(__name__)
mail = Mail()


def init_mail(app):
    """Initialize mail with Flask app"""
    mail.init_app(app)


def send_email(to, subject, body):
    """Send a single email"""
    try:
        msg = Message(
            subject=subject,
            recipients=[to],
            body=body,
            html=body
        )
        mail.send(msg)
        logger.info(f"Email sent to {to}: {subject}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to}: {str(e)}")
        return False


def send_due_date_reminder_emails():
    """Send email reminders for books due in 2 days"""
    try:
        due_soon = db.session.execute(
            text("""
                SELECT b.user_id, u.email, u.full_name, bk.title, b.due_date,
                       DATEDIFF(b.due_date, CURDATE()) as days_left
                FROM borrowings b
                JOIN users u ON b.user_id = u.user_id
                JOIN books bk ON b.book_id = bk.book_id
                WHERE b.status IN ('borrowed', 'renewed')
                  AND DATEDIFF(b.due_date, CURDATE()) = 2
            """)
        ).fetchall()

        count = 0
        for row in due_soon:
            user_id, email, name, book_title, due_date, days_left = row
            
            subject = f"Book Due Soon: {book_title}"
            body = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #4A3728;">LibMate Library</h2>
                <p>Dear {name},</p>
                <p>This is a reminder that your borrowed book is due soon:</p>
                <div style="background: #F3EDE3; padding: 15px; border-radius: 8px; margin: 15px 0;">
                    <p><strong>Book:</strong> {book_title}</p>
                    <p><strong>Due Date:</strong> {due_date.strftime('%B %d, %Y')}</p>
                    <p><strong>Days Remaining:</strong> {days_left}</p>
                </div>
                <p>Please return the book to the library by the due date to avoid late fines of NPR 5.00 per day.</p>
                <p>If you need more time, you can request a renewal through your account.</p>
                <p style="color: #9A8478; font-size: 12px; margin-top: 30px;">
                    This is an automated message from LibMate Library Management System.
                </p>
            </div>
            """
            
            if send_email(email, subject, body):
                count += 1

        logger.info(f"Sent {count} due date reminder emails")
        return count
    except Exception as e:
        logger.error(f"Error sending due date reminders: {str(e)}")
        return 0


def send_overdue_notice_emails():
    """Send email notices for overdue books"""
    try:
        overdue = db.session.execute(
            text("""
                SELECT b.user_id, u.email, u.full_name, bk.title, b.due_date,
                       DATEDIFF(CURDATE(), b.due_date) as days_overdue,
                       DATEDIFF(CURDATE(), b.due_date) * 5.00 as fine
                FROM borrowings b
                JOIN users u ON b.user_id = u.user_id
                JOIN books bk ON b.book_id = bk.book_id
                WHERE b.status = 'overdue'
                  AND DATEDIFF(CURDATE(), b.due_date) = 1
            """)
        ).fetchall()

        count = 0
        for row in overdue:
            user_id, email, name, book_title, due_date, days_overdue, fine = row
            
            subject = f"Overdue Book Notice: {book_title}"
            body = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #B85450;">LibMate Library - Overdue Notice</h2>
                <p>Dear {name},</p>
                <p>Your borrowed book is now <strong>overdue</strong>:</p>
                <div style="background: #FFF3F3; border: 1px solid #FFD7D7; padding: 15px; border-radius: 8px; margin: 15px 0;">
                    <p><strong>Book:</strong> {book_title}</p>
                    <p><strong>Due Date:</strong> {due_date.strftime('%B %d, %Y')}</p>
                    <p><strong>Days Overdue:</strong> {days_overdue}</p>
                    <p><strong>Current Fine:</strong> NPR {fine:.2f}</p>
                </div>
                <p>Please return the book as soon as possible. Fines accrue at NPR 5.00 per day.</p>
                <p style="color: #9A8478; font-size: 12px; margin-top: 30px;">
                    This is an automated message from LibMate Library Management System.
                </p>
            </div>
            """
            
            if send_email(email, subject, body):
                count += 1

        logger.info(f"Sent {count} overdue notice emails")
        return count
    except Exception as e:
        logger.error(f"Error sending overdue notices: {str(e)}")
        return 0