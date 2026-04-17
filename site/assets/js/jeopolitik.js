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

// Çoklu saldırı vektörleri (kavisli yaylarla çizilecek) — hotspot'lara ek detay
var ATTACK_VECTORS = [
    // İran-İsrail: 3 paralel trajectory
    {from:[32,53], to:[31.5,34.8], label:'Balistik füze', intensity:'high'},
    {from:[32,53], to:[32.1,34.9], label:'İHA dalgası', intensity:'high'},
    {from:[31.5,34.8], to:[32,53], label:'F-35 hava operasyonu', intensity:'high'},
    // Husi → tanker
    {from:[15.5,44], to:[13,43], label:'Anti-gemi füzesi', intensity:'med'},
    {from:[15.5,44], to:[14,42], label:'İHA saldırısı', intensity:'med'},
    // Rusya → Ukrayna çoklu
    {from:[55,38], to:[50,30], label:'Kalibr füze', intensity:'med'},
    {from:[52,40], to:[49,35], label:'Shahed İHA', intensity:'med'},
    // Hizbullah → İsrail
    {from:[33.9,35.5], to:[32.8,35], label:'Roket saldırısı', intensity:'med'}
];

// Kriz hedefleri (çarpı işaretli vurulan hedefler)
var STRIKE_TARGETS = [
    {lat:33.7,lng:52.4,name:'Natanz (vuruldu)',info:'İran nükleer tesisi — yoğun hasar'},
    {lat:32.6,lng:51.6,name:'İsfahan UCF',info:'Uranyum dönüşüm tesisi — vuruldu'},
    {lat:32.1,lng:34.8,name:'Tel Aviv yakınları',info:'İran balistik füze isabeti'},
    {lat:33.9,lng:35.5,name:'Beyrut güney',info:'Hizbullah altyapısı vurulan bölge'},
    {lat:50.4,lng:30.5,name:'Kiev enerji ağı',info:'Rus İHA/füze saldırısı'},
    {lat:48.6,lng:37.6,name:'Doneck cephesi',info:'Aktif kara harekâtı'}
];

// Küçük skirmish / olay noktaları — genel atmosfer
var SKIRMISHES = [
    {lat:30.4,lng:48.5,c:'#dc2626'},{lat:29,lng:49,c:'#dc2626'},{lat:14,lng:44,c:'#f59e0b'},
    {lat:13.5,lng:42.5,c:'#f59e0b'},{lat:17,lng:40,c:'#f59e0b'},{lat:47,lng:37,c:'#dc2626'},
    {lat:49,lng:36,c:'#dc2626'},{lat:46,lng:34,c:'#dc2626'},{lat:51,lng:38,c:'#f59e0b'},
    {lat:23,lng:120,c:'#eab308'},{lat:25,lng:120,c:'#eab308'},{lat:16,lng:115,c:'#eab308'},
    {lat:17,lng:118,c:'#eab308'},{lat:38,lng:126,c:'#eab308'},{lat:40,lng:128,c:'#f59e0b'},
    {lat:15,lng:-3,c:'#eab308'},{lat:14,lng:3,c:'#eab308'},{lat:16,lng:7,c:'#eab308'}
];

// Kavisli yay oluştur (iki nokta arası Bezier)
function curvedArc(from, to, height){
    height = height || 0.25;
    var mid = [(from[0]+to[0])/2, (from[1]+to[1])/2];
    var dx = to[1]-from[1], dy = to[0]-from[0];
    var len = Math.sqrt(dx*dx+dy*dy);
    // Dikey offset — kuzeye doğru şişir
    var cp = [mid[0] + Math.abs(len)*height, mid[1]];
    var pts = [];
    var steps = 24;
    for(var t=0; t<=steps; t++){
        var s = t/steps;
        var lat = (1-s)*(1-s)*from[0] + 2*(1-s)*s*cp[0] + s*s*to[0];
        var lng = (1-s)*(1-s)*from[1] + 2*(1-s)*s*cp[1] + s*s*to[1];
        pts.push([lat,lng]);
    }
    return pts;
}

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

    // 6. Skirmish noktaları (küçük titreşen ışıklar — atmosfer)
    SKIRMISHES.forEach(function(s){
        L.circleMarker([s.lat,s.lng],{
            radius: 3,
            color: s.c,
            fillColor: s.c,
            fillOpacity: .8,
            weight: 0,
            className: 'skirmish-dot',
            interactive: false
        }).addTo(map);
    });

    // 7. Kavisli saldırı yayları (füze/İHA/hava operasyonu)
    ATTACK_VECTORS.forEach(function(v){
        var arc = curvedArc(v.from, v.to, v.intensity==='high'?0.3:0.22);
        var col = v.intensity==='high' ? '#dc2626' : '#f59e0b';
        L.polyline(arc,{
            color: col,
            weight: 2,
            opacity: .85,
            className: 'missile-arc'
        }).addTo(map).bindPopup('<b>⚔️ '+v.label+'</b>');
    });

    // 8. Strike target'lar (çarpı işaretli vurulan hedefler)
    STRIKE_TARGETS.forEach(function(t){
        L.marker([t.lat,t.lng],{
            icon: L.divIcon({
                html:'<div class="div-target"></div>',
                className:'',
                iconSize:[26,26],
                iconAnchor:[13,13]
            })
        }).addTo(map).bindPopup('<b>🎯 '+t.name+'</b><br><small>'+t.info+'</small>');
    });

    // 9. Hotspot'lar — çoklu pulse halkası (kritik bölgede 3 katman)
    hotspots.forEach(function(h){
        var color = LVL_COLOR[h.level] || '#94a3b8';
        var baseRadius = 10 + h.level*2;

        // Kritik bölgede dış halka pulse
        if(h.level >= 3){
            L.circleMarker([h.lat,h.lng],{
                radius: baseRadius + 4,
                color: color,
                weight: 2,
                fillOpacity: 0,
                opacity: .7,
                className: h.level >= 4 ? 'pulse-crit' : 'pulse-warn',
                interactive: false
            }).addTo(map);
            // İkinci halka gecikmeli (kritiklerde)
            if(h.level === 4){
                var el = L.circleMarker([h.lat,h.lng],{
                    radius: baseRadius + 8,
                    color: color,
                    weight: 1.5,
                    fillOpacity: 0,
                    opacity: .5,
                    className: 'pulse-crit',
                    interactive: false
                }).addTo(map);
                // Animation gecikmesi için DOM'a eriş
                setTimeout(function(){
                    var p = el._path;
                    if(p) p.style.animationDelay = '0.9s';
                }, 100);
            }
        }

        // Ana hotspot noktası
        var marker = L.circleMarker([h.lat,h.lng],{
            radius: baseRadius,
            color: color,
            fillColor: color,
            fillOpacity: .65,
            weight: 3,
            className: h.level >= 4 ? 'critical-glow' : ''
        }).addTo(map);

        // Bayrak etiketi (hotspot'un üstünde)
        L.marker([h.lat,h.lng],{
            icon: L.divIcon({
                html:'<div class="div-flag">'+h.flag+'</div>',
                className:'',
                iconSize:[22,22],
                iconAnchor:[11,28]
            }),
            interactive: false
        }).addTo(map);

        var pop = '<b>'+h.flag+' '+h.name+'</b><br>'+
                  '<span style="color:'+color+';font-weight:700;font-size:.7rem">'+LVL_TEXT[h.level]+'</span><br>'+
                  '<small>'+(h.status||'')+'</small><br>'+
                  '<small style="color:#94a3b8">Güncelleme: '+timeAgo(h.updatedAt)+'</small>';
        marker.bindPopup(pop);
    });

    // 10. Harita üst sağındaki canlı overlay
    updateMapOverlay(hotspots);
}

function updateMapOverlay(hotspots){
    var count = hotspots.length || 1;
    var avg = hotspots.reduce(function(s,h){return s+(h.level||0)},0) / count;
    var crit = hotspots.filter(function(h){return h.level===4}).length;
    var high = hotspots.filter(function(h){return h.level===3}).length;
    var freshest = hotspots.reduce(function(best,h){
        var t = h.updatedAt ? new Date(h.updatedAt).getTime() : 0;
        return t > best ? t : best;
    }, 0);
    var tensionIdx = Math.round(avg*25);
    var ovT = document.getElementById('ovTension');
    var ovC = document.getElementById('ovCrit');
    var ovH = document.getElementById('ovHigh');
    var ovF = document.getElementById('ovFresh');
    if(ovT) ovT.textContent = tensionIdx+' / 100';
    if(ovC) ovC.textContent = crit;
    if(ovH) ovH.textContent = high;
    if(ovF) ovF.textContent = freshest ? timeAgo(new Date(freshest).toISOString()) : '—';
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
    renderMap(hotspots);
    renderAssets(hotspots);
    renderCards(hotspots);
    renderNews(hotspots);
});
loadAI();

})();

