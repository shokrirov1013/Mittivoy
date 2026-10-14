(async function () {
  const api = window.kapi;
  const $ = id => document.getElementById(id);
  const first = new URLSearchParams(location.search).get('first') === '1';
  const { cfg, found, profile } = await api.settingsGet();
  const c = Object.assign({}, cfg);
  $('who').textContent = profile.name;
  $('accEmail').value = profile.email || '';
  $('logout').addEventListener('click', () => api.logout());

  // ---- hisoblar holati
  function chip(which, on, text) {
    $('chip' + which).classList.toggle('on', on);
    $('st' + which).textContent = text;
  }
  async function refreshClaude() {
    const s = await api.claudeStatus();
    if (s.missing) chip('Claude', false, "Claude Code o'rnatilmagan");
    else chip('Claude', s.loggedIn, s.loggedIn ? '✓ ulangan' + (s.email ? ' (' + s.email + ')' : '') : 'ulanmagan');
    return s;
  }
  function refreshGemini() {
    const k = $('GeminiKey').value.trim();
    chip('Gemini', !!k, k ? '✓ kalit bor' : 'ulanmagan');
  }
  refreshClaude(); refreshGemini();
  $('GeminiKey').addEventListener('input', refreshGemini);

  function authLog(text) { const l = $('authLog'); l.classList.remove('hidden'); l.textContent = text; }
  api.on('auth-log', d => {
    if (d.url) {
      authLog('');
      const a = document.createElement('a'); a.textContent = 'Brauzer ochilmadimi? Shu yerni bosing ↗';
      a.addEventListener('click', () => api.openExternal(d.url));
      $('authLog').appendChild(a);
    } else if (d.text) authLog(d.text);
    if (d.text && /code|kod/i.test(d.text)) {
      $('codeRow').classList.remove('hidden');
      if (/invalid code/i.test(d.text)) authLog("Kod noto'g'ri qo'yildi. Brauzerdagi kodni oxirigacha to'liq nusxalang (\"Copy Code\" tugmasi bilan) va qaytadan qo'ying. Bo'lmasa, \"Terminal orqali kirish\" tugmasini bosing.");
    }
  });
  $('sendCode').addEventListener('click', () => { api.authCode($('authCode').value); $('authCode').value = ''; });

  async function connectClaude() {
    const s0 = await refreshClaude();
    if (s0.loggedIn) return true;
    if (s0.missing) { api.openExternal('https://claude.com/claude-code'); authLog("Avval Claude Code'ni o'rnating (Claude ilovasini o'rnatsangiz ham bo'ladi), so'ng qaytadan bosing."); return false; }
    chip('Claude', false, '⏳ brauzerda kiring...');
    authLog('Brauzerda Claude kirish sahifasi ochildi - hisobingiz bilan tasdiqlang.');
    const r = await api.connectClaude($('accEmail').value.trim());
    await refreshClaude();
    if (r.ok) { authLog('✓ Claude ulandi!'); $('codeRow').classList.add('hidden'); return true; }
    authLog('Claude: ' + (r.err || 'ulanmadi'));
    return false;
  }
  async function connectGemini() {
    chip('Gemini', false, '⏳ kalitni nusxalang...');
    authLog('Google AI Studio ochildi: "Create API key" ni bosing va kalitni nusxalang (Copy). Qolganini o\'zim qilaman.');
    const r = await api.connectGemini();
    if (r.ok) { $('GeminiKey').value = r.key; c.GeminiKey = r.key; authLog('✓ Gemini ulandi!'); }
    else authLog('Gemini: ' + (r.err || 'ulanmadi'));
    refreshGemini();
    return r.ok;
  }
  // kalitni qo'lda qo'yish: tekshiradi va darhol saqlaydi ("Saqlash" bosish shart emas)
  async function saveGem() {
    const k = $('gemQuick').value.trim();
    if (!k) { authLog('Avval Gemini kalitini maydonga qo\'ying (Ctrl+V)'); return; }
    $('gemSave').disabled = true; chip('Gemini', false, '⏳ tekshirilmoqda...');
    const r = await api.saveGeminiKey(k);
    $('gemSave').disabled = false;
    if (r.ok) { $('GeminiKey').value = k; c.GeminiKey = k; $('gemQuick').value = ''; authLog('✓ Gemini ulandi va saqlandi!'); }
    else authLog('Gemini: ' + r.err);
    refreshGemini();
  }
  $('gemSave').addEventListener('click', saveGem);
  $('gemQuick').addEventListener('keydown', e => { if (e.key === 'Enter') saveGem(); });
  $('connClaude').addEventListener('click', connectClaude);
  $('connGemini').addEventListener('click', connectGemini);
  $('connectAll').addEventListener('click', async () => {
    $('connectAll').disabled = true;
    await connectClaude();
    if (!$('GeminiKey').value.trim()) await connectGemini();
    $('connectAll').disabled = false;
  });

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

  for (const k of ['UserName', 'PetName', 'ClaudePath', 'GroqKey', 'GeminiKey']) $(k).value = c[k] || '';
  for (const k of ['Skin', 'Hair', 'Provider']) $(k).value = c[k] || $(k).options[0].value;
  for (const k of ['FullAccess', 'Chatty', 'Autostart']) $(k).checked = !!c[k];

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
    for (const k of ['ClaudePath', 'GroqKey', 'GeminiKey']) c[k] = $(k).value.trim();
    for (const k of ['Skin', 'Hair', 'Provider']) c[k] = $(k).value;
    for (const k of ['FullAccess', 'Chatty', 'Autostart']) c[k] = $(k).checked;
    api.settingsSave(c);
  });
  $('cancel').addEventListener('click', () => api.settingsCancel());
  setTimeout(() => (c.UserName ? $('PetName') : $('UserName')).focus(), 100);
})();
