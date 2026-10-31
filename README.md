# Inventory & Sales Management System

A production-quality Inventory & Sales Management System built with **Laravel 11 (API)**, **React 19 (SPA)**, and **MySQL 8**.

---

## Architecture & Tech Stack

- **Backend**:
  - Laravel 11.x on PHP 8.3
  - MySQL 8 with strict constraints (`CHECK stock_qty >= 0`, `DECIMAL(12,2)` money values, `RESTRICT` foreign keys)
  - Laravel Sanctum token-based authentication with granular role-aware permissions
  - Dynamic cached settings key-value store with logo upload
  - `intervention/image` (WebP main + 200x200 cover thumbnail encoding)
  - Pest 3 test framework (46 tests, 202 assertions)
  - Laravel Pint code styling
- **Frontend**:
  - Vite + React 19 + TypeScript
  - React Router 7 with URL-driven search param synchronization
  - TanStack Query 5 (optimistic updates, automatic cache invalidation)
  - React Hook Form + Zod validation
  - Axios with request/response auth interceptors
  - Tailwind CSS with strict two-color design system
  - Vitest + Testing Library for component testing
- **Design System**:
  - **Two Colors Only**:
    - **Primary**: Indigo `#4338CA` (buttons, links, active navigation, focus rings)
    - **Accent**: Amber `#F59E0B` (ONLY for warnings: low-stock badges, notification counters, import error warnings)
    - **Neutrals**: Slate `#0F172A` (primary text), `#64748B` (secondary text), `#E2E8F0` (borders), `#F8FAFC` (page background), `#FFFFFF` (cards)
    - **Strictly No Red or Green**: Status, errors, and validation are communicated via icons, labels, and font weight.
  - **Dynamic Branding & Formatting**: Business name and currency formatting (`formatMoney`) dynamically read from database settings—zero hardcoded symbols (`$`) or business names.

---

## Directory Structure

```
├── .github/workflows/ci.yml       # GitHub Actions CI workflow (lint + test + build)
├── backend/                       # Laravel 11 API
│   ├── app/
│   │   ├── Http/Controllers/Api/V1/ # Thin API controllers (Auth, User, Setting, Unit, Category, Product)
│   │   ├── Http/Requests/         # Form request validation per domain
│   │   ├── Http/Resources/        # Consistent API JSON resources
│   │   ├── Models/                # User, Setting, Unit, Category, Product
│   │   ├── Policies/              # Role-based authorization policies
│   │   └── Services/              # ProductImageService, ProductImportService, SettingService
│   ├── database/migrations/       # Database migrations with CHECK constraints & indexes
│   ├── database/seeders/          # Realistic demo users, settings, units, 3-level categories, 40 products
│   └── tests/Feature/             # Pest feature tests covering all endpoints & roles
├── frontend/                      # React 19 + Vite SPA
│   ├── src/
│   │   ├── api/                   # Axios API clients (auth, users, settings, units, categories, products)
│   │   ├── components/            # Layout, UI components (Modal, ConfirmDialog, Skeleton, EmptyState, ImageUploader)
│   │   ├── context/               # AuthContext (permissions, settings, formatMoney), ToastContext
│   │   ├── pages/                 # Login, Dashboard, Products, Categories, Units, Users, Settings
│   │   └── test/                  # Vitest test suites (Badge, AuthContext, ImageUploader, Login)
└── README.md
```

---

## Setup & Local Development

### Prerequisites
- PHP 8.3+ with `pdo_mysql`, `pdo_sqlite`, `bcmath`, `mbstring`, `intl`, `fileinfo`, `gd` extensions
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
php artisan storage:link

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
| **Admin** | `admin@inventory.test` | `Password123!` | Full permissions: manage users, system settings, units, categories, products, CSV import, cost price viewing |
| **Manager** | `manager@inventory.test` | `Password123!` | Catalog & stock management: units, categories, products, CSV import, cost price viewing |
| **Cashier** | `cashier@inventory.test` | `Password123!` | View active products & stock levels; cost prices and management actions are masked/forbidden |

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

### Frontend Lint (ESLint) & Format Check (Prettier)
```bash
cd frontend
npm run lint
npm run format:check
```

### Frontend Production Build
```bash
cd frontend
npm run build
```

---

## Phase 1 Feature Summary

1. **Dynamic App Settings**:
   - Stored in `settings` table, cached forever via `Cache::rememberForever`.
   - Modifiable on `/settings` (Admin only). Invalidation cascades immediately to layout and price formatting.
2. **Dynamic Units**:
   - Stored in `units` table (`name`, `short_name`).
   - Managed on `/units`. Deletion is protected if assigned to products.
3. **Dynamic Nested Categories**:
   - Unlimited nesting via `parent_id`.
   - Interactive tree view with expand/collapse, flat table view with URL sync.
   - Drag-free "Move To" modal with automatic circular hierarchy prevention (`wouldCreateCycle`).
   - Deletion blocked if category has products or subcategories.
   - Category filtering automatically includes products in all descendant child subcategories.
4. **Product Images via Intervention Image**:
   - Converts uploaded images to optimized WebP.
   - Stores main image (max 800px width/height) and cover crop thumbnail (200x200px).
   - Drag-and-drop client validation for type (JPG/PNG/WebP), size (max 2MB), and dimensions (min 200x200px).
   - Lazy-loaded 40x40 thumbnails in table; full preview modal.
5. **Two-Step CSV Import Wizard**:
   - Step 1: Upload and preview token generation with row-level error breakdown, duplicate SKU detection, and new relation extraction.
   - Step 2: Confirm import with choices for duplicate SKU resolution (skip vs update) and missing relation auto-creation under a single database transaction.
   - Pre-formatted CSV template download.
6. **Admin-only User Management**:
   - User table with role badges, search, and active/inactive status toggling.
   - Deactivation preserves historical auditability; self-deactivation is strictly blocked.
7. **Role-Aware UI & Server-Driven Tables**:
   - Navigation and action buttons derived directly from permissions returned by `/me`.
   - Table states (search, filters, sorting, page) stored in URL search parameters for link sharing and state preservation.
