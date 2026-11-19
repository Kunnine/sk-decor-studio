# Deploying to Render — Full-Stack Guide

This guide walks you through deploying the **SK Decor Studio - Inventory & Sales Management System** (Laravel 11 API, React 19 SPA, and Database) to [Render](https://render.com).

---

## Architecture Choices on Render

You can deploy this project to Render using either of two battle-tested approaches:

| Feature | Option A: Render Blueprint (Recommended) | Option B: All-in-One Fullstack Container |
| :--- | :--- | :--- |
| **Structure** | Decoupled: Frontend (Static Site) + Backend (Docker Web Service) + DB | Unified: Single Docker Web Service serving both Frontend & Backend |
| **Frontend Cost** | **100% Free** on Render Global CDN (No compute hours consumed) | Consumes free Web Service compute hours |
| **Number of Services**| 2 services (1 Static Site + 1 Web Service) + 1 Database | 1 Web Service (+ optional external DB) |
| **CORS** | Configured automatically via `render.yaml` | **Zero CORS needed** (same domain and port) |
| **Setup Speed** | **1-Click** via Render Blueprint (`render.yaml`) | **1-Click** via root `Dockerfile` |

---

## Option A: 1-Click Deployment via Render Blueprint (Recommended)

Render Blueprints allow you to provision the entire stack (React Static Site, Laravel API, and PostgreSQL database) with a single click using Infrastructure-as-Code.

### Step 1: Push Repository to GitHub or GitLab
Make sure your latest code including `render.yaml` is committed and pushed to your remote repository:
```bash
git add .
git commit -m "Configure Render fullstack deployment"
git push origin main
```

### Step 2: Create Blueprint Instance on Render
1. Go to the [Render Dashboard](https://dashboard.render.com).
2. Click the **New +** button at the top right and select **Blueprint**.
3. Connect your GitHub / GitLab account and select your `inventory-sales-management` repository.
4. Render will parse `render.yaml` and show the services to create:
   - **`inventory-backend`** (Web Service – Docker / FrankenPHP)
   - **`inventory-frontend`** (Static Site – React 19 / Vite)
   - **`inventory-db`** (Managed PostgreSQL database)
5. Click **Apply**.

Render will provision the database, build the backend, compile the frontend SPA, and wire the environment variables together automatically!

---

## Option B: Single Full-Stack Web Service (All-in-One)

If you prefer having a **single service, single URL, and zero CORS**, use the multi-stage root `Dockerfile`.

1. Go to [Render Dashboard](https://dashboard.render.com).
2. Click **New +** -> **Web Service**.
3. Select your repository.
4. Configure service details:
   - **Name**: `inventory-fullstack` (or your choice)
   - **Language / Runtime**: **Docker**
   - **Dockerfile Path**: `./Dockerfile` (default)
   - **Instance Type**: **Free** (or Starter/Standard)
5. Add Environment Variables:
   - `APP_ENV`: `production`
   - `APP_DEBUG`: `false`
   - `APP_KEY`: *(leave empty to auto-generate or use a 32-char key)*
   - `RUN_MIGRATIONS_ON_BOOT`: `true`
   - `RUN_SEEDER`: `true`
   - *(Optional external database variables if using Cloud MySQL/PostgreSQL)*
6. Click **Create Web Service**.

When the build completes, visit your URL (e.g., `https://inventory-fullstack.onrender.com`). You will see the React login page directly!

---

## Database Configuration Options

### 1. Render Managed PostgreSQL (Default in `render.yaml`)
- Included automatically when using the Blueprint.
- Render injects `DATABASE_URL` (format: `postgres://user:pass@host:5432/db`).
- The backend entrypoint automatically detects `DATABASE_URL` and activates Laravel's `pgsql` driver.

### 2. External Cloud MySQL (TiDB Cloud, Aiven, PlanetScale, Railway)
If you prefer MySQL 8.0, you can connect an external cloud database. For example, [TiDB Cloud Serverless](https://tidbcloud.com) offers 25 GB free forever with MySQL compatibility:
In Render's backend service settings, add:
- `DB_CONNECTION`: `mysql`
- `DB_HOST`: `gateway01.us-east-1.prod.aws.tidbcloud.com`
- `DB_PORT`: `4000`
- `DB_DATABASE`: `inventory_db`
- `DB_USERNAME`: `your_user`
- `DB_PASSWORD`: `your_password`
- `DB_SSL`: `true`

### 3. Embedded SQLite (Zero Setup / Instant Demo)
If no external database or `DATABASE_URL` is configured, the container automatically falls back to an embedded SQLite database inside `/app/storage/database.sqlite` (or `/tmp/database.sqlite`), migrates tables, and seeds initial data so the application never crashes on boot.

---

## Persistent File Storage for Uploaded Images

On Render's Free tier, Web Service filesystems are ephemeral (uploaded images will be lost if the container restarts). For permanent image storage:

### Cloud Object Storage (Cloudflare R2 or AWS S3)
[Cloudflare R2](https://www.cloudflare.com/developer-platform/r2/) provides 10 GB of free storage with **zero egress bandwidth fees** and full S3 API compatibility.

Set these environment variables in `inventory-backend`:
```ini
FILESYSTEM_DISK=s3
AWS_ACCESS_KEY_ID=your_r2_access_key
AWS_SECRET_ACCESS_KEY=your_r2_secret_key
AWS_DEFAULT_REGION=auto
AWS_BUCKET=inventory-uploads
AWS_ENDPOINT=https://<your_account_id>.r2.cloudflarestorage.com
AWS_URL=https://<your_custom_or_pub_r2_domain>
AWS_USE_PATH_STYLE_ENDPOINT=true
```

---

## Default Login Credentials

Once deployment completes and database seeders have run, you can log in with:

| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@inventory.test` | `Password123!` |
| **Manager** | `manager@inventory.test` | `Password123!` |
| **Cashier** | `cashier@inventory.test` | `Password123!` |

> [!IMPORTANT]
> Immediately log in as Admin and change your default passwords under **Profile & Settings** or **User Management** in production.

---

## Frequently Asked Questions & Troubleshooting

### 1. Free Tier Cold Starts
- Free Web Services on Render spin down into sleep mode after **15 minutes of inactivity**.
- The first request may take 30–50 seconds to wake up the service.
- **Tip**: You can use a free monitoring service like [UptimeRobot](https://uptimerobot.com) to ping your `/up` health check endpoint every 10 minutes to keep it warm.

### 2. SPA Route Refreshing Returns 404
- If deploying as a Static Site, ensure the rewrite rule is set:
  - **Source**: `/*`
  - **Destination**: `/index.html`
  - **Type**: `Rewrite`
- This is already configured in `render.yaml`.
- In the single full-stack container, Laravel's `Route::fallback` in `routes/web.php` handles this automatically.

### 3. Running Artisan Commands Manually
You can run any Laravel artisan command directly in Render:
1. Navigate to your Web Service in the Render Dashboard.
2. Click the **Shell** tab on the left sidebar.
3. Run commands such as:
   ```bash
   php artisan migrate:status
   php artisan db:seed --force
   php artisan cache:clear
   ```
