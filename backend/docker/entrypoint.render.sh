#!/bin/sh
set -e

echo "=========================================================="
echo " Starting SK Decor Studio Backend on Render"
echo "=========================================================="

# Create necessary Laravel storage and framework directories
mkdir -p \
    /app/storage/app/public \
    /app/storage/app/private \
    /app/storage/framework/cache/data \
    /app/storage/framework/sessions \
    /app/storage/framework/views \
    /app/storage/logs \
    /app/bootstrap/cache \
    /tmp/caddy-data \
    /tmp/caddy-config

# Ensure writable permissions
chmod -R 775 /app/storage /app/bootstrap/cache 2>/dev/null || true

# Auto-configure APP_URL if running on Railway
if [ -z "$APP_URL" ] && [ -n "$RAILWAY_PUBLIC_DOMAIN" ]; then
    export APP_URL="https://$RAILWAY_PUBLIC_DOMAIN"
    echo "==> Automatically set APP_URL to https://$RAILWAY_PUBLIC_DOMAIN"
fi

# -------------------------------------------------------------
# 1. Database Connection Discovery
# -------------------------------------------------------------
# Railway MySQL auto-discovery
if [ -n "$MYSQL_URL" ] || [ -n "$MYSQLHOST" ]; then
    echo "==> Detected Railway MySQL service..."
    export DB_CONNECTION=mysql
    if [ -n "$MYSQL_URL" ]; then
        export DB_URL="$MYSQL_URL"
    fi
    if [ -n "$MYSQLHOST" ]; then
        export DB_HOST="$MYSQLHOST"
        export DB_PORT="${MYSQLPORT:-3306}"
        export DB_USERNAME="${MYSQLUSER:-root}"
        export DB_PASSWORD="$MYSQLPASSWORD"
        export DB_DATABASE="${MYSQLDATABASE:-railway}"
    fi
elif [ -n "$DATABASE_URL" ]; then
    echo "==> Using DATABASE_URL connection string..."
    case "$DATABASE_URL" in
        postgres*|pgsql*)
            export DB_CONNECTION="${DB_CONNECTION:-pgsql}"
            export DB_URL="$DATABASE_URL"
            echo "==> PostgreSQL database detected."
            ;;
        mysql*)
            export DB_CONNECTION="${DB_CONNECTION:-mysql}"
            export DB_URL="$DATABASE_URL"
            echo "==> MySQL database detected."
            ;;
    esac
elif [ -n "$DB_HOST" ]; then
    echo "==> Using DB_HOST ($DB_HOST)..."
    export DB_CONNECTION="${DB_CONNECTION:-mysql}"
else
    echo "==> No external DB credentials found. Falling back to embedded SQLite..."
    export DB_CONNECTION=sqlite
    export DB_DATABASE="${DB_DATABASE:-/app/storage/database.sqlite}"
    touch "$DB_DATABASE" 2>/dev/null || {
        export DB_DATABASE=/tmp/database.sqlite
        touch /tmp/database.sqlite
    }
fi

# -------------------------------------------------------------
# 2. Public Storage Symlink
# -------------------------------------------------------------
if [ -w /app/public ] && [ ! -e /app/public/storage ]; then
    echo "==> Creating storage symbolic link..."
    php artisan storage:link --no-interaction || true
fi

# -------------------------------------------------------------
# 3. Application Key Validation
# -------------------------------------------------------------
if [ -z "$APP_KEY" ]; then
    echo "==> Generating application encryption key..."
    php artisan key:generate --force --no-interaction
fi

# -------------------------------------------------------------
# 4. Database Migrations and Seeders
# -------------------------------------------------------------
if [ "$RUN_MIGRATIONS_ON_BOOT" = "true" ] || [ "$DB_CONNECTION" = "sqlite" ] || [ -n "$MYSQL_URL" ] || [ -n "$MYSQLHOST" ] || [ -z "$DB_HOST" ]; then
    echo "==> Running database migrations..."
    php artisan migrate --force --no-interaction

    # Run seeders if RUN_SEEDER=true, or if database is SQLite / Railway (initial setup)
    if [ "$RUN_SEEDER" = "true" ] || [ "$DB_CONNECTION" = "sqlite" ] || [ -n "$MYSQL_URL" ] || [ -n "$MYSQLHOST" ]; then
        echo "==> Running database seeders (admin & initial catalog)..."
        php artisan db:seed --force --no-interaction || true
    fi
fi

# -------------------------------------------------------------
# 5. Production Optimization Caching
# -------------------------------------------------------------
if [ "$APP_ENV" = "production" ] && [ -n "$APP_KEY" ]; then
    echo "==> Caching configuration, routes, and views..."
    php artisan config:cache --no-interaction || true
    php artisan route:cache --no-interaction || true
    php artisan view:cache --no-interaction || true
fi

# -------------------------------------------------------------
# 6. Start FrankenPHP Web Server
# -------------------------------------------------------------
echo "==> FrankenPHP listening on port ${PORT:-10000}..."
exec frankenphp run --config /etc/caddy/Caddyfile
