# Mittivoy: foydalanuvchiga xalaqit bermasdan (fonda) ishlash uchun yordamchi funksiyalar.
# Claude har bir PowerShell buyrug'ining boshida buni ". 'yo'l\tools.ps1'" bilan yuklaydi.
#  - dastur oynalari ekrandan tashqarida (ko'rinmas joyda) ishlatiladi, foydalanuvchi oynasi joyida qoladi
#  - tugma/matn maydonlari UI Automation orqali - klaviatura va sichqonchasiz
#  - skrinshot faqat kerakli oynadan (butun ekrandan emas)
#  - klaviatura kerak bo'lsa: foydalanuvchi yozishni to'xtatguncha kutadi, tez bajaradi, oynasini qaytaradi
Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes, System.Windows.Forms, System.Drawing
$script:MvNative = $false
try {
    if (-not ('MV.W' -as [type])) {
        Add-Type -Namespace MV -Name W -MemberDefinition @'
[DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
[DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
[DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int cmd);
[DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
[DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr h, IntPtr after, int x, int y, int cx, int cy, uint flags);
[DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
[DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr hdc, uint flags);
[DllImport("user32.dll")] public static extern bool GetLastInputInfo(ref LASTINPUTINFO i);
[DllImport("user32.dll")] public static extern void keybd_event(byte vk, byte scan, uint flags, UIntPtr extra);
[StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
[StructLayout(LayoutKind.Sequential)] public struct LASTINPUTINFO { public uint cbSize; public uint dwTime; }
'@
    }
    $script:MvNative = $true
} catch { }
$script:MvSaved = @{}

# hozir foydalanuvchi ishlayotgan oyna (oxirida shu qaytariladi)
function Get-UserWindow { if ($script:MvNative) { [MV.W]::GetForegroundWindow() } else { [IntPtr]::Zero } }

# dasturning asosiy oynasi (jarayon nomi bo'yicha, masalan 'Telegram')
function Find-AppWindow([string]$ProcessName, [int]$WaitSeconds = 15) {
    $sw = [Diagnostics.Stopwatch]::StartNew()
    do {
        $p = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
        if ($p) { return $p.MainWindowHandle }
        Start-Sleep -Milliseconds 300
    } while ($sw.Elapsed.TotalSeconds -lt $WaitSeconds)
    return [IntPtr]::Zero
}

# dasturni oldinga chiqarmasdan (kichraytirilgan holda) ishga tushirish
function Start-Hidden([string]$FilePath, [string]$Arguments) {
    if ($Arguments) { Start-Process -FilePath $FilePath -ArgumentList $Arguments -WindowStyle Minimized } else { Start-Process -FilePath $FilePath -WindowStyle Minimized }
}

# oynani foydalanuvchi ko'rmaydigan joyga (ekrandan tashqariga) surish - u ishlayveradi, UI Automation va skrinshot ishlaydi
function Move-Offscreen([IntPtr]$h) {
    if (-not $script:MvNative -or $h -eq [IntPtr]::Zero) { return }
    $r = New-Object MV.W+RECT; [void][MV.W]::GetWindowRect($h, [ref]$r)
    if (-not $script:MvSaved.ContainsKey([string]$h) -and $r.Left -gt -30000) { $script:MvSaved[[string]$h] = $r }
    if ([MV.W]::IsIconic($h)) { [void][MV.W]::ShowWindow($h, 4) }   # SW_SHOWNOACTIVATE - faollashtirmasdan
    $vs = [System.Windows.Forms.SystemInformation]::VirtualScreen
    # SWP_NOSIZE | SWP_NOZORDER | SWP_NOACTIVATE
    [void][MV.W]::SetWindowPos($h, [IntPtr]::Zero, $vs.Right + 200, $vs.Top + 40, 0, 0, 0x0001 -bor 0x0004 -bor 0x0010)
}
# ish tugagach: oynani joyiga qaytarib, kichraytirib qo'yish (foydalanuvchi o'zi ochmaguncha ko'rinmaydi)
function Hide-TaskWindow([IntPtr]$h) {
    if (-not $script:MvNative -or $h -eq [IntPtr]::Zero) { return }
    $k = [string]$h
    if ($script:MvSaved.ContainsKey($k)) {
        $r = $script:MvSaved[$k]
        [void][MV.W]::SetWindowPos($h, [IntPtr]::Zero, $r.Left, $r.Top, 0, 0, 0x0001 -bor 0x0004 -bor 0x0010)
        $script:MvSaved.Remove($k)
    }
    [void][MV.W]::ShowWindow($h, 7)   # SW_SHOWMINNOACTIVE
}

# foydalanuvchi oxirgi marta klaviatura/sichqonchaga tekkanidan beri o'tgan soniyalar
function Get-IdleSeconds {
    if (-not $script:MvNative) { return 999 }
    $i = New-Object MV.W+LASTINPUTINFO; $i.cbSize = 8
    [void][MV.W]::GetLastInputInfo([ref]$i)
    $now = [int64]([Environment]::TickCount) -band [int64]4294967295   # 0xFFFFFFFF PowerShell'da -1 bo'lib qoladi
    $d = $now - [int64]$i.dwTime; if ($d -lt 0) { $d += 4294967296 }
    return $d / 1000
}
# foydalanuvchi yozishni/sichqonchani qimirlatishni to'xtatguncha kutish
function Wait-UserIdle([double]$Seconds = 2, [int]$TimeoutSeconds = 120) {
    $sw = [Diagnostics.Stopwatch]::StartNew()
    while ((Get-IdleSeconds) -lt $Seconds -and $sw.Elapsed.TotalSeconds -lt $TimeoutSeconds) { Start-Sleep -Milliseconds 250 }
}

function Set-Foreground([IntPtr]$h) {
    if (-not $script:MvNative -or $h -eq [IntPtr]::Zero) { return }
    if ([MV.W]::GetForegroundWindow() -eq $h) { return }
    try { [System.Windows.Automation.AutomationElement]::FromHandle($h).SetFocus() } catch { }
    if ([MV.W]::GetForegroundWindow() -ne $h) {
        # Windows fokusni "o'g'irlash"ni cheklaydi - qisqa Alt bosish bu cheklovni ochadi
        [MV.W]::keybd_event(0x12, 0, 0, [UIntPtr]::Zero); [MV.W]::keybd_event(0x12, 0, 2, [UIntPtr]::Zero)
        [void][MV.W]::SetForegroundWindow($h)
    }
}
# klaviatura shart bo'lgan qisqa qadam: foydalanuvchi bo'shashini kutadi, oynaga bir lahza fokus beradi, so'ng uning oynasini qaytaradi
function Use-Focus([IntPtr]$h, [scriptblock]$Action) {
    Wait-UserIdle -Seconds 2
    $user = Get-UserWindow
    try { Set-Foreground $h; Start-Sleep -Milliseconds 150; & $Action }
    finally { if ($user -ne [IntPtr]::Zero -and $user -ne $h) { Set-Foreground $user } }
}
# Unicode (o'zbekcha) matnni fokusdagi joyga qo'yish (Use-Focus ichida ishlating)
function Send-Text([string]$Text) {
    $old = $null; try { $old = Get-Clipboard -Raw } catch { }
    Set-Clipboard -Value $Text
    [System.Windows.Forms.SendKeys]::SendWait('^v')
    Start-Sleep -Milliseconds 120
    if ($null -ne $old) { try { Set-Clipboard -Value $old } catch { } }
}

# faqat bitta oynaning rasmi (orqasida boshqa oyna bo'lsa ham, ekrandan tashqarida bo'lsa ham)
function Save-WindowShot([IntPtr]$h, [string]$Path = "$env:TEMP\mittivoy_oyna.png") {
    if (-not $script:MvNative) { throw "Oyna rasmini olish imkoni yo'q" }
    if ([MV.W]::IsIconic($h)) { Move-Offscreen $h; Start-Sleep -Milliseconds 400 }
    $r = New-Object MV.W+RECT; [void][MV.W]::GetWindowRect($h, [ref]$r)
    $w = $r.Right - $r.Left; $ht = $r.Bottom - $r.Top
    if ($w -le 0 -or $ht -le 0) { throw "Oyna o'lchami topilmadi" }
    $bmp = New-Object System.Drawing.Bitmap $w, $ht
    $g = [System.Drawing.Graphics]::FromImage($bmp); $dc = $g.GetHdc()
    [void][MV.W]::PrintWindow($h, $dc, 2)   # PW_RENDERFULLCONTENT
    $g.ReleaseHdc($dc); $g.Dispose()
    $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png); $bmp.Dispose()
    return $Path
}

# UI Automation: oyna ichidan element topish (nomi bo'yicha, qisman moslik) va klaviaturasiz boshqarish
function Find-UiaElement([IntPtr]$h, [string]$Name, [int]$WaitSeconds = 5) {
    $root = [System.Windows.Automation.AutomationElement]::FromHandle($h)
    $sw = [Diagnostics.Stopwatch]::StartNew()
    do {
        $all = $root.FindAll([System.Windows.Automation.TreeScope]::Descendants, [System.Windows.Automation.Condition]::TrueCondition)
        foreach ($e in $all) { try { if ($e.Current.Name -like "*$Name*") { return $e } } catch { } }
        Start-Sleep -Milliseconds 300
    } while ($sw.Elapsed.TotalSeconds -lt $WaitSeconds)
    return $null
}
function Set-UiaValue($Element, [string]$Text) { $Element.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern).SetValue($Text) }
function Invoke-UiaButton($Element) { $Element.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern).Invoke() }
