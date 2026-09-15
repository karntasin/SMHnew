Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd /c cd /d D:\Xampp\htdocs\sss\my-app && D:\Xampp\htdocs\sss\my-app\.php82\php.exe artisan schedule:run >> storage\logs\scheduler.log 2>&1", 0, False
