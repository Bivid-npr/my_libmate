from sqlalchemy import text
from ..extensions import db
import logging

logger = logging.getLogger(__name__)


class RecommendationService:
    
    @staticmethod
    def generate_recommendations_for_user(user_id):
        """Generate AI-based book recommendations for a user"""
        try:
            # Get user's borrowing history
            history = db.session.execute(
                text("""
                    SELECT DISTINCT book_id, genre 
                    FROM borrow_history bh
                    JOIN books b ON bh.book_id = b.book_id
                    WHERE user_id = :user_id
                """),
                {'user_id': user_id}
            ).fetchall()
            
            if not history:
                return
            
            # Get user's preferred genres
            genre_counts = {}
            for row in history:
                genre = row[1]
                if genre:
                    genre_counts[genre] = genre_counts.get(genre, 0) + 1
            
            if not genre_counts:
                return
            
            # Find top genre
            top_genre = max(genre_counts, key=genre_counts.get)
            
            # Recommend books from top genre that user hasn't read
            recommendations = db.session.execute(
                text("""
                    SELECT b.book_id, 
                           (SELECT COUNT(*) FROM borrow_history bh2 
                            WHERE bh2.user_id = :user_id AND bh2.book_id = b.book_id) as already_read
                    FROM books b
                    WHERE b.genre = :genre 
                      AND b.is_archived = FALSE
                      AND b.book_id NOT IN (
                          SELECT book_id FROM borrow_history WHERE user_id = :user_id
                      )
                    ORDER BY b.total_borrow_count DESC
                    LIMIT 10
                """),
                {'user_id': user_id, 'genre': top_genre}
            ).fetchall()
            
            # Insert recommendations
            for rec in recommendations:
                if rec[1] == 0:  # Not already read
                    similarity = 0.8 - (rec[0] * 0.01)  # Simple scoring
                    
                    db.session.execute(
                        text("""
                            INSERT INTO recommendations (user_id, book_id, similarity_score)
                            VALUES (:user_id, :book_id, :similarity)
                            ON DUPLICATE KEY UPDATE similarity_score = :similarity, generated_at = NOW()
                        """),
                        {'user_id': user_id, 'book_id': rec[0], 'similarity': similarity}
                    )
            
            db.session.commit()
            logger.info(f"Generated recommendations for user {user_id}")
            
        except Exception as e:
            logger.error(f"Error generating recommendations for user {user_id}: {str(e)}")
            db.session.rollback()
    
    @staticmethod
    def update_trending_books():
        """Update trending books based on last 30 days of borrows"""
        try:
            # Clear old trending data
            db.session.execute(text("DELETE FROM trending_books"))
            
            # Insert new trending data
            db.session.execute(
                text("""
                    INSERT INTO trending_books (book_id, period_start, period_end, borrow_count, trend_rank)
                    SELECT 
                        book_id,
                        DATE_SUB(CURDATE(), INTERVAL 30 DAY) as period_start,
                        CURDATE() as period_end,
                        COUNT(*) as borrow_count,
                        ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC) as trend_rank
                    FROM borrow_history
                    WHERE returned_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
                    GROUP BY book_id
                    ORDER BY borrow_count DESC
                    LIMIT 100
                """)
            )
            db.session.commit()
            logger.info("Updated trending books")
            
        except Exception as e:
            logger.error(f"Error updating trending books: {str(e)}")
            db.session.rollback()