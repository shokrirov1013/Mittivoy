param([string]$Src)
$ErrorActionPreference = 'Stop'
$ver = '33.2.1'
$ezip = Join-Path $env:TEMP "electron-v$ver-win32-x64.zip"
if (-not (Test-Path $ezip)) {
    $ProgressPreference = 'SilentlyContinue'
    Invoke-WebRequest "https://github.com/electron/electron/releases/download/v$ver/electron-v$ver-win32-x64.zip" -OutFile $ezip -UseBasicParsing
}
$root = Join-Path $env:TEMP 'mittivoy_build'
$stage = Join-Path $root 'Mittivoy'
if (Test-Path $root) { Remove-Item $root -Recurse -Force }
New-Item -ItemType Directory -Force $stage | Out-Null

# rasmiy Electron dvigateli - fayllar o'zgartirilmaydi, faqat exe nomi
Expand-Archive $ezip -DestinationPath $stage -Force
Rename-Item (Join-Path $stage 'electron.exe') 'Mittivoy.exe'
Remove-Item (Join-Path $stage 'resources\default_app.asar') -Force -ErrorAction SilentlyContinue

# ilova
Copy-Item (Join-Path $Src 'app') (Join-Path $stage 'resources\app') -Recurse
Copy-Item (Join-Path $Src 'OQING.txt') (Join-Path $stage "O'QING.txt")

$bad = Get-ChildItem $stage -Recurse -File | Where-Object { $_.Name -in @('config.json', 'google.json', 'app.json', 'memory.json', 'history.json') }
if ($bad) { throw "Shaxsiy fayl topildi: $($bad.FullName)" }

$desk = [Environment]::GetFolderPath('Desktop')
$zip = Join-Path $desk 'Mittivoy-2.5-Windows.zip'
if (Test-Path $zip) { Remove-Item $zip -Force }
Compress-Archive -Path $stage -DestinationPath $zip -CompressionLevel Optimal
"ZIP: {0:N1} MB" -f ((Get-Item $zip).Length / 1MB)
"STAGE: $stage"
