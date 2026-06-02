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
  return {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store, max-age=0'
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

function fetchText(url, timeoutMs = 6500) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 PiyasaMonitoru/1.0',
        'Accept': 'application/json,text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      timeout: timeoutMs
    }, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', c => { body += c; });
      res.on('end', () => {
        if (res.statusCode >= 400) reject(new Error(`HTTP ${res.statusCode}`));
        else resolve(body);
      });
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });
}

async function fetchJson(url, timeoutMs = 7000) {
  const txt = await fetchText(url, timeoutMs);
  return JSON.parse(txt);
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
    try { out.push(...parseRss(await fetchText(rssUrl(q), 5200))); } catch (_) {}
  }
  const seen = new Set();
  return out.filter(n => { const key = n.title.toLocaleLowerCase('tr'); if (seen.has(key)) return false; seen.add(key); return true; }).slice(0, 10);
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function lastNumber(arr) {
  if (!Array.isArray(arr)) return null;
  for (let i = arr.length - 1; i >= 0; i--) {
    const n = num(arr[i]);
    if (n !== null) return n;
  }
  return null;
}

function fmtNumber(value, digits = 2) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return 'Veri yok';
  return Number(value).toLocaleString('tr-TR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function fmtPrice(value, unit = '', digits = 2) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return 'Veri yok';
  const v = fmtNumber(value, digits);
  if (unit === '₺') return `${v} ₺`;
  if (unit === '$') return `$${v}`;
  return v;
}

function pct(n, digits = 2) {
  if (n === null || n === undefined || !Number.isFinite(Number(n))) return 'Veri yok';
  return '%' + Number(n).toFixed(digits).replace('.', ',');
}

function bps(n) {
  if (n === null || n === undefined || !Number.isFinite(Number(n))) return 'Veri yok';
  return Math.round(Number(n)) + ' bps';
}

function changeText(chg) {
  if (chg === null || chg === undefined || !Number.isFinite(Number(chg))) return 'Değişim yok';
  const sign = chg > 0 ? '+' : '';
  return `${sign}${Number(chg).toFixed(2).replace('.', ',')}%`;
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
  const currency = meta.currency || null;
  return {
    key,
    symbol: cfg.symbol,
    label: cfg.label,
    value: price,
    display: fmtPrice(price, cfg.unit, cfg.digits),
    changePct,
    changeText: changeText(changePct),
    currency,
    unit: cfg.unit,
    source: 'Yahoo Finance',
    history: closes,
    status: price !== null ? 'ok' : 'error'
  };
}

async function fetchYahooMarkets() {
  const entries = Object.entries(YAHOO_SYMBOLS);
  const settled = await Promise.allSettled(entries.map(([key, cfg]) => fetchYahooChart(key, cfg)));
  const markets = {};
  const errors = [];
  settled.forEach((res, i) => {
    const [key, cfg] = entries[i];
    if (res.status === 'fulfilled') markets[key] = res.value;
    else {
      errors.push({ key, symbol: cfg.symbol, error: res.reason?.message || 'fetch failed' });
      markets[key] = { key, symbol: cfg.symbol, label: cfg.label, value: null, display: 'Veri yok', changePct: null, changeText: 'Değişim yok', unit: cfg.unit, source: 'Yahoo Finance', history: [], status: 'error' };
    }
  });
  const usd = markets.usdtry?.value;
  const goldOz = markets.gold?.value;
  const silverOz = markets.silver?.value;
  const goldGram = usd && goldOz ? (goldOz * usd / 31.1034768) : null;
  const silverGram = usd && silverOz ? (silverOz * usd / 31.1034768) : null;
  markets.goldGram = { key: 'goldGram', symbol: 'GC=F × USDTRY / 31.1035', label: 'Gram Altın', value: goldGram, display: fmtPrice(goldGram, '₺', 2), changePct: null, changeText: 'Hesaplanan değer', unit: '₺', source: 'Yahoo Finance hesaplama', history: [], status: goldGram !== null ? 'ok' : 'error' };
  markets.silverGram = { key: 'silverGram', symbol: 'SI=F × USDTRY / 31.1035', label: 'Gram Gümüş', value: silverGram, display: fmtPrice(silverGram, '₺', 2), changePct: null, changeText: 'Hesaplanan değer', unit: '₺', source: 'Yahoo Finance hesaplama', history: [], status: silverGram !== null ? 'ok' : 'error' };
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
  const tagList = Array.from(tags).slice(0, 6);
  return { score, label, level, tags: tagList, summary: `Haber akışında ${tagList.slice(0, 3).join(', ') || 'makro/piyasa'} başlıkları öne çıkıyor.` };
}

function riskScoreFromMarkets(markets, sentiment) {
  const usd = markets.usdtry?.value;
  const dxy = markets.dxy?.value;
  const brent = markets.brent?.value;
  const bistChange = markets.bist100?.changePct;
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
  const level = score >= 75 ? 'bad' : score >= 60 ? 'warn' : score >= 42 ? 'neutral' : 'ok';
  const regime = score >= 75 ? 'Yüksek Risk' : score >= 60 ? 'Orta-Yüksek Risk' : score >= 42 ? 'Orta Risk' : 'Düşük-Orta Risk';
  return { score, regime, level, drivers: ['USDTRY', 'DXY', 'Brent', 'BIST', 'Haber Akışı'] };
}

function historyOrEmpty(market) {
  return Array.isArray(market?.history) ? market.history : [];
}

function buildData(news, yahoo) {
  const updatedAt = todayTR();
  const markets = yahoo.markets || {};
  const sentiment = sentimentFromNews(news);
  const riskScore = riskScoreFromMarkets(markets, sentiment);
  const sourceStatus = [
    { name: 'Yahoo Finance', status: yahoo.errors?.length ? 'partial' : 'ok', note: yahoo.errors?.length ? `${yahoo.errors.length} sembol alınamadı` : 'Piyasa göstergeleri Yahoo Finance chart API üzerinden alındı' },
    { name: 'Google News RSS', status: news.length ? 'ok' : 'error', note: news.length ? `${news.length} başlık alındı` : 'Haber akışı alınamadı' },
    { name: 'Google Sheets', status: 'disabled', note: 'Kullanıcı isteğiyle kaldırıldı' },
    { name: 'Fallback', status: 'disabled', note: 'Sahte/yedek değer kullanılmıyor' }
  ];
  return {
    updatedAt,
    generatedAt: new Date().toISOString(),
    source: 'yahoo-finance + news-rss',
    sourceStatus,
    yahooErrors: yahoo.errors || [],
    markets,
    kpis: [
      { label: 'USD/TRY', value: markets.usdtry?.display || 'Veri yok', raw: markets.usdtry?.value ?? null, note: markets.usdtry?.changeText || 'Yahoo Finance', icon: '💵', source: 'Yahoo Finance' },
      { label: 'EUR/TRY', value: markets.eurtry?.display || 'Veri yok', raw: markets.eurtry?.value ?? null, note: markets.eurtry?.changeText || 'Yahoo Finance', icon: '💶', source: 'Yahoo Finance' },
      { label: 'BIST 100', value: markets.bist100?.display || 'Veri yok', raw: markets.bist100?.value ?? null, note: markets.bist100?.changeText || 'Yahoo Finance', icon: '📊', source: 'Yahoo Finance' },
      { label: 'Brent Petrol', value: markets.brent?.display || 'Veri yok', raw: markets.brent?.value ?? null, note: markets.brent?.changeText || 'Yahoo Finance', icon: '🛢️', source: 'Yahoo Finance' }
    ],
    marketStrip: [
      { label: 'Risk Skoru', value: riskScore.score === null ? 'Veri yok' : `${riskScore.score}/100`, note: riskScore.regime },
      { label: 'USDTRY / EURTRY', value: `${markets.usdtry?.display || 'Veri yok'} / ${markets.eurtry?.display || 'Veri yok'}`, note: 'Yahoo Finance' },
      { label: 'Altın / Gümüş', value: `${markets.goldGram?.display || 'Veri yok'} / ${markets.silverGram?.display || 'Veri yok'}`, note: 'Gram değerler hesaplanır' },
      { label: 'BIST / Brent', value: `${markets.bist100?.display || 'Veri yok'} / ${markets.brent?.display || 'Veri yok'}`, note: 'Yahoo Finance' }
    ],
    riskScore,
    sentiment,
    macroBrief: [
      `Google Sheets ve fallback değerler kaldırıldı. Bu ekran artık piyasa göstergelerinde Yahoo Finance verisini kullanıyor; veri gelmeyen metriklerde sayı uydurulmuyor.`,
      `USDTRY ${markets.usdtry?.display || 'Veri yok'}, EURTRY ${markets.eurtry?.display || 'Veri yok'}, BIST100 ${markets.bist100?.display || 'Veri yok'}, Brent ${markets.brent?.display || 'Veri yok'} seviyesinde izleniyor.`,
      `Ons altın ${markets.gold?.display || 'Veri yok'}, gram altın ${markets.goldGram?.display || 'Veri yok'}, ons gümüş ${markets.silver?.display || 'Veri yok'}, gram gümüş ${markets.silverGram?.display || 'Veri yok'} olarak hesaplanıyor.`,
      news.length ? `Otomatik haber akışında öne çıkan başlık: ${news[0].title}` : 'Haber kaynağına erişim olmadığında haber bölümü boş/uyarı mantığıyla çalışır.'
    ],
    bonds: [
      { vade: '2Y Gösterge', getiri: 'Veri yok', numeric: null, degisim: 'Yahoo Finance üzerinde güvenilir sembol tanımlı değil', durum: 'Google Sheets/fallback kaldırıldığı için yalnızca kaynak bağlanırsa dolar.', risk: 'neutral' },
      { vade: '5Y Gösterge', getiri: 'Veri yok', numeric: null, degisim: 'Yahoo Finance üzerinde güvenilir sembol tanımlı değil', durum: 'Kaynak eklenmeden tahvil getirisi uydurulmaz.', risk: 'neutral' },
      { vade: '10Y Gösterge', getiri: 'Veri yok', numeric: null, degisim: 'Yahoo Finance üzerinde güvenilir sembol tanımlı değil', durum: 'Tahvil/CDS için ayrıca güvenilir veri endpointi bağlanmalı.', risk: 'neutral' }
    ],
    spreads: [
      { metrik: '2Y - 10Y Spread', deger: 'Veri yok', yorum: 'Tahvil verisi için güvenilir kaynak bağlanmadı.', seviye: 'neutral' },
      { metrik: 'CDS Bandı', deger: 'Veri yok', yorum: 'CDS Yahoo Finance üzerinden sağlıklı alınamadığı için sahte değer kullanılmıyor.', seviye: 'neutral' }
    ],
    stressMap: [
      { name: 'Kur', score: markets.usdtry?.value ? Math.round(Math.min(100, Math.max(30, (markets.usdtry.value - 25) * 2.2))) : 0, level: 'warn', note: `USDTRY ${markets.usdtry?.display || 'Veri yok'}` },
      { name: 'Borsa', score: markets.bist100?.changePct !== null && markets.bist100?.changePct < 0 ? Math.round(Math.min(100, 45 + Math.abs(markets.bist100.changePct) * 8)) : 35, level: 'neutral', note: `BIST 100 değişim: ${markets.bist100?.changeText || 'Veri yok'}` },
      { name: 'Enerji', score: markets.brent?.value ? Math.round(Math.min(100, Math.max(25, (markets.brent.value - 55) * 1.2))) : 0, level: 'warn', note: `Brent ${markets.brent?.display || 'Veri yok'}` },
      { name: 'Dolar Endeksi', score: markets.dxy?.value ? Math.round(Math.min(100, Math.max(25, (markets.dxy.value - 95) * 4))) : 0, level: 'neutral', note: `DXY ${markets.dxy?.display || 'Veri yok'}` },
      { name: 'Haber Akışı', score: sentiment.level === 'bad' ? 78 : sentiment.level === 'warn' ? 62 : 45, level: sentiment.level, note: sentiment.summary },
      { name: 'Tahvil/CDS', score: 0, level: 'neutral', note: 'Kaynak bağlanmadı; değer uydurulmuyor.' }
    ],
    risk: [
      { metrik: 'CDS', deger: 'Veri yok', yorum: 'Yahoo Finance ile güvenilir CDS sembolü bağlanmadı; fallback kapalı.', seviye: 'neutral' },
      { metrik: 'Tahvil Getirileri', deger: 'Veri yok', yorum: '2Y/5Y/10Y için güvenilir canlı kaynak bağlanmalı.', seviye: 'neutral' },
      { metrik: 'Kur Oynaklığı', deger: markets.usdtry?.changeText || 'Veri yok', yorum: 'USDTRY Yahoo Finance üzerinden izleniyor.', seviye: 'warn' },
      { metrik: 'Emtia / Enerji', deger: markets.brent?.display || 'Veri yok', yorum: 'Brent petrol enerji ve cari denge kanalı için izleniyor.', seviye: 'warn' }
    ],
    credit: [
      { metrik: 'Kredi Büyümesi', deger: 'Veri yok', yorum: 'Bu metrik Yahoo Finance kapsamında değildir; kaynak bağlanmadan değer gösterilmez.', seviye: 'neutral' },
      { metrik: 'Bankacılık Endeksi', deger: 'Kaynak bağlanabilir', yorum: 'İstenirse XBANK.IS gibi sembol ayrı eklenebilir.', seviye: 'neutral' },
      { metrik: 'Aktif Kalitesi', deger: 'Veri yok', yorum: 'BDDK/kurumsal kaynak bağlanmadan değer üretilmez.', seviye: 'neutral' },
      { metrik: 'Mevduat Kompozisyonu', deger: 'Veri yok', yorum: 'TCMB/BDDK kaynağı bağlanmadan değer gösterilmez.', seviye: 'neutral' }
    ],
    todayWatch: ['USDTRY ve EURTRY yönü', 'BIST100 günlük değişimi', 'Brent petrol fiyatı', 'Ons ve gram altın/gümüş', 'DXY ve küresel dolar görünümü', 'Türkiye ekonomi haber akışı'],
    miniHistory: {
      riskScore: riskScore.score === null ? [] : [riskScore.score],
      cds5y: [],
      y10: [],
      bist100: historyOrEmpty(markets.bist100),
      brent: historyOrEmpty(markets.brent),
      usdtry: historyOrEmpty(markets.usdtry),
      gold: historyOrEmpty(markets.gold)
    },
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
    return { statusCode: 200, headers: headers(), body: JSON.stringify({ updatedAt: todayTR(), generatedAt: new Date().toISOString(), source: 'error', error: error.message, markets: {}, kpis: [], marketStrip: [], news: [] }) };
  }
};
