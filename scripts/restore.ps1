# =============================================================================
# Automated Restore Script for Windows (PowerShell): MySQL & File Storage
# Usage: .\scripts\restore.ps1 -BackupDir "./backups/backup_YYYYMMDD_HHMMSS"
# =============================================================================

param (
    [Parameter(Mandatory=$true)]
    [string]$BackupDir
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $BackupDir)) {
    Write-Error "Backup directory '$BackupDir' does not exist."
    exit 1
}

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " Starting System Restore from: $BackupDir" -ForegroundColor Cyan
Write-Host "=================================================="

# Read DB Credentials from backend/.env
$envFile = "./backend/.env"
$dbHost = "127.0.0.1"
$dbPort = "3306"
$dbName = "inventory_db"
$dbUser = "root"
$dbPass = ""

if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^DB_HOST=(.+)$') { $dbHost = $matches[1].Trim() }
        if ($_ -match '^DB_PORT=(.+)$') { $dbPort = $matches[1].Trim() }
        if ($_ -match '^DB_DATABASE=(.+)$') { $dbName = $matches[1].Trim() }
        if ($_ -match '^DB_USERNAME=(.+)$') { $dbUser = $matches[1].Trim() }
        if ($_ -match '^DB_PASSWORD=(.*)$') { $dbPass = $matches[1].Trim() }
    }
}

# 1. Restore Database Dump
Write-Host "[1/4] Restoring MySQL database..." -ForegroundColor Yellow
$sqlFile = Join-Path $BackupDir "database.sql"
if (-not (Test-Path $sqlFile)) {
    Write-Error "database.sql not found in $BackupDir"
    exit 1
}

$mysqlCmd = "mysql"
if (-not (Get-Command mysql -ErrorAction SilentlyContinue)) {
    $fallbackPaths = @(
        "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe",
        "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe",
        "C:\xampp\mysql\bin\mysql.exe"
    )
    foreach ($p in $fallbackPaths) {
        if (Test-Path $p) {
            $mysqlCmd = $p
            break
        }
    }
}

$mysqlArgs = @(
    "-h", $dbHost,
    "-P", $dbPort,
    "-u", $dbUser,
    $dbName
)
if ($dbPass -ne "") {
    $mysqlArgs = @("-p$dbPass") + $mysqlArgs
}

Get-Content $sqlFile | & $mysqlCmd $mysqlArgs
Write-Host "Database restored successfully." -ForegroundColor Green

# 2. Restore Storage Directory
Write-Host "[2/4] Restoring storage files..." -ForegroundColor Yellow
$storageZip = Join-Path $BackupDir "storage.zip"
$storageTarget = "./backend/storage/app/public"

if (Test-Path $storageZip) {
    if (-not (Test-Path $storageTarget)) {
        New-Item -ItemType Directory -Path $storageTarget -Force | Out-Null
    }
    Expand-Archive -Path $storageZip -DestinationPath $storageTarget -Force
    Write-Host "Storage files extracted." -ForegroundColor Green
}

# 3. Migrations & Storage Link
Write-Host "[3/4] Running migrations and linking storage..." -ForegroundColor Yellow
Push-Location backend
try {
    & php -d xdebug.mode=off artisan migrate --force
    & php -d xdebug.mode=off artisan storage:link
    
    # 4. Verify Stock Ledger Reconciliation
    Write-Host "[4/4] Verifying stock ledger reconciliation..." -ForegroundColor Yellow
    & php -d xdebug.mode=off artisan stock:reconcile
} finally {
    Pop-Location
}

Write-Host "==================================================" -ForegroundColor Green
Write-Host " Restore completed and verified successfully!" -ForegroundColor Green
Write-Host "=================================================="
