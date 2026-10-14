# Mittivoy - tayyor ilova ZIP'ini yig'ish.
# Rasmiy Electron dvigateli o'zgartirilmaydi (faqat exe nomi), shuning uchun Windows Smart App Control ham ruxsat beradi.
param([string]$Src = (Split-Path -Parent $PSScriptRoot), [string]$Version = '2.6')
$ErrorActionPreference = 'Stop'
$ver = '33.2.1'
$cache = Join-Path $Src '.cache'
New-Item -ItemType Directory -Force $cache | Out-Null
$ezip = Join-Path $cache "electron-v$ver-win32-x64.zip"
if (-not (Test-Path $ezip)) {
    $ProgressPreference = 'SilentlyContinue'
    Invoke-WebRequest "https://github.com/electron/electron/releases/download/v$ver/electron-v$ver-win32-x64.zip" -OutFile $ezip -UseBasicParsing
}
$root = Join-Path $Src 'dist'
$stage = Join-Path $root 'Mittivoy'
if (Test-Path $root) { Remove-Item $root -Recurse -Force }
New-Item -ItemType Directory -Force $stage | Out-Null

Expand-Archive $ezip -DestinationPath $stage -Force
Rename-Item (Join-Path $stage 'electron.exe') 'Mittivoy.exe'

# --- hajmni kamaytirish: keraksiz fayllar (exe va asosiy DLL'lar o'zgarmaydi)
Remove-Item (Join-Path $stage 'resources\default_app.asar') -Force -ErrorAction SilentlyContinue
Get-ChildItem (Join-Path $stage 'locales') -Filter *.pak | Where-Object { $_.Name -ne 'en-US.pak' } | Remove-Item -Force   # 55 ta tildan bittasi kifoya
foreach ($f in 'vk_swiftshader.dll', 'vk_swiftshader_icd.json', 'vulkan-1.dll') { Remove-Item (Join-Path $stage $f) -Force -ErrorAction SilentlyContinue }

# --- ilova
Copy-Item (Join-Path $Src 'app') (Join-Path $stage 'resources\app') -Recurse
Copy-Item (Join-Path $Src 'OQING.txt') (Join-Path $stage "O'QING.txt")

$bad = Get-ChildItem $stage -Recurse -File | Where-Object { $_.Name -in @('config.json', 'google.json', 'app.json', 'memory.json', 'history.json', 'session.bin') }
if ($bad) { throw "Shaxsiy fayl topildi: $($bad.FullName)" }

$pj = Get-Content (Join-Path $stage 'resources\app\package.json') -Raw | ConvertFrom-Json
if ($pj.version -ne $Version) { throw "package.json versiyasi ($($pj.version)) -Version ($Version) bilan mos emas" }

$zip = Join-Path $root "Mittivoy-$Version-Windows.zip"
Compress-Archive -Path $stage -DestinationPath $zip -CompressionLevel Optimal
"o'rnatilgan hajm: {0:N0} MB" -f ((Get-ChildItem $stage -Recurse -File | Measure-Object Length -Sum).Sum / 1MB)
"ZIP: {0:N1} MB -> {1}" -f ((Get-Item $zip).Length / 1MB), $zip

# --- yengil yangilanish arxivi: faqat ilova kodi (Electron o'zgarmagan bo'lsa, ilova shuni yuklab oladi)
Add-Type -AssemblyName System.IO.Compression.FileSystem
$lite = Join-Path $root "Mittivoy-$Version-app-electron-$ver.zip"
[System.IO.Compression.ZipFile]::CreateFromDirectory((Join-Path $stage 'resources\app'), $lite, [System.IO.Compression.CompressionLevel]::Optimal, $false)
"yengil yangilanish: {0:N0} KB -> {1}" -f ((Get-Item $lite).Length / 1KB), $lite
