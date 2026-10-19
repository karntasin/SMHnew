@echo off
setlocal enabledelayedexpansion

echo ===================================================
echo   SMH Rollback from Docker to XAMPP (15-second restore)
echo ===================================================

echo [1/3] Stopping Docker web container...
docker compose stop web

echo [2/3] Reverting docker-compose.yml ports to staging (8085)...
powershell -Command "(Get-Content docker-compose.yml) -replace '- \"80:80\"`r`n      - \"127.0.0.1:8081:80\"', '- \"127.0.0.1:8085:80\"' | Set-Content -Encoding UTF8 docker-compose.yml"
powershell -Command "(Get-Content docker-compose.yml) -replace '- \"80:80\"`n      - \"127.0.0.1:8081:80\"', '- \"127.0.0.1:8085:80\"' | Set-Content -Encoding UTF8 docker-compose.yml"

echo [3/3] Starting Apache in XAMPP...
start "" "D:\xampp\apache_start.bat"

echo.
echo ===================================================
echo Rollback completed! XAMPP Apache is now active.
echo ===================================================
