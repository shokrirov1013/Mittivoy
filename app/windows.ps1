# Mittivoy: ochiq oynalar joylashuvi.
#  - har ~0.45 s: barcha oynalar ro'yxati (z-tartibda, eng ustidagisi birinchi) - JSON qatori
#  - har ~15 ms: qahramon o'tirgan oyna (stdin orqali "focus <hwnd>" bilan beriladi) - "F id x y w h" qatori
# Ota jarayon yopilsa (stdin yopiladi) - o'zi ham to'xtaydi.
param([int]$OwnPid = 0)
Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes
# boshqa virtual ish stolidagi yoki "yashirilgan" (cloaked) oynalar ko'rinmaydi - ularga chiqib bo'lmaydi
try { Add-Type -Namespace MV -Name Dwm -MemberDefinition '[DllImport("dwmapi.dll")] public static extern int DwmGetWindowAttribute(IntPtr h, int a, out int v, int s);' } catch {}
function Cloaked([int64]$h) { try { $v = 0; [void][MV.Dwm]::DwmGetWindowAttribute([IntPtr]$h, 14, [ref]$v, 4); return $v -ne 0 } catch { return $false } }
$A = [System.Windows.Automation.AutomationElement]
$cond = New-Object System.Windows.Automation.PropertyCondition ($A::ControlTypeProperty), ([System.Windows.Automation.ControlType]::Window)
$skip = @('Shell_TrayWnd', 'Shell_SecondaryTrayWnd', 'Progman', 'WorkerW', 'Windows.UI.Core.CoreWindow', 'XamlExplorerHostIslandWindow', 'TopLevelWindowForOverflowXamlIsland', 'NotifyIconOverflowWindow')
$out = [Console]::Out
# DIQQAT: [Console]::In.ReadLineAsync() .NET Framework'da aslida sinxron - qator kelguncha butun siklni to'xtatib qo'yadi
# (shuning uchun oynalar ro'yxati umuman yuborilmay qolardi). StreamReader esa o'qishni fon oqimida bajaradi.
$inp = New-Object System.IO.StreamReader ([Console]::OpenStandardInput())
$task = $inp.ReadLineAsync()
$focus = $null; $focusId = 0; $lastF = ''
$last = ''; $n = 0
$sw = [Diagnostics.Stopwatch]::StartNew(); $nextFull = 0

while ($true) {
    # buyruqlar
    while ($task.IsCompleted) {
        $line = $task.Result
        if ($null -eq $line) { exit }
        if ($line -match '^focus (-?\d+)') {
            $focusId = [int64]$Matches[1]; $lastF = ''
            $focus = $null
            if ($focusId -ne 0) { try { $focus = $A::FromHandle([IntPtr]$focusId) } catch { $focus = $null } }
        }
        $task = $inp.ReadLineAsync()
    }
    # tezkor kuzatuv: qahramon turgan oyna
    if ($focus) {
        try {
            $r = $focus.Current.BoundingRectangle
            $s = "F $focusId $([int]$r.X) $([int]$r.Y) $([int]$r.Width) $([int]$r.Height)"
            if ($s -ne $lastF) { $out.WriteLine($s); $out.Flush(); $lastF = $s }
        } catch { $focus = $null; $out.WriteLine("F $focusId 0 0 0 0"); $out.Flush() }
    }
    # to'liq ro'yxat
    if ($sw.ElapsedMilliseconds -ge $nextFull) {
        # qahramon oynada o'tirmagan paytda ro'yxat kamroq so'raladi - UI Automation protsessorni ko'p yeydi
        $nextFull = $sw.ElapsedMilliseconds + $(if ($focus) { 450 } else { 1000 })
        try {
            $list = New-Object System.Collections.ArrayList
            $wins = $A::RootElement.FindAll([System.Windows.Automation.TreeScope]::Children, $cond)
            foreach ($w in $wins) {
                try {
                    $c = $w.Current
                    if ($c.ProcessId -eq $OwnPid -or $c.IsOffscreen) { continue }
                    if ($skip -contains $c.ClassName) { continue }
                    $r = $c.BoundingRectangle
                    if ($r.IsEmpty -or $r.Width -lt 200 -or $r.Height -lt 100) { continue }
                    if (Cloaked $c.NativeWindowHandle) { continue }
                    [void]$list.Add([ordered]@{ id = [int64]$c.NativeWindowHandle; x = [int]$r.X; y = [int]$r.Y; w = [int]$r.Width; h = [int]$r.Height })
                } catch {}
            }
            $json = if ($list.Count -eq 0) { '[]' } else { ConvertTo-Json -InputObject @($list) -Compress -Depth 3 }
            $n++
            if ($json -ne $last -or $n % 10 -eq 0) { $out.WriteLine($json); $out.Flush(); $last = $json }
        } catch {}
    }
    Start-Sleep -Milliseconds $(if ($focus) { 12 } else { 40 })
}
