// Mittivoy - qahramon xulq-atvori: fizika, oynalar ustida sayr, o'yinlar, ehtiyojlar, hissiyotlar, suhbat.
(async function () {
  const api = window.kapi;
  let cfg = await api.getConfig();
  const $ = id => document.getElementById(id);
  const petEl = $('pet'), hit = $('hit'), emoteEl = $('emote'), bubble = $('bubble'), btext = $('btext'), binput = $('binput');
  const thought = $('thought'), fxEl = $('fx'), ballEl = $('ball'), bstatus = $('bstatus');
  let W = innerWidth, H = innerHeight;

  const rnd = Math.random, R = (a, b) => a + rnd() * (b - a), pick = a => a[Math.floor(rnd() * a.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const U = s => String(s).replace(/\{u\}/g, cfg.UserName || '');
  const now = () => Date.now();

  // ------------------------------------------------------------------ qahramon
  let P = null;
  function buildPet() {
    if (P) P.svg.remove();
    P = Character.create(cfg, 'p');
    P.svg.setAttribute('width', '120'); P.svg.setAttribute('height', '150');
    petEl.insertBefore(P.svg, hit);
    $('bname').textContent = cfg.PetName || 'Mittivoy';
  }
  buildPet();

  const HALF = 60, FEET = 140;                 // oyoq markazi: chapdan 60px, tepadan 140px
  const G = 2300, WALK = 78, RUN = 210, CLIMB = 75;

  // ------------------------------------------------------------------ platformalar (pastki qism + oynalar tepasi)
  const floor = { id: 'floor', y: H, x1: 50, x2: W - 50 };
  let plats = [floor], wins = [];
  addEventListener('resize', () => { W = innerWidth; H = innerHeight; floor.y = H; floor.x2 = W - 50; });

  const S = {
    x: W - 280, y: H, vx: 0, vy: 0, plat: floor, air: false, mode: 'idle', modeT: 0, dur: 2, t: 0, face: -1,
    target: 0, onArrive: null, climb: null, rot: 0, spin: 0, kick: 0, dragging: false, thrown: false,
    busy: false, busySince: 0, chat: false, chatClose: 0, mood: 'oddiy', moodUntil: 0, talkUntil: 0,
    nextBlink: 0, blinkEnd: 0, pending: null, fallbackNoted: false, stroke: 0, petCooldown: 0,
    nextCheckIn: now() + R(18, 30) * 60000, nextThought: now() + R(1.5, 3) * 60000, nextSulk: now() + 20 * 60000,
  };
  const needs = Object.assign({ energy: 80, fun: 70, love: 70 }, cfg.Needs || {});
  const cursor = { x: -9999, y: -9999, t: 0 };
  let idleSec = 0, wasAway = false;

  function subtract(segs, a, b) {
    const out = [];
    for (const [x1, x2] of segs) {
      if (b <= x1 || a >= x2) { out.push([x1, x2]); continue; }
      if (a > x1) out.push([x1, a]);
      if (b < x2) out.push([b, x2]);
    }
    return out;
  }

  api.on('windows', list => {
    wins = list || [];
    const np = [floor];
    wins.forEach((w, i) => {
      const top = w.y;
      if (top > H - 90 || w.y + w.h < 200) return;
      // yuqori chet ekranning tepasiga juda yaqin (yoki oyna to'liq ochilgan) - ustida o'tirib bo'lmaydi, chetiga osilib oladi
      const hang = top < 150;
      const edge = Math.max(top, 0);
      let segs = [[Math.max(w.x + 10, 10), Math.min(w.x + w.w - 10, W - 10)]];
      for (let j = 0; j < i; j++) {
        const o = wins[j];
        if (o.y <= edge + 2 && o.y + o.h > edge - 2) segs = subtract(segs, o.x - 4, o.x + o.w + 4);
      }
      for (const s of segs) if (s[1] - s[0] >= 80) np.push({ id: w.id, y: hang ? Math.max(edge + 84, 150) : top, x1: s[0] + 16, x2: s[1] - 16, win: w, hang });
    });
    updateRiding(np);
    plats = np;
  });

  // tezkor kuzatuv: qahramon turgan (yoki tirmashayotgan) oyna har ~15 ms da keladi - oyna bilan birga silliq siljiydi
  let rideSent = '';
  function syncRide() {
    const id = S.mode === 'climb' && S.climb ? S.climb.target.id : (S.plat && S.plat.id !== 'floor' && !S.air ? S.plat.id : '');
    if (id !== rideSent) { rideSent = id; api.ride(id); }
  }
  api.on('winpos', d => {
    if (S.dragging || S.air) return;
    if (d.gone) return startFall(true);
    if (S.mode === 'climb' && S.climb && S.climb.target.id === d.id) {
      const t = S.climb.target, w = t.win, dx = d.x - w.x, dy = d.y - w.y;
      t.win = { id: d.id, x: d.x, y: d.y, w: d.w, h: d.h }; t.y += dy; t.x1 += dx; t.x2 += dx;
      S.x = S.climb.side < 0 ? d.x - 4 : d.x + d.w + 4; if (S.y < t.y) S.y = t.y;
      S.lastWinMove = now();
      return;
    }
    const p = S.plat;
    if (!p || p.id !== d.id || !p.win) return;
    const dx = d.x - p.win.x, dy = d.y - p.win.y;
    if (!dx && !dy) return;
    p.win = { id: d.id, x: d.x, y: d.y, w: d.w, h: d.h };
    p.y += dy; p.x1 += dx; p.x2 += dx;
    S.x += dx; S.y = p.y;
    if (S.mode === 'walk' || S.mode === 'run') S.target += dx;
    if (p.y < 150 || p.y > H - 40) return startFall(true);
    S.lastWinMove = now();
    if (Math.abs(dx) + Math.abs(dy) > 40 && rnd() < 0.08 && !S.chat)
      think(pick(['Voy, oyna qimirlayapti! 😆', 'Uuu, men poyezddaman! 🚂', 'Sekinroq, yiqilib tushaman! 😵', 'Yana, yana! 🎢']), 2.5);
  });

  function updateRiding(np) {
    if (S.mode === 'climb' && S.climb) {
      const t = np.find(p => p.id === S.climb.target.id);
      if (!t) return startFall(true);
      if (now() - (S.lastWinMove || 0) < 700) return;   // tezkor kuzatuv yangiroq ma'lumot beryapti
      const w = t.win;
      S.climb.target = t;
      S.x = S.climb.side < 0 ? w.x - 4 : w.x + w.w + 4;
      if (S.y < t.y) S.y = t.y;
      return;
    }
    const cur = S.plat;
    if (!cur || cur.id === 'floor' || S.air || S.dragging) return;
    const w = wins.find(w => w.id === cur.id);
    const cands = np.filter(p => p.id === cur.id);
    if (!w || !cands.length) return startFall(true);
    // oyna hozir harakatlanyapti - tezkor kuzatuv (15 ms) yangiroq; eski ro'yxat bilan orqaga tortmaymiz
    if (rideSent === cur.id && now() - (S.lastWinMove || 0) < 700) return;
    const dx = w.x - cur.win.x, dy = w.y - cur.win.y;
    S.x += dx; S.y += dy;
    const p = cands.find(p => S.x >= p.x1 - 30 && S.x <= p.x2 + 30);
    if (!p) return startFall(true);
    S.plat = p; S.y = p.y; S.x = clamp(S.x, p.x1, p.x2);
    if (S.mode === 'walk' || S.mode === 'run') S.target = clamp(S.target + dx, p.x1, p.x2);
  }

  // ------------------------------------------------------------------ holat boshqaruvi
  function setMode(m, dur) { S.mode = m; S.modeT = 0; S.dur = dur == null ? 2 : dur; }
  function grounded() { return !S.air && !S.dragging && S.mode !== 'climb'; }

  function walkTo(x, run, then) {
    const p = S.plat || floor;
    S.target = clamp(x, p.x1, p.x2);
    S.onArrive = then || null;
    setMode(run ? 'run' : 'walk', 40);
  }

  function startFall(surprised) {
    S.air = true; S.plat = null; S.climb = null;
    S.vy = Math.min(S.vy, 0);
    setMode('fall', 99);
    if (surprised) { setMood('qorqish', 2); think(pick(['Voy-voy-voy! 😱', 'Yiqilyapman! 🙀', 'Aaa! 😵']), 2); }
  }

  function jumpTo(tx, ty) {
    const T = 0.75;
    S.vx = (tx - S.x) / T;
    S.vy = (ty - S.y) / T - 0.5 * G * T;
    S.air = true; S.plat = null; S.face = Math.sign(tx - S.x) || S.face;
    setMode('jump', 99);
  }
  function hop(vx, vy, spin) { S.vx = vx; S.vy = vy; S.air = true; S.plat = null; S.spin = spin || 0; setMode(spin ? 'cartwheel' : 'jump', 99); }

  function land(p) {
    const v = S.vy;
    S.y = p.y; S.plat = p; S.air = false; S.vx = 0; S.vy = 0; S.rot = 0; S.spin = 0;
    S.x = clamp(S.x, p.x1, p.x2);
    if (v > 1900) {
      setMode('dizzy', 3); needs.fun += 3;
      spawnFx('💫', S.x, S.y - 150);
      think(pick(['Boshim aylandi... 😵‍💫', "Yulduzchalar ko'ryapman ⭐", "Ehtiyot bo'ling-da! 😤"]), 3);
    } else if (S.thrown && v > 800) {
      setMode('land', 0.4); needs.fun += 4;
      think(pick(['Yana! Yana! 😆', 'Uchdim-a! ✈️', 'Uff! 😅', 'Juda zo\'r edi! 🤩']), 2.5);
    } else if (S.climbDone) {
      S.climbDone = false; needs.fun += 3;
      if (p.hang) { setMode('hang', R(5, 10)); think(pick(['Osilib turibman! 🐒', 'Voy, baland ekan! 😆', 'Qo\'limni qo\'yib yubormayman! 💪']), 3); }
      else { setMode('land', 0.3); think(pick(['Yuqoriga chiqdim! 🎉', "Bu yerdan hamma narsa ko'rinadi! 😄", 'Men eng balanddaman! 🏔️']), 3); }
    } else setMode('land', 0.25);
    S.thrown = false;
  }

  function airStep(dt) {
    const py = S.y;
    S.vy += G * dt;
    S.x += S.vx * dt; S.y += S.vy * dt;
    if (S.spin) S.rot += S.spin * 720 * dt;
    if (S.x < HALF - 15) { S.x = HALF - 15; S.vx = Math.abs(S.vx) * 0.6; }
    if (S.x > W - HALF + 15) { S.x = W - HALF + 15; S.vx = -Math.abs(S.vx) * 0.6; }
    if (S.y < FEET + 10 && S.vy < 0) { S.y = FEET + 10; S.vy = Math.abs(S.vy) * 0.3; }
    if (S.vy > 0) {
      let best = null;
      for (const p of plats) if (!p.hang && py <= p.y + 1 && S.y >= p.y && S.x >= p.x1 - 20 && S.x <= p.x2 + 20 && (!best || p.y < best.y)) best = p;
      if (best) land(best);
      else if (S.y > H + 400) { S.y = H; S.x = clamp(S.x, floor.x1, floor.x2); land(floor); }
    }
  }

  function startClimb(t, side, x) {
    S.climb = { target: t, side };
    S.plat = null; S.x = x; S.face = -side;
    setMode('climb', 60);
  }
  function climbStep(dt) {
    const c = S.climb;
    if (!c) return startFall();
    S.y -= CLIMB * (needs.energy < 25 ? 0.7 : 1) * dt;
    if (S.y <= c.target.y) {
      const w = c.target.win;
      S.x = clamp(c.side < 0 ? Math.max(w.x, 0) + 34 : Math.min(w.x + w.w, W) - 34, c.target.x1, c.target.x2);
      S.y = c.target.y; S.vy = 0; S.climbDone = true; S.climb = null;
      land(c.target);
    }
    if (S.modeT > 40) startFall();
  }

  // Boshqa oyna ustiga borish rejasi
  function planVisit() {
    const cur = S.plat;
    if (!cur) return false;
    const others = plats.filter(p => p !== cur && p.id !== cur.id);
    if (!others.length) return false;
    const t = pick(others);
    if (t.y < cur.y - 5) {
      const w = t.win;
      const dy = cur.y - t.y;
      const nx = clamp(S.x, t.x1 + 10, t.x2 - 10), dx = Math.abs(nx - S.x);
      if (!t.hang && dy < 240 && dx < 280 && rnd() < 0.65) {
        think(pick(['Hop! 🐸', 'Sakrayman! 🤸', 'Bir, ikki, uch! 🚀']), 1.5);
        S.face = Math.sign(nx - S.x) || S.face;
        setMode('crouch', 0.35); S.afterCrouch = () => jumpTo(nx, t.y);
        return true;
      }
      // oynaning yon tomoni; to'liq ochilgan oynada yon tomon ekran chetida - ekran cheti bo'ylab tirmashadi
      const sides = [[-1, w.x - 4], [1, w.x + w.w + 4]].map(([s, x]) => [s, clamp(x, cur.x1, cur.x2), x]).filter(([s, x, raw]) => {
        const lx = s < 0 ? w.x + 34 : w.x + w.w - 34;
        return Math.abs(x - raw) < 90 && lx >= t.x1 - 60 && lx <= t.x2 + 60;
      });
      if (!sides.length) return false;
      sides.sort((a, b) => Math.abs(a[1] - S.x) - Math.abs(b[1] - S.x));
      const [s, x] = sides[0];
      think(t.hang ? pick(['Anavi oynaga osilib olaman! 🐒', 'Eng tepaga chiqaman! 🧗']) : pick(['Anavi oyna ustiga chiqaman! 🧗', 'Yuqorida nima bor ekan? 👀', 'Tog\'ga chiqamiz! ⛰️']), 2.5);
      walkTo(x, Math.abs(x - S.x) > 300, () => startClimb(t, s, x));
      return true;
    }
    if (cur.id === 'floor') return false;
    const goLeft = (t.x1 + t.x2) / 2 < S.x;
    const edge = goLeft ? cur.x1 : cur.x2, dir = goLeft ? -1 : 1;
    walkTo(edge, false, () => { S.face = dir; think(pick(['Pastga sakrayman! 🪂', 'Hop! 🤸']), 1.5); hop(dir * R(110, 180), -R(320, 460), rnd() < 0.25 ? dir : 0); });
    return true;
  }

  // ------------------------------------------------------------------ to'p
  const ball = { on: false, x: 0, y: 0, vx: 0, vy: 0, rot: 0, held: false, until: 0 };
  function spawnBall() {
    ball.on = true; ball.held = false;
    ball.x = clamp(S.x + S.face * 60, 30, W - 30); ball.y = S.y - 160; ball.vx = S.face * 80; ball.vy = -100;
    ballEl.classList.remove('hidden');
  }
  function ballStep(dt) {
    if (!ball.on || ball.held) return;
    const py = ball.y;
    ball.vy += G * dt; ball.x += ball.vx * dt; ball.y += ball.vy * dt;
    if (ball.x < 15) { ball.x = 15; ball.vx = Math.abs(ball.vx) * 0.7; }
    if (ball.x > W - 15) { ball.x = W - 15; ball.vx = -Math.abs(ball.vx) * 0.7; }
    if (ball.y < 30 && ball.vy < 0) { ball.y = 30; ball.vy = Math.abs(ball.vy) * 0.5; }
    if (ball.vy > 0) {
      for (const p of plats) if (py <= p.y + 1 && ball.y >= p.y && ball.x >= p.x1 - 25 && ball.x <= p.x2 + 25) {
        ball.y = p.y; ball.vy = -ball.vy * 0.55; if (Math.abs(ball.vy) < 70) ball.vy = 0; break;
      }
    }
    if (ball.vy === 0) ball.vx *= Math.pow(0.35, dt);
    if (ball.y > H + 200) { ball.y = H; ball.vy = 0; }
    ball.rot += ball.vx * dt * 3.2;
  }
  function ballBehavior(dt) {
    if (!ball.on) spawnBall();
    const near = Math.abs(ball.y - S.y) < 45;
    if (near && !ball.held) {
      const want = ball.x - (ball.x > S.x ? 18 : -18);
      const d = want - S.x;
      if (Math.abs(ball.x - S.x) < 30 && Math.abs(ball.vy) < 300 && S.kick <= 0) {
        const dir = rnd() < 0.75 ? (ball.x >= S.x ? 1 : -1) : (ball.x >= S.x ? -1 : 1);
        ball.vx = dir * R(220, 520); ball.vy = -R(380, 850);
        S.kick = 0.3; S.face = dir; needs.fun = Math.min(100, needs.fun + 3);
        if (rnd() < 0.25) think(pick(['Goool! ⚽', 'Zarba! 💥', 'Ushlab oling! 😄']), 1.8);
      } else if (Math.abs(d) > 4) {
        S.face = Math.sign(d);
        const p = S.plat || floor;
        S.x = clamp(S.x + Math.sign(d) * Math.min(Math.abs(d), RUN * dt), p.x1, p.x2);
        S.moving = true;
      }
    }
    if (S.modeT > S.dur) { setMode('idle', 2); ball.until = now() + 4000; }
  }

  // ------------------------------------------------------------------ sovun pufaklari va effektlar
  const soaps = [];
  function spawnSoap() {
    const el = document.createElement('div');
    el.className = 'soap';
    const size = R(16, 34);
    el.style.width = el.style.height = size + 'px';
    const s = { el, x: S.x + S.face * 22, y: S.y - 95, vx: S.face * R(20, 70), vy: -R(25, 60), ph: R(0, 6), life: R(3, 6), size };
    el.addEventListener('pointerdown', e => { e.stopPropagation(); popSoap(s, true); });
    fxEl.parentNode.appendChild(el);
    soaps.push(s);
  }
  function popSoap(s, byUser) {
    const i = soaps.indexOf(s); if (i < 0) return;
    soaps.splice(i, 1); s.el.remove();
    const p = document.createElement('div'); p.className = 'pop'; p.textContent = '✨';
    p.style.left = (s.x - 9) + 'px'; p.style.top = (s.y - 9) + 'px';
    fxEl.appendChild(p); p.addEventListener('animationend', () => p.remove());
    if (byUser) { setMood('kulgi', 1.5); needs.fun += 2; if (rnd() < 0.3) think(pick(['Pak! 😆', 'Yorildi! 🫧', 'Hi-hi!']), 1.2); }
  }
  function soapStep(dt) {
    for (const s of soaps.slice()) {
      s.life -= dt; s.ph += dt * 3;
      s.x += (s.vx + Math.sin(s.ph) * 25) * dt; s.y += s.vy * dt; s.vx *= Math.pow(0.6, dt);
      s.el.style.transform = `translate(${s.x - s.size / 2}px, ${s.y - s.size / 2}px)`;
      if (s.life <= 0 || s.y < -40) popSoap(s, false);
    }
  }
  function spawnFx(ch, x, y, n) {
    for (let i = 0; i < (n || 1); i++) {
      const e = document.createElement('div');
      e.className = 'fx'; e.textContent = ch;
      e.style.left = (x + R(-14, 14)) + 'px'; e.style.top = (y + R(-8, 8)) + 'px';
      e.style.setProperty('--dx', R(-30, 30) + 'px');
      e.style.animationDelay = (i * 0.12) + 's';
      fxEl.appendChild(e);
      e.addEventListener('animationend', () => e.remove());
    }
  }

  // ------------------------------------------------------------------ kayfiyat
  function setMood(m, sec) { S.mood = m; S.moodUntil = now() + (sec || 20) * 1000; }
  function modeMood() {
    const active = now() < S.moodUntil;
    switch (S.mode) {
      case 'sleep': return 'uyqu';
      case 'drag': return S.modeT > 2.5 ? 'kulgi' : 'hayron';
      case 'fall': return S.thrown ? 'kulgi' : 'qorqish';
      case 'thrown': return needs.fun > 40 ? 'kulgi' : 'qorqish';
      case 'think': return 'oylash';
      case 'dizzy': return 'boshaylanish';
      case 'laugh': case 'rofl': return 'kulgi';
      case 'sulk': return Math.floor(S.t / 5) % 2 ? 'jahl' : 'hafa';
      case 'cry': return 'hafa';
      case 'stomp': return 'jahl';
      case 'shy': return 'uyalish';
      case 'yawn': return 'uyqu';
      case 'trip': return S.modeT < 0.6 ? 'hayron' : 'hafa';
      case 'climb': return active ? S.mood : 'oddiy';
      case 'dance': case 'run': case 'jump': case 'cartwheel': case 'ball': case 'chase': case 'bubbles':
        return active ? S.mood : 'xursand';
    }
    return null;
  }
  function offended() { return now() < (S.offendedUntil || 0); }
  function currentMood() {
    const m = modeMood();
    if (m) return m;
    if (now() < S.moodUntil) return S.mood;
    if (offended()) return Math.floor(S.t / 6) % 2 ? 'jahl' : 'hafa';
    if (needs.love < 18) return 'hafa';
    if (needs.energy < 18 || needs.fun < 15) return 'zerikish';
    return 'oddiy';
  }

  // ------------------------------------------------------------------ xulq-atvor rejalashtiruvchisi
  function pickNext() {
    // oyna chetiga osilib turibdi: chet bo'ylab qo'llari bilan yuradi, osilib turadi yoki pastga sakraydi
    if (S.plat && S.plat.hang && !S.air) {
      if (S.busy || S.chat) return setMode('hang', R(3, 6));
      const r = rnd(), p = S.plat;
      if (r < 0.35) { S.target = clamp(S.x + R(-220, 220), p.x1, p.x2); return setMode('hangmove', 25); }
      if (r < 0.62) return setMode('hang', R(4, 9));
      think(pick(['Sakrayman! 🪂', "Qo'limni qo'yib yubordim! 😆", 'Uuuu! 🎢']), 1.5);
      S.vx = S.face * R(30, 110); S.vy = 0; S.air = true; S.plat = null;
      return setMode('fall', 99);
    }
    if (S.busy) return setMode('think', 9999);
    if (offended() && !S.chat) {
      // arazlagan: qo'llarini qovushtirib o'tiradi, gohida oyog'ini tepib qo'yadi
      if (rnd() < 0.25) think(pick(['Hali ham arazman... 😤', 'Uzr so\'ramaguningizcha gaplashmayman! 😤', 'Hmph! 😒', 'Xafa qildingiz... 🥺']), 3);
      return setMode(rnd() < 0.7 ? 'sulk' : 'stomp', R(5, 10));
    }
    if (S.chat) return setMode(rnd() < 0.25 ? 'look' : 'listen', R(2, 5));
    if (needs.energy < 15 || (idleSec > 600 && rnd() < 0.5)) return goSleep();
    if (needs.love < 18 && now() > S.nextSulk) {
      S.nextSulk = now() + R(8, 15) * 60000;
      setMode(rnd() < 0.5 ? 'stomp' : 'cry', 3);
      return think(U(pick(['Meni unutib qo\'ydingizmi, {u}? 🥺', 'Hech kim men bilan o\'ynamaydi... 😢', 'Arazladim! 😤 Meni silab qo\'ying...'])), 4);
    }
    const onWin = S.plat && S.plat.id !== 'floor';
    const curNear = now() - cursor.t < 5000 && Math.hypot(cursor.x - S.x, cursor.y - S.y) < 350;
    const opts = [
      ['wander', 30], ['run', 7], ['idle', 12], ['look', 7], ['sit', onWin ? 22 : 8], ['visit', plats.length > 1 ? 22 : 0],
      ['dance', needs.fun < 45 ? 9 : 4], ['ball', needs.fun < 50 ? 8 : 3], ['bubbles', 4], ['cartwheel', needs.energy > 40 ? 3 : 0],
      ['wave', curNear ? 8 : 2], ['chase', curNear && needs.energy > 35 ? 5 : 0], ['yawn', needs.energy < 40 ? 7 : 1],
      ['stretch', 2], ['trip', 1], ['hop', 4], ['hum', 4],
    ];
    let sum = 0; for (const o of opts) sum += o[1];
    let r = rnd() * sum, choice = 'idle';
    for (const o of opts) { r -= o[1]; if (r <= 0) { choice = o[0]; break; } }
    startBehavior(choice);
  }

  function startBehavior(b) {
    const p = S.plat || floor;
    switch (b) {
      case 'wander': walkTo(R(p.x1, p.x2), false); break;
      case 'run': walkTo(R(p.x1, p.x2), true); break;
      case 'look': setMode('look', 3); break;
      case 'sit': {
        const edge = p.id !== 'floor' && rnd() < 0.7 ? pick([p.x1 + 6, p.x2 - 6]) : S.x;
        walkTo(edge, false, () => {
          setMode('sit', R(8, 20));
          if (p.id !== 'floor' && rnd() < 0.5) think(pick(["Bu yer juda qulay ekan 😌", 'Oyog\'imni osiltirib o\'tiraman 🦶', 'Manzara zo\'r! 🌄']), 3);
        });
        break;
      }
      case 'visit': if (!planVisit()) walkTo(R(p.x1, p.x2), false); break;
      case 'dance': setMode('dance', R(4, 7)); if (rnd() < 0.4) think(pick(['La-la-la ♪', 'Raqs tushaman! 💃', 'Lapar! 🎶']), 2.5); break;
      case 'ball': setMode('ball', R(15, 28)); think(pick(["To'p o'ynaymiz! ⚽", 'Futbol! ⚽', 'Men Messiman! 😎']), 2); break;
      case 'bubbles': setMode('bubbles', R(5, 8)); break;
      case 'cartwheel': hop(S.face * 150, -650, S.face); needs.energy -= 2; break;
      case 'wave': setMode('wave', 2.2); if (rnd() < 0.5) think(U(pick(['Salom, {u}! 👋', 'Men shu yerdaman! 😊'])), 2); break;
      case 'chase': setMode('chase', R(6, 10)); think(pick(['Sichqonchani ushlayman! 🐭', 'Quvlashmachoq! 🏃']), 2); break;
      case 'yawn': setMode('yawn', 2.2); break;
      case 'stretch': setMode('stretch', 2.4); break;
      case 'trip': setMode('trip', 2.2); think(pick(['Voy, qoqilib ketdim 😅', 'Uf... 🤕']), 2); break;
      case 'hop': hop(0, -R(380, 520)); break;
      case 'hum': setMode('idle', R(3, 5)); think(pick(['♪ Lola, lola, lolajon... ♪', '♪ Do-re-mi... ♪', '♪ Hm-hm-hmm ♪']), 3); break;
      default: setMode('idle', R(2, 4));
    }
  }

  function goSleep() {
    setMode('sleep', 99999);
    if (rnd() < 0.6) think(pick(['Uyqum keldi... 🥱', 'Biroz mizg\'ib olaman 😴']), 2.5);
  }
  function wake(msg) {
    if (S.mode !== 'sleep') return;
    setMode('stretch', 2);
    if (msg) think(msg, 2.5);
  }

  // ------------------------------------------------------------------ asosiy sikl
  function update(dt) {
    S.t += dt; S.modeT += dt; S.moving = false;
    if (S.kick > 0) S.kick -= dt;

    if (S.busy && S.mode !== 'think' && grounded()) setMode('think', 9999);
    if (S.dragging) { /* sichqoncha boshqaradi */ }
    else if (S.mode === 'climb') climbStep(dt);
    else if (S.air) airStep(dt);
    else {
      const p = S.plat || floor;
      S.y = p.y;
      switch (S.mode) {
        case 'walk': case 'run': {
          const sp = (S.mode === 'walk' ? WALK : RUN) * (needs.energy < 25 ? 0.7 : 1);
          const d = S.target - S.x;
          if (Math.abs(d) < 3) { const f = S.onArrive; S.onArrive = null; if (f) f(); else setMode('idle', R(1, 3)); }
          else { S.face = Math.sign(d); S.x += Math.sign(d) * Math.min(Math.abs(d), sp * dt); S.moving = true; }
          break;
        }
        case 'chase': {
          const tx = clamp(cursor.x, p.x1, p.x2), d = tx - S.x;
          if (Math.abs(d) > 6) { S.face = Math.sign(d); S.x += Math.sign(d) * Math.min(Math.abs(d), RUN * 1.1 * dt); S.moving = true; }
          if (cursor.y < S.y - 150 && cursor.y > S.y - 400 && Math.abs(cursor.x - S.x) < 70 && rnd() < 0.04) hop(0, -R(550, 700));
          if (Math.hypot(cursor.x - S.x, cursor.y - (S.y - 80)) < 45 && rnd() < 0.05) { setMood('kulgi', 2); spawnFx('✨', S.x, S.y - 150); think('Ushladim! 😆', 1.5); }
          if (S.modeT > S.dur) { setMode('idle', 2); think('Uff, charchadim! Siz juda tezsiz 😄', 2.5); }
          break;
        }
        case 'ball': ballBehavior(dt); break;
        case 'bubbles':
          if (Math.floor(S.modeT * 2.6) !== Math.floor((S.modeT - dt) * 2.6)) spawnSoap();
          if (S.modeT > S.dur) setMode('idle', 2);
          break;
        case 'crouch':
          if (S.modeT > S.dur) { const f = S.afterCrouch; S.afterCrouch = null; if (f) f(); else setMode('idle', 1); }
          break;
        case 'sleep':
          if (needs.energy >= 98 || (idleSec < 5 && needs.energy > 60 && S.modeT > 30)) wake(pick(['Yaxshi uxladim! ☀️', 'Uyg\'ondim! 😊']));
          break;
        case 'hangmove': {
          // oyna cheti bo'ylab qo'llari bilan sekin yuradi
          const d = S.target - S.x;
          if (Math.abs(d) < 3 || S.modeT > S.dur) setMode('hang', R(3, 7));
          else { S.face = Math.sign(d); S.x += Math.sign(d) * Math.min(Math.abs(d), 48 * dt); S.moving = true; }
          break;
        }
      }
      if (S.plat && !S.dragging && (S.x < S.plat.x1 - 22 || S.x > S.plat.x2 + 22)) startFall();
      if (S.modeT > S.dur && ['idle', 'look', 'listen', 'sit', 'dance', 'wave', 'yawn', 'stretch', 'trip', 'land', 'dizzy', 'laugh', 'cry', 'stomp', 'shy', 'sulk', 'rofl', 'hang'].includes(S.mode)) pickNext();
    }
    ballStep(dt);
    soapStep(dt);
    if (ball.on && S.mode !== 'ball' && ball.until && now() > ball.until && !ball.held) { ball.on = false; ballEl.classList.add('hidden'); ball.until = 0; }
  }

  function render() {
    const t = S.t, m = S.mode;
    let legL = 0, legR = 0, armL = 10 + Math.sin(t * 2) * 2, armR = -10 - Math.sin(t * 2) * 2, bx = 0, by = 0, head = Math.sin(t * 1.3) * 2, sq = 1 + Math.sin(t * 2.2) * 0.008;
    let rot = 0, sit = 0, front = false, shadow = 0.18, p;
    switch (m) {
      case 'walk': p = Math.sin(t * 9); legL = p * 24; legR = -p * 24; armL = 10 - p * 20; armR = -10 - p * 20; by = -Math.abs(Math.cos(t * 9)) * 3; head = 4 + p * 1.5; break;
      case 'run': case 'chase': if (!S.moving) break; p = Math.sin(t * 16); legL = p * 34; legR = -p * 34; armL = 25 - p * 38; armR = -25 - p * 38; by = -Math.abs(Math.cos(t * 16)) * 5; head = 7; break;
      case 'ball': if (S.kick > 0) { legR = -45 * Math.sin((0.3 - S.kick) / 0.3 * Math.PI); armL = 40; armR = -40; }
        else if (S.moving) { p = Math.sin(t * 15); legL = p * 30; legR = -p * 30; armL = 20 - p * 30; armR = -20 - p * 30; by = -Math.abs(Math.cos(t * 15)) * 4; } break;
      case 'dance': p = Math.sin(t * 6.5); by = -Math.abs(p) * 14; armL = 150 + p * 22; armR = -150 + p * 22; legL = p * 14; legR = p * 14; head = p * 10;
        if (Math.floor(t * 1.2) % 4 === 3) S.face = Math.sin(t * 3) > 0 ? 1 : -1; break;
      case 'jump': case 'fall': armL = 150; armR = -150; legL = -12; legR = 12; shadow = 0.08; break;
      case 'thrown': case 'cartwheel': armL = 160; armR = -160; legL = -20; legR = 20; shadow = 0.05; break;
      case 'crouch': sq = 0.86; armL = 30; armR = -30; break;
      case 'wave': armR = -150 + Math.sin(t * 14) * 24; head = 6; break;
      case 'look': head = Math.sin(t * 1.8) * 13; break;
      case 'listen': head = 6 + Math.sin(t * 1.1) * 3; break;
      case 'sit': sit = 1; legL = 12 + Math.sin(t * 3) * 14; legR = -12 - Math.sin(t * 3 + 1) * 14; armL = 30; armR = -30; shadow = 0; head = Math.sin(t * 0.9) * 5; break;
      case 'sleep': sit = 1; head = 16; armL = 8; armR = -8; legL = 8; legR = -8; sq = 1 + Math.sin(t * 1.3) * 0.02; shadow = 0; break;
      case 'think': armR = 112; front = true; head = 8 + Math.sin(t * 1.5) * 3; break;
      case 'drag': legL = Math.sin(t * 10) * 26; legR = -legL; armL = 150 + Math.sin(t * 8) * 15; armR = -150 - Math.sin(t * 8) * 15; shadow = 0; break;
      case 'land': sq = 1 - 0.14 * Math.max(0, 1 - S.modeT / 0.3); break;
      case 'dizzy': head = Math.sin(t * 6) * 12; bx = Math.sin(t * 5) * 3; armL = 25; armR = -25; break;
      case 'laugh': by = -Math.abs(Math.sin(t * 14)) * 4; head = Math.sin(t * 7) * 8; armL = -150; armR = 150; front = true; break;
      case 'cry': armL = -160; armR = 160; front = true; bx = Math.sin(t * 30) * 1.2; head = -5; break;
      case 'stomp': armL = -35; armR = 35; bx = Math.sin(t * 40) * 1.5; head = Math.sin(t * 20) * 3; legL = Math.max(0, Math.sin(t * 10)) * 12; legR = -Math.max(0, -Math.sin(t * 10)) * 12; break;
      case 'shy': armL = -150; armR = 150; front = true; head = 10; bx = Math.sin(t * 4) * 2; break;
      case 'sulk': sit = 1; armL = -55; armR = 55; front = true; head = -14 + Math.sin(t * 0.7) * 3; shadow = 0; legL = 6; legR = -6; break;
      case 'rofl': { const k = Math.sin(t * 16); by = -Math.abs(k) * 6; head = Math.sin(t * 9) * 12; armL = -150 + k * 15; armR = 150 - k * 15; front = true; bx = Math.sin(t * 22) * 2;
        rot = S.modeT > 1.2 && S.modeT < 3 ? Math.sin((S.modeT - 1.2) / 1.8 * Math.PI) * 25 : 0; break; }
      case 'yawn': armL = 160 * Math.sin(Math.min(1, S.modeT / 1.1) * Math.PI); armR = -armL; head = -6; break;
      case 'stretch': { const k = Math.sin(Math.min(1, S.modeT / 2.4) * Math.PI); armL = 175 * k; armR = -175 * k; sq = 1 + 0.06 * k; break; }
      case 'trip': rot = S.modeT < 0.35 ? S.modeT / 0.35 * 80 : S.modeT < 1.4 ? 80 : 80 * (1 - (S.modeT - 1.4) / 0.8); rot = Math.max(0, rot); by = rot / 80 * 18; shadow = 0.1; break;
      case 'climb': p = Math.sin(t * 8); armL = 165 + p * 15; armR = -165 + p * 15; legL = p * 25; legR = -p * 25; front = true; shadow = 0; break;
      case 'bubbles': armR = 115; front = true; head = 4; by = -Math.abs(Math.sin(t * 3)) * 2; break;
    }
    if (S.air && S.spin) rot = S.rot;
    // oyna chetiga osilgan: qo'llar tepada (chetni ushlab), oyoqlar osilib tebranadi
    if (S.plat && S.plat.hang && !S.air && !S.dragging) {
      const k = S.moving ? Math.sin(t * 7) : 0;
      armL = 172 - k * 14; armR = -172 - k * 14; front = false;
      legL = Math.sin(t * 2.2) * 16 + 6; legR = Math.sin(t * 2.2 + 0.6) * 16 - 6;
      head = Math.sin(t * 1.4) * 4; bx = Math.sin(t * 1.1) * 2; by = 0; sit = 0; sq = 1; rot = Math.sin(t * 1.1) * 3; shadow = 0;
    }
    P.pose({ legL, legR, armL, armR, head, bx, by, sq, rot, sit, armsFront: front, shadow });

    petEl.style.transform = `translate3d(${(S.x - HALF).toFixed(1)}px, ${(S.y - FEET).toFixed(1)}px, 0) scaleX(${S.face < 0 ? -1 : 1})`;

    // yuz
    P.setMood(currentMood());
    const nowT = now();
    if (nowT > S.nextBlink && ['oddiy', 'hafa', 'jahl', 'hayron', 'oylash', 'qorqish'].includes(P.mood)) {
      P.blink(true); S.blinkEnd = nowT + 130; S.nextBlink = nowT + R(2200, 5500);
    }
    if (S.blinkEnd && nowT > S.blinkEnd) { P.blink(false); S.blinkEnd = 0; }
    P.setTalk(nowT < S.talkUntil && Math.floor(t * 8) % 2 === 0);
    // ko'zlar sichqonchaga qaraydi
    let lx = 0, ly = 0;
    if (nowT - cursor.t < 4000 && Math.hypot(cursor.x - S.x, cursor.y - S.y) < 700) {
      const dx = cursor.x - S.x, dy = cursor.y - (S.y - 105), d = Math.max(60, Math.hypot(dx, dy));
      lx = dx / d; ly = dy / d;
    } else if (S.moving) lx = S.face;
    P.look(lx * (S.face < 0 ? -1 : 1), ly);

    // emotsiya belgisi
    const em = emoteFor();
    if (emoteEl.textContent !== em) emoteEl.textContent = em;
    if (em) emoteEl.style.transform = `translate(${(S.x + 14).toFixed(1)}px, ${(S.y - FEET - 18 + (m === 'sit' || m === 'sleep' ? 18 : 0) + Math.sin(t * 3) * 3).toFixed(1)}px)`;

    if (ball.on) { ballEl.style.transform = `translate(${(ball.x - 15).toFixed(1)}px, ${(ball.y - 30).toFixed(1)}px) rotate(${ball.rot.toFixed(0)}deg)`; }
    placeBubble();
  }

  function emoteFor() {
    const t = S.t;
    switch (P.mood) {
      case 'uyqu': return ['z', 'z Z', 'z Z z'][Math.floor(t / 0.8) % 3];
      case 'oylash': return S.busy ? ['💭', '💭.', '💭..'][Math.floor(t / 0.5) % 3] : '❓';
      case 'jahl': return '💢';
      case 'hayron': return '❗';
      case 'sevgi': return '💕';
      case 'qorqish': return '💦';
      case 'boshaylanish': return '💫';
      case 'zerikish': return '…';
      case 'uyalish': return '☺';
    }
    if (S.mode === 'dance') return ['🎵', '🎶'][Math.floor(t * 2) % 2];
    return '';
  }

  // Moslashuvchan kadr tezligi: harakatda silliq, tinch holatda tejamkor (protsessorni kam band qiladi).
  const BUSY_MODES = ['walk', 'run', 'chase', 'ball', 'dance', 'laugh', 'wave', 'cry', 'stomp', 'dizzy', 'trip', 'stretch', 'yawn', 'shy', 'land', 'crouch', 'bubbles'];
  // Kadr tezligi: monitor chastotasida (60/90/120/144 Hz) - cheklovsiz. Faqat uxlab yotganda tejamkor.
  function fpsTarget() {
    if (S.mode === 'sleep' && !S.air && !S.dragging && now() - (S.lastWinMove || 0) > 1000) return 20;
    return 1000;
  }
  let last = performance.now();
  function frame(ts) {
    if (ts - last < 1000 / fpsTarget() - 2) { requestAnimationFrame(frame); return; }
    const dt = Math.min(0.05, (ts - last) / 1000); last = ts;
    try { update(dt); render(); syncRide(); } catch (e) { if (!frame.err) { frame.err = 1; api.log('frame: ' + (e && e.stack || e)); } }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // ------------------------------------------------------------------ fikr va suhbat pufakchalari
  let thoughtUntil = 0;
  function think(text, sec) {
    if (S.chat) return;
    thought.textContent = text;
    thought.classList.remove('hidden');
    thoughtUntil = now() + (sec || 3) * 1000;
  }
  function placeBubble() {
    const sitOff = (S.mode === 'sit' || S.mode === 'sleep') ? 18 : 0;
    const headTop = S.y - FEET + sitOff;
    if (!thought.classList.contains('hidden')) {
      if (now() > thoughtUntil || S.chat) thought.classList.add('hidden');
      else {
        const w = thought.offsetWidth, h = thought.offsetHeight;
        let left = clamp(S.x - w / 2, 6, W - w - 6), top = headTop - h - 18;
        if (top < 6) top = headTop + 30;
        thought.style.transform = `translate(${left.toFixed(0)}px, ${top.toFixed(0)}px)`;
      }
    }
    if (!bubble.classList.contains('hidden')) {
      const w = bubble.offsetWidth, h = bubble.offsetHeight;
      let left = S.x - w / 2, top = headTop - h - 10;
      if (top < 6) { top = clamp(headTop, 6, H - h - 6); left = S.x + 70 + w < W ? S.x + 70 : S.x - 70 - w; }
      left = clamp(left, 6, W - w - 6);
      bubble.style.transform = `translate(${left.toFixed(0)}px, ${top.toFixed(0)}px)`;
    }
  }

  function showBubble(text, withInput) {
    bubble.classList.remove('hidden');
    $('brow').classList.toggle('hidden', !withInput);
    btext.textContent = text;
    btext.scrollTop = 0;
  }
  function openChat(text, focus) {
    S.chat = true;
    thought.classList.add('hidden');
    showBubble(text, true);
    S.chatClose = now() + (focus ? 150000 : 60000);
    if (focus) { api.focus(); setTimeout(() => binput.focus(), 80); }
    if (grounded() && !S.busy && !['sleep', 'think'].includes(S.mode)) setMode('listen', 3);
  }
  function closeChat() {
    S.chat = false;
    if (S.busy) { bubble.classList.add('hidden'); think("Mayli, ishni tugatib, sizga aytaman 👍", 3); }
    else bubble.classList.add('hidden');
    binput.blur();
  }

  // ------------------------------------------------------------------ AI bilan suhbat
  let reqId = 0, cur = null;
  const TOOL = { start: 'ishga kirishdim', Bash: 'buyruq bajaryapman', PowerShell: 'buyruq bajaryapman', Read: "faylni o'qiyapman", Write: 'fayl yozyapman', Edit: 'faylni tahrirlayapman',
    WebSearch: 'internetdan izlayapman', WebFetch: "sahifani o'qiyapman", Glob: 'fayllarni qidiryapman', Grep: 'fayllarni qidiryapman', TodoWrite: 'rejalashtiryapman' };
  const SRC = { claude: '🧠 Claude', groq: '🚀 Groq', gemini: '✨ Gemini', bepul: '🆓 bepul server', tez: '⚡ tezkor' };

  function clean(raw, partial) {
    let t = String(raw || '');
    t = t.replace(/\[\s*(kayfiyat|harakat|ochish|dastur|eslatma|eslab_?qol)\s*:[^\]]*\]/gi, '').replace(/\[claude\]/gi, '');
    t = t.replace(/\[Hozir:[^\]]*\]/gi, '');
    if (partial) t = t.replace(/\[[^\]]*$/, '');
    t = t.replace(/\*\*|__|`/g, '').replace(/^\s*#+\s*/gm, '');
    return t.trim();
  }

  function busyText() {
    const s = Math.floor((now() - S.busySince) / 1000);
    return '⏳ ' + ["O'ylayapman", 'Izlayapman', 'Ishlayapman'][Math.floor(s / 5) % 3] + '.'.repeat(1 + s % 3) + (s > 2 ? ` (${s} s)` : '');
  }

  function send() {
    const text = binput.value.trim();
    if (!text || S.busy) return;
    binput.value = '';
    interact('love', 3);
    let prompt = text;
    if (S.pending) { prompt = `(Sen avvalroq o'zing so'ragan eding: "${S.pending}")\n\n` + text; S.pending = null; }
    S.busy = true; S.busySince = now();
    cur = { id: ++reqId, raw: '' };
    btext.textContent = busyText();
    $('bstop').classList.remove('hidden'); $('bsend').disabled = true;
    bstatus.classList.add('hidden'); $('bsrc').textContent = '';
    if (S.mode === 'sleep') setMode('idle', 1);
    if (grounded()) setMode('think', 9999);
    S.chatClose = now() + 600000;
    api.ask(cur.id, prompt);
  }

  api.on('ai', d => {
    if (!cur || d.id !== cur.id) return;
    if (d.type === 'chunk') {
      cur.raw += d.text;
      const c = clean(cur.raw, true);
      if (c) { if (bubble.classList.contains('hidden')) showBubble('', S.chat); btext.textContent = c; btext.scrollTop = btext.scrollHeight; }
      S.talkUntil = now() + 350;
    } else if (d.type === 'status') {
      bstatus.textContent = '🔧 ' + (TOOL[d.tool] || d.tool + ' ishlatyapman') + '...';
      bstatus.classList.remove('hidden');
    } else if (d.type === 'reset') {
      cur.raw = ''; btext.textContent = busyText();
    } else if (d.type === 'source') {
      $('bsrc').textContent = SRC[d.source] || d.source;
    } else if (d.type === 'done') finish(d);
  });

  function finish(d) {
    S.busy = false;
    $('bstop').classList.add('hidden'); $('bsend').disabled = false; bstatus.classList.add('hidden');
    if (S.mode === 'think') setMode('idle', 1);
    if (d.source) $('bsrc').textContent = SRC[d.source] || d.source;
    if (d.cancelled) return reply("[kayfiyat:oddiy] Mayli, to'xtatdim. Yana nima qilay?");
    if (d.notLoggedIn) {
      reply("[kayfiyat:hafa] Men hali Claude hisobingizga ulanmaganman. Hozir oyna ochaman - o'sha yerda hisobingizga kiring. Keyin menga qayta yozing!");
      return api.login();
    }
    if (d.isError) return reply('[kayfiyat:hafa] Voy, nimadir xato ketdi 😟\n' + String(d.text || '').slice(0, 300));
    let text = d.text || cur.raw;
    if (d.remembered) setTimeout(() => spawnFx('🧠', S.x, S.y - 150, 2), 400);
    if (d.fellBack && !S.fallbackNoted) {
      S.fallbackNoted = true;
      text += '\n\n(ℹ Bu ishni to\'liq bajarishim uchun Claude kerak, lekin hali Claude hisobingizga ulanmaganman. Sozlamalar → "🔑 Hisobga kirish" tugmasini bosing.)';
    }
    reply(text);
    feel(d.emotion);
  }

  // his-tuyg'u: so'kish, uzr, maqtov, kulgi - qahramonning fe'li shunga qarab o'zgaradi
  function feel(e) {
    if (!e) return;
    const g = grounded();
    if (e === 'offended') {
      S.offendedUntil = now() + 15 * 60000;
      needs.love = clamp(needs.love - 18, 0, 100);
      setMood(rnd() < 0.5 ? 'hafa' : 'jahl', 40);
      spawnFx('💢', S.x + 20, S.y - 150, 2);
      if (g) setMode(rnd() < 0.5 ? 'cry' : 'stomp', 3.5);
    } else if (e === 'forgiven') {
      const was = offended();
      S.offendedUntil = 0;
      needs.love = clamp(needs.love + (was ? 15 : 6), 0, 100);
      setMood('sevgi', 10);
      spawnFx('💕', S.x, S.y - 150, 4);
      if (g) hop(0, -520);
    } else if (e === 'praised') {
      needs.love = clamp(needs.love + 6, 0, 100);
      setMood('uyalish', 8);
      spawnFx(pick(['💖', '☺️', '✨']), S.x, S.y - 150, 3);
      if (g) setMode('shy', 3);
    } else if (e === 'laugh') {
      needs.fun = clamp(needs.fun + 8, 0, 100);
      setMood('kulgi', 6);
      spawnFx(pick(['😂', '🤣', '😆']), S.x, S.y - 150, 3);
      if (g) setMode('rofl', 3.6);
    }
  }

  const MOOD_OK = ['xursand', 'kulgi', 'hafa', 'jahl', 'hayron', 'sevgi', 'oylash', 'uyqu', 'uyalish', 'zerikish', 'oddiy', 'qorqish'];
  function normTag(s) { return String(s).toLowerCase().replace(/[ʻʼ‘’'`]/g, '').trim(); }

  function reply(raw) {
    const mm = raw.match(/\[\s*kayfiyat\s*:\s*([^\]\s]+)\s*\]/i);
    const am = raw.match(/\[\s*harakat\s*:\s*([^\]\s]+)\s*\]/i);
    let mood = mm ? normTag(mm[1]) : 'oddiy';
    if (!MOOD_OK.includes(mood)) mood = 'oddiy';
    const action = am ? normTag(am[1]) : null;
    for (const m of raw.matchAll(/\[\s*ochish\s*:\s*(https?:\/\/[^\]\s]+)\s*\]/gi)) api.openUrl(m[1]);
    for (const m of raw.matchAll(/\[\s*dastur\s*:\s*([^\]]+)\]/gi)) api.openApp(m[1].trim());
    for (const m of raw.matchAll(/\[\s*eslatma\s*:\s*(\d+(?:[.,]\d+)?)\s*\|([^\]]*)\]/gi)) api.addReminder(parseFloat(m[1].replace(',', '.')), m[2].trim());
    const text = clean(raw) || '👍';
    if (!S.chat) { S.chat = true; showBubble(text, true); } else showBubble(text, true);
    S.chatClose = now() + 120000 + Math.min(text.length * 400, 120000);
    S.talkUntil = now() + clamp(text.length * 45, 1200, 6000);
    setMood(mood, 25);
    if (!grounded()) return;
    switch (action) {
      case 'raqs': return setMode('dance', 5);
      case 'sakra': return hop(0, -520);
      case 'qol': return setMode('wave', 2.5);
      case 'yugur': return walkTo(R((S.plat || floor).x1, (S.plat || floor).x2), true);
      case 'uxla': return goSleep();
      case 'top': return setMode('ball', 20);
      case 'pufak': return setMode('bubbles', 6);
    }
    switch (mood) {
      case 'xursand': return rnd() < 0.4 ? hop(0, -460) : setMode('wave', 2);
      case 'kulgi': return setMode('laugh', 2.8);
      case 'hafa': return setMode('cry', 3);
      case 'jahl': return setMode('stomp', 3);
      case 'sevgi': spawnFx('💕', S.x, S.y - 150, 3); return setMode('shy', 2.5);
      case 'uyalish': return setMode('shy', 2.5);
      default: return setMode('listen', 4);
    }
  }

  binput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    else if (e.key === 'Escape') { e.preventDefault(); closeChat(); }
  });
  binput.addEventListener('input', () => { S.chatClose = now() + 150000; });
  $('bsend').addEventListener('click', send);
  $('bstop').addEventListener('click', () => api.cancel());
  $('bclose').addEventListener('click', closeChat);

  // ------------------------------------------------------------------ sichqoncha: bosish, sudrash, otish, silash
  let capturing = false;
  function setCapture(v) { if (v !== capturing) { capturing = v; api.setIgnore(!v); } }
  document.addEventListener('mousemove', e => {
    const dx = e.clientX - cursor.x, dy = e.clientY - cursor.y;
    cursor.x = e.clientX; cursor.y = e.clientY; cursor.t = now();
    if (S.dragging || ball.held || press) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    setCapture(!!(el && el.closest('.hit, .soap')));
    // silash: boshning ustida sichqonchani yurgizish
    if (el === hit && e.clientY < S.y - FEET + 70 && grounded()) {
      S.stroke += Math.hypot(dx, dy);
      if (S.stroke > 380 && now() > S.petCooldown) {
        S.stroke = 0; S.petCooldown = now() + 7000;
        interact('love', 7); needs.fun = Math.min(100, needs.fun + 2);
        if (S.mode === 'sleep') { setMood('uyalish', 3); spawnFx('💕', S.x, S.y - 140, 2); }
        else {
          setMood(rnd() < 0.5 ? 'sevgi' : 'uyalish', 4); setMode('shy', 2.5);
          spawnFx(pick(['💕', '❤️', '💖']), S.x, S.y - 150, 3);
          think(pick(['Hi-hi, yoqimli 🥰', 'Yana silang! ☺️', 'Mmm, rahmat 💕', 'Sizni yaxshi ko\'raman! 💖']), 2.5);
        }
      }
    }
  });
  document.addEventListener('mouseleave', () => { if (!S.dragging && !ball.held && !press) setCapture(false); });
  setInterval(() => { S.stroke *= 0.5; }, 1000);

  let press = null, clickTimer = null;
  hit.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    hit.setPointerCapture(e.pointerId);
    press = { x: e.clientX, y: e.clientY, moved: false, samples: [{ x: e.clientX, y: e.clientY, t: performance.now() }] };
  });
  hit.addEventListener('pointermove', e => {
    if (!press) return;
    const dx = e.clientX - press.x, dy = e.clientY - press.y;
    if (!press.moved && dx * dx + dy * dy > 49) {
      press.moved = true;
      S.dragging = true; S.air = false; S.plat = null; S.climb = null; S.spin = 0; S.rot = 0;
      S.grabDx = S.x - press.x; S.grabDy = S.y - press.y;
      setMode('drag', 9999);
      interact('fun', 2);
      if (rnd() < 0.5) think(pick(['Voy! Qayerga olib ketyapsiz? 😲', 'Uchyapman! 🕊️', 'Hi-hi, qitiq! 😆']), 2);
    }
    if (press.moved) {
      S.x = clamp(e.clientX + S.grabDx, HALF - 10, W - HALF + 10);
      S.y = clamp(e.clientY + S.grabDy, FEET, H + 20);
      press.samples.push({ x: e.clientX, y: e.clientY, t: performance.now() });
      if (press.samples.length > 8) press.samples.shift();
    }
  });
  hit.addEventListener('pointerup', e => {
    if (!press) return;
    const p = press; press = null;
    try { hit.releasePointerCapture(e.pointerId); } catch (x) { }
    if (p.moved) {
      S.dragging = false;
      const a = p.samples[0], b = p.samples[p.samples.length - 1], dtt = Math.max(16, b.t - a.t) / 1000;
      const vx = clamp((b.x - a.x) / dtt, -2400, 2400), vy = clamp((b.y - a.y) / dtt, -2400, 2400);
      const fast = Math.hypot(vx, vy) > 650;
      S.vx = fast ? vx * 0.85 : 0; S.vy = fast ? vy * 0.85 : 0;
      S.air = true; S.plat = null; S.thrown = fast;
      S.spin = Math.hypot(vx, vy) > 1600 ? (Math.sign(vx) || 1) : 0;
      setMode(fast ? 'thrown' : 'fall', 99);
    } else {
      if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; tickle(); }
      else clickTimer = setTimeout(() => { clickTimer = null; singleClick(); }, 240);
    }
  });
  hit.addEventListener('contextmenu', e => { e.preventDefault(); api.menu({ needs: roundNeeds(), sleeping: S.mode === 'sleep' }); });

  function singleClick() {
    interact('love', 1);
    if (S.mode === 'sleep') { setMode('idle', 1.5); setMood('hayron', 2); }
    if (S.busy) { openChat(busyText(), false); return; }
    if (S.chat) { api.focus(); binput.focus(); return; }
    if (offended()) {
      setMood('jahl', 4);
      openChat(pick(["Hmph! Men arazman 😤 Avval uzr so'rang...", 'Gaplashmayman... 😒 (lekin uzr so\'rasangiz, kechiraman)', 'Xafa qilgansiz-ku... 🥺']), true);
      return;
    }
    setMood('xursand', 6);
    if (grounded()) setMode('wave', 1.8);
    openChat(U(pick(['{u}, nima qilib beray? 😊', 'Ha, {u}? Eshitaman! 👂', 'Salom, {u}! Nima qilamiz? ✨', 'Buyuring, {u}! 😊'])), true);
  }
  function tickle() {
    interact('love', 3); needs.fun = Math.min(100, needs.fun + 4);
    setMood('kulgi', 3);
    if (grounded()) setMode('laugh', 2.6);
    spawnFx(pick(['😆', '✨', '🤭']), S.x, S.y - 150, 2);
    if (!S.chat) think(pick(["Hi-hi-hi! Qitiq bo'ldi! 😆", 'Voy, qitiqlamang! 🤭', 'Ha-ha-ha! Yana-yana! 😂', 'Hi-hi, men qitiqchiman! 😄']), 2.5);
  }

  // to'pni ushlash va otish
  let ballPress = null;
  ballEl.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    ballEl.setPointerCapture(e.pointerId);
    ball.held = true; ballPress = [{ x: e.clientX, y: e.clientY, t: performance.now() }];
  });
  ballEl.addEventListener('pointermove', e => {
    if (!ball.held) return;
    ball.x = e.clientX; ball.y = e.clientY + 15;
    ballPress.push({ x: e.clientX, y: e.clientY, t: performance.now() }); if (ballPress.length > 8) ballPress.shift();
  });
  ballEl.addEventListener('pointerup', e => {
    if (!ball.held) return;
    ball.held = false;
    const a = ballPress[0], b = ballPress[ballPress.length - 1], dtt = Math.max(16, b.t - a.t) / 1000;
    ball.vx = clamp((b.x - a.x) / dtt, -2200, 2200); ball.vy = clamp((b.y - a.y) / dtt, -2200, 2200);
    if (S.mode !== 'ball' && grounded() && !S.busy && !S.chat) { setMode('ball', 15); think('Men bilan o\'ynayapsizmi? 😍', 2); }
    interact('fun', 3);
  });

  // ------------------------------------------------------------------ ehtiyojlar va vaqt
  function interact(k, v) {
    S.lastInteract = now();
    needs[k] = clamp(needs[k] + v, 0, 100);
  }
  function roundNeeds() { return { energy: Math.round(needs.energy), fun: Math.round(needs.fun), love: Math.round(needs.love) }; }

  const CHECKINS = () => {
    const h = new Date().getHours();
    if (h >= 5 && h < 11) return ['Xayrli tong, {u}! ☀️ Yaxshi dam oldingizmi?', '{u}, nonushta qildingizmi? 🍳', 'Bugun kayfiyatingiz qanday, {u}? 😊'];
    if (h >= 11 && h < 17) return ['{u}, ishlar qalay? Charchamadingizmi?', 'Kayfiyatingiz qanday, {u}? 😊', 'Tushlik qildingizmi, {u}? 🍲', '{u}, hammasi joyidami? Yordam kerakmi?'];
    if (h >= 17 && h < 23) return ["Xayrli kech, {u}! Bugun kuningiz qanday o'tdi?", '{u}, bugun nima qiziq ish qildingiz? 😊', "Charchagan bo'lsangiz, dam oling, {u} 🌇"];
    return ["{u}, kech bo'lib qoldi... Uxlamaysizmi? 🌙", "Ko'zingiz charchamadimi, {u}? Dam olish kerak-ku 😴"];
  };
  function contextThought() {
    const list = ['Hmm... bugun nima qilsak ekan? 🤔', '{u}, suv ichishni unutmang! 💧', "Kompyuteringiz ichi juda qiziq ekan 👀", "Ko'zlaringizga ozgina dam bering, {u} 😌",
      "Men shu yerdaman, kerak bo'lsam bosing 🙂", "Do'ppim chiroylimi? 😄", 'Osh yegim kelyapti... 🍚', 'Qovun pishig\'i bormi? 🍈', '{u} juda aqlli-da! 🌟'];
    if (S.plat && S.plat.id !== 'floor') list.push("Bu oyna ustidan hamma narsa ko'rinadi! 😄", 'Balandlikdan qo\'rqmayman! 💪', 'Bu oynada nima bor ekan? 🧐');
    if (needs.fun < 35) list.push('Zerikdim... birga o\'ynaymizmi? ⚽', 'Menga biror ish buyuring! 🙏');
    if (needs.energy < 35) list.push('Uyqum kelyapti... 🥱', 'Biroz charchadim 😪');
    if (needs.love > 80) list.push('{u}, siz eng yaxshi do\'stimsiz! 💖');
    return U(pick(list));
  }

  setInterval(() => {
    const active = ['walk', 'run', 'chase', 'ball', 'dance', 'climb', 'cartwheel', 'jump'].includes(S.mode);
    const sleeping = S.mode === 'sleep';
    needs.energy = clamp(needs.energy + (sleeping ? 4 / 60 : active ? -1.3 / 60 : -0.35 / 60), 0, 100);
    needs.fun = clamp(needs.fun + (['ball', 'dance', 'chase', 'bubbles', 'cartwheel'].includes(S.mode) ? 3 / 60 : -0.45 / 60), 0, 100);
    needs.love = clamp(needs.love - 0.22 / 60, 0, 100);

    const t = now();
    if (S.busy && cur && !cur.raw) btext.textContent = busyText();
    if (S.chat && !S.busy && t > S.chatClose && !binput.value) closeChat();
    if (!cfg.Chatty || S.chat || S.busy || S.dragging || S.mode === 'sleep') return;
    if (t > S.nextCheckIn && idleSec < 60) {
      S.nextCheckIn = t + R(25, 50) * 60000;
      const q = U(pick(CHECKINS()));
      S.pending = q;
      openChat(q, false);
      if (grounded()) setMode('wave', 2.5);
    } else if (t > S.nextThought && thought.classList.contains('hidden')) {
      S.nextThought = t + R(2.5, 6) * 60000;
      think(contextThought(), 5);
    }
  }, 1000);
  setInterval(() => api.saveNeeds(roundNeeds()), 60000);

  api.on('idle', sec => {
    if (sec > 300) wasAway = true;
    if (wasAway && sec < 3) {
      wasAway = false;
      if (S.mode === 'sleep') setMode('stretch', 2);
      if (grounded()) setTimeout(() => setMode('wave', 2.5), 2100);
      setMood('xursand', 8);
      think(U(pick(["Qaytdingizmi, {u}! Sog'indim 🥰", 'Voy, {u} keldi! 🎉', 'Salom-salom, {u}! 👋'])), 4);
    }
    idleSec = sec;
  });

  // ------------------------------------------------------------------ menyu buyruqlari
  api.on('config', c => { cfg = c; buildPet(); });
  api.on('cmd', c => {
    switch (c.name) {
      case 'chat': openChat(U('{u}, nima qilib beray? 😊'), true); break;
      case 'play':
        if (S.mode === 'sleep') setMode('idle', 0.5);
        if (!grounded()) break;
        if (c.what === 'visit') { if (!planVisit()) think('Hozir chiqadigan oyna yo\'q 🤷', 2.5); }
        else startBehavior(c.what === 'bubbles' ? 'bubbles' : c.what);
        if (c.what === 'ball') S.dur = 30;
        interact('fun', 5);
        break;
      case 'outfit': setMood('xursand', 5); if (grounded()) setMode('dance', 3); think(U('Yangi kiyimim yoqdimi, {u}? 😊'), 3); break;
      case 'sleep': if (S.mode === 'sleep') wake('Uyg\'ondim! ☀️'); else if (grounded()) goSleep(); break;
      case 'reset': api.resetChat(); think('Yangi suhbat boshladik! Avvalgi gaplarni unutdim 🙂', 3); break;
      case 'saved': think(U('Rahmat, {u}! Sozlamalar saqlandi 😊'), 3); if (grounded()) setMode('wave', 2); break;
      case 'remind':
        if (S.mode === 'sleep') setMode('idle', 0.5);
        setMood('hayron', 6);
        openChat(U('⏰ {u}, eslataman: ') + c.text, false);
        S.chatClose = now() + 300000;
        if (grounded()) hop(0, -560);
        spawnFx('⏰', S.x, S.y - 150, 2);
        break;
    }
  });

  // ------------------------------------------------------------------ salomlashish
  setTimeout(() => {
    const h = new Date().getHours();
    const g = h >= 5 && h < 11 ? 'Xayrli tong, {u}! ☀️ Men keldim! Bugun kayfiyatingiz qanday?'
      : h >= 11 && h < 17 ? 'Assalomu alaykum, {u}! 😊 Ishlaringiz qalay?'
        : h >= 17 && h < 23 ? "Xayrli kech, {u}! Bugun kuningiz qanday o'tdi?"
          : "{u}, juda kech bo'ldi-ku... 🌙 Uxlamaysizmi?";
    S.pending = U(g);
    openChat(S.pending, false);
    setMode('wave', 2.5);
  }, 1500);
})();
