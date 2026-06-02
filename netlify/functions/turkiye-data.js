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
  return String(v || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[^;]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanTitle(v) {
  return strip(v)
    .replace(/\s+[-–—]\s+[^-–—|:]{2,90}$/u, '')
    .replace(/\s+\|\s+[^|]{2,90}$/u, '')
    .trim();
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
  const queries = [
    'Türkiye ekonomi enflasyon TCMB faiz kur CDS tahvil',
    'Turkey economy inflation central bank lira bonds CDS',
    'BIST banka tahvil faiz Türkiye piyasa'
  ];
  const out = [];
  for (const q of queries) {
    try { out.push(...parseRss(await fetchText(rssUrl(q)))); } catch (_) {}
  }
  const seen = new Set();
  return out.filter(n => {
    const key = n.title.toLocaleLowerCase('tr');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 8);
}

function data(news) {
  const updatedAt = todayTR();
  return {
    updatedAt,
    generatedAt: new Date().toISOString(),
    source: news.length ? 'google-news-rss + site-model' : 'site-model-fallback',
    kpis: [
      { label: 'TCMB Politika Faizi', value: '%37,00', note: '1 hafta vadeli repo; karar değişirse manuel veri alanı güncellenmeli', icon: '🏦' },
      { label: 'TÜFE Yıllık', value: '%32,84', note: 'Son açıklanan yıllık enflasyon için panel seviyesi', icon: '🧾' },
      { label: 'Türkiye 5Y CDS', value: '≈260 bps', note: 'Gün içi piyasa seviyeleri veri sağlayıcısına göre değişebilir', icon: '🛡️' },
      { label: '10Y Tahvil', value: '≈%30,20', note: 'Uzun vadeli TL tahvil göstergesi', icon: '📜' }
    ],
    macroBrief: [
      'Türkiye görünümünde ana çerçeve sıkı para politikası, dezenflasyon patikası, rezerv birikimi ve TL’ye güven dengesidir. Manşet enflasyondaki gerileme tek başına yeterli değildir; çekirdek ve hizmet enflasyonu faiz patikasını belirleyen en kritik alanlardır.',
      'Piyasa tarafında CDS, tahvil eğrisi, kur oynaklığı ve yabancı portföy akımları aynı anda izlenmelidir. Rezerv görünümü güçlenirken enflasyon beklentileri bozulmazsa TL varlıklar destek bulur; jeopolitik ya da politik stres artarsa risk primi hızlı yükselebilir.',
      news.length ? `Günün otomatik haber akışında öne çıkan başlık: ${news[0].title}` : 'Haber kaynağına erişim olmazsa ekran yedek makro senaryo ile çalışmaya devam eder.'
    ],
    bonds: [
      { vade: '2Y Gösterge', getiri: '%39,50', numeric: 39.5, degisim: 'Yüksek', durum: 'Kısa vadede politika faizi, likidite koşulları ve enflasyon beklentisi belirleyici.', risk: 'warn' },
      { vade: '5Y Gösterge', getiri: '≈%34,80', numeric: 34.8, degisim: 'Hassas', durum: 'Orta vadede dezenflasyon güveni, yabancı talebi ve risk primi birlikte fiyatlanıyor.', risk: 'neutral' },
      { vade: '10Y Gösterge', getiri: '≈%30,20', numeric: 30.2, degisim: 'İzle', durum: 'Uzun vadede mali disiplin, rezerv kalitesi ve küresel faizler ana değişkenler.', risk: 'neutral' }
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
    news: news.length ? news : [
      { tarih: updatedAt, baslik: 'Türkiye piyasalarında enflasyon, faiz patikası ve rezerv görünümü izleniyor', etki: 'Veri akışı tahvil faizi, CDS ve TL fiyatlaması üzerinde belirleyici olmaya devam ediyor.' }
    ]
  };
}

exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: headers(), body: '' };
  try {
    const news = await fetchNews();
    return { statusCode: 200, headers: headers(), body: JSON.stringify(data(news)) };
  } catch (error) {
    return { statusCode: 200, headers: headers(), body: JSON.stringify(data([])) };
  }
};
