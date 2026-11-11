# =============================================================================
# Automated Backup Script for Windows (PowerShell): MySQL & File Storage
# Usage: .\scripts\backup.ps1 [-Destination "./backups"]
# =============================================================================

param (
    [string]$Destination = "./backups"
)

$ErrorActionPreference = "Stop"
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$targetDir = Join-Path $Destination "backup_$timestamp"

if (-not (Test-Path $targetDir)) {
    New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
}

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " Starting Backup: $timestamp" -ForegroundColor Cyan
Write-Host " Destination: $targetDir" -ForegroundColor Cyan
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

# 1. Export MySQL Database Dump
Write-Host "[1/3] Dumping MySQL database '$dbName'..." -ForegroundColor Yellow
$sqlFile = Join-Path $targetDir "database.sql"

$mysqldumpCmd = "mysqldump"
if (-not (Get-Command mysqldump -ErrorAction SilentlyContinue)) {
    $fallbackPaths = @(
        "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe",
        "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqldump.exe",
        "C:\xampp\mysql\bin\mysqldump.exe"
    )
    foreach ($p in $fallbackPaths) {
        if (Test-Path $p) {
            $mysqldumpCmd = $p
            break
        }
    }
}

$dumpArgs = @(
    "-h", $dbHost,
    "-P", $dbPort,
    "-u", $dbUser,
    "--single-transaction",
    "--quick",
    "--routines",
    "--triggers",
    $dbName
)
if ($dbPass -ne "") {
    $dumpArgs = @("-p$dbPass") + $dumpArgs
}

& $mysqldumpCmd $dumpArgs | Out-File -FilePath $sqlFile -Encoding utf8
Write-Host "Database dumped to $sqlFile" -ForegroundColor Green

# 2. Archive Storage Directory
Write-Host "[2/3] Archiving application storage..." -ForegroundColor Yellow
$storageSource = "./backend/storage/app/public"
$storageZip = Join-Path $targetDir "storage.zip"

if (Test-Path $storageSource) {
    Compress-Archive -Path "$storageSource\*" -DestinationPath $storageZip -Force
    Write-Host "Storage archived to $storageZip" -ForegroundColor Green
} else {
    Write-Host "Warning: $storageSource not found, skipping." -ForegroundColor Yellow
}

# 3. Create Manifest
$manifestFile = Join-Path $targetDir "manifest.json"
@{
    timestamp = $timestamp
    database = $dbName
    created_at = (Get-Date).ToString("o")
} | ConvertTo-Json | Out-File -FilePath $manifestFile -Encoding utf8

Write-Host "[3/3] Manifest written." -ForegroundColor Yellow
Write-Host "==================================================" -ForegroundColor Green
Write-Host " Backup successfully completed at $targetDir" -ForegroundColor Green
Write-Host "=================================================="
