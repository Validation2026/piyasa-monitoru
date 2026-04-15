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
    ['kripto','₿','Kripto'],
    ['karsilastirma','📊','Karşılaştır'],
    ['iran-risk','🔴','İran Risk'],
    ['tedarik-zinciri','🚢','Tedarik Zinciri'],
    ['ekonomik-takvim','📅','Takvim'],
    ['merkez-bankalari','🏛️','Merkez Bank.'],
    ['ulke-risk','🌐','Ülke Risk'],
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
sidebarLinks +
'</aside>' +
'<div class="topbar" id="topbar" role="banner">' +
'<button class="topbar-hamburger" id="hamburger" aria-label="Menüyü aç" aria-expanded="false" aria-controls="sidebar">☰</button>' +
'<a href="index.html" style="text-decoration:none;font-size:.85rem;font-weight:800;color:var(--blue)" aria-label="Ana sayfa"><span aria-hidden="true">📊 RM</span></a>' +
'<span class="topbar-clock" id="clock" aria-live="off"></span>' +
'</div>' +
'<nav class="mobile-nav" id="mobileNav" aria-label="Sayfa gezinme">' + mobileLinks + '</nav>';

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
    el.textContent=String(n.getDate()).padStart(2,'0')+'.'+String(n.getMonth()+1).padStart(2,'0')+'.'+n.getFullYear()+' '+String(n.getHours()).padStart(2,'0')+':'+String(n.getMinutes()).padStart(2,'0');
}
setInterval(tick,30000);tick();

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
