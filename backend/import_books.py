"""Import books with real covers and descriptions from Open Library API"""
import pandas as pd
import os, sys, random, re, urllib.request, json, time
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))
sys.path.insert(0, os.path.dirname(__file__))
from app import create_app
from app.extensions import db
from sqlalchemy import text

CSV_PATH = "books.csv"
GENRES = [
    'Fiction', 'Fantasy', 'Science Fiction', 'Mystery', 'Romance',
    'Thriller', 'Horror', 'Biography', 'History', 'Self-Help',
    'Memoir', 'Literary Fiction', 'Contemporary Fiction'
]

app = create_app()
COVERS_DIR = os.path.join(os.path.dirname(__file__), 'app', 'uploads', 'covers')
os.makedirs(COVERS_DIR, exist_ok=True)


def get_book_info(isbn):
    """Get cover URL and description from Open Library API"""
    if not isbn:
        return None, None
    
    cover_url = None
    description = None
    
    try:
        # Try Open Library Books API
        url = f"https://openlibrary.org/isbn/{isbn}.json"
        req = urllib.request.Request(url, headers={'User-Agent': 'LibMate/1.0'})
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read())
            
            # Get description
            if 'description' in data:
                desc = data['description']
                if isinstance(desc, dict):
                    description = desc.get('value', '')
                else:
                    description = str(desc)
            
            # Get cover ID
            if 'covers' in data and data['covers']:
                cover_id = data['covers'][0]
                cover_url = f"https://covers.openlibrary.org/b/id/{cover_id}-M.jpg"
                
            # Also try to get work description
            if not description and 'works' in data and data['works']:
                work_key = data['works'][0]['key']
                work_url = f"https://openlibrary.org{work_key}.json"
                req2 = urllib.request.Request(work_url, headers={'User-Agent': 'LibMate/1.0'})
                with urllib.request.urlopen(req2, timeout=5) as resp2:
                    work_data = json.loads(resp2.read())
                    if 'description' in work_data:
                        desc = work_data['description']
                        if isinstance(desc, dict):
                            description = desc.get('value', '')
                        else:
                            description = str(desc)
    
    except Exception as e:
        pass
    
    # Clean description
    if description:
        # Remove source citations like "--Wikipedia" or "(source:...)"
        description = re.sub(r'\s*[—\-]+\s*\w+.*$', '', description)
        description = re.sub(r'\s*\(source:.*?\)', '', description)
        description = description.strip()
        # Limit length
        if len(description) > 1000:
            description = description[:997] + '...'
    
    return cover_url, description


def download_cover(cover_url, book_id):
    """Download cover image"""
    if not cover_url:
        return None
    
    try:
        filename = f"cover_{book_id}.jpg"
        path = os.path.join(COVERS_DIR, filename)
        
        req = urllib.request.Request(cover_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=10) as response:
            data = response.read()
            if len(data) > 2000:
                with open(path, 'wb') as f:
                    f.write(data)
                return filename
    except:
        pass
    return None


print("Loading CSV...")
df = pd.read_csv(CSV_PATH, on_bad_lines='skip')
df.columns = df.columns.str.strip()
df = df.drop_duplicates(subset=['title'])
df = df[df['ratings_count'] > 100]
df = df.head(500)

print(f"Importing {len(df)} books with covers and descriptions...")

with app.app_context():
    admin = db.session.execute(text("SELECT admin_id FROM admins LIMIT 1")).first()
    admin_id = admin[0]
    count = 0
    covers = 0
    descs = 0
    skipped = 0

    for _, row in df.iterrows():
        title = str(row['title'])[:255]
        author = str(row['authors'])[:150].replace('/', ', ')
        isbn = str(row.get('isbn13', row.get('isbn', '')))[:20]
        if isbn == 'nan' or isbn == '': 
            isbn = None
        
        publisher = str(row.get('publisher', ''))[:150]
        if publisher == 'nan': 
            publisher = None

        year = None
        try:
            pub = str(row.get('publication_date', ''))
            if pub and pub != 'nan':
                match = re.search(r'\d{4}', pub)
                if match: year = int(match.group())
        except: pass

        copies = min(10, max(1, int(row.get('ratings_count', 1000) / 5000)))
        genre = random.choice(GENRES)

        if not title or title == 'nan' or not author or author == 'nan':
            skipped += 1
            continue

        if isbn:
            exists = db.session.execute(text("SELECT 1 FROM books WHERE isbn=:i"), {'i': isbn}).first()
            if exists:
                skipped += 1
                continue

        # Get real description and cover from Open Library
        cover_url, description = get_book_info(isbn)
        
        if not description:
            description = "A captivating book that has touched readers worldwide."
        else:
            descs += 1
        
        # Insert book
        db.session.execute(
            text("""
                INSERT INTO books (title,author,isbn,genre,publisher,published_year,language,total_copies,available_copies,description,status,added_by)
                VALUES (:t,:a,:i,:g,:p,:y,:l,:c,:c,:d,'available',:aid)
            """),
            {'t':title,'a':author,'i':isbn,'g':genre,'p':publisher,'y':year,'l':'English','c':copies,'d':description,'aid':admin_id}
        )
        
        book_id = db.session.execute(text("SELECT LAST_INSERT_ID()")).first()[0]
        
        # Download cover
        if cover_url:
            cover_file = download_cover(cover_url, book_id)
            if cover_file:
                db.session.execute(text("UPDATE books SET cover_image=:c WHERE book_id=:bid"), {'c':cover_file,'bid':book_id})
                covers += 1
        
        count += 1
        if count % 10 == 0:
            db.session.commit()
            print(f"  {count}/500 | {covers} covers | {descs} descriptions")
        
        time.sleep(0.1)  # Be polite to API

    db.session.commit()
    print(f"\nDone! {count} books | {covers} covers | {descs} real descriptions | {skipped} skipped")