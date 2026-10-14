// Mittivoy - bulutli hisob (Supabase): kirish, ro'yxatdan o'tish, parolni tiklash, sessiya va ma'lumotlarni sinxronlash.
// Har bir foydalanuvchi faqat o'z yozuvini ko'radi (Row Level Security). API kalitlar parol asosidagi kalit bilan shifrlanadi.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const URL_ = 'https://gnppvkvsirybdkzurxdg.supabase.co';
// ochiq (publishable/anon) kalit - ilova ichida bo'lishi xavfsiz; ma'lumotlarni RLS qoidalari himoya qiladi
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImducHB2a3ZzaXJ5YmRrenVyeGRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5NTAyMTcsImV4cCI6MjEwNzUyNjIxN30.IvkLGRyMxn0gXTf7fKt68B5McIbgCn_68T4uDEqMdZs';
const AUTH_PAGE = 'https://shokrirov1013.github.io/Mittivoy/auth.html';

const ERR_UZ = [
  [/invalid login credentials/i, "Email yoki parol noto'g'ri. Serverda hali hisobingiz bo'lmasa - avval \"Ro'yxatdan o'tish\"ni bosing."],
  [/email not confirmed/i, "Emailingiz hali tasdiqlanmagan. Pochtangizdagi xatdagi havolani bosing (\"Spam\" papkasini ham tekshiring)."],
  [/user already registered|already been registered/i, "Bu email bilan hisob allaqachon bor - \"Kirish\" orqali kiring"],
  [/password should be at least (\d+)/i, m => `Parol kamida ${m[1]} ta belgidan iborat bo'lsin`],
  [/weak.?password|password is too weak/i, "Parol juda oddiy - harf va raqamlardan iborat uzunroq parol tanlang"],
  [/email address not authorized|not authorized|error sending (confirmation|recovery|magic link)? ?email/i,
    "Bu emailga xat yuborib bo'lmadi: server hozircha faqat loyiha egasining emailiga xat yubora oladi (pochta/SMTP sozlanmagan). Loyiha egasining emaili bilan ro'yxatdan o'ting yoki SMTP ulanishini kuting."],
  [/rate limit|too many|security purposes/i, "Juda ko'p urinish bo'ldi. Bir oz kutib, qayta urinib ko'ring."],
  [/unable to validate email|invalid email|email address .* is invalid/i, "Email noto'g'ri yozilgan"],
  [/fetch failed|network|ENOTFOUND|ECONN|timeout/i, "Internetga ulanib bo'lmadi. Aloqani tekshirib, qayta urinib ko'ring."],
];
function uzError(msg) {
  msg = String(msg || '');
  for (const [re, t] of ERR_UZ) { const m = msg.match(re); if (m) return typeof t === 'function' ? t(m) : t; }
  return msg || "Noma'lum xato";
}

async function req(method, p, body, token, extraHeaders) {
  let r;
  try {
    r = await fetch(URL_ + p, {
      method, signal: AbortSignal.timeout(20000),
      headers: Object.assign({ apikey: ANON, Authorization: 'Bearer ' + (token || ANON), 'Content-Type': 'application/json' }, extraHeaders || {}),
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) { const er = new Error(uzError(e.message)); er.offline = true; throw er; }
  const txt = await r.text();
  let j = null; try { j = txt ? JSON.parse(txt) : null; } catch (e) { }
  if (!r.ok) {
    const m = (j && (j.msg || j.error_description || j.message || j.error)) || ('HTTP ' + r.status);
    const er = new Error(uzError(m)); er.status = r.status; er.raw = m; throw er;
  }
  return j;
}

// ------------------------------------------------------------------ parol asosidagi shifrlash (API kalitlar uchun)
function deriveKey(password, uid) { return crypto.pbkdf2Sync(String(password), 'mittivoy:' + uid, 120000, 32, 'sha256').toString('base64'); }
function encrypt(obj, keyB64) {
  const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', Buffer.from(keyB64, 'base64'), iv);
  const ct = Buffer.concat([c.update(JSON.stringify(obj), 'utf8'), c.final()]);
  return { iv: iv.toString('base64'), tag: c.getAuthTag().toString('base64'), ct: ct.toString('base64') };
}
function decrypt(box, keyB64) {
  try {
    const d = crypto.createDecipheriv('aes-256-gcm', Buffer.from(keyB64, 'base64'), Buffer.from(box.iv, 'base64'));
    d.setAuthTag(Buffer.from(box.tag, 'base64'));
    return JSON.parse(Buffer.concat([d.update(Buffer.from(box.ct, 'base64')), d.final()]).toString('utf8'));
  } catch (e) { return null; }
}

class Cloud {
  constructor(dataDir, safeStorage, log) {
    this.file = path.join(dataDir, 'session.bin');
    this.safe = safeStorage; this.log = log || (() => { });
    this.s = null;            // { access_token, refresh_token, expires_at, user:{id,email,name}, kek }
    this.pushTimer = null;
  }
  // --- sessiyani shu kompyuterda shifrlangan holda saqlash (Windows DPAPI)
  load() {
    try {
      const raw = fs.readFileSync(this.file);
      const txt = this.safe && this.safe.isEncryptionAvailable() ? this.safe.decryptString(raw) : raw.toString('utf8');
      this.s = JSON.parse(txt);
    } catch (e) { this.s = null; }
    return this.s;
  }
  save() {
    try {
      if (!this.s) { fs.rmSync(this.file, { force: true }); return; }
      const txt = JSON.stringify(this.s);
      fs.writeFileSync(this.file, this.safe && this.safe.isEncryptionAvailable() ? this.safe.encryptString(txt) : Buffer.from(txt, 'utf8'));
    } catch (e) { this.log('session save: ' + e.message); }
  }
  setSession(j, password) {
    const u = j.user || {};
    const prev = this.s || {};
    this.s = {
      access_token: j.access_token, refresh_token: j.refresh_token,
      expires_at: Date.now() + (j.expires_in || 3600) * 1000,
      user: { id: u.id, email: u.email, name: (u.user_metadata && u.user_metadata.name) || (prev.user && prev.user.name) || (u.email || '').split('@')[0] },
      kek: password ? deriveKey(password, u.id) : prev.kek || null,
    };
    this.save();
    return this.s.user;
  }

  async signUp(name, email, password) {
    const j = await req('POST', '/auth/v1/signup?redirect_to=' + encodeURIComponent(AUTH_PAGE), { email, password, data: { name } });
    if (j && j.access_token) return { user: this.setSession(j, password), confirmed: true };
    // email tasdiqlash yoqilgan: xat yuborildi
    if (j && (j.identities && j.identities.length === 0)) throw new Error("Bu email bilan hisob allaqachon bor - \"Kirish\" orqali kiring");
    return { confirmed: false };
  }
  async signIn(email, password) {
    const j = await req('POST', '/auth/v1/token?grant_type=password', { email, password });
    return this.setSession(j, password);
  }
  async resend(email) { await req('POST', '/auth/v1/resend', { type: 'signup', email, options: { email_redirect_to: AUTH_PAGE } }); }
  async recover(email) { await req('POST', '/auth/v1/recover?redirect_to=' + encodeURIComponent(AUTH_PAGE), { email }); }
  async refresh() {
    if (!this.s || !this.s.refresh_token) throw new Error('sessiya yo\'q');
    const j = await req('POST', '/auth/v1/token?grant_type=refresh_token', { refresh_token: this.s.refresh_token });
    return this.setSession(j, null);
  }
  async token() {
    if (!this.s) throw new Error('sessiya yo\'q');
    if (Date.now() > this.s.expires_at - 120000) await this.refresh();
    return this.s.access_token;
  }
  async signOut() {
    const s = this.s;
    this.s = null; this.save();
    if (s) { try { await req('POST', '/auth/v1/logout', null, s.access_token); } catch (e) { } }
  }

  // --- ma'lumotlar: { config, memory, keys:{shifrlangan}, updated }
  async pull() {
    const t = await this.token();
    const rows = await req('GET', `/rest/v1/mittivoy_data?select=data,updated_at&user_id=eq.${this.s.user.id}`, null, t);
    if (!rows || !rows.length) return null;
    const d = rows[0].data || {};
    if (d.keys && this.s.kek) { const k = decrypt(d.keys, this.s.kek); d.secret = k || null; }
    delete d.keys;
    return d;
  }
  async push(data) {
    const t = await this.token();
    const body = Object.assign({}, data);
    if (body.secret) { if (this.s.kek) body.keys = encrypt(body.secret, this.s.kek); delete body.secret; }
    body.updated = Date.now();
    await req('POST', '/rest/v1/mittivoy_data', { user_id: this.s.user.id, data: body, updated_at: new Date().toISOString() }, t,
      { Prefer: 'resolution=merge-duplicates,return=minimal' });
    return body.updated;
  }
  schedulePush(getData, ms) {
    clearTimeout(this.pushTimer);
    this.pushTimer = setTimeout(() => { if (this.s) this.push(getData()).catch(e => this.log('sync: ' + (e.raw || e.message))); }, ms || 4000);
  }
}

module.exports = { Cloud, uzError, AUTH_PAGE };
