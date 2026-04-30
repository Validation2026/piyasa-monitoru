const https = require('https');
const { getStore, connectLambda } = require('@netlify/blobs');

const FALLBACK_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-pro'];
const RETRYABLE = /HTTP (429|500|502|503|504)/;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const STORE_NAME = 'operational-risk';
const CACHE_KEY = 'last-report';

function postJson(url, headers, payload, timeout = 8000) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method: 'POST', headers, timeout }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) return reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 500)}`));
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('request timeout')); });
    req.write(JSON.stringify(payload));
    req.end();
  });
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function trimNewsForPrompt(news) {
  return news.slice(0, 80).map(n => ({
    t: n.title,
    s: n.source,
    r: n.region,
    k: n.kind,
    d: n.pubDate
  }));
}

function buildPrompt(news) {
  return [
    'Aşağıdaki operasyonel risk haberlerini analiz et.',
    'Sadece Türkçe ve yönetici seviyesi detaylı rapor üret.',
    'HTML formatı kullan (h1,h2,p,ul,ol). Haber listesi dökme, analiz et.',
    'Bölümler: Yönetici Özeti, Kritik Temalar, Türkiye-Global Etki, 24/72 saat aksiyon, 7 günlük izleme.',
    JSON.stringify(trimNewsForPrompt(news))
  ].join('\n');
}

async function callModel(model, key, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 1500 }
  };
  const r = await postJson(url, { 'Content-Type': 'application/json' }, payload, 8000);
  const text = r?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('\n').trim();
  if (!text) throw new Error('Gemini empty response');
  return text;
}

async function callGeminiWithFallback(news) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY missing');

  const preferred = process.env.GEMINI_MODEL;
  const chain = preferred ? [preferred, ...FALLBACK_MODELS.filter(m => m !== preferred)] : FALLBACK_MODELS.slice();

  const errors = [];
  for (let i = 0; i < chain.length; i++) {
    const model = chain[i];
    try {
      const html = await callModel(model, key, buildPrompt(news));
      return { html, provider: `gemini:${model}`, attempts: errors.length + 1 };
    } catch (e) {
      errors.push(`${model}: ${e.message}`);
      if (!RETRYABLE.test(e.message) && !/timeout/i.test(e.message)) break;
      if (i < chain.length - 1) await sleep(400);
    }
  }
  throw new Error(errors.join(' | '));
}

function fallbackReport(news, debug) {
  const tr = news.filter(n => n.region === 'Türkiye').length;
  const gl = news.filter(n => n.region === 'Global').length;
  return `<h1>Operasyonel Risk Günlük Değerlendirme</h1>
<p><i>AI servisi şu an yanıt veremedi; yedek rapor üretildi. Ayrıntı: ${debug || 'yok'}</i></p>
<h2>Yönetici Özeti</h2>
<p>Toplam ${news.length} başlık tarandı (Türkiye: ${tr}, Global: ${gl}).</p>
<h2>Önerilen Aksiyonlar</h2>
<ol>
<li>24 saat: Kritik süreç sahipleriyle risk komitesi mini-oturumu.</li>
<li>72 saat: Tedarik / siber / uyum üçlüsü için düzeltici aksiyon listesi.</li>
<li>7 gün: Erken uyarı göstergeleri (KRI) dashboard güncellemesi.</li>
</ol>`;
}

async function readCache(store) {
  if (!store) return null;
  try { return await store.get(CACHE_KEY, { type: 'json' }); } catch (_) { return null; }
}

async function writeCache(store, entry) {
  if (!store) return;
  try { await store.setJSON(CACHE_KEY, entry); } catch (_) {}
}

function safeStore(event) {
  try { connectLambda(event); return getStore(STORE_NAME); } catch (_) { return null; }
}

exports.handler = async function (event) {
  const H = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
  const store = safeStore(event);

  if (event.httpMethod === 'GET') {
    const key = process.env.GEMINI_API_KEY || '';
    const cached = await readCache(store);
    const now = Date.now();
    let cacheState = null;
    if (cached) {
      const generatedMs = new Date(cached.generatedAt).getTime();
      const ageMs = now - generatedMs;
      const fresh = ageMs < CACHE_TTL_MS;
      cacheState = {
        provider: cached.provider,
        generatedAt: cached.generatedAt,
        ageMs,
        expiresAt: new Date(generatedMs + CACHE_TTL_MS).toISOString(),
        fresh,
        reportHtml: fresh ? cached.reportHtml : null
      };
    }
    return { statusCode: 200, headers: H, body: JSON.stringify({
      hasKey: Boolean(key),
      keyLength: key.length,
      keyPrefix: key ? key.slice(0, 6) : null,
      preferredModel: process.env.GEMINI_MODEL || null,
      modelChain: process.env.GEMINI_MODEL
        ? [process.env.GEMINI_MODEL, ...FALLBACK_MODELS.filter(m => m !== process.env.GEMINI_MODEL)]
        : FALLBACK_MODELS,
      cache: cacheState,
      ttlMs: CACHE_TTL_MS,
      runtime: process.version
    }) };
  }

  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: H, body: 'Method Not Allowed' };
  try {
    const body = JSON.parse(event.body || '{}');
    const news = Array.isArray(body.news) ? body.news.slice(0, 120) : [];
    if (!news.length) return { statusCode: 400, headers: H, body: JSON.stringify({ error: 'news gerekli' }) };

    const cached = await readCache(store);
    if (cached) {
      const ageMs = Date.now() - new Date(cached.generatedAt).getTime();
      if (ageMs < CACHE_TTL_MS) {
        return { statusCode: 200, headers: H, body: JSON.stringify({
          reportHtml: cached.reportHtml,
          generatedAt: cached.generatedAt,
          provider: cached.provider,
          fromCache: true,
          locked: true,
          cacheAgeMs: ageMs,
          expiresAt: new Date(new Date(cached.generatedAt).getTime() + CACHE_TTL_MS).toISOString()
        }) };
      }
    }

    try {
      const g = await callGeminiWithFallback(news);
      const entry = { reportHtml: g.html, generatedAt: new Date().toISOString(), provider: g.provider };
      await writeCache(store, entry);
      return { statusCode: 200, headers: H, body: JSON.stringify({ ...entry, attempts: g.attempts, fromCache: false }) };
    } catch (ge) {
      const stale = await readCache(store);
      if (stale) {
        return { statusCode: 200, headers: H, body: JSON.stringify({
          reportHtml: stale.reportHtml,
          generatedAt: stale.generatedAt,
          provider: stale.provider,
          fromCache: true,
          stale: true,
          cacheAgeMs: Date.now() - new Date(stale.generatedAt).getTime(),
          debug: `Yeni rapor üretilemedi, eski cache servis edildi. ${ge.message}`
        }) };
      }
      return { statusCode: 200, headers: H, body: JSON.stringify({ reportHtml: fallbackReport(news, ge.message), generatedAt: new Date().toISOString(), provider: 'fallback', debug: ge.message }) };
    }
  } catch (e) {
    return { statusCode: 500, headers: H, body: JSON.stringify({ error: e.message }) };
  }
};
