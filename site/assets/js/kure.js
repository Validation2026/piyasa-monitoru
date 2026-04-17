/**
 * 3D Küre — Canlı Finans Dünyası
 * globe.gl + three.js tabanlı interaktif dünya modeli
 * Katmanlar: Borsalar · Ticaret Rotaları · Enerji Boru Hatları · Deniz Kabloları · Darboğazlar
 */
(function(){'use strict';

// ─────────────────────────────────────────────
// VERİ: BÜYÜK DÜNYA BORSALARI
// ─────────────────────────────────────────────
var EXCHANGES = [
    {code:'NYSE',    name:'New York Borsası',   loc:'New York, ABD',    flag:'🇺🇸', lat:40.7069, lng:-74.0113, cap:28.3, tz:'EST',  open:'14:30-21:00 UTC'},
    {code:'NASDAQ',  name:'NASDAQ',             loc:'New York, ABD',    flag:'🇺🇸', lat:40.7500, lng:-73.9900, cap:22.1, tz:'EST',  open:'14:30-21:00 UTC'},
    {code:'LSE',     name:'Londra Borsası',     loc:'Londra, UK',       flag:'🇬🇧', lat:51.5155, lng:-0.0922, cap:3.8,  tz:'GMT',  open:'08:00-16:30 UTC'},
    {code:'EURONEXT',name:'Euronext',           loc:'Paris, FR',        flag:'🇪🇺', lat:48.8698, lng:2.3075,  cap:7.1,  tz:'CET',  open:'07:00-15:30 UTC'},
    {code:'XETRA',   name:'Deutsche Börse',     loc:'Frankfurt, DE',    flag:'🇩🇪', lat:50.1155, lng:8.6842,  cap:2.4,  tz:'CET',  open:'07:00-15:30 UTC'},
    {code:'SIX',     name:'SIX Swiss Exchange', loc:'Zürich, CH',       flag:'🇨🇭', lat:47.3673, lng:8.5372,  cap:2.0,  tz:'CET',  open:'08:00-16:20 UTC'},
    {code:'BIST',    name:'Borsa İstanbul',     loc:'İstanbul, TR',     flag:'🇹🇷', lat:41.0855, lng:29.0083, cap:0.32, tz:'TRT',  open:'07:00-15:00 UTC'},
    {code:'MOEX',    name:'Moskova Borsası',    loc:'Moskova, RU',      flag:'🇷🇺', lat:55.7520, lng:37.6175, cap:0.62, tz:'MSK',  open:'06:50-20:00 UTC'},
    {code:'TADAWUL', name:'Tadawul',            loc:'Riyad, SA',        flag:'🇸🇦', lat:24.7116, lng:46.6753, cap:3.1,  tz:'AST',  open:'07:00-12:00 UTC'},
    {code:'BSE',     name:'Bombay Borsası',     loc:'Mumbai, IN',       flag:'🇮🇳', lat:18.9300, lng:72.8331, cap:4.9,  tz:'IST',  open:'03:45-10:00 UTC'},
    {code:'SSE',     name:'Şanghay Borsası',    loc:'Şanghay, CN',      flag:'🇨🇳', lat:31.2304, lng:121.4737,cap:7.3,  tz:'CST',  open:'01:30-07:00 UTC'},
    {code:'SZSE',    name:'Shenzhen Borsası',   loc:'Shenzhen, CN',     flag:'🇨🇳', lat:22.5429, lng:114.0596,cap:4.7,  tz:'CST',  open:'01:30-07:00 UTC'},
    {code:'HKEX',    name:'Hong Kong Borsası',  loc:'Hong Kong',        flag:'🇭🇰', lat:22.2833, lng:114.1588,cap:4.2,  tz:'HKT',  open:'01:30-08:00 UTC'},
    {code:'TSE',     name:'Tokyo Borsası',      loc:'Tokyo, JP',        flag:'🇯🇵', lat:35.6828, lng:139.7594,cap:6.2,  tz:'JST',  open:'00:00-06:00 UTC'},
    {code:'KRX',     name:'Kore Borsası',       loc:'Seul, KR',         flag:'🇰🇷', lat:37.5170, lng:127.0400,cap:2.1,  tz:'KST',  open:'00:00-06:30 UTC'},
    {code:'ASX',     name:'Avustralya Borsası', loc:'Sidney, AU',       flag:'🇦🇺', lat:-33.8678,lng:151.2073,cap:1.8,  tz:'AEST', open:'23:00-05:00 UTC'},
    {code:'TSX',     name:'Toronto Borsası',    loc:'Toronto, CA',      flag:'🇨🇦', lat:43.6481, lng:-79.3810,cap:3.3,  tz:'EST',  open:'14:30-21:00 UTC'},
    {code:'B3',      name:'B3 Brasil',          loc:'São Paulo, BR',    flag:'🇧🇷', lat:-23.5431,lng:-46.6291,cap:0.9,  tz:'BRT',  open:'13:00-20:00 UTC'},
    {code:'JSE',     name:'Johannesburg Bors.', loc:'Johannesburg, ZA', flag:'🇿🇦', lat:-26.1076,lng:28.0567, cap:1.1,  tz:'SAST', open:'07:00-15:00 UTC'},
    {code:'TWSE',    name:'Tayvan Borsası',     loc:'Taipei, TW',       flag:'🇹🇼', lat:25.0478, lng:121.5318,cap:2.4,  tz:'CST',  open:'01:00-05:30 UTC'},
    {code:'SGX',     name:'Singapur Borsası',   loc:'Singapur',         flag:'🇸🇬', lat:1.2833,  lng:103.8500,cap:0.7,  tz:'SGT',  open:'01:00-09:00 UTC'},
    {code:'DFM',     name:'Dubai Borsası',      loc:'Dubai, AE',        flag:'🇦🇪', lat:25.2200, lng:55.2800, cap:0.18, tz:'GST',  open:'06:00-11:00 UTC'}
];

// ─────────────────────────────────────────────
// VERİ: TİCARET ROTALARI (deniz)
// ─────────────────────────────────────────────
// cargo: oil | lng | cont | grain | mixed
var ROUTES = [
    // Hürmüz → Asya (petrol)
    {name:'Hürmüz → Şanghay',    s:[26.5,56.25], e:[31.23,121.47], cargo:'oil',  vol:'15M bbl/gün'},
    {name:'Hürmüz → Mumbai',     s:[26.5,56.25], e:[18.93,72.83],  cargo:'oil',  vol:'4M bbl/gün'},
    {name:'Hürmüz → Rotterdam',  s:[26.5,56.25], e:[51.95,4.14],   cargo:'oil',  vol:'6M bbl/gün'},
    // Süveyş
    {name:'Süveyş → Rotterdam',  s:[30.75,32.35],e:[51.95,4.14],   cargo:'cont', vol:'30% küresel'},
    {name:'Süveyş → New York',   s:[30.75,32.35],e:[40.47,-74.10], cargo:'cont', vol:'12% küresel'},
    // Kızıldeniz / Bab el-Mandeb
    {name:'Bab-el-Mandeb Hattı', s:[12.58,43.33],e:[30.75,32.35],  cargo:'cont', vol:'12% küresel'},
    // Malakka
    {name:'Malakka → Şanghay',   s:[2.50,102.00],e:[31.23,121.47], cargo:'cont', vol:'25% küresel'},
    {name:'Malakka → Singapur',  s:[2.50,102.00],e:[1.28,103.85],  cargo:'mixed',vol:'hub'},
    // Bosphorus
    {name:'Bosphorus Geçişi',    s:[41.04,29.12],e:[44.61,33.53],  cargo:'grain',vol:'35% buğday'},
    // Panama
    {name:'Panama → Şanghay',    s:[9.08,-79.68],e:[31.23,121.47], cargo:'cont', vol:'6% küresel'},
    {name:'Panama → Rotterdam',  s:[9.08,-79.68],e:[51.95,4.14],   cargo:'cont', vol:'4% küresel'},
    // LNG
    {name:'Katar → Japonya (LNG)',s:[25.29,51.53],e:[35.68,139.76], cargo:'lng',  vol:'77M ton/yıl'},
    {name:'ABD Körfez → AB (LNG)',s:[29.76,-95.37],e:[51.95,4.14],  cargo:'lng',  vol:'85M ton/yıl'},
    // Tahıl
    {name:'Brezilya → Çin',      s:[-23.54,-46.63],e:[31.23,121.47],cargo:'grain',vol:'soya 70M ton'},
    {name:'Ukrayna → Akdeniz',   s:[46.48,30.73],e:[36.72,3.18],   cargo:'grain',vol:'buğday 45M ton'},
    // Transatlantik
    {name:'New York → Londra',   s:[40.47,-74.10],e:[51.5,0.05],   cargo:'mixed',vol:'major'},
    // Çin→Afrika
    {name:'Şanghay → Durban',    s:[31.23,121.47],e:[-29.85,31.02],cargo:'cont', vol:'growing'}
];

// ─────────────────────────────────────────────
// VERİ: ENERJİ BORU HATLARI
// ─────────────────────────────────────────────
var PIPES = [
    {name:'TürkStream',         s:[45.04,36.51],e:[41.76,28.19], kind:'gas'},
    {name:'Mavi Akım',          s:[44.72,37.74],e:[41.48,33.60], kind:'gas'},
    {name:'TANAP',              s:[40.00,43.00],e:[40.98,26.30], kind:'gas'},
    {name:'Nord Stream 1',      s:[60.05,28.78],e:[54.14,13.65], kind:'gas'},
    {name:'Druzhba (Dostluk)',  s:[53.25,50.20],e:[51.30,12.40], kind:'oil'},
    {name:'BTC (Bakü-Ceyhan)',  s:[40.37,49.85],e:[36.82,35.84], kind:'oil'},
    {name:'Güç of Siberia',     s:[56.00,115.00],e:[39.90,116.40],kind:'gas'},
    {name:'Yamal-Avrupa',       s:[66.70,66.70],e:[52.23,21.01], kind:'gas'},
    {name:'Trans-Sahara',       s:[10.00,8.00],e:[36.75,3.05],  kind:'gas'},
    {name:'Keystone XL',        s:[53.50,-113.50],e:[29.76,-95.37],kind:'oil'},
    {name:'EastMed',            s:[34.67,32.98],e:[40.63,22.93], kind:'gas'}
];

// ─────────────────────────────────────────────
// VERİ: DENİZ KABLOLARI (fiber)
// ─────────────────────────────────────────────
var CABLES = [
    {name:'2Africa',          s:[51.50,-0.12],e:[1.28,103.85],  kind:'mega'},
    {name:'MAREA',            s:[39.03,-77.50],e:[43.50,-5.70], kind:'atl'},
    {name:'TPE (Pasifik)',    s:[37.77,-122.42],e:[31.23,121.47],kind:'pac'},
    {name:'SEA-ME-WE 6',      s:[48.85,2.35],e:[1.28,103.85],  kind:'asia'},
    {name:'Dunant (Google)',  s:[40.71,-74.01],e:[46.15,-1.15], kind:'atl'},
    {name:'JUPITER',          s:[34.05,-118.24],e:[35.68,139.76],kind:'pac'},
    {name:'Mediterranean',    s:[41.01,28.95],e:[31.94,34.77], kind:'med'},
    {name:'EllaLink',         s:[38.71,-9.14],e:[-23.54,-46.63],kind:'atl'}
];

// ─────────────────────────────────────────────
// VERİ: STRATEJİK DARBOĞAZLAR
// ─────────────────────────────────────────────
var BOTTLENECKS = [
    {name:'Hürmüz Boğazı',   flag:'🇮🇷', lat:26.57,lng:56.25, risk:85, share:'20% küresel petrol', note:'İran-ABD gerilim hattı'},
    {name:'Bab el-Mandeb',   flag:'🇾🇪', lat:12.58,lng:43.33, risk:78, share:'12% küresel konteyner',note:'Husi saldırı riski'},
    {name:'Süveyş Kanalı',   flag:'🇪🇬', lat:30.75,lng:32.35, risk:45, share:'30% konteyner',      note:'Ever Given tipi blokaj riski'},
    {name:'Malakka Boğazı',  flag:'🇸🇬', lat:2.50, lng:102.00,risk:42, share:'25% küresel ticaret',note:'Çin-ABD Pasifik rekabeti'},
    {name:'Bosphorus',       flag:'🇹🇷', lat:41.04,lng:29.12, risk:55, share:'35% buğday',          note:'Karadeniz tahıl koridoru'},
    {name:'Panama Kanalı',   flag:'🇵🇦', lat:9.08, lng:-79.68,risk:48, share:'6% küresel',          note:'Kuraklık · su seviyesi'},
    {name:'Danimarka Boğazı',flag:'🇩🇰', lat:55.51,lng:10.77, risk:25, share:'Rus petrol çıkışı',   note:'Baltık hareketliliği'},
    {name:'Kerç Boğazı',     flag:'🇺🇦', lat:45.36,lng:36.63, risk:88, share:'Azov denizi geçişi', note:'Aktif çatışma hattı'}
];

// Modülü global erişim için kaydet
window.__KURE = {EXCHANGES:EXCHANGES, ROUTES:ROUTES, PIPES:PIPES, CABLES:CABLES, BOTTLENECKS:BOTTLENECKS};

})();

// ═════════════════════════════════════════════
// RENDERER — Globe.gl
// ═════════════════════════════════════════════
(function(){'use strict';

var D = window.__KURE;
var el = document.getElementById('globeViz');
if(!el) return;

if(!D || typeof Globe === 'undefined'){
    el.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#fbbf24;font-size:.85rem;text-align:center;padding:20px">🌐 Küre yüklenemiyor. Tarayıcının WebGL desteklediğinden ve <code>unpkg.com</code>\'a erişebildiğinden emin olun.</div>';
    return;
}

// Hex → rgb helper (ringColor için)
function hexRgb(h){
    h = h.replace('#','');
    if(h.length===3) h = h.split('').map(function(c){return c+c}).join('');
    return {r:parseInt(h.substr(0,2),16), g:parseInt(h.substr(2,2),16), b:parseInt(h.substr(4,2),16)};
}

// Renk paleti
var C = {
    route:{oil:'#ef4444', lng:'#60a5fa', cont:'#fbbf24', grain:'#22c55e', mixed:'#f472b6'},
    pipe:{oil:'#3b82f6', gas:'#06b6d4'},
    cable:{mega:'#a78bfa', atl:'#c084fc', pac:'#e879f9', asia:'#f472b6', med:'#fb7185'},
    exchange:'#22c55e',
    bottleneck:'#ef4444'
};

// ─── Points: Borsalar + Darboğazlar birleşik ───
var pointsAll = [];
D.EXCHANGES.forEach(function(x){
    pointsAll.push({
        type:'ex', lat:x.lat, lng:x.lng,
        size:Math.max(0.25, Math.sqrt(x.cap)*0.18),
        color:C.exchange, label:x.flag+' '+x.code,
        data:x
    });
});
D.BOTTLENECKS.forEach(function(b){
    pointsAll.push({
        type:'bn', lat:b.lat, lng:b.lng,
        size:0.4 + (b.risk/100)*0.5,
        color:C.bottleneck, label:b.flag+' '+b.name,
        data:b
    });
});

// ─── Arcs: Rotalar + Borular + Kablolar birleşik ───
function arcsOf(list, type, colorPick){
    return list.map(function(r){
        return {
            type:type,
            startLat:r.s[0], startLng:r.s[1],
            endLat:r.e[0],   endLng:r.e[1],
            color:colorPick(r),
            data:r
        };
    });
}

var arcsRoute = arcsOf(D.ROUTES, 'route', function(r){return C.route[r.cargo]||'#fff'});
var arcsPipe  = arcsOf(D.PIPES,  'pipe',  function(r){return C.pipe[r.kind]||'#3b82f6'});
var arcsCable = arcsOf(D.CABLES, 'cable', function(r){return C.cable[r.kind]||'#a78bfa'});

// ─── Rings: sadece en büyük 3 borsa (çok sakin nabız) ───
var rings = D.EXCHANGES.slice().sort(function(a,b){return b.cap-a.cap}).slice(0,3).map(function(x){
    return {lat:x.lat, lng:x.lng, maxR:2.2 + x.cap/10, propSpeed:0.4, repeatPeriod:4500, color:'#22c55e'};
});

// ─── Labels (sadece en büyük 3 borsa — minimum gürültü) ───
var labels = D.EXCHANGES.slice().sort(function(a,b){return b.cap-a.cap}).slice(0,3).map(function(x){
    return {lat:x.lat, lng:x.lng, text:x.code, size:0.38, color:'#fbbf24', alt:0.02};
});

// State — ilk açılışta sadece borsalar görünsün (temiz görünüm)
var state = {
    layers:{ex:true, tr:false, en:false, ca:false},
    rotating:true
};

// Globe init — önce boyutla, sonra görsel/data
var globe;
try {
    globe = Globe()(el);
} catch(e){
    console.error('Globe init failed:', e);
    el.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#fbbf24;font-size:.85rem">🌐 Küre başlatılamadı: '+e.message+'</div>';
    return;
}

// Önce boyut (texture yüklenmeden canvas yaratılsın)
globe.width(el.clientWidth || 800).height(el.clientHeight || 600);

globe.backgroundColor('rgba(0,0,0,0)')
    .showAtmosphere(true)
    .atmosphereColor('#60a5fa')
    .atmosphereAltitude(0.14)
    .globeImageUrl('//unpkg.com/three-globe/example/img/earth-night.jpg')
    .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png');

globe.pointAltitude('size')
    .pointRadius(0.3)
    .pointColor('color')
    .pointLabel(function(d){return '<div style="font:600 12px sans-serif;background:rgba(15,23,42,.9);color:#fff;padding:6px 10px;border-radius:6px;border:1px solid #3b82f6">'+d.label+'</div>'})
    .pointsMerge(false)
    .onPointClick(function(p){showInfo(p)});

globe.arcColor('color')
    .arcAltitudeAutoScale(0.4)
    .arcStroke(0.18)
    .arcDashLength(0.25)
    .arcDashGap(0.45)
    .arcDashAnimateTime(function(d){return d.type==='route'?8000:d.type==='pipe'?11000:13000})
    .arcLabel(function(d){
        if(d.type==='route') return '🚢 '+d.data.name+' · '+d.data.vol;
        if(d.type==='pipe') return '⚡ '+d.data.name+' ('+d.data.kind.toUpperCase()+')';
        return '🔌 '+d.data.name;
    });

globe.ringColor(function(r){
        var rgb = hexRgb(r.color);
        return function(t){ return 'rgba('+rgb.r+','+rgb.g+','+rgb.b+','+(1-t).toFixed(2)+')'; };
    })
    .ringMaxRadius('maxR')
    .ringPropagationSpeed('propSpeed')
    .ringRepeatPeriod('repeatPeriod');

globe.labelText('text')
    .labelSize('size')
    .labelColor(function(d){return d.color})
    .labelAltitude('alt')
    .labelResolution(2);

globe.pointsData(pointsAll).ringsData(rings).labelsData(labels);
applyArcs();

// Kontroller — yavaş, sakin dönüş
var ctrl = globe.controls();
ctrl.autoRotate = true;
ctrl.autoRotateSpeed = 0.15;
ctrl.enableDamping = true;
ctrl.dampingFactor = 0.06;

// İlk kamera pozisyonu — mobilde biraz daha uzaklaş
var initAlt = window.innerWidth < 640 ? 2.9 : 2.4;
globe.pointOfView({lat:35, lng:30, altitude:initAlt}, 1200);

// HUD toggle (mobilde)
var hudEl = document.getElementById('globeHud');
var hudTog = document.getElementById('hudToggle');
if(hudTog && hudEl){
    hudTog.addEventListener('click', function(){
        hudEl.classList.toggle('collapsed');
        hudTog.textContent = hudEl.classList.contains('collapsed') ? '▸' : '▾';
    });
    if(window.innerWidth < 640) hudEl.classList.add('collapsed'), hudTog.textContent='▸';
}

function applyArcs(){
    var arr = [];
    if(state.layers.tr) arr = arr.concat(arcsRoute);
    if(state.layers.en) arr = arr.concat(arcsPipe);
    if(state.layers.ca) arr = arr.concat(arcsCable);
    globe.arcsData(arr);
    var pts = state.layers.ex ? pointsAll : pointsAll.filter(function(p){return p.type==='bn'});
    globe.pointsData(pts);
}

// Katman butonları
document.querySelectorAll('.gbtn[data-layer]').forEach(function(btn){
    btn.addEventListener('click', function(){
        var l = btn.getAttribute('data-layer');
        document.querySelectorAll('.gbtn[data-layer]').forEach(function(b){b.classList.remove('active')});
        btn.classList.add('active');
        if(l==='all'){ state.layers={ex:true,tr:true,en:true,ca:true}; }
        else if(l==='ex'){ state.layers={ex:true,tr:false,en:false,ca:false}; }
        else if(l==='tr'){ state.layers={ex:true,tr:true,en:false,ca:false}; }
        else if(l==='en'){ state.layers={ex:true,tr:false,en:true,ca:false}; }
        else if(l==='ca'){ state.layers={ex:true,tr:false,en:false,ca:true}; }
        applyArcs();
    });
});

// Rotate toggle
var rotBtn = document.getElementById('rotToggle');
if(rotBtn){
    rotBtn.addEventListener('click', function(){
        state.rotating = !state.rotating;
        ctrl.autoRotate = state.rotating;
        rotBtn.textContent = state.rotating ? '⏸ Dönüş' : '▶ Dönüş';
    });
}

// Home button
var homeBtn = document.getElementById('homeBtn');
if(homeBtn){
    homeBtn.addEventListener('click', function(){
        globe.pointOfView({lat:35, lng:30, altitude:2.4}, 900);
    });
}

// Info panel
function showInfo(p){
    var inf = document.getElementById('globeInfo');
    var t = document.getElementById('giTitle');
    var b = document.getElementById('giBody');
    if(!inf||!t||!b) return;
    if(p.type==='ex'){
        var x = p.data;
        t.textContent = x.flag+' '+x.name;
        b.innerHTML =
            '<div class="gi-row"><span>Lokasyon</span><span>'+x.loc+'</span></div>'+
            '<div class="gi-row"><span>Kod</span><span>'+x.code+'</span></div>'+
            '<div class="gi-row"><span>Piyasa Değeri</span><span>'+x.cap+' T USD</span></div>'+
            '<div class="gi-row"><span>Zaman Dilimi</span><span>'+x.tz+'</span></div>'+
            '<div class="gi-row"><span>Açık Saatler</span><span>'+x.open+'</span></div>';
    } else {
        var bk = p.data;
        t.textContent = bk.flag+' '+bk.name;
        b.innerHTML =
            '<div class="gi-row"><span>Pay</span><span>'+bk.share+'</span></div>'+
            '<div class="gi-row"><span>Risk Skoru</span><span style="color:'+(bk.risk>70?'#f87171':bk.risk>40?'#fbbf24':'#4ade80')+'">'+bk.risk+'/100</span></div>'+
            '<div class="gi-row"><span>Durum</span><span>'+bk.note+'</span></div>';
    }
    inf.classList.add('show');
    globe.pointOfView({lat:p.lat, lng:p.lng, altitude:1.6}, 900);
}
var closeBtn = document.getElementById('giClose');
if(closeBtn) closeBtn.addEventListener('click', function(){
    document.getElementById('globeInfo').classList.remove('show');
});

// Resize handling
function resize(){
    var w = el.clientWidth;
    var h = el.clientHeight;
    globe.width(w).height(h);
}
window.addEventListener('resize', resize);
resize();

// Metric counters
function setVal(id,v){var e=document.getElementById(id);if(e)e.textContent=v}
setVal('mBorsa', D.EXCHANGES.length);
setVal('mRota',  D.ROUTES.length);
setVal('mBoru',  D.PIPES.length);
setVal('mKablo', D.CABLES.length);
setVal('mDar',   D.BOTTLENECKS.length);

// Borsa kartları
var eg = document.getElementById('exGrid');
if(eg){
    eg.innerHTML = D.EXCHANGES.slice().sort(function(a,b){return b.cap-a.cap}).map(function(x){
        return '<div class="ex-card" data-code="'+x.code+'">'+
            '<div class="ex-flag">'+x.flag+'</div>'+
            '<div><div class="ex-name">'+x.name+'</div><div class="ex-loc">'+x.loc+' · '+x.cap+'T USD</div></div>'+
        '</div>';
    }).join('');
    eg.querySelectorAll('.ex-card').forEach(function(c){
        c.addEventListener('click', function(){
            var code = c.getAttribute('data-code');
            var x = D.EXCHANGES.find(function(e){return e.code===code});
            if(x) showInfo({type:'ex', lat:x.lat, lng:x.lng, data:x});
        });
    });
}

// Darboğaz kartları
var bg = document.getElementById('bnGrid');
if(bg){
    bg.innerHTML = D.BOTTLENECKS.slice().sort(function(a,b){return b.risk-a.risk}).map(function(b){
        var col = b.risk>70?'#ef4444':b.risk>40?'#f59e0b':'#22c55e';
        return '<div class="bn-card">'+
            '<div class="bn-head"><span class="bn-flag">'+b.flag+'</span><span class="bn-name">'+b.name+'</span></div>'+
            '<div class="bn-sub">'+b.share+' · '+b.note+'</div>'+
            '<div class="bn-bar"><div class="bn-fill" style="width:'+b.risk+'%;background:'+col+'"></div></div>'+
        '</div>';
    }).join('');
}

})();

