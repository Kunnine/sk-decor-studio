# Inventory & Sales Management System

A production-quality Inventory & Sales Management System built with **Laravel 11 (API)**, **React 19 (SPA)**, and **MySQL 8**.

---

## Architecture & Tech Stack

- **Backend**:
  - Laravel 11.x on PHP 8.3
  - MySQL 8 with strict constraints (`CHECK stock_qty >= 0`, `DECIMAL(12,2)` money values, `RESTRICT` foreign keys)
  - Laravel Sanctum token-based authentication
  - Pest 3 test framework
  - Laravel Pint code styling
- **Frontend**:
  - Vite + React 19 + TypeScript
  - React Router 7
  - TanStack Query 5 (stale-while-revalidate, background sync)
  - React Hook Form + Zod
  - Axios with request and response interceptors
  - Tailwind CSS with a strict two-color design system
  - Vitest + React Testing Library for frontend component testing
- **Design System**:
  - **Two Colors Only**:
    - **Primary**: Indigo `#4338CA` (buttons, links, active navigation, focus rings)
    - **Accent**: Amber `#F59E0B` (ONLY for warnings: low-stock badges, notification counters, low-stock table rows)
    - **Neutrals**: Slate `#0F172A` (primary text), `#64748B` (secondary text), `#E2E8F0` (borders), `#F8FAFC` (page background), `#FFFFFF` (cards)
    - **No Red or Green**: Status, errors, and validation are communicated via icons, labels, and font weight.

---

## Directory Structure

```
├── .github/workflows/ci.yml       # GitHub Actions CI workflow (lint + test + build)
├── backend/                       # Laravel 11 API
│   ├── app/
│   │   ├── Http/Controllers/Api/V1/ # Thin API controllers (Auth, Category, Product, Import)
│   │   ├── Http/Requests/         # Form request validation
│   │   ├── Http/Resources/        # Consistent API JSON resources
│   │   ├── Models/                # User, Category, Product
│   │   └── Policies/              # Role-based authorization policies
│   ├── database/migrations/       # Database migrations with CHECK constraints
│   ├── database/seeders/          # Realistic demo users, categories, products
│   └── tests/Feature/             # Pest feature tests covering all endpoints & roles
├── frontend/                      # React 19 + Vite SPA
│   ├── src/
│   │   ├── api/                   # Axios API clients & endpoints
│   │   ├── components/            # Layout, UI components (Modal, ConfirmDialog, Skeleton, EmptyState)
│   │   ├── context/               # AuthContext, ToastContext
│   │   ├── pages/                 # Login, Products, Categories
│   │   └── test/                  # Vitest component test suites
└── README.md
```

---

## Setup & Local Development

### Prerequisites
- PHP 8.3+ with `pdo_mysql`, `pdo_sqlite`, `bcmath`, `mbstring`, `intl` extensions
- Composer 2.x
- Node.js 20+ and npm
- MySQL 8.0+

### 1. Backend Setup

```bash
cd backend

# 1. Install Composer dependencies
composer install

# 2. Configure environment
cp .env.example .env
php artisan key:generate

# Configure your database credentials in backend/.env:
# DB_CONNECTION=mysql
# DB_HOST=127.0.0.1
# DB_PORT=3306
# DB_DATABASE=inventory_system
# DB_USERNAME=root
# DB_PASSWORD=root

# 3. Run database migrations & seed demo data
php artisan migrate:fresh --seed

# 4. Start backend API server
php artisan serve --port=8000
```

### 2. Frontend Setup

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Run development server
npm run dev
# The SPA will run at http://localhost:5173 with proxy to backend at http://localhost:8000
```

---

## Demo Credentials (Pre-seeded)

| Role | Email | Password | Permissions |
|---|---|---|---|
| **Admin** | `admin@inventory.test` | `Password123!` | Full permissions over all modules, users, and settings |
| **Manager** | `manager@inventory.test` | `Password123!` | Product management, categories, purchases, voiding sales, reports |
| **Cashier** | `cashier@inventory.test` | `Password123!` | Create sales and view stock levels (read-only for products & categories) |

*(Quick-fill buttons for these accounts are available on the Login screen).*

---

## Running Quality & Test Suites

### Backend Tests (Pest)
```bash
cd backend
php vendor/bin/pest
```

### Backend Lint & Style Check (Pint)
```bash
cd backend
php vendor/bin/pint --test
```

### Frontend Tests (Vitest)
```bash
cd frontend
npm test
```

### Frontend Production Build
```bash
cd frontend
npm run build
```

---

## Architecture Decisions

1. **Role Authorization Architecture**:
   - Built on native Laravel Policies (`ProductPolicy`, `CategoryPolicy`) combined with Form Request validation (`authorize()`).
   - Cashiers can view active products and verify stock levels in real time, but are strictly prohibited from modifying products, categories, or executing CSV imports (HTTP 403 Forbidden).
2. **Preventing N+1 Queries**:
   - `CategoryController` uses `with('parent')` and `withCount('products')`.
   - `ProductController` eager-loads `category` in list and detail queries.
3. **Database Integrity**:
   - `stock_qty` enforces a database-level `CHECK (stock_qty >= 0)` constraint.
   - Products and categories enforce foreign keys with `RESTRICT` on delete to preserve historical integrity.
   - Products utilize soft deletion (`deleted_at`) to preserve references in sales records.
4. **CSV Bulk Product Import**:
   - Streams CSV line-by-line inside a database transaction.
   - Automatically maps or creates categories if they do not exist.
   - Captures and isolates row-level validation errors with row numbers and messages rather than silently failing.
5. **Two-Color Design System**:
   - Strict palette: Primary Indigo `#4338CA` and Accent Amber `#F59E0B` for warnings.
   - Zero use of red or green hues anywhere in UI or charts. Error and success states are differentiated through clear typography, font weights, labels, and iconography.
