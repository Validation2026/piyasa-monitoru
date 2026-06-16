require('./env').loadEnv();
const https = require('https');
const fs = require('fs');
const path = require('path');

const YAHOO_SYMBOLS = {
  usdtry: { symbol: 'USDTRY=X', label: 'USD/TRY', unit: '₺', digits: 4, group: 'Kur' },
  eurtry: { symbol: 'EURTRY=X', label: 'EUR/TRY', unit: '₺', digits: 4, group: 'Kur' },
  bist100: { symbol: 'XU100.IS', label: 'BIST 100', unit: '', digits: 0, group: 'Borsa' },
  bistBank: { symbol: 'XBANK.IS', label: 'BIST Banka', unit: '', digits: 0, group: 'Borsa' },
  brent: { symbol: 'BZ=F', label: 'Brent Petrol', unit: '$', digits: 2, group: 'Emtia' },
  gold: { symbol: 'GC=F', label: 'Ons Altın', unit: '$', digits: 2, group: 'Emtia' },
  silver: { symbol: 'SI=F', label: 'Ons Gümüş', unit: '$', digits: 2, group: 'Emtia' },
  dxy: { symbol: 'DX-Y.NYB', label: 'DXY', unit: '', digits: 2, group: 'Global' },
  us10y: { symbol: '^TNX', label: 'ABD 10Y', unit: '%', digits: 2, group: 'Tahvil' }
};

const MACRO_FILE = path.join(__dirname, '..', '..', 'site', 'data', 'turkiye_makro.json');

function headers() {
  return {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store, max-age=0'
  };
}
function todayTR() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date()); }
function strip(v) { return String(v || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ').trim(); }
function cleanTitle(v) { return strip(v).replace(/\s+[-–—]\s+[^-–—|:]{2,90}$/u, '').replace(/\s+\|\s+[^|]{2,90}$/u, '').trim(); }
function num(v) { const n = Number(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : null; }
function lastNumber(arr) { if (!Array.isArray(arr)) return null; for (let i = arr.length - 1; i >= 0; i--) { const n = num(arr[i]); if (n !== null) return n; } return null; }
function fmtNumber(value, digits = 2) { if (!Number.isFinite(Number(value))) return 'Veri yok'; return Number(value).toLocaleString('tr-TR', { minimumFractionDigits: digits, maximumFractionDigits: digits }); }
function fmtPrice(value, unit = '', digits = 2) {
  if (!Number.isFinite(Number(value))) return 'Veri yok';
  const v = fmtNumber(value, digits);
  if (unit === '₺') return `${v} ₺`;
  if (unit === '$') return `$${v}`;
  if (unit === '%') return `%${v}`;
  return v;
}
function changeText(chg) { if (!Number.isFinite(Number(chg))) return 'Değişim yok'; const sign = chg > 0 ? '+' : ''; return `${sign}${Number(chg).toFixed(2).replace('.', ',')}%`; }
function ageLabel(iso) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return 'Zaman yok';
  const mins = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (mins < 2) return 'az önce';
  if (mins < 60) return `${mins} dk önce`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours} sa önce`;
  return new Date(t).toLocaleDateString('tr-TR');
}

function fetchText(url, timeoutMs = 6500) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 PiyasaMonitoru/3.0', Accept: 'application/json,text/html,application/xml;q=0.9,*/*;q=0.8' }, timeout: timeoutMs }, res => {
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

function rssUrl(query) { return `https://news.google.com/rss/search?q=${encodeURIComponent(`${query} when:3d`)}&hl=tr&gl=TR&ceid=TR:tr`; }
function newsImpact(title) {
  const t = String(title || '').toLocaleLowerCase('tr');
  if (/tcmb|faiz|merkez bankası/.test(t)) return 'TCMB ve faiz patikası TL varlıklar için ana fiyatlama başlığı.';
  if (/enflasyon|tüfe|fiyat/.test(t)) return 'Enflasyon görünümü kur, tahvil faizi ve reel getiri beklentilerini etkiler.';
  if (/kur|dolar|tl|lira|euro/.test(t)) return 'Kur piyasası, ithalat maliyeti ve risk primi açısından izleniyor.';
  if (/bist|borsa|banka|hisse/.test(t)) return 'BIST ve bankacılık hisseleri risk iştahının hızlı göstergeleri.';
  if (/petrol|brent|altın|gümüş|emtia/.test(t)) return 'Emtia fiyatları enflasyon, cari denge ve güvenli liman talebi için önemli.';
  if (/tahvil|cds|eurobond/.test(t)) return 'Sabit getirili piyasalar Türkiye risk primi sinyali verir.';
  return 'Türkiye piyasaları açısından izlenmesi gereken güncel başlık.';
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
  const queries = ['Türkiye ekonomi TCMB enflasyon faiz kur', 'Türkiye BIST banka borsa dolar TL', 'Turkey economy inflation central bank lira bonds CDS', 'Türkiye tahvil eurobond CDS risk primi', 'Türkiye petrol altın emtia cari denge'];
  const settled = await Promise.allSettled(queries.map(q => fetchText(rssUrl(q), 5200).then(parseRss)));
  const out = settled.flatMap(r => r.status === 'fulfilled' ? r.value : []);
  const seen = new Set();
  return out.filter(n => { const key = n.title.toLocaleLowerCase('tr'); if (seen.has(key)) return false; seen.add(key); return true; }).slice(0, 36);
}

async function fetchYahooChart(key, cfg) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(cfg.symbol)}?range=1mo&interval=1d&includePrePost=false`;
  const payload = await fetchJson(url, 7500);
  const result = payload?.chart?.result?.[0];
  if (!result) throw new Error('Yahoo result empty');
  const meta = result.meta || {};
  const quote = result.indicators?.quote?.[0] || {};
  const closes = (quote.close || []).map(num).filter(v => v !== null).slice(-22);
  const price = num(meta.regularMarketPrice) ?? lastNumber(closes);
  const prev = num(meta.chartPreviousClose) ?? (closes.length > 1 ? closes[closes.length - 2] : null);
  const changePct = price !== null && prev !== null && prev !== 0 ? ((price - prev) / prev) * 100 : null;
  return { key, symbol: cfg.symbol, label: cfg.label, group: cfg.group, value: price, display: fmtPrice(price, cfg.unit, cfg.digits), changePct, changeText: changeText(changePct), unit: cfg.unit, source: 'Yahoo Finance', history: closes, status: price !== null ? 'ok' : 'error', updatedAt: new Date((meta.regularMarketTime || Date.now() / 1000) * 1000).toISOString() };
}
async function fetchYahooMarkets() {
  const entries = Object.entries(YAHOO_SYMBOLS);
  const settled = await Promise.allSettled(entries.map(([key, cfg]) => fetchYahooChart(key, cfg)));
  const markets = {}, errors = [];
  settled.forEach((res, i) => {
    const [key, cfg] = entries[i];
    if (res.status === 'fulfilled') markets[key] = res.value;
    else {
      errors.push({ key, symbol: cfg.symbol, error: res.reason?.message || 'fetch failed' });
      markets[key] = { key, symbol: cfg.symbol, label: cfg.label, group: cfg.group, value: null, display: 'Veri yok', changePct: null, changeText: 'Değişim yok', unit: cfg.unit, source: 'Yahoo Finance', history: [], status: 'error' };
    }
  });
  const usd = markets.usdtry?.value;
  const goldOz = markets.gold?.value;
  const silverOz = markets.silver?.value;
  const goldGram = usd && goldOz ? (goldOz * usd / 31.1034768) : null;
  const silverGram = usd && silverOz ? (silverOz * usd / 31.1034768) : null;
  markets.goldGram = { key: 'goldGram', symbol: 'GC=F × USDTRY', label: 'Gram Altın', group: 'Emtia', value: goldGram, display: fmtPrice(goldGram, '₺', 2), changePct: null, changeText: 'Otomatik hesap', unit: '₺', source: 'Yahoo Finance türev', history: [], status: goldGram !== null ? 'ok' : 'error' };
  markets.silverGram = { key: 'silverGram', symbol: 'SI=F × USDTRY', label: 'Gram Gümüş', group: 'Emtia', value: silverGram, display: fmtPrice(silverGram, '₺', 2), changePct: null, changeText: 'Otomatik hesap', unit: '₺', source: 'Yahoo Finance türev', history: [], status: silverGram !== null ? 'ok' : 'error' };
  return { markets, errors };
}

function readMacroSnapshot() {
  const raw = JSON.parse(fs.readFileSync(MACRO_FILE, 'utf8'));
  const items = Array.isArray(raw.series) ? raw.series : (Array.isArray(raw.data) ? raw.data : []);
  return items.map(item => {
    const points = Array.isArray(item.data) ? item.data : (Array.isArray(item.values) ? item.values : []);
    const last = points[points.length - 1] || null;
    const value = num(item.current) ?? num(last?.value);
    const digits = item.unit === '%' ? 2 : 2;
    return { name: item.name, unit: item.unit || '', value, display: value === null ? 'Veri yok' : `${fmtNumber(value, digits)}${item.unit === '%' ? '%' : item.unit ? ` ${item.unit}` : ''}`, date: last?.date || raw.meta?.last_updated || todayTR(), source: item.source || raw.meta?.source || 'Yerel makro veri' };
  }).filter(x => x.name && x.value !== null).slice(0, 8);
}
function sentimentFromNews(news) {
  const badWords = ['risk', 'gerilim', 'baskı', 'kayıp', 'enflasyon', 'savaş', 'yaptırım', 'kriz', 'sert', 'zayıf', 'arttı', 'yükseldi'];
  const goodWords = ['toparlanma', 'iyileşme', 'geriledi', 'giriş', 'pozitif', 'rahatlama', 'güçlü'];
  let score = 0;
  const tags = new Set();
  for (const n of news) {
    const t = String(n.title || n.baslik || '').toLocaleLowerCase('tr');
    if (/tcmb|faiz|merkez bankası/.test(t)) tags.add('TCMB');
    if (/enflasyon|tüfe/.test(t)) tags.add('Enflasyon');
    if (/kur|dolar|tl|lira/.test(t)) tags.add('Kur');
    if (/cds|tahvil|eurobond|faiz/.test(t)) tags.add('Tahvil/CDS');
    if (/bist|borsa|banka/.test(t)) tags.add('BIST/Bankacılık');
    badWords.forEach(w => { if (t.includes(w)) score -= 1; });
    goodWords.forEach(w => { if (t.includes(w)) score += 1; });
  }
  const level = score <= -3 ? 'bad' : score < 0 ? 'warn' : score >= 3 ? 'ok' : 'neutral';
  const label = level === 'bad' ? 'Negatif' : level === 'warn' ? 'Hafif Negatif' : level === 'ok' ? 'Pozitif' : 'Nötr';
  return { score, label, level, tags: Array.from(tags).slice(0, 8) };
}
function riskScoreFromMarkets(markets, sentiment, macro) {
  const usd = markets.usdtry?.value, dxy = markets.dxy?.value, brent = markets.brent?.value, us10y = markets.us10y?.value, bistChange = markets.bist100?.changePct;
  const vals = [usd, dxy, brent, us10y, bistChange].filter(v => Number.isFinite(Number(v)));
  if (!vals.length) return { score: null, regime: 'Veri yok', level: 'neutral', drivers: [] };
  let score = 34;
  if (usd) score += Math.min(24, Math.max(0, (usd - 30) * 0.6));
  if (dxy) score += Math.min(12, Math.max(0, (dxy - 101) * 1.5));
  if (brent) score += Math.min(14, Math.max(0, (brent - 72) * 0.7));
  if (us10y) score += Math.min(8, Math.max(0, (us10y - 4) * 5));
  if (Number.isFinite(bistChange) && bistChange < 0) score += Math.min(12, Math.abs(bistChange) * 2.8);
  const policy = macro.find(x => /Politika Faizi/.test(x.name));
  if (policy?.value) score += Math.min(8, Math.max(0, (policy.value - 30) * 0.35));
  if (sentiment.level === 'bad') score += 6;
  if (sentiment.level === 'warn') score += 3;
  score = Math.round(Math.max(0, Math.min(100, score)));
  return { score, regime: score >= 75 ? 'Yüksek Risk' : score >= 60 ? 'Orta-Yüksek Risk' : score >= 42 ? 'Orta Risk' : 'Düşük-Orta Risk', level: score >= 75 ? 'bad' : score >= 60 ? 'warn' : score >= 42 ? 'neutral' : 'ok', drivers: ['USD/TRY', 'DXY', 'Brent', 'ABD 10Y', 'BIST', 'Haber Akışı'] };
}
function scoreFrom(value, low, high) { if (!Number.isFinite(Number(value))) return 0; return Math.round(Math.max(0, Math.min(100, ((value - low) / (high - low)) * 100))); }
function historyOrEmpty(market) { return Array.isArray(market?.history) ? market.history : []; }
function buildData(news, yahoo, macro = readMacroSnapshot()) {
  const markets = yahoo.markets || {};
  const sentiment = sentimentFromNews(news);
  const riskScore = riskScoreFromMarkets(markets, sentiment, macro);
  return {
    updatedAt: todayTR(),
    generatedAt: new Date().toISOString(),
    source: 'Yahoo Finance + Google News RSS + yerel TCMB makro dosyası',
    sources: ['Yahoo Finance chart API', 'Google News RSS', 'site/data/turkiye_makro.json'],
    freshness: { label: ageLabel(new Date().toISOString()), generatedAt: new Date().toISOString() },
    yahooErrors: yahoo.errors || [],
    markets,
    macro,
    riskScore,
    sentiment,
    bonds: [
      { vade: 'Türkiye 2Y', getiri: 'Veri yok', numeric: null, degisim: 'Kaynak yok', durum: 'Güvenilir açık endpoint bağlanmadan tahvil verisi uydurulmaz.', risk: 'neutral' },
      { vade: 'Türkiye 5Y CDS', getiri: 'Veri yok', numeric: null, degisim: 'Kaynak yok', durum: 'Lisanslı/güvenilir CDS kaynağı gelirse otomatik gösterilir.', risk: 'neutral' },
      { vade: 'Türkiye 10Y', getiri: 'Veri yok', numeric: null, degisim: 'Kaynak yok', durum: 'Resmî veya güvenilir piyasa kaynağı gerektirir.', risk: 'neutral' }
    ],
    stressMap: [
      { name: 'Kur', score: scoreFrom(markets.usdtry?.value, 30, 55), note: `USD/TRY ${markets.usdtry?.display || 'Veri yok'}` },
      { name: 'Borsa', score: Number.isFinite(markets.bist100?.changePct) && markets.bist100.changePct < 0 ? Math.round(Math.min(100, 45 + Math.abs(markets.bist100.changePct) * 8)) : 35, note: `BIST 100 ${markets.bist100?.changeText || 'Veri yok'}` },
      { name: 'Enerji', score: scoreFrom(markets.brent?.value, 55, 105), note: `Brent ${markets.brent?.display || 'Veri yok'}` },
      { name: 'Dolar Endeksi', score: scoreFrom(markets.dxy?.value, 95, 112), note: `DXY ${markets.dxy?.display || 'Veri yok'}` },
      { name: 'ABD Faizi', score: scoreFrom(markets.us10y?.value, 3, 5.5), note: `ABD 10Y ${markets.us10y?.display || 'Veri yok'}` },
      { name: 'Haber Akışı', score: sentiment.level === 'bad' ? 78 : sentiment.level === 'warn' ? 62 : sentiment.level === 'ok' ? 35 : 45, note: sentiment.tags?.join(', ') || 'Makro/piyasa' }
    ],
    miniHistory: { bist100: historyOrEmpty(markets.bist100), bistBank: historyOrEmpty(markets.bistBank), brent: historyOrEmpty(markets.brent), usdtry: historyOrEmpty(markets.usdtry), gold: historyOrEmpty(markets.gold), dxy: historyOrEmpty(markets.dxy) },
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
    return { statusCode: 200, headers: headers(), body: JSON.stringify({ updatedAt: todayTR(), generatedAt: new Date().toISOString(), source: 'error', error: error.message, markets: {}, macro: [], bonds: [], news: [] }) };
  }
};

exports._test = { parseRss, buildData, riskScoreFromMarkets, readMacroSnapshot, fmtPrice };
