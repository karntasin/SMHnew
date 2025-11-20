# Git Auto-Backup System Documentation

## 📋 Overview
This system automatically backs up your code to GitHub every 30 minutes and provides tools for manual backup and restore operations.

## 🚀 Quick Setup

### 1. Enable Auto-Backup (Run as Administrator)
```powershell
cd C:\xampp\htdocs\sss\my-app\scripts
.\setup-auto-backup.ps1
```

This will:
- Create a Windows Task Scheduler task
- Auto-commit and push changes every 30 minutes
- Run in background without interrupting your work

### 2. Manual Backup (Anytime)
```powershell
cd C:\xampp\htdocs\sss\my-app\scripts
.\git-backup.ps1
```

Use this when you want to backup immediately with a custom message.

### 3. Restore Files (When Needed)
```powershell
cd C:\xampp\htdocs\sss\my-app\scripts
.\git-restore.ps1
```

Options:
- Discard all current changes
- Restore a specific file
- Go back to a previous commit

## 📁 Files Created

```
my-app/
├── .git/
│   └── hooks/
│       └── auto-backup.ps1          # Auto-backup script (runs every 30 min)
└── scripts/
    ├── setup-auto-backup.ps1        # Setup script (run once as admin)
    ├── git-backup.ps1               # Manual backup script
    ├── git-restore.ps1              # Restore script
    └── GIT-BACKUP-README.md         # This file
```

## 🔧 Configuration

### Change Backup Frequency
1. Open Task Scheduler (`Win + R` → `taskschd.msc`)
2. Find "Git Auto Backup - Hospital Dashboard"
3. Right-click → Properties → Triggers → Edit
4. Change "Repeat task every" to desired interval

### Disable Auto-Backup
```powershell
# Disable the task
Disable-ScheduledTask -TaskName "Git Auto Backup - Hospital Dashboard"

# Or remove completely
Unregister-ScheduledTask -TaskName "Git Auto Backup - Hospital Dashboard" -Confirm:$false
```

## 🛡️ Safety Features

### Auto-Backup
- ✅ Only commits if there are changes
- ✅ Runs silently in background
- ✅ Network-aware (only runs if online)
- ✅ Won't drain battery (runs on battery too)
- ✅ Automatic retry if fails

### Manual Operations
- ✅ Shows changes before committing
- ✅ Confirmation prompts for destructive operations
- ✅ Clear success/error messages
- ✅ Custom commit messages supported

## 📊 Monitoring

### View Recent Backups
```powershell
cd C:\xampp\htdocs\sss\my-app
git log --oneline -20
```

### Check Task Status
```powershell
Get-ScheduledTask -TaskName "Git Auto Backup - Hospital Dashboard"
```

### View Task History
1. Open Task Scheduler
2. Find the task
3. Click "History" tab

## 🔄 Common Scenarios

### Accidentally Deleted a File
```powershell
# Run restore script
.\scripts\git-restore.ps1

# Choose option 2 (Restore a specific file)
# Enter the file path
```

### Want to Go Back 1 Hour
```powershell
# View commits
git log --oneline --since="2 hours ago"

# Copy the commit hash you want
# Run restore script and choose option 3
```

### Made Bad Changes, Want to Undo Everything
```powershell
# Run restore script
.\scripts\git-restore.ps1

# Choose option 1 (Discard all changes)
# Type "yes" to confirm
```

## 🌐 GitHub Repository

**URL**: https://github.com/karntasin5-byte/hospital-dashboard

View your backups online:
- All commits: https://github.com/karntasin5-byte/hospital-dashboard/commits/main
- Browse files: https://github.com/karntasin5-byte/hospital-dashboard

## ⚠️ Important Notes

1. **Internet Required**: Auto-backup needs internet to push to GitHub
2. **Credentials**: You may need to authenticate first time
3. **.env Protection**: Your `.env` file is NOT backed up (sensitive data)
4. **Large Files**: Files over 100MB may fail to upload
5. **Conflicts**: If multiple people edit same file, manual merge may be needed

## 🆘 Troubleshooting

### Task Not Running
```powershell
# Check task status
Get-ScheduledTask -TaskName "Git Auto Backup - Hospital Dashboard" | Select-Object State, LastRunTime, NextRunTime

# Run manually to test
cd C:\xampp\htdocs\sss\my-app\.git\hooks
.\auto-backup.ps1
```

### Push Fails
```powershell
# Check if you're authenticated
git config --list

# Re-authenticate
git push origin main
```

### See Error Messages
Check Task Scheduler history or run script manually to see errors.

## 📞 Support

If you encounter issues:
1. Check Task Scheduler History
2. Run scripts manually to see error messages
3. Check GitHub repository for successful pushes
4. Verify internet connection

---

**Created**: 2025-11-19
**Repository**: hospital-dashboard
**Author**: karntasin5
