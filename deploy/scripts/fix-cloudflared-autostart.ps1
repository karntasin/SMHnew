# Elevate helper: configure Cloudflared Windows service for auto-start after boot.
$ErrorActionPreference = 'Stop'
$log = 'D:\Xampp\htdocs\sss\my-app\storage\logs\cloudflared-service-install.log'
function Write-Log([string]$msg) {
    $line = "[{0}] {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $msg
    Add-Content -Path $log -Value $line -Encoding UTF8
    Write-Host $line
}

try {
    Set-Content -Path $log -Value '' -Encoding UTF8
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = [Security.Principal.WindowsPrincipal]::new($identity)
    if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        Write-Log 'ERROR: not running as Administrator'
        exit 2
    }

    $bin = 'D:\Xampp\htdocs\sss\my-app\cloudflared.exe'
    $cfg = 'D:\Xampp\htdocs\sss\my-app\deploy\cloudflare\config.yml'
    if (-not (Test-Path $bin)) { throw "missing binary: $bin" }
    if (-not (Test-Path $cfg)) { throw "missing config: $cfg" }

    Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1

    $svc = Get-Service Cloudflared -ErrorAction SilentlyContinue
    if (-not $svc) {
        Write-Log 'service missing — installing via cloudflared service install'
        & $bin --config $cfg service install
        Start-Sleep -Seconds 2
    } else {
        Write-Log 'stopping existing Cloudflared service'
        Stop-Service Cloudflared -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }

    $binPath = "`"$bin`" --no-autoupdate --config `"$cfg`" tunnel run"
    Write-Log "setting binPath: $binPath"
    sc.exe config Cloudflared binPath= $binPath | Out-String | ForEach-Object { Write-Log $_.Trim() }
    if ($LASTEXITCODE -ne 0) { throw "sc config binPath failed ($LASTEXITCODE)" }

    Write-Log 'setting start= auto'
    sc.exe config Cloudflared start= auto | Out-String | ForEach-Object { Write-Log $_.Trim() }
    if ($LASTEXITCODE -ne 0) { throw "sc config start=auto failed ($LASTEXITCODE)" }

    Write-Log 'starting Cloudflared'
    Start-Service Cloudflared
    Start-Sleep -Seconds 3

    $svc = Get-Service Cloudflared
    $path = (Get-CimInstance Win32_Service -Filter "Name='Cloudflared'").PathName
    Write-Log ("Status={0} StartType={1}" -f $svc.Status, $svc.StartType)
    Write-Log ("PathName={0}" -f $path)

    if ($svc.Status -ne 'Running') { throw "service not running after start" }
    if ($path -notmatch 'config') { throw "PathName missing --config" }

    Write-Log 'SUCCESS'
    exit 0
}
catch {
    Write-Log ("ERROR: {0}" -f $_.Exception.Message)
    exit 1
}
