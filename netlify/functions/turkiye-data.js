require('./env').loadEnv();
const https = require('https');

const YAHOO_SYMBOLS = {
  usdtry: { symbol: 'USDTRY=X', label: 'USD/TRY', unit: '₺', digits: 4 },
  eurtry: { symbol: 'EURTRY=X', label: 'EUR/TRY', unit: '₺', digits: 4 },
  bist100: { symbol: 'XU100.IS', label: 'BIST 100', unit: '', digits: 0 },
  brent: { symbol: 'BZ=F', label: 'Brent Petrol', unit: '$', digits: 2 },
  gold: { symbol: 'GC=F', label: 'Ons Altın', unit: '$', digits: 2 },
  silver: { symbol: 'SI=F', label: 'Ons Gümüş', unit: '$', digits: 2 },
  dxy: { symbol: 'DX-Y.NYB', label: 'DXY', unit: '', digits: 2 }
};

function headers() {
  return { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store, max-age=0' };
}
function todayTR() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date()); }
function strip(v) { return String(v || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ').trim(); }
function cleanTitle(v) { return strip(v).replace(/\s+[-–—]\s+[^-–—|:]{2,90}$/u, '').replace(/\s+\|\s+[^|]{2,90}$/u, '').trim(); }
function num(v) { const n = Number(v); return Number.isFinite(n) ? n : null; }
function lastNumber(arr) { if (!Array.isArray(arr)) return null; for (let i = arr.length - 1; i >= 0; i--) { const n = num(arr[i]); if (n !== null) return n; } return null; }
function fmtNumber(value, digits = 2) { if (value === null || value === undefined || !Number.isFinite(Number(value))) return 'Veri yok'; return Number(value).toLocaleString('tr-TR', { minimumFractionDigits: digits, maximumFractionDigits: digits }); }
function fmtPrice(value, unit = '', digits = 2) { if (value === null || value === undefined || !Number.isFinite(Number(value))) return 'Veri yok'; const v = fmtNumber(value, digits); if (unit === '₺') return `${v} ₺`; if (unit === '$') return `$${v}`; return v; }
function changeText(chg) { if (chg === null || chg === undefined || !Number.isFinite(Number(chg))) return 'Değişim yok'; const sign = chg > 0 ? '+' : ''; return `${sign}${Number(chg).toFixed(2).replace('.', ',')}%`; }

function fetchText(url, timeoutMs = 6500) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 PiyasaMonitoru/2.0', 'Accept': 'application/json,text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' }, timeout: timeoutMs }, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', c => { body += c; });
      res.on('end', () => res.statusCode >= 400 ? reject(new Error(`HTTP ${res.statusCode}`)) : resolve(body));
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });
}
async function fetchJson(url, timeoutMs = 7000) { return JSON.parse(await fetchText(url, timeoutMs)); }

function rssUrl(query) { return 'https://news.google.com/rss/search?q=' + encodeURIComponent(query + ' when:3d') + '&hl=tr&gl=TR&ceid=TR:tr'; }
function newsImpact(title) {
  const t = String(title || '').toLocaleLowerCase('tr');
  if (/tcmb|faiz|merkez bankası/.test(t)) return 'TCMB, faiz patikası ve TL varlık fiyatlaması açısından izleniyor.';
  if (/enflasyon|tüfe|fiyat/.test(t)) return 'Enflasyon görünümü, tahvil faizi ve kur beklentileri açısından önemli.';
  if (/kur|dolar|tl|lira|euro/.test(t)) return 'Kur piyasası ve risk primi açısından yakından izleniyor.';
  if (/bist|borsa|banka|hisse/.test(t)) return 'BIST ve banka hisseleri üzerinden risk iştahına yansıyabilir.';
  if (/petrol|brent|altın|gümüş|emtia/.test(t)) return 'Emtia kanalı; enerji maliyeti, enflasyon ve cari denge görünümünü etkileyebilir.';
  if (/tahvil|cds|eurobond/.test(t)) return 'Sabit getirili piyasalar ve Türkiye risk primi için izleniyor.';
  return 'Türkiye piyasaları, kur, BIST, tahvil ve risk algısı açısından izleniyor.';
}
function parseRss(xml) {
  const items = [];
  const blocks = String(xml || '').match(/<item>[\s\S]*?<\/item>/g) || [];
  for (const block of blocks.slice(0, 18)) {
    const rawTitle = (block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) || block.match(/<title>([\s\S]*?)<\/title>/) || [])[1];
    const rawLink = (block.match(/<link>([\s\S]*?)<\/link>/) || [])[1];
    const rawDate = (block.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1];
    const title = cleanTitle(rawTitle);
    if (title) items.push({ title, baslik: title, link: strip(rawLink), tarih: rawDate ? new Date(strip(rawDate)).toISOString() : todayTR(), etki: newsImpact(title) });
  }
  return items;
}
async function fetchNews() {
  const queries = [
    'Türkiye ekonomi enflasyon TCMB faiz kur CDS tahvil',
    'Türkiye BIST banka borsa dolar TL piyasa',
    'Turkey economy inflation central bank lira bonds CDS',
    'Türkiye eurobond tahvil CDS risk primi',
    'Türkiye petrol altın gümüş emtia ekonomi'
  ];
  const out = [];
  for (const q of queries) { try { out.push(...parseRss(await fetchText(rssUrl(q), 5200))); } catch (_) {} }
  const seen = new Set();
  return out.filter(n => { const key = n.title.toLocaleLowerCase('tr'); if (seen.has(key)) return false; seen.add(key); return true; }).slice(0, 32);
}

async function fetchYahooChart(key, cfg) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(cfg.symbol)}?range=1mo&interval=1d&includePrePost=false`;
  const payload = await fetchJson(url, 7500);
  const result = payload?.chart?.result?.[0];
  if (!result) throw new Error('Yahoo result empty');
  const meta = result.meta || {};
  const quote = result.indicators?.quote?.[0] || {};
  const closes = (quote.close || []).map(num).filter(v => v !== null).slice(-12);
  const price = num(meta.regularMarketPrice) ?? lastNumber(closes);
  const prev = num(meta.chartPreviousClose) ?? (closes.length > 1 ? closes[closes.length - 2] : null);
  const changePct = price !== null && prev !== null && prev !== 0 ? ((price - prev) / prev) * 100 : null;
  return { key, symbol: cfg.symbol, label: cfg.label, value: price, display: fmtPrice(price, cfg.unit, cfg.digits), changePct, changeText: changeText(changePct), unit: cfg.unit, source: 'Yahoo Finance', history: closes, status: price !== null ? 'ok' : 'error' };
}
async function fetchYahooMarkets() {
  const entries = Object.entries(YAHOO_SYMBOLS);
  const settled = await Promise.allSettled(entries.map(([key, cfg]) => fetchYahooChart(key, cfg)));
  const markets = {}, errors = [];
  settled.forEach((res, i) => {
    const [key, cfg] = entries[i];
    if (res.status === 'fulfilled') markets[key] = res.value;
    else { errors.push({ key, symbol: cfg.symbol, error: res.reason?.message || 'fetch failed' }); markets[key] = { key, symbol: cfg.symbol, label: cfg.label, value: null, display: 'Veri yok', changePct: null, changeText: 'Değişim yok', unit: cfg.unit, source: 'Yahoo Finance', history: [], status: 'error' }; }
  });
  const usd = markets.usdtry?.value;
  const goldOz = markets.gold?.value;
  const silverOz = markets.silver?.value;
  const goldGram = usd && goldOz ? (goldOz * usd / 31.1034768) : null;
  const silverGram = usd && silverOz ? (silverOz * usd / 31.1034768) : null;
  markets.goldGram = { key: 'goldGram', symbol: 'GC=F × USDTRY', label: 'Gram Altın', value: goldGram, display: fmtPrice(goldGram, '₺', 2), changePct: null, changeText: 'TL gram gösterge', unit: '₺', source: 'Yahoo Finance', history: [], status: goldGram !== null ? 'ok' : 'error' };
  markets.silverGram = { key: 'silverGram', symbol: 'SI=F × USDTRY', label: 'Gram Gümüş', value: silverGram, display: fmtPrice(silverGram, '₺', 2), changePct: null, changeText: 'TL gram gösterge', unit: '₺', source: 'Yahoo Finance', history: [], status: silverGram !== null ? 'ok' : 'error' };
  return { markets, errors };
}

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
  return { score, label, level, tags: Array.from(tags).slice(0, 8) };
}
function riskScoreFromMarkets(markets, sentiment) {
  const usd = markets.usdtry?.value, dxy = markets.dxy?.value, brent = markets.brent?.value, bistChange = markets.bist100?.changePct;
  const vals = [usd, dxy, brent, bistChange].filter(v => v !== null && v !== undefined && Number.isFinite(Number(v)));
  if (!vals.length) return { score: null, regime: 'Veri yok', level: 'neutral', drivers: [] };
  let score = 40;
  if (usd !== null && usd !== undefined) score += Math.min(22, Math.max(0, (usd - 30) * 0.55));
  if (dxy !== null && dxy !== undefined) score += Math.min(12, Math.max(0, (dxy - 102) * 1.3));
  if (brent !== null && brent !== undefined) score += Math.min(14, Math.max(0, (brent - 75) * 0.65));
  if (bistChange !== null && bistChange !== undefined && bistChange < 0) score += Math.min(10, Math.abs(bistChange) * 2.4);
  if (sentiment.level === 'bad') score += 6;
  if (sentiment.level === 'warn') score += 3;
  score = Math.round(Math.max(0, Math.min(100, score)));
  return { score, regime: score >= 75 ? 'Yüksek Risk' : score >= 60 ? 'Orta-Yüksek Risk' : score >= 42 ? 'Orta Risk' : 'Düşük-Orta Risk', level: score >= 75 ? 'bad' : score >= 60 ? 'warn' : score >= 42 ? 'neutral' : 'ok', drivers: ['USDTRY','DXY','Brent','BIST','Haber Akışı'] };
}
function historyOrEmpty(market) { return Array.isArray(market?.history) ? market.history : []; }
function buildData(news, yahoo) {
  const markets = yahoo.markets || {};
  const sentiment = sentimentFromNews(news);
  const riskScore = riskScoreFromMarkets(markets, sentiment);
  return {
    updatedAt: todayTR(),
    generatedAt: new Date().toISOString(),
    source: 'yahoo-finance + news-rss',
    yahooErrors: yahoo.errors || [],
    markets,
    riskScore,
    sentiment,
    bonds: [
      { vade: 'Türkiye 2Y', getiri: 'Veri yok', numeric: null, degisim: 'Kaynak bekliyor', durum: 'Canlı tahvil verisi için güvenilir endpoint bağlanmalı.', risk: 'neutral' },
      { vade: 'Türkiye 5Y', getiri: 'Veri yok', numeric: null, degisim: 'Kaynak bekliyor', durum: 'Değer uydurulmaz; kaynak gelirse otomatik dolar.', risk: 'neutral' },
      { vade: 'Türkiye 10Y', getiri: 'Veri yok', numeric: null, degisim: 'Kaynak bekliyor', durum: 'CDS/tahvil için resmi veya güvenilir piyasa kaynağı gerekli.', risk: 'neutral' }
    ],
    stressMap: [
      { name: 'Kur', score: markets.usdtry?.value ? Math.round(Math.min(100, Math.max(30, (markets.usdtry.value - 25) * 2.2))) : 0, level: 'warn', note: `USDTRY ${markets.usdtry?.display || 'Veri yok'}` },
      { name: 'Borsa', score: markets.bist100?.changePct !== null && markets.bist100?.changePct < 0 ? Math.round(Math.min(100, 45 + Math.abs(markets.bist100.changePct) * 8)) : 35, level: 'neutral', note: `BIST 100 değişim: ${markets.bist100?.changeText || 'Veri yok'}` },
      { name: 'Enerji', score: markets.brent?.value ? Math.round(Math.min(100, Math.max(25, (markets.brent.value - 55) * 1.2))) : 0, level: 'warn', note: `Brent ${markets.brent?.display || 'Veri yok'}` },
      { name: 'Dolar Endeksi', score: markets.dxy?.value ? Math.round(Math.min(100, Math.max(25, (markets.dxy.value - 95) * 4))) : 0, level: 'neutral', note: `DXY ${markets.dxy?.display || 'Veri yok'}` },
      { name: 'Haber Akışı', score: sentiment.level === 'bad' ? 78 : sentiment.level === 'warn' ? 62 : 45, level: sentiment.level, note: sentiment.tags?.join(', ') || 'Makro/piyasa' },
      { name: 'Tahvil/CDS', score: 0, level: 'neutral', note: 'Kaynak bekliyor; değer uydurulmuyor.' }
    ],
    miniHistory: { riskScore: riskScore.score === null ? [] : [riskScore.score], cds5y: [], y10: [], bist100: historyOrEmpty(markets.bist100), brent: historyOrEmpty(markets.brent), usdtry: historyOrEmpty(markets.usdtry), gold: historyOrEmpty(markets.gold) },
    news
  };
}

exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: headers(), body: '' };
  try {
    const [newsResult, yahooResult] = await Promise.allSettled([fetchNews(), fetchYahooMarkets()]);
    const news = newsResult.status === 'fulfilled' ? newsResult.value : [];
    const yahoo = yahooResult.status === 'fulfilled' ? yahooResult.value : { markets: {}, errors: [{ key: 'all', error: yahooResult.reason?.message || 'Yahoo request failed' }] };
    return { statusCode: 200, headers: headers(), body: JSON.stringify(buildData(news, yahoo)) };
  } catch (error) {
    return { statusCode: 200, headers: headers(), body: JSON.stringify({ updatedAt: todayTR(), generatedAt: new Date().toISOString(), source: 'error', error: error.message, markets: {}, bonds: [], news: [] }) };
  }
};
