#Requires -RunAsAdministrator
<#
.SYNOPSIS
  ติดตั้ง cloudflared Named Tunnel เป็น Windows Service
  ต้องมี config.yml และ credentials จาก cloudflared tunnel create แล้ว
#>
param(
    [string]$ConfigPath = (Join-Path (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent) 'deploy\cloudflare\config.yml')
)

$ErrorActionPreference = 'Stop'
$Bin = Join-Path (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent) 'cloudflared.exe'

if (-not (Test-Path $Bin)) {
    Write-Error "ไม่พบ cloudflared.exe ที่ $Bin"
}
if (-not (Test-Path $ConfigPath)) {
    Write-Error @"
ไม่พบ config: $ConfigPath
ทำตามขั้นตอน:
  1. ล็อกอิน:  cloudflared tunnel login
  2. สร้าง:    cloudflared tunnel create fshh-app
  3. คัดลอก deploy\cloudflare\config.yml.example เป็น config.yml แล้วแก้ tunnel id / hostname
  4. cloudflared tunnel route dns fshh-app fshh-app.online
"@
}

# cloudflared `service install` ไม่เก็บ --config ไว้ใน binPath
# ตั้ง PathName เอง ไม่งั้น service รันเปล่า → Cloudflare Error 1033
$existing = Get-Service Cloudflared, cloudflared -ErrorAction SilentlyContinue
if ($existing) {
    Stop-Service Cloudflared -Force -ErrorAction SilentlyContinue
    & $Bin service uninstall
    Start-Sleep -Seconds 2
}

& $Bin --config $ConfigPath service install
$binPath = "`"$Bin`" --no-autoupdate --config `"$ConfigPath`" tunnel run"
sc.exe config Cloudflared binPath= $binPath
if ($LASTEXITCODE -ne 0) {
    Write-Error "ตั้ง binPath ของ Cloudflared ไม่สำเร็จ"
}
sc.exe config Cloudflared start= auto | Out-Null
Start-Service Cloudflared
Write-Host "ติดตั้งและเริ่ม cloudflared service แล้ว — เปิด https://fshh-app.online"
Write-Host "binPath: $binPath"
