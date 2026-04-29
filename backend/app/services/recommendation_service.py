# app/services/recommendation_service.py
from sqlalchemy import text
from ..extensions import db
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import logging

logger = logging.getLogger(__name__)


class RecommendationService:
    
    @staticmethod
    def _get_books_dataframe():
        """Load all active books for ML processing"""
        result = db.session.execute(
            text("""
                SELECT book_id, title, author, genre, publisher, description,
                       total_borrow_count, available_copies
                FROM books WHERE is_archived = FALSE
            """)
        ).fetchall()
        
        if not result:
            return pd.DataFrame()
        
        df = pd.DataFrame(result, columns=[
            'book_id', 'title', 'author', 'genre', 'publisher', 'description',
            'total_borrow_count', 'available_copies'
        ])
        df['content'] = (df['title'].fillna('') + ' ' + df['author'].fillna('') + ' ' + df['genre'].fillna('')).str.lower()
        return df
    
    # ================================================================
    # PERSONALIZED RECOMMENDATIONS (Per User)
    # ================================================================
    
    @staticmethod
    def generate_recommendations_for_user(user_id, top_n=10):
        """
        AI-powered personal recommendations using:
        - Collaborative Filtering (users like you also borrowed...)
        - Content-Based Filtering (similar to books you've read)
        - Cold Start (popular diverse picks for new users)
        """
        try:
            borrowed = db.session.execute(
                text("SELECT book_id FROM borrow_history WHERE user_id = :uid"),
                {'uid': user_id}
            ).fetchall()
            borrowed_ids = [r[0] for r in borrowed]
            
            wishlist = db.session.execute(
                text("SELECT book_id FROM wishlist WHERE user_id = :uid"),
                {'uid': user_id}
            ).fetchall()
            wishlist_ids = [r[0] for r in wishlist]
            
            exclude = set(borrowed_ids + wishlist_ids)
            
            if not borrowed_ids:
                RecommendationService._cold_start(user_id, exclude, top_n)
                return
            
            # ===== Collaborative Filtering =====
            matrix_data = db.session.execute(
                text("SELECT user_id, book_id, COUNT(*) as count FROM borrow_history GROUP BY user_id, book_id")
            ).fetchall()
            
            cf_scores = {}
            if len(matrix_data) >= 2:
                matrix_df = pd.DataFrame(matrix_data, columns=['user_id', 'book_id', 'count'])
                user_book_matrix = matrix_df.pivot_table(index='user_id', columns='book_id', values='count', fill_value=0)
                
                if user_id in user_book_matrix.index:
                    similarities = cosine_similarity(user_book_matrix)
                    user_idx = list(user_book_matrix.index).index(user_id)
                    sim_users = np.argsort(similarities[user_idx])[::-1][1:6]
                    
                    for si in sim_users:
                        sim_score = similarities[user_idx][si]
                        if sim_score <= 0: continue
                        sim_books = user_book_matrix.iloc[si]
                        for bid, cnt in sim_books.items():
                            if cnt > 0 and bid not in exclude:
                                cf_scores[bid] = cf_scores.get(bid, 0) + sim_score * cnt
                    
                    if cf_scores:
                        mx = max(cf_scores.values())
                        cf_scores = {k: v/mx for k, v in cf_scores.items()}
            
            # ===== Content-Based Filtering (TF-IDF + Cosine) =====
            books_df = RecommendationService._get_books_dataframe()
            cb_scores = {}
            
            if not books_df.empty and len(borrowed_ids) > 0:
                tfidf = TfidfVectorizer(stop_words='english', ngram_range=(1, 2), max_features=5000)
                try:
                    tfidf_matrix = tfidf.fit_transform(books_df['content'])
                    
                    for bid in borrowed_ids[:5]:
                        matches = books_df[books_df['book_id'] == bid]
                        if matches.empty: continue
                        idx = matches.index[0]
                        sims = cosine_similarity(tfidf_matrix[idx], tfidf_matrix).flatten()
                        
                        for i, score in enumerate(sims):
                            if i != idx and score > 0.1:
                                sim_bid = int(books_df.iloc[i]['book_id'])
                                if sim_bid not in exclude:
                                    cb_scores[sim_bid] = max(cb_scores.get(sim_bid, 0), float(score))
                except:
                    pass
            
            # ===== Combine Scores =====
            all_ids = set(list(cf_scores.keys()) + list(cb_scores.keys()))
            final = {}
            for bid in all_ids:
                cf = cf_scores.get(bid, 0)
                cb = cb_scores.get(bid, 0)
                final[bid] = cf * 0.5 + cb * 0.5 if len(borrowed_ids) >= 3 else cf * 0.3 + cb * 0.7
            
            sorted_recs = sorted(final.items(), key=lambda x: x[1], reverse=True)[:top_n]
            
            # Fill remaining with popular if not enough
            if len(sorted_recs) < top_n:
                existing = set(bid for bid, _ in sorted_recs)
                exclude_str = ','.join(map(str, exclude)) if exclude else '0'
                popular = db.session.execute(
                    text(f"""
                        SELECT book_id, total_borrow_count FROM books
                        WHERE is_archived=FALSE AND book_id NOT IN ({exclude_str})
                        ORDER BY total_borrow_count DESC LIMIT :n
                    """),
                    {'n': top_n - len(sorted_recs)}
                ).fetchall()
                for bid, _ in popular:
                    if bid not in existing:
                        sorted_recs.append((bid, 0.5))
            
            # ===== Save =====
            db.session.execute(text("DELETE FROM recommendations WHERE user_id=:uid"), {'uid': user_id})
            for bid, score in sorted_recs[:top_n]:
                db.session.execute(
                    text("INSERT INTO recommendations (user_id, book_id, similarity_score) VALUES (:u,:b,:s)"),
                    {'u': user_id, 'b': bid, 's': round(score, 4)}
                )
            db.session.commit()
            logger.info(f"Generated {len(sorted_recs[:top_n])} recommendations for user {user_id}")
            
        except Exception as e:
            logger.error(f"Recommendation error for user {user_id}: {str(e)}")
            db.session.rollback()
    
    @staticmethod
    def _cold_start(user_id, exclude_ids, top_n=10):
        """Popular diverse books for new users with no history"""
        try:
            db.session.execute(text("DELETE FROM recommendations WHERE user_id=:uid"), {'uid': user_id})
            exclude_str = ','.join(map(str, exclude_ids)) if exclude_ids else '0'
            
            books = db.session.execute(
                text(f"""
                    SELECT b.book_id, b.total_borrow_count, COALESCE(AVG(r.rating),3.5) as avg_r, b.genre
                    FROM books b LEFT JOIN reviews r ON b.book_id=r.book_id
                    WHERE b.is_archived=FALSE AND b.available_copies>0 AND b.book_id NOT IN ({exclude_str})
                    GROUP BY b.book_id ORDER BY (b.total_borrow_count*0.6+COALESCE(AVG(r.rating),3.5)*10*0.4) DESC LIMIT 30
                """)
            ).fetchall()
            
            seen_genres = {}
            diverse = []
            for bid, cnt, rating, genre in books:
                g = genre or 'Unknown'
                if seen_genres.get(g, 0) < 2:
                    seen_genres[g] = seen_genres.get(g, 0) + 1
                    diverse.append((bid, round(0.85 - len(diverse)*0.04, 4)))
                if len(diverse) >= top_n: break
            
            for bid, score in diverse:
                db.session.execute(
                    text("INSERT INTO recommendations (user_id,book_id,similarity_score) VALUES (:u,:b,:s)"),
                    {'u': user_id, 'b': bid, 's': score}
                )
            db.session.commit()
            logger.info(f"Cold start: {len(diverse)} recommendations for user {user_id}")
        except Exception as e:
            logger.error(f"Cold start error: {str(e)}")
            db.session.rollback()
    
    # ================================================================
    # TRENDING BOOKS (Global - All Users)
    # ================================================================
    
    @staticmethod
    def update_trending_books():
        """
        Professional trending algorithm using multiple weighted signals:
        - Currently borrowed (5x)
        - Recently returned (4x / 2.5x / 1.5x by recency)
        - Renewals (2x per renewal)
        - Wishlist adds (2x)
        - Reservation queue (1.5x per person)
        - Recent reviews (1x)
        - Fills to 100 with highly-rated popular books
        """
        try:
            db.session.execute(text("DELETE FROM trending_books"))
            
            db.session.execute(
                text("""
                    INSERT INTO trending_books (book_id, period_start, period_end, borrow_count, trend_rank)
                    SELECT book_id, DATE_FORMAT(CURDATE(), '%Y-%m-01'), LAST_DAY(CURDATE()),
                           total_activity, ROW_NUMBER() OVER (ORDER BY trend_score DESC)
                    FROM (
                        SELECT b.book_id,
                               COALESCE(SUM(score), 0) as trend_score,
                               COUNT(*) as total_activity
                        FROM books b
                        LEFT JOIN (
                            SELECT book_id, 5.0 as score FROM borrowings WHERE status NOT IN ('returned', 'lost')
                            UNION ALL
                            SELECT book_id, 4.0 FROM borrow_history WHERE returned_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
                            UNION ALL
                            SELECT book_id, 2.5 FROM borrow_history WHERE returned_at > DATE_SUB(NOW(), INTERVAL 14 DAY) AND returned_at <= DATE_SUB(NOW(), INTERVAL 7 DAY)
                            UNION ALL
                            SELECT book_id, 1.5 FROM borrow_history WHERE returned_at > DATE_SUB(NOW(), INTERVAL 30 DAY) AND returned_at <= DATE_SUB(NOW(), INTERVAL 14 DAY)
                            UNION ALL
                            SELECT book_id, 2.0 * renewal_count FROM borrowings WHERE renewal_count > 0 AND status NOT IN ('returned', 'lost')
                            UNION ALL
                            SELECT w.book_id, 2.0 FROM wishlist w WHERE w.added_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
                            UNION ALL
                            SELECT r.book_id, 1.5 FROM reservations r WHERE r.status = 'pending'
                            UNION ALL
                            SELECT rv.book_id, 1.0 FROM reviews rv WHERE rv.created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
                        ) signals ON b.book_id = signals.book_id
                        WHERE b.is_archived = FALSE
                        GROUP BY b.book_id
                        HAVING trend_score > 0
                        ORDER BY trend_score DESC
                        LIMIT 100
                    ) ranked
                """)
            )
            
            # Fill remaining slots with popular high-rated books
            count = db.session.execute(text("SELECT COUNT(*) FROM trending_books")).first()[0]
            
            if count < 100:
                db.session.execute(
                    text(f"""
                        INSERT INTO trending_books (book_id, period_start, period_end, borrow_count, trend_rank)
                        SELECT b.book_id, DATE_FORMAT(CURDATE(), '%Y-%m-01'), LAST_DAY(CURDATE()), 0,
                               {count} + ROW_NUMBER() OVER (ORDER BY (b.total_borrow_count * 0.6 + COALESCE(AVG(r.rating), 3.5) * 10 * 0.4) DESC)
                        FROM books b
                        LEFT JOIN reviews r ON b.book_id = r.book_id
                        WHERE b.is_archived = FALSE AND b.available_copies > 0
                          AND b.book_id NOT IN (SELECT book_id FROM trending_books)
                        GROUP BY b.book_id
                        ORDER BY (b.total_borrow_count * 0.6 + COALESCE(AVG(r.rating), 3.5) * 10 * 0.4) DESC
                        LIMIT {100 - count}
                    """)
                )
            
            db.session.commit()
            final = db.session.execute(text("SELECT COUNT(*) FROM trending_books")).first()[0]
            logger.info(f"Trending updated: {final} books (multi-signal scoring)")
            
        except Exception as e:
            logger.error(f"Trending error: {str(e)}")
            db.session.rollback()