(async function () {
  const api = window.kapi;
  const $ = id => document.getElementById(id);
  const first = new URLSearchParams(location.search).get('first') === '1';
  const { cfg, found, profile } = await api.settingsGet();
  const c = Object.assign({}, cfg);
  $('who').textContent = profile.name;
  $('logout').addEventListener('click', () => api.logout());

  // ---- AI ulanishlari: holat belgisi (badge), ramka rangi va natija qatori
  function badge(which, cls, text) { const b = $('b' + which); b.className = 'badge ' + cls; b.textContent = text; }
  function result(which, cls, text) {
    const r = $('r' + which);
    r.className = 'res ' + cls; r.textContent = text;
    $('kr' + which).classList.toggle('good', cls === 'on');
    $('kr' + which).classList.toggle('bad', cls === 'off');
  }
  const secs = ms => (ms / 1000).toFixed(1).replace('.', ',') + ' soniya';

  // Claude Code
  async function refreshClaude() {
    const s = await api.claudeStatus();
    $('claudeInstall').classList.toggle('hidden', !s.missing);
    $('claudeConnect').classList.toggle('hidden', !!s.missing || !!s.loggedIn);
    if (s.missing) { badge('Claude', 'off', "✗ O'rnatilmagan"); $('claudeWhere').textContent = 'Claude Code bu kompyuterda topilmadi'; }
    else if (s.loggedIn) { badge('Claude', 'on', '✓ Ulangan'); $('claudeWhere').textContent = 'Hisob: ' + (s.email || 'claude.ai'); }
    else { badge('Claude', 'off', '✗ Ulanmagan'); $('claudeWhere').textContent = "Claude Code bor, lekin hisobga kirilmagan"; }
    return s;
  }
  async function testClaude() {
    $('claudeTest').disabled = true;
    badge('Claude', 'wait', '⏳ Tekshirilmoqda');
    result('Claude', 'wait', "Claude'ga sinov xabari yuborilyapti... (10-30 soniya)");
    const r = await api.checkClaude();
    $('claudeTest').disabled = false;
    await refreshClaude();
    if (r.ok) { badge('Claude', 'on', '✓ Ishlayapti'); result('Claude', 'on', `✓ Claude ishlayapti! Javob ${secs(r.ms)}da keldi. Endi Mittivoy dastur ochish, Telegram'ga yozish kabi vazifalarni bajara oladi.`); }
    else { badge('Claude', 'off', '✗ Ishlamayapti'); result('Claude', 'off', '✗ ' + r.err); }
  }
  async function connectClaude() {
    const s0 = await refreshClaude();
    if (s0.loggedIn) return testClaude();
    $('claudeConnect').disabled = true;
    badge('Claude', 'wait', '⏳ Kirish kutilmoqda');
    result('Claude', 'wait', 'Brauzerda Claude kirish sahifasi ochiladi - hisobingiz bilan kirib, "Authorize" ni bosing.');
    const r = await api.connectClaude(profile.email || '');
    $('claudeConnect').disabled = false;
    $('codeRow').classList.add('hidden');
    if (r.ok) { await refreshClaude(); testClaude(); }
    else { await refreshClaude(); result('Claude', 'off', '✗ ' + (r.err || 'Ulanmadi')); }
  }
  async function installClaude() {
    $('claudeInstall').disabled = true;
    badge('Claude', 'wait', "⏳ O'rnatilmoqda");
    result('Claude', 'wait', "Ko'k oyna ochildi - Claude Code rasmiy saytdan o'rnatilmoqda (1-3 daqiqa). Tugashini kuting...");
    const r = await api.installClaude();
    $('claudeInstall').disabled = false;
    await refreshClaude();
    if (r.ok) { result('Claude', 'on', '✓ Claude Code o\'rnatildi! Endi "Ulash" ni bosing.'); }
    else result('Claude', 'off', '✗ ' + r.err);
  }
  api.on('auth-log', d => {
    if (d.url) {
      const r = $('rClaude'); r.className = 'res wait';
      r.textContent = 'Brauzerda kiring va tasdiqlang. ';
      const a = document.createElement('a'); a.textContent = 'Brauzer ochilmadimi? Shu yerni bosing ↗';
      a.addEventListener('click', () => api.openExternal(d.url));
      r.appendChild(a);
    } else if (d.text) result('Claude', 'wait', d.text);
    if (d.text && /code|kod/i.test(d.text)) {
      $('codeRow').classList.remove('hidden');
      if (/invalid code/i.test(d.text)) result('Claude', 'off', "Kod noto'g'ri qo'yildi. Brauzerdagi kodni \"Copy Code\" tugmasi bilan to'liq nusxalang va qaytadan qo'ying.");
    }
  });
  $('sendCode').addEventListener('click', () => { api.authCode($('authCode').value); $('authCode').value = ''; });
  $('claudeTest').addEventListener('click', testClaude);
  $('claudeConnect').addEventListener('click', connectClaude);
  $('claudeInstall').addEventListener('click', installClaude);
  refreshClaude();

  $('claudeToken').addEventListener('click', async () => {
    const r = await api.claudeSetupToken();
    result('ClaudeKey', r.ok ? 'wait' : 'off', r.ok ? "Qora oyna ochildi: brauzerda Claude hisobingizga kiring. Oxirida chiqqan sk-ant-oat... tokenni nusxalab, shu maydonga qo'ying va ✅ Tekshirish ni bosing." : '✗ ' + r.err);
  });

  // API kalitlar (Gemini, Groq, Claude): qo'yish -> tekshirish -> (ishlasa) darhol saqlash
  const KEYS = { Gemini: { id: 'GeminiKey', which: 'gemini' }, Groq: { id: 'GroqKey', which: 'groq' }, FreeLlm: { id: 'FreeLlmKey', which: 'freellm' }, ClaudeKey: { id: 'ClaudeKey', which: 'claude' } };
  const mask = k => k.length > 12 ? k.slice(0, 6) + '…' + k.slice(-4) : '…';
  function keyIdle(name) {
    const k = $(KEYS[name].id).value.trim(), saved = (c[KEYS[name].id] || '') === k && !!k;
    $('del' + name).classList.toggle('hidden', !c[KEYS[name].id]);
    if (!k) badge(name, '', name === 'Gemini' ? "Kalit yo'q" : 'Ixtiyoriy');
    else if (saved) badge(name, 'saved', 'Saqlangan ' + mask(k));
    else badge(name, 'wait', 'Tekshirilmagan');
  }
  async function testKey(name, quiet) {
    const { id, which } = KEYS[name];
    const k = $(id).value.replace(/\s+/g, '');
    $(id).value = k;
    if (!k) { result(name, 'off', "Avval kalitni maydonga qo'ying: saytdan nusxalang (Copy), so'ng 📋 Qo'yish tugmasini bosing."); return; }
    $('test' + name).disabled = true;
    badge(name, 'wait', '⏳ Tekshirilmoqda');
    if (!quiet) result(name, 'wait', which === 'claude' ? "Claude'ga sinov xabari yuborilyapti... (10-30 soniya)" : 'Kalit tekshirilmoqda...');
    const r = await api.checkKey(which, k, true);
    $('test' + name).disabled = false;
    if (r.ok) {
      c[id] = k;
      badge(name, 'on', '✓ Ishlayapti');
      const via = { openai: 'Google AI Studio', native: 'Gemini API', vertex: 'Vertex AI' }[r.kind];
      result(name, 'on', (r.warn ? '✓ ' + r.warn : `✓ Kalit ishlayapti${via ? ' (' + via + ' orqali)' : ''}! Javob ${secs(r.ms)}da keldi.`) + (r.saved ? ' Kalit saqlandi - Mittivoy undan foydalanyapti.' : ''));
      $('del' + name).classList.remove('hidden');
      if (which === 'claude') { await refreshClaude(); badge('Claude', 'on', '✓ Ishlayapti'); }
    } else {
      badge(name, 'off', '✗ Ishlamayapti');
      result(name, 'off', '✗ ' + r.err + ' ');
      if (r.url) {   // masalan: Vertex AI API yoqilmagan - Google'ning aniq "yoqish" sahifasi
        const a = document.createElement('a'); a.textContent = r.urlText || 'Yoqish ↗';
        a.addEventListener('click', () => api.openExternal(r.url));
        $('r' + name).appendChild(a);
      }
    }
  }
  for (const name of Object.keys(KEYS)) {
    const inp = $(KEYS[name].id);
    inp.value = c[KEYS[name].id] || '';
    keyIdle(name);
    inp.addEventListener('input', () => { keyIdle(name); $('r' + name).classList.add('hidden'); $('kr' + name).classList.remove('good', 'bad'); });
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') testKey(name); });
    inp.addEventListener('paste', () => setTimeout(() => testKey(name), 50));   // Ctrl+V qilinsa - darhol tekshiradi
    $('test' + name).addEventListener('click', () => testKey(name));
    $('eye' + name).addEventListener('click', () => { inp.type = inp.type === 'password' ? 'text' : 'password'; });
    $('paste' + name).addEventListener('click', async () => {
      const t = (await api.clipboardText()).replace(/\s+/g, '');
      if (!t) { result(name, 'off', "Buferda hech narsa yo'q. Avval saytdan kalitni nusxalang (Copy)."); return; }
      inp.value = t; keyIdle(name); testKey(name);
    });
    $('del' + name).addEventListener('click', async () => {
      if (!confirm(name + ' kaliti o\'chirilsinmi?')) return;
      await api.removeKey(KEYS[name].which);
      c[KEYS[name].id] = ''; inp.value = ''; keyIdle(name);
      result(name, '', 'Kalit o\'chirildi.');
    });
    if (inp.value && name !== 'ClaudeKey') testKey(name, true);   // saqlangan kalit hozir ham ishlayaptimi - oynani ochishda o'zi tekshiradi
  }

  // ---- yangilanish (GitHub relizlari)
  function updShow(u) {
    $('updGo').classList.toggle('hidden', !(u && u.available) || !!u.busy);
    $('updCheck').disabled = !!(u && u.busy);
    $('updBar').classList.toggle('hidden', !(u && u.busy));
    if (u && u.busy) $('updFill').style.width = Math.round((u.progress || 0) * 100) + '%';
    const t = $('updText');
    t.style.color = u && u.error ? '#C62828' : u && u.available ? '#2E7D32' : '';
    t.style.fontWeight = u && u.available ? '700' : '';
    if (!u) t.textContent = "Yangi versiya GitHub'dan tekshiriladi";
    else if (u.busy) t.textContent = u.stage || 'Yuklanmoqda...';
    else if (u.error) t.textContent = '✗ ' + u.error;
    else if (u.available) t.textContent = `✨ Yangi versiya bor: ${u.latest}! "Yangilash" ni bosing - ${u.lite ? '1-2 soniyada' : '1-2 daqiqada'} o'rnatiladi.`;
    else if (u.latest) t.textContent = `✓ Sizda eng so'nggi versiya (${u.latest})`;
  }
  const u0 = await api.updateCheck(true);   // keshdagi holat - internetga chiqmaydi
  $('curVer').textContent = u0.current || '';
  if (u0.latest || u0.busy) updShow(u0);
  api.on('update-state', updShow);
  $('updCheck').addEventListener('click', async () => {
    $('updCheck').disabled = true; $('updText').textContent = '⏳ GitHub tekshirilmoqda...'; $('updText').style.color = '';
    updShow(await api.updateCheck());
    $('updCheck').disabled = false;
  });
  $('updGo').addEventListener('click', async () => { const r = await api.updateInstall(); if (r && !r.ok) updShow({ error: r.err }); });

  // ---- xotira
  function renderMem(list) {
    const box = $('memList'); box.innerHTML = '';
    if (!list.length) { box.innerHTML = '<div class="note">Hozircha hech narsa eslab qolinmagan.</div>'; return; }
    list.forEach((t, i) => {
      const d = document.createElement('div'); d.className = 'mem';
      const s = document.createElement('span'); s.textContent = t;
      const b = document.createElement('button'); b.textContent = '✕'; b.title = "O'chirish";
      b.addEventListener('click', async () => renderMem(await api.memoryDelete(i)));
      d.append('🧠', s, b); box.appendChild(d);
    });
  }
  renderMem(await api.memoryGet());
  $('memClear').addEventListener('click', async () => { if (confirm("Hamma eslab qolingan narsalar o'chirilsinmi?")) renderMem(await api.memoryClear()); });

  if (first) {
    $('title').textContent = 'Salom! Keling, tanishamiz 👋';
    $('subtitle').textContent = "Ismlarni yozing, qahramoningizni tanlang va \"Boshlash\"ni bosing";
    $('save').textContent = 'Boshlash ▶';
    $('cancel').textContent = 'Chiqish';
  }

  for (const k of ['UserName', 'PetName', 'ClaudePath', 'GroqKey', 'FreeLlmKey', 'GeminiKey']) $(k).value = c[k] || '';
  for (const k of ['Skin', 'Hair', 'Provider']) $(k).value = c[k] || $(k).options[0].value;
  for (const k of ['FullAccess', 'Chatty', 'Autostart']) $(k).checked = !!c[k];
  $('AutoUpdate').checked = c.AutoUpdate !== false;

  document.querySelectorAll('.cards').forEach(group => {
    const key = group.dataset.key;
    const sync = () => group.querySelectorAll('.card').forEach(x => x.classList.toggle('on', x.dataset.v === c[key]));
    group.querySelectorAll('.card').forEach(card => card.addEventListener('click', () => { c[key] = card.dataset.v; sync(); preview(); }));
    sync();
  });
  $('Skin').addEventListener('change', () => { c.Skin = $('Skin').value; preview(); });
  $('Hair').addEventListener('change', () => { c.Hair = $('Hair').value; preview(); });
  $('PetName').addEventListener('input', () => { $('prevName').textContent = $('PetName').value || '...'; });
  $('prevName').textContent = c.PetName || '...';

  function status(path) {
    const ok = $('ok');
    if (path) { ok.textContent = '✓ Claude Code topildi'; ok.style.color = '#2E7D32'; }
    else { ok.textContent = "✗ Claude Code topilmadi - bepul serverlar ishlaydi"; ok.style.color = '#C62828'; }
  }
  status(found);
  $('find').addEventListener('click', async () => { const f = await api.findClaude(); $('ClaudePath').value = f || ''; status(f); });
  $('login').addEventListener('click', () => api.login());
  document.querySelectorAll('a[data-url]').forEach(a => a.addEventListener('click', () => api.openExternal(a.dataset.url)));

  // jonli ko'rinish
  let P = null, mood = 'xursand', t = 0;
  function preview() {
    if (P) P.svg.remove();
    P = Character.create(c, 's');
    P.svg.setAttribute('width', '220'); P.svg.setAttribute('height', '275');
    $('prev').appendChild(P.svg);
    P.setMood(mood);
  }
  preview();
  const names = { oddiy: 'oddiy', xursand: 'xursand', kulgi: 'kulgi', hafa: 'xafa', jahl: 'jahl', hayron: 'hayron', sevgi: 'sevgi', oylash: "o'ylash", uyqu: 'uyqu', uyalish: 'uyalish', zerikish: 'zerikish', qorqish: "qo'rquv", boshaylanish: 'bosh aylanishi' };
  for (const m of Character.MOODS) {
    const s = document.createElement('span'); s.textContent = names[m] || m;
    s.addEventListener('click', () => { mood = m; P.setMood(m); });
    $('moods').appendChild(s);
  }
  (function loop() {
    t += 1 / 60;
    if (P) P.pose({ armR: -150 + Math.sin(t * 9) * 22, armL: 10 + Math.sin(t * 2) * 3, by: -Math.abs(Math.sin(t * 3)) * 6, head: Math.sin(t * 1.5) * 5 });
    requestAnimationFrame(loop);
  })();

  $('save').addEventListener('click', () => {
    c.UserName = $('UserName').value.trim();
    c.PetName = $('PetName').value.trim();
    if (!c.UserName || !c.PetName) {
      (c.UserName ? $('PetName') : $('UserName')).focus();
      $('subtitle').textContent = "⚠ Iltimos, o'z ismingizni va yordamchining ismini yozing";
      $('subtitle').style.color = '#C62828';
      return;
    }
    for (const k of ['ClaudePath', 'GroqKey', 'FreeLlmKey', 'GeminiKey', 'ClaudeKey']) c[k] = $(k).value.replace(/\s+/g, '');
    for (const k of ['Skin', 'Hair', 'Provider']) c[k] = $(k).value;
    for (const k of ['FullAccess', 'Chatty', 'Autostart', 'AutoUpdate']) c[k] = $(k).checked;
    api.settingsSave(c);
  });
  $('cancel').addEventListener('click', () => api.settingsCancel());
  setTimeout(() => (c.UserName ? $('PetName') : $('UserName')).focus(), 100);
})();
