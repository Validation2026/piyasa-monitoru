/**
 * Risk Monitörü — Sidebar v4
 * Mobilde: topbar yok, sadece üstte tab strip
 * Masaüstünde: sol sidebar
 */
(function(){'use strict';

var links = [
    ['index','🏠','Ana Panel'],
    ['emtia-enerji','⛽','Enerji'],
    ['emtia-metaller','🥇','Madenler'],
    ['emtia-tarim','🌾','Tarım'],
    ['sanayi','🏭','Sanayi'],
    ['kurlar','💱','Döviz'],
    ['tahviller','📜','Tahvil'],
    ['endeksler','📈','Endeksler'],
    ['hisseler','💹','Hisseler'],
    ['kripto','₿','Kripto'],
    ['faiz-enflasyon','🌡️','Faiz & Enflasyon'],
    ['karsilastirma','📊','Karşılaştır'],
    ['iran-risk','🔴','İran Risk'],
    ['ekonomik-takvim','📅','Takvim'],
    ['merkez-bankalari','🏛️','Merkez Bank.'],
    ['ulke-risk','🌐','Ülke Risk'],
/*  ['operasyonel-risk','🛡️','Operasyonel Risk'],*/
    {ext:'https://tufeai.netlify.app/',icon:'🧮',label:'TÜFE-AI'}
];
function buildHref(l){
    if(l && l.ext) return l.ext;
    return l[0]+'.html';
}
function isExt(l){ return !!(l && l.ext); }
function lIcon(l){ return l.ext?l.icon:l[1]; }
function lLabel(l){ return l.ext?l.label:l[2]; }
function lKey(l){ return l.ext?('ext-'+l.label):l[0]; }

var sidebarLinks = links.map(function(l){
    var target=isExt(l)?' target="_blank" rel="noopener"':'';
    return '<a class="sb-direct" href="'+buildHref(l)+'"'+target+' data-page="'+lKey(l)+'"><span class="sb-icon">'+lIcon(l)+'</span> '+lLabel(l)+'</a>';
}).join('');

var mobileLinks = links.map(function(l){
    var target=isExt(l)?' target="_blank" rel="noopener"':'';
    return '<a class="mb-link" href="'+buildHref(l)+'"'+target+' data-page="'+lKey(l)+'">'+lIcon(l)+' '+lLabel(l)+'</a>';
}).join('');

var HTML = '' +
'<a href="#mainContent" class="sr-only" style="position:absolute;left:0;top:0;padding:8px;background:var(--blue);color:#fff;z-index:9999">İçeriğe atla</a>' +
'<div class="sb-overlay" id="sbOverlay"></div>' +
'<aside class="sidebar" id="sidebar" role="navigation" aria-label="Ana menü">' +
'<a class="sb-brand" href="index.html" aria-label="Ana sayfaya dön"><span style="font-size:1.1rem" aria-hidden="true">📊</span><span class="sb-brand-text">Risk Monitörü</span></a>' +
'<button type="button" class="sb-search-trigger" id="sbSearchTrigger" aria-label="Arama (Ctrl+K)"><span class="sb-ico">🔍</span><span class="sb-search-label">Ara…</span><span class="sb-kbd">⌘K</span></button>' +
sidebarLinks +
'</aside>' +
'<div class="topbar" id="topbar" role="banner">' +
'<button class="topbar-hamburger" id="hamburger" aria-label="Menüyü aç" aria-expanded="false" aria-controls="sidebar">☰</button>' +
'<a href="index.html" style="text-decoration:none;font-size:.85rem;font-weight:800;color:var(--blue)" aria-label="Ana sayfa"><span aria-hidden="true">📊 RM</span></a>' +
'<button type="button" class="topbar-search" id="topbarSearch" aria-label="Arama (Ctrl+K)" title="Ara (Ctrl+K)"><span aria-hidden="true">🔍</span><span class="tbs-label">Ara</span><span class="tbs-kbd">⌘K</span></button>' +
'<span class="topbar-clock" id="clock" aria-live="off"></span>' +
'</div>' +
'<nav class="mobile-nav" id="mobileNav" aria-label="Sayfa gezinme">' + mobileLinks + '</nav>' +
// Floating search FAB — her sayfada her zaman görünür
'<button type="button" class="search-fab" id="searchFab" aria-label="Arama (Ctrl+K)" title="Ara (Ctrl+K)"><span aria-hidden="true">🔍</span></button>' +
// Command palette modal
'<div class="cmdk-overlay" id="cmdkOverlay" aria-hidden="true">' +
'  <div class="cmdk-modal" role="dialog" aria-modal="true" aria-label="Arama">' +
'    <div class="cmdk-input-wrap">' +
'      <span class="cmdk-ico">🔍</span>' +
'      <input type="text" id="cmdkInput" placeholder="Sayfa, emtia, hisse veya ülke ara…" autocomplete="off">' +
'      <span class="cmdk-hint">ESC kapat</span>' +
'    </div>' +
'    <div class="cmdk-results" id="cmdkResults"></div>' +
'    <div class="cmdk-footer"><span>↑↓ gez</span><span>↵ aç</span><span>ESC kapat</span></div>' +
'  </div>' +
'</div>';

document.body.insertAdjacentHTML('afterbegin', HTML);

var pg = document.querySelector('.page');
if (pg && !pg.parentElement.classList.contains('main')) {
    var wrap = document.createElement('div');
    wrap.className = 'main';
    wrap.setAttribute('role','main');
    wrap.id = 'mainContent';
    pg.parentNode.insertBefore(wrap, pg);
    wrap.appendChild(pg);
}

var cur = location.pathname.split('/').pop().replace('.html','') || 'index';
document.querySelectorAll('.sb-direct,.mb-link').forEach(function(a){
    if(a.getAttribute('data-page')===cur) a.classList.add('active');
});

// Canlı ticker + piyasa saati widget'ını her sayfaya yükle (iran-risk hariç)
if(cur !== 'iran-risk' && !document.getElementById('pmLiveWidgetsScript')){
    var lw = document.createElement('script');
    lw.id = 'pmLiveWidgetsScript';
    lw.src = 'assets/js/live-widgets.js';
    lw.defer = true;
    document.head.appendChild(lw);
}

// Mobilde aktif sekmeyi görünür yap (scroll into view)
setTimeout(function(){
    var activeTab = document.querySelector('.mobile-nav .mb-link.active');
    if(activeTab) activeTab.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});
},100);

var sb = document.getElementById('sidebar');
var ov = document.getElementById('sbOverlay');
var hb = document.getElementById('hamburger');
hb.addEventListener('click',function(){
    var isOpen = sb.classList.toggle('open'); ov.classList.toggle('open');
    hb.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
});
ov.addEventListener('click',function(){
    sb.classList.remove('open'); ov.classList.remove('open');
    hb.setAttribute('aria-expanded','false');
});
// ESC ile sidebar kapansın
document.addEventListener('keydown', function(e){
    if(e.key === 'Escape' && sb.classList.contains('open')){
        sb.classList.remove('open'); ov.classList.remove('open');
        hb.setAttribute('aria-expanded','false');
    }
});

// Clock - sadece masaüstü
function tick(){
    var el=document.getElementById('clock');if(!el)return;
    var n=new Date();
    var dd=String(n.getDate()).padStart(2,'0');
    var mm=String(n.getMonth()+1).padStart(2,'0');
    var yyyy=n.getFullYear();
    var hh=String(n.getHours()).padStart(2,'0');
    var mi=String(n.getMinutes()).padStart(2,'0');
    var t=dd+'.'+mm+'.'+yyyy+' '+hh+':'+mi;
    el.textContent=t;
}
setInterval(tick,1000);tick();

// ═══════════════════════════════════════════
// COMMAND PALETTE (Cmd/Ctrl+K) — global arama
// ═══════════════════════════════════════════
(function(){
    // Popüler varlıklar ve ülkeler — hızlı atlama için
    var SEARCH_INDEX = [];
    // Sayfalar
    links.forEach(function(l){
        if(isExt(l)) SEARCH_INDEX.push({type:'Harici', icon:lIcon(l), label:lLabel(l), href:l.ext, ext:true});
        else SEARCH_INDEX.push({type:'Sayfa', icon:lIcon(l), label:lLabel(l), href:l[0]+'.html'});
    });
    // Popüler varlıklar (sayfa + anchor)
    var QUICK = [
        ['Bitcoin (BTC)','₿','kripto.html'],['Ethereum (ETH)','Ξ','kripto.html'],['Solana (SOL)','◎','kripto.html'],
        ['Brent Ham Petrol','🛢️','emtia-enerji.html'],['WTI Ham Petrol','🛢️','emtia-enerji.html'],['Doğalgaz (HH)','🔥','emtia-enerji.html'],
        ['Altın (XAU)','🥇','emtia-metaller.html'],['Gümüş (XAG)','🥈','emtia-metaller.html'],['Bakır','🟠','emtia-metaller.html'],['Platin','⚪','emtia-metaller.html'],
        ['Buğday','🌾','emtia-tarim.html'],['Mısır','🌽','emtia-tarim.html'],['Soya','🫘','emtia-tarim.html'],
        ['USD/TRY','💵','kurlar.html'],['EUR/TRY','💶','kurlar.html'],['GBP/TRY','💷','kurlar.html'],['Dolar Endeksi (DXY)','📊','kurlar.html'],
        ['BIST 100','🇹🇷','endeksler.html'],['S&P 500','🇺🇸','endeksler.html'],['NASDAQ','💹','endeksler.html'],['DAX','🇩🇪','endeksler.html'],['Nikkei','🇯🇵','endeksler.html'],
        ['ABD 10Y Tahvil','📜','tahviller.html'],['Türkiye 10Y Tahvil','📜','tahviller.html'],['Almanya 10Y Bund','📜','tahviller.html'],
        ['THYAO','✈️','hisseler.html'],['ASELS','🔧','hisseler.html'],['KCHOL','🏢','hisseler.html'],['GARAN','🏦','hisseler.html'],['NVDA','💻','hisseler.html'],['AAPL','🍎','hisseler.html'],['TSLA','🚗','hisseler.html'],
        ['Fed','🏛️','merkez-bankalari.html'],['ECB','🏛️','merkez-bankalari.html'],['TCMB','🏛️','merkez-bankalari.html'],['BoJ','🏛️','merkez-bankalari.html'],
        ['Türkiye','🇹🇷','turkiye.html'],['ABD','🇺🇸','faiz-enflasyon.html'],['Çin','🇨🇳','faiz-enflasyon.html'],['Japonya','🇯🇵','faiz-enflasyon.html'],['İran','🇮🇷','faiz-enflasyon.html'],['Rusya','🇷🇺','faiz-enflasyon.html'],
        ['Hürmüz Boğazı','🌊','kure.html'],['Süveyş Kanalı','🌊','kure.html'],['Malakka Boğazı','🌊','kure.html']
    ];
    QUICK.forEach(function(q){ SEARCH_INDEX.push({type:'Varlık', icon:q[1], label:q[0], href:q[2]}); });

    // Tüm data dosyaları → sayfalar eşlemesi — arama tüm site verilerini kapsasın
    var VISIBLE_STOCK_IDS = ['GARAN.IS','AKBNK.IS','YKBNK.IS','ISCTR.IS','VAKBN.IS','HALKB.IS','TSKB.IS','ALBRK.IS','SKBNK.IS','KCHOL.IS','SAHOL.IS','DOHOL.IS','AGHOL.IS','TKFEN.IS','TAVHL.IS','GSRAY.IS','EREGL.IS','TUPRS.IS','ASELS.IS','FROTO.IS','TOASO.IS','SISE.IS','ARCLK.IS','VESTL.IS','OTKAR.IS','KRDMD.IS','TTRAK.IS','BRISA.IS','PETKM.IS','KOZAL.IS','ENKAI.IS','CIMSA.IS','OYAKC.IS','SASA.IS','EGEEN.IS','CEMTS.IS','KLMSN.IS','THYAO.IS','PGSUS.IS','DOAS.IS','BIMAS.IS','MGROS.IS','SOKM.IS','ULKER.IS','AEFES.IS','CCOLA.IS','TCELL.IS','TTKOM.IS','LOGO.IS','AKSEN.IS','AKSA.IS','GUBRF.IS','HEKTS.IS','EKGYO.IS','ISGYO.IS','TURSG.IS','KONTR.IS','ASTOR.IS','SMRTG.IS','CWENE.IS','GESAN.IS','ODAS.IS','ZOREN.IS','ENJSA.IS','ALFAS.IS','MIATK.IS','KCAER.IS','BORLS.IS','REEDR.IS','TABGD.IS','MAVI.IS','KONYA.IS','MPARK.IS','GENIL.IS','ECILC.IS','SELEC.IS','FENER.IS','BJKAS.IS','TRGYO.IS','AKFGY.IS','VAKKO.IS','AAPL','MSFT','GOOGL','AMZN','NVDA','META','TSLA','AVGO','AMD','INTC','CRM','ORCL','ADBE','NFLX','CSCO','QCOM','TXN','IBM','NOW','PANW','MU','PLTR','SHOP','UBER','SNOW','CRWD','ARM','ADP','INTU','JPM','V','MA','JNJ','UNH','LLY','PG','KO','PEP','WMT','COST','HD','DIS','BAC','WFC','GS','MS','BLK','PFE','MRK','ABBV','TMO','ABT','NKE','MCD','SBUX','CMCSA','T','XOM','CVX','BA','CAT','GE','RTX','LMT','NOC','ASML','NVO','SAP','SHEL','AZN','UL','TTE','NVS','ROG','BP','RIO','HSBC','UBS','SAN','ING','GSK','DTEGY','VWAGY','NSRGY','LRLCY','MC','TSM','005930.KS','BABA','PDD','TM','SONY','BHP','HMC','NTDOY','MUFG','SMFG','MELI','INFY','HDB','IBN'];
    var VISIBLE_STOCK_ID_SET = VISIBLE_STOCK_IDS.reduce(function(acc,id){ acc[id]=true; return acc; }, {});

    var DATA_FILES = [
        {file:'commodities_energy.json', page:'emtia-enerji.html', icon:'⛽'},
        {file:'commodities_metals.json', page:'emtia-metaller.html', icon:'🥇'},
        {file:'commodities_agriculture.json', page:'emtia-tarim.html', icon:'🌾'},
        {file:'industrial.json', page:'sanayi.html', icon:'🏭'},
        {file:'currencies.json', page:'kurlar.html', icon:'💱'},
        {file:'bonds.json', page:'tahviller.html', icon:'📜'},
        {file:'indices.json', page:'endeksler.html', icon:'📈'},
        {file:'stocks.json', page:'hisseler.html', icon:'💹'},
        {file:'crypto.json', page:'kripto.html', icon:'₿'}
    ];
    var dataIndexLoaded = false, dataIndexLoading = false;
    function loadDataIndex(){
        if(dataIndexLoaded || dataIndexLoading) return Promise.resolve();
        dataIndexLoading = true;
        var fetches = DATA_FILES.map(function(d){
            return fetch('data/'+d.file+'?t='+Date.now(), {cache:'no-store'})
                .then(function(r){return r.json()})
                .then(function(json){
                    if(!json || !json.series) return;
                    json.series.forEach(function(s){
                        if(!s || !s.name) return;
                        if(d.file === 'stocks.json' && !VISIBLE_STOCK_ID_SET[s.id]) return;
                        SEARCH_INDEX.push({
                            type:'Varlık', icon:d.icon, label:s.name,
                            href: d.page + '?asset=' + encodeURIComponent(s.id || s.name),
                            seriesId: s.id,
                            pageOnly: d.page
                        });
                    });
                }).catch(function(){});
        });
        return Promise.all(fetches).then(function(){
            dataIndexLoaded = true; dataIndexLoading = false;
            // Duplikeleri temizle (href bazlı)
            var seen = {};
            SEARCH_INDEX = SEARCH_INDEX.filter(function(it){
                var k = it.href + '|' + it.label;
                if(seen[k]) return false; seen[k] = true; return true;
            });
        });
    }

    function trLower(s){ return (s||'').toLocaleLowerCase('tr'); }
    function score(item, q){
        var lab = trLower(item.label);
        if(!q) return 0;
        if(lab === q) return 100;
        if(lab.indexOf(q) === 0) return 80;
        if(lab.indexOf(' '+q) !== -1) return 60;
        if(lab.indexOf(q) !== -1) return 40;
        return 0;
    }

    var overlay = document.getElementById('cmdkOverlay');
    var input = document.getElementById('cmdkInput');
    var results = document.getElementById('cmdkResults');
    if(!overlay || !input || !results) return;
    var activeIdx = 0, current = [];

    function render(list){
        if(!list.length){
            results.innerHTML = '<div class="cmdk-empty">Eşleşme yok — sayfa veya varlık adı yaz</div>';
            return;
        }
        results.innerHTML = list.map(function(it, i){
            return '<a class="cmdk-row'+(i===activeIdx?' active':'')+'" href="'+it.href+'"'+(it.ext?' target="_blank" rel="noopener"':'')+' data-i="'+i+'">'+
                '<span class="cmdk-row-ico">'+it.icon+'</span>'+
                '<span class="cmdk-row-label">'+it.label+'</span>'+
                '<span class="cmdk-row-type">'+it.type+'</span>'+
            '</a>';
        }).join('');
        // Klavye ile seçim: mouse hover de activeIdx güncellesin
        results.querySelectorAll('.cmdk-row').forEach(function(el){
            el.addEventListener('mouseenter', function(){
                activeIdx = parseInt(el.getAttribute('data-i'));
                results.querySelectorAll('.cmdk-row').forEach(function(x,idx){x.classList.toggle('active', idx===activeIdx)});
            });
        });
    }

    function updateList(){
        var q = trLower(input.value.trim());
        if(!q){
            current = SEARCH_INDEX.slice(0, 20);
        } else {
            current = SEARCH_INDEX.map(function(it){return {it:it, s:score(it,q)}})
                .filter(function(x){return x.s>0})
                .sort(function(a,b){return b.s-a.s})
                .slice(0,30)
                .map(function(x){return x.it});
        }
        activeIdx = 0;
        render(current);
    }

    function open(){
        overlay.classList.add('show');
        overlay.setAttribute('aria-hidden','false');
        input.value = '';
        updateList();
        setTimeout(function(){ input.focus(); }, 30);
        // Arka planda tüm site verilerini yükle; tamamlanınca listeyi tazele
        if(!dataIndexLoaded){
            loadDataIndex().then(function(){ updateList(); });
        }
    }
    function close(){
        overlay.classList.remove('show');
        overlay.setAttribute('aria-hidden','true');
    }

    // Trigger butonları
    var trigger = document.getElementById('sbSearchTrigger');
    if(trigger) trigger.addEventListener('click', open);
    var topTrigger = document.getElementById('topbarSearch');
    if(topTrigger) topTrigger.addEventListener('click', open);
    var fabTrigger = document.getElementById('searchFab');
    if(fabTrigger) fabTrigger.addEventListener('click', open);

    // Klavye kısayolu: Cmd+K veya Ctrl+K
    document.addEventListener('keydown', function(e){
        if((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')){
            e.preventDefault();
            overlay.classList.contains('show') ? close() : open();
            return;
        }
        if(!overlay.classList.contains('show')) return;
        if(e.key === 'Escape'){ e.preventDefault(); close(); }
        else if(e.key === 'ArrowDown'){ e.preventDefault(); activeIdx = Math.min(current.length-1, activeIdx+1); render(current); }
        else if(e.key === 'ArrowUp'){ e.preventDefault(); activeIdx = Math.max(0, activeIdx-1); render(current); }
        else if(e.key === 'Enter'){
            var it = current[activeIdx];
            if(it){ e.preventDefault(); if(it.ext) window.open(it.href,'_blank','noopener'); else location.href = it.href; }
        }
    });

    input.addEventListener('input', updateList);
    overlay.addEventListener('click', function(e){ if(e.target === overlay) close(); });
})();

// Otomatik yenileme: admin paneli kaydedince ilgili sayfa kendiliginden refresh olur
(function(){
    var pageId = location.pathname.split('/').pop().replace('.html','') || 'index';
    // Iran sayfasi icin iran-state, diger sayfalar icin page-state
    var endpoint = pageId === 'iran-risk' ? '/api/iran-state' : '/api/page-state?page=' + pageId;
    var lastStamp = null;
    var initialized = false;

    function check(){
        if (document.hidden) return;
        fetch(endpoint, {cache:'no-store'}).then(function(r){return r.json()}).then(function(d){
            if(!d) return;
            var stamp = d.updatedAt || d.lastUpdated || (d.meta && d.meta.updated_at) || null;
            if(!initialized){ lastStamp = stamp; initialized = true; return; }
            if(stamp && stamp !== lastStamp){
                lastStamp = stamp;
                location.reload();
            }
        }).catch(function(){});
    }
    setInterval(check, 12000);
    setTimeout(check, 1500);
})();

})();
