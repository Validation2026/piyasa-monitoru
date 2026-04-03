/**
 * Piyasa Monitörü — Sidebar v2 (Fixed)
 */
(function(){'use strict';

var HTML = '<div class="sb-overlay" id="sbOverlay"></div>' +
'<aside class="sidebar" id="sidebar">' +
'<a class="sb-brand" href="index.html"><span class="sb-brand-icon">📊</span><span class="sb-brand-text">Piyasa Monitörü</span></a>' +
'<a class="sb-direct" href="index.html" data-page="index"><span class="sb-icon">🏠</span> Ana Panel</a>' +
'<a class="sb-direct" href="emtia-enerji.html" data-page="emtia-enerji"><span class="sb-icon">⛽</span> Enerji</a>' +
'<a class="sb-direct" href="emtia-metaller.html" data-page="emtia-metaller"><span class="sb-icon">🥇</span> Kıymetli Madenler</a>' +
'<a class="sb-direct" href="emtia-tarim.html" data-page="emtia-tarim"><span class="sb-icon">🌾</span> Tarım Emtiaları</a>' +
'<a class="sb-direct" href="kurlar.html" data-page="kurlar"><span class="sb-icon">💱</span> Döviz Kurları</a>' +
'<a class="sb-direct" href="tahviller.html" data-page="tahviller"><span class="sb-icon">📜</span> Tahvil Faizleri</a>' +
'<a class="sb-direct" href="endeksler.html" data-page="endeksler"><span class="sb-icon">📈</span> Borsa Endeksleri</a>' +
'<a class="sb-direct" href="kripto.html" data-page="kripto"><span class="sb-icon">₿</span> Kripto Paralar</a>' +
'<a class="sb-direct" href="makro.html" data-page="makro"><span class="sb-icon">🏦</span> Türkiye Makro</a>' +
'<a class="sb-direct" href="iran-risk.html" data-page="iran-risk" style="border-top:1px solid var(--border);margin-top:4px;padding-top:14px"><span class="sb-icon">🔴</span> İran Risk</a>' +
'<a class="sb-direct" href="kuresel-risk.html" data-page="kuresel-risk"><span class="sb-icon">🌍</span> Küresel Risk</a>' +
'<a class="sb-direct" href="ekonomik-takvim.html" data-page="ekonomik-takvim"><span class="sb-icon">📅</span> Ekonomik Takvim</a>' +
'<a class="sb-direct" href="merkez-bankalari.html" data-page="merkez-bankalari"><span class="sb-icon">🏛️</span> Merkez Bankaları</a>' +
'<div class="sb-footer"><button class="sb-theme-btn" id="sbThemeBtn">🌙 Tema Değiştir</button></div>' +
'</aside>' +
'<div class="topbar" id="topbar">' +
'<button class="topbar-hamburger" id="hamburger">☰</button>' +
'<div class="topbar-breadcrumb" id="topbarBreadcrumb"></div>' +
'<span class="topbar-clock" id="clock"></span>' +
'</div>';

// Inject
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
document.querySelectorAll('.sb-direct').forEach(function(a) {
    if (a.getAttribute('data-page') === cur) a.classList.add('active');
});

// Hamburger
var sb = document.getElementById('sidebar');
var ov = document.getElementById('sbOverlay');
document.getElementById('hamburger').addEventListener('click', function() {
    sb.classList.toggle('open'); ov.classList.toggle('open');
});
ov.addEventListener('click', function() {
    sb.classList.remove('open'); ov.classList.remove('open');
});

// Theme
var btn = document.getElementById('sbThemeBtn');
function setTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    btn.textContent = (t === 'dark' ? '🌙' : '☀️') + ' Tema Değiştir';
    localStorage.setItem('theme', t);
}
var saved = localStorage.getItem('theme');
if (saved) setTheme(saved);
btn.addEventListener('click', function() {
    setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
});

// Clock
var MO = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
var DA = ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];
function tick() {
    var el = document.getElementById('clock'); if (!el) return;
    var n = new Date();
    el.textContent = n.getDate()+' '+MO[n.getMonth()]+' '+n.getFullYear()+', '+DA[n.getDay()]+'  '+
        String(n.getHours()).padStart(2,'0')+':'+String(n.getMinutes()).padStart(2,'0')+':'+String(n.getSeconds()).padStart(2,'0');
}
setInterval(tick, 1000); tick();

// Breadcrumb
var titles = {index:'Ana Panel','emtia-enerji':'Enerji','emtia-metaller':'Kıymetli Madenler','emtia-tarim':'Tarım',kurlar:'Döviz Kurları',tahviller:'Tahvil Faizleri',endeksler:'Borsa Endeksleri',kripto:'Kripto Paralar',makro:'Türkiye Makro','iran-risk':'İran Risk Monitörü','kuresel-risk':'Küresel Risk','ekonomik-takvim':'Ekonomik Takvim','merkez-bankalari':'Merkez Bankaları'};
var bc = document.getElementById('topbarBreadcrumb');
if (bc) bc.innerHTML = '<a href="index.html">Panel</a> › ' + (titles[cur] || '');

})();
