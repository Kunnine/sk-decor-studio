# =========================================================================
# Stage 1: Build React 19 Frontend SPA
# =========================================================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
# Empty VITE_API_BASE_URL instructs Axios to use relative /api/v1 (same domain)
ENV VITE_API_BASE_URL=""
RUN npm run build

# =========================================================================
# Stage 2: Install Laravel Production Composer Dependencies
# =========================================================================
FROM composer:2.8 AS vendor
WORKDIR /app/backend
COPY backend/composer.json backend/composer.lock ./
RUN composer install \
    --no-dev \
    --no-interaction \
    --no-scripts \
    --prefer-dist \
    --ignore-platform-reqs

# =========================================================================
# Stage 3: Full-Stack Production Runtime (FrankenPHP + Caddy + Laravel API)
# =========================================================================
FROM dunglas/frankenphp:1-php8.3-bookworm

WORKDIR /app

# Install required PHP extensions (GD, MySQL, PostgreSQL, SQLite, etc.)
RUN install-php-extensions \
    bcmath \
    gd \
    intl \
    opcache \
    pcntl \
    pdo_mysql \
    pdo_pgsql \
    pdo_sqlite \
    zip

# Production PHP settings
RUN cp "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini" && \
    { \
        echo 'memory_limit=256M'; \
        echo 'upload_max_filesize=20M'; \
        echo 'post_max_size=25M'; \
        echo 'max_execution_time=60'; \
        echo 'opcache.enable=1'; \
        echo 'opcache.memory_consumption=128'; \
        echo 'opcache.interned_strings_buffer=8'; \
        echo 'opcache.max_accelerated_files=10000'; \
        echo 'opcache.validate_timestamps=0'; \
        echo 'opcache.save_comments=1'; \
    } > "$PHP_INI_DIR/conf.d/zz-production.ini"

# Copy Composer and pre-installed dependencies from vendor stage
COPY --from=vendor /usr/bin/composer /usr/bin/composer
COPY --from=vendor /app/backend/vendor /app/vendor

# Copy backend source code
COPY backend/ /app

# Copy built frontend SPA assets directly into Laravel's public directory
COPY --from=frontend-builder /app/frontend/dist/ /app/public/

# Generate optimized class autoloader and discover packages
RUN composer dump-autoload --optimize --no-dev --no-scripts && \
    php artisan package:discover --ansi

# Setup Caddyfile and startup entrypoint
COPY backend/Caddyfile.render /etc/caddy/Caddyfile
COPY backend/docker/entrypoint.render.sh /usr/local/bin/entrypoint.render.sh
RUN sed -i 's/\r$//' /usr/local/bin/entrypoint.render.sh && \
    chmod +x /usr/local/bin/entrypoint.render.sh

# Ensure Laravel storage and cache directories exist with appropriate permissions
RUN mkdir -p \
        /app/storage/app/public \
        /app/storage/app/private \
        /app/storage/framework/cache/data \
        /app/storage/framework/sessions \
        /app/storage/framework/views \
        /app/storage/logs \
        /app/bootstrap/cache && \
    chown -R www-data:www-data /app/storage /app/bootstrap/cache && \
    chmod -R 775 /app/storage /app/bootstrap/cache

ENV PORT=10000

EXPOSE 10000

ENTRYPOINT ["/usr/local/bin/entrypoint.render.sh"]
