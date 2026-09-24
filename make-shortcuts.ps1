$ErrorActionPreference = "Stop"

$desktop = [Environment]::GetFolderPath("Desktop")
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

$appDir = $null
Get-ChildItem -LiteralPath $desktop -Directory -ErrorAction SilentlyContinue | ForEach-Object {
  $candidate = Join-Path $_.FullName "quran-revision-tracking-app"
  if (Test-Path -LiteralPath (Join-Path $candidate "package.json")) {
    $appDir = $candidate
  }
}

if (-not $appDir) {
  throw "Could not find quran-revision-tracking-app under Desktop"
}

function Write-Launcher {
  param([string]$Path, [string]$Title, [string]$TargetBat)
  $lines = @(
    "@echo off"
    "chcp 65001 >nul"
    "title $Title"
    ("cd /d `"" + $appDir + "`"")
    ("call `"" + $TargetBat + "`"")
  )
  [System.IO.File]::WriteAllText($Path, (($lines -join "`r`n") + "`r`n"), $utf8NoBom)
}

$openBatPath = Join-Path $desktop "Wird - Open.bat"
$phoneBatPath = Join-Path $desktop "Wird - Phone Install.bat"

$openTarget = Join-Path $appDir "open-pc.bat"
$phoneTarget = Join-Path $appDir "open-phone.bat"

if (-not (Test-Path -LiteralPath $openTarget)) { throw "open-pc.bat missing" }
if (-not (Test-Path -LiteralPath $phoneTarget)) { throw "open-phone.bat missing" }

Write-Launcher -Path $openBatPath -Title "Wird - Open on PC" -TargetBat "open-pc.bat"
Write-Launcher -Path $phoneBatPath -Title "Wird - Phone Install" -TargetBat "open-phone.bat"

$ws = New-Object -ComObject WScript.Shell

$openLnk = $ws.CreateShortcut((Join-Path $desktop "Wird - Open.lnk"))
$openLnk.TargetPath = $openBatPath
$openLnk.WorkingDirectory = $desktop
$openLnk.WindowStyle = 1
$openLnk.Description = "Open Wird tracker on this PC"
$openLnk.Save()

$phoneLnk = $ws.CreateShortcut((Join-Path $desktop "Wird - Phone Install.lnk"))
$phoneLnk.TargetPath = $phoneBatPath
$phoneLnk.WorkingDirectory = $desktop
$phoneLnk.WindowStyle = 1
$phoneLnk.Description = "Open Wird on phone and install PWA"
$phoneLnk.Save()

Write-Host "AppDir: $appDir"
Write-Host "Created Desktop launchers:"
Write-Host "  Wird - Open.bat / .lnk  exists=$(Test-Path -LiteralPath $openBatPath)"
Write-Host "  Wird - Phone Install.bat / .lnk  exists=$(Test-Path -LiteralPath $phoneBatPath)"

$sc = $ws.CreateShortcut((Join-Path $desktop "Wird - Open.lnk"))
Write-Host "Open.lnk target: $($sc.TargetPath)"
Write-Host "Open.lnk target exists: $(Test-Path -LiteralPath $sc.TargetPath)"
$sc2 = $ws.CreateShortcut((Join-Path $desktop "Wird - Phone Install.lnk"))
Write-Host "Phone.lnk target exists: $(Test-Path -LiteralPath $sc2.TargetPath)"
