# Libmate Complete Project Structure Guide

## Overview

Libmate is split into two main applications:

- `backend/`: Flask REST API + business logic + database models + tests
- `website_frontend/`: React (Vite) web app + routing + UI components + API client

At runtime, the frontend calls the backend API over HTTP (mostly under `/api/*`), and the backend talks to a MySQL database.

---

## System Architecture (How Backend + Frontend Work Together)

1. User interacts with React pages in `website_frontend/`.
2. Frontend sends requests through `src/services/api.js`.
3. Backend receives requests in Flask blueprints under `backend/app/api/`.
4. Backend validates auth (JWT) for protected routes.
5. Backend reads/writes data via SQLAlchemy models in `backend/app/models.py`.
6. Backend returns JSON responses.
7. Frontend updates UI state (pages, cards, profile, lists, etc.).

### Authentication flow

1. User logs in or registers from frontend.
2. Backend returns JWT token + user data.
3. Frontend stores token (local storage) and uses it in future requests.
4. Protected backend endpoints use JWT decorators and role checks.

---

## Backend: Complete Structure and Purpose

## `backend/`

### Root files

- `backend/app.py`
  - Legacy/older app entry (kept for compatibility or transition); factory pattern is primarily used via `run.py` + `app/__init__.py`.
- `backend/run.py`
  - Main backend start file. Creates Flask app and runs server.
- `backend/requirements.txt`
  - Python dependency list (Flask, SQLAlchemy, JWT, CORS, testing libs, etc.).
- `backend/pytest.ini`
  - Pytest configuration: test discovery and test run behavior.
- `backend/README.md`
  - Backend-specific setup/usage documentation.

### `backend/app/`

Core backend package.

- `backend/app/__init__.py`
  - App factory (`create_app`) that initializes:
  - Flask config
  - extensions (DB/JWT/CORS)
  - API blueprint registration
- `backend/app/config.py`
  - Central configuration (environment vars, DB settings, JWT settings, CORS, app constants like fine rate/limits).
- `backend/app/extensions.py`
  - Extension objects shared across app modules (e.g., SQLAlchemy DB instance).
- `backend/app/models.py`
  - SQLAlchemy models representing core entities (users, books, borrowings, memberships, reviews, wishlist, admins).

### `backend/app/api/`

REST API route modules (Flask blueprints).

- `backend/app/api/__init__.py`
  - Blueprint aggregation/import helper.
- `backend/app/api/auth.py`
  - Authentication routes:
  - login, register, current user (`me`), password changes.
- `backend/app/api/books.py`
  - Book catalog routes:
  - list/filter/search books
  - get book details
  - get genres
  - submit reviews
- `backend/app/api/borrowings.py`
  - Borrowing lifecycle routes:
  - current borrowings
  - borrowing history
  - renew borrowing
- `backend/app/api/users.py`
  - User profile routes:
  - get/update profile
  - get user borrowings/history/wishlist
- `backend/app/api/trending.py`
  - Trending books routes:
  - top trending list
  - full/paginated trending data
- `backend/app/api/new_arrivals.py`
  - New-arrival routes:
  - recent books list
  - latest subset
  - counts
- `backend/app/api/recommendations.py`
  - Recommendation routes:
  - personalized recommendations
  - refresh/recompute endpoints
- `backend/app/api/membership.py`
  - Membership routes:
  - apply membership
  - membership status
  - receipt upload workflow
- `backend/app/api/admin.py`
  - Admin-only routes:
  - dashboard stats
  - management actions like adding books

### `backend/app/services/`

Business/domain services (logic separated from route handlers).

- `backend/app/services/__init__.py`
  - Service package init.
- `backend/app/services/notification_service.py`
  - Notification-related business logic (e.g., due/overdue/member-related notifications).
- `backend/app/services/recommendation_service.py`
  - Recommendation business logic layer.

### `backend/app/utils/`

Utility helpers and shared decorators.

- `backend/app/utils/__init__.py`
  - Utility package init.
- `backend/app/utils/decorators.py`
  - Custom decorators (e.g., role checks such as admin/member guards).

### `backend/migrations/`

- Reserved for DB migration files/versioning.

### `backend/tests/`

Backend automated tests.

- `backend/tests/__init__.py`
  - Test package init.
- `backend/tests/conftest.py`
  - Shared pytest fixtures and test setup utilities.
- `backend/tests/run_tests.py`
  - Script/helper to run test suite.
- `backend/tests/test_auth.py`
  - Auth endpoint/logic tests.
- `backend/tests/test_books.py`
  - Book endpoint/logic tests.
- `backend/tests/test_borrowings.py`
  - Borrowing endpoint/logic tests.
- `backend/tests/test_database_connection.py`
  - DB connectivity checks.
- `backend/tests/test_db.py`
  - DB/model behavior tests.
- `backend/tests/test_simple.py`
  - Basic sanity tests.
- `backend/tests/test_trending.py`
  - Trending route/logic tests.
- `backend/tests/test_users.py`
  - User profile endpoint/logic tests.

---

## Frontend: Complete Structure and Purpose

## `website_frontend/`

### Root files

- `website_frontend/package.json`
  - Frontend dependencies + npm scripts (`dev`, `build`, `lint`, `preview`).
- `website_frontend/vite.config.js`
  - Vite bundler/dev server config.
- `website_frontend/tailwind.config.js`
  - Tailwind theme + content scanning config.
- `website_frontend/postcss.config.js`
  - PostCSS pipeline config (Tailwind/autoprefixer).
- `website_frontend/eslint.config.js`
  - ESLint linting rules.
- `website_frontend/index.html`
  - HTML entry shell where React mounts.
- `website_frontend/README.md`
  - Frontend setup and development docs.

### `website_frontend/public/`

- Static assets served directly by Vite (public files not processed by bundler).

### `website_frontend/src/`

Main frontend source code.

- `website_frontend/src/main.jsx`
  - React bootstrap (mount app to DOM).
- `website_frontend/src/App.jsx`
  - Main route tree + layout composition + provider wrapping.
- `website_frontend/src/App.css`
  - App-level styles.
- `website_frontend/src/index.css`
  - Global CSS + Tailwind base/components/utilities imports.

### `website_frontend/src/assets/`

- Local images/icons/brand assets used by components/pages.

### `website_frontend/src/components/`

Reusable UI building blocks.

#### `website_frontend/src/components/Books/`

- `website_frontend/src/components/Books/BookCard.jsx`
  - Reusable card for displaying each book (cover/info/status/actions).

#### `website_frontend/src/components/Home/`

- `website_frontend/src/components/Home/HeroCarousel.jsx`
  - Homepage hero slider/carousel for featured content.

#### `website_frontend/src/components/Layout/`

- `website_frontend/src/components/Layout/Layout.jsx`
  - General/public page wrapper.
- `website_frontend/src/components/Layout/MemberLayout.jsx`
  - Logged-in member page wrapper.
- `website_frontend/src/components/Layout/AdminLayout.jsx`
  - Admin page wrapper.
- `website_frontend/src/components/Layout/AuthLayout.jsx`
  - Login/register page wrapper.
- `website_frontend/src/components/Layout/Navbar.jsx`
  - Main site navigation bar.
- `website_frontend/src/components/Layout/SearchBar.jsx`
  - Search UI component integrated into layout/navigation.

### `website_frontend/src/context/`

Global React context/state.

- `website_frontend/src/context/AuthContext.jsx`
  - Manages auth state, token, login/register/logout, user retrieval/update.
- `website_frontend/src/context/ToastContext.jsx`
  - Shared toast/notification API for user feedback across pages.

### `website_frontend/src/data/`

- `website_frontend/src/data/mockData.js`
  - Local mock data and helpers (used during UI development/testing).

### `website_frontend/src/pages/`

Route-level page components.

- `website_frontend/src/pages/HomePage.jsx`
  - Landing page sections (hero/trending/new arrivals/highlights).
- `website_frontend/src/pages/CataloguePage.jsx`
  - Searchable/filterable full catalog view.
- `website_frontend/src/pages/BookDetailPage.jsx`
  - Single-book details page + review/interaction area.
- `website_frontend/src/pages/TrendingPage.jsx`
  - Full trending books page.
- `website_frontend/src/pages/NewArrivalsPage.jsx`
  - New arrivals listing page.
- `website_frontend/src/pages/MyBooksPage.jsx`
  - User borrowed books, status, renew/history-style content.
- `website_frontend/src/pages/WishlistPage.jsx`
  - User wishlist page.
- `website_frontend/src/pages/NotificationsPage.jsx`
  - User notifications/messages page.
- `website_frontend/src/pages/ProfilePage.jsx`
  - User profile management and membership-related UI.
- `website_frontend/src/pages/LoginPage.jsx`
  - Login form page.
- `website_frontend/src/pages/RegisterPage.jsx`
  - Registration form page.
- `website_frontend/src/pages/AdminDashboardPage.jsx`
  - Admin dashboard page (stats + management workflows).
- `website_frontend/src/pages/DashboardPage.jsx`
  - Additional dashboard route/page component (role- or context-dependent dashboard view).

### `website_frontend/src/services/`

- `website_frontend/src/services/api.js`
  - Central HTTP client and API wrapper methods grouped by domain (auth/books/users/borrowings/trending/new arrivals/membership/recommendations/admin).

---

## Typical User Journeys (End-to-End)

### 1) Discover a book

1. User opens home/catalogue page.
2. Frontend requests books/trending/new-arrivals endpoints.
3. Backend fetches data from `Book` and related tables.
4. Frontend renders cards (`BookCard`) and detail pages.

### 2) Login and access member features

1. User logs in (`LoginPage`).
2. Token saved by `AuthContext`.
3. Member pages call protected routes (profile, borrowings, wishlist).
4. Backend validates JWT and returns user-specific data.

### 3) Admin adds books

1. Admin logs in and opens admin dashboard.
2. Frontend calls admin endpoints.
3. Backend checks admin role decorator.
4. DB is updated and dashboard stats refresh.

---

## Notes on Design

- The backend follows modular Flask blueprint architecture.
- The frontend follows component + page + context separation.
- `services/api.js` acts as a clean integration boundary between UI and API.
- Tests in `backend/tests/` provide coverage for major backend domains.

---

## Quick Mental Model

- `backend/app/models.py` = data structure
- `backend/app/api/*.py` = HTTP contract
- `backend/app/services/*.py` = domain logic
- `website_frontend/src/pages/*.jsx` = screens
- `website_frontend/src/components/*.jsx` = reusable UI
- `website_frontend/src/context/*.jsx` = global app state
- `website_frontend/src/services/api.js` = backend communication layer
