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
  // xabar ko'rsatish; xato bo'lsa qizil, muvaffaqiyat bo'lsa yashil; kerak bo'lsa "qayta yuborish" havolasi
  function say(id, text, ok, resendEmail) {
    const e = $(id);
    e.textContent = text || '';
    e.classList.toggle('ok', !!ok);
    if (resendEmail) {
      const a = document.createElement('button');
      a.className = 'btn link'; a.textContent = ' Tasdiqlash xatini qayta yuborish';
      a.addEventListener('click', async () => { const r = await api.authResend(resendEmail); say(id, r.ok ? r.msg : r.err, r.ok); });
      e.appendChild(a);
    }
  }
  async function rememberGo() {
    busy($('rGo'), true); say('rErr', 'Kirilmoqda...', true);
    const r = await api.authLogin(me.id, $('rPin').value);
    busy($('rGo'), false);
    if (!r.ok) { say('rErr', r.err, false, r.unconfirmed ? me.email : null); $('rPin').select(); }
  }
  $('rGo').addEventListener('click', rememberGo);
  $('rPin').addEventListener('keydown', e => { if (e.key === 'Enter') rememberGo(); });
  $('rOther').addEventListener('click', () => show('vSignin'));

  async function signin() {
    busy($('sGo'), true); say('sErr', 'Kirilmoqda...', true);
    const r = await api.authSignin($('sEmail').value, $('sPin').value);
    busy($('sGo'), false);
    if (!r.ok) say('sErr', r.err, false, r.unconfirmed ? $('sEmail').value : null);
  }
  $('sGo').addEventListener('click', signin);
  for (const id of ['sEmail', 'sPin']) $(id).addEventListener('keydown', e => { if (e.key === 'Enter') signin(); });

  async function signup() {
    if ($('uPin').value !== $('uPin2').value) { say('uErr', 'Parollar bir xil emas'); return; }
    busy($('uGo'), true); say('uErr', "Ro'yxatdan o'tkazilmoqda...", true);
    const r = await api.authCreate({ name: $('uName').value, email: $('uEmail').value, pin: $('uPin').value });
    busy($('uGo'), false);
    if (r.ok) return;
    if (r.needConfirm) {
      // tasdiqlash xati yuborildi - "Kirish" oynasiga o'tib, email va parolni oldindan to'ldiramiz
      const email = $('uEmail').value, pin = $('uPin').value;
      show('vSignin');
      $('sEmail').value = email; $('sPin').value = pin;
      say('sErr', r.msg, true, email);
      return;
    }
    say('uErr', r.err);
  }
  $('uGo').addEventListener('click', signup);
  for (const id of ['uName', 'uEmail', 'uPin', 'uPin2']) $(id).addEventListener('keydown', e => { if (e.key === 'Enter') signup(); });

  $('toUp').addEventListener('click', () => show('vSignup'));
  $('toIn').addEventListener('click', () => show('vSignin'));
  // parolni unutdim: emailga tiklash havolasi yuboriladi
  const forgot = (errId, emailOf) => async () => {
    const email = emailOf();
    if (!email) { say(errId, 'Avval emailingizni yozing, so\'ng "Parolni unutdingizmi?"ni bosing'); return; }
    say(errId, 'Yuborilmoqda...', true);
    const r = await api.authRecover(email);
    say(errId, r.ok ? r.msg : r.err, r.ok);
  };
  $('rForgot').addEventListener('click', forgot('rErr', () => me && me.email));
  $('sForgot').addEventListener('click', forgot('sErr', () => $('sEmail').value.trim()));

  if (me) show('vRemember');
  else if (st.legacy) {
    // eski (faqat shu kompyuterdagi) hisob bor - serverda bir marta ro'yxatdan o'tish kerak
    show('vSignup');
    $('uName').value = st.legacy.name; $('uEmail').value = st.legacy.email;
    say('uErr', `Hisoblar endi serverda saqlanadi. Eski hisobingiz faqat shu kompyuterda edi - bir marta ro'yxatdan o'ting (yangi parol o'ylab toping).` +
      (st.legacy.pet ? ` ${st.legacy.pet} va uning xotirasi yangi hisobingizga o'tkaziladi.` : ''), true);
    setTimeout(() => (st.legacy.email ? $('uPin') : $('uEmail')).focus(), 80);
  } else show('vSignup');
})();
