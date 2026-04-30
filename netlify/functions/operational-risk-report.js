const https = require('https');

function postJson(url, headers, payload, timeout = 25000) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method: 'POST', headers, timeout }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) return reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 300)}`));
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('request timeout')); });
    req.write(JSON.stringify(payload));
    req.end();
  });
}

async function callGemini(news) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY missing');
  const model = process.env.GEMINI_MODEL || 'gemini-1.5-pro';
  const prompt = [
    'Aşağıdaki operasyonel risk haberlerini analiz et.',
    'Sadece Türkçe ve yönetici seviyesi detaylı rapor üret.',
    'HTML formatı kullan (h1,h2,p,ul,ol). Haber listesi dökme, analiz et.',
    'Bölümler: Yönetici Özeti, Kritik Temalar, Türkiye-Global Etki, 24/72 saat aksiyon, 7 günlük izleme.',
    JSON.stringify(news)
  ].join('\n');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 2000 }
  };
  const r = await postJson(url, { 'Content-Type': 'application/json' }, payload);
  const text = r?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('\n').trim();
  if (!text) throw new Error('Gemini empty response');
  return { html: text, provider: `gemini:${model}` };
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

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  const H = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
  try {
    const body = JSON.parse(event.body || '{}');
    const news = Array.isArray(body.news) ? body.news.slice(0, 120) : [];
    if (!news.length) return { statusCode: 400, headers: H, body: JSON.stringify({ error: 'news gerekli' }) };

    try {
      const g = await callGemini(news);
      return { statusCode: 200, headers: H, body: JSON.stringify({ reportHtml: g.html, generatedAt: new Date().toISOString(), provider: g.provider }) };
    } catch (ge) {
      return { statusCode: 200, headers: H, body: JSON.stringify({ reportHtml: fallbackReport(news, ge.message), generatedAt: new Date().toISOString(), provider: 'fallback' }) };
    }
  } catch (e) {
    return { statusCode: 500, headers: H, body: JSON.stringify({ error: e.message }) };
  }
};
