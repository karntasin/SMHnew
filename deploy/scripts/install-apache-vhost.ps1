#Requires -RunAsAdministrator
<#
.SYNOPSIS
  ติดตั้ง Apache vhost สำหรับ SMH (พอร์ต 8081 localhost) และสลับ .htaccess เป็นโหมด root
.PARAMETER PublicHostname
  เช่น smh.hospital.go.th — ใส่ใน ServerAlias ของ vhost
#>
param(
    [string]$PublicHostname = 'smh.yourdomain.com'
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$VhostSource = Join-Path $ProjectRoot 'deploy\apache\smh-vhost.conf'
$VhostsFile = 'D:\Xampp\apache\conf\extra\httpd-vhosts.conf'
$Marker = '# SMH Cloudflare vhost (auto)'

if (-not (Test-Path $VhostSource)) {
    Write-Error "ไม่พบ $VhostSource"
}

$content = Get-Content $VhostSource -Raw
$content = $content -replace 'smh\.yourdomain\.com', $PublicHostname

$block = @"

$Marker
$content
"@

$existing = Get-Content $VhostsFile -Raw -ErrorAction SilentlyContinue
if ($existing -match [regex]::Escape($Marker)) {
    $existing = $existing -replace "(?s)$([regex]::Escape($Marker)).*?(?=\r?\n#|\z)", $block.TrimEnd()
    Set-Content -Path $VhostsFile -Value $existing.TrimEnd() -Encoding UTF8
    Write-Host "อัปเดต vhost แล้ว"
} else {
    Add-Content -Path $VhostsFile -Value "`n$block" -Encoding UTF8
    Write-Host "เพิ่ม vhost ใน httpd-vhosts.conf แล้ว"
}

$htRoot = Join-Path $ProjectRoot 'public\.htaccess.root'
$htLive = Join-Path $ProjectRoot 'public\.htaccess'
Write-Host "vhost ใช้ RewriteBase / ใน httpd-vhost — ไม่แก้ public\.htaccess (LAN ยังใช้ /sss/my-app/public ได้)"

& 'D:\Xampp\apache\bin\httpd.exe' -t
if ($LASTEXITCODE -ne 0) {
    Write-Error 'Apache config ไม่ผ่าน — ตรวจ httpd-vhosts.conf'
}

Write-Host @"

ถัดไป:
  1. รีสตาร์ท Apache จาก XAMPP Control Panel
  2. ทดสอบ: http://127.0.0.1:8081/up
  3. ใน Cloudflare Tunnel ชี้ service ไป http://127.0.0.1:8081
  4. ตั้ง .env:
     CLOUDFLARE_TUNNEL_MODE=named
     CLOUDFLARE_PUBLIC_HOSTNAME=$PublicHostname
     APP_URL=https://$PublicHostname
"@
