# Repozitoriy fayllarini GitHub'ga bitta commit qilib joylaydi (git o'rnatmasdan, gh api orqali)
param([string]$Repo = 'shokrirov1013/Mittivoy', [string]$Src = (Split-Path -Parent $PSScriptRoot), [string]$Message = 'Yangilanish')
$ErrorActionPreference = 'Stop'
$gh = "$env:LOCALAPPDATA\Programs\gh-cli\bin\gh.exe"
$tmp = Join-Path $Src '.cache\ghpush'; New-Item -ItemType Directory -Force $tmp | Out-Null

function Api([string]$method, [string]$path, $body) {
    $a = @('api', '-X', $method, $path, '-H', 'Accept: application/vnd.github+json')
    if ($null -ne $body) { $f = Join-Path $tmp 'body.json'; [IO.File]::WriteAllText($f, ($body | ConvertTo-Json -Depth 10 -Compress), (New-Object Text.UTF8Encoding $false)); $a += @('--input', $f) }
    $out = & $gh @a
    if ($LASTEXITCODE -ne 0) { throw "gh api $method $path xato: $out" }
    if ($out) { return ($out | Out-String | ConvertFrom-Json) }
}

# repozitoriyga boradigan fayllar
$files = @()
$files += Get-ChildItem (Join-Path $Src 'app') -Recurse -File
$files += Get-ChildItem (Join-Path $Src 'docs') -Recurse -File
$files += Get-ChildItem (Join-Path $Src 'scripts') -Recurse -File
$files += Get-Item (Join-Path $Src 'README.md'), (Join-Path $Src 'OQING.txt')

# maxfiy ma'lumot tekshiruvi (service_role kalit, shaxsiy tokenlar va h.k.)
foreach ($f in $files) {
    if ($f.Name -eq 'gh-push.ps1') { continue }   # tekshiruv namunalarining o'zi shu faylda
    $t = [IO.File]::ReadAllText($f.FullName)
    if ($t -match 'gho_[0-9A-Za-z]{20}|sk-ant-|AIza[0-9A-Za-z_\-]{30}|gsk_[0-9A-Za-z]{20}|"role":"service_role"|c2VydmljZV9yb2xl') { throw "Maxfiy ma'lumot topildi: $($f.FullName)" }
}

$branch = (Api GET "repos/$Repo" $null).default_branch
$parent = (Api GET "repos/$Repo/git/ref/heads/$branch" $null).object.sha
$baseTree = (Api GET "repos/$Repo/git/commits/$parent" $null).tree.sha
$tree = @()
foreach ($f in $files) {
    $rel = $f.FullName.Substring($Src.Length).TrimStart('\').Replace('\', '/')
    $blob = Api POST "repos/$Repo/git/blobs" @{ content = [Convert]::ToBase64String([IO.File]::ReadAllBytes($f.FullName)); encoding = 'base64' }
    $tree += @{ path = $rel; mode = '100644'; type = 'blob'; sha = $blob.sha }
}
$newTree = Api POST "repos/$Repo/git/trees" @{ base_tree = $baseTree; tree = $tree }
$commit = Api POST "repos/$Repo/git/commits" @{ message = $Message; tree = $newTree.sha; parents = @($parent) }
[void](Api PATCH "repos/$Repo/git/refs/heads/$branch" @{ sha = $commit.sha; force = $false })
"$($files.Count) fayl -> commit $($commit.sha.Substring(0,7)) ($branch)"
