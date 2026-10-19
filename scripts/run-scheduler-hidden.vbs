Set WshShell = CreateObject("WScript.Shell")
' ใช้ไฟล์ลอกรายวัน กัน process ค้างล็อก scheduler.log จน schedule นาทีถัดไปเขียนไม่ได้
Dim logFile, cmd
logFile = "storage\logs\scheduler-" & Year(Now) & Right("0" & Month(Now), 2) & Right("0" & Day(Now), 2) & ".log"
cmd = "cmd /c cd /d D:\Xampp\htdocs\sss\my-app && D:\Xampp\htdocs\sss\my-app\.php82\php.exe artisan schedule:run >> " & logFile & " 2>&1"
WshShell.Run cmd, 0, False
