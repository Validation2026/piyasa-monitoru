/**
 * Jeopolitik Risk Haritası — canlı veri mantığı
 * Veri kaynağı: /api/page-state?page=jeopolitik-risk (admin düzenler)
 * Haber kaynağı: /api/rss-proxy (Google News)
 */
(function(){'use strict';

// Admin kaydetmediyse kullanılacak başlangıç verisi (Nisan 2026 itibarıyla)
var SEED = [
    {id:'iran-israil',name:'İran – İsrail',flag:'🇮🇷🇮🇱',lat:32,lng:43,level:4,
     status:'Şubat 2026\'dan beri aktif savaş. İsrail hava operasyonları ve İran balistik füze karşılıkları sürüyor. ABD 5. Filo bölgede konuşlu.',
     assets:['BRENT','XAU','VIX','DXY'],
     keywords:'İran İsrail savaş OR Tel Aviv saldırı OR İsfahan',
     updatedAt:'2026-04-15T10:00:00Z'},
    {id:'hurmuz',name:'Hürmüz Boğazı',flag:'⚓',lat:26.56,lng:56.24,level:4,
     status:'Dünya petrolünün %20\'si buradan geçiyor. İran donanma hareketleri ve tanker takibi yüksek tansiyonlu.',
     assets:['BRENT','WTI','LNG'],
     keywords:'Hürmüz Boğazı tanker OR Strait of Hormuz',
     updatedAt:'2026-04-16T08:00:00Z'},
    {id:'kizildeniz',name:'Kızıldeniz / Bab el-Mandeb',flag:'🚢',lat:12.58,lng:43.33,level:3,
     status:'Husi saldırıları sürüyor. Konteyner hatları Ümit Burnu\'na yönelmiş durumda; navlun ve sigorta primleri yüksek.',
     assets:['BRENT','Navlun','TTF'],
     keywords:'Husi Kızıldeniz saldırı OR Bab el-Mandeb',
     updatedAt:'2026-04-14T14:30:00Z'},
    {id:'ukrayna-rusya',name:'Ukrayna – Rusya',flag:'🇺🇦🇷🇺',lat:48.5,lng:35,level:3,
     status:'Cephe hattı göreli durgun ancak insansız hava aracı saldırıları ve enerji altyapısına yönelik vurular devam ediyor.',
     assets:['TTF','BRENT','Buğday','EUR'],
     keywords:'Ukrayna Rusya cephe OR Kiev saldırı',
     updatedAt:'2026-04-15T17:00:00Z'},
    {id:'tayvan',name:'Tayvan Boğazı',flag:'🇹🇼🇨🇳',lat:24,lng:121,level:2,
     status:'Çin hava sahası ihlalleri rutine bindi. ABD donanma geçişleri sürüyor. Yarı iletken tedariki üzerinde sürekli baskı.',
     assets:['TSMC','SOXX','USD/CNY'],
     keywords:'Tayvan Çin gerginlik OR Taiwan Strait',
     updatedAt:'2026-04-13T09:00:00Z'},
    {id:'g-cin-denizi',name:'Güney Çin Denizi',flag:'🇨🇳🇵🇭',lat:15,lng:117,level:2,
     status:'Çin-Filipinler arasında Scarborough Shoal ve Spratly Adaları çevresinde su topu/çarpma olayları.',
     assets:['FXI','Konteyner','USD/PHP'],
     keywords:'South China Sea Filipinler OR Scarborough',
     updatedAt:'2026-04-12T11:00:00Z'},
    {id:'kore',name:'Kore Yarımadası',flag:'🇰🇵🇰🇷',lat:39,lng:127,level:2,
     status:'K. Kore balistik füze testlerini artırdı. G. Kore-Japonya-ABD üçlü tatbikatları yanıt niteliğinde.',
     assets:['KOSPI','USD/KRW','Savunma'],
     keywords:'Kuzey Kore füze OR North Korea missile',
     updatedAt:'2026-04-14T06:00:00Z'},
    {id:'sahel',name:'Sahel Bölgesi',flag:'🌍',lat:15,lng:0,level:2,
     status:'Mali, Burkina Faso, Nijer\'de darbe sonrası istikrarsızlık. Uranyum ve altın arzı baskı altında.',
     assets:['URANYUM','XAU'],
     keywords:'Sahel Nijer darbe OR Mali güvenlik',
     updatedAt:'2026-04-10T12:00:00Z'}
];

var LVL_TEXT = {1:'DÜŞÜK',2:'ORTA',3:'YÜKSEK',4:'KRİTİK'};
var LVL_COLOR = {1:'#22c55e',2:'#eab308',3:'#f59e0b',4:'#dc2626'};

function timeAgo(iso){
    if(!iso) return '—';
    var t = new Date(iso).getTime();
    if(isNaN(t)) return '—';
    var diff = (Date.now()-t)/1000;
    if(diff < 3600) return Math.floor(diff/60)+' dk önce';
    if(diff < 86400) return Math.floor(diff/3600)+' saat önce';
    var d = Math.floor(diff/86400);
    return d+' gün önce';
}
function isStale(iso){
    if(!iso) return true;
    var t = new Date(iso).getTime();
    if(isNaN(t)) return true;
    return (Date.now()-t) > 7*86400*1000; // 7 günden eski
}

// Veri yükle: önce admin'den dene, yoksa seed
function loadHotspots(cb){
    fetch('/api/page-state?page=jeopolitik-risk',{cache:'no-store'})
    .then(function(r){return r.json()})
    .then(function(d){
        var hs = d && d.overrides && Array.isArray(d.overrides.hotspots) ? d.overrides.hotspots : null;
        cb(hs && hs.length ? hs : SEED);
    })
    .catch(function(){ cb(SEED); });
}

// Global ref
window.__JEO = {SEED:SEED, LVL_TEXT:LVL_TEXT, LVL_COLOR:LVL_COLOR, timeAgo:timeAgo, isStale:isStale, loadHotspots:loadHotspots};

// ═══════════════════════════════════════
// HARITA — çok katmanlı: rotalar, çatışma hatları, ikincil işaretler, hotspot'lar
// ═══════════════════════════════════════
var CONFLICT_LINES = [
    // [from, to, style, popup]
    {pts:[[32,53],[31.5,34.8]], color:'#dc2626', name:'İran ↔ İsrail (karşılıklı saldırı)'},
    {pts:[[50,36],[48.5,35]], color:'#dc2626', name:'Rusya → Ukrayna cephesi'},
    {pts:[[15,45],[13,43]], color:'#dc2626', name:'Husi → Kızıldeniz saldırıları'},
    {pts:[[40,125],[37,127]], color:'#eab308', name:'K. Kore füze testleri → G. Kore'},
    {pts:[[23,117],[25,121]], color:'#eab308', name:'Çin tatbikat alanı → Tayvan'}
];

var AFFECTED_ROUTES = [
    // Kızıldeniz → Ümit Burnu alternatif (kırmızı etkilenen + yeşil alternatif)
    {pts:[[26.5,56],[22,58],[12.5,43.3],[15,41],[30.4,32.3],[35,20],[36,5]], color:'#f59e0b', name:'Basra → Avrupa (Süveyş/Kızıldeniz)', affected:true},
    {pts:[[26.5,56],[22,58],[12,50],[-5,45],[-34,18],[-10,0],[36,5]], color:'#22c55e', name:'Basra → Avrupa (Ümit Burnu alternatif)', dashed:true},
    {pts:[[26.5,56],[22,62],[15,68],[5,75],[1.3,103.8],[23,118]], color:'#f59e0b', name:'Basra → Asya'},
    {pts:[[45,36],[41,29],[36,25],[36,5]], color:'#f59e0b', name:'Karadeniz tahıl koridoru'},
    {pts:[[23,120],[25,122],[35,130],[37,127]], color:'#eab308', name:'Tayvan yarı iletken lojistiği'}
];

var NAVAL_FORCES = [
    {lat:25,lng:55,icon:'⚓',name:'ABD 5. Filo — Basra Körfezi',info:'2 uçak gemisi grubu konuşlu'},
    {lat:14,lng:52,icon:'⚓',name:'Koalisyon donanması — Aden',info:'Kızıldeniz ticaret koruması'},
    {lat:37,lng:24,icon:'⚓',name:'NATO — Doğu Akdeniz',info:'Daimi devriye gücü'},
    {lat:24,lng:123,icon:'⚓',name:'ABD 7. Filo — Okinawa',info:'Tayvan Boğazı geçişleri'}
];

var ENERGY_INFRA = [
    {lat:33,lng:48,icon:'🛢️',name:'İsfahan / Natanz',info:'İran nükleer tesisleri (vurulan)'},
    {lat:26,lng:50,icon:'🛢️',name:'Ras Tanura',info:'Suudi petrol terminali'},
    {lat:50,lng:30,icon:'🛢️',name:'Ukrayna enerji ağı',info:'Rus saldırıları altında'},
    {lat:60,lng:5,icon:'🛢️',name:'Norveç Kuzey Denizi',info:'Avrupa gaz tedariki'}
];

var SANCTION_ZONES = [
    {center:[55,60], radius:1500000, color:'#6366f1', name:'Rusya — Batı yaptırımları'},
    {center:[32,53], radius:800000, color:'#a855f7', name:'İran — OFAC yaptırımları'},
    {center:[40,127], radius:400000, color:'#a855f7', name:'K. Kore — BMGK yaptırımları'}
];

function renderMap(hotspots){
    var map = L.map('geoMap',{scrollWheelZoom:false,worldCopyJump:true,minZoom:2}).setView([28,45],3);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',{maxZoom:10,attribution:'© OpenStreetMap © CARTO'}).addTo(map);

    // 1. Yaptırım bölgesi halkaları (altta)
    SANCTION_ZONES.forEach(function(z){
        L.circle(z.center,{
            radius: z.radius,
            color: z.color,
            fillColor: z.color,
            fillOpacity: .06,
            weight: 1,
            dashArray: '4,6'
        }).addTo(map).bindPopup('<b>'+z.name+'</b>');
    });

    // 2. Etkilenen ve alternatif ticaret rotaları
    AFFECTED_ROUTES.forEach(function(r){
        L.polyline(r.pts,{
            color: r.color,
            weight: r.dashed ? 2.5 : 3,
            opacity: .75,
            dashArray: r.dashed ? '6,8' : null,
            className: r.affected ? 'animated-route' : ''
        }).addTo(map).bindPopup('<b>'+r.name+'</b>');
    });

    // 3. Çatışma hatları (kırmızı kalın)
    CONFLICT_LINES.forEach(function(cl){
        L.polyline(cl.pts,{
            color: cl.color,
            weight: 3.5,
            opacity: .85,
            dashArray: '2,6'
        }).addTo(map).bindPopup('<b>⚔️ '+cl.name+'</b>');
    });

    // 4. Donanma konuşlanmaları
    NAVAL_FORCES.forEach(function(n){
        L.marker([n.lat,n.lng],{
            icon: L.divIcon({
                html:'<div style="font-size:1.2rem;text-shadow:0 0 3px #fff,0 0 3px #fff">'+n.icon+'</div>',
                className:'',
                iconSize:[24,24],
                iconAnchor:[12,12]
            })
        }).addTo(map).bindPopup('<b>'+n.name+'</b><br><small>'+n.info+'</small>');
    });

    // 5. Enerji altyapısı
    ENERGY_INFRA.forEach(function(e){
        L.marker([e.lat,e.lng],{
            icon: L.divIcon({
                html:'<div style="font-size:1rem;text-shadow:0 0 3px #fff,0 0 3px #fff">'+e.icon+'</div>',
                className:'',
                iconSize:[20,20],
                iconAnchor:[10,10]
            })
        }).addTo(map).bindPopup('<b>'+e.name+'</b><br><small>'+e.info+'</small>');
    });

    // 6. Hotspot'lar (en üstte, pulse efektli)
    hotspots.forEach(function(h){
        var color = LVL_COLOR[h.level] || '#94a3b8';
        var marker = L.circleMarker([h.lat,h.lng],{
            radius: 10 + h.level*2,
            color: color,
            fillColor: color,
            fillOpacity: .55,
            weight: 3,
            className: h.level >= 4 ? 'pulse-crit' : ''
        }).addTo(map);
        var pop = '<b>'+h.flag+' '+h.name+'</b><br>'+
                  '<span style="color:'+color+';font-weight:700;font-size:.7rem">'+LVL_TEXT[h.level]+'</span><br>'+
                  '<small>'+(h.status||'')+'</small><br>'+
                  '<small style="color:#94a3b8">Güncelleme: '+timeAgo(h.updatedAt)+'</small>';
        marker.bindPopup(pop);
    });
}

// ═══════════════════════════════════════
// KARTLAR
// ═══════════════════════════════════════
function renderCards(hotspots){
    // Seviyeye göre sırala (kritik önce)
    var sorted = hotspots.slice().sort(function(a,b){return (b.level||0)-(a.level||0)});
    var html = sorted.map(function(h,i){
        var assets = (h.assets||[]).map(function(a){return '<span class="hot-asset">'+a+'</span>'}).join('');
        var staleCls = isStale(h.updatedAt) ? ' hot-stale' : '';
        var staleText = isStale(h.updatedAt) ? '⚠️ ' : '';
        return '<div class="hot lv-'+h.level+'" style="animation-delay:'+(i*0.04+0.1)+'s" data-id="'+h.id+'">'+
               '<div class="hot-h">'+
                 '<span class="hot-flag">'+h.flag+'</span>'+
                 '<span class="hot-name">'+h.name+'</span>'+
                 '<span class="hot-lvl">'+LVL_TEXT[h.level]+'</span>'+
               '</div>'+
               '<div class="hot-status">'+(h.status||'—')+'</div>'+
               (assets ? '<div class="hot-assets">'+assets+'</div>' : '')+
               '<div class="hot-meta">'+
                 '<span class="'+staleCls.trim()+'">'+staleText+'Güncelleme: '+timeAgo(h.updatedAt)+'</span>'+
                 '<span>Seviye '+h.level+'/4</span>'+
               '</div>'+
               '</div>';
    }).join('');
    document.getElementById('hotGrid').innerHTML = html;
}

// ═══════════════════════════════════════
// CANLI HABER AKIŞI
// ═══════════════════════════════════════
function fetchNewsFor(hotspot){
    if(!hotspot.keywords) return Promise.resolve([]);
    return fetch('/api/rss-proxy?q='+encodeURIComponent(hotspot.keywords))
        .then(function(r){return r.json()})
        .then(function(d){
            var items = (d.items||[]).slice(0,3);
            return items.map(function(it){ it.tag = hotspot.name; it.tagId = hotspot.id; return it; });
        })
        .catch(function(){ return []; });
}

function renderNews(hotspots){
    var feed = document.getElementById('newsFeed');
    // En yüksek seviyeli 5 bölgenin haberlerini çek
    var top = hotspots.slice().sort(function(a,b){return (b.level||0)-(a.level||0)}).slice(0,5);
    Promise.all(top.map(fetchNewsFor)).then(function(results){
        var all = [];
        results.forEach(function(arr){ all = all.concat(arr); });
        // Son 48 saati filtrele
        var cutoff = Date.now() - 48*3600*1000;
        all = all.filter(function(it){
            if(!it.date) return true;
            var t = new Date(it.date).getTime();
            return isNaN(t) || t >= cutoff;
        });
        // Tarihe göre sırala
        all.sort(function(a,b){
            var ta = new Date(a.date||0).getTime();
            var tb = new Date(b.date||0).getTime();
            return tb - ta;
        });
        all = all.slice(0,20);
        if(!all.length){
            feed.innerHTML = '<div style="font-size:.78rem;color:#94a3b8">Son 48 saat için haber bulunamadı.</div>';
            return;
        }
        feed.innerHTML = all.map(function(it){
            var when = it.date ? timeAgo(it.date) : '';
            return '<div class="news-item">'+
                   '<a href="'+it.link+'" target="_blank" rel="noopener">'+it.title+'</a>'+
                   '<div class="news-meta">'+
                     '<span class="news-tag">'+it.tag+'</span>'+
                     (it.source ? '<span>'+it.source+'</span>' : '')+
                     (when ? '<span>'+when+'</span>' : '')+
                   '</div>'+
                   '</div>';
        }).join('');
    });
}

// ═══════════════════════════════════════
// AI ANALİZ KUTUSU
// ═══════════════════════════════════════
function loadAI(){
    fetch('/api/ai-analysis?cat=jeopolitik-risk').then(function(r){return r.json()}).then(function(d){
        if(d.analysis) document.getElementById('aiBox').textContent = d.analysis;
    }).catch(function(){});
}

// ═══════════════════════════════════════
// ÜST KPI SATIRI
// ═══════════════════════════════════════
function renderKPIs(hotspots){
    var count = hotspots.length || 1;
    var avg = hotspots.reduce(function(s,h){return s+(h.level||0)},0) / count;
    var crit = hotspots.filter(function(h){return h.level===4}).length;
    var high = hotspots.filter(function(h){return h.level===3}).length;
    var freshest = hotspots.reduce(function(best,h){
        var t = h.updatedAt ? new Date(h.updatedAt).getTime() : 0;
        return t > best ? t : best;
    }, 0);
    var tensionIdx = Math.round(avg*25); // 1-4 → 25-100
    var tensionCls = tensionIdx >= 75 ? 'crit' : (tensionIdx >= 50 ? 'warn' : 'ok');
    var freshCls = freshest && (Date.now()-freshest) < 48*3600*1000 ? 'ok' : (freshest && (Date.now()-freshest) < 7*86400*1000 ? 'warn' : 'crit');
    var freshTxt = freshest ? timeAgo(new Date(freshest).toISOString()) : '—';

    var html = ''+
        '<div class="kpi-cell '+tensionCls+'"><div class="kpi-l">Gerilim Endeksi</div><div class="kpi-v">'+tensionIdx+'<span style="font-size:.8rem;color:#94a3b8">/100</span></div><div class="kpi-s">Ortalama seviye '+avg.toFixed(1)+'/4</div></div>'+
        '<div class="kpi-cell crit"><div class="kpi-l">Kritik Bölge</div><div class="kpi-v">'+crit+'</div><div class="kpi-s">Aktif çatışma / kapanma riski</div></div>'+
        '<div class="kpi-cell warn"><div class="kpi-l">Yüksek Risk</div><div class="kpi-v">'+high+'</div><div class="kpi-s">Yakın izleme gerektiren</div></div>'+
        '<div class="kpi-cell"><div class="kpi-l">Takipteki Bölge</div><div class="kpi-v">'+count+'</div><div class="kpi-s">Toplam gerilim noktası</div></div>'+
        '<div class="kpi-cell '+freshCls+'"><div class="kpi-l">Son Güncelleme</div><div class="kpi-v" style="font-size:1rem">'+freshTxt+'</div><div class="kpi-s">En taze bölge kaydı</div></div>';
    document.getElementById('kpiRow').innerHTML = html;
}

// ═══════════════════════════════════════
// ETKİLENEN VARLIKLAR PANELİ
// ═══════════════════════════════════════
function renderAssets(hotspots){
    // Hotspot'larda geçen varlıkları sayıp en çok etkilenenleri çıkar
    var counts = {};
    hotspots.forEach(function(h){
        (h.assets||[]).forEach(function(a){ counts[a] = (counts[a]||0) + (h.level||1); });
    });

    var META = {
        'BRENT':{icon:'🛢️',note:'Risk primi fiyatlamaya dahil, Hürmüz hassasiyeti yüksek'},
        'WTI':{icon:'🛢️',note:'ABD stratejik rezerv ve OPEC+ kararları belirleyici'},
        'XAU':{icon:'🥇',note:'Güvenli liman talebi + merkez bankası alımları güçlü'},
        'VIX':{icon:'📊',note:'Volatilite, belirsizlik primi'},
        'DXY':{icon:'💵',note:'Dolar güvenli liman akışı, EM para birimlerine baskı'},
        'EUR':{icon:'💶',note:'Rusya-Ukrayna enerji kanalı ile korelasyon'},
        'TTF':{icon:'🔥',note:'Avrupa doğalgaz; LNG rotaları ve jeopolitik hassas'},
        'LNG':{icon:'🔥',note:'Tanker trafiği ve Hürmüz/Süveyş riskleriyle ilişkili'},
        'Navlun':{icon:'🚢',note:'Kızıldeniz/Süveyş aksaklığı konteyner fiyatlarını yukarı itiyor'},
        'Buğday':{icon:'🌾',note:'Karadeniz koridoru ve Ukrayna üretimine bağlı'},
        'URANYUM':{icon:'☢️',note:'Sahel arzı ve nükleer gündemle destekli'},
        'TSMC':{icon:'💻',note:'Tayvan riski, yarı iletken tedarik zinciri kritiği'},
        'SOXX':{icon:'💻',note:'Yarı iletken endeksi, Tayvan Boğazı hassasiyeti'},
        'KOSPI':{icon:'📈',note:'G. Kore endeksi, K. Kore füze testlerine duyarlı'},
        'FXI':{icon:'📈',note:'Çin hisseleri, G. Çin Denizi ve Tayvan tansiyonu'},
        'Savunma':{icon:'🛡️',note:'Savunma sanayi, uzun vadeli yapısal destek'},
        'Konteyner':{icon:'📦',note:'Rota değişikliği, transit süresi artışı'},
        'USD/CNY':{icon:'💱',note:'Çin-ABD gerginliği ve sermaye akışları'},
        'USD/KRW':{icon:'💱',note:'Won — Kore yarımadası riski'},
        'USD/PHP':{icon:'💱',note:'Peso — G. Çin Denizi gerilimi'}
    };

    var top = Object.keys(counts).sort(function(a,b){return counts[b]-counts[a]}).slice(0,8);
    if(!top.length){ document.getElementById('assetsRow').innerHTML=''; return; }
    var html = top.map(function(a){
        var m = META[a] || {icon:'📌',note:'Hotspot bölgelerinde etkilenen varlık'};
        return '<div class="asset-cell">'+
               '<div class="asset-name"><span class="asset-icon">'+m.icon+'</span>'+a+'</div>'+
               '<div class="asset-note">'+m.note+'</div>'+
               '</div>';
    }).join('');
    document.getElementById('assetsRow').innerHTML = html;
}

// ═══════════════════════════════════════
// BAŞLAT
// ═══════════════════════════════════════
loadHotspots(function(hotspots){
    renderKPIs(hotspots);
    renderMap(hotspots);
    renderAssets(hotspots);
    renderCards(hotspots);
    renderNews(hotspots);
});
loadAI();

})();

