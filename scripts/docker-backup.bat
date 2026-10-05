@echo off
setlocal enabledelayedexpansion

echo ===================================================
echo   SMH Docker Automated Database Backup
echo ===================================================

for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set TIMESTAMP=%datetime:~0,8%_%datetime:~8,6%

set BACKUP_DIR=storage\backups
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

echo [1/2] Dumping app_db from 192.168.1.191...
docker compose exec -T app mysqldump -h 192.168.1.191 -u sa -psa --single-transaction --routines --triggers app_db > "%BACKUP_DIR%\app_db_%TIMESTAMP%.sql"

if %ERRORLEVEL% equ 0 (
    echo Database backup created: %BACKUP_DIR%\app_db_%TIMESTAMP%.sql
) else (
    echo [ERROR] Database backup failed!
    exit /b %ERRORLEVEL%
)

echo [2/2] Archiving uploaded storage files...
tar -czf "%BACKUP_DIR%\storage_app_%TIMESTAMP%.tar.gz" storage\app\public 2>nul

echo.
echo Backup completed successfully at %TIMESTAMP%!
echo Files saved in %BACKUP_DIR%
echo ===================================================
