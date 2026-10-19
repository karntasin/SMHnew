@echo off
setlocal enabledelayedexpansion

echo ===================================================
echo   SMH Switch Docker to Live Production (80 & 8081)
echo ===================================================

echo [1/3] Stopping Apache in XAMPP...
taskkill /F /IM httpd.exe 2>nul
timeout /t 2 /nobreak >nul

echo [2/3] Switching docker-compose.yml to live ports...
powershell -Command "(Get-Content docker-compose.yml) -replace '- \"127.0.0.1:8085:80\"', '- \"80:80\"`n      - \"127.0.0.1:8081:80\"' | Set-Content -Encoding UTF8 docker-compose.yml"

echo [3/3] Applying port changes in Docker...
docker compose up -d web

echo.
echo ===================================================
echo Done! Docker is now serving Live on Port 80 and 8081.
echo Cloudflare Tunnel and LAN clients are now served by Docker!
echo ===================================================
