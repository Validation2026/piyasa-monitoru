/**
 * Piyasa Monitörü — Sidebar Component
 * Her sayfaya otomatik sidebar + topbar enjekte eder.
 * <script src="assets/js/sidebar.js"></script> olarak dahil et.
 */
(function(){'use strict';

var SIDEBAR_HTML = `
<div class="sb-overlay" id="sbOverlay"></div>
<aside class="sidebar" id="sidebar">
    <a class="sb-brand" href="index.html">
        <span class="sb-brand-icon">📊</span>
        <span class="sb-brand-text">Piyasa Monitörü</span>
    </a>

    <a class="sb-direct" href="index.html" data-page="index">
        <span class="sb-icon">🏠</span> Ana Panel
    </a>

    <div class="sb-section" data-section="emtia">
        <div class="sb-section-title">
            <span class="sb-arrow">▶</span>
            <span class="sb-icon">📦</span>
            Emtia
            <span class="sb-badge">3</span>
        </div>
        <div class="sb-pages">
            <a class="sb-link" href="emtia-enerji.html" data-page="emtia-enerji">⛽ Enerji</a>
            <a class="sb-link" href="emtia-metaller.html" data-page="emtia-metaller">🥇 Kıymetli Madenler</a>
            <a class="sb-link" href="emtia-tarim.html" data-page="emtia-tarim">🌾 Tarım</a>
        </div>
    </div>

    <div class="sb-section" data-section="finans">
        <div class="sb-section-title">
            <span class="sb-arrow">▶</span>
            <span class="sb-icon">💹</span>
            Finans
            <span class="sb-badge">3</span>
        </div>
        <div class="sb-pages">
            <a class="sb-link" href="kurlar.html" data-page="kurlar">💱 Döviz Kurları</a>
            <a class="sb-link" href="tahviller.html" data-page="tahviller">📜 Tahvil Faizleri</a>
            <a class="sb-link" href="endeksler.html" data-page="endeksler">📈 Borsa Endeksleri</a>
        </div>
    </div>

    <a class="sb-direct" href="makro.html" data-page="makro">
        <span class="sb-icon">🏦</span> Türkiye Makro
    </a>

    <div class="sb-footer">
        <button class="sb-theme-btn" id="sbThemeBtn">🌙 Tema Değiştir</button>
    </div>
</aside>

<div class="topbar" id="topbar">
    <button class="topbar-hamburger" id="hamburger">☰</button>
    <div class="topbar-breadcrumb" id="topbarBreadcrumb"></div>
    <span class="topbar-clock" id="clock"></span>
</div>
`;

// ── Inject sidebar ──
document.body.insertAdjacentHTML('afterbegin', SIDEBAR_HTML);

// Wrap existing content in .main
var mainContent = document.getElementById('mainContent');
if (!mainContent) {
    // Find the .page div and wrap it
    var pageDiv = document.querySelector('.page');
    if (pageDiv) {
        var wrapper = document.createElement('div');
        wrapper.className = 'main';
        wrapper.id = 'mainContent';
        pageDiv.parentNode.insertBefore(wrapper, pageDiv);
        wrapper.appendChild(pageDiv);
    }
}

// ── Active page detection ──
var currentPage = location.pathname.split('/').pop().replace('.html','') || 'index';

// Mark active link
document.querySelectorAll('.sb-link, .sb-direct').forEach(function(link) {
    var pg = link.getAttribute('data-page');
    if (pg === currentPage) {
        link.classList.add('active');
        // Open parent section
        var section = link.closest('.sb-section');
        if (section) section.classList.add('open');
    }
});

// ── Section toggle ──
document.querySelectorAll('.sb-section-title').forEach(function(title) {
    title.addEventListener('click', function() {
        this.parentElement.classList.toggle('open');
    });
});

// ── Hamburger toggle (mobile) ──
var sidebar = document.getElementById('sidebar');
var overlay = document.getElementById('sbOverlay');
var hamburger = document.getElementById('hamburger');

hamburger.addEventListener('click', function() {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('open');
});
overlay.addEventListener('click', function() {
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
});

// ── Theme toggle ──
var themeBtn = document.getElementById('sbThemeBtn');
// Also support old themeToggle button if exists
var oldThemeBtn = document.getElementById('themeToggle');

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    if (themeBtn) themeBtn.textContent = (theme === 'dark' ? '🌙' : '☀️') + ' Tema Değiştir';
    if (oldThemeBtn) oldThemeBtn.textContent = theme === 'dark' ? '🌙' : '☀️';
    localStorage.setItem('theme', theme);
}

var saved = localStorage.getItem('theme');
if (saved) applyTheme(saved);

function toggleTheme() {
    var cur = document.documentElement.getAttribute('data-theme');
    applyTheme(cur === 'dark' ? 'light' : 'dark');
}

if (themeBtn) themeBtn.addEventListener('click', toggleTheme);
if (oldThemeBtn) oldThemeBtn.addEventListener('click', toggleTheme);

// ── Clock ──
var MO = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
var DA = ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];
function updateClock() {
    var el = document.getElementById('clock');
    if (!el) return;
    var n = new Date();
    el.textContent = n.getDate() + ' ' + MO[n.getMonth()] + ' ' + n.getFullYear() + ', ' + DA[n.getDay()] + '  ' +
        String(n.getHours()).padStart(2,'0') + ':' + String(n.getMinutes()).padStart(2,'0') + ':' + String(n.getSeconds()).padStart(2,'0');
}
setInterval(updateClock, 1000);
updateClock();

// ── Breadcrumb ──
var breadcrumbEl = document.getElementById('topbarBreadcrumb');
var pageTitles = {
    'index': 'Ana Panel',
    'emtia-enerji': 'Emtia › Enerji',
    'emtia-metaller': 'Emtia › Kıymetli Madenler',
    'emtia-tarim': 'Emtia › Tarım',
    'kurlar': 'Döviz Kurları',
    'tahviller': 'Tahvil Faizleri',
    'endeksler': 'Borsa Endeksleri',
    'makro': 'Türkiye Makro'
};
if (breadcrumbEl) {
    breadcrumbEl.innerHTML = '<a href="index.html">Panel</a> › ' + (pageTitles[currentPage] || '');
}

})();
