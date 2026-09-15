@echo off
schtasks /Create /F /TN "Laravel Scheduler - SMH" /TR "wscript.exe \"D:\Xampp\htdocs\sss\my-app\scripts\run-scheduler-hidden.vbs\"" /SC MINUTE /MO 1 /RU "%USERNAME%"
schtasks /Query /TN "Laravel Scheduler - SMH"
