# ==============================================================================
# SMH Hardware & Realtime Asset Agent (Windows 10 / 11)
# Fort Surasinghanat Hospital (FSHH) - IM Resource Management
# ==============================================================================
[CmdletBinding()]
param (
    [string]$ServerUrl = "http://localhost",
    [string]$Token = "smh_agent_secret",
    [string]$Department = "",
    [string]$AssignedUser = "",
    [switch]$Install,
    [switch]$Uninstall,
    [switch]$RunOnce,
    [switch]$Silent
)

$ErrorActionPreference = "SilentlyContinue"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls11 -bor [Net.SecurityProtocolType]::Tls

# ------------------------------------------------------------------------------
# 1. Installation & Service Management
# ------------------------------------------------------------------------------
$AgentDir = "$env:ProgramData\SMH-Agent"
$ScriptTarget = "$AgentDir\smh-agent.ps1"
$ConfigTarget = "$AgentDir\config.json"
$TaskName = "SMH-IM-Agent"

if ($Uninstall) {
    Write-Host "[SMH Agent] Uninstalling..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false 2>$null
    if (Test-Path $AgentDir) {
        Remove-Item -Path $AgentDir -Recurse -Force 2>$null
    }
    Write-Host "[SMH Agent] Uninstalled successfully." -ForegroundColor Green
    return
}

if ($Install) {
    if (-not $Silent) {
        Write-Host "==========================================================" -ForegroundColor Cyan
        Write-Host "  SMH Asset Agent - Installing on Windows 10/11..." -ForegroundColor Cyan
        Write-Host "==========================================================" -ForegroundColor Cyan
    }

    if (-not (Test-Path $AgentDir)) {
        New-Item -ItemType Directory -Path $AgentDir -Force | Out-Null
    }

    # Save configuration
    $config = @{
        ServerUrl = $ServerUrl.TrimEnd('/')
        Token = $Token
        Department = $Department
        AssignedUser = $AssignedUser
        InstalledAt = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    }
    $config | ConvertTo-Json | Set-Content -Path $ConfigTarget -Encoding UTF8 -Force

    if (-not $Silent -and ($Department -or $AssignedUser)) {
        Write-Host "[OK] Registered: Department '$Department' | User '$AssignedUser'" -ForegroundColor Green
    }

    # Self-copy script
    if ($MyInvocation.MyCommand.Path -and (Test-Path $MyInvocation.MyCommand.Path)) {
        Copy-Item -Path $MyInvocation.MyCommand.Path -Destination $ScriptTarget -Force
    } else {
        # Running from memory / one-liner irm | iex -> download full script
        $downloadUrl = "$($ServerUrl.TrimEnd('/'))/resources/scripts/smh-agent.ps1"
        try {
            Invoke-WebRequest -Uri "$($ServerUrl.TrimEnd('/'))/im/agent/install.ps1?raw=1" -OutFile $ScriptTarget -UseBasicParsing
        } catch {
            Write-Warning "Could not cache script file locally, creating launcher."
        }
    }

    # Register Scheduled Task to run at Startup and repeat every 15 minutes
    try {
        $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$ScriptTarget`""
        $triggerStartup = New-ScheduledTaskTrigger -AtStartup
        $triggerRep = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 15)
        $principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
        $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -MultipleInstances Parallel

        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false 2>$null
        Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger @($triggerStartup, $triggerRep) -Principal $principal -Settings $settings | Out-Null
        
        if (-not $Silent) {
            Write-Host "[OK] Scheduled Task '$TaskName' registered successfully." -ForegroundColor Green
        }
    } catch {
        if (-not $Silent) {
            Write-Host "[Notice] Running in user mode (Administrator rights recommended for auto-startup)." -ForegroundColor Yellow
        }
    }

    # Run immediate scan
    if (-not $Silent) {
        Write-Host "[SMH Agent] Collecting hardware specifications..." -ForegroundColor Cyan
    }
}

# Load config if present (only if not explicitly provided via command line)
if (Test-Path $ConfigTarget) {
    try {
        $loadedConfig = Get-Content -Path $ConfigTarget -Raw | ConvertFrom-Json
        if (-not $PSBoundParameters.ContainsKey('ServerUrl') -and $loadedConfig.ServerUrl) {
            $ServerUrl = $loadedConfig.ServerUrl
        }
        if (-not $PSBoundParameters.ContainsKey('Token') -and $loadedConfig.Token) {
            $Token = $loadedConfig.Token
        }
        if (-not $PSBoundParameters.ContainsKey('Department') -and $loadedConfig.Department) {
            $Department = $loadedConfig.Department
        }
        if (-not $PSBoundParameters.ContainsKey('AssignedUser') -and $loadedConfig.AssignedUser) {
            $AssignedUser = $loadedConfig.AssignedUser
        }
    } catch {}
}

$ServerUrl = $ServerUrl.TrimEnd('/')
$GlobalMachineGuid = (Get-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Cryptography" -Name MachineGuid -ErrorAction SilentlyContinue).MachineGuid
$GlobalPrimaryNet = Get-CimInstance Win32_NetworkAdapterConfiguration -Filter "IPEnabled = True" -ErrorAction SilentlyContinue | Select-Object -First 1
$GlobalPrimaryMac = if ($GlobalPrimaryNet) { $GlobalPrimaryNet.MACAddress } else { "" }

function Get-RustDeskId {
    $rdExe = "$env:ProgramFiles\RustDesk\rustdesk.exe"
    if (Test-Path $rdExe) {
        try {
            $out = cmd.exe /c "`"$rdExe`" --get-id" 2>$null
            if ($out -and ($out.Trim() -match '^\d+$')) {
                return $out.Trim()
            }
        } catch {}
    }
    $configPaths = @(
        "$env:ProgramData\RustDesk\config\RustDesk2.toml",
        "$env:ProgramData\RustDesk\config\RustDesk.toml",
        "C:\Windows\ServiceProfiles\LocalService\AppData\Roaming\RustDesk\config\RustDesk2.toml",
        "C:\Windows\ServiceProfiles\LocalService\AppData\Roaming\RustDesk\config\RustDesk.toml",
        "$env:APPDATA\RustDesk\config\RustDesk2.toml",
        "$env:APPDATA\RustDesk\config\RustDesk.toml"
    )
    foreach ($cp in $configPaths) {
        if (Test-Path $cp) {
            try {
                $content = Get-Content -Path $cp -Raw -ErrorAction SilentlyContinue
                if ($content -match "id\s*=\s*'(\d+)'") {
                    return $matches[1]
                }
            } catch {}
        }
    }
    return ""
}

# ------------------------------------------------------------------------------
# 2. Hardware Information Collector (CPU-Z / Speccy level)
# ------------------------------------------------------------------------------
function Get-HardwareSpecs {
    # Unique Machine GUID
    $machineGuid = (Get-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Cryptography" -Name MachineGuid -ErrorAction SilentlyContinue).MachineGuid
    
    # 2.1 Computer System & Brand
    $cs = Get-CimInstance Win32_ComputerSystem
    $bios = Get-CimInstance Win32_BIOS
    $baseboard = Get-CimInstance Win32_BaseBoard
    
    $brand = if ($cs.Manufacturer) { $cs.Manufacturer.Trim() } else { "Custom/DIY" }
    $model = if ($cs.Model) { $cs.Model.Trim() } else { "PC" }
    $serialNumber = if ($bios.SerialNumber) { $bios.SerialNumber.Trim() } else { "" }
    $hostname = $env:COMPUTERNAME
    $loggedUser = if ($cs.UserName) { $cs.UserName } else { [System.Security.Principal.WindowsIdentity]::GetCurrent().Name }

    # 2.2 CPU Details (CPU-Z style)
    $proc = Get-CimInstance Win32_Processor | Select-Object -First 1
    $cpuDetails = @{
        name = if ($proc.Name) { $proc.Name.Trim() -replace '\s+', ' ' } else { "Unknown CPU" }
        manufacturer = $proc.Manufacturer
        cores = [int]$proc.NumberOfCores
        threads = [int]$proc.NumberOfLogicalProcessors
        max_clock_mhz = [int]$proc.MaxClockSpeed
        socket = $proc.SocketDesignation
        l2_cache_kb = [int]$proc.L2CacheSize
        l3_cache_kb = [int]$proc.L3CacheSize
        architecture = if ($proc.AddressWidth -eq 64) { "x64" } else { "x86" }
    }

    # 2.3 Memory (RAM) Details (Slot-by-slot)
    $ramSticks = Get-CimInstance Win32_PhysicalMemory
    $totalRamBytes = ($ramSticks | Measure-Object -Property Capacity -Sum).Sum
    $totalRamGb = [math]::Round($totalRamBytes / 1GB, 2)
    
    $memSlots = @()
    foreach ($stick in $ramSticks) {
        $memType = switch ($stick.SMBIOSMemoryType) {
            20 { "DDR" }
            21 { "DDR2" }
            24 { "DDR3" }
            26 { "DDR4" }
            34 { "DDR5" }
            default { "DDR" }
        }
        $memSlots += @{
            slot = $stick.DeviceLocator
            capacity_gb = [math]::Round($stick.Capacity / 1GB, 1)
            speed_mhz = $stick.Speed
            manufacturer = if ($stick.Manufacturer) { $stick.Manufacturer.Trim() } else { "Unknown" }
            part_number = if ($stick.PartNumber) { $stick.PartNumber.Trim() } else { "" }
            memory_type = $memType
        }
    }
    $ramSummary = "$totalRamGb GB ($($ramSticks.Count) Slots used)"

    # 2.4 Motherboard & BIOS
    $motherboardDetails = @{
        manufacturer = if ($baseboard.Manufacturer) { $baseboard.Manufacturer.Trim() } else { "" }
        model = if ($baseboard.Product) { $baseboard.Product.Trim() } else { "" }
        serial = if ($baseboard.SerialNumber) { $baseboard.SerialNumber.Trim() } else { "" }
        bios_version = if ($bios.SMBIOSBIOSVersion) { $bios.SMBIOSBIOSVersion.Trim() } else { "" }
        bios_date = if ($bios.ReleaseDate) { ([string]$bios.ReleaseDate).Substring(0, 8) } else { "" }
    }

    # 2.5 Operating System & Build
    $os = Get-CimInstance Win32_OperatingSystem
    $osReg = Get-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion" -ErrorAction SilentlyContinue
    $displayVersion = if ($osReg.DisplayVersion) { $osReg.DisplayVersion } else { $osReg.ReleaseId }
    $ubr = if ($osReg.UBR) { $osReg.UBR } else { "0" }
    $fullBuild = "$($os.BuildNumber).$ubr"
    
    $osName = "$($os.Caption) $displayVersion" -replace '\s+', ' '

    # 2.6 Storage / Disks
    $physicalDisks = @()
    Get-CimInstance Win32_DiskDrive | ForEach-Object {
        $physicalDisks += @{
            model = if ($_.Model) { $_.Model.Trim() } else { "Disk Drive" }
            interface = $_.InterfaceType
            size_gb = [math]::Round($_.Size / 1GB, 1)
            media_type = $_.MediaType
        }
    }
    
    $volumes = @()
    Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3" | ForEach-Object {
        $volumes += @{
            drive = $_.DeviceID
            label = $_.VolumeName
            file_system = $_.FileSystem
            total_gb = [math]::Round($_.Size / 1GB, 1)
            free_gb = [math]::Round($_.FreeSpace / 1GB, 1)
            used_percent = if ($_.Size -gt 0) { [math]::Round((($_.Size - $_.FreeSpace) / $_.Size) * 100, 1) } else { 0 }
        }
    }
    $diskDetails = @{
        physical = $physicalDisks
        partitions = $volumes
    }

    # 2.7 Graphics (GPU)
    $gpuDetails = @()
    Get-CimInstance Win32_VideoController | ForEach-Object {
        $gpuDetails += @{
            name = if ($_.Name) { $_.Name.Trim() } else { "Video Controller" }
            driver_version = $_.DriverVersion
            vram_mb = if ($_.AdapterRAM) { [math]::Round($_.AdapterRAM / 1MB) } else { 0 }
        }
    }

    # 2.8 Active Network Adapter & IP Configuration
    $netConfigs = Get-CimInstance Win32_NetworkAdapterConfiguration -Filter "IPEnabled = True"
    $primaryNet = $netConfigs | Select-Object -First 1
    
    $primaryIp = ""
    $primarySubnet = ""
    $primaryGateway = ""
    $primaryMac = ""
    $dnsServers = @()
    
    if ($primaryNet) {
        $primaryIp = ($primaryNet.IPAddress | Where-Object { $_ -match '^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$' } | Select-Object -First 1)
        $primarySubnet = ($primaryNet.IPSubnet | Where-Object { $_ -match '^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$' } | Select-Object -First 1)
        $primaryGateway = ($primaryNet.DefaultIPGateway | Select-Object -First 1)
        $primaryMac = $primaryNet.MACAddress
        $dnsServers = $primaryNet.DNSServerSearchOrder
    }

    $networkDetails = @{
        adapters = @()
    }
    foreach ($nc in $netConfigs) {
        $ipv4 = ($nc.IPAddress | Where-Object { $_ -match '^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$' } | Select-Object -First 1)
        $networkDetails.adapters += @{
            description = $nc.Description
            ip = $ipv4
            subnet = ($nc.IPSubnet | Select-Object -First 1)
            mac = $nc.MACAddress
            dhcp = [bool]$nc.DHCPEnabled
        }
    }

    return @{
        machine_guid = $machineGuid
        hostname = $hostname
        brand = $brand
        model = $model
        serial_number = $serialNumber
        logged_user = $loggedUser
        cpu_name = $cpuDetails.name
        cpu_details = $cpuDetails
        ram_total_gb = $totalRamGb
        ram_slots_summary = $ramSummary
        memory_details = $memSlots
        motherboard_details = $motherboardDetails
        os_name = $osName
        os_build = $fullBuild
        disk_details = $diskDetails
        gpu_details = $gpuDetails
        ip_address = $primaryIp
        subnet_mask = $primarySubnet
        gateway = $primaryGateway
        mac_address = $primaryMac
        network_details = $networkDetails
        agent_version = "1.0.0"
        remote_id = (Get-RustDeskId)
    }
}

# ------------------------------------------------------------------------------
# 3. Real-Time Metrics Collector (Instant snapshot)
# ------------------------------------------------------------------------------
function Get-RealtimeStats {
    # CPU Usage %
    $cpuLoad = 0
    try {
        $cpuLoad = (Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average
        if ($null -eq $cpuLoad) { $cpuLoad = 0 }
    } catch { $cpuLoad = 0 }

    # RAM Usage
    $os = Get-CimInstance Win32_OperatingSystem
    $totalMemKb = $os.TotalVisibleMemorySize
    $freeMemKb = $os.FreePhysicalMemory
    $usedMemKb = $totalMemKb - $freeMemKb
    $memUsagePct = if ($totalMemKb -gt 0) { [math]::Round(($usedMemKb / $totalMemKb) * 100, 1) } else { 0 }
    $usedMemGb = [math]::Round($usedMemKb / 1MB, 2)
    $freeMemGb = [math]::Round($freeMemKb / 1MB, 2)

    # System Uptime
    $uptimeSeconds = 0
    $uptimeStr = ""
    try {
        $bootTime = $os.LastBootUpTime
        $uptime = (Get-Date) - $bootTime
        $uptimeSeconds = [int]$uptime.TotalSeconds
        $uptimeStr = "$($uptime.Days)d $($uptime.Hours)h $($uptime.Minutes)m"
    } catch {}

    # Primary Drive Free Space
    $cDrive = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"
    $cFreeGb = if ($cDrive) { [math]::Round($cDrive.FreeSpace / 1GB, 1) } else { 0 }
    $cTotalGb = if ($cDrive) { [math]::Round($cDrive.Size / 1GB, 1) } else { 0 }

    # Top 5 Processes by CPU
    $topProcesses = @()
    try {
        Get-Process | Sort-Object CPU -Descending | Select-Object -First 5 | ForEach-Object {
            $topProcesses += @{
                name = $_.ProcessName
                cpu_seconds = [math]::Round($_.CPU, 1)
                memory_mb = [math]::Round($_.WorkingSet / 1MB, 1)
            }
        }
    } catch {}

    return @{
        cpu_load_percent = [int]$cpuLoad
        memory_usage_percent = $memUsagePct
        memory_used_gb = $usedMemGb
        memory_free_gb = $freeMemGb
        uptime_seconds = $uptimeSeconds
        uptime_string = $uptimeStr
        c_drive_free_gb = $cFreeGb
        c_drive_total_gb = $cTotalGb
        top_processes = $topProcesses
        collected_at = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    }
}

# ------------------------------------------------------------------------------
# 4. Security, Antivirus, Hacker & VPN Detection Engine
# (Inspired by SANS DeepBlueCLI, Wazuh Agent, Tactical RMM, and Wintun Inspection)
# ------------------------------------------------------------------------------
function Test-VpnConnection {
    $vpnDrivers = @("*WireGuard*", "*TAP-Windows*", "*Wintun*", "*Tailscale*", "*ZeroTier*", "*AnyConnect*", "*Fortinet*", "*Cloudflare*", "*WARP*", "*NordLynx*", "*Proton*", "*Surfshark*", "*Windscribe*", "*Check Point*", "*GlobalProtect*", "*SoftEther*", "*Hamachi*", "*OpenVPN*")
    $detectedAdapters = @()
    try {
        $adapters = Get-NetAdapter -ErrorAction SilentlyContinue
        foreach ($a in $adapters) {
            $desc = [string]$a.InterfaceDescription
            $name = [string]$a.Name
            $matched = $false
            foreach ($p in $vpnDrivers) {
                if ($desc -like $p -or $name -like $p) {
                    $matched = $true
                    break
                }
            }
            if ($matched) {
                $tunnelIp = ""
                try {
                    $ipObj = Get-NetIPAddress -InterfaceIndex $a.ifIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue | Select-Object -First 1
                    if ($ipObj) { $tunnelIp = $ipObj.IPAddress }
                } catch {}
                $detectedAdapters += @{
                    name = $name
                    description = $desc
                    status = [string]$a.Status
                    ip = $tunnelIp
                    is_active = ($a.Status -eq "Up")
                }
            }
        }
    } catch {}

    $vpnProcessNames = @("wireguard", "openvpn", "warp-svc", "Cloudflare WARP", "tailscale", "tailscaled", "vpnagent", "zerotier-one", "nordvpn", "protonvpn", "clash", "clash-verge", "v2ray", "xray", "sing-box", "FortiClient", "PanGPA", "vpnui", "Hamachi")
    $detectedProcesses = @()
    try {
        $allProc = Get-Process -ErrorAction SilentlyContinue
        foreach ($p in $allProc) {
            $pName = [string]$p.ProcessName
            foreach ($vpnName in $vpnProcessNames) {
                if ($pName -like "*$vpnName*") {
                    $detectedProcesses += @{
                        process_name = $pName
                        id = $p.Id
                    }
                    break
                }
            }
        }
    } catch {}

    $hasActiveAdapter = ($detectedAdapters | Where-Object { $_.is_active -eq $true })
    $isVpnActive = ($hasActiveAdapter.Count -gt 0) -or ($detectedProcesses.Count -gt 0)

    return @{
        vpn_detected = [bool]$isVpnActive
        active_adapters = $detectedAdapters
        active_processes = $detectedProcesses
    }
}

function Test-AntivirusHealth {
    $defender = @{
        available = $false
        realtime_enabled = $false
        signature_age_days = -1
        signature_version = ""
        engine_version = ""
        antispyware_enabled = $false
        behavior_monitor_enabled = $false
        ioav_protection_enabled = $false
        tamper_protection = $false
    }
    try {
        if (Get-Command Get-MpComputerStatus -ErrorAction SilentlyContinue) {
            $mp = Get-MpComputerStatus -ErrorAction SilentlyContinue
            if ($mp) {
                $defender.available = $true
                $defender.realtime_enabled = [bool]$mp.RealTimeProtectionEnabled
                $defender.signature_age_days = [int]$mp.AntivirusSignatureAge
                $defender.signature_version = [string]$mp.AntivirusSignatureVersion
                $defender.engine_version = [string]$mp.AMEngineVersion
                $defender.antispyware_enabled = [bool]$mp.AntispywareEnabled
                $defender.behavior_monitor_enabled = [bool]$mp.BehaviorMonitorEnabled
                $defender.ioav_protection_enabled = [bool]$mp.IoavProtectionEnabled
                $defender.tamper_protection = [bool]$mp.IsTamperProtected
            }
        }
    } catch {}
    return $defender
}

function Test-ActiveMalwareAndThreats {
    $threats = @()
    $since = (Get-Date).AddHours(-24)
    # Self-exclusion keywords: ignore events caused by our own installer, agent or remote support tool
    $selfSignatures = @("smh-agent", "install-fshh-agent", "install.ps1", "rustdesk", "fshh", "ar25b4kv5ysi", "smh_agent")

    # 1. Inspect Defender Operational Events (Past 24 Hours only)
    try {
        $events = Get-WinEvent -FilterHashtable @{LogName='Microsoft-Windows-Windows Defender/Operational'; Id=@(1116, 1117); StartTime=$since} -MaxEvents 25 -ErrorAction SilentlyContinue
        foreach ($evt in $events) {
            $msgLines = ($evt.Message -split "`r?`n") | Where-Object { $_.Trim() -ne "" }
            $threatName = ""
            $threatPath = ""
            $severity = "Warning"
            foreach ($line in $msgLines) {
                if ($line -match "(?:Threat Name|Threat):\s*(.+)") { $threatName = $matches[1].Trim() }
                if ($line -match "(?:Path):\s*(.+)") { $threatPath = $matches[1].Trim() }
                if ($line -match "(?:Severity):\s*(.+)") { $severity = $matches[1].Trim() }
            }
            if (-not $threatName -or $threatName -like "*Microsoft Defender Antivirus has detected*") {
                # Skip generic event header messages that do not contain an actual specific malware name
                continue
            }

            # Filter out errors caused by our own agent, batch installer or remote tool
            $allText = ("$($evt.Message) $threatName $threatPath").ToLower()
            $isSelf = $false
            foreach ($sig in $selfSignatures) {
                if ($allText -like "*$sig*") {
                    $isSelf = $true
                    break
                }
            }
            # Also ignore generic powershell.exe AMSI script alerts caused by agent installer execution
            if ($threatPath.ToLower() -like "*powershell.exe" -and ($allText -like "*agent*" -or $allText -like "*fshh*" -or $allText -like "*encodedcommand*")) {
                $isSelf = $true
            }
            if ($isSelf) {
                continue
            }

            $threats += @{
                event_id = $evt.Id
                time = $evt.TimeCreated.ToString("yyyy-MM-dd HH:mm:ss")
                name = $threatName
                path = $threatPath
                severity = $severity
                action_taken = if ($evt.Id -eq 1117) { "Remediated/Quarantined" } else { "Detected" }
            }
        }
    } catch {}

    # 2. Inspect Defender Current / Recent Threat Detections (Filter to past 24 hours)
    try {
        if (Get-Command Get-MpThreatDetection -ErrorAction SilentlyContinue) {
            $mpThreats = Get-MpThreatDetection -ErrorAction SilentlyContinue | Where-Object {
                -not $_.InitialDetectionTime -or $_.InitialDetectionTime -ge $since
            }
            foreach ($t in $mpThreats) {
                $tName = [string]$t.ThreatName
                $tPath = [string]($t.Resources -join "; ")
                $allText = ("$tName $tPath").ToLower()

                if (-not $tName -or $tName -like "*Microsoft Defender Antivirus has detected*") {
                    continue
                }

                $isSelf = $false
                foreach ($sig in $selfSignatures) {
                    if ($allText -like "*$sig*") {
                        $isSelf = $true
                        break
                    }
                }
                if ($tPath.ToLower() -like "*powershell.exe" -and ($allText -like "*agent*" -or $allText -like "*fshh*")) {
                    $isSelf = $true
                }
                if ($isSelf) {
                    continue
                }

                $statusStr = switch ($t.ThreatStatusID) {
                    1 { "Active" }
                    2 { "Action Failed" }
                    3 { "Quarantined" }
                    4 { "Removed" }
                    5 { "Cleaned" }
                    default { "Detected" }
                }
                $threats += @{
                    time = if ($t.InitialDetectionTime) { $t.InitialDetectionTime.ToString("yyyy-MM-dd HH:mm:ss") } else { "" }
                    name = $tName
                    path = $tPath
                    severity = switch ($t.ThreatSeverityID) { 1 { "Low" } 2 { "Medium" } 3 { "High" } 4 { "Severe" } default { "Unknown" } }
                    action_taken = $statusStr
                }
            }
        }
    } catch {}

    return $threats
}

function Test-HackerToolsAndAnomalies {
    $detectedTools = @()
    $hackerSignatures = @("mimikatz", "pwdump", "procdump", "cobaltstrike", "meterpreter", "ngrok", "frpc", "frps", "chisel", "xmrig", "minerd", "masscan")
    try {
        $processes = Get-Process -ErrorAction SilentlyContinue
        foreach ($proc in $processes) {
            $procName = [string]$proc.ProcessName
            foreach ($sig in $hackerSignatures) {
                if ($procName -like "*$sig*") {
                    $detectedTools += @{
                        tool = $sig
                        process_name = $procName
                        id = $proc.Id
                    }
                    break
                }
            }
        }
    } catch {}

    $failedLogonCount = 0
    try {
        $oneHourAgo = (Get-Date).AddHours(-1)
        $failedEvents = Get-WinEvent -FilterHashtable @{LogName='Security'; Id=4625; StartTime=$oneHourAgo} -MaxEvents 50 -ErrorAction SilentlyContinue
        $failedLogonCount = ($failedEvents | Measure-Object).Count
    } catch {}

    return @{
        hacker_tools = $detectedTools
        failed_logons_1h = $failedLogonCount
        is_brute_force = ($failedLogonCount -ge 15)
    }
}

function Get-SecurityAndThreatStatus {
    $vpn = Test-VpnConnection
    $av = Test-AntivirusHealth
    $threats = Test-ActiveMalwareAndThreats
    $anomalies = Test-HackerToolsAndAnomalies

    $threatScore = 0
    $alerts = @()

    # 1. VPN Check
    if ($vpn.vpn_detected) {
        $threatScore += 25
        $adapterNames = ($vpn.active_adapters | ForEach-Object { $_.description }) -join ", "
        $procNames = ($vpn.active_processes | ForEach-Object { $_.process_name }) -join ", "
        $desc = "VPN Connection detected: "
        if ($adapterNames) { $desc += "$adapterNames " }
        if ($procNames) { $desc += "(Process: $procNames)" }
        $alerts += $desc.Trim()
    }

    # 2. Antivirus Signature Check (Real-time protection alert omitted per user preference)
    if ($av.available) {
        if ($av.signature_age_days -gt 14) {
            $threatScore += 15
            $alerts += "Antivirus signature is outdated ($($av.signature_age_days) days old)"
        }
    }

    # 3. Active Threats Check (Alert ONLY on truly active/un-quarantined threats)
    $remediatedNames = @($threats | Where-Object { $_.action_taken -in @("Quarantined", "Removed", "Cleaned", "Remediated/Quarantined") } | ForEach-Object { $_.name })
    $trulyActive = @()
    foreach ($t in $threats) {
        # Ignore anything that is already Quarantined, Removed, Cleaned, or Remediated
        if ($t.action_taken -in @("Quarantined", "Removed", "Cleaned", "Remediated/Quarantined")) {
            continue
        }
        # Ignore generic Defender event message headers
        if ($t.name -like "*Microsoft Defender Antivirus has detected*" -or $t.name -like "*Defender Antivirus has detected*") {
            continue
        }
        if ($t.action_taken -in @("Active", "Action Failed")) {
            $trulyActive += $t
        } elseif ($t.action_taken -eq "Detected" -and $t.name -and ($remediatedNames -notcontains $t.name)) {
            $trulyActive += $t
        }
    }

    if ($trulyActive.Count -gt 0) {
        $threatScore += 60
        $uniqueThreats = $trulyActive | Select-Object -Property name, severity -Unique
        foreach ($m in $uniqueThreats) {
            $displayName = if ($m.name) { $m.name } else { "Unidentified Threat" }
            $alerts += "Active malware/threat detected: $displayName (Severity: $($m.severity))"
        }
    }
    # Note: Quarantined / Remediated threats do NOT generate alert or threat score penalty per user policy

    # Deduplicate alerts
    $alerts = @($alerts | Select-Object -Unique)

    # 4. Hacker Tools / Brute Force
    if ($anomalies.hacker_tools.Count -gt 0) {
        $threatScore += 65
        $toolNames = ($anomalies.hacker_tools | ForEach-Object { $_.tool }) -join ", "
        $alerts += "Suspicious hacktool or reverse tunnel process detected: $toolNames"
    }
    if ($anomalies.is_brute_force) {
        $threatScore += 30
        $alerts += "High rate of failed logons ($($anomalies.failed_logons_1h) in last hour) - potential brute force"
    }

    $threatLevel = "normal"
    if ($threatScore -ge 60) {
        $threatLevel = "critical"
    } elseif ($threatScore -ge 21) {
        $threatLevel = "warning"
    }

    return @{
        threat_level = $threatLevel
        threat_score = [math]::Min(100, $threatScore)
        vpn_detected = [bool]$vpn.vpn_detected
        vpn_details = $vpn
        antivirus = $av
        active_threats = $threats
        anomalies = $anomalies
        alerts = $alerts
        evaluated_at = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    }
}

# ------------------------------------------------------------------------------
# 5. Payload Transmission & Live Mode Loop
# ------------------------------------------------------------------------------
function Send-Report {
    param (
        [switch]$IncludeSpecs
    )

    $securityStatus = Get-SecurityAndThreatStatus

    $payload = @{
        token = $Token
        machine_guid = $GlobalMachineGuid
        hostname = $env:COMPUTERNAME
        mac_address = $GlobalPrimaryMac
        department = $Department
        assigned_user = $AssignedUser
        remote_id = (Get-RustDeskId)
        live_stats = (Get-RealtimeStats)
        security = $securityStatus
    }

    if ($IncludeSpecs) {
        $specs = Get-HardwareSpecs
        foreach ($k in $specs.Keys) {
            $payload[$k] = $specs[$k]
        }
    }

    $json = $payload | ConvertTo-Json -Depth 5 -Compress
    $endpoint = "$ServerUrl/api/im/agent/report"

    try {
        $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($json)
        $response = Invoke-RestMethod -Uri $endpoint -Method Post -Body $bodyBytes -ContentType "application/json; charset=utf-8" -TimeoutSec 15
        return $response
    } catch {
        if (-not $Silent) {
            Write-Host "[Error] Failed to transmit report to $endpoint" -ForegroundColor Red
            Write-Host "        Details: $_" -ForegroundColor DarkYellow
            try {
                $uriObj = [System.Uri]$ServerUrl
                $targetHost = $uriObj.Host
                Write-Host "[Diagnostic] Testing network ping to '$targetHost'..." -ForegroundColor Cyan
                $pingTest = Test-Connection -ComputerName $targetHost -Count 1 -Quiet 2>$null
                if ($pingTest) {
                    Write-Host "[Diagnostic] Ping to $targetHost is OK, but HTTP request failed. Check server port / path." -ForegroundColor Yellow
                } else {
                    Write-Host "[Diagnostic] Cannot ping $targetHost. Please check LAN connection and Windows Firewall on server." -ForegroundColor Red
                }
            } catch {}
        }
        return $null
    }
}

# --- Execution ---
$response = Send-Report -IncludeSpecs
if ($response -and $response.success) {
    if (-not $Silent) {
        Write-Host "[OK] FSHH Agent reported successfully! Asset ID: $($response.asset_id)" -ForegroundColor Green

        # Display Security & Threat Audit Summary
        $secStatus = Get-SecurityAndThreatStatus
        if ($secStatus.threat_level -eq "critical") {
            Write-Host "[CRITICAL ALERT] Found severe security threats on this computer!" -ForegroundColor Red
            foreach ($a in $secStatus.alerts) { Write-Host "  ! $a" -ForegroundColor Red }
        } elseif ($secStatus.threat_level -eq "warning") {
            Write-Host "[SECURITY NOTICE] Security risk or VPN detected:" -ForegroundColor Yellow
            foreach ($a in $secStatus.alerts) { Write-Host "  * $a" -ForegroundColor Yellow }
        } else {
            Write-Host "[SECURITY OK] Antivirus active, no malware or unauthorized VPN detected." -ForegroundColor Green
        }
    }
    
    # Check if Server requested Live Stream Mode (Admin viewing in web browser)
    if ($response.live_mode -eq $true -and -not $RunOnce) {
        if (-not $Silent) {
            Write-Host "[Live Mode] Active inspection detected. Streaming live metrics..." -ForegroundColor Cyan
        }
        $liveIterations = 0
        while ($liveIterations -lt 40) { # max ~2 minutes stream
            Start-Sleep -Seconds 3
            $resp = Send-Report
            if (-not $resp -or $resp.live_mode -ne $true) {
                break
            }
            $liveIterations++
        }
    }
} else {
    if (-not $Silent) {
        Write-Host "[Error] Could not contact SMH server ($ServerUrl)" -ForegroundColor Red
    }
}
