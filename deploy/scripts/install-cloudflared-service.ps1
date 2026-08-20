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
  2. สร้าง:    cloudflared tunnel create smh-hospital
  3. คัดลอก deploy\cloudflare\config.yml.example เป็น config.yml แล้วแก้ tunnel id / hostname
  4. ใน Zero Trust → Tunnels → Public Hostname ตั้ง subdomain + domain
"@
}

& $Bin service install --config $ConfigPath
& $Bin service start
Write-Host "ติดตั้งและเริ่ม cloudflared service แล้ว — ดูสถานะใน Cloudflare Zero Trust → Tunnels"
