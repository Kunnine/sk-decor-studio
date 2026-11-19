#!/bin/sh
set -e

mkdir -p \
    /tmp/bootstrap/cache \
    /tmp/storage/framework/views \
    /tmp/storage/framework/sessions \
    /tmp/storage/framework/cache/data \
    /tmp/storage/app \
    /tmp/caddy-data \
    /tmp/caddy-config

# Auto-fallback to zero-config SQLite in /tmp if cloud MySQL DB_HOST is not provided
if [ "$DB_CONNECTION" = "sqlite" ] || [ -z "$DB_HOST" ]; then
    touch /tmp/database.sqlite
    export DB_CONNECTION=sqlite
    export DB_DATABASE=/tmp/database.sqlite
fi

if [ -w /app/storage ]; then
    mkdir -p \
        /app/storage/app/public \
        /app/storage/app/private \
        /app/storage/framework/cache/data \
        /app/storage/framework/sessions \
        /app/storage/framework/views \
        /app/storage/logs
fi

if [ -w /app/public ] && [ ! -e /app/public/storage ]; then
    php artisan storage:link --no-interaction || true
fi

# Run database migrations and seed default demo accounts on boot
if [ "$RUN_MIGRATIONS_ON_BOOT" = "true" ] || [ "$DB_CONNECTION" = "sqlite" ] || [ -z "$DB_HOST" ]; then
    php artisan migrate --force --no-interaction
    php artisan db:seed --force --no-interaction || true
fi

if [ -n "$APP_KEY" ]; then
    php artisan config:cache --no-interaction || true
    php artisan route:cache --no-interaction || true
    php artisan view:cache --no-interaction || true
fi

exec frankenphp run --config /etc/caddy/Caddyfile
