const https = require('https');
const { getStore, connectLambda } = require('@netlify/blobs');

const STORE_NAME = 'iran-risk';
const CACHE_PREFIX = 'daily-brief';
const FALLBACK_MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash', 'gemini-1.5-flash'];
const FALLBACK = {
  headline: 'İran hattında Hürmüz ve enerji güvenliği başlıkları izleniyor',
  summary: 'İran, İsrail, ABD ve Körfez hattından gelen haber akışı Hürmüz Boğazı, petrol arz güvenliği, Kızıldeniz rotaları ve güvenli liman talebi üzerinden piyasalar için güncel risk başlığı olmaya devam ediyor.',
  sections: {
    status: 'Bölgedeki son haberler diplomasi, askeri caydırıcılık ve deniz güvenliği başlıklarında yoğunlaşıyor.',
    ecopolitical: 'Enerji fiyatları, navlun, sigorta maliyetleri ve enflasyon beklentileri haber akışına duyarlı kalıyor.',
    geopolitical: 'Hürmüz Boğazı, Kızıldeniz, İran-İsrail hattı ve ABD bölgesel varlığı yakından takip edilmeli.'
  }
};

function headers() {
  return { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=3600' };
}
function todayKey() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date());
}
function stripTags(v) {
  return String(v || '').replace(/<[^>]+>/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ').trim();
}
function cleanNewsTitle(v) {
  return stripTags(v)
    .replace(/\s+[-–—]\s+[^-–—|:]{2,80}$/u, '')
    .replace(/\s+\|\s+[^|]{2,80}$/u, '')
    .replace(/\s+/g, ' ')
    .trim();
}
function cleanBannerText(v) {
  return cleanNewsTitle(v)
    .replace(/\b(Reuters|Bloomberg|Associated Press|AP News|CNBC|CNN|BBC|Al Jazeera|TRT Haber|Anadolu Ajansı|AA|Habertürk|Hürriyet|Milliyet|Sözcü|Dünya|Ekonomim)\b\s*:?/giu, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
function googleRssUrl(query) {
  return 'https://news.google.com/rss/search?q=' + encodeURIComponent(query + ' when:1d') + '&hl=tr&gl=TR&ceid=TR:tr';
}
function fetchText(url, timeoutMs = 3500) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 PiyasaMonitoru/1.0' }, timeout: timeoutMs }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve(body));
    });
    req.on('timeout', () => { req.destroy(new Error('timeout')); });
    req.on('error', reject);
  });
}
function parseItems(xml) {
  const items = [];
  const blocks = String(xml || '').match(/<item>[\s\S]*?<\/item>/g) || [];
  for (const block of blocks.slice(0, 8)) {
    const title = cleanNewsTitle((block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) || block.match(/<title>([\s\S]*?)<\/title>/) || [])[1]);
    const link = stripTags((block.match(/<link>([\s\S]*?)<\/link>/) || [])[1]);
    const date = stripTags((block.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1]);
    if (title) items.push({ title, link, date });
  }
  return items;
}
async function fetchIranNews() {
  if (process.env.NODE_ENV === 'test') return [];
  const queries = ['İran İsrail Hürmüz petrol son dakika', 'Iran Israel Strait of Hormuz oil latest', 'Kızıldeniz Husi İran petrol enerji'];
  const all = [];
  for (const q of queries) {
    try { all.push(...parseItems(await fetchText(googleRssUrl(q)))); } catch (_) {}
  }
  const blocked = ['rudaw', 'kürdistan', 'kurdistan', 'pkk', 'ypg', 'pyd'];
  const seen = new Set();
  return all.filter(n => {
    const low = (n.title + ' ' + n.link).toLocaleLowerCase('tr');
    if (blocked.some(b => low.includes(b))) return false;
    if (seen.has(low)) return false;
    seen.add(low);
    return true;
  }).slice(0, 12);
}
function buildPrompt(news) {
  return `Türkçe haber diliyle yaz. İran risk monitörü için günün en güncel başlıklarına göre geçerli JSON üret. Alanlar: headline, summary, sections.status, sections.ecopolitical, sections.geopolitical. Headline en fazla 12 kelime, summary 1 cümle, her section 1 kısa cümle olsun. Uydurma tarih, fiyat veya saldırı yazma; sadece başlıklardan çıkarım yap; haber sitesi/kaynak adı yazma.\n\nHaberler:\n${news.map((n, i) => `${i + 1}. ${n.title}`).join('\n')}`;
}
async function postJson(url, payload, timeoutMs = 8000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: ctrl.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}
function parseJsonText(text) {
  const raw = String(text || '').trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
  const match = raw.match(/\{[\s\S]*\}/);
  return JSON.parse(match ? match[0] : raw);
}
async function callGemini(news) {
  if (process.env.NODE_ENV === 'test') throw new Error('Gemini disabled during tests');
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY missing');
  const preferred = process.env.GEMINI_MODEL;
  const chain = preferred ? [preferred, ...FALLBACK_MODELS.filter(m => m !== preferred)] : FALLBACK_MODELS;
  const errors = [];
  for (const model of chain) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
      const payload = { contents: [{ parts: [{ text: buildPrompt(news) }] }], generationConfig: { temperature: 0.2, maxOutputTokens: 650, responseMimeType: 'application/json' } };
      const data = await postJson(url, payload);
      const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('\n');
      return { value: parseJsonText(text), provider: `gemini:${model}` };
    } catch (e) {
      errors.push(`${model}: ${e.message}`);
    }
  }
  throw new Error(errors.join(' | '));
}
function normalize(value, news, provider, debug) {
  const v = value || {};
  const sections = v.sections || {};
  const firstNews = news[0]?.title;
  const summary = cleanBannerText(v.summary) || (firstNews ? `Günün haber akışı ${firstNews} başlığı etrafında izlenirken enerji, diplomasi ve güvenlik kanalları piyasalar için kritik kalıyor.` : FALLBACK.summary);
  return {
    updated_at: new Date().toISOString(),
    headline: cleanBannerText(v.headline) || FALLBACK.headline,
    summary,
    sections: {
      status: cleanBannerText(sections.status) || FALLBACK.sections.status,
      ecopolitical: cleanBannerText(sections.ecopolitical) || FALLBACK.sections.ecopolitical,
      geopolitical: cleanBannerText(sections.geopolitical) || FALLBACK.sections.geopolitical
    },
    news: news.slice(0, 8),
    provider: provider || 'fallback',
    fromCache: false,
    debug: debug || null
  };
}
function safeStore(event) {
  try { connectLambda(event); return getStore(STORE_NAME); } catch (_) { return null; }
}
async function readCache(store, key) {
  if (!store) return null;
  try { return await store.get(key, { type: 'json' }); } catch (_) { return null; }
}
async function writeCache(store, key, entry) {
  if (!store) return;
  try { await store.setJSON(key, entry); } catch (_) {}
}

exports.handler = async function(event) {
  const store = safeStore(event);
  const key = `${CACHE_PREFIX}:${todayKey()}`;
  const cached = await readCache(store, key);
  if (cached) return { statusCode: 200, headers: headers(), body: JSON.stringify({ ...cached, fromCache: true }) };

  const news = await fetchIranNews();
  let entry;
  try {
    const g = await callGemini(news);
    entry = normalize(g.value, news, g.provider);
  } catch (e) {
    entry = normalize(null, news, 'fallback', e.message);
  }
  await writeCache(store, key, entry);
  return { statusCode: 200, headers: headers(), body: JSON.stringify(entry) };
};
