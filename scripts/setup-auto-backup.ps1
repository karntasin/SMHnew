# Setup Auto Backup Task in Windows Task Scheduler
# Run this script as Administrator

Write-Host "=== Setting up Auto Backup Task ===" -ForegroundColor Cyan
Write-Host ""

$taskName = "Git Auto Backup - Hospital Dashboard"
$scriptPath = "C:\xampp\htdocs\sss\my-app\.git\hooks\auto-backup.ps1"
$workingDirectory = "C:\xampp\htdocs\sss\my-app"

# Check if task already exists
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue

if ($existingTask) {
    Write-Host "Task already exists. Removing old task..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

# Create the task action
$action = New-ScheduledTaskAction `
    -Execute "PowerShell.exe" `
    -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$scriptPath`"" `
    -WorkingDirectory $workingDirectory

# Create the trigger (every 30 minutes)
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 30) -RepetitionDuration ([TimeSpan]::MaxValue)

# Create the task settings
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 5)

# Get current user
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Highest

# Register the task
Register-ScheduledTask `
    -TaskName $taskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Principal $principal `
    -Description "Automatically commits and pushes changes to GitHub every 30 minutes"

Write-Host ""
Write-Host "✓ Auto backup task created successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Task details:" -ForegroundColor Cyan
Write-Host "  Name: $taskName"
Write-Host "  Frequency: Every 30 minutes"
Write-Host "  Script: $scriptPath"
Write-Host "  Repository: https://github.com/karntasin5-byte/hospital-dashboard"
Write-Host ""
Write-Host "You can manage this task in Task Scheduler (taskschd.msc)" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
