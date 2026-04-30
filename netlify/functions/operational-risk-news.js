const https = require('https');
const http = require('http');

function fetchURL(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 12000
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchURL(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function parseItems(xml, region) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null && items.length < 20) {
    const block = match[1];
    const title = ((block.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '').replace(/<!\[CDATA\[|\]\]>/g, '').trim();
    const link = ((block.match(/<link>([\s\S]*?)<\/link>/) || [])[1] || '').trim();
    const pubDate = ((block.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1] || '').trim();
    const source = ((block.match(/<source[^>]*>([\s\S]*?)<\/source>/) || [])[1] || '').replace(/<!\[CDATA\[|\]\]>/g, '').trim();
    const sourceUrl = ((block.match(/<source[^>]*url="([^"]*)"/) || [])[1] || '').trim();

    if (!title || !link) continue;
    const host = sourceUrl ? new URL(sourceUrl).hostname.replace('www.', '') : '';
    const image = host ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128` : '';

    items.push({ title, link, pubDate, source, sourceUrl, region, image });
  }

  return items;
}

function buildAiCommentary(items) {
  if (!items.length) return 'Bugün operasyonel risk başlıklarında veri bulunamadı.';

  const text = items.map((x) => x.title.toLowerCase()).join(' | ');
  const tags = [];

  if (/(siber|cyber|ransomware|hack|ihlal)/.test(text)) tags.push('Siber güvenlik ve veri ihlali riskleri öne çıkıyor.');
  if (/(lojistik|tedarik|nakliye|liman|supply chain)/.test(text)) tags.push('Tedarik zinciri ve lojistik kırılganlıkları artıyor.');
  if (/(deprem|sel|yangın|iklim|weather|storm)/.test(text)) tags.push('Doğal afet ve iklim kaynaklı operasyon kesintisi riski mevcut.');
  if (/(regülasyon|ceza|uyum|compliance|denetim)/.test(text)) tags.push('Uyum, regülasyon ve denetim kaynaklı risk gündemde.');
  if (/(işçi|grev|sendika|labor|strike)/.test(text)) tags.push('İşgücü ve üretim sürekliliği riskleri izlenmeli.');

  const now = new Date().toISOString().slice(0, 10);
  return [
    `AI Operasyonel Risk Yorumu (${now})`,
    '',
    `Toplam ${items.length} haber içinde dünya ve Türkiye akışında en çok tekrar eden temalar analiz edildi.`,
    ...(tags.length ? tags : ['Başlıklar dağınık; tek bir risk teması baskın değil.']),
    '',
    'Aksiyon önerisi: Kritik tedarikçiler, siber olay müdahale planı ve iş sürekliliği senaryoları günlük olarak güncellenmeli.'
  ].join('\n');
}

exports.handler = async function () {
  const queries = [
    { q: 'operational risk OR business continuity OR cyber risk', region: 'Dünya', hl: 'en', gl: 'US', ceid: 'US:en' },
    { q: 'operasyonel risk OR iş sürekliliği OR siber risk Türkiye', region: 'Türkiye', hl: 'tr', gl: 'TR', ceid: 'TR:tr' }
  ];

  try {
    const all = [];
    for (const it of queries) {
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(it.q)}&hl=${it.hl}&gl=${it.gl}&ceid=${it.ceid}`;
      const xml = await fetchURL(url);
      all.push(...parseItems(xml, it.region));
    }

    const unique = [];
    const seen = new Set();
    for (const item of all) {
      const key = item.title.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(item);
    }

    unique.sort((a, b) => new Date(b.pubDate || 0) - new Date(a.pubDate || 0));
    const news = unique.slice(0, 24);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=900'
      },
      body: JSON.stringify({ generatedAt: new Date().toISOString(), news, aiCommentary: buildAiCommentary(news) })
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: e.message, generatedAt: new Date().toISOString(), news: [] })
    };
  }
};
