# Export embedded pictures from บัญชีคุม .xls via Excel COM
# Reads job list from storage/app/env_image_jobs.json (built by PHP)
param(
    [string]$JobsFile = '',
    [string]$OutDir = ''
)

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
if (-not $JobsFile) { $JobsFile = Join-Path $root 'storage\app\env_image_jobs.json' }
if (-not $OutDir) { $OutDir = Join-Path $root 'storage\app\public\env\assets' }

function Safe-Name([string]$value) {
    $v = ($value -replace '[^\p{L}\p{N}_-]+', '_').Trim('_')
    if ([string]::IsNullOrWhiteSpace($v)) { return 'sheet' }
    return $v
}

if (-not (Test-Path -LiteralPath $JobsFile)) {
    throw "Jobs file not found: $JobsFile (run php storage/app/_build_image_jobs.php first)"
}

$jobs = Get-Content -LiteralPath $JobsFile -Encoding UTF8 | ConvertFrom-Json
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$manifest = New-Object System.Collections.Generic.List[object]

$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
$excel.ScreenUpdating = $false

try {
    foreach ($job in $jobs) {
        $path = [string]$job.path
        $code = [string]$job.code
        if (-not (Test-Path -LiteralPath $path)) {
            Write-Host "Missing file for $code : $path"
            continue
        }

        Write-Host "Opening $code ..."
        $wb = $excel.Workbooks.Open($path)
        try {
            $sheetCount = [int]$wb.Worksheets.Count
            for ($s = 1; $s -le $sheetCount; $s++) {
                $ws = $wb.Worksheets.Item($s)
                $sheetName = [string]$ws.Name
                $safeSheet = Safe-Name $sheetName
                $targetDir = Join-Path $OutDir (Join-Path $code $safeSheet)
                New-Item -ItemType Directory -Force -Path $targetDir | Out-Null

                $shapeCount = 0
                try { $shapeCount = [int]$ws.Shapes.Count } catch { $shapeCount = 0 }
                Write-Host "  Sheet $sheetName shapes=$shapeCount"

                for ($i = 1; $i -le $shapeCount; $i++) {
                    try {
                        $shape = $ws.Shapes.Item($i)
                        $type = [int]$shape.Type
                        if ($type -ne 13 -and $type -ne 11) { continue }

                        $row = [int]$shape.TopLeftCell.Row
                        if ($row -lt 2) { continue }

                        $outFile = Join-Path $targetDir ("row_$row.jpg")
                        $exported = $false
                        $width = [math]::Max(120, [int]$shape.Width)
                        $height = [math]::Max(120, [int]$shape.Height)
                        $chartObj = $null

                        try {
                            $shape.CopyPicture(1, 2) | Out-Null
                            $chartObj = $ws.ChartObjects().Add(10, 10, $width, $height)
                            $chartObj.Chart.Paste() | Out-Null
                            $chartObj.Chart.Export($outFile, 'JPG') | Out-Null
                            $exported = (Test-Path -LiteralPath $outFile)
                        } catch {
                        } finally {
                            if ($null -ne $chartObj) { try { $chartObj.Delete() } catch {} }
                        }

                        if (-not $exported) {
                            $chartObj = $null
                            try {
                                $shape.Copy() | Out-Null
                                $chartObj = $ws.ChartObjects().Add(10, 10, $width, $height)
                                $chartObj.Chart.Paste() | Out-Null
                                $chartObj.Chart.Export($outFile, 'JPG') | Out-Null
                                $exported = (Test-Path -LiteralPath $outFile)
                            } catch {
                            } finally {
                                if ($null -ne $chartObj) { try { $chartObj.Delete() } catch {} }
                            }
                        }

                        if ($exported -and ((Get-Item -LiteralPath $outFile).Length -gt 32)) {
                            $rel = "env/assets/$code/$safeSheet/row_$row.jpg"
                            $manifest.Add([pscustomobject]@{
                                line_code   = $code
                                sheet_name  = $sheetName
                                source_row  = $row
                                path        = $rel
                                source_file = [string]$job.filename
                            }) | Out-Null
                        }
                    } catch {
                        Write-Host "    shape #$i failed: $($_.Exception.Message)"
                    }
                }
            }
        } finally {
            $wb.Close($false) | Out-Null
            [System.Runtime.InteropServices.Marshal]::ReleaseComObject($wb) | Out-Null
        }
    }
}
finally {
    $excel.Quit() | Out-Null
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}

$manifestPath = Join-Path $OutDir '_manifest.json'
$manifest | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $manifestPath -Encoding UTF8
Write-Host "Exported $($manifest.Count) images"
Write-Host "Manifest: $manifestPath"
