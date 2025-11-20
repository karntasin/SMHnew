# Manual Backup Script - Run this anytime to backup your changes
# Usage: Right-click and "Run with PowerShell" or run from terminal

$projectPath = "C:\xampp\htdocs\sss\my-app"
Set-Location $projectPath

Write-Host "=== Git Backup Script ===" -ForegroundColor Cyan
Write-Host ""

# Check git status
Write-Host "Checking for changes..." -ForegroundColor Yellow
$status = git status --porcelain

if ($status) {
    Write-Host "Changes found:" -ForegroundColor Green
    git status --short
    Write-Host ""
    
    # Get current date and time
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    
    # Ask for commit message
    $message = Read-Host "Enter commit message (or press Enter for auto-message)"
    
    if ([string]::IsNullOrWhiteSpace($message)) {
        $message = "Backup: $timestamp"
    } else {
        $message = "$message - $timestamp"
    }
    
    Write-Host ""
    Write-Host "Creating backup..." -ForegroundColor Yellow
    
    # Add all changes
    git add .
    
    # Commit
    git commit -m $message
    
    # Push to GitHub
    Write-Host "Pushing to GitHub..." -ForegroundColor Yellow
    git push origin main
    
    Write-Host ""
    Write-Host "✓ Backup completed successfully!" -ForegroundColor Green
    Write-Host "Repository: https://github.com/karntasin5-byte/hospital-dashboard" -ForegroundColor Cyan
} else {
    Write-Host "No changes detected." -ForegroundColor Yellow
    Write-Host "✓ Everything is up to date!" -ForegroundColor Green
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
