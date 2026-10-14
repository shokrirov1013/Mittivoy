// Mittivoy yangilanishlari: GitHub'dagi eng so'nggi relizni tekshiradi, yuklab oladi va o'rnatadi.
// Ikki xil yangilanish:
//  - yengil: faqat ilova kodi (resources\app, ~1 MB) - Electron versiyasi o'zgarmagan bo'lsa; 1-2 soniyada
//  - to'liq: butun ZIP (~100 MB) - yangi Mittivoy.exe "--ornat" bilan o'zini ustidan o'rnatadi
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawn, execFile } = require('child_process');

const REPO = 'shokrirov1013/Mittivoy';
const psq = s => "'" + String(s).replace(/'/g, "''") + "'";

function cmpVer(a, b) {
  const pa = String(a).replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
  const pb = String(b).replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) { const d = (pa[i] || 0) - (pb[i] || 0); if (d) return Math.sign(d); }
  return 0;
}

class Updater {
  constructor(o) {
    this.o = o;   // { version, exeDir, packaged, log, onState, beforeQuit, quit }
    this.state = { current: o.version, latest: null, available: false, busy: false, error: null };
    this.rel = null;
  }
  set(s) { Object.assign(this.state, s); try { this.o.onState(Object.assign({}, this.state)); } catch (e) { } }

  async check() {
    if (this.state.busy) return this.state;
    try {
      const r = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { headers: { 'User-Agent': 'Mittivoy/' + this.o.version, Accept: 'application/vnd.github+json' } });
      if (!r.ok) throw new Error(r.status === 403 || r.status === 429 ? "GitHub vaqtincha cheklov qo'ydi - birozdan keyin urinib ko'ring" : r.status === 404 ? "GitHub'da hali reliz yo'q" : 'GitHub javobi: ' + r.status);
      const j = await r.json();
      const latest = String(j.tag_name || '').replace(/^v/i, '');
      const assets = j.assets || [];
      const full = assets.find(a => /^Mittivoy-[\d.]+-Windows\.zip$/i.test(a.name)) || null;
      let lite = assets.find(a => /-app-electron-([\d.]+)\.zip$/i.test(a.name)) || null;
      if (lite && lite.name.match(/-app-electron-([\d.]+)\.zip$/i)[1] !== process.versions.electron) lite = null;   // Electron ham yangilangan - to'liq kerak
      this.rel = { latest, full, lite };
      const available = cmpVer(latest, this.o.version) > 0 && !!(full || lite);
      this.set({ latest, available, lite: !!lite, error: null, checkedAt: Date.now() });
      this.o.log(`yangilanish tekshirildi: ${latest} (${available ? 'yangi bor' : 'eng yangisi'})`);
    } catch (e) {
      this.set({ error: e.message === 'fetch failed' ? "Internetga ulanib bo'lmadi" : e.message });
    }
    return this.state;
  }

  async download(asset, dest) {
    const r = await fetch(asset.browser_download_url, { headers: { 'User-Agent': 'Mittivoy/' + this.o.version }, redirect: 'follow' });
    if (!r.ok || !r.body) throw new Error("Yuklab bo'lmadi (server kodi " + r.status + ')');
    const total = asset.size || +r.headers.get('content-length') || 0;
    const out = fs.createWriteStream(dest);
    const hash = crypto.createHash('sha256');
    const reader = r.body.getReader();
    let got = 0, lastT = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      got += value.length; hash.update(value);
      if (!out.write(value)) await new Promise(res => out.once('drain', res));
      if (Date.now() - lastT > 150) { lastT = Date.now(); this.set({ progress: total ? got / total * 0.9 : 0.4, stage: `⬇ Yuklanmoqda: ${(got / 1048576).toFixed(1)} / ${(total / 1048576).toFixed(1)} MB` }); }
    }
    await new Promise((res, rej) => out.end(e => e ? rej(e) : res()));
    if (total && got !== total) throw new Error("Fayl to'liq yuklanmadi - internetni tekshirib, qayta urinib ko'ring");
    // GitHub har bir fayl uchun sha256 beradi - fayl buzilmaganini tekshiramiz
    if (asset.digest && /^sha256:/i.test(asset.digest) && asset.digest.slice(7).toLowerCase() !== hash.digest('hex')) throw new Error('Yuklangan fayl buzilgan (sha256 mos kelmadi)');
  }

  unzip(zip, dir) {
    return new Promise((res, rej) => execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
      `Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::ExtractToDirectory(${psq(zip)}, ${psq(dir)})`],
      { windowsHide: true, timeout: 5 * 60000 }, e => e ? rej(new Error("Arxivni ochib bo'lmadi: " + e.message.slice(0, 200))) : res()));
  }

  async install() {
    if (!this.o.packaged) return { ok: false, err: 'Ishlab chiqish rejimida yangilanmaydi' };
    if (this.state.busy) return { ok: true };
    if (!this.rel || !this.state.available) await this.check();
    if (!this.state.available) return { ok: false, err: this.state.error || "Yangi versiya yo'q" };
    const { latest, full, lite } = this.rel;
    this.set({ busy: true, progress: 0, stage: '⬇ Yuklanmoqda...', error: null });
    try {
      if (lite) {
        // yengil yangilanish: resources\app.new ga ochamiz, Mittivoy yopilgach yordamchi skript papkalarni almashtiradi
        const res = path.join(this.o.exeDir, 'resources');
        const zip = path.join(res, 'app-update.zip'), next = path.join(res, 'app.new');
        fs.rmSync(next, { recursive: true, force: true });
        await this.download(lite, zip);
        this.set({ progress: 0.93, stage: '📦 Ochilmoqda...' });
        await this.unzip(zip, next);
        fs.rmSync(zip, { force: true });
        const pj = JSON.parse(fs.readFileSync(path.join(next, 'package.json'), 'utf8'));
        if (!fs.existsSync(path.join(next, 'main.js')) || cmpVer(pj.version, latest) !== 0) throw new Error("Yangilanish fayllari to'liq emas");
        const exe = path.join(this.o.exeDir, 'Mittivoy.exe');
        const ps = [
          `$ErrorActionPreference = 'SilentlyContinue'`,
          `Wait-Process -Id ${process.pid} -Timeout 30; Start-Sleep -Milliseconds 700`,
          `$r = ${psq(res)}`,
          `Remove-Item (Join-Path $r 'app.old') -Recurse -Force`,
          `$ok = $false; for ($i = 0; $i -lt 30 -and -not $ok; $i++) { try { Rename-Item (Join-Path $r 'app') 'app.old' -ErrorAction Stop; $ok = $true } catch { Start-Sleep -Milliseconds 500 } }`,
          `if ($ok) { Rename-Item (Join-Path $r 'app.new') 'app'; if (-not (Test-Path (Join-Path $r 'app\\main.js'))) { Remove-Item (Join-Path $r 'app') -Recurse -Force; Rename-Item (Join-Path $r 'app.old') 'app' } }`,
          `Start-Process explorer.exe -ArgumentList ('"' + ${psq(exe)} + '"')`,
        ].join('\r\n');
        const script = path.join(os.tmpdir(), 'mittivoy-yangilash.ps1');
        fs.writeFileSync(script, '﻿' + ps, 'utf8');
        this.set({ progress: 1, stage: '🔄 Qayta ishga tushirilmoqda...' });
        spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', script], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
      } else {
        // to'liq yangilanish: yangi Mittivoy.exe o'zini o'rnatadi (eskisini to'xtatib, ustidan yozadi, so'ng ishga tushadi)
        const dir = path.join(os.tmpdir(), 'Mittivoy-yangilanish');
        fs.rmSync(dir, { recursive: true, force: true });
        fs.mkdirSync(dir, { recursive: true });
        const zip = path.join(dir, full.name);
        await this.download(full, zip);
        this.set({ progress: 0.92, stage: "📦 Ochilmoqda (bir daqiqacha)..." });
        await this.unzip(zip, path.join(dir, 'x'));
        fs.rmSync(zip, { force: true });
        let exe = path.join(dir, 'x', 'Mittivoy', 'Mittivoy.exe');
        if (!fs.existsSync(exe)) exe = path.join(dir, 'x', 'Mittivoy.exe');
        if (!fs.existsSync(exe)) throw new Error("Arxivda Mittivoy.exe topilmadi");
        this.set({ progress: 1, stage: "🔄 O'rnatilmoqda..." });
        spawn(exe, ['--ornat'], { detached: true, stdio: 'ignore', cwd: path.dirname(exe) }).unref();
      }
      this.o.log('yangilanish o\'rnatilmoqda: ' + latest + (lite ? ' (yengil)' : ' (to\'liq)'));
      setTimeout(() => { try { this.o.beforeQuit(); } catch (e) { } this.o.quit(); }, 400);
      return { ok: true };
    } catch (e) {
      this.o.log('yangilanish xatosi: ' + e.message);
      this.set({ busy: false, error: e.message });
      return { ok: false, err: e.message };
    }
  }

  // eski yangilanish qoldiqlarini tozalash (yangi versiya ishga tushgach)
  cleanup() {
    try { fs.rmSync(path.join(this.o.exeDir, 'resources', 'app.old'), { recursive: true, force: true }); } catch (e) { }
    try { fs.rmSync(path.join(this.o.exeDir, 'resources', 'app.new'), { recursive: true, force: true }); } catch (e) { }
    try { fs.rmSync(path.join(os.tmpdir(), 'Mittivoy-yangilanish'), { recursive: true, force: true }); } catch (e) { }
  }
}

module.exports = { Updater, cmpVer };
