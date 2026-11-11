@echo off
chcp 65001 >nul
setlocal

set "SCRIPT_DIR=%~dp0"
for %%I in ("%SCRIPT_DIR%..") do set "ROOT_DIR=%%~fI"

echo ====================================================================
echo   Starting Inventory ^& Sales Management System (WAMP + Laravel + Vite)
echo ====================================================================
echo.

echo [1/3] Checking WampServer MySQL on 127.0.0.1:3306...
powershell -NoProfile -Command "$c = New-Object System.Net.Sockets.TcpClient; try { $c.Connect('127.0.0.1', 3306); $c.Close(); exit 0 } catch { exit 1 }"
if errorlevel 1 (
    echo [!] Cannot reach MySQL on 127.0.0.1:3306.
    echo     Please start WampServer and wait until its tray icon is GREEN, then re-run this script.
    echo.
    pause
    exit /b 1
)
echo [OK] MySQL is running on 127.0.0.1:3306.
echo.

echo [2/3] Starting Laravel API backend on http://127.0.0.1:8000...
powershell -NoProfile -Command "$c = New-Object System.Net.Sockets.TcpClient; try { $c.Connect('127.0.0.1', 8000); $c.Close(); exit 0 } catch { exit 1 }"
if %errorlevel%==0 (
    echo [OK] Port 8000 is already listening. Skipping new backend window.
) else (
    start "Inventory API (127.0.0.1:8000)" /D "%ROOT_DIR%\backend" cmd /k "set XDEBUG_MODE=off && php -d xdebug.mode=off artisan serve --host=127.0.0.1 --port=8000"
    echo [OK] Launched Laravel API window.
)
echo.

echo [3/3] Starting Vite React frontend on http://localhost:5173...
powershell -NoProfile -Command "$ok = $false; foreach ($h in @('127.0.0.1','::1')) { $c = New-Object System.Net.Sockets.TcpClient; try { $c.Connect($h, 5173); $c.Close(); $ok = $true; break } catch {} }; if ($ok) { exit 0 } else { exit 1 }"
if %errorlevel%==0 (
    echo [OK] Port 5173 is already listening. Skipping new frontend window.
) else (
    start "Inventory Frontend (localhost:5173)" /D "%ROOT_DIR%\frontend" cmd /k "npm run dev"
    echo [OK] Launched Vite frontend window.
)

echo.
echo ====================================================================
echo   Servers Starting:
echo   - Frontend App:  http://localhost:5173
echo   - Backend API:   http://127.0.0.1:8000
echo ====================================================================
echo.
