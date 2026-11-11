@echo off
chcp 65001 >nul
echo ====================================================================
echo   Connecting Inventory ^& Sales Management System to WampServer MySQL
echo ====================================================================
echo.

set "SCRIPT_DIR=%~dp0"
for %%I in ("%SCRIPT_DIR%..") do set "ROOT_DIR=%%~fI"
cd /d "%ROOT_DIR%\backend"

echo [1/4] Checking WAMP MySQL connection and ensuring 'inventory_db' database exists...
php artisan db:create inventory_db
if errorlevel 1 (
    echo.
    echo [!] Could not connect to MySQL.
    echo     Please make sure WampServer is running and the tray icon is GREEN.
    echo.
    pause
    exit /b 1
)

echo.
echo [2/4] Running database migrations and seeding initial data...
php artisan migrate:fresh --seed --force
if errorlevel 1 (
    echo [!] Migration/seeding failed. Please check error output above.
    pause
    exit /b 1
)

echo.
echo [3/4] Linking public storage for images...
php artisan storage:link

echo.
echo [4/4] Optimizing application cache...
php artisan optimize:clear

echo.
echo ====================================================================
echo  [SUCCESS] Connected to WAMP MySQL database: inventory_db!
echo ====================================================================
echo.
echo Demo Accounts Ready:
echo  - Admin:    admin@inventory.test    / Password123!
echo  - Manager:  manager@inventory.test  / Password123!
echo  - Cashier:  cashier@inventory.test  / Password123!
echo.
echo Next Steps:
echo  - Quick start both servers:  scripts\start_dev.bat
echo  - Or manually in two terminals:
echo    1. Backend API:   cd backend ^&^& php -d xdebug.mode=off artisan serve --host=127.0.0.1 --port=8000
echo    2. Frontend SPA:  cd frontend ^&^& npm run dev
echo.
pause
