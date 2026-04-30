const https = require('https');

function fetchURL(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 12000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) return fetchURL(res.headers.location).then(resolve).catch(reject);
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function parseItems(xml, region, kind) {
  const out = []; let m;
  const re = /<item>([\s\S]*?)<\/item>/g;
  while ((m = re.exec(xml)) !== null && out.length < 24) {
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

function buildAiCommentary(items) {
  const t = items.map(i => i.title.toLowerCase()).join(' | ');
  const bullets = [];
  const add=(k,msg)=>{ if(k.test(t)) bullets.push(msg); };
  add(/siber|ransomware|hack|ihlal|phishing/,'• Siber operasyonel risklerde artış sinyali var; SOC/olay müdahale SLA’leri gözden geçirilmeli.');
  add(/tedarik|lojistik|liman|nakliye|supply chain/,'• Tedarik zinciri kırılganlığı öne çıkıyor; alternatif tedarikçi ve güvenlik stoğu planları güncellenmeli.');
  add(/regülasyon|compliance|denetim|ceza|uyum/,'• Uyum ve regülasyon tarafında denetim baskısı artabilir; iç kontrol testleri sıklaştırılmalı.');
  add(/deprem|sel|yangın|iklim|fırtına|storm/,'• Doğal afet kaynaklı kesinti riski için iş sürekliliği ve DR tatbikatları önceliklendirilmeli.');
  add(/grev|işçi|sendika|labor|strike/,'• İşgücü sürekliliği riski öne çıkıyor; vardiya/outsource yedekleme senaryoları hazırlanmalı.');
  if (!bullets.length) bullets.push('• Bugün haber akışı çok dağılıyor; çapraz-risk matrisiyle birleştirilmiş değerlendirme önerilir.');
  return `AI Operasyonel Risk Değerlendirmesi\n\nÖzet: Türkiye öncelikli ve global akış birlikte tarandı. Haber yoğunluğu; siber, tedarik, uyum ve süreklilik risklerine odaklanıyor.\n\n${bullets.join('\n')}\n\nAksiyon Planı (24 saat):\n1) Kritik tedarikçi / kritik sistem listesi doğrulansın.\n2) Olası kesinti senaryoları için sorumlu ekipler ve iletişim zinciri teyit edilsin.\n3) Yönetim için kısa risk bülteni (etki/olasılık/aksiyon) yayınlansın.`;
}

exports.handler = async function () {
  const feeds = [
    { q:'operasyonel risk OR iş sürekliliği OR siber risk Türkiye', region:'Türkiye', kind:'Haber', hl:'tr', gl:'TR', ceid:'TR:tr' },
    { q:'operational risk OR business continuity OR cyber risk', region:'Global', kind:'Haber', hl:'en', gl:'US', ceid:'US:en' },
    { q:'operational risk analysis OR framework OR case study', region:'Global', kind:'Makale', hl:'en', gl:'US', ceid:'US:en' }
  ];
  try {
    let all=[];
    for (const f of feeds){
      const xml = await fetchURL(`https://news.google.com/rss/search?q=${encodeURIComponent(f.q)}&hl=${f.hl}&gl=${f.gl}&ceid=${f.ceid}`);
      all = all.concat(parseItems(xml, f.region, f.kind));
    }
    const uniq=[]; const seen=new Set();
    for (const n of all){ const k=n.title.toLowerCase(); if(seen.has(k)) continue; seen.add(k); uniq.push(n); }
    uniq.sort((a,b)=> new Date(b.pubDate||0)-new Date(a.pubDate||0));
    const tr = uniq.filter(x=>x.region==='Türkiye').slice(0,14);
    const gl = uniq.filter(x=>x.region==='Global' && x.kind==='Haber').slice(0,7);
    const art = uniq.filter(x=>x.kind==='Makale').slice(0,5);
    const news = tr.concat(gl).concat(art).slice(0,24);
    return { statusCode:200, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Cache-Control':'public, max-age=900'}, body: JSON.stringify({generatedAt:new Date().toISOString(),news,aiCommentary:buildAiCommentary(news)}) };
  } catch (e) {
    return { statusCode:500, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}, body: JSON.stringify({error:e.message,generatedAt:new Date().toISOString(),news:[],aiCommentary:'Veri çekimi sırasında hata oluştu.'}) };
  }
};
