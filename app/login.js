(async function () {
  const api = window.kapi;
  const $ = id => document.getElementById(id);
  const st = await api.authState();

  // bezak: qizaloq va bolakay (zamonaviy milliy kiyimda)
  const girl = Character.create({ Gender: 'girl', Outfit: 'zamonaviy', Skin: 'orta', Hair: 'qora' }, 'g');
  const boy = Character.create({ Gender: 'boy', Outfit: 'zamonaviy', Skin: 'orta', Hair: 'qora' }, 'b');
  girl.setMood('xursand'); boy.setMood('xursand');
  $('duo').append(girl.svg, boy.svg);
  let t = 0;
  (function loop() {
    t += 1 / 60;
    girl.pose({ armR: -150 + Math.sin(t * 9) * 22, by: -Math.abs(Math.sin(t * 3)) * 5, head: Math.sin(t * 1.4) * 5 });
    boy.pose({ armL: 150 - Math.sin(t * 9 + 1) * 22, by: -Math.abs(Math.sin(t * 3 + 1.5)) * 5, head: -Math.sin(t * 1.4) * 5 });
    requestAnimationFrame(loop);
  })();

  function show(v) {
    for (const id of ['vRemember', 'vSignin', 'vSignup']) $(id).classList.toggle('hidden', id !== v);
    for (const id of ['rErr', 'sErr', 'uErr']) { $(id).textContent = ''; $(id).classList.remove('ok'); }
    const first = { vRemember: 'rPin', vSignin: 'sEmail', vSignup: 'uName' }[v];
    setTimeout(() => $(first).focus(), 60);
  }
  function busy(btn, on) { btn.disabled = on; }

  // Google tugmasi (faqat sozlangan bo'lsa)
  for (const w of ['gWrap1', 'gWrap2']) {
    if (!st.google) continue;
    const b = document.createElement('button');
    b.className = 'btn google'; b.textContent = 'G  Google bilan kirish';
    b.addEventListener('click', async () => {
      b.disabled = true;
      const r = await api.authGoogle();
      if (!r.ok) { b.disabled = false; $(w === 'gWrap1' ? 'sErr' : 'uErr').textContent = r.err; }
    });
    $(w).appendChild(b);
  }

  // eslab qolingan hisob
  const me = st.remembered;
  if (me) {
    const ch = Character.create({ Gender: me.gender, Outfit: me.outfit, Skin: me.skin, Hair: me.hair }, 'm');
    ch.setMood('xursand');
    $('meChar').appendChild(ch.svg);
    $('meName').textContent = me.name + (me.pet ? ' va ' + me.pet : '');
    $('meEmail').textContent = me.email;
    $('sEmail').value = me.email;
  }
  async function rememberGo() {
    busy($('rGo'), true);
    const r = await api.authLogin(me.id, $('rPin').value);
    busy($('rGo'), false);
    if (!r.ok) { $('rErr').textContent = r.err === 'google' ? 'Bu hisob Google orqali ochilgan.' : r.err; $('rPin').select(); }
  }
  $('rGo').addEventListener('click', rememberGo);
  $('rPin').addEventListener('keydown', e => { if (e.key === 'Enter') rememberGo(); });
  $('rOther').addEventListener('click', () => show('vSignin'));

  async function signin() {
    busy($('sGo'), true);
    const r = await api.authSignin($('sEmail').value, $('sPin').value);
    busy($('sGo'), false);
    if (!r.ok) $('sErr').textContent = r.err === 'google' ? 'Bu hisob Google orqali ochilgan - "Google bilan kirish"ni bosing.' : r.err;
  }
  $('sGo').addEventListener('click', signin);
  for (const id of ['sEmail', 'sPin']) $(id).addEventListener('keydown', e => { if (e.key === 'Enter') signin(); });

  async function signup() {
    if ($('uPin').value !== $('uPin2').value) { $('uErr').textContent = 'Parollar bir xil emas'; return; }
    busy($('uGo'), true);
    const r = await api.authCreate({ name: $('uName').value, email: $('uEmail').value, pin: $('uPin').value });
    busy($('uGo'), false);
    if (!r.ok) $('uErr').textContent = r.err;
  }
  $('uGo').addEventListener('click', signup);
  for (const id of ['uName', 'uEmail', 'uPin', 'uPin2']) $(id).addEventListener('keydown', e => { if (e.key === 'Enter') signup(); });

  $('toUp').addEventListener('click', () => show('vSignup'));
  $('toIn').addEventListener('click', () => show('vSignin'));
  const forgot = errId => () => {
    const e = $(errId);
    e.classList.remove('ok');
    e.textContent = "Parolni email orqali tiklash bulutli hisob (server) ulangandan keyin ishlaydi. Hozircha hisobingiz shu kompyuterda saqlanadi.";
  };
  $('rForgot').addEventListener('click', forgot('rErr'));
  $('sForgot').addEventListener('click', forgot('sErr'));

  show(me ? 'vRemember' : 'vSignup');
})();
