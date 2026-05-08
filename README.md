# LibMate - Smart Library Management System

A full-stack library management system with AI-powered recommendations, IoT smoke detection, real-time notifications, and membership management.

---

## Quick Start (Docker)

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### Setup

```bash
git clone https://github.com/your-username/libmate.git
cd libmate
docker-compose up -d
docker exec -it libmate_backend python import_books.py
```

### Access

| Service      | URL                       |
| ------------ | ------------------------- |
| Frontend     | http://localhost          |
| Backend API  | http://localhost:5000/api |
| Docker MySQL | localhost:3307            |

### Default Credentials

| Role  | Email             | Password |
| ----- | ----------------- | -------- |
| Admin | admin@libmate.com | admin123 |

---

## Development (Without Docker)

### Prerequisites

- Python 3.12+
- Node.js 24+
- MySQL 8.0+

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
source .venv/bin/activate     # Mac/Linux
pip install -r requirements.txt
python run.py
```

### Frontend

```bash
cd website_frontend
npm install
npm run dev
```

### Database

1. Create a MySQL database: `libmate_DB`
2. Run `database/init.sql`
3. Import books: `python import_books.py`
4. Generate trending:
   ```bash
   python -c "from app.services.recommendation_service import RecommendationService; RecommendationService.update_trending_books()"
   ```

---

## Docker Commands

### Start / Stop

```bash
docker-compose up -d                    # Start everything
docker-compose down                     # Stop all services
docker-compose down -v                  # Stop + delete volumes (fresh start)
docker-compose restart                  # Restart all
```

### Build (After Code Changes)

```bash
docker-compose up -d --build            # Rebuild everything
docker-compose up -d --build backend    # Rebuild only backend
docker-compose up -d --build frontend   # Rebuild only frontend
```

### Single Service

```bash
docker-compose restart backend          # Restart just backend
docker-compose restart frontend         # Restart just frontend
docker-compose restart db               # Restart just database
docker-compose stop backend             # Stop just backend
docker-compose start backend            # Start just backend
```

### Logs

```bash
docker-compose logs                     # All logs
docker-compose logs backend             # Backend only
docker-compose logs frontend            # Frontend only
docker-compose logs db                  # Database only
docker-compose logs -f backend          # Follow backend logs (real-time)
```

### Check Status

```bash
docker-compose ps                       # List all services
docker ps                               # List all containers
```

### Inside Containers

```bash
docker exec -it libmate_backend python import_books.py           # Import books
docker exec -it libmate_backend bash                             # Backend shell
docker exec -it libmate_db mysql -uroot -p<password> libmate_DB  # MySQL shell
```

### Database Queries

```bash
# Count books
docker exec -it libmate_db mysql -uroot -p<password> libmate_DB -e "SELECT COUNT(*) FROM books;"

# View users
docker exec -it libmate_db mysql -uroot -p<password> libmate_DB -e "SELECT user_id, full_name, email, role FROM users;"

# Delete a user
docker exec -it libmate_db mysql -uroot -p<password> libmate_DB -e "DELETE FROM users WHERE user_id=1;"

# Count trending
docker exec -it libmate_db mysql -uroot -p<password> libmate_DB -e "SELECT COUNT(*) FROM trending_books;"

# Check trending dates
docker exec -it libmate_db mysql -uroot -p<password> libmate_DB -e "SELECT DISTINCT period_start, period_end FROM trending_books;"
```

### Complete Fresh Start

```bash
docker-compose down -v
docker-compose up -d --build
docker exec -it libmate_backend python import_books.py
```

---

## Features

- Book catalogue with search, filters, and sorting
- AI-powered personalized recommendations (collaborative + content-based filtering)
- Trending books with multi-signal scoring (borrows, renewals, reviews, wishlists)
- Borrow, renew, and return workflow with fine calculation
- Reservation queue with 48-hour pickup window and waitlist
- Membership management with card generation and photo verification
- Real-time notifications via WebSocket (user + admin)
- Announcements system to broadcast messages
- IoT smoke detection alerts with real-time monitoring
- Fully responsive design (mobile, tablet, desktop)
- Dockerized with one-command deployment
- Beautiful warm-themed UI with Tailwind CSS

---

## 🛠 Tech Stack

| Layer     | Technology                             |
| --------- | -------------------------------------- |
| Frontend  | React 19, Vite 8, Tailwind CSS         |
| Backend   | Flask 3.0, SQLAlchemy, Flask-SocketIO  |
| Database  | MySQL 8.0 with triggers, views, events |
| AI/ML     | Scikit-learn, Pandas, NumPy, TF-IDF    |
| Real-time | Socket.IO with WebSocket               |
| Auth      | JWT (Flask-JWT-Extended), bcrypt       |
| Email     | Flask-Mail with Gmail SMTP             |
| Container | Docker, Docker Compose                 |
| Server    | Gunicorn, Nginx                        |

---

## Project Structure

```
libmate/
├── backend/
│   ├── app/
│   │   ├── api/              # Flask blueprints (auth, books, users, admin, etc.)
│   │   ├── services/         # Business logic, ML recommendations, notifications
│   │   ├── utils/            # Auth helpers and decorators
│   │   ├── static/qr/        # Membership QR code
│   │   ├── uploads/          # Covers, photos, receipts
│   │   ├── config.py         # App configuration
│   │   ├── extensions.py     # Database initialization
│   │   ├── models.py         # SQLAlchemy models
│   │   └── __init__.py       # App factory, scheduler, seeders
│   ├── books.csv             # Book import data
│   ├── import_books.py       # Book import script
│   ├── requirements.txt      # Python dependencies
│   ├── run.py                # Entry point
│   └── Dockerfile
├── website_frontend/
│   ├── src/
│   │   ├── assets/           # Logos, icons
│   │   ├── components/       # Layout, Navbar, HeroCarousel, etc.
│   │   ├── pages/            # All page components (user + admin)
│   │   ├── services/         # API client (api.js)
│   │   └── context/          # AuthContext, ToastContext
│   ├── index.html
│   ├── vite.config.js        # Vite config with proxy
│   ├── tailwind.config.js
│   ├── package.json
│   ├── Dockerfile
│   └── nginx.conf
├── database/
│   └── init.sql              # Full database schema
├── docker-compose.yml        # Docker orchestration
├── .env                      # Environment variables
└── README.md
```

---

## 🔧 Environment Variables

Create a `.env` file at the project root:

```env
DB_HOST=db                    # Docker: 'db' | Local: '127.0.0.1'
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=libmate_DB

MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password

JWT_SECRET_KEY=your-secret-key

CORS_ORIGINS=http://localhost,http://frontend,http://127.0.0.1
```

---

## License

This project is created for academic purposes as part of BSc (Hons) Artificial Intelligence at The British College.

---

## Team

- **Group 01** · The British College
- **BSc (Hons) Artificial Intelligence**
- © 2025 LibMate

---
