require('./env').loadEnv();
const https = require('https');

function headers() {
  return {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=900'
  };
}

function todayTR() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date());
}

function strip(v) {
  return String(v || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ').trim();
}

function cleanTitle(v) {
  return strip(v).replace(/\s+[-–—]\s+[^-–—|:]{2,90}$/u, '').replace(/\s+\|\s+[^|]{2,90}$/u, '').trim();
}

function fetchText(url, timeoutMs = 4200) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 PiyasaMonitoru/1.0' }, timeout: timeoutMs }, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', c => { body += c; });
      res.on('end', () => resolve(body));
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });
}

function rssUrl(query) {
  return 'https://news.google.com/rss/search?q=' + encodeURIComponent(query + ' when:2d') + '&hl=tr&gl=TR&ceid=TR:tr';
}

function parseRss(xml) {
  const items = [];
  const blocks = String(xml || '').match(/<item>[\s\S]*?<\/item>/g) || [];
  for (const block of blocks.slice(0, 10)) {
    const rawTitle = (block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) || block.match(/<title>([\s\S]*?)<\/title>/) || [])[1];
    const rawLink = (block.match(/<link>([\s\S]*?)<\/link>/) || [])[1];
    const rawDate = (block.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1];
    const title = cleanTitle(rawTitle);
    if (title) items.push({ title, baslik: title, link: strip(rawLink), tarih: rawDate ? new Date(strip(rawDate)).toISOString() : todayTR(), etki: 'Türkiye varlıkları, faiz patikası, kur, CDS ve risk iştahı açısından izleniyor.' });
  }
  return items;
}

async function fetchNews() {
  if (process.env.NODE_ENV === 'test') return [];
  const queries = ['Türkiye ekonomi enflasyon TCMB faiz kur CDS tahvil', 'Turkey economy inflation central bank lira bonds CDS', 'BIST banka tahvil faiz Türkiye piyasa'];
  const out = [];
  for (const q of queries) {
    try { out.push(...parseRss(await fetchText(rssUrl(q)))); } catch (_) {}
  }
  const seen = new Set();
  return out.filter(n => { const key = n.title.toLocaleLowerCase('tr'); if (seen.has(key)) return false; seen.add(key); return true; }).slice(0, 10);
}

function toNumber(value, fallback) {
  const n = Number(String(value ?? '').replace(',', '.').replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : fallback;
}
function pct(n, digits = 2) { return '%' + Number(n).toFixed(digits).replace('.', ','); }
function bps(n) { return Math.round(Number(n)) + ' bps'; }
function levelFromScore(score) { return score >= 75 ? 'bad' : score >= 60 ? 'warn' : score >= 42 ? 'neutral' : 'ok'; }
function regimeFromScore(score) { return score >= 75 ? 'Yüksek Risk' : score >= 60 ? 'Orta-Yüksek Risk' : score >= 42 ? 'Orta Risk' : 'Düşük-Orta Risk'; }

function sentimentFromNews(news) {
  const badWords = ['risk','gerilim','baskı','kayıp','enflasyon','savaş','yaptırım','kriz','sert','zayıf','arttı','yükseldi'];
  const goodWords = ['toparlanma','iyileşme','geriledi','giriş','pozitif','rahatlama','güçlü','artış'];
  let score = 0;
  const tags = new Set();
  for (const n of news) {
    const t = String(n.title || n.baslik || '').toLocaleLowerCase('tr');
    if (/tcmb|faiz|merkez bankası/.test(t)) tags.add('TCMB');
    if (/enflasyon|tüfe/.test(t)) tags.add('Enflasyon');
    if (/kur|dolar|tl|lira/.test(t)) tags.add('Kur');
    if (/cds|tahvil|eurobond|faiz/.test(t)) tags.add('Tahvil/CDS');
    if (/bist|borsa|banka/.test(t)) tags.add('BIST/Bankacılık');
    if (/savaş|jeopolitik|iran|israil|risk/.test(t)) tags.add('Jeopolitik');
    badWords.forEach(w => { if (t.includes(w)) score -= 1; });
    goodWords.forEach(w => { if (t.includes(w)) score += 1; });
  }
  let label = 'Nötr', level = 'neutral';
  if (score <= -3) { label = 'Negatif'; level = 'bad'; }
  else if (score < 0) { label = 'Hafif Negatif'; level = 'warn'; }
  else if (score >= 3) { label = 'Pozitif'; level = 'ok'; }
  else if (score > 0) { label = 'Hafif Pozitif'; level = 'neutral'; }
  const tagList = Array.from(tags).slice(0, 6);
  return { score, label, level, tags: tagList, summary: `Haber akışında ${tagList.slice(0, 3).join(', ') || 'makro/piyasa'} başlıkları öne çıkıyor.` };
}

function buildHistory(current, fallback, step) {
  const base = Number.isFinite(current) ? current : fallback;
  return Array.from({ length: 10 }, (_, i) => +(base + Math.sin(i * 1.2) * step + (i - 5) * step * 0.12).toFixed(2));
}

function buildData(news) {
  const updatedAt = todayTR();
  const policyRate = toNumber(process.env.TR_POLICY_RATE, 37);
  const inflation = toNumber(process.env.TR_INFLATION_YOY, 32.84);
  const y2 = toNumber(process.env.TR_2Y_YIELD, 39.5);
  const y5 = toNumber(process.env.TR_5Y_YIELD, 34.8);
  const y10 = toNumber(process.env.TR_10Y_YIELD, 30.2);
  const cds5y = toNumber(process.env.TR_CDS_5Y, 260);
  const usdtry = toNumber(process.env.TR_USDTRY, 39.1);
  const bist = toNumber(process.env.TR_BIST100, 10500);
  const brent = toNumber(process.env.TR_BRENT, 82);
  const spread2y10 = +(y10 - y2).toFixed(2);
  const sentiment = sentimentFromNews(news);
  let riskScoreValue = 42 + Math.min(28, Math.max(0, (cds5y - 180) / 8)) + Math.min(18, Math.max(0, (y10 - 22) * 0.8)) + Math.min(16, Math.max(0, (inflation - 20) * 0.45)) - Math.min(10, Math.max(0, (policyRate - inflation) * 0.35)) + 6;
  if (sentiment.level === 'bad') riskScoreValue += 6;
  if (sentiment.level === 'warn') riskScoreValue += 3;
  riskScoreValue = Math.round(Math.max(0, Math.min(100, riskScoreValue)));
  const riskScore = { score: riskScoreValue, regime: regimeFromScore(riskScoreValue), level: levelFromScore(riskScoreValue), drivers: ['CDS', '10Y Tahvil', 'Enflasyon', 'Haber Akışı'] };
  const sourceStatus = [
    { name: 'Netlify env: TR_CDS_5Y', status: process.env.TR_CDS_5Y ? 'ok' : 'fallback', note: process.env.TR_CDS_5Y ? 'CDS dış veriyle beslendi' : 'CDS fallback kullanıyor' },
    { name: 'Netlify env: TR_10Y_YIELD', status: process.env.TR_10Y_YIELD ? 'ok' : 'fallback', note: process.env.TR_10Y_YIELD ? '10Y tahvil dış veriyle beslendi' : '10Y tahvil fallback kullanıyor' },
    { name: 'Google News RSS', status: news.length ? 'ok' : 'fallback', note: news.length ? `${news.length} başlık alındı` : 'haber fallback kullanıldı' },
    { name: 'Site model fallback', status: 'ok', note: 'Sayfa boş kalmasın diye yedek makro veri aktif' }
  ];
  return {
    updatedAt,
    generatedAt: new Date().toISOString(),
    source: 'env + google-news + fallback',
    sourceStatus,
    kpis: [
      { label: 'TCMB Politika Faizi', value: pct(policyRate), raw: policyRate, note: 'TR_POLICY_RATE env değeriyle güncellenebilir', icon: '🏦', source: process.env.TR_POLICY_RATE ? 'ENV' : 'Fallback' },
      { label: 'TÜFE Yıllık', value: pct(inflation), raw: inflation, note: 'TR_INFLATION_YOY env değeriyle güncellenebilir', icon: '🧾', source: process.env.TR_INFLATION_YOY ? 'ENV' : 'Fallback' },
      { label: 'Türkiye 5Y CDS', value: bps(cds5y), raw: cds5y, note: process.env.TR_CDS_5Y ? 'Netlify env üzerinden otomatik beslendi' : 'Fallback seviye; TR_CDS_5Y eklenirse otomatikleşir', icon: '🛡️', source: process.env.TR_CDS_5Y ? 'ENV' : 'Fallback' },
      { label: '10Y Tahvil', value: pct(y10), raw: y10, note: process.env.TR_10Y_YIELD ? 'Netlify env üzerinden otomatik beslendi' : 'Fallback seviye; TR_10Y_YIELD eklenirse otomatikleşir', icon: '📜', source: process.env.TR_10Y_YIELD ? 'ENV' : 'Fallback' }
    ],
    marketStrip: [
      { label: 'Risk Skoru', value: `${riskScore.score}/100`, note: riskScore.regime },
      { label: '2Y-10Y Spread', value: `${spread2y10 > 0 ? '+' : ''}${spread2y10.toFixed(2)} puan`, note: spread2y10 < 0 ? 'Ters/yatay eğri baskısı' : 'Pozitif eğri' },
      { label: 'Haber Tonu', value: sentiment.label, note: sentiment.summary },
      { label: 'CDS Rejimi', value: cds5y > 300 ? 'Stres' : cds5y > 250 ? 'İzleme' : 'Rahatlama', note: `${bps(cds5y)} seviyesi` }
    ],
    riskScore,
    sentiment,
    macroBrief: [
      `Türkiye görünümünde ana çerçeve sıkı para politikası, dezenflasyon patikası, rezerv birikimi ve TL’ye güven dengesidir. Risk skoru ${riskScore.score}/100 ile ${riskScore.regime} bölgesinde çalışıyor.`,
      `10Y tahvil ${pct(y10)}, 5Y CDS ${bps(cds5y)} ve 2Y-10Y spread ${spread2y10 > 0 ? '+' : ''}${spread2y10.toFixed(2)} puan seviyesinde izleniyor. Eğri kısa vadede sıkı duruşu, uzun vadede risk primi ve enflasyon beklentisini fiyatlıyor.`,
      news.length ? `Otomatik haber akışında öne çıkan başlık: ${news[0].title}` : 'Haber kaynağına erişim olmazsa ekran yedek makro senaryo ile çalışmaya devam eder.'
    ],
    bonds: [
      { vade: '2Y Gösterge', getiri: pct(y2), numeric: y2, degisim: 'Yüksek', durum: 'Kısa vadede politika faizi, likidite koşulları ve enflasyon beklentisi belirleyici.', risk: 'warn' },
      { vade: '5Y Gösterge', getiri: pct(y5), numeric: y5, degisim: 'Hassas', durum: 'Orta vadede dezenflasyon güveni, yabancı talebi ve risk primi birlikte fiyatlanıyor.', risk: 'neutral' },
      { vade: '10Y Gösterge', getiri: pct(y10), numeric: y10, degisim: process.env.TR_10Y_YIELD ? 'Otomatik' : 'Fallback', durum: 'Uzun vadede mali disiplin, rezerv kalitesi ve küresel faizler ana değişkenler.', risk: y10 > 32 ? 'bad' : 'warn' }
    ],
    spreads: [
      { metrik: '2Y - 10Y Spread', deger: `${spread2y10 > 0 ? '+' : ''}${spread2y10.toFixed(2)} puan`, yorum: spread2y10 < 0 ? 'Kısa vadeli faizlerin uzun vadeyi aşması sıkı para politikası ve büyüme baskısı sinyali verir.' : 'Pozitif spread normalleşme sinyali üretir; ancak seviye hâlâ yüksek faiz ortamını gösterir.', seviye: spread2y10 < 0 ? 'warn' : 'neutral' },
      { metrik: 'CDS Bandı', deger: cds5y > 300 ? 'Stres' : cds5y > 250 ? 'İzleme' : 'Rahatlama', yorum: 'CDS bandı eurobond spreadleri, bankacılık dış finansmanı ve yabancı iştahı açısından izlenir.', seviye: cds5y > 300 ? 'bad' : cds5y > 250 ? 'warn' : 'neutral' }
    ],
    stressMap: [
      { name: 'Para Politikası', score: 68, level: 'warn', note: `Politika faizi ${pct(policyRate)}; reel faiz algısı kritik.` },
      { name: 'Enflasyon', score: inflation > 30 ? 78 : 62, level: inflation > 30 ? 'bad' : 'warn', note: `Yıllık TÜFE ${pct(inflation)}; hizmet/çekirdek katılık önemli.` },
      { name: 'Kur', score: 66, level: 'warn', note: `USDTRY ${usdtry.toFixed(2).replace('.', ',')}; sermaye akımı ve rezerv görünümü izlenmeli.` },
      { name: 'Tahvil', score: y10 > 32 ? 76 : 60, level: y10 > 32 ? 'bad' : 'warn', note: `10Y ${pct(y10)}; eğri ve yabancı talebi takip edilmeli.` },
      { name: 'CDS', score: cds5y > 300 ? 82 : cds5y > 250 ? 68 : 54, level: cds5y > 300 ? 'bad' : cds5y > 250 ? 'warn' : 'neutral', note: `5Y CDS ${bps(cds5y)}; eurobond spreadleri için ana gösterge.` },
      { name: 'Jeopolitik', score: sentiment.tags.includes('Jeopolitik') ? 78 : 64, level: sentiment.tags.includes('Jeopolitik') ? 'bad' : 'warn', note: 'Bölgesel riskler enerji, cari denge ve risk primi üzerinden etkili.' },
      { name: 'Bankacılık', score: 58, level: 'neutral', note: 'Marj, aktif kalitesi ve kredi büyümesi ayrışması izlenmeli.' }
    ],
    risk: [
      { metrik: 'Kredi Notu', deger: 'BB- / BB- / Ba3', yorum: 'Yatırım yapılabilir seviyenin altında; dış finansman maliyeti ve eurobond spreadleri açısından kritik.', seviye: 'warn' },
      { metrik: 'Rezerv Eğilimi', deger: 'Kırılgan toparlanma', yorum: 'Brüt rezervden çok net rezerv ve swap hariç görünüm TL güveni açısından belirleyici.', seviye: 'neutral' },
      { metrik: 'Kur Oynaklığı', deger: 'Orta-Yüksek', yorum: 'TL; faiz beklentisi, sermaye akımı, enerji fiyatları ve iç haber akışına duyarlı.', seviye: 'warn' },
      { metrik: 'Jeopolitik / Politik Baskı', deger: 'Yüksek', yorum: 'Bölgesel gerilimler petrol, CDS, BIST ve tahvil kanalıyla hızlı fiyatlanabilir.', seviye: 'bad' }
    ],
    credit: [
      { metrik: 'Kredi Büyümesi', deger: 'Seçici', yorum: 'Sıkı finansal koşullar kredi genişlemesini sınırlarken ticari ve tüketici kredi ayrışması izlenmeli.', seviye: 'neutral' },
      { metrik: 'Bankacılık Marjı', deger: 'Baskılı', yorum: 'Mevduat maliyeti, regülasyonlar ve kredi fiyatlaması net faiz marjı üzerinde belirleyici.', seviye: 'warn' },
      { metrik: 'Aktif Kalitesi', deger: 'İzlemede', yorum: 'Reel sektör nakit akışı, gecikme oranları ve yapılandırma eğilimi takip edilmeli.', seviye: 'warn' },
      { metrik: 'Mevduat Kompozisyonu', deger: 'TL lehine hassas', yorum: 'TL mevduat payı ve kur korumalı ürünlerden çıkışın hızı önemini koruyor.', seviye: 'neutral' }
    ],
    watch: [
      { metrik: 'Enflasyon Sürprizi', deger: 'Çekirdek / hizmet', yorum: 'Hizmet enflasyonu katı kalırsa faiz indirimi beklentisi ötelenir.', seviye: 'bad' },
      { metrik: 'Rezerv & Swap', deger: 'Net pozisyon', yorum: 'Rezerv kalitesindeki iyileşme risk priminin düşmesi için ana koşullardan biridir.', seviye: 'warn' },
      { metrik: 'CDS Eşiği', deger: '250-300 bps bandı', yorum: 'Bandın yukarı kırılması eurobond ve TL tahvil fiyatlamasını bozabilir.', seviye: 'warn' },
      { metrik: 'Küresel Dolar', deger: 'DXY / ABD 10Y', yorum: 'ABD faizleri ve dolar endeksi GOÜ risk iştahını belirler.', seviye: 'neutral' }
    ],
    todayWatch: ['TCMB iletişimi ve faiz indirimi beklentileri', 'Çekirdek/hizmet enflasyonu sinyalleri', 'CDS 250-300 bps bandındaki kalıcılık', '10Y tahvil ve 2Y-10Y spread yönü', 'USDTRY oynaklığı ve rezerv haberleri', 'ABD 10Y, DXY ve petrol fiyatları'],
    miniHistory: { cds5y: buildHistory(cds5y, 260, 4.8), y10: buildHistory(y10, 30.2, 0.35), riskScore: buildHistory(riskScore.score, 65, 2.1), bist100: buildHistory(bist, 10500, 110), brent: buildHistory(brent, 82, 1.2) },
    news: news.length ? news : [{ tarih: updatedAt, baslik: 'Türkiye piyasalarında enflasyon, faiz patikası ve rezerv görünümü izleniyor', etki: 'Veri akışı tahvil faizi, CDS ve TL fiyatlaması üzerinde belirleyici olmaya devam ediyor.' }]
  };
}

exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: headers(), body: '' };
  try {
    const news = await fetchNews();
    return { statusCode: 200, headers: headers(), body: JSON.stringify(buildData(news)) };
  } catch (error) {
    return { statusCode: 200, headers: headers(), body: JSON.stringify(buildData([])) };
  }
};
