"""Run trending update manually for testing"""
from dotenv import load_dotenv
import os
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

from app import create_app
from app.extensions import db
from app.services.recommendation_service import RecommendationService
from sqlalchemy import text

app = create_app()

with app.app_context():
    print("Updating trending books...")
    RecommendationService.update_trending_books()
    count = db.session.execute(text("SELECT COUNT(*) FROM trending_books")).first()[0]
    print(f"Done! {count} books in trending.")