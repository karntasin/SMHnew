<?php

namespace App\Http\Controllers\Im;

use App\Http\Controllers\Controller;
use App\Models\Im\Asset;
use App\Models\Im\AssetSpec;
use App\Models\Im\ServiceTicket;
use App\Services\Im\AssetMacLookup;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class AgentController extends Controller
{
    /**
     * Serve dynamic PowerShell bootstrap installer script for Windows 10/11
     * Usage on client: irm http://<HOST>/im/agent/install.ps1 | iex
     */
    public function installScript(Request $request): Response
    {
        $serverUrl = $this->resolveServerUrl($request);
        $scriptPath = resource_path('scripts/smh-agent.ps1');

        if ($request->query('raw') === '1' && file_exists($scriptPath)) {
            $content = file_get_contents($scriptPath);
            if (! str_starts_with($content, "\xEF\xBB\xBF")) {
                $content = "\xEF\xBB\xBF".$content;
            }

            return response($content, 200, [
                'Content-Type' => 'text/plain; charset=utf-8',
            ]);
        }

        // Bootstrap installer script executed via irm ... | iex
        $bootstrapScript = <<<POWERSHELL
# ==============================================================================
# FSHH Computer Agent One-Liner Installer (Windows 10 / 11)
# Fort Surasinghanat Hospital - IM Resource Management
# ==============================================================================
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor 3072 -bor 12288 -bor [Net.SecurityProtocolType]::Tls11 -bor [Net.SecurityProtocolType]::Tls
[System.Net.ServicePointManager]::DefaultConnectionLimit = 64
[System.Net.ServicePointManager]::Expect100Continue = \$false
[System.Net.ServicePointManager]::MaxServicePointIdleTime = 2000
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force -ErrorAction SilentlyContinue

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Installing FSHH Agent from {$serverUrl}..." -ForegroundColor Cyan
Write-Host "  Fort Surasinghanat Hospital" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

\$agentDir = "\$env:ProgramData\SMH-Agent"
if (-not (Test-Path \$agentDir)) { New-Item -ItemType Directory -Path \$agentDir -Force | Out-Null }
\$scriptPath = "\$agentDir\smh-agent.ps1"

function Download-WithRetry {
    param([string]\$Url, [string]\$Destination)
    \$success = \$false
    for (\$attempt = 1; \$attempt -le 3; \$attempt++) {
        try {
            \$wc = New-Object System.Net.WebClient
            \$wc.Headers.Add("User-Agent", "FSHH-Agent-Installer")
            \$wc.DownloadFile(\$Url, \$Destination)
            \$wc.Dispose()
            \$success = \$true
            break
        } catch {
            Start-Sleep -Seconds 1
        }
    }
    if (-not \$success) {
        Invoke-WebRequest -Uri \$Url -OutFile \$Destination -UseBasicParsing
    }
}

try {
    Write-Host "[1/4] Downloading latest FSHH agent script from {$serverUrl}..." -ForegroundColor Yellow
    Download-WithRetry -Url "{$serverUrl}/im/agent/install.ps1?raw=1" -Destination \$scriptPath
    Unblock-File -Path \$scriptPath -ErrorAction SilentlyContinue

    Write-Host "[2/4] Downloading & configuring FSHH Remote Support Service (RustDesk)..." -ForegroundColor Yellow
    try {
        \$rdExe = "\$agentDir\\rustdesk.exe"
        Download-WithRetry -Url "{$serverUrl}/im/agent/rustdesk.exe" -Destination \$rdExe
        Unblock-File -Path \$rdExe -ErrorAction SilentlyContinue

        # Kill any hanging temp installer processes if present
        Get-Process -Name "rustdesk" -ErrorAction SilentlyContinue | Where-Object { \$_.Path -and (\$_.Path -notlike "*Program Files*") } | Stop-Process -Force -ErrorAction SilentlyContinue

        \$rdInstalledExe = "\$env:ProgramFiles\\RustDesk\\rustdesk.exe"
        if (-not (Test-Path \$rdInstalledExe)) {
            Write-Host "      Installing Remote Support Service..." -ForegroundColor Cyan
            \$proc = Start-Process -FilePath \$rdExe -ArgumentList "--silent-install" -PassThru -WindowStyle Hidden
            # Poll with timeout to prevent hanging on child process handles
            for (\$w = 0; \$w -lt 12; \$w++) {
                if (Test-Path \$rdInstalledExe) { break }
                Start-Sleep -Seconds 1
            }
        } else {
            Write-Host "      Remote Support Service is installed, verifying service..." -ForegroundColor Cyan
        }

        # Ensure service is running
        Start-Service -Name "RustDesk" -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2

        # Query RustDesk ID with retry
        if (Test-Path \$rdInstalledExe) {
            \$cid = ""
            for (\$attempt = 1; \$attempt -le 6; \$attempt++) {
                \$out = cmd.exe /c "`"\$rdInstalledExe`" --get-id" 2>\$null
                if (\$out -and (\$out.Trim() -match '^\d+$')) {
                    \$cid = \$out.Trim()
                    break
                }
                Start-Sleep -Seconds 1
            }
            if (\$cid) {
                Write-Host "[OK] FSHH Remote Support ID: \$cid" -ForegroundColor Green
            } else {
                Write-Host "[OK] FSHH Remote Support Service registered." -ForegroundColor Green
            }
        } else {
            Write-Host "[OK] FSHH Remote Support binary placed." -ForegroundColor Green
        }
    } catch {
        Write-Host "[Notice] Remote support service setup skipped: \$_" -ForegroundColor Yellow
    }

    Write-Host "[3/4] Configuring hardware scanner, security radar & auto-startup..." -ForegroundColor Yellow
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "\$scriptPath" -Install -ServerUrl "{$serverUrl}"

    Write-Host "[4/4] Done! Computer hardware, remote support and security radar are now registered." -ForegroundColor Green
} catch {
    Write-Host "[Error] Installation failed: \$_" -ForegroundColor Red
}
POWERSHELL;

        return response($bootstrapScript, 200, [
            'Content-Type' => 'text/plain; charset=utf-8',
        ]);
    }

    /**
     * Download .bat installer wrapper for double-clicking
     * Clean implementation without Base64 -EncodedCommand or in-memory Invoke-Expression
     * to prevent false-positive heuristic flags by Windows Defender / AMSI.
     */
    public function downloadBat(Request $request): Response
    {
        $serverUrl = $this->resolveServerUrl($request);

        $batContent = <<<BAT
@echo off
setlocal EnableExtensions
chcp 65001 >nul
title FSHH Computer and Security Agent Installer - Fort Surasinghanat Hospital

:: -----------------------------------------------------------------------------
:: Step 1: Check Administrator privileges
:: -----------------------------------------------------------------------------
net session >nul 2>&1
if %errorlevel% equ 0 goto :RUN_INSTALL

:: -----------------------------------------------------------------------------
:: Step 2: Request UAC Elevation
:: -----------------------------------------------------------------------------
echo ===================================================================
echo   [FSHH Agent] Requesting Administrator privilege (UAC)...
echo   Please click "Yes" on the Windows confirmation dialog.
echo ===================================================================
set "FSHH_BAT_PATH=%~f0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Start-Process cmd.exe -ArgumentList ('/c `"' + \$env:FSHH_BAT_PATH + '`" ELEVATED') -Verb RunAs"
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Administrator privilege is required.
    echo Please right-click install-fshh-agent.bat and select "Run as administrator".
    echo.
    pause
)
exit /b

:RUN_INSTALL
cd /d "%~dp0"
cls
echo ===================================================================
echo   FSHH Computer and Security Radar Agent [Windows 10 / 11]
echo   Fort Surasinghanat Hospital - IM Security Management
echo   Server: {$serverUrl}
echo ===================================================================
echo.

:: 1. Ensure Agent directory exists in ProgramData
set "AGENT_DIR=%ProgramData%\SMH-Agent"
if not exist "%AGENT_DIR%" mkdir "%AGENT_DIR%"

set "SCRIPT_FILE=%AGENT_DIR%\smh-agent.ps1"
set "RUSTDESK_FILE=%AGENT_DIR%\\rustdesk.exe"
set "CA_CERT_FILE=%AGENT_DIR%\Fortinet_CA_SSL.cer"

set "SCRIPT_URL={$serverUrl}/im/agent/install.ps1?raw=1"
set "RUSTDESK_URL={$serverUrl}/im/agent/rustdesk.exe"
set "CA_CERT_URL={$serverUrl}/im/agent/fortinet-ca.cer"

:: 2. Auto-import Fortinet Hospital Root CA certificate into Windows Trusted Root Store
echo [1/4] Installing Fortinet Hospital CA Certificate...
curl.exe -fskSL "%CA_CERT_URL%" -o "%CA_CERT_FILE%" >nul 2>&1
if not exist "%CA_CERT_FILE%" (
    powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object System.Net.WebClient).DownloadFile('%CA_CERT_URL%', '%CA_CERT_FILE%')" >nul 2>&1
)
if exist "%CA_CERT_FILE%" (
    certutil -addstore -f "ROOT" "%CA_CERT_FILE%" >nul 2>&1
    echo       [OK] Fortinet Hospital CA Certificate imported to Windows Trusted Store.
) else (
    echo       [Notice] Fortinet CA file not found, skipping.
)

:: 3. Download agent script directly to disk via native curl.exe or WebClient
echo [2/4] Downloading latest FSHH Agent script from {$serverUrl}...
curl.exe -fskSL "%SCRIPT_URL%" -o "%SCRIPT_FILE%" >nul 2>&1
if not exist "%SCRIPT_FILE%" (
    powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object System.Net.WebClient).DownloadFile('%SCRIPT_URL%', '%SCRIPT_FILE%')" >nul 2>&1
)

if not exist "%SCRIPT_FILE%" (
    echo.
    echo [ERROR] Failed to download smh-agent.ps1 from {$serverUrl}
    echo Please verify network connection or server address.
    echo.
    pause
    exit /b 1
)

:: Unblock script to satisfy Windows SmartScreen
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Unblock-File -Path '%SCRIPT_FILE%' -ErrorAction SilentlyContinue"

:: 4. Setup Remote Support Service (RustDesk) if not already installed
echo [3/4] Setting up Remote Support Service...
if exist "%ProgramFiles%\\RustDesk\\rustdesk.exe" goto :RUSTDESK_ALREADY_INSTALLED

curl.exe -fskSL "%RUSTDESK_URL%" -o "%RUSTDESK_FILE%" >nul 2>&1
if not exist "%RUSTDESK_FILE%" (
    powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object System.Net.WebClient).DownloadFile('%RUSTDESK_URL%', '%RUSTDESK_FILE%')" >nul 2>&1
)
if exist "%RUSTDESK_FILE%" (
    powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Unblock-File -Path '%RUSTDESK_FILE%' -ErrorAction SilentlyContinue; Start-Process -FilePath '%RUSTDESK_FILE%' -ArgumentList '--silent-install' -WindowStyle Hidden; Start-Sleep -Seconds 5"
)
goto :RUSTDESK_DONE

:RUSTDESK_ALREADY_INSTALLED
echo       Remote Support Service is already installed.

:RUSTDESK_DONE

:: -----------------------------------------------------------------------------
:: Step 5: Interactive Prompt for Department and Assigned User
:: -----------------------------------------------------------------------------
echo.
echo ===================================================================
echo   ข้อมูลประจำเครื่องคอมพิวเตอร์ [Computer Information Registration]
echo ===================================================================
echo   ระบุข้อมูลเพื่อบันทึกลงในระบบทะเบียนทรัพย์สิน รพ.ค่ายสุรสิงหนาท
echo   [กด Enter เพื่อข้ามได้หากต้องการใช้ค่าเดิมหรือลงทะเบียนภายหลัง]
echo.

set "DEPT_INPUT="
set /p "DEPT_INPUT=>> 1. แผนก หรือ หน่วยงาน เช่น OPD, ER, เภสัชกรรม: "

set "USER_INPUT="
set /p "USER_INPUT=>> 2. ชื่อผู้รับผิดชอบ หรือ ผู้ใช้งานหลักประจำเครื่อง: "

:: 6. Register Scheduled Task and perform immediate hardware & security scan
echo.
echo [4/4] Registering Scheduled Task and executing initial scan...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_FILE%" -Install -ServerUrl "{$serverUrl}" -Department "%DEPT_INPUT%" -AssignedUser "%USER_INPUT%"

echo.
echo ===================================================================
echo   Installation finished! FSHH Agent and Security Radar are active.
echo   - หน่วยงาน: %DEPT_INPUT%
echo   - ผู้รับผิดชอบ: %USER_INPUT%
echo   ระบบลงทะเบียนเรียบร้อยแล้ว หน้าต่างนี้จะปิดลงโดยอัตโนมัติ...
echo ===================================================================
ping 127.0.0.1 -n 3 >nul
exit
BAT;

        // Enforce Windows CRLF (\r\n) line endings and UTF-8 BOM so cmd.exe executes cleanly
        $batContent = "\xEF\xBB\xBF".preg_replace("/\r?\n/", "\r\n", $batContent);

        return response($batContent, 200, [
            'Content-Type' => 'application/x-bat; charset=utf-8',
            'Content-Disposition' => 'attachment; filename="install-fshh-agent.bat"',
            'Cache-Control' => 'no-cache, no-store, must-revalidate',
        ]);
    }

    /**
     * Download Fortinet Hospital Root CA certificate (.cer)
     */
    public function fortinetCaCertificate(): Response
    {
        $path = base_path('deploy/certificates/Fortinet_CA_SSL.cer');
        if (! file_exists($path)) {
            abort(404, 'Fortinet CA certificate file not found.');
        }

        return response(file_get_contents($path), 200, [
            'Content-Type' => 'application/x-x509-ca-cert',
            'Content-Disposition' => 'attachment; filename="Fortinet_CA_SSL.cer"',
            'Cache-Control' => 'public, max-age=86400',
        ]);
    }

    /**
     * Download official RustDesk binary for Windows x64
     */
    public function rustDeskBinary(): Response
    {
        $path = base_path('deploy/rustdesk/rustdesk.exe');
        if (! file_exists($path)) {
            abort(404, 'RustDesk binary not found on server.');
        }

        return response(file_get_contents($path), 200, [
            'Content-Type' => 'application/octet-stream',
            'Content-Disposition' => 'attachment; filename="rustdesk.exe"',
        ]);
    }

    /**
     * Download signed MeshAgent binary for Windows x64
     */
    public function meshAgentBinary(): Response
    {
        $path = base_path('meshcentral/meshcentral-data/signedagents/MeshService64.exe');
        if (! file_exists($path)) {
            abort(404, 'MeshAgent binary not found on server.');
        }

        return response(file_get_contents($path), 200, [
            'Content-Type' => 'application/octet-stream',
            'Content-Disposition' => 'attachment; filename="meshagent.exe"',
        ]);
    }

    /**
     * Download dynamic meshagent.msh configuration
     */
    public function meshAgentSettings(Request $request): Response
    {
        $serverUrl = $this->resolveServerUrl($request);
        $parsed = parse_url($serverUrl);
        $host = $parsed['host'] ?? '192.168.1.214';

        if ($host === 'fshh-app.online' || str_ends_with($host, 'fshh-app.online')) {
            $meshServer = 'wss://mc.fshh-app.online/agent.ashx';
        } else {
            $meshServer = "wss://{$host}:8443/agent.ashx";
        }

        $mshContent = <<<MSH
MeshName=SMH-Workstations
MeshType=2
MeshID=0xC487F6458355523F0B7D602F7306F997598D8BCEA62465A3C2DBFEC612E87431EC1304C31E5B015C090ED4DFEA4EE4A3
ServerID=9ACDF34013171A00A6D686467851017C1D7C24E0F9860BF6B1136D728B7B63B57177052DED1CEC4A660C54D0A3C597E1
MeshServer={$meshServer}
displayName=FSHH Remote Support Agent
description=Fort Surasinghanat Hospital Remote Support Service
companyName=Fort Surasinghanat Hospital
meshServiceName=FSHH-MeshAgent
MSH;

        return response($mshContent, 200, [
            'Content-Type' => 'text/plain; charset=utf-8',
            'Content-Disposition' => 'attachment; filename="meshagent.msh"',
            'Cache-Control' => 'no-cache, no-store, must-revalidate',
        ]);
    }

    /**
     * Resolve Remote Desktop URL & ID for an asset (One-Click Consent, Zero Password)
     */
    public function remoteConnect(Request $request, Asset $asset): JsonResponse
    {
        $serverUrl = $this->resolveServerUrl($request);
        $parsed = parse_url($serverUrl);
        $host = $parsed['host'] ?? '192.168.1.214';

        // 1. RustDesk integration (Primary & Recommended)
        $remoteId = $asset->remote_id ?: $asset->systemSpec?->remote_id;
        if ($remoteId) {
            return response()->json([
                'success' => true,
                'protocol' => 'rustdesk',
                'remote_id' => $remoteId,
                'rustdesk_url' => "rustdesk://{$remoteId}",
                'asset_name' => $asset->name,
                'host' => $host,
                'consent_policy' => 'One-Click Consent (ผู้ใช้หน้าเครื่องกด Accept / ยอมรับ เมื่อมีการเชื่อมต่อ)',
            ]);
        }

        // 2. Fallback to MeshCentral if available
        $nodeId = $this->findMeshNodeByAsset($asset);

        if (! $nodeId) {
            return response()->json([
                'success' => false,
                'message' => 'คอมพิวเตอร์เครื่องนี้ (' . ($asset->name ?? $asset->asset_code) . ') ยังไม่ปรากฏ Remote ID ในระบบ กรุณารันตัวติดตั้ง .bat ที่เครื่องลูกข่ายอีกครั้ง',
                'asset_name' => $asset->name,
            ], 404);
        }

        // Auto-authenticate into MeshCentral without login prompt:
        $authParams = 'user=admin&pass=' . urlencode('SmhAdmin2026!') . '&gotonode=' . urlencode($nodeId) . '&viewmode=11';

        if ($host === 'fshh-app.online' || str_ends_with($host, 'fshh-app.online')) {
            $remoteUrl = "https://mc.fshh-app.online/?{$authParams}";
        } else {
            $remoteUrl = "https://{$host}:8443/?{$authParams}";
        }

        return response()->json([
            'success' => true,
            'protocol' => 'meshcentral',
            'node_id' => $nodeId,
            'remote_url' => $remoteUrl,
            'asset_name' => $asset->name,
            'host' => $host,
            'consent_policy' => 'Prompt on connect (ผู้ใช้หน้าเครื่องต้องกด Allow อนุญาต)',
        ]);
    }

    /**
     * Helper to match Asset with MeshCentral node
     */
    private function findMeshNodeByAsset(Asset $asset): ?string
    {
        $dbPath = base_path('meshcentral/meshcentral-data/meshcentral.db');
        if (! file_exists($dbPath)) {
            return null;
        }

        $lines = file($dbPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if (! $lines) {
            return null;
        }

        $spec = $asset->systemSpec;

        // Collect all possible candidate names (e.g. Asset name, Windows Hostname)
        $candidateNames = array_values(array_filter(array_unique([
            strtolower(trim($asset->name ?? '')),
            strtolower(trim($spec?->hostname ?? '')),
        ])));

        // Collect all possible candidate MACs (Asset MAC, Spec MAC, Adapter MACs)
        $rawMacs = [];
        if ($asset->mac_address) {
            $rawMacs[] = $asset->mac_address;
        }
        if ($spec?->mac_address) {
            $rawMacs[] = $spec->mac_address;
        }
        if (! empty($spec?->network_details['adapters']) && is_array($spec->network_details['adapters'])) {
            foreach ($spec->network_details['adapters'] as $ad) {
                if (! empty($ad['mac'])) {
                    $rawMacs[] = $ad['mac'];
                }
            }
        }
        $candidateMacs = array_values(array_filter(array_unique(array_map(function ($m) {
            return strtoupper(str_replace([':', '-', '.', ' '], '', (string) $m));
        }, $rawMacs))));

        $candidateIp = trim($spec?->ip_address ?? '');

        // Pass 1: exact match by node name (hostname)
        if (! empty($candidateNames)) {
            foreach ($lines as $line) {
                $item = json_decode($line, true);
                if (! $item || ! isset($item['type']) || $item['type'] !== 'node') {
                    continue;
                }

                $nodeName = strtolower(trim($item['name'] ?? ''));
                if ($nodeName !== '' && in_array($nodeName, $candidateNames, true)) {
                    return $item['_id'] ?? null;
                }
            }
        }

        // Pass 2: match by MAC address in interface entries
        if (! empty($candidateMacs)) {
            foreach ($lines as $line) {
                $item = json_decode($line, true);
                if (! $item || ! isset($item['type']) || $item['type'] !== 'ifinfo') {
                    continue;
                }

                $netif2 = $item['netif2'] ?? [];
                foreach ($netif2 as $ifList) {
                    if (! is_array($ifList)) {
                        continue;
                    }
                    foreach ($ifList as $iface) {
                        $mac = strtoupper(str_replace([':', '-', '.', ' '], '', $iface['mac'] ?? ''));
                        if ($mac !== '' && in_array($mac, $candidateMacs, true)) {
                            $ifId = $item['_id'] ?? '';
                            if (str_starts_with($ifId, 'ifnode//')) {
                                return 'node//' . substr($ifId, 8);
                            }
                        }
                    }
                }
            }
        }

        // Pass 3: match by IP address
        if ($candidateIp !== '' && filter_var($candidateIp, FILTER_VALIDATE_IP)) {
            foreach ($lines as $line) {
                $item = json_decode($line, true);
                if (! $item || ! isset($item['type']) || $item['type'] !== 'node') {
                    continue;
                }

                $nodeIp = trim($item['ip'] ?? ($item['host'] ?? ''));
                if ($nodeIp !== '' && $nodeIp === $candidateIp) {
                    return $item['_id'] ?? null;
                }
            }
        }

        // Pass 4: fuzzy match if hostname contains targetName or vice versa
        foreach ($candidateNames as $tName) {
            if (strlen($tName) >= 3) {
                foreach ($lines as $line) {
                    $item = json_decode($line, true);
                    if (! $item || ! isset($item['type']) || $item['type'] !== 'node') {
                        continue;
                    }

                    $nodeName = strtolower(trim($item['name'] ?? ''));
                    if (str_contains($nodeName, $tName) || str_contains($tName, $nodeName)) {
                        return $item['_id'] ?? null;
                    }
                }
            }
        }

        return null;
    }

    /**
     * Ingest agent hardware report & live stats (CSRF exempt)
     */
    public function report(Request $request): JsonResponse
    {
        $data = $request->all();

        $macRaw = $data['mac_address'] ?? null;
        $normalizedMac = AssetMacLookup::normalize($macRaw);
        $machineGuid = $data['machine_guid'] ?? null;
        $hostname = $data['hostname'] ?? null;

        // Reject empty/corrupted packets to avoid creating bogus assets
        if (empty($macRaw) && empty($machineGuid) && empty($hostname)) {
            return response()->json([
                'success' => false,
                'message' => 'Payload missing identity attributes (MAC, GUID, or Hostname).',
            ], 422);
        }

        // Collect all candidate MACs from payload (primary and adapters)
        $incomingMacs = [];
        if ($macRaw) {
            $incomingMacs[] = $macRaw;
        }
        if (! empty($data['network_details']['adapters']) && is_array($data['network_details']['adapters'])) {
            foreach ($data['network_details']['adapters'] as $adapter) {
                if (! empty($adapter['mac'])) {
                    $incomingMacs[] = $adapter['mac'];
                }
            }
        }
        $cleanedIncomingMacs = array_values(array_filter(array_unique(array_map(function ($m) {
            return strtolower(preg_replace('/[^a-f0-9]/i', '', (string) $m));
        }, $incomingMacs))));

        // Try finding matching asset
        $asset = null;

        // 1. Match by Machine GUID in existing spec
        if ($machineGuid) {
            $existingSpec = AssetSpec::where('machine_guid', $machineGuid)->first();
            if ($existingSpec && $existingSpec->asset) {
                $asset = $existingSpec->asset;
            }
        }

        // 2. Match by MAC address against existing hospital inventory
        if (! $asset && ! empty($cleanedIncomingMacs)) {
            $candidateAssets = Asset::whereNotNull('mac_address')->where('mac_address', '!=', '')->get();
            foreach ($candidateAssets as $candidate) {
                $dbMacClean = strtolower(preg_replace('/[^a-f0-9]/i', '', (string) $candidate->mac_address));
                if (empty($dbMacClean)) {
                    continue;
                }
                foreach ($cleanedIncomingMacs as $inMac) {
                    if ($dbMacClean === $inMac) {
                        $asset = $candidate;
                        break 2;
                    }
                    if (strlen($dbMacClean) === 11 && strlen($inMac) === 12 && str_ends_with($inMac, substr($dbMacClean, -10))) {
                        $asset = $candidate;
                        break 2;
                    }
                }
            }
        }

        // 3. Match by hostname
        if (! $asset && $hostname) {
            $asset = Asset::where('name', $hostname)->first();
        }

        $cpuName = $data['cpu_name'] ?? ($data['cpu_details']['name'] ?? null);
        $osName = $data['os_name'] ?? null;
        $brand = $data['brand'] ?? null;
        $ramGb = $data['ram_total_gb'] ?? null;
        $loggedUser = $data['logged_user'] ?? null;
        $remoteId = $data['remote_id'] ?? null;
        $incomingDept = ! empty($data['department']) ? trim((string) $data['department']) : null;
        $incomingUser = ! empty($data['assigned_user']) ? trim((string) $data['assigned_user']) : null;

        if ($asset) {
            // Update existing asset with latest hardware info while preserving hospital data
            $updates = [];

            // Update assigned_user if explicitly sent from agent, or fallback to loggedUser if generic
            if (! empty($incomingUser)) {
                $updates['assigned_user'] = $incomingUser;
            } else {
                $currentAssigned = trim((string) ($asset->assigned_user ?? ''));
                $isGenericUser = in_array(strtolower($currentAssigned), ['', 'admin', 'user', 'it', 'administrator']);
                if ($isGenericUser && ! empty($loggedUser)) {
                    $updates['assigned_user'] = $loggedUser;
                }
            }

            // Update department if explicitly sent from agent (non-empty)
            if (! empty($incomingDept)) {
                $updates['department'] = $incomingDept;
            }

            if ($brand && ! $asset->brand) {
                $updates['brand'] = $brand;
            }
            if ($cpuName) {
                $updates['cpu'] = $cpuName;
            }
            if ($osName) {
                $updates['os'] = $osName;
            }
            if ($normalizedMac && (! $asset->mac_address || $asset->mac_address === '')) {
                $updates['mac_address'] = $normalizedMac;
            }
            if ($remoteId) {
                $updates['remote_id'] = $remoteId;
            }
            if (! empty($updates)) {
                $asset->update($updates);
                app(AssetMacLookup::class)->forgetCache();
            }
        } else {
            // Auto-create NEW asset if not in existing inventory
            $assetCode = 'PC-'.date('ymd').'-'.str_pad((string) (Asset::whereDate('created_at', today())->count() + 1), 3, '0', STR_PAD_LEFT);
            $asset = Asset::create([
                'asset_code' => $assetCode,
                'name' => $hostname ?: 'PC-'.$normalizedMac,
                'brand' => $brand,
                'type' => 'hardware',
                'device_type' => 'computer',
                'cpu' => $cpuName,
                'os' => $osName,
                'mac_address' => $normalizedMac,
                'remote_id' => $remoteId,
                'license_status' => 'licensed',
                'quantity' => 1,
                'status' => 'active',
                'assigned_user' => $incomingUser ?: $loggedUser,
                'department' => $incomingDept,
                'spec' => ($ramGb ? "RAM {$ramGb} GB" : '').($cpuName ? " / {$cpuName}" : ''),
                'note' => 'เพิ่มอัตโนมัติผ่าน FSHH Agent เมื่อ '.now()->toDateTimeString(),
            ]);

            app(AssetMacLookup::class)->forgetCache();
        }

        // Extract Security Radar & Threat telemetry (filter out Real-time protection & self-agent triggers)
        $security = $data['security'] ?? null;
        if (is_array($security)) {
            $selfKeywords = ['smh-agent', 'smh_agent', 'install-fshh', 'rustdesk', 'ar25b4kv5ysi', 'powershell.exe', 'encodedcommand', 'microsoft defender antivirus has detected'];

            if (! empty($security['alerts']) && is_array($security['alerts'])) {
                $security['alerts'] = array_values(array_filter($security['alerts'], function ($a) use ($selfKeywords) {
                    $low = strtolower((string) $a);
                    if (str_contains($low, 'real-time protection') || str_contains($low, 'realtime protection')) {
                        return false;
                    }
                    if (str_contains($low, 'quarantined') || str_contains($low, 'remediated')) {
                        return false;
                    }
                    foreach ($selfKeywords as $kw) {
                        if (str_contains($low, $kw)) {
                            return false;
                        }
                    }
                    return true;
                }));
            }

            if (! empty($security['active_threats']) && is_array($security['active_threats'])) {
                $security['active_threats'] = array_values(array_filter($security['active_threats'], function ($t) use ($selfKeywords) {
                    $action = strtolower((string) ($t['action_taken'] ?? ''));
                    if (in_array($action, ['quarantined', 'removed', 'cleaned', 'remediated/quarantined', 'remediated'], true)) {
                        return false;
                    }
                    $path = strtolower((string) ($t['path'] ?? ''));
                    $name = strtolower((string) ($t['name'] ?? ''));
                    foreach ($selfKeywords as $kw) {
                        if (str_contains($path, $kw) || str_contains($name, $kw)) {
                            return false;
                        }
                    }
                    return true;
                }));
            }

            // Recalculate threat score & level without self-agent false positives
            $hasActiveMalware = ! empty($security['active_threats']);
            $hasVpn = ! empty($security['vpn_detected']);
            $hasHackerTools = ! empty($security['anomalies']['hacker_tools']);
            $isBruteForce = ! empty($security['anomalies']['is_brute_force']);

            $recalcScore = 0;
            if ($hasVpn) {
                $recalcScore += 25;
            }
            if ($hasActiveMalware) {
                $recalcScore += 60;
            }
            if ($hasHackerTools) {
                $recalcScore += 65;
            }
            if ($isBruteForce) {
                $recalcScore += 30;
            }

            $security['threat_score'] = min(100, $recalcScore);
            $threatScore = $security['threat_score'];
            if ($threatScore >= 60) {
                $threatLevel = 'critical';
            } elseif ($threatScore >= 20) {
                $threatLevel = 'warning';
            } else {
                $threatLevel = 'normal';
            }
            $security['threat_level'] = $threatLevel;
        }

        $threatLevel = $security['threat_level'] ?? 'normal';
        $threatScore = (int) ($security['threat_score'] ?? 0);
        $vpnDetected = (bool) ($security['vpn_detected'] ?? false);
        $threatDetectedAt = ($threatLevel !== 'normal' || $vpnDetected) ? now() : null;

        // Update or insert latest specifications (1:1 with Asset)
        // Only latest spec is kept (no log accumulation)
        AssetSpec::updateOrCreate(
            ['asset_id' => $asset->id],
            [
                'machine_guid' => $machineGuid,
                'hostname' => $hostname,
                'remote_id' => $remoteId,
                'brand' => $brand,
                'model' => $data['model'] ?? null,
                'serial_number' => $data['serial_number'] ?? null,
                'ip_address' => $data['ip_address'] ?? null,
                'subnet_mask' => $data['subnet_mask'] ?? null,
                'gateway' => $data['gateway'] ?? null,
                'mac_address' => $normalizedMac ?: $macRaw,
                'os_name' => $osName,
                'os_build' => $data['os_build'] ?? null,
                'ram_total_gb' => $ramGb,
                'ram_slots_summary' => $data['ram_slots_summary'] ?? null,
                'cpu_name' => $cpuName,
                'cpu_details' => $data['cpu_details'] ?? null,
                'memory_details' => $data['memory_details'] ?? null,
                'motherboard_details' => $data['motherboard_details'] ?? null,
                'disk_details' => $data['disk_details'] ?? null,
                'gpu_details' => $data['gpu_details'] ?? null,
                'network_details' => $data['network_details'] ?? null,
                'logged_user' => $loggedUser,
                'agent_version' => $data['agent_version'] ?? '1.0.0',
                'threat_level' => $threatLevel,
                'threat_score' => $threatScore,
                'vpn_detected' => $vpnDetected,
                'security_status' => $security,
                'threat_detected_at' => $threatDetectedAt,
                'last_seen_at' => now(),
            ]
        );

        // Store instant live stats & security telemetry in Cache (transient)
        if (! empty($data['live_stats'])) {
            Cache::put('im_live_stats_'.$asset->id, $data['live_stats'], 90);
        }
        if (! empty($security)) {
            Cache::put('im_live_security_'.$asset->id, $security, 300);
        }
        Cache::put('im_agent_last_seen_'.$asset->id, now()->timestamp, 300);

        // Automated Incident Response: create high-priority Service Desk ticket on critical threat
        if ($threatLevel === 'critical') {
            $existingOpenTicket = ServiceTicket::where('category', 'ความปลอดภัย (Security)')
                ->where('status', 'open')
                ->where('title', 'like', "%{$asset->name}%")
                ->where('created_at', '>=', now()->subHours(24))
                ->exists();

            if (! $existingOpenTicket) {
                $ticketNo = 'TK-'.date('ymd').'-'.str_pad((string) (ServiceTicket::whereDate('created_at', today())->count() + 1), 3, '0', STR_PAD_LEFT);
                $alertLines = ! empty($security['alerts']) ? implode("\n- ", (array) $security['alerts']) : 'ตรวจพบภัยคุกคามความปลอดภัยระดับวิกฤต (มัลแวร์/แฮกเกอร์)';
                ServiceTicket::create([
                    'ticket_no' => $ticketNo,
                    'title' => "[ภัยคุกคามไซเบอร์] ตรวจพบความเสี่ยงระดับวิกฤตบนเครื่อง {$asset->name}",
                    'description' => "ระบบตรวจพบภัยคุกคามอัตโนมัติจาก FSHH Security Radar:\n- {$alertLines}\n\nข้อมูลเครื่อง:\n- ชื่อเครื่อง: {$asset->name}\n- IP: " . ($data['ip_address'] ?? '-') . "\n- MAC: " . ($normalizedMac ?: $asset->mac_address ?: '-') . "\n- ผู้ใช้งาน: " . ($loggedUser ?: '-') . "\n- ตรวจพบเมื่อ: " . now()->format('d/m/Y H:i:s'),
                    'requester' => 'FSHH Security Radar (อัตโนมัติ)',
                    'department' => $asset->department ?: 'กลุ่มงานสารสนเทศทางการแพทย์ (IM)',
                    'category' => 'ความปลอดภัย (Security)',
                    'priority' => 'urgent',
                    'sla_hours' => 4,
                    'status' => 'open',
                    'opened_at' => now(),
                ]);
            }
        }

        // Check if an admin is currently inspecting this asset in browser
        $isLiveMode = Cache::has('im_live_watch_'.$asset->id);

        return response()->json([
            'success' => true,
            'asset_id' => $asset->id,
            'live_mode' => $isLiveMode,
        ]);
    }

    private function resolveServerUrl(Request $request): string
    {
        $customHost = $request->query('host');
        $baseUrl = rtrim(url('/'), '/');

        if ($customHost) {
            $isDomain = str_contains($customHost, 'fshh-app.online') || (! preg_match('/^\d+\.\d+\.\d+\.\d+$/', $customHost) && ! str_contains($customHost, 'localhost'));
            $scheme = $isDomain ? 'https' : (parse_url($baseUrl, PHP_URL_SCHEME) ?? 'http');
            $path = $isDomain ? '' : (parse_url($baseUrl, PHP_URL_PATH) ?? '');
            $port = '';
            if (! $isDomain && ($parsedPort = parse_url($baseUrl, PHP_URL_PORT))) {
                $port = ':'.$parsedPort;
            }
            return $scheme.'://'.$customHost.$port.$path;
        }

        $host = $request->getHost();
        if ($host === 'localhost' || $host === '127.0.0.1' || $host === '::1') {
            $lanIp = $this->getServerLanIp();
            if ($lanIp && $lanIp !== '127.0.0.1') {
                $parsed = parse_url($baseUrl);
                $scheme = $parsed['scheme'] ?? 'http';
                $port = isset($parsed['port']) ? ':'.$parsed['port'] : '';
                $path = $parsed['path'] ?? '';
                return $scheme.'://'.$lanIp.$port.$path;
            }
        }

        return $baseUrl;
    }

    private function getServerLanIp(): string
    {
        $ip = gethostbyname(gethostname());
        if ($ip && filter_var($ip, FILTER_VALIDATE_IP) && ! str_starts_with($ip, '127.')) {
            return $ip;
        }

        return '192.168.1.214';
    }
}
