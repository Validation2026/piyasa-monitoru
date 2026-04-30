const https = require('https');

function callOpenAI(apiKey, payload) {
  return new Promise((resolve, reject) => {
    const req = https.request('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      timeout: 25000
    }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) return reject(new Error(`OpenAI ${res.statusCode}: ${data.slice(0, 300)}`));
        resolve(JSON.parse(data));
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('openai timeout')); });
    req.write(JSON.stringify(payload));
    req.end();
  });
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  try {
    const body = JSON.parse(event.body || '{}');
    const news = Array.isArray(body.news) ? body.news.slice(0, 120) : [];
    if (!news.length) return { statusCode: 400, headers: {'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}, body: JSON.stringify({error:'news gerekli'}) };

    const prompt = [
      'Aşağıdaki operasyonel risk haberlerini incele.',
      'Sadece Türkçe, yönetici seviyesi, çok detaylı ama karar odaklı bir rapor üret.',
      'Çıktı HTML olsun (h1,h2,p,ul,ol kullan). Ham haber listesi dökme, analiz et.',
      'Bölümler: Yönetici Özeti, Kritik Risk Temaları, Türkiye vs Global Etki, 24/72 saat aksiyon, 7 günlük izleme planı.',
      'Haberler JSON:',
      JSON.stringify(news)
    ].join('\n');

    let reportHtml = '';
    const key = process.env.OPENAI_API_KEY;
    if (key) {
      const r = await callOpenAI(key, {
        model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
        input: prompt
      });
      reportHtml = (r.output_text || '').trim();
    }

    if (!reportHtml) {
      reportHtml = `<h1>Operasyonel Risk Günlük Değerlendirme</h1><p>AI servisi kullanılamadı; yedek rapor üretildi.</p><h2>Yönetici Özeti</h2><p>Toplam ${news.length} başlık analiz edildi. Türkiye ve global akış birlikte operasyonel etki açısından değerlendirildi.</p><h2>Aksiyonlar</h2><ol><li>24 saat: Kritik süreç sahipleriyle hızlı risk senkronizasyonu.</li><li>72 saat: Düzeltici aksiyon planı.</li><li>7 gün: KRI izleme dashboard güncellemesi.</li></ol>`;
    }

    return { statusCode: 200, headers: {'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}, body: JSON.stringify({ reportHtml, generatedAt: new Date().toISOString(), ai: !!key, message: key ? 'AI raporu üretildi veya fallback kullanıldı.' : 'OPENAI_API_KEY eksik; fallback içerik döndü.' }) };
  } catch (e) {
    return { statusCode: 500, headers: {'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}, body: JSON.stringify({ error: e.message }) };
  }
};
