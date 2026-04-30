const https = require('https');

function fetchURL(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 15000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) return fetchURL(res.headers.location).then(resolve).catch(reject);
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function parseItems(xml, region, kind, maxItems) {
  const out = []; let m;
  const re = /<item>([\s\S]*?)<\/item>/g;
  while ((m = re.exec(xml)) !== null && out.length < maxItems) {
    const b = m[1];
    const title = ((b.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '').replace(/<!\[CDATA\[|\]\]>/g, '').trim();
    const link = ((b.match(/<link>([\s\S]*?)<\/link>/) || [])[1] || '').trim();
    const pubDate = ((b.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1] || '').trim();
    const source = ((b.match(/<source[^>]*>([\s\S]*?)<\/source>/) || [])[1] || '').replace(/<!\[CDATA\[|\]\]>/g, '').trim();
    const sourceUrl = ((b.match(/<source[^>]*url="([^"]*)"/) || [])[1] || '').trim();
    if (!title || !link) continue;
    const host = sourceUrl ? new URL(sourceUrl).hostname.replace('www.', '') : '';
    out.push({ title, link, pubDate, source, sourceUrl, region, kind, image: host ? `https://www.google.com/s2/favicons?domain=${host}&sz=128` : '' });
  }
  return out;
}

function analyzeThemes(items) {
  const text = items.map(i => (i.title || '').toLowerCase()).join(' | ');
  const buckets = [
    { id:'siber', re:/siber|cyber|ransomware|hack|phishing|ihlal/, name:'Siber Güvenlik', action:'SOC alarm eşikleri ve olay müdahale runbookları güncellenmeli.' },
    { id:'tedarik', re:/tedarik|lojistik|liman|nakliye|supply chain|rota/, name:'Tedarik Zinciri', action:'Kritik tedarikçiler için alternatif rota/ikame planı aktive edilmeli.' },
    { id:'uyum', re:/regülasyon|compliance|ceza|denetim|uyum/, name:'Uyum & Regülasyon', action:'İç kontrol testleri sıklaştırılmalı, açık bulgular için aksiyon tarihi atanmalı.' },
    { id:'sureklilik', re:/iş sürekliliği|business continuity|kesinti|downtime|felaket/, name:'İş Sürekliliği', action:'RTO/RPO hedefleri doğrulanmalı, kriz iletişim zinciri test edilmeli.' },
    { id:'isgucu', re:/grev|işçi|sendika|labor|strike/, name:'İşgücü Sürekliliği', action:'Vardiya yedekleme ve outsource kapasite planı devreye alınmalı.' },
    { id:'afet', re:/deprem|sel|yangın|iklim|fırtına|storm/, name:'Afet & İklim', action:'Saha bazlı BCP ve tahliye protokolleri tekrar teyit edilmeli.' }
  ];

  return buckets.map((b) => {
    const count = (text.match(new RegExp(b.re.source, 'g')) || []).length;
    return { ...b, count };
  }).sort((a, b) => b.count - a.count);
}

function buildAiCommentary(items) {
  const themes = analyzeThemes(items);
  const top = themes.slice(0, 3).filter(t => t.count > 0);
  const tr = items.filter(i => i.region === 'Türkiye').length;
  const gl = items.filter(i => i.region === 'Global').length;

  const summary = top.length
    ? top.map(t => `• ${t.name}: ${t.count} sinyal — ${t.action}`).join('\n')
    : '• Haber akışı dağınık; çoklu-risk matrisi ile önceliklendirme önerilir.';

  return `Operasyonel Risk Derin Analiz\n\nTarama kapsamı: Türkiye ${tr} başlık, Global ${gl} başlık.\n\nKritik temalar:\n${summary}\n\nStratejik öneri:\n1) İlk 24 saatte kritik süreç sahipleriyle risk komitesi mini-oturumu.\n2) İlk 72 saatte tedarik/siber/uyum üçlüsü için düzeltici aksiyon listesi.\n3) Haftalık olarak erken uyarı göstergeleri (KRI) dashboard'una işlenmesi.`;
}

exports.handler = async function () {
  const maxPerFeed = 60;
  const feeds = [
    { q:'operasyonel risk OR iş sürekliliği OR siber risk Türkiye', region:'Türkiye', kind:'Haber', hl:'tr', gl:'TR', ceid:'TR:tr' },
    { q:'operational risk OR business continuity OR cyber risk', region:'Global', kind:'Haber', hl:'en', gl:'US', ceid:'US:en' },
    { q:'operational risk analysis OR framework OR case study', region:'Global', kind:'Makale', hl:'en', gl:'US', ceid:'US:en' }
  ];

  try {
    let all = [];
    for (const f of feeds) {
      const xml = await fetchURL(`https://news.google.com/rss/search?q=${encodeURIComponent(f.q)}&hl=${f.hl}&gl=${f.gl}&ceid=${f.ceid}`);
      all = all.concat(parseItems(xml, f.region, f.kind, maxPerFeed));
    }

    const uniq = []; const seen = new Set();
    for (const n of all) { const k = n.title.toLowerCase(); if (seen.has(k)) continue; seen.add(k); uniq.push(n); }
    uniq.sort((a,b)=>new Date(b.pubDate||0)-new Date(a.pubDate||0));

    const news = uniq.slice(0,120);

    return { statusCode:200, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Cache-Control':'public, max-age=600'}, body: JSON.stringify({generatedAt:new Date().toISOString(),news,aiCommentary:buildAiCommentary(news),themes:analyzeThemes(news)}) };
  } catch (e) {
    return { statusCode:500, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}, body: JSON.stringify({error:e.message,generatedAt:new Date().toISOString(),news:[],aiCommentary:'Veri çekiminde hata oluştu.',themes:[]}) };
  }
};
