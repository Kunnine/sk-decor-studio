#!/usr/bin/env bash
# =============================================================================
# Automated Restore Script: MySQL Database & File Storage
# Usage: ./scripts/restore.sh /path/to/backup_folder
# =============================================================================

set -euo pipefail

if [ -z "${1:-}" ]; then
    echo "Error: Missing backup directory argument."
    echo "Usage: ./scripts/restore.sh ./backups/backup_YYYYMMDD_HHMMSS"
    exit 1
fi

BACKUP_DIR="$1"

if [ ! -d "${BACKUP_DIR}" ]; then
    echo "Error: Backup directory '${BACKUP_DIR}' does not exist."
    exit 1
fi

echo "=================================================="
echo " Starting System Restore from: ${BACKUP_DIR}"
echo "=================================================="

# Load environment configuration
if [ -f "./backend/.env" ]; then
    export $(grep -v '^#' ./backend/.env | xargs)
fi

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"
DB_DATABASE="${DB_DATABASE:-inventory_db}"
DB_USERNAME="${DB_USERNAME:-inventory_user}"
DB_PASSWORD="${DB_PASSWORD:-}"

# 1. Restore Database Dump
echo "[1/4] Restoring MySQL database..."
if [ -f "${BACKUP_DIR}/database.sql.gz" ]; then
    if [ -n "${DB_PASSWORD}" ]; then
        gunzip -c "${BACKUP_DIR}/database.sql.gz" | MYSQL_PWD="${DB_PASSWORD}" mysql -h "${DB_HOST}" -P "${DB_PORT}" -u "${DB_USERNAME}" "${DB_DATABASE}"
    else
        gunzip -c "${BACKUP_DIR}/database.sql.gz" | mysql -h "${DB_HOST}" -P "${DB_PORT}" -u "${DB_USERNAME}" "${DB_DATABASE}"
    fi
elif [ -f "${BACKUP_DIR}/database.sql" ]; then
    if [ -n "${DB_PASSWORD}" ]; then
        MYSQL_PWD="${DB_PASSWORD}" mysql -h "${DB_HOST}" -P "${DB_PORT}" -u "${DB_USERNAME}" "${DB_DATABASE}" < "${BACKUP_DIR}/database.sql"
    else
        mysql -h "${DB_HOST}" -P "${DB_PORT}" -u "${DB_USERNAME}" "${DB_DATABASE}" < "${BACKUP_DIR}/database.sql"
    fi
else
    echo "Error: No database.sql or database.sql.gz found in ${BACKUP_DIR}."
    exit 1
fi
echo "Database restored successfully."

# 2. Restore Storage Directory
echo "[2/4] Restoring storage files..."
if [ -f "${BACKUP_DIR}/storage.tar.gz" ]; then
    mkdir -p "./backend/storage/app"
    tar -xzf "${BACKUP_DIR}/storage.tar.gz" -C "./backend/storage/app"
    echo "Storage files extracted."
fi

# 3. Re-run migrations and link storage
echo "[3/4] Running migrations and updating symlinks..."
cd backend
php artisan migrate --force
php artisan storage:link || true

# 4. Verify Inventory Integrity
echo "[4/4] Verifying stock ledger reconciliation..."
php artisan stock:reconcile

echo "=================================================="
echo " Restore completed and verified successfully!"
echo "=================================================="
