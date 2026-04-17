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
// HARITA
// ═══════════════════════════════════════
function renderMap(hotspots){
    var map = L.map('geoMap',{scrollWheelZoom:false,worldCopyJump:true}).setView([25,35],2);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',{maxZoom:10,attribution:'© OpenStreetMap © CARTO'}).addTo(map);

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
// BAŞLAT
// ═══════════════════════════════════════
loadHotspots(function(hotspots){
    renderMap(hotspots);
    renderCards(hotspots);
    renderNews(hotspots);
});
loadAI();

})();

