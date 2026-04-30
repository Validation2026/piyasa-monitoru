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

async function callOpenAI(news) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY missing');
  const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
  const prompt = [
    'Aşağıdaki operasyonel risk haberlerini incele.',
    'Sadece Türkçe, yönetici seviyesi, detaylı ama karar odaklı rapor üret.',
    'Çıktı HTML olsun (h1,h2,p,ul,ol). Haber listesi dökme, analiz et.',
    'Bölümler: Yönetici Özeti, Kritik Risk Temaları, Türkiye vs Global Etki, 24/72 saat aksiyon, 7 günlük izleme planı.',
    JSON.stringify(news)
  ].join('\n');
  const r = await postJson('https://api.openai.com/v1/responses', {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${key}`
  }, { model, input: prompt });
  const text = (r.output_text || '').trim();
  if (!text) throw new Error('OpenAI empty response');
  return { html: text, provider: `openai:${model}` };
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  try {
    const body = JSON.parse(event.body || '{}');
    const news = Array.isArray(body.news) ? body.news.slice(0, 120) : [];
    if (!news.length) return { statusCode: 400, headers: {'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}, body: JSON.stringify({ error: 'news gerekli' }) };

    let reportHtml = '';
    let provider = 'fallback';
    let debug = '';

    try {
      const g = await callGemini(news);
      reportHtml = g.html;
      provider = g.provider;
    } catch (ge) {
      debug = `gemini_fail: ${ge.message}`;
      try {
        const o = await callOpenAI(news);
        reportHtml = o.html;
        provider = o.provider;
      } catch (oe) {
        debug += ` | openai_fail: ${oe.message}`;
      }
    }

    if (!reportHtml) {
      reportHtml = `<h1>Operasyonel Risk Günlük Değerlendirme</h1><p>AI servisleri şu an yanıt veremedi; yedek rapor üretildi.</p><p><b>Debug:</b> ${debug || 'yok'}</p><h2>Yönetici Özeti</h2><p>Toplam ${news.length} başlık analiz edildi.</p><h2>Aksiyonlar</h2><ol><li>24 saat: kritik süreç senkronizasyonu.</li><li>72 saat: düzeltici aksiyon planı.</li><li>7 gün: KRI dashboard güncellemesi.</li></ol>`;
    }

    return { statusCode: 200, headers: {'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}, body: JSON.stringify({ reportHtml, generatedAt: new Date().toISOString(), provider }) };
  } catch (e) {
    return { statusCode: 500, headers: {'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}, body: JSON.stringify({ error: e.message }) };
  }
};
