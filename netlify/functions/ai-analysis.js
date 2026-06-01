const https = require('https');
const { getStore, connectLambda } = require('@netlify/blobs');

const STORE_NAME = 'daily-ai-analysis';
const FALLBACK_MODELS = ['gemini-1.5-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-pro'];
const SECTION_TITLES = ['Durum analizi', 'Ekopolitik risk', 'Jeopolitik risk'];
const CATEGORY_LABELS = {
  'genel': 'genel piyasa',
  'iran-risk': 'İran ve Orta Doğu riski',
  'emtia-enerji': 'enerji emtiaları',
  'emtia-metaller': 'kıymetli ve endüstriyel metaller',
  'emtia-tarim': 'tarım emtiaları',
  'kurlar': 'döviz piyasaları',
  'tahviller': 'tahvil ve faiz piyasaları',
  'endeksler': 'küresel endeksler',
  'kripto': 'kripto piyasası',
  'hisseler': 'hisse senetleri',
  'sanayi': 'sanayi ve hammadde göstergeleri',
  'navlun': 'navlun ve tedarik zinciri',
  'ekonomik-takvim': 'ekonomik takvim'
};
const QUERY_MAP = {
  'genel': ['küresel ekonomi piyasalar Fed ECB TCMB petrol altın borsa', 'Türkiye ekonomi enflasyon faiz kur borsa'],
  'iran-risk': ['İran İsrail Hürmüz petrol son dakika', 'Iran Israel Strait of Hormuz oil latest'],
  'emtia-enerji': ['petrol doğalgaz enerji piyasası OPEC Hürmüz', 'oil natural gas OPEC energy market latest'],
  'emtia-metaller': ['altın gümüş bakır piyasa Fed Çin', 'gold copper metals market latest'],
  'emtia-tarim': ['buğday mısır soya kahve kakao emtia hava arz', 'wheat corn soy coffee cocoa commodities latest'],
  'kurlar': ['döviz dolar euro TL Fed TCMB son', 'FX dollar euro emerging markets latest'],
  'tahviller': ['tahvil faiz Fed ECB getiri eğrisi son', 'bond yields Fed ECB latest'],
  'endeksler': ['borsa endeksleri S&P Nasdaq BIST Avrupa Asya son', 'stock market indexes S&P Nasdaq latest'],
  'kripto': ['bitcoin ethereum kripto ETF regülasyon son', 'bitcoin ethereum crypto ETF regulation latest'],
  'hisseler': ['BIST hisseler bankacılık holding sanayi borsa son', 'stocks earnings banking technology market latest'],
  'sanayi': ['sanayi üretim hammadde bakır navlun PMI son', 'industrial metals freight PMI latest'],
  'navlun': ['navlun konteyner kuru yük Kızıldeniz Süveyş son', 'freight shipping Red Sea Suez latest']
};
const STATIC_FALLBACK = {
  'genel': {
    status: 'Piyasa odağı Fed, ECB ve TCMB faiz patikası; enerji, altın, döviz ve hisse tarafındaki oynaklık başlıklarında yoğunlaşıyor.',
    ecopolitical: 'Enflasyon, büyüme ve kamu maliyesi haberleri risk iştahını belirlerken Türkiye varlıklarında kur-faiz dengesi ve sermaye akımı başlıkları izleniyor.',
    geopolitical: 'Orta Doğu, Kızıldeniz ve Hürmüz kaynaklı haber akışı petrol, altın ve navlun üzerinden piyasa fiyatlamasına hızlı yansıyabilir.'
  },
  'kripto': {
    status: 'Kripto piyasasında Bitcoin ve Ethereum yön tayini için spot ETF akımları, risk iştahı ve dolar likiditesi takip ediliyor.',
    ecopolitical: 'ABD regülasyon gündemi, kurumsal saklama kararları ve faiz beklentileri kripto varlıkların sermaye giriş çıkışını etkiliyor.',
    geopolitical: 'Jeopolitik stres dönemlerinde kripto kısa vadede riskli varlık gibi dalgalanabilir; sermaye kontrolleri ve yaptırım haberleri ayrıca izlenmeli.'
  },
  'hisseler': {
    status: 'Hisse piyasalarında bankacılık, holding, havacılık, savunma ve büyük teknoloji liderleri ana yön göstergesi olmaya devam ediyor.',
    ecopolitical: 'Faiz, kredi koşulları, enflasyon muhasebesi, bilanço beklentileri ve kamu düzenlemeleri sektör ayrışmasını belirliyor.',
    geopolitical: 'Enerji ve savunma başlıkları jeopolitik haberlerle desteklenirken küresel riskten kaçış dönemleri banka ve sanayi hisselerinde baskı yaratabilir.'
  },
  'iran-risk': {
    status: 'İran hattında haber akışı Hürmüz Boğazı, enerji arz güvenliği ve bölgesel askeri temaslar üzerinden izleniyor.',
    ecopolitical: 'Petrol ve navlun risk primi enflasyon beklentileri, cari denge ve merkez bankası iletişimi üzerinde baskı oluşturabilir.',
    geopolitical: 'İsrail, ABD, Körfez ülkeleri ve İran kaynaklı açıklamalar; füze, deniz güvenliği ve yaptırım haberleri açısından yüksek öncelikli.'
  }
};

function headers() {
  return { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=3600' };
}
function todayKey() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date());
}
function safeCategory(cat) {
  return CATEGORY_LABELS[cat] ? cat : 'genel';
}
function stripTags(v) {
  return String(v || '').replace(/<[^>]+>/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ').trim();
}
function sectionText(sections) {
  return SECTION_TITLES.map((title, i) => `${title}\n${sections[['status', 'ecopolitical', 'geopolitical'][i]] || ''}`).join('\n\n') + '\n\n⚠️ Bu analiz bilgilendirme amaçlıdır, yatırım tavsiyesi değildir.';
}
function normalizeSections(value, cat, news, provider, debug) {
  const fallback = STATIC_FALLBACK[cat] || STATIC_FALLBACK.genel;
  const sections = {
    status: stripTags(value?.status) || fallback.status,
    ecopolitical: stripTags(value?.ecopolitical) || fallback.ecopolitical,
    geopolitical: stripTags(value?.geopolitical) || fallback.geopolitical
  };
  if (!value && news.length) {
    sections.status += ` Günün öne çıkan başlıkları: ${news.slice(0, 2).map(n => n.title).join(' | ')}.`;
  }
  return {
    category: cat,
    categoryLabel: CATEGORY_LABELS[cat],
    sections,
    analysis: sectionText(sections),
    generatedAt: new Date().toISOString(),
    news: news.slice(0, 8),
    provider: provider || 'fallback',
    fromCache: false,
    debug: debug || null
  };
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
    const title = stripTags((block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) || block.match(/<title>([\s\S]*?)<\/title>/) || [])[1]);
    const link = stripTags((block.match(/<link>([\s\S]*?)<\/link>/) || [])[1]);
    const date = stripTags((block.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1]);
    if (title) items.push({ title, link, date });
  }
  return items;
}
async function fetchNews(cat) {
  if (process.env.NODE_ENV === 'test') return [];
  const queries = QUERY_MAP[cat] || QUERY_MAP.genel;
  const all = [];
  for (const q of queries.slice(0, 2)) {
    try {
      all.push(...parseItems(await fetchText(googleRssUrl(q))));
    } catch (_) {}
  }
  const seen = new Set();
  return all.filter(n => {
    const k = n.title.toLocaleLowerCase('tr');
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).slice(0, 10);
}
function buildPrompt(cat, news) {
  return `Türkçe yaz. Konu: ${CATEGORY_LABELS[cat]}. Aşağıdaki güncel haber başlıklarını ve genel makro/politik bağlamı kullanarak sadece geçerli JSON üret. Üç alan zorunlu: status, ecopolitical, geopolitical. Alan adlarını değiştirme. Her alan 1-2 kısa cümle olsun, haber dili kullan, yatırım tavsiyesi verme, uydurma fiyat/rakam yazma.\n\nHaberler:\n${news.map((n, i) => `${i + 1}. ${n.title}`).join('\n')}`;
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
async function callGemini(cat, news) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY missing');
  const preferred = process.env.GEMINI_MODEL;
  const chain = preferred ? [preferred, ...FALLBACK_MODELS.filter(m => m !== preferred)] : FALLBACK_MODELS;
  const errors = [];
  for (const model of chain) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
      const payload = { contents: [{ parts: [{ text: buildPrompt(cat, news) }] }], generationConfig: { temperature: 0.2, maxOutputTokens: 700 } };
      const data = await postJson(url, payload);
      const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('\n');
      const sections = parseJsonText(text);
      return { sections, provider: `gemini:${model}` };
    } catch (e) {
      errors.push(`${model}: ${e.message}`);
    }
  }
  throw new Error(errors.join(' | '));
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
  const cat = safeCategory(event?.queryStringParameters?.cat || 'genel');
  const store = safeStore(event);
  const cacheKey = `${cat}:${todayKey()}`;
  const cached = await readCache(store, cacheKey);
  if (cached) {
    return { statusCode: 200, headers: headers(), body: JSON.stringify({ ...cached, fromCache: true }) };
  }

  const news = await fetchNews(cat);
  let entry;
  try {
    const g = await callGemini(cat, news);
    entry = normalizeSections(g.sections, cat, news, g.provider);
  } catch (e) {
    entry = normalizeSections(null, cat, news, 'fallback', e.message);
  }
  await writeCache(store, cacheKey, entry);
  return { statusCode: 200, headers: headers(), body: JSON.stringify(entry) };
};
