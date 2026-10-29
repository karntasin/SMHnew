' เปิดงานสำรองคนละโปรเซสกับ schedule:run
' WScript.Shell.Run ไม่ส่งต่อ handle ของ scheduler log จึงไม่ล็อกไฟล์ล็อกทั้งวัน
Set WshShell = CreateObject("WScript.Shell")
If WScript.Arguments.Count < 1 Then
  WScript.Quit 1
End If

Dim job, root, php, logFile, artisan, cmd, stamp
job = LCase(WScript.Arguments(0))
root = "D:\Xampp\htdocs\sss\my-app"
php = root & "\.php82\php.exe"

Select Case job
  Case "hosxp"
    artisan = "hosxp:backup"
    logFile = root & "\storage\logs\hosxp-backup.log"
  Case "appdb"
    artisan = "appdb:backup"
    logFile = root & "\storage\logs\appdb-backup.log"
  Case "dotenv"
    artisan = "backup:upload-drive --dotenv"
    logFile = root & "\storage\logs\drive-dotenv-backup.log"
  Case Else
    WScript.Quit 1
End Select

stamp = Year(Now) & "-" & Right("0" & Month(Now), 2) & "-" & Right("0" & Day(Now), 2) & " " & Right("0" & Hour(Now), 2) & ":" & Right("0" & Minute(Now), 2) & ":" & Right("0" & Second(Now), 2)
cmd = "cmd /c cd /d """ & root & """ && echo [start " & stamp & "] " & artisan & ">> """ & logFile & """ && """ & php & """ artisan " & artisan & " >> """ & logFile & """ 2>&1"
WshShell.Run cmd, 0, False
