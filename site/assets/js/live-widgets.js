/**
 * Risk Monitörü — Canlı Widgets
 * - Ticker: her sayfada .update-info'nun altına enjekte edilen kayan fiyat şeridi
 * - Market Clock: büyük dünya borsalarının açık/kapalı durumu
 * - Flash: fiyat değişimlerinde yeşil/kırmızı pulse
 *
 * sidebar.js tarafından her sayfada otomatik yüklenir.
 * İran-risk sayfasında çalışmaz (PMWidgets.skip=true ile).
 */
(function(){'use strict';

if(window.PMWidgets && window.PMWidgets.__loaded) return;

var pageId = (location.pathname.split('/').pop() || 'index').replace('.html','') || 'index';
if(pageId === 'iran-risk'){ window.PMWidgets = {skip:true}; return; }

var POLL_MS = 60 * 1000;    // ticker auto-refresh
var CLOCK_MS = 30 * 1000;   // market clock tick

// ---------- yardımcılar ----------
function fmtNum(v){
    if(v == null || !isFinite(v)) return '—';
    var abs = Math.abs(v);
    var dec = abs >= 1000 ? 0 : abs >= 10 ? 2 : 4;
    return Number(v).toLocaleString('tr-TR', {minimumFractionDigits:dec, maximumFractionDigits:dec});
}
function escapeHtml(s){
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function byId(list, id){ for(var i=0;i<list.length;i++){ if(list[i].id === id) return list[i]; } return null; }
function cacheBustedFetch(path){
    return fetch(path + (path.indexOf('?')<0?'?':'&') + 't=' + Date.now(), {cache:'no-store'})
        .then(function(r){ return r.json(); }).catch(function(){ return null; });
}

// ======================================================
//  TICKER
// ======================================================
var TICKER_PRIORITY = [
    'BZ=F','CL=F','NG=F','GC=F','SI=F','HG=F',
    '^GSPC','^IXIC','^DJI','^GDAXI','^FTSE','^N225','XU100.IS',
    '^TNX','DX-Y.NYB',
    'BTC-USD','ETH-USD','SOL-USD',
    'USDTRY=X','EURUSD=X','GBPUSD=X','USDJPY=X','EURTRY=X'
];
var _prevTickerPrices = {};
var _tickerTimer = null;

function buildTickerItems(data){
    if(!data || !data.series) return [];
    var seen = {};
    var items = [];
    TICKER_PRIORITY.forEach(function(id){
        var s = byId(data.series, id);
        if(s){ items.push(s); seen[id] = true; }
    });
    // Kalan yerleri günlük değişime göre en hareketlilerle doldur
    var movers = data.series
        .filter(function(s){ return !seen[s.id] && s.change_1d_pct != null && s.current != null; })
        .sort(function(a,b){ return Math.abs(b.change_1d_pct) - Math.abs(a.change_1d_pct); })
        .slice(0, 30);
    return items.concat(movers);
}

function renderTicker(items){
    if(!items.length) return '';
    function mkItem(s){
        var chg = s.change_1d_pct;
        var chgTxt = chg == null ? '—' : (chg >= 0 ? '+' : '') + chg.toFixed(2) + '%';
        var chgCls = chg == null ? '' : (chg >= 0 ? 'u' : 'd');
        var unit = s.unit ? ' <span class="ti-u">' + escapeHtml(s.unit) + '</span>' : '';
        return '<span class="ti" data-id="' + escapeHtml(s.id) + '" title="' + escapeHtml(s.name) + '">' +
            '<span class="ti-n">' + escapeHtml(s.name) + '</span>' +
            '<span class="ti-p" data-price-id="' + escapeHtml(s.id) + '">' + fmtNum(s.current) + '</span>' + unit +
            '<span class="ti-c ' + chgCls + '">' + chgTxt + '</span>' +
        '</span>';
    }
    // İki kere basıyoruz — seamless loop için (CSS translate -50% ile eşleşiyor)
    var html = items.map(mkItem).join('') + items.map(mkItem).join('');
    return '<div class="ticker" role="marquee" aria-label="Canlı piyasa şeridi">' +
           '<div class="ticker-track" id="pmTickerTrack">' + html + '</div></div>';
}

function findAnchor(){
    // Tercih sırası: "Son güncelleme" yazısının hemen altına gel
    // 1) kategori sayfaları: .page-head > .update-info
    // 2) index.html: .stats-bar (içinde #stUpdate "Son Güncelleme")
    // 3) diğer başlık kutuları: .page-head (fallback)
    var ui = document.querySelector('.page-head .update-info');
    if(ui) return ui;
    var stUpdate = document.getElementById('stUpdate');
    if(stUpdate){
        // stUpdate içeren üst satır (.stats-bar) hemen altına enjekte
        var bar = stUpdate.closest('.stats-bar');
        if(bar) return bar;
        return stUpdate;
    }
    var head = document.querySelector('.page-head');
    if(head) return head;
    return null;
}

function ensureTickerContainer(){
    var existing = document.getElementById('pmTickerWrap');
    if(existing) return existing;
    var anchor = findAnchor();
    if(!anchor || !anchor.parentNode) return null;
    var wrap = document.createElement('div');
    wrap.id = 'pmTickerWrap';
    wrap.className = 'pm-ticker-wrap';
    anchor.parentNode.insertBefore(wrap, anchor.nextSibling);
    return wrap;
}

function flashEl(el, direction){
    if(!el) return;
    var cls = direction === 'up' ? 'flash-up' : direction === 'down' ? 'flash-down' : 'flash-update';
    el.classList.remove('flash-up','flash-down','flash-update');
    void el.offsetWidth; // reflow
    el.classList.add(cls);
}

function applyPriceFlashes(items){
    items.forEach(function(s){
        var prev = _prevTickerPrices[s.id];
        if(prev != null && s.current != null && prev !== s.current){
            var nodes = document.querySelectorAll('[data-price-id="' + (window.CSS && CSS.escape ? CSS.escape(s.id) : s.id.replace(/"/g,'')) + '"]');
            var dir = s.current > prev ? 'up' : 'down';
            nodes.forEach(function(n){ flashEl(n, dir); });
        }
        if(s.current != null) _prevTickerPrices[s.id] = s.current;
    });
}

function refreshTicker(){
    return cacheBustedFetch('data/summary.json').then(function(data){
        if(!data || !data.series) return;
        var items = buildTickerItems(data);
        if(!items.length) return;
        var wrap = ensureTickerContainer();
        if(!wrap) return;
        var firstRender = !wrap.firstChild;
        wrap.innerHTML = renderTicker(items);
        if(!firstRender) applyPriceFlashes(items);
        else items.forEach(function(s){ if(s.current != null) _prevTickerPrices[s.id] = s.current; });
    });
}

function startTicker(){
    refreshTicker();
    if(_tickerTimer) clearInterval(_tickerTimer);
    _tickerTimer = setInterval(function(){
        if(document.hidden) return;
        refreshTicker();
    }, POLL_MS);
}

// ======================================================
//  MARKET CLOCK — dünya borsaları
// ======================================================
// open/close dakika cinsinden (local tz). days: 0=Pazar ... 6=Cmt
var MARKETS = [
    {code:'NYSE',    name:'New York',   tz:'America/New_York',   flag:'🇺🇸', open:9*60+30, close:16*60,     days:[1,2,3,4,5]},
    {code:'LSE',     name:'Londra',     tz:'Europe/London',      flag:'🇬🇧', open:8*60,    close:16*60+30,  days:[1,2,3,4,5]},
    {code:'FRA',     name:'Frankfurt',  tz:'Europe/Berlin',      flag:'🇩🇪', open:9*60,    close:17*60+30,  days:[1,2,3,4,5]},
    {code:'BIST',    name:'İstanbul',   tz:'Europe/Istanbul',    flag:'🇹🇷', open:10*60,   close:18*60,     days:[1,2,3,4,5]},
    {code:'TSE',     name:'Tokyo',      tz:'Asia/Tokyo',         flag:'🇯🇵', open:9*60,    close:15*60,     days:[1,2,3,4,5]},
    {code:'SSE',     name:'Şanghay',    tz:'Asia/Shanghai',      flag:'🇨🇳', open:9*60+30, close:15*60,     days:[1,2,3,4,5]},
    {code:'HKEX',    name:'Hong Kong',  tz:'Asia/Hong_Kong',     flag:'🇭🇰', open:9*60+30, close:16*60,     days:[1,2,3,4,5]},
    {code:'ASX',     name:'Sidney',     tz:'Australia/Sydney',   flag:'🇦🇺', open:10*60,   close:16*60,     days:[1,2,3,4,5]}
];

function marketStatus(m, now){
    var fmt = new Intl.DateTimeFormat('en-GB', {
        timeZone: m.tz, weekday:'short', hour:'2-digit', minute:'2-digit', hour12:false
    });
    var parts = {};
    fmt.formatToParts(now).forEach(function(p){ parts[p.type] = p.value; });
    var dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    var dow = dayNames.indexOf(parts.weekday);
    var hh = parseInt(parts.hour, 10);
    var mm = parseInt(parts.minute, 10);
    var mins = (isNaN(hh)?0:hh)*60 + (isNaN(mm)?0:mm);
    var isTradingDay = m.days.indexOf(dow) >= 0;
    var isOpen = isTradingDay && mins >= m.open && mins < m.close;

    var toNext = null;
    if(isOpen){
        toNext = m.close - mins; // kapanışa
    } else if(isTradingDay && mins < m.open){
        toNext = m.open - mins;  // bugünkü açılışa
    }
    return {
        open: isOpen,
        timeStr: (parts.hour||'--') + ':' + (parts.minute||'--'),
        toNext: toNext
    };
}

function fmtToNext(mins){
    if(mins == null) return '';
    if(mins <= 0) return '';
    var h = Math.floor(mins/60), m = mins%60;
    if(h === 0) return m + 'd';
    return h + 's ' + m + 'd';
}

function renderMarketClock(now){
    var cells = MARKETS.map(function(m){
        var st = marketStatus(m, now);
        var label = st.open ? 'Açık' : (st.toNext != null ? 'Açılıyor' : 'Kapalı');
        var tail = st.open
            ? '<span class="mkc-tail">Kapanışa ' + fmtToNext(st.toNext) + '</span>'
            : (st.toNext != null ? '<span class="mkc-tail">Açılışa ' + fmtToNext(st.toNext) + '</span>' : '<span class="mkc-tail">Hafta sonu</span>');
        var cls = st.open ? 'open' : 'closed';
        return '<div class="mkc-item ' + cls + '" title="' + escapeHtml(m.name) + ' · ' + m.tz + '">' +
            '<span class="mkc-flag" aria-hidden="true">' + m.flag + '</span>' +
            '<span class="mkc-body">' +
                '<span class="mkc-row1"><span class="mkc-code">' + m.code + '</span><span class="mkc-time">' + st.timeStr + '</span></span>' +
                '<span class="mkc-row2"><span class="mkc-dot"></span>' + label + ' · ' + tail + '</span>' +
            '</span>' +
        '</div>';
    }).join('');
    return '<div class="mkc-grid" role="list" aria-label="Dünya borsa saatleri">' + cells + '</div>';
}

function ensureClockContainer(){
    var existing = document.getElementById('pmClockWrap');
    if(existing) return existing;
    var ticker = document.getElementById('pmTickerWrap');
    var anchor = ticker || findAnchor();
    if(!anchor || !anchor.parentNode) return null;
    var wrap = document.createElement('div');
    wrap.id = 'pmClockWrap';
    wrap.className = 'pm-clock-wrap';
    anchor.parentNode.insertBefore(wrap, anchor.nextSibling);
    return wrap;
}

function tickMarketClock(){
    var wrap = ensureClockContainer();
    if(!wrap) return;
    wrap.innerHTML = renderMarketClock(new Date());
}

function startClock(){
    tickMarketClock();
    setInterval(function(){
        if(document.hidden) return;
        tickMarketClock();
    }, CLOCK_MS);
}

// ======================================================
//  init
// ======================================================
function init(){
    // Ana sayfa/kategori sayfaları dışında anchor yoksa (admin/popup) çalışmasın
    if(!findAnchor()) return;
    try { startTicker(); } catch(e){ console.warn('ticker', e); }
    try { startClock();  } catch(e){ console.warn('clock', e); }
}

if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

window.PMWidgets = {__loaded:true, refreshTicker: refreshTicker, flashEl: flashEl};
})();
