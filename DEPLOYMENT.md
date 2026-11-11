# Deployment & Operations Guide

This guide details the complete production setup, update lifecycle, zero-downtime procedures, backup/restore operations, and production readiness checklist for the **Inventory & Sales Management System** (Laravel 11 API, React 19 SPA, MySQL 8).

---

## 1. System & Server Requirements

### Minimal Recommended Hardware
- **CPU**: 2 vCPUs (x86_64 or ARM64)
- **RAM**: 4 GB RAM (2 GB dedicated to MySQL buffer pool, 1 GB for PHP-FPM workers, 1 GB OS/Nginx)
- **Disk Storage**: 40 GB SSD (NVMe preferred for high IOPS append-only stock ledger writes)
- **OS**: Ubuntu 22.04 LTS / 24.04 LTS, Debian 12, or AlmaLinux 9

### Host Software Prerequisites
- **Docker**: Engine version 24.0+ or newer
- **Docker Compose**: Plugin version v2.20+ or newer
- **Git**: 2.34+
- Optional (for non-containerized host installs):
  - PHP 8.3 CLI with extensions (`pdo_mysql`, `bcmath`, `mbstring`, `intl`, `gd`, `opcache`, `zip`)
  - Node.js 20+ and npm 10+
  - MySQL Server 8.0+

---

## 2. Architecture & Service Topology

The production stack runs in isolated container networks orchestrated via `docker-compose.yml`:

```
                           [ Ingress Traffic (HTTPS/443, HTTP/80) ]
                                             │
                                             ▼
                             ┌──────────────────────────────┐
                             │       Nginx Gateway          │
                             │  (SSL, Gzip, Security Hdrs)  │
                             └──────┬────────────────┬──────┘
                                    │                │
            /api/*, /storage/*      │                │  SPA routes / assets
                                    ▼                ▼
                     ┌──────────────────┐    ┌──────────────────┐
                     │   PHP 8.3 FPM    │    │   React 19 SPA   │
                     │  (backend:9000)  │    │  (frontend:80)   │
                     └────────┬─────────┘    └──────────────────┘
                              │
               ┌──────────────┼──────────────┐
               ▼              ▼              ▼
     ┌─────────────────┐ ┌─────────┐ ┌────────────────┐
     │  MySQL 8.0 DB   │ │ Queue   │ │ Task Scheduler │
     │  (InnoDB Engine)│ │ Worker  │ │ (stock:digest) │
     └─────────────────┘ └─────────┘ └────────────────┘
```

---

## 3. First-Time Setup (Under 15 Minutes)

### Step 1: Clone the Repository
```bash
git clone https://github.com/your-org/inventory-sales-management.git
cd inventory-sales-management
```

### Step 2: Configure Environment Variables
Copy the production environment template:
```bash
cp .env.production.example backend/.env
```

Edit `backend/.env` with production secrets:
```bash
nano backend/.env
```
Ensure the following variables are configured:
```ini
APP_ENV=production
APP_DEBUG=false
APP_URL=https://inventory.yourcompany.com
FRONTEND_URL=https://inventory.yourcompany.com

DB_DATABASE=inventory_db
DB_USERNAME=inventory_prod
DB_PASSWORD=YOUR_STRONG_PASSWORD_HERE
DB_ROOT_PASSWORD=YOUR_STRONG_ROOT_PASSWORD_HERE

MAIL_MAILER=smtp
MAIL_HOST=smtp.mailgun.org
MAIL_PORT=587
MAIL_USERNAME=your_smtp_user
MAIL_PASSWORD=your_smtp_password
MAIL_FROM_ADDRESS=alerts@yourcompany.com
```

### Step 3: Launch Containers with Docker Compose
```bash
docker compose up -d --build
```

Verify that all 6 containers are healthy:
```bash
docker compose ps
```

### Step 4: Run Migrations & Generate Encryption Key
```bash
# Generate application key
docker compose exec backend php artisan key:generate --force

# Run database migrations
docker compose exec backend php artisan migrate --force

# Seed initial system configuration and default accounts (Optional for initial launch)
docker compose exec backend php artisan db:seed --force

# Create public storage symlink for product images
docker compose exec backend php artisan storage:link
```

### Step 5: Verify System Health
Execute the inventory ledger reconciliation check:
```bash
docker compose exec backend php artisan stock:reconcile
```
*Expected output*: `All 40 products reconciled successfully. 0 differences found.`

Access the web interface at `http://your-server-ip` or your configured domain.

---

## 4. Default Seeded Accounts & Roles

| Role | Email | Password | Intended Capabilities |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@inventory.test` | `Password123!` | Complete system access, audit logs, settings, user management, reports, analytics. |
| **Manager** | `manager@inventory.test` | `Password123!` | Analytics, reports, stock adjustments, purchase orders, catalog management. |
| **Cashier** | `cashier@inventory.test` | `Password123!` | POS terminal checkout, own sales registry. Cannot view cost prices or margins. |

> **Important**: Change these default passwords immediately after initial deployment via the Profile page or CLI!

---

## 5. Routine Update & Deployment Procedure

For subsequent software releases, follow this zero-downtime update routine:

```bash
# 1. Pull latest code release
git pull origin main

# 2. Rebuild containers in the background
docker compose build --pull

# 3. Put application into maintenance mode if breaking migrations exist
docker compose exec backend php artisan down --render="maintenance" --secret="deploy-bypass-token"

# 4. Apply database migrations
docker compose exec backend php artisan migrate --force

# 5. Clear and rebuild route, config, and view caches
docker compose exec backend php artisan config:cache
docker compose exec backend php artisan route:cache
docker compose exec backend php artisan view:cache

# 6. Restart worker processes to load fresh PHP code
docker compose restart backend queue scheduler

# 7. Bring application back online
docker compose exec backend php artisan up

# 8. Verify ledger integrity post-deployment
docker compose exec backend php artisan stock:reconcile
```

---

## 6. Rollback Procedure

If an issue arises after a deployment:

```bash
# 1. Rollback the last migration batch if needed
docker compose exec backend php artisan migrate:rollback --step=1 --force

# 2. Checkout the previous stable Git commit or tag
git checkout v1.0.0

# 3. Rebuild and restart containers
docker compose up -d --build

# 4. Clear cached configurations
docker compose exec backend php artisan optimize:clear
docker compose exec backend php artisan optimize

# 5. Restart queue workers
docker compose restart queue scheduler
```

---

## 7. Backup and Disaster Recovery

### Creating a Backup
Automated backup scripts archive both the MySQL database (`mysqldump`) and user-uploaded media (`storage/app/public`):

```bash
# On Linux/macOS:
./scripts/backup.sh /path/to/backup/destination

# On Windows (PowerShell):
.\scripts\backup.ps1 -Destination "C:\backups"
```

A snapshot directory `backup_YYYYMMDD_HHMMSS` will be generated containing:
- `database.sql.gz` (or `database.sql`)
- `storage.tar.gz` (or `storage.zip`)
- `manifest.json`

### Restoring from Backup
```bash
# On Linux/macOS:
./scripts/restore.sh ./backups/backup_YYYYMMDD_HHMMSS

# On Windows (PowerShell):
.\scripts\restore.ps1 -BackupDir ".\backups\backup_YYYYMMDD_HHMMSS"
```
The restore script automatically:
1. Imports database schemas and data.
2. Extracts uploaded files to storage.
3. Runs `php artisan migrate --force` and `storage:link`.
4. Runs `php artisan stock:reconcile` to assert 100% financial and stock consistency.

### Recommended Cron Backup Schedule
Add the following line to `/etc/crontab` to back up nightly at 02:00 AM:
```cron
0 2 * * * root /var/www/inventory/scripts/backup.sh /mnt/nas/inventory_backups >> /var/log/inventory_backup.log 2>&1
```

---

## 8. Pre-Flight Production Launch Checklist

Before opening the system to live cashier transactions:

- [ ] **APP_DEBUG=false**: Ensure `APP_DEBUG=false` in `backend/.env`.
- [ ] **Strong Encryption Key**: `APP_KEY` generated via `php artisan key:generate`.
- [ ] **SSL / TLS Termination**: Valid Let's Encrypt or corporate SSL certificate mounted in Nginx.
- [ ] **CORS Domain Whitelist**: `FRONTEND_URL` and `CORS_ALLOWED_ORIGINS` strictly locked to production domain.
- [ ] **Rate Limiting Active**: Login endpoint throttled (5 attempts/min), export endpoints throttled (60 req/min).
- [ ] **Queue Worker Running**: Process manager or `inventory_queue` container actively running with `restart: always`.
- [ ] **Daily Digest Scheduler Running**: `inventory_scheduler` running `schedule:work` to send `stock:low-digest`.
- [ ] **Pessimistic Locking Verified**: Concurrency tests confirm overselling is prevented under high load.
- [ ] **Reconciliation Check Passed**: `php artisan stock:reconcile` reports 0 differences.
- [ ] **Default Passwords Changed**: Admin, Manager, and Cashier accounts updated with unique secure passwords.
- [ ] **Off-site Backups Tested**: Database dump and restore successfully verified on staging environment.
