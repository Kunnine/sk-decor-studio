#!/bin/sh
set -e

mkdir -p \
    /tmp/bootstrap/cache \
    /tmp/storage/framework/views \
    /tmp/storage/app \
    /tmp/caddy-data \
    /tmp/caddy-config

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

if [ -n "$APP_KEY" ]; then
    php artisan config:cache --no-interaction || true
    php artisan route:cache --no-interaction || true
    php artisan view:cache --no-interaction || true
fi

if [ "$RUN_MIGRATIONS_ON_BOOT" = "true" ]; then
    php artisan migrate --force --no-interaction
fi

exec frankenphp run --config /etc/caddy/Caddyfile
