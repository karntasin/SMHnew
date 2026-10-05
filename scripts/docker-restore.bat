@echo off
setlocal enabledelayedexpansion

echo ===================================================
echo   SMH Docker Database Restore Tool
echo ===================================================
if "%~1"=="" (
    echo Usage: docker-restore.bat [path_to_sql_file]
    echo Example: docker-restore.bat storage\backups\app_db_20261002_120000.sql
    echo.
    echo Available backup files:
    dir storage\backups\*.sql /b
    exit /b 1
)

set SQL_FILE=%~1
if not exist "%SQL_FILE%" (
    echo [ERROR] File not found: %SQL_FILE%
    exit /b 1
)

echo WARNING: Restoring will overwrite app_db at 192.168.1.191!
set /p CONFIRM="Type 'YES' to proceed with restore: "
if not "%CONFIRM%"=="YES" (
    echo Restore cancelled.
    exit /b 0
)

echo Restoring database from %SQL_FILE%...
docker compose exec -i app mysql -h 192.168.1.191 -u sa -psa app_db < "%SQL_FILE%"

if %ERRORLEVEL% equ 0 (
    echo Restore completed successfully!
    docker compose exec app php artisan cache:clear
) else (
    echo [ERROR] Restore failed!
)
