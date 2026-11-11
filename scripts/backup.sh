#!/usr/bin/env bash
# =============================================================================
# Automated Backup Script: MySQL Database & File Storage
# Usage: ./scripts/backup.sh [/path/to/backup/destination]
# =============================================================================

set -euo pipefail

BACKUP_DIR="${1:-./backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
TARGET_DIR="${BACKUP_DIR}/backup_${TIMESTAMP}"

# Load environment configuration
if [ -f "./backend/.env" ]; then
    export $(grep -v '^#' ./backend/.env | xargs)
elif [ -f "./.env" ]; then
    export $(grep -v '^#' ./.env | xargs)
fi

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"
DB_DATABASE="${DB_DATABASE:-inventory_db}"
DB_USERNAME="${DB_USERNAME:-inventory_user}"
DB_PASSWORD="${DB_PASSWORD:-}"

mkdir -p "${TARGET_DIR}"

echo "=================================================="
echo " Starting Backup: ${TIMESTAMP}"
echo " Destination: ${TARGET_DIR}"
echo "=================================================="

# 1. Export MySQL Database Dump
echo "[1/3] Dumping MySQL database '${DB_DATABASE}'..."
if [ -n "${DB_PASSWORD}" ]; then
    MYSQL_PWD="${DB_PASSWORD}" mysqldump -h "${DB_HOST}" -P "${DB_PORT}" -u "${DB_USERNAME}" \
        --single-transaction \
        --quick \
        --routines \
        --triggers \
        "${DB_DATABASE}" > "${TARGET_DIR}/database.sql"
else
    mysqldump -h "${DB_HOST}" -P "${DB_PORT}" -u "${DB_USERNAME}" \
        --single-transaction \
        --quick \
        --routines \
        --triggers \
        "${DB_DATABASE}" > "${TARGET_DIR}/database.sql"
fi

gzip "${TARGET_DIR}/database.sql"
echo "Database dump compressed: ${TARGET_DIR}/database.sql.gz"

# 2. Archive Public Storage (Product Images, Invoices)
echo "[2/3] Archiving application storage..."
if [ -d "./backend/storage/app/public" ]; then
    tar -czf "${TARGET_DIR}/storage.tar.gz" -C "./backend/storage/app" public
    echo "Storage archive created: ${TARGET_DIR}/storage.tar.gz"
else
    echo "Warning: ./backend/storage/app/public not found, skipping storage archive."
fi

# 3. Create Manifest
cat <<EOF > "${TARGET_DIR}/manifest.json"
{
  "timestamp": "${TIMESTAMP}",
  "database": "${DB_DATABASE}",
  "app_url": "${APP_URL:-localhost}",
  "git_commit": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')"
}
EOF

echo "[3/3] Manifest written."
echo "=================================================="
echo " Backup successfully completed at ${TARGET_DIR}"
echo "=================================================="
