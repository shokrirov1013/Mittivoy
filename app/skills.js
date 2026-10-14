// Mittivoy - tezkor ko'nikmalar: serversiz yoki bepul ochiq xizmatlar orqali darhol bajariladi.
// Har bir ko'nikma { text, emotion? } qaytaradi yoki null (AI'ga uzatiladi).

const DAYS = ['yakshanba', 'dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba'];
const MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];

function norm(s) { return String(s || '').toLowerCase().replace(/[ʻʼ‘’`']/g, '').replace(/\s+/g, ' ').trim(); }
function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
function p2(n) { return String(n).padStart(2, '0'); }
async function getJson(url, ms) {
  const r = await fetch(url, { signal: AbortSignal.timeout(ms || 8000), headers: { 'User-Agent': 'Mittivoy/2.5' } });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}

// ------------------------------------------------------------------ his-tuyg'ular
const INSULTS = ['ahmoq', 'axmoq', 'tentak', 'jinni', 'eshak', 'gorang', 'tupoy', 'durak', 'dovdir', 'galvars', 'kallavaram', 'iflos', 'xunuk',
  'yomonsan', 'sen yomon', 'yomon korаman', 'yomon koraman', 'keraksiz', 'foydasiz', 'jim bol', 'ovozingni ochir', 'oqmagan', 'savodsiz', 'bema',
  'tirrancha', 'mishiq', 'befahm', 'nodon', 'aqlsiz', 'miyasiz', 'lanati', 'yoqol', 'daf bol', 'tupoysan', 'durakmisan', 'ahmoqmisan'];
const APOLOGY = ['kechir', 'uzr', 'kechirasan', 'kechiring', 'afsusdaman', 'xafa bolma', 'arazlama', 'yarashamiz', 'yarashdik', 'endi qilmayman'];
const PRAISE = ['yaxshisan', 'zorsan', 'zo rsan', 'aqllisan', 'aqlli', 'chiroylisan', 'yoqimlisan', 'sevaman', 'yaxshi koraman', 'malades', 'barakalla',
  'qoyil', 'ofarin', 'judayam zor', 'eng zori', 'sen zor', 'rahmat senga', 'jonim', 'shirinim', 'asalim'];
const LAUGH = ['haha', 'xaxa', 'hehe', 'hihi', 'xixi', 'kuldim', 'kulgili', 'qotib qoldim', 'ahahah', '😂', '🤣', '😆', '😄'];

function hasAny(t, list) { return list.some(w => (' ' + t + ' ').includes(' ' + w) || t.includes(w)); }

function emotionOf(text) {
  const t = norm(text);
  if (hasAny(t, APOLOGY)) return 'forgiven';
  if (hasAny(t, INSULTS)) return 'offended';
  if (hasAny(t, PRAISE)) return 'praised';
  if (hasAny(t, LAUGH)) return 'laugh';
  return null;
}

const REPLIES = {
  offended: ["[kayfiyat:hafa] Nega unaqa deysiz... 😢 Men sizga yordam bermoqchi edim-ku...", "[kayfiyat:jahl] Hmph! Arazladim! 😤 Uzr so'ramaguningizcha gaplashmayman...",
    "[kayfiyat:hafa] Bu gapingiz meni juda xafa qildi... 🥺", "[kayfiyat:jahl] Men ahmoq emasman! 😤 Kichkina bo'lsam ham, his-tuyg'ularim bor!"],
  forgiven: ["[kayfiyat:sevgi] Mayli, kechirdim! 🥰 Yarashdik!", "[kayfiyat:xursand] Uzr so'raganingiz uchun rahmat! Endi yana do'stmiz 🤗", "[kayfiyat:sevgi] Voy, men allaqachon kechirib qo'ygandim 💕"],
  praised: ["[kayfiyat:uyalish] Voy, uyaltirib yubordingiz... ☺️ Rahmat!", "[kayfiyat:sevgi] Siz ham juda zo'rsiz! 💖", "[kayfiyat:uyalish] Hi-hi, rahmat! Yanada harakat qilaman 🥰"],
  laugh: ["[kayfiyat:kulgi] Ha-ha-ha! 😂 Siz juda qiziqsiz!", "[kayfiyat:kulgi] Hi-hi-hi, qotib qoldim! 🤣", "[kayfiyat:kulgi] Ahahah! Yana ayting! 😆"],
};

// ------------------------------------------------------------------ latifalar
const JOKES = [
  "Afandi bozorga eshak sotgani boribdi. Dallol eshakni shunday maqtabdiki, Afandi o'z eshagini o'zi qaytib sotib olibdi! 😂",
  "O'qituvchi: \"Bolalar, kim dangasa bo'lsa, o'rnidan tursin.\" Hech kim turmabdi. Faqat Vali: \"Men ham turmayman, dangasaman-da!\" 😄",
  "Kompyuter sichqonchasi mushukdan qo'rqmaydi, chunki u simli - qochib ketolmaydi! 🐭😅",
  "Afandidan so'rashibdi: \"Oy foydalimi yoki quyosh?\" - \"Albatta oy! Quyosh kunduzi chiqadi, u paytda baribir yorug'.\" 🌙",
  "Bola: \"Dada, men katta bo'lsam, sizga o'xshash bo'laman!\" Dada: \"Nega?\" Bola: \"Uy vazifamni siz bajarasiz-ku!\" 😆",
  "Men kompyuterda yashayman, lekin hech qachon virus yuqtirmaganman - chunki har kuni qo'limni yuvaman! 🧼😄",
  "Afandi tunda uyining oldidan nimadir qidiribdi. \"Nima yo'qotdingiz?\" - \"Kalitni uyda yo'qotdim.\" - \"Unda nega bu yerda qidiryapsiz?\" - \"Bu yer yorug'-da!\" 🔦",
];

// ------------------------------------------------------------------ ob-havo
const CITIES = { toshkent: 'Tashkent', tashkent: 'Tashkent', samarqand: 'Samarkand', buxoro: 'Bukhara', andijon: 'Andijan', namangan: 'Namangan',
  fargona: 'Fergana', qarshi: 'Karshi', termiz: 'Termez', nukus: 'Nukus', xiva: 'Khiva', urganch: 'Urgench', jizzax: 'Jizzakh', guliston: 'Gulistan',
  navoiy: 'Navoiy', qoqon: 'Kokand', margilon: 'Margilan', chirchiq: 'Chirchiq', olmaliq: 'Almalyk', angren: 'Angren', moskva: 'Moscow', seul: 'Seoul', istanbul: 'Istanbul', dubay: 'Dubai' };
const WEATHER_UZ = [[/thunder/i, "momaqaldiroq ⛈️"], [/snow|sleet|blizzard/i, "qor ❄️"], [/rain|drizzle|shower/i, "yomg'ir 🌧️"], [/fog|mist|haze/i, 'tuman 🌫️'],
  [/overcast/i, 'bulutli ☁️'], [/cloud/i, 'qisman bulutli ⛅'], [/clear|sunny/i, 'ochiq, quyoshli ☀️']];

async function weather(t) {
  let key = Object.keys(CITIES).find(c => t.includes(c)) || 'toshkent';
  const j = await getJson(`https://wttr.in/${CITIES[key]}?format=j1`, 8000);
  const c = j.current_condition[0];
  const desc = (WEATHER_UZ.find(([re]) => re.test(c.weatherDesc[0].value)) || [, c.weatherDesc[0].value])[1];
  const name = key.charAt(0).toUpperCase() + key.slice(1);
  const today = j.weather && j.weather[0];
  let tip = '';
  const temp = +c.temp_C;
  if (/yomg/.test(desc)) tip = ' Soyabon olishni unutmang! ☂️';
  else if (temp <= 5) tip = " Issiq kiyining, sovuq qotmang! 🧣";
  else if (temp >= 33) tip = ' Ko\'proq suv iching! 💧';
  return `[kayfiyat:xursand] ${name}da hozir ${c.temp_C}°C (his qilinishi ${c.FeelsLikeC}°C), ${desc}.` +
    (today ? ` Bugun ${today.mintempC}°...${today.maxtempC}°C.` : '') + tip;
}

// ------------------------------------------------------------------ valyuta kursi (Markaziy bank)
const CUR = { dollar: 'USD', usd: 'USD', yevro: 'EUR', evro: 'EUR', euro: 'EUR', eur: 'EUR', rubl: 'RUB', rub: 'RUB', tenge: 'KZT', yuan: 'CNY', funt: 'GBP', lira: 'TRY', von: 'KRW', dirham: 'AED' };
async function currency(t) {
  const list = await getJson('https://cbu.uz/uz/arkhiv-kursov-valyut/json/', 8000);
  const by = {}; for (const x of list) by[x.Ccy] = x;
  const fmt = n => Math.round(n).toLocaleString('ru-RU').replace(/ /g, ' ');
  const amt = t.match(/(\d+(?:[.,]\d+)?)\s*(dollar|usd|yevro|evro|euro|eur|rubl|rub|tenge|yuan|funt|lira|von|dirham)/);
  if (amt) {
    const code = CUR[amt[2]], n = parseFloat(amt[1].replace(',', '.')), r = by[code];
    if (r) return `[kayfiyat:xursand] ${amt[1]} ${amt[2]} = ${fmt(n * parseFloat(r.Rate) / (parseFloat(r.Nominal) || 1))} so'm 💰 (Markaziy bank kursi, ${r.Date})`;
  }
  const want = Object.keys(CUR).filter(k => t.includes(k)).map(k => CUR[k]);
  const codes = want.length ? [...new Set(want)] : ['USD', 'EUR', 'RUB'];
  const lines = codes.filter(c => by[c]).map(c => `${by[c].CcyNm_UZ}: ${fmt(parseFloat(by[c].Rate))} so'm` + (parseFloat(by[c].Diff) ? ` (${parseFloat(by[c].Diff) > 0 ? '▲' : '▼'}${Math.abs(parseFloat(by[c].Diff))})` : ''));
  return `[kayfiyat:xursand] Markaziy bank kursi (${by.USD ? by.USD.Date : ''}) 💱\n` + lines.join('\n');
}

// ------------------------------------------------------------------ kalkulyator (xavfsiz, eval'siz)
function calc(expr) {
  const s = expr.replace(/×|x/gi, '*').replace(/÷|:/g, '/').replace(/,/g, '.').replace(/\s+/g, '');
  if (!/^[\d.+\-*/^%()]+$/.test(s) || !/\d/.test(s) || !/[+\-*/^%]/.test(s.replace(/^-/, ''))) return null;
  let i = 0;
  const peek = () => s[i], eat = c => { if (s[i] === c) { i++; return true; } return false; };
  function num() {
    if (eat('(')) { const v = add(); if (!eat(')')) throw 0; return v; }
    if (eat('-')) return -num();
    const m = s.slice(i).match(/^\d+(\.\d+)?/); if (!m) throw 0; i += m[0].length;
    let v = parseFloat(m[0]); if (eat('%')) v /= 100; return v;
  }
  function pow() { let v = num(); while (eat('^')) v = Math.pow(v, num()); return v; }
  function mul() { let v = pow(); for (; ;) { if (eat('*')) v *= pow(); else if (eat('/')) v /= pow(); else return v; } }
  function add() { let v = mul(); for (; ;) { if (eat('+')) v += mul(); else if (eat('-')) v -= mul(); else return v; } }
  try { const v = add(); if (i !== s.length || !isFinite(v)) return null; return Math.round(v * 1e10) / 1e10; } catch (e) { return null; }
}

// ------------------------------------------------------------------ YouTube'dan qo'shiq/video qo'yish
async function youtubeFirst(query) {
  const r = await fetch('https://www.youtube.com/results?hl=uz&search_query=' + encodeURIComponent(query), {
    signal: AbortSignal.timeout(9000), headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36', 'Accept-Language': 'uz,ru;q=0.8,en;q=0.6' },
  });
  const html = await r.text();
  const m = html.match(/"videoRenderer":\{"videoId":"([\w-]{11})"[\s\S]{0,1500}?"title":\{"runs":\[\{"text":"((?:[^"\\]|\\.)*)"/);
  if (m) return { id: m[1], title: JSON.parse('"' + m[2] + '"') };
  const m2 = html.match(/"videoId":"([\w-]{11})"/);
  return m2 ? { id: m2[1], title: query } : null;
}
const PLAY_VERB = /(qoy(ib ber|ib qoy|gin|chi|ing|vor)?|ijro (et|qil)|eshittir|chal(ib ber)?|yoq(ib ber)?|ochib ber|top(ib ber)?|qoyib yubor)$/;
const MEDIA_WORD = /\b(qoshig\w*|qoshiq\w*|ashula\w*|musiqa\w*|klip\w*|trek\w*|video\w*|qoshiqchi\w*)\b/;

async function play(text, ctx) {
  const t = norm(text).replace(/[!?.]+$/, '');
  if (!PLAY_VERB.test(t) || !(MEDIA_WORD.test(t) || /\b(youtube|yutub)\b/.test(t))) return null;
  let q = t.replace(PLAY_VERB, '').replace(MEDIA_WORD, ' ').replace(/\b(youtubeda|youtubedan|yutubda|youtube|menga|iltimos|bitta|birorta|ni|ini|dan|da)\b/g, ' ').replace(/\s+/g, ' ').trim();
  if (!q) q = "o'zbek qo'shiqlari 2026";
  const wantsVideo = /\b(video\w*|klip\w*)\b|korsat/.test(t);
  const v = await youtubeFirst(q + (MEDIA_WORD.test(t) && !wantsVideo ? ' qo\'shiq' : ''));
  if (!v) { ctx.openUrl('https://www.youtube.com/results?search_query=' + encodeURIComponent(q)); return `[kayfiyat:oylash] "${q}" ni YouTube'da qidirib ochdim 🔎`; }
  const url = `https://www.youtube.com/watch?v=${v.id}&autoplay=1`;
  // video/klip - ko'rish uchun brauzerda; qo'shiq - fonda (oyna chiqmaydi, ishingizga xalaqit bermaydi)
  if (wantsVideo || !ctx.playMusic) { ctx.openUrl(url); return `[kayfiyat:xursand] [harakat:raqs] 🎬 Ochdim: ${v.title}\nYoqimli tomosha! 🍿`; }
  ctx.playMusic(url, v.title);
  return `[kayfiyat:xursand] [harakat:raqs] 🎵 Qo'ydim: ${v.title}\nFonda chalinyapti - ishingizni davom ettiravering. To'xtatish uchun "musiqani to'xtat" deng 💃`;
}
// fonda chalinayotgan musiqani to'xtatish
function stopPlay(t, ctx) {
  if (!ctx.stopMusic || !ctx.musicOn || !ctx.musicOn()) return null;
  if (!/(toxtat|ochir|bas qil|yetarli|jim|ovozini ochir)/.test(t)) return null;
  if (!/(musiqa|qoshiq|ashula|qoshig|trek|ovoz)/.test(t) && t.split(' ').length > 2) return null;
  ctx.stopMusic();
  return "[kayfiyat:oddiy] ⏹ Musiqani to'xtatdim.";
}

// ------------------------------------------------------------------ asosiy kirish nuqtasi
async function quick(text, ctx) {
  const t = norm(text).replace(/[!?.]+$/, '');
  const now = new Date();

  // his-tuyg'ular: qisqa xabar bo'lsa - darhol o'zi javob beradi
  const emo = emotionOf(text);
  if (emo && t.split(' ').length <= 7) return { text: pick(REPLIES[emo]), emotion: emo };

  if (/^(soat|vaqt) (nechi|necha|qancha)|^soat nechchi|^hozir soat|^soat necha/.test(t))
    return { text: `[kayfiyat:xursand] Hozir soat ${p2(now.getHours())}:${p2(now.getMinutes())} ⏰` };
  if (/^bugun (nechanchi|qaysi kun|sana|necha)|^sana (qanday|nechi)/.test(t))
    return { text: `[kayfiyat:xursand] Bugun ${now.getDate()}-${MONTHS[now.getMonth()]}, ${DAYS[now.getDay()]} 📅` };

  // kalkulyator
  const ex = t.replace(/(nechchi|necha|nechi|boladi|qancha|teng|=|\?|hisobla\w*|chiqadi)/g, '').trim();
  if (/\d\s*[-+*/x×÷^%:]\s*[\d(]/.test(ex)) { const v = calc(ex); if (v !== null) return { text: `[kayfiyat:xursand] ${ex.replace(/\s+/g, ' ')} = ${v} 🧮` }; }

  if (/(latifa|hazil|kuldir|qiziq gap)/.test(t) && t.split(' ').length <= 6) return { text: '[kayfiyat:kulgi] ' + pick(JOKES), emotion: 'laugh' };
  const stopped = stopPlay(t, ctx); if (stopped) return { text: stopped };

  try {
    if (/(ob-?havo|obhavo|havo (qanday|qalay|necha)|harorat|yomgir yogadimi|qor yogadimi|issiqmi|sovuqmi)/.test(t)) return { text: await weather(t) };
    if (/(kurs|valyuta)/.test(t) || /\d+\s*(dollar|usd|yevro|evro|euro|rubl)/.test(t) || /^(dollar|yevro|rubl)\b/.test(t)) return { text: await currency(t) };
    const pl = await play(text, ctx);
    if (pl) return { text: pl };
  } catch (e) { ctx.log && ctx.log('skill: ' + e.message); }
  return emo ? { emotion: emo } : null;
}

module.exports = { quick, calc, emotionOf, norm, youtubeFirst, DAYS, MONTHS };
