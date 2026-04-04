/**
 * Piyasa Monitörü — Sidebar v4
 * Mobilde üstte yatay nav, masaüstünde sol sidebar
 * Dark/Light tema desteği
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
    ['ulke-risk','🌐','Ülke Risk'],
];

// Build links HTML
var linksHtml = links.map(function(l){
    return '<a class="sb-direct" href="'+l[0]+'.html" data-page="'+l[0]+'"><span class="sb-icon">'+l[1]+'</span> '+l[2]+'</a>';
}).join('');

// Mobile top nav links (shorter labels)
var mobileLinksHtml = links.map(function(l){
    return '<a class="mb-link" href="'+l[0]+'.html" data-page="'+l[0]+'">'+l[1]+' '+l[2]+'</a>';
}).join('');

var HTML = '' +
// Desktop sidebar
'<div class="sb-overlay" id="sbOverlay"></div>' +
'<aside class="sidebar" id="sidebar">' +
'<a class="sb-brand" href="index.html"><span class="sb-brand-icon">📊</span><span class="sb-brand-text">Piyasa Monitörü</span></a>' +
linksHtml +
'<button class="sb-direct" id="themeToggle" style="margin-top:auto;border:none;cursor:pointer;text-align:left;background:none"><span class="sb-icon" id="themeIcon">🌙</span> <span id="themeLabel">Koyu Tema</span></button>' +
'</aside>' +
// Topbar
'<div class="topbar" id="topbar">' +
'<button class="topbar-hamburger" id="hamburger">☰</button>' +
'<a href="index.html" style="text-decoration:none;font-size:.9rem;font-weight:800;color:var(--blue)">📊 PM</a>' +
'<div style="display:flex;align-items:center;gap:10px"><span class="topbar-clock" id="clock"></span><button id="themeToggleMobile" style="background:none;border:none;font-size:1.1rem;cursor:pointer;padding:2px" title="Tema değiştir">🌙</button></div>' +
'</div>' +
// Mobile nav strip
'<div class="mobile-nav" id="mobileNav">' + mobileLinksHtml + '</div>';

document.body.insertAdjacentHTML('afterbegin', HTML);

// Wrap .page in .main
var pg = document.querySelector('.page');
if (pg && !pg.parentElement.classList.contains('main')) {
    var wrap = document.createElement('div');
    wrap.className = 'main';
    pg.parentNode.insertBefore(wrap, pg);
    wrap.appendChild(pg);
}

// Active page
var cur = location.pathname.split('/').pop().replace('.html','') || 'index';
document.querySelectorAll('.sb-direct,.mb-link').forEach(function(a){
    if(a.getAttribute('data-page')===cur) a.classList.add('active');
});

// Hamburger
var sb = document.getElementById('sidebar');
var ov = document.getElementById('sbOverlay');
document.getElementById('hamburger').addEventListener('click',function(){
    sb.classList.toggle('open'); ov.classList.toggle('open');
});
ov.addEventListener('click',function(){
    sb.classList.remove('open'); ov.classList.remove('open');
});

// Clock
var MO=['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
function tick(){
    var el=document.getElementById('clock');if(!el)return;
    var n=new Date();
    el.textContent=String(n.getDate()).padStart(2,'0')+'.'+String(n.getMonth()+1).padStart(2,'0')+'.'+n.getFullYear()+' '+String(n.getHours()).padStart(2,'0')+':'+String(n.getMinutes()).padStart(2,'0');
}
setInterval(tick,30000);tick();

// Theme toggle (dark/light)
function applyTheme(dark){
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    var icon = document.getElementById('themeIcon');
    var label = document.getElementById('themeLabel');
    var mBtn = document.getElementById('themeToggleMobile');
    if(icon) icon.textContent = dark ? '☀️' : '🌙';
    if(label) label.textContent = dark ? 'Açık Tema' : 'Koyu Tema';
    if(mBtn) mBtn.textContent = dark ? '☀️' : '🌙';
    try { localStorage.setItem('pm-theme', dark ? 'dark' : 'light'); } catch(e){}
}
var savedTheme = null;
try { savedTheme = localStorage.getItem('pm-theme'); } catch(e){}
var isDark = savedTheme === 'dark';
applyTheme(isDark);

function toggleTheme(){ isDark = !isDark; applyTheme(isDark); }
document.getElementById('themeToggle').addEventListener('click', toggleTheme);
var mobileToggle = document.getElementById('themeToggleMobile');
if(mobileToggle) mobileToggle.addEventListener('click', toggleTheme);

})();
