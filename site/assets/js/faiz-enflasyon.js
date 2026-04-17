/**
 * Küresel Faiz & Enflasyon Haritası
 * 50 ülke için politika faizi, enflasyon, reel faiz, 2Y ve 10Y tahvil
 * Leaflet tabanlı circle marker heatmap
 * Veriler: Nisan 2026 — merkez bankası açıklamaları & piyasa verileri
 */
(function(){'use strict';

// ─── ÜLKE VERİLERİ (50 ülke) — Nisan 2026 resmi verileri ───
// rate: politika faizi, infl: TÜFE YoY, m2y/m10y: tahvil getirisi, cb: merkez bankası, move: son karar (hike/cut/hold)
var COUNTRIES = [
    // G7
    {n:'ABD',          flag:'🇺🇸', lat:38.9,  lng:-77.0,  rate:3.75, infl:2.8,  m2y:3.78, m10y:4.31, cb:'Fed',        move:'hold'},
    {n:'Euro Bölgesi', flag:'🇪🇺', lat:50.85, lng:4.35,   rate:2.00, infl:2.6,  m2y:2.55, m10y:3.00, cb:'ECB',        move:'hold'},
    {n:'Japonya',      flag:'🇯🇵', lat:35.68, lng:139.69, rate:0.75, infl:1.3,  m2y:0.95, m10y:2.42, cb:'BoJ',        move:'hike'},
    {n:'İngiltere',    flag:'🇬🇧', lat:51.50, lng:-0.12,  rate:3.75, infl:3.2,  m2y:4.21, m10y:4.75, cb:'BoE',        move:'hold'},
    {n:'Almanya',      flag:'🇩🇪', lat:52.52, lng:13.40,  rate:2.00, infl:2.3,  m2y:2.61, m10y:3.05, cb:'Bundesbank', move:'hold'},
    {n:'Fransa',       flag:'🇫🇷', lat:48.85, lng:2.35,   rate:2.00, infl:2.0,  m2y:2.65, m10y:3.55, cb:'Banque FR',  move:'hold'},
    {n:'İtalya',       flag:'🇮🇹', lat:41.90, lng:12.50,  rate:2.00, infl:1.9,  m2y:2.75, m10y:3.95, cb:'Banca IT',   move:'hold'},
    {n:'Kanada',       flag:'🇨🇦', lat:45.42, lng:-75.70, rate:2.25, infl:1.8,  m2y:2.45, m10y:3.22, cb:'BoC',        move:'hold'},

    // Avrupa (non-EUR)
    {n:'İsviçre',      flag:'🇨🇭', lat:46.95, lng:7.45,   rate:0.00, infl:0.5,  m2y:0.05, m10y:0.55, cb:'SNB',        move:'hold'},
    {n:'İsveç',        flag:'🇸🇪', lat:59.33, lng:18.07,  rate:1.75, infl:1.1,  m2y:1.95, m10y:2.60, cb:'Riksbank',   move:'hold'},
    {n:'Norveç',       flag:'🇳🇴', lat:59.91, lng:10.75,  rate:4.00, infl:3.0,  m2y:3.95, m10y:4.10, cb:'Norges',     move:'hold'},
    {n:'Danimarka',    flag:'🇩🇰', lat:55.68, lng:12.57,  rate:1.60, infl:1.7,  m2y:1.75, m10y:3.10, cb:'DNB',        move:'hold'},
    {n:'Polonya',      flag:'🇵🇱', lat:52.23, lng:21.01,  rate:3.75, infl:3.0,  m2y:4.55, m10y:5.25, cb:'NBP',        move:'hold'},
    {n:'Çekya',        flag:'🇨🇿', lat:50.08, lng:14.42,  rate:3.50, infl:2.5,  m2y:3.45, m10y:4.15, cb:'CNB',        move:'hold'},
    {n:'Macaristan',   flag:'🇭🇺', lat:47.50, lng:19.04,  rate:6.25, infl:4.8,  m2y:6.15, m10y:6.95, cb:'MNB',        move:'hold'},
    {n:'Romanya',      flag:'🇷🇴', lat:44.43, lng:26.10,  rate:6.50, infl:9.3,  m2y:6.85, m10y:7.55, cb:'BNR',        move:'hold'},
    {n:'Rusya',        flag:'🇷🇺', lat:55.75, lng:37.62,  rate:15.00,infl:7.8,  m2y:15.50,m10y:13.80,cb:'CBR',        move:'cut'},
    {n:'Türkiye',      flag:'🇹🇷', lat:39.92, lng:32.85,  rate:37.00,infl:30.87,m2y:39.50,m10y:30.20,cb:'TCMB',       move:'hold'},
    {n:'İzlanda',      flag:'🇮🇸', lat:64.13, lng:-21.89, rate:7.50, infl:4.0,  m2y:7.25, m10y:6.95, cb:'Sedlabanki', move:'hike'},

    // Asya-Pasifik
    {n:'Çin',          flag:'🇨🇳', lat:39.90, lng:116.40, rate:3.00, infl:1.0,  m2y:1.40, m10y:1.80, cb:'PBoC',       move:'hold'},
    {n:'Hindistan',    flag:'🇮🇳', lat:28.61, lng:77.21,  rate:5.25, infl:3.2,  m2y:5.95, m10y:6.45, cb:'RBI',        move:'hold'},
    {n:'Güney Kore',   flag:'🇰🇷', lat:37.57, lng:126.98, rate:2.50, infl:2.3,  m2y:2.45, m10y:2.95, cb:'BoK',        move:'hold'},
    {n:'Tayvan',       flag:'🇹🇼', lat:25.03, lng:121.57, rate:2.00, infl:1.75, m2y:1.40, m10y:1.65, cb:'CBC',        move:'hold'},
    {n:'Avustralya',   flag:'🇦🇺', lat:-35.28,lng:149.13, rate:4.10, infl:3.0,  m2y:4.05, m10y:4.55, cb:'RBA',        move:'hike'},
    {n:'Yeni Zelanda', flag:'🇳🇿', lat:-41.29,lng:174.77, rate:2.25, infl:2.4,  m2y:2.95, m10y:4.10, cb:'RBNZ',       move:'hold'},
    {n:'Endonezya',    flag:'🇮🇩', lat:-6.20, lng:106.84, rate:4.75, infl:2.2,  m2y:5.85, m10y:6.75, cb:'BI',         move:'hold'},
    {n:'Tayland',      flag:'🇹🇭', lat:13.75, lng:100.50, rate:1.00, infl:0.3,  m2y:1.15, m10y:1.85, cb:'BoT',        move:'cut'},
    {n:'Malezya',      flag:'🇲🇾', lat:3.14,  lng:101.68, rate:2.75, infl:1.5,  m2y:3.10, m10y:3.65, cb:'BNM',        move:'hold'},
    {n:'Filipinler',   flag:'🇵🇭', lat:14.60, lng:120.98, rate:4.25, infl:4.1,  m2y:5.25, m10y:6.10, cb:'BSP',        move:'hold'},
    {n:'Vietnam',      flag:'🇻🇳', lat:21.03, lng:105.85, rate:4.50, infl:3.4,  m2y:3.05, m10y:3.25, cb:'SBV',        move:'hold'},
    {n:'Singapur',     flag:'🇸🇬', lat:1.35,  lng:103.82, rate:2.65, infl:1.8,  m2y:2.55, m10y:2.95, cb:'MAS',        move:'hike'},
    {n:'Pakistan',     flag:'🇵🇰', lat:33.69, lng:73.05,  rate:10.50,infl:4.5,  m2y:10.95,m10y:12.10,cb:'SBP',        move:'hold'},

    // Orta Doğu
    {n:'İsrail',       flag:'🇮🇱', lat:31.78, lng:35.22,  rate:4.00, infl:2.9,  m2y:3.95, m10y:4.45, cb:'BoI',        move:'hold'},
    {n:'Suudi Arab.',  flag:'🇸🇦', lat:24.71, lng:46.68,  rate:4.25, infl:2.0,  m2y:4.20, m10y:4.80, cb:'SAMA',       move:'hold'},
    {n:'BAE',          flag:'🇦🇪', lat:24.47, lng:54.37,  rate:3.65, infl:2.1,  m2y:3.75, m10y:4.35, cb:'CBUAE',      move:'hold'},
    {n:'Katar',        flag:'🇶🇦', lat:25.29, lng:51.53,  rate:4.10, infl:1.4,  m2y:4.05, m10y:4.55, cb:'QCB',        move:'hold'},
    {n:'Mısır',        flag:'🇪🇬', lat:30.04, lng:31.24,  rate:19.00,infl:13.4, m2y:22.50,m10y:21.00,cb:'CBE',        move:'hold'},
    {n:'İran',         flag:'🇮🇷', lat:35.69, lng:51.42,  rate:23.00,infl:46.3, m2y:32.00,m10y:29.50,cb:'CBI',        move:'hike'},

    // Amerika
    {n:'Meksika',      flag:'🇲🇽', lat:19.43, lng:-99.13, rate:6.75, infl:4.63, m2y:8.15, m10y:9.45, cb:'Banxico',    move:'cut'},
    {n:'Brezilya',     flag:'🇧🇷', lat:-15.83,lng:-47.86, rate:14.75,infl:3.81, m2y:14.20,m10y:13.85,cb:'BCB',        move:'cut'},
    {n:'Arjantin',     flag:'🇦🇷', lat:-34.61,lng:-58.38, rate:29.00,infl:50.0, m2y:34.00,m10y:28.00,cb:'BCRA',       move:'cut'},
    {n:'Şili',         flag:'🇨🇱', lat:-33.45,lng:-70.67, rate:4.50, infl:4.0,  m2y:4.75, m10y:5.85, cb:'BCCh',       move:'hold'},
    {n:'Peru',         flag:'🇵🇪', lat:-12.05,lng:-77.04, rate:4.25, infl:3.8,  m2y:4.55, m10y:5.95, cb:'BCRP',       move:'hold'},
    {n:'Kolombiya',    flag:'🇨🇴', lat:4.71,  lng:-74.07, rate:11.25,infl:5.8,  m2y:10.45,m10y:11.25,cb:'BanRep',     move:'hike'},

    // Afrika
    {n:'G. Afrika',    flag:'🇿🇦', lat:-25.75,lng:28.19,  rate:7.50, infl:3.5,  m2y:8.15, m10y:10.35,cb:'SARB',       move:'hold'},
    {n:'Nijerya',      flag:'🇳🇬', lat:9.08,  lng:7.49,   rate:26.50,infl:15.1, m2y:22.50,m10y:20.50,cb:'CBN',        move:'cut'},
    {n:'Kenya',        flag:'🇰🇪', lat:-1.29, lng:36.82,  rate:8.75, infl:3.8,  m2y:9.75, m10y:13.85,cb:'CBK',        move:'hold'},
    {n:'Fas',          flag:'🇲🇦', lat:34.02, lng:-6.84,  rate:2.25, infl:0.8,  m2y:2.35, m10y:3.45, cb:'BAM',        move:'hold'},
    {n:'Gana',         flag:'🇬🇭', lat:5.60,  lng:-0.19,  rate:14.00,infl:3.2,  m2y:15.50,m10y:17.50,cb:'BoG',        move:'cut'},
    {n:'Etiyopya',     flag:'🇪🇹', lat:9.03,  lng:38.74,  rate:15.00,infl:9.7,  m2y:13.50,m10y:12.85,cb:'NBE',        move:'hold'}
];

// Reel faiz hesapla
COUNTRIES.forEach(function(c){ c.real = +(c.rate - c.infl).toFixed(2) });

// ─── Renk skalası ───
function heatColor(v, domain){
    // domain = {min, mid, max, low:'#col', high:'#col'}
    // basit: düşük değer soğuk (mavi), yüksek değer sıcak (kırmızı)
    if(v==null||isNaN(v)) return '#94a3b8';
    var t = (v - domain.min) / (domain.max - domain.min);
    t = Math.max(0, Math.min(1, t));
    // colorramp: #2563eb (düşük) → #f1f5f9 (orta) → #dc2626 (yüksek)
    var stops = [
        [0,   [37,99,235]],
        [0.5, [241,245,249]],
        [1,   [220,38,38]]
    ];
    var lower = stops[0], upper = stops[stops.length-1];
    for(var i=0;i<stops.length-1;i++){
        if(t >= stops[i][0] && t <= stops[i+1][0]){ lower=stops[i]; upper=stops[i+1]; break; }
    }
    var range = upper[0] - lower[0];
    var lt = range === 0 ? 0 : (t - lower[0]) / range;
    var r = Math.round(lower[1][0] + (upper[1][0]-lower[1][0])*lt);
    var g = Math.round(lower[1][1] + (upper[1][1]-lower[1][1])*lt);
    var b = Math.round(lower[1][2] + (upper[1][2]-lower[1][2])*lt);
    return 'rgb('+r+','+g+','+b+')';
}

// Reel faiz için: yeşil (pozitif güçlü) → kırmızı (negatif)
function realColor(v){
    if(v==null) return '#94a3b8';
    var t = (v + 10) / 20; // -10..+10 → 0..1
    t = Math.max(0, Math.min(1, t));
    if(t >= 0.5){
        var lt = (t-0.5)*2;
        var r = Math.round(241 + (22-241)*lt);
        var g = Math.round(245 + (163-245)*lt);
        var b = Math.round(249 + (74-249)*lt);
        return 'rgb('+r+','+g+','+b+')';
    } else {
        var lt = 1 - t*2;
        var r = Math.round(241 + (220-241)*lt);
        var g = Math.round(245 + (38-245)*lt);
        var b = Math.round(249 + (38-249)*lt);
        return 'rgb('+r+','+g+','+b+')';
    }
}

var METRICS = {
    rate:  {label:'Politika Faizi',  unit:'%', domain:{min:0, max:40}, sort:'desc'},
    infl:  {label:'Enflasyon (YoY)', unit:'%', domain:{min:0, max:50}, sort:'desc'},
    real:  {label:'Reel Faiz',       unit:'%', color:'real',           sort:'desc'},
    m2y:   {label:'2Y Tahvil',       unit:'%', domain:{min:0, max:40}, sort:'desc'},
    m10y:  {label:'10Y Tahvil',      unit:'%', domain:{min:0, max:35}, sort:'desc'}
};

window.__FE = {COUNTRIES:COUNTRIES, METRICS:METRICS, heatColor:heatColor, realColor:realColor};

})();

// ═════════════════════════════════════════════
// RENDERER — Leaflet haritası + tablo + özet
// ═════════════════════════════════════════════
(function(){'use strict';
var D = window.__FE;
if(!D || typeof L === 'undefined') return;

var state = {metric:'rate', sort:{key:'rate', asc:false}, query:'', onlyPinned:false, pins:{}};
// Kullanıcı tercihleri localStorage'dan geri yükle
try {
    var saved = JSON.parse(localStorage.getItem('fe_state') || 'null');
    if(saved && saved.metric) state.metric = saved.metric;
    if(saved && saved.sort) state.sort = saved.sort;
    if(saved && saved.pins) state.pins = saved.pins;
    if(saved && typeof saved.onlyPinned === 'boolean') state.onlyPinned = saved.onlyPinned;
} catch(e){}
function saveState(){
    try { localStorage.setItem('fe_state', JSON.stringify({metric:state.metric, sort:state.sort, pins:state.pins, onlyPinned:state.onlyPinned})); } catch(e){}
}
function togglePin(name){
    if(state.pins[name]) delete state.pins[name]; else state.pins[name] = true;
    saveState();
    renderTable();
}
var map, markerLayer, pulseLayer, labelLayer, flagLayer;

function initMap(){
    map = L.map('feMap', {
        zoomControl:true, attributionControl:false, worldCopyJump:true,
        preferCanvas:true
    }).setView([39, 35], 2);
    // Light (Positron) tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
        subdomains:'abcd', maxZoom:10, minZoom:2
    }).addTo(map);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
        subdomains:'abcd', maxZoom:10, minZoom:2, pane:'shadowPane', opacity:0.85
    }).addTo(map);
    markerLayer = L.layerGroup().addTo(map);
    pulseLayer = L.layerGroup().addTo(map);
    flagLayer = L.layerGroup().addTo(map);
    labelLayer = L.layerGroup().addTo(map);
}

function colorFor(c){
    var m = state.metric;
    var v = c[m];
    var meta = D.METRICS[m];
    if(meta.color === 'real') return D.realColor(v);
    return D.heatColor(v, meta.domain);
}

function sizeFor(c){
    var m = state.metric;
    var v = Math.abs(c[m]||0);
    return 7 + Math.min(24, v*0.6);
}

function renderMap(){
    markerLayer.clearLayers();
    pulseLayer.clearLayers();
    flagLayer.clearLayers();
    labelLayer.clearLayers();

    // En yüksek 4 ve en düşük 3 ülkeyi tespit et (spotlight için)
    var metric = state.metric;
    var sorted = D.COUNTRIES.slice().sort(function(a,b){return b[metric]-a[metric]});
    var topHot = sorted.slice(0,4).map(function(c){return c.n});
    var topCool = sorted.slice(-3).map(function(c){return c.n});
    var labelSet = {};
    sorted.slice(0,6).concat(sorted.slice(-3)).forEach(function(c){ labelSet[c.n] = true });

    D.COUNTRIES.forEach(function(c){
        var v = c[metric];
        var col = colorFor(c);
        var r = sizeFor(c);
        var isHot = topHot.indexOf(c.n) !== -1;
        var isCool = topCool.indexOf(c.n) !== -1;

        // Main marker
        var m = L.circleMarker([c.lat, c.lng], {
            radius: r,
            fillColor: col,
            color: '#0f172a',
            weight: 1.2,
            fillOpacity: 0.85
        });
        m.bindTooltip(
            '<div style="min-width:160px"><b style="font-size:.85rem">'+c.flag+' '+c.n+'</b><br>'+
            '<small style="color:#2563eb"><b>'+D.METRICS[metric].label+': '+(v||0).toFixed(2)+'%</b></small><br>'+
            '<small style="color:#64748b">Faiz '+c.rate.toFixed(2)+'% · Enfl '+c.infl.toFixed(1)+'% · Reel '+(c.real>=0?'+':'')+c.real.toFixed(2)+'%</small><br>'+
            '<small style="color:#64748b">10Y '+c.m10y.toFixed(2)+'% · '+c.cb+'</small></div>',
            {direction:'top', opacity:1}
        );
        m.on('click', function(){ map.flyTo([c.lat, c.lng], 4, {duration:0.7}) });
        markerLayer.addLayer(m);

        // Pulse halkası — en yüksek 4 ülke için
        if(isHot){
            var pulseSize = Math.max(24, r*2.4);
            var pulse = L.divIcon({
                className:'',
                html:'<div class="fe-pulse-ring" style="width:'+pulseSize+'px;height:'+pulseSize+'px;margin-left:-'+(pulseSize/2)+'px;margin-top:-'+(pulseSize/2)+'px;color:'+col+'"></div>',
                iconSize:[0,0]
            });
            L.marker([c.lat, c.lng], {icon:pulse, interactive:false, keyboard:false}).addTo(pulseLayer);
        }

        // Bayrak emoji — haritada HER ülke için
        // Değer etiketi olan ülkelerde bayrağı alt-sağa koy (çakışmayı önle), diğerlerinde üst-sağa
        var flagOffX = r + 3;
        var flagOffY = labelSet[c.n] ? (r - 2) : -8;
        var flagIcon = L.divIcon({
            className:'',
            html:'<div class="fe-flag-marker" style="position:absolute;left:'+flagOffX+'px;top:'+flagOffY+'px;white-space:nowrap">'+c.flag+'</div>',
            iconSize:[0,0],
            iconAnchor:[0,0]
        });
        L.marker([c.lat, c.lng], {icon:flagIcon, interactive:false, keyboard:false}).addTo(flagLayer);

        // Floating value label — top 6 + bottom 3
        if(labelSet[c.n]){
            var cls = isHot ? 'hot' : (isCool ? 'cool' : '');
            var valTxt = v.toFixed(metric==='infl'?1:2) + '%';
            var offY = r + 14;
            var label = L.divIcon({
                className:'',
                html:'<div class="fe-val-label '+cls+'" style="position:absolute;transform:translate(-50%,-100%);left:0;top:-'+offY+'px;white-space:nowrap">'+valTxt+'</div>',
                iconSize:[0,0],
                iconAnchor:[0,0]
            });
            L.marker([c.lat, c.lng], {icon:label, interactive:false, keyboard:false}).addTo(labelLayer);
        }
    });
    renderLegend();
    var titleEl = document.getElementById('feTitleMetric');
    if(titleEl) titleEl.textContent = D.METRICS[metric].label.toUpperCase();
}

function renderLegend(){
    var m = state.metric;
    var meta = D.METRICS[m];
    var el = document.getElementById('feLegend');
    if(!el) return;
    var stops;
    if(meta.color === 'real'){
        stops = [{v:-10, c:D.realColor(-10)},{v:-5, c:D.realColor(-5)},{v:0, c:D.realColor(0)},{v:5, c:D.realColor(5)},{v:10, c:D.realColor(10)}];
    } else {
        var a = meta.domain.min, b = meta.domain.max, mid = (a+b)/2;
        stops = [
            {v:a, c:D.heatColor(a, meta.domain)},
            {v:(a+mid)/2, c:D.heatColor((a+mid)/2, meta.domain)},
            {v:mid, c:D.heatColor(mid, meta.domain)},
            {v:(mid+b)/2, c:D.heatColor((mid+b)/2, meta.domain)},
            {v:b, c:D.heatColor(b, meta.domain)}
        ];
    }
    el.innerHTML = '<h5>'+meta.label+'</h5>' + stops.map(function(s){
        return '<div class="lg-row"><div class="lg-swatch" style="background:'+s.c+'"></div> '+s.v.toFixed(0)+'%</div>';
    }).join('');
}

function renderSummary(){
    var cs = D.COUNTRIES;
    var avgR = cs.reduce(function(s,c){return s+c.rate},0)/cs.length;
    var avgI = cs.reduce(function(s,c){return s+c.infl},0)/cs.length;
    var avgReal = cs.reduce(function(s,c){return s+c.real},0)/cs.length;
    document.getElementById('fsCount').textContent = cs.length;
    document.getElementById('fsAvgR').textContent = avgR.toFixed(2)+'%';
    document.getElementById('fsAvgI').textContent = avgI.toFixed(2)+'%';
    document.getElementById('fsAvgReal').textContent = avgReal.toFixed(2)+'%';
    var hikes = cs.filter(function(c){return c.move==='hike'}).length;
    var cuts  = cs.filter(function(c){return c.move==='cut'}).length;
    var el = document.getElementById('fsNextHike');
    el.innerHTML = '<span style="color:#dc2626">'+hikes+' ↑</span> · <span style="color:#16a34a">'+cuts+' ↓</span>';
}

function renderLeaders(){
    var m = state.metric;
    var lbl = D.METRICS[m].label;
    document.getElementById('leaderHiLabel').textContent = lbl;
    document.getElementById('leaderLoLabel').textContent = lbl;
    var sorted = D.COUNTRIES.slice().sort(function(a,b){return b[m]-a[m]});
    var hi = sorted.slice(0,6), lo = sorted.slice(-6).reverse();
    function row(c){
        var v = c[m];
        return '<div class="fl-row"><span><span class="fl-flag">'+c.flag+'</span>'+c.n+'</span><span class="fl-num">'+v.toFixed(2)+'%</span></div>';
    }
    document.getElementById('leaderHi').innerHTML = hi.map(row).join('');
    document.getElementById('leaderLo').innerHTML = lo.map(row).join('');
}

function moveTag(m){
    if(m==='hike') return '<span class="pill hike">↑ Artırım</span>';
    if(m==='cut')  return '<span class="pill cut">↓ İndirim</span>';
    return '<span class="pill hold">= Sabit</span>';
}

function filteredCountries(){
    var q = (state.query || '').trim().toLocaleLowerCase('tr');
    return D.COUNTRIES.filter(function(c){
        if(state.onlyPinned && !state.pins[c.n]) return false;
        if(!q) return true;
        return c.n.toLocaleLowerCase('tr').indexOf(q) !== -1 ||
               (c.cb || '').toLocaleLowerCase('tr').indexOf(q) !== -1;
    });
}

function renderTable(){
    var key = state.sort.key;
    var asc = state.sort.asc;
    // Pin sıralama için özel key — önce favoriler, sonra alfabetik
    var arr = filteredCountries().slice().sort(function(a,b){
        if(key === 'pin'){
            var pa = state.pins[a.n]?1:0, pb = state.pins[b.n]?1:0;
            if(pa !== pb) return asc ? pa-pb : pb-pa;
            return a.n.localeCompare(b.n, 'tr');
        }
        // Favoriler her zaman en üstte (sort yönünden bağımsız)
        var pa = state.pins[a.n]?1:0, pb = state.pins[b.n]?1:0;
        if(pa !== pb) return pb-pa;
        var va = a[key], vb = b[key];
        if(typeof va === 'string'){ return asc ? va.localeCompare(vb, 'tr') : vb.localeCompare(va, 'tr'); }
        return asc ? va-vb : vb-va;
    });
    var tb = document.getElementById('feTable');
    var empty = document.getElementById('feEmpty');
    if(empty) empty.hidden = arr.length > 0;
    tb.innerHTML = arr.map(function(c){
        var pinned = state.pins[c.n];
        return '<tr'+(pinned?' class="pinned-row"':'')+'>'+
            '<td class="fe-pin-col"><button type="button" class="fe-pin-btn'+(pinned?' pinned':'')+'" data-pin="'+c.n+'" title="'+(pinned?'Favorilerden çıkar':'Favorilere ekle')+'">'+(pinned?'⭐':'☆')+'</button></td>'+
            '<td><div class="flag-cell"><span class="fcf">'+c.flag+'</span><span>'+c.n+'</span></div></td>'+
            '<td class="num">'+c.rate.toFixed(2)+'</td>'+
            '<td class="num">'+c.infl.toFixed(1)+'</td>'+
            '<td class="num" style="color:'+(c.real>=0?'#16a34a':'#dc2626')+'">'+(c.real>=0?'+':'')+c.real.toFixed(2)+'</td>'+
            '<td class="num">'+c.m10y.toFixed(2)+'</td>'+
            '<td>'+moveTag(c.move)+'</td>'+
            '<td style="color:#64748b;font-size:.72rem">'+c.cb+'</td>'+
        '</tr>';
    }).join('');
    // Pin click handlers
    tb.querySelectorAll('.fe-pin-btn').forEach(function(btn){
        btn.addEventListener('click', function(e){ e.stopPropagation(); togglePin(btn.getAttribute('data-pin')); });
    });
    // header sort indicator
    document.querySelectorAll('.fe-table th').forEach(function(th){
        th.classList.remove('sorted','asc');
        if(th.getAttribute('data-sort') === key){
            th.classList.add('sorted');
            if(asc) th.classList.add('asc');
        }
    });
}

function xmlEsc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function xCell(v){
    if(v==null||v==='')return '<Cell><Data ss:Type="String"></Data></Cell>';
    if(typeof v==='number'&&isFinite(v))return '<Cell><Data ss:Type="Number">'+v+'</Data></Cell>';
    return '<Cell><Data ss:Type="String">'+xmlEsc(v)+'</Data></Cell>';
}
function xRow(cells){return '<Row>'+cells.map(xCell).join('')+'</Row>'}

function exportCsv(){
    var rows = filteredCountries();
    var summaryRows = [];
    summaryRows.push(xRow(['Bayrak','Ülke','Merkez Bankası','Politika Faizi %','Enflasyon %','Reel Faiz %','2Y Tahvil %','10Y Tahvil %','Son Hareket']));
    rows.forEach(function(c){
        summaryRows.push(xRow([
            c.flag, c.n, c.cb,
            Number(c.rate.toFixed(2)), Number(c.infl.toFixed(2)), Number(c.real.toFixed(2)),
            Number(c.m2y.toFixed(2)), Number(c.m10y.toFixed(2)), c.move
        ]));
    });
    // Metriklere göre sıralama sheet'leri
    var metricDefs = [
        {k:'rate', label:'Politika Faizi'},
        {k:'infl', label:'Enflasyon'},
        {k:'real', label:'Reel Faiz'},
        {k:'m10y', label:'10Y Tahvil'}
    ];
    var sheetsXml = '<Worksheet ss:Name="Özet"><Table>'+summaryRows.join('')+'</Table></Worksheet>';
    metricDefs.forEach(function(md){
        var sorted = rows.slice().sort(function(a,b){return b[md.k]-a[md.k]});
        var r=[xRow(['Sıra','Bayrak','Ülke', md.label+' %'])];
        sorted.forEach(function(c,i){r.push(xRow([i+1,c.flag,c.n,Number(c[md.k].toFixed(2))]))});
        sheetsXml += '<Worksheet ss:Name="'+xmlEsc(md.label)+'"><Table>'+r.join('')+'</Table></Worksheet>';
    });
    var xml = '<?xml version="1.0"?>\n<?mso-application progid="Excel.Sheet"?>\n'+
        '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">'+
        sheetsXml+'</Workbook>';
    var blob = new Blob([xml], {type:'application/vnd.ms-excel;charset=utf-8'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'faiz-enflasyon-' + new Date().toISOString().slice(0,10) + '.xls';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
}

// ─── Events ───
document.querySelectorAll('.fe-tab').forEach(function(t){
    t.addEventListener('click', function(){
        document.querySelectorAll('.fe-tab').forEach(function(x){x.classList.remove('active')});
        t.classList.add('active');
        state.metric = t.getAttribute('data-metric');
        state.sort.key = state.metric;
        state.sort.asc = false;
        saveState();
        renderMap();
        renderLeaders();
        renderTable();
    });
});
// Başlangıçta kayıtlı metrik sekmesini aktif et
document.querySelectorAll('.fe-tab').forEach(function(t){
    t.classList.toggle('active', t.getAttribute('data-metric') === state.metric);
});

// Arama kutusu
var searchEl = document.getElementById('feSearch');
var clearBtn = document.getElementById('feSearchClear');
if(searchEl){
    searchEl.addEventListener('input', function(){
        state.query = searchEl.value;
        if(clearBtn) clearBtn.hidden = !state.query;
        renderTable();
    });
}
if(clearBtn){
    clearBtn.addEventListener('click', function(){
        searchEl.value = '';
        state.query = '';
        clearBtn.hidden = true;
        searchEl.focus();
        renderTable();
    });
}
// Favoriler filtresi
var pinToggle = document.getElementById('feOnlyPinned');
if(pinToggle){
    pinToggle.checked = state.onlyPinned;
    pinToggle.addEventListener('change', function(){
        state.onlyPinned = pinToggle.checked;
        saveState();
        renderTable();
    });
}
// CSV export
var csvBtn = document.getElementById('feExportCsv');
if(csvBtn) csvBtn.addEventListener('click', exportCsv);
document.querySelectorAll('.fe-table th').forEach(function(th){
    th.addEventListener('click', function(){
        var k = th.getAttribute('data-sort');
        if(state.sort.key === k) state.sort.asc = !state.sort.asc;
        else { state.sort.key = k; state.sort.asc = false; }
        saveState();
        renderTable();
    });
});

// ─── Init ───
initMap();
renderMap();
renderSummary();
renderLeaders();
renderTable();

})();

