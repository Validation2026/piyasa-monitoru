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
    ['iran-risk','🔴','İran Risk'],
    ['tedarik-zinciri','🚢','Tedarik Zinciri'],
    ['kuresel-risk','🌍','Küresel Risk'],
    ['ekonomik-takvim','📅','Takvim'],
    ['merkez-bankalari','🏛️','Merkez Bank.'],
    ['ulke-risk','🌐','Ülke Risk']
];

var sidebarLinks = links.map(function(l){
    return '<a class="sb-direct" href="'+l[0]+'.html" data-page="'+l[0]+'"><span class="sb-icon">'+l[1]+'</span> '+l[2]+'</a>';
}).join('');

var mobileLinks = links.map(function(l){
    return '<a class="mb-link" href="'+l[0]+'.html" data-page="'+l[0]+'">'+l[1]+' '+l[2]+'</a>';
}).join('');

var HTML = '' +
'<div class="sb-overlay" id="sbOverlay"></div>' +
'<aside class="sidebar" id="sidebar">' +
'<a class="sb-brand" href="index.html"><span style="font-size:1.1rem">📊</span><span class="sb-brand-text">Risk Monitörü</span></a>' +
sidebarLinks +
'</aside>' +
'<div class="topbar" id="topbar">' +
'<button class="topbar-hamburger" id="hamburger">☰</button>' +
'<a href="index.html" style="text-decoration:none;font-size:.85rem;font-weight:800;color:var(--blue)">📊 RM</a>' +
'<span class="topbar-clock" id="clock"></span>' +
'</div>' +
'<div class="mobile-nav" id="mobileNav">' + mobileLinks + '</div>';

document.body.insertAdjacentHTML('afterbegin', HTML);

var pg = document.querySelector('.page');
if (pg && !pg.parentElement.classList.contains('main')) {
    var wrap = document.createElement('div');
    wrap.className = 'main';
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
document.getElementById('hamburger').addEventListener('click',function(){
    sb.classList.toggle('open'); ov.classList.toggle('open');
});
ov.addEventListener('click',function(){
    sb.classList.remove('open'); ov.classList.remove('open');
});

// Clock - sadece masaüstü
function tick(){
    var el=document.getElementById('clock');if(!el)return;
    var n=new Date();
    el.textContent=String(n.getDate()).padStart(2,'0')+'.'+String(n.getMonth()+1).padStart(2,'0')+'.'+n.getFullYear()+' '+String(n.getHours()).padStart(2,'0')+':'+String(n.getMinutes()).padStart(2,'0');
}
setInterval(tick,30000);tick();

})();
