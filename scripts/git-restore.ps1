# Quick Restore Script - Restore files from previous commits
# Usage: Run this script to see and restore from Git history

$projectPath = "C:\xampp\htdocs\sss\my-app"
Set-Location $projectPath

Write-Host "=== Git Restore Script ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "Recent commits:" -ForegroundColor Yellow
git log --oneline -10
Write-Host ""

Write-Host "Available options:" -ForegroundColor Green
Write-Host "1. Discard all current changes (restore to last commit)"
Write-Host "2. Restore a specific file"
Write-Host "3. Go back to a previous commit"
Write-Host "4. Exit"
Write-Host ""

$choice = Read-Host "Choose an option (1-4)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "WARNING: This will discard ALL current changes!" -ForegroundColor Red
        $confirm = Read-Host "Are you sure? (yes/no)"
        
        if ($confirm -eq "yes") {
            git reset --hard HEAD
            Write-Host "✓ Restored to last commit" -ForegroundColor Green
        } else {
            Write-Host "Cancelled" -ForegroundColor Yellow
        }
    }
    "2" {
        Write-Host ""
        $file = Read-Host "Enter file path (e.g., app/Http/Controllers/DashboardController.php)"
        
        if (Test-Path $file) {
            git checkout HEAD -- $file
            Write-Host "✓ File restored: $file" -ForegroundColor Green
        } else {
            Write-Host "✗ File not found: $file" -ForegroundColor Red
        }
    }
    "3" {
        Write-Host ""
        $commitHash = Read-Host "Enter commit hash (e.g., 240b5fe)"
        
        Write-Host ""
        Write-Host "WARNING: This will move HEAD to commit $commitHash" -ForegroundColor Red
        Write-Host "You can always go back using 'git reflog'" -ForegroundColor Yellow
        $confirm = Read-Host "Are you sure? (yes/no)"
        
        if ($confirm -eq "yes") {
            git reset --hard $commitHash
            Write-Host "✓ Restored to commit $commitHash" -ForegroundColor Green
        } else {
            Write-Host "Cancelled" -ForegroundColor Yellow
        }
    }
    "4" {
        Write-Host "Exiting..." -ForegroundColor Yellow
    }
    default {
        Write-Host "Invalid option" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
