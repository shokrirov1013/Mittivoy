// Mittivoy qahramoni: SVG chizma, kiyimlar, yuz ifodalari va pozalar.
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const SKIN = { och: ['#FFEBDD', '#F6CFB2', '#E2A986'], orta: ['#FAD7B5', '#EDB98F', '#CF946A'], qora: ['#E2AE80', '#C98D5E', '#A86E44'] };
  const HAIR = { qora: ['#3A2419', '#22130D'], jigar: ['#7A4B30', '#4E2D1B'], malla: ['#D9A15E', '#A86E35'] };
  const INK = '#3B2418';
  const LIP = '#C2455A';

  const MOODS = ['oddiy', 'xursand', 'kulgi', 'hafa', 'jahl', 'hayron', 'sevgi', 'oylash', 'uyqu', 'uyalish', 'zerikish', 'qorqish', 'boshaylanish'];

  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  function defs(id, skin, hair) {
    return `
    <defs>
      <radialGradient id="${id}skin" cx="50%" cy="42%" r="60%">
        <stop offset="0%" stop-color="${skin[0]}"/><stop offset="75%" stop-color="${skin[1]}"/><stop offset="100%" stop-color="${skin[2]}"/>
      </radialGradient>
      <linearGradient id="${id}hair" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${hair[0]}"/><stop offset="100%" stop-color="${hair[1]}"/>
      </linearGradient>
      <radialGradient id="${id}iris" cx="45%" cy="35%" r="70%">
        <stop offset="0%" stop-color="#7A4A2E"/><stop offset="55%" stop-color="#3A2014"/><stop offset="100%" stop-color="#1A0D08"/>
      </radialGradient>
      <pattern id="${id}atlas" width="26" height="34" patternUnits="userSpaceOnUse" patternTransform="skewX(-6)">
        <rect width="26" height="34" fill="#C2185B"/>
        <path d="M0 0 h6 l2 5 -2 5 2 6 -2 6 2 6 -2 6 h-6z" fill="#FDD835"/>
        <path d="M8 0 h5 l-2 6 2 6 -2 5 2 6 -2 6 2 5 h-5z" fill="#1E88E5"/>
        <path d="M13 0 h2 v34 h-2z" fill="#FFFFFF" opacity=".85"/>
        <path d="M15 0 h6 l2 4 -2 6 2 6 -2 6 2 6 -2 6 h-6z" fill="#43A047"/>
        <path d="M21 0 h5 v34 h-5z" fill="#8E24AA"/>
      </pattern>
      <pattern id="${id}chopon" width="12" height="10" patternUnits="userSpaceOnUse">
        <rect width="12" height="10" fill="#1A237E"/>
        <rect x="2" width="2" height="10" fill="#2E7D32"/>
        <rect x="5" width="1.2" height="10" fill="#F9A825"/>
        <rect x="7.5" width="2.2" height="10" fill="#6A1B9A"/>
        <rect x="10.5" width=".8" height="10" fill="#E53935"/>
      </pattern>
      <linearGradient id="${id}shine" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#fff" stop-opacity=".35"/><stop offset="60%" stop-color="#fff" stop-opacity="0"/>
      </linearGradient>
    </defs>`;
  }

  function outfitColors(o, girl, id) {
    switch (o) {
      case 'zamonaviy': return girl ? { top: `url(#${id}atlas)`, leg: '#3949AB', shoe: '#FAFAFA' }
        : { top: '#1E2A44', sleeve: `url(#${id}atlas)`, leg: '#3949AB', shoe: '#FAFAFA' };
      case 'oddiy': return girl ? { top: '#F48FB1', leg: 'skin', shoe: '#E91E63' } : { top: '#42A5F5', leg: '#3F51B5', shoe: '#6D4C41' };
      case 'sport': return girl ? { top: '#AB47BC', leg: '#4A148C', shoe: '#FAFAFA' } : { top: '#E53935', leg: '#263238', shoe: '#FAFAFA' };
      case 'qishki': return girl ? { top: '#26A69A', leg: '#37474F', shoe: '#4E342E' } : { top: '#795548', leg: '#37474F', shoe: '#3E2723' };
      case 'bayram': return girl ? { top: '#FFF8E1', leg: 'skin', shoe: '#FFB300' } : { top: '#263238', leg: '#263238', shoe: '#111111' };
      default: return girl ? { top: `url(#${id}atlas)`, leg: '#7B1FA2', shoe: '#8D2B0B' } : { top: `url(#${id}chopon)`, leg: '#212121', shoe: '#4E342E' };
    }
  }

  function bodySVG(o, girl, c, id) {
    const gold = '#F9B825', white = '#FAFAFA', ol = `stroke="${INK}" stroke-opacity=".45" stroke-width="1.6"`;
    let s = '';
    if (girl) {
      s += `<path d="M60,102 L100,102 L119,158 Q80,167 41,158 Z" fill="${c.top}" ${ol}/>`;
      s += `<path d="M60,102 L100,102 L119,158 Q80,167 41,158 Z" fill="url(#${id}shine)"/>`;
      if (o === 'zamonaviy') s += `<path d="M60,102 Q80,121 100,102 L97,108 Q80,124 63,108 Z" fill="#1E2A44"/><path d="M80,116 L80,160" stroke="#fff" stroke-width="1.6" stroke-dasharray="3 2"/>` +
        `<path d="M43,155 Q80,165 117,155 L119,160 Q80,170 41,160 Z" fill="#1E2A44"/><circle cx="72" cy="122" r="1.8" fill="#fff"/><circle cx="88" cy="122" r="1.8" fill="#fff"/>`;
      else if (o === 'milliy') s += `<path d="M64,102 Q80,115 96,102" fill="none" stroke="${gold}" stroke-width="3.2"/><path d="M44,154 Q80,164 116,154" fill="none" stroke="${gold}" stroke-width="3.2"/><circle cx="80" cy="113" r="2.4" fill="${gold}"/>`;
      else if (o === 'qishki') s += `<circle cx="80" cy="115" r="2.8" fill="#fff"/><circle cx="80" cy="127" r="2.8" fill="#fff"/><circle cx="80" cy="139" r="2.8" fill="#fff"/><path d="M43,154 Q80,164 117,154 L119,161 Q80,171 41,161 Z" fill="${white}"/>`;
      else if (o === 'bayram') s += `<path d="M46,146 Q80,156 114,146" fill="none" stroke="${gold}" stroke-width="2.5"/><path d="M44,154 Q80,163 116,154" fill="none" stroke="${gold}" stroke-width="2.5"/><path d="M64,102 Q80,112 96,102" fill="none" stroke="${gold}" stroke-width="2.5"/><path d="M76,122 l4,-6 4,6 -4,6z" fill="${gold}"/>`;
      else if (o === 'sport') s += `<path d="M80,104 L80,160" stroke="${white}" stroke-width="2"/><path d="M62,106 L46,156 M98,106 L114,156" stroke="${white}" stroke-width="2"/>`;
      else s += `<path d="M62,124 L98,124" stroke="#fff" stroke-width="4.5" stroke-linecap="round"/><circle cx="80" cy="124" r="4" fill="#fff"/>`;
    } else if (o === 'milliy') {
      s += `<path d="M54,102 L106,102 L112,159 L48,159 Z" fill="${c.top}" ${ol}/>`;
      s += `<path d="M54,102 L106,102 L112,159 L48,159 Z" fill="url(#${id}shine)"/>`;
      s += `<path d="M70,102 L90,102 L80,127 Z" fill="${white}"/>`;
      s += `<path d="M70,102 L75,159 M90,102 L85,159" stroke="${gold}" stroke-width="3"/>`;
      s += `<rect x="50" y="127" width="60" height="9" rx="3" fill="#ECEFF1" ${ol}/><path d="M74,131 l-6,12 6,-3 6,3 -6,-12z" fill="#CFD8DC"/>`;
    } else {
      s += `<path d="M56,102 L104,102 L107,151 L53,151 Z" fill="${c.top}" ${ol}/>`;
      s += `<path d="M56,102 L104,102 L107,151 L53,151 Z" fill="url(#${id}shine)"/>`;
      if (o === 'zamonaviy') s += `<rect x="55" y="117" width="50" height="9" fill="url(#${id}atlas)"/><path d="M80,104 L80,151" stroke="#E0E0E0" stroke-width="2"/>` +
        `<rect x="53" y="145" width="54" height="7" rx="2" fill="#14203A"/><path d="M68,102 Q80,110 92,102" fill="none" stroke="#14203A" stroke-width="4"/><rect x="88" y="130" width="9" height="7" rx="1.5" fill="#F9B825"/>`;
      else if (o === 'bayram') s += `<path d="M70,102 L90,102 L80,131 Z" fill="#fff"/><path d="M72,104 L80,108 L88,104 L88,112 L80,108 L72,112 Z" fill="#D32F2F"/><circle cx="80" cy="120" r="1.6" fill="#333"/>`;
      else if (o === 'qishki') s += `<circle cx="80" cy="113" r="2.8" fill="#FFE0B2"/><circle cx="80" cy="125" r="2.8" fill="#FFE0B2"/><circle cx="80" cy="137" r="2.8" fill="#FFE0B2"/><rect x="52" y="145" width="56" height="8" rx="3" fill="${white}"/>`;
      else if (o === 'sport') s += `<path d="M80,104 L80,151 M58,104 L55,149 M102,104 L105,149" stroke="${white}" stroke-width="2"/>`;
      else s += `<path d="M71,102 Q80,111 89,102" fill="none" stroke="#1565C0" stroke-width="3"/><text x="80" y="135" font-size="15" text-anchor="middle" fill="#fff" font-family="Segoe UI" font-weight="bold">★</text>`;
    }
    return s;
  }

  function hairBackSVG(o, girl, id) {
    if (!girl) return '';
    const h = `url(#${id}hair)`;
    let s = '';
    if (o === 'milliy' || o === 'qishki' || o === 'zamonaviy') {
      // kokillar (o'rilgan sochlar)
      const n = o === 'qishki' ? 3 : o === 'zamonaviy' ? 5 : 6;
      for (const side of [0, 1]) {
        const bx = side ? 81 : 5;
        for (let i = 0; i < n; i++) {
          const x = bx + (side ? 1 : -1) * i * 0.6, y = 56 + i * 12;
          s += `<ellipse cx="${x + 7}" cy="${y + 8}" rx="7.5" ry="8.5" fill="${h}" stroke="${INK}" stroke-opacity=".35" stroke-width="1"/>`;
          s += `<path d="M${x + 2},${y + 6} q5,4 10,0" fill="none" stroke="#000" stroke-opacity=".25" stroke-width="1"/>`;
        }
        const ex = bx + (side ? 1 : -1) * n * 0.6 + 7, ey = 56 + n * 12 + 4;
        s += `<circle cx="${ex}" cy="${ey}" r="5" fill="#D32F2F"/><circle cx="${ex}" cy="${ey + 7}" r="3" fill="#FFC107"/>`;
      }
    } else if (o === 'oddiy') {
      s += `<ellipse cx="2" cy="50" rx="12" ry="22" fill="${h}"/><ellipse cx="98" cy="50" rx="12" ry="22" fill="${h}"/>`;
    } else if (o === 'sport') {
      s += `<path d="M84,22 Q112,30 100,72 Q96,50 84,40 Z" fill="${h}"/>`;
    } else if (o === 'bayram') {
      s += `<ellipse cx="9" cy="70" rx="13" ry="40" fill="${h}"/><ellipse cx="91" cy="70" rx="13" ry="40" fill="${h}"/>`;
    }
    s += `<ellipse cx="50" cy="53" rx="46" ry="45" fill="${h}"/>`;
    return s;
  }

  function hatSVG(o, girl) {
    let s = '';
    if (o === 'milliy' || o === 'zamonaviy') {
      if (girl) {
        // qizlar do'ppisi: qizil baxmal, zardo'zi naqsh, jig'a
        s += `<path d="M18,33 L23,6 Q50,-3 77,6 L82,33 Q50,25 18,33 Z" fill="#B71C1C" stroke="${INK}" stroke-opacity=".5" stroke-width="1.2"/>`;
        s += `<path d="M50,1 L50,28 M31,4 L27,31 M69,4 L73,31" stroke="#FFD54F" stroke-width="1.2"/>`;
        for (const [x, y] of [[40, 13], [60, 13], [40, 22], [60, 22], [22, 24], [78, 24]]) s += `<circle cx="${x}" cy="${y}" r="3" fill="#FFD54F"/><circle cx="${x}" cy="${y}" r="1.2" fill="#2E7D32"/>`;
        s += `<path d="M18,33 Q50,25 82,33" fill="none" stroke="#FFD54F" stroke-width="2.4"/>`;
        s += `<path d="M66,4 q6,-14 16,-12 q-8,4 -12,14z" fill="#FFF8E1" stroke="#FFD54F" stroke-width="1"/><circle cx="66" cy="5" r="2.5" fill="#E91E63"/>`;
      } else {
        // chust do'ppi: qora fon, oq qalampir naqshlari
        s += `<path d="M18,33 L23,6 Q50,-3 77,6 L82,33 Q50,25 18,33 Z" fill="#161616" stroke="#000" stroke-width="1"/>`;
        s += `<path d="M31,4 L27,31 M69,4 L73,31" stroke="#F5F5F5" stroke-width="1.3"/>`;
        s += `<path d="M50,5 C57,4 61,12 57,19 C54,24 47,24 45,19 C43,14 47,12 50,15 C52,17 50,20 48,19" fill="#F5F5F5" stroke="#F5F5F5" stroke-width="1"/>`;
        s += `<path d="M24,13 C28,12 30,17 28,21 C26,25 22,24 22,20" fill="#F5F5F5"/><path d="M76,13 C72,12 70,17 72,21 C74,25 78,24 78,20" fill="#F5F5F5"/>`;
        s += `<path d="M18,33 Q50,25 82,33" fill="none" stroke="#F5F5F5" stroke-width="2.6"/>`;
        s += `<path d="M21,30 Q50,22.5 79,30" fill="none" stroke="#F5F5F5" stroke-width=".8" stroke-dasharray="2 2"/>`;
      }
    } else if (o === 'oddiy') {
      if (girl) s += `<path d="M66,14 L55,3 L55,25 Z M66,14 L77,3 L77,25 Z" fill="#E91E63" stroke="${INK}" stroke-opacity=".4"/><circle cx="66" cy="14" r="4.5" fill="#C2185B"/>`;
    } else if (o === 'sport') {
      if (girl) s += `<rect x="12" y="25" width="76" height="9" rx="4.5" fill="#fff" stroke="${INK}" stroke-opacity=".3"/>`;
      else s += `<path d="M12,34 Q14,2 50,2 Q86,2 88,34 Z" fill="#E53935" stroke="${INK}" stroke-opacity=".5"/><path d="M50,30 Q82,25 108,37 Q80,40 50,36 Z" fill="#B71C1C"/><circle cx="50" cy="3" r="4" fill="#B71C1C"/>`;
    } else if (o === 'qishki') {
      s += `<path d="M10,40 Q10,0 50,0 Q90,0 90,40 Z" fill="${girl ? '#EC407A' : '#1E88E5'}" stroke="${INK}" stroke-opacity=".4"/>`;
      s += `<path d="M20,12 L80,12 M14,24 L86,24" stroke="#fff" stroke-opacity=".5" stroke-width="2" stroke-dasharray="4 3"/>`;
      s += `<rect x="8" y="31" width="84" height="12" rx="6" fill="#FAFAFA"/><circle cx="50" cy="-4" r="10" fill="#FAFAFA"/>`;
    } else if (o === 'bayram' && girl) {
      const fl = ['#E91E63', '#FFEB3B', '#AB47BC', '#FF7043', '#E91E63'];
      for (let i = 0; i < 5; i++) {
        const fx = 22 + i * 14, fy = 24 - Math.sin(i / 4 * Math.PI) * 10;
        s += `<circle cx="${fx}" cy="${fy}" r="6.5" fill="${fl[i]}"/><circle cx="${fx}" cy="${fy}" r="2.5" fill="#FFF59D"/>`;
      }
    }
    return s;
  }

  function create(cfg, id) {
    id = id || 'k';
    const girl = cfg.Gender !== 'boy';
    const o = cfg.Outfit || 'zamonaviy';
    const skin = SKIN[cfg.Skin] || SKIN.orta;
    const hair = HAIR[cfg.Hair] || HAIR.qora;
    const c = outfitColors(o, girl, id);
    const leg = c.leg === 'skin' ? `url(#${id}skin)` : c.leg;
    const sk = `url(#${id}skin)`, hr = `url(#${id}hair)`;
    const ol = `stroke="${INK}" stroke-opacity=".45" stroke-width="1.5"`;

    const svg = el('svg', { viewBox: '0 0 160 200', width: '160', height: '200', overflow: 'visible' });
    svg.style.overflow = 'visible';
    svg.innerHTML = defs(id, skin, hair) + `
      <ellipse class="shadow" cx="80" cy="191" rx="32" ry="6" fill="#000" opacity=".18"/>
      <g class="root">
        <g class="legL"><rect x="63" y="146" width="14" height="34" rx="6" fill="${leg}" ${ol}/><ellipse cx="70" cy="182" rx="10" ry="6" fill="${c.shoe}" ${ol}/></g>
        <g class="legR"><rect x="83" y="146" width="14" height="34" rx="6" fill="${leg}" ${ol}/><ellipse cx="90" cy="182" rx="10" ry="6" fill="${c.shoe}" ${ol}/></g>
        <g class="body">${bodySVG(o, girl, c, id)}</g>
        <g class="armL"><rect x="48" y="104" width="12" height="30" rx="6" fill="${c.sleeve || c.top}" ${ol}/><circle cx="54" cy="133" r="7" fill="${sk}" ${ol}/></g>
        <g class="armR"><rect x="100" y="104" width="12" height="30" rx="6" fill="${c.sleeve || c.top}" ${ol}/><circle cx="106" cy="133" r="7" fill="${sk}" ${ol}/></g>
        <g class="head"><g transform="translate(30,6)">
          ${hairBackSVG(o, girl, id)}
          <ellipse cx="9" cy="59" rx="7" ry="9" fill="${sk}" ${ol}/><ellipse cx="91" cy="59" rx="7" ry="9" fill="${sk}" ${ol}/>
          <ellipse cx="50" cy="56" rx="42" ry="40" fill="${sk}" ${ol}/>
          ${girl && (o === 'milliy' || o === 'bayram' || o === 'zamonaviy') ? '<circle cx="7" cy="70" r="3.2" fill="#FFC107"/><circle cx="93" cy="70" r="3.2" fill="#FFC107"/>' : ''}
          ${girl
            ? `<path d="M10,52 Q12,14 50,14 Q88,14 90,52 Q80,34 66,32 Q58,42 50,33 Q42,42 34,32 Q20,34 10,52 Z" fill="${hr}"/>`
            : `<path d="M10,48 Q10,10 50,12 Q90,10 90,48 Q84,30 72,28 L66,36 L60,26 Q48,34 38,26 L32,36 Q16,30 10,48 Z" fill="${hr}"/>`}
          <path d="M28,20 Q40,15 50,16" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="3" stroke-linecap="round"/>
          <ellipse class="cheekL" cx="24" cy="69" rx="8" ry="4.5" fill="#FF8A80" opacity=".5"/>
          <ellipse class="cheekR" cx="76" cy="69" rx="8" ry="4.5" fill="#FF8A80" opacity=".5"/>
          <g class="eyes"></g>
          <g class="brows"></g>
          <g class="mouth" transform="translate(50,77)"></g>
          <g class="extra"></g>
          ${hatSVG(o, girl)}
        </g></g>
      </g>`;

    const q = s => svg.querySelector(s);
    const P = {
      svg, id, girl, mood: '', talking: false, blinkOn: false, lookX: 0, lookY: 0, armsFront: false,
      root: q('.root'), legL: q('.legL'), legR: q('.legR'), armL: q('.armL'), armR: q('.armR'), head: q('.head'),
      body: q('.body'), eyes: q('.eyes'), brows: q('.brows'), mouth: q('.mouth'), extra: q('.extra'),
      cheekL: q('.cheekL'), cheekR: q('.cheekR'), shadow: q('.shadow'),
    };
    P.setMood = m => setMood(P, m);
    P.pose = o2 => pose(P, o2);
    P.setTalk = t => setTalk(P, t);
    P.blink = b => { if (P.blinkOn === b) return; P.blinkOn = b; P.eyes.setAttribute('transform', b ? 'translate(0 57) scale(1 .12) translate(0 -57)' : ''); };
    P.look = (dx, dy) => {
      dx = Math.max(-1, Math.min(1, dx)); dy = Math.max(-1, Math.min(1, dy));
      if (Math.abs(dx - P.lookX) < 0.03 && Math.abs(dy - P.lookY) < 0.03) return;
      P.lookX = dx; P.lookY = dy;
      svg.querySelectorAll('.look').forEach(g => g.setAttribute('transform', `translate(${(dx * 2.6).toFixed(2)} ${(dy * 2).toFixed(2)})`));
    };
    setMood(P, 'oddiy');
    return P;
  }

  // ------------------------------------------------------------ yuz ifodalari
  function openEyes(P, dy, s, small) {
    let out = '';
    for (const cx of [36, 64]) {
      const cy = 56 + dy, rx = 5.4 * s, ry = 7 * s;
      out += `<g class="look"><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#${P.id}iris)"/>`;
      if (small) out += `<circle cx="${cx}" cy="${cy}" r="${1.6 * s}" fill="#fff"/>`;
      else out += `<circle cx="${cx - 1.8 * s}" cy="${cy - 2.6 * s}" r="${2.1 * s}" fill="#fff"/><circle cx="${cx + 2 * s}" cy="${cy + 2.4 * s}" r="${1 * s}" fill="#fff" opacity=".8"/>`;
      out += '</g>';
      if (P.girl) {
        const sx = cx < 50 ? -1 : 1;
        out += `<path d="M${cx + sx * 3.5},${cy - ry + 1.5} l${sx * 4},-3.5 M${cx + sx * 5},${cy - ry + 4} l${sx * 4},-2" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>`;
      }
    }
    return out;
  }
  function arcEyes(down) {
    let out = '';
    for (const cx of [36, 64]) out += down
      ? `<path d="M${cx - 6},56 Q${cx},61.5 ${cx + 6},56" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`
      : `<path d="M${cx - 6},58.5 Q${cx},50 ${cx + 6},58.5" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`;
    return out;
  }
  function halfEyes(P) {
    let out = '';
    for (const cx of [36, 64]) out += `<g class="look"><path d="M${cx - 5.5},56 A5.5,5 0 0 0 ${cx + 5.5},56 Z" fill="#2A160E"/></g><path d="M${cx - 6.5},55.5 L${cx + 6.5},55.5" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`;
    return out;
  }
  function spiralEyes() {
    let out = '';
    for (const cx of [36, 64]) out += `<path d="M${cx},56 m-1,0 a1,1 0 1,1 2,0 a2.5,2.5 0 1,1 -5,0 a4,4 0 1,1 8,0 a5.5,5.5 0 1,1 -11,0" fill="none" stroke="${INK}" stroke-width="1.6"/>`;
    return out;
  }
  function brows(l, r, y, P) {
    const c = P.id + 'hair';
    return `<path d="M-7,0 L7,0" transform="translate(36 ${y}) rotate(${l})" stroke="url(#${c})" stroke-width="3.2" stroke-linecap="round"/>` +
      `<path d="M-7,0 L7,0" transform="translate(64 ${y}) rotate(${r})" stroke="url(#${c})" stroke-width="3.2" stroke-linecap="round"/>`;
  }
  const M = {
    smile: ['M-6,0 Q0,6 6,0', false], happy: ['M-9,-1 Q0,12 9,-1 Z', true], laugh: ['M-11,-2 Q0,17 11,-2 Z', true],
    sad: ['M-7,5 Q0,-2 7,5', false], angry: ['M-8,4 L-4,1 L0,4 L4,1 L8,4', false], o: ['M-4,2 A4,5 0 1 0 4,2 A4,5 0 1 0 -4,2 Z', true],
    think: ['M-5,2 L5,-1', false], sleep: ['M-2.5,2 A2.5,3 0 1 0 2.5,2 A2.5,3 0 1 0 -2.5,2 Z', true], shy: ['M-5,1 Q-2.5,4 0,1 Q2.5,4 5,1', false],
    flat: ['M-6,2 L6,2', false], wavy: ['M-7,3 Q-3.5,0 0,3 Q3.5,6 7,3', false], talk: ['M-5,0 A5,6 0 1 0 5,0 A5,6 0 1 0 -5,0 Z', true],
  };
  function mouthSVG(key) {
    const [d, filled] = M[key];
    return filled
      ? `<path d="${d}" fill="${LIP}" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>` + (key === 'laugh' || key === 'happy' ? `<path d="M-5,${key === 'laugh' ? 6 : 4} Q0,${key === 'laugh' ? 10 : 7} 5,${key === 'laugh' ? 6 : 4}" fill="#F48FB1" opacity=".9"/>` : '')
      : `<path d="${d}" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`;
  }

  function setMood(P, m) {
    if (MOODS.indexOf(m) < 0) m = 'oddiy';
    if (P.mood === m) return;
    P.mood = m;
    P.blinkOn = false; P.eyes.setAttribute('transform', '');
    let eyes = '', br = brows(0, 0, 43, P), mouth = 'smile', extra = '', cheek = ['#FF8A80', 0.5];
    switch (m) {
      case 'xursand': eyes = arcEyes(false); br = brows(-6, 6, 41, P); mouth = 'happy'; break;
      case 'kulgi': eyes = arcEyes(false); br = brows(-8, 8, 40, P); mouth = 'laugh'; cheek = ['#FF8A80', 0.75];
        extra = `<path d="M8,48 l-6,-4 M8,53 l-7,0 M92,48 l6,-4 M92,53 l7,0" stroke="${INK}" stroke-width="1.5" stroke-linecap="round" opacity=".6"/>`; break;
      case 'hafa': eyes = openEyes(P, 1, 0.92); br = brows(-16, 16, 44, P); mouth = 'sad';
        extra = `<path d="M30,63 q-3,6 0,9 q3,-3 0,-9z" fill="#4FC3F7"/>`; break;
      case 'jahl': eyes = openEyes(P, 1, 0.9, true); br = brows(22, -22, 46, P); mouth = 'angry'; cheek = ['#EF5350', 0.7]; break;
      case 'hayron': eyes = openEyes(P, 0, 1.25); br = brows(0, 0, 37, P); mouth = 'o'; break;
      case 'sevgi': eyes = `<path d="M31,53 c-3,-4 -9,0 -5,5 l5,5 5,-5 c4,-5 -2,-9 -5,-5z M69,53 c-3,-4 -9,0 -5,5 l5,5 5,-5 c4,-5 -2,-9 -5,-5z" fill="#E91E63"/>`;
        br = brows(-6, 6, 41, P); mouth = 'happy'; cheek = ['#FF6F91', 0.85]; break;
      case 'oylash': eyes = openEyes(P, -4, 0.9); br = brows(-10, 4, 41, P); mouth = 'think'; break;
      case 'uyqu': eyes = arcEyes(true); mouth = 'sleep'; break;
      case 'uyalish': eyes = arcEyes(true); br = brows(-10, 10, 42, P); mouth = 'shy'; cheek = ['#FF5C8A', 0.9];
        extra = `<path d="M18,66 l4,-3 M23,67 l4,-3 M73,66 l4,-3 M78,67 l4,-3" stroke="#E53965" stroke-width="1.3"/>`; break;
      case 'zerikish': eyes = halfEyes(P); br = brows(4, -4, 45, P); mouth = 'flat'; break;
      case 'qorqish': eyes = openEyes(P, 0, 1.15, true); br = brows(-18, 18, 39, P); mouth = 'wavy';
        extra = `<path d="M86,30 q-4,7 0,10 q4,-3 0,-10z" fill="#81D4FA"/>`; break;
      case 'boshaylanish': eyes = spiralEyes(); br = brows(-8, 8, 42, P); mouth = 'wavy'; break;
      default: eyes = openEyes(P, 0, 1);
    }
    P.eyes.innerHTML = eyes;
    P.brows.innerHTML = br;
    P.extra.innerHTML = extra;
    P.mouthKey = mouth;
    P.mouth.innerHTML = mouthSVG(mouth);
    P.talkOpen = false;
    P.cheekL.setAttribute('fill', cheek[0]); P.cheekR.setAttribute('fill', cheek[0]);
    P.cheekL.setAttribute('opacity', cheek[1]); P.cheekR.setAttribute('opacity', cheek[1]);
    if (P.lookX || P.lookY) { const x = P.lookX, y = P.lookY; P.lookX = 9; P.look(x, y); }
  }

  function setTalk(P, open) {
    if (P.talkOpen === open) return;
    P.talkOpen = open;
    P.mouth.innerHTML = mouthSVG(open ? 'talk' : P.mouthKey);
  }

  function f(n) { return (+n || 0).toFixed(2); }
  // pozani qo'llash: oyoq/qo'l burchaklari, bosh, sakrash, siqilish, aylanish, o'tirish
  function pose(P, o) {
    const sit = o.sit || 0, sq = o.sq || 1;
    P.root.setAttribute('transform',
      `translate(${f(o.bx)} ${f((o.by || 0) + sit * 24)}) rotate(${f(o.rot)} 80 120) translate(80 190) scale(${f(2 - sq)} ${f(sq)}) translate(-80 -190)`);
    P.legL.setAttribute('transform', `rotate(${f(o.legL)} 70 148)`);
    P.legR.setAttribute('transform', `rotate(${f(o.legR)} 90 148)`);
    P.armL.setAttribute('transform', `rotate(${f(o.armL)} 54 108)`);
    P.armR.setAttribute('transform', `rotate(${f(o.armR)} 106 108)`);
    P.head.setAttribute('transform', `rotate(${f(o.head)} 80 98)`);
    P.shadow.setAttribute('opacity', f(o.shadow == null ? 0.18 : o.shadow));
    const front = !!o.armsFront;
    if (front !== P.armsFront) {
      P.armsFront = front;
      if (front) { P.root.appendChild(P.armL); P.root.appendChild(P.armR); }
      else { P.root.insertBefore(P.armL, P.head); P.root.insertBefore(P.armR, P.head); }
    }
  }

  window.Character = { create, MOODS };
})();
