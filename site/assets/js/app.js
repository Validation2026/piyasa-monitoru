/**
 * Piyasa Monitörü — Shared JS
 * Ortak fonksiyonlar: veri yükleme, grafik oluşturma, formatlama
 */

var PM = (function() {
    'use strict';

    var DATA_DIR = 'data/';

    // ══════════════════════════════════════
    //  Data Loading
    // ══════════════════════════════════════

    function fetchJSON(file) {
        return fetch(DATA_DIR + file + '?t=' + Date.now())
            .then(function(r) { return r.json(); })
            .catch(function() { return null; });
    }

    function findSeries(data, id) {
        if (!data || !data.series) return null;
        for (var i = 0; i < data.series.length; i++) {
            if (data.series[i].id === id) return data.series[i];
        }
        return null;
    }

    // ══════════════════════════════════════
    //  Formatting
    // ══════════════════════════════════════

    function formatPrice(val, dec) {
        if (val == null) return '—';
        dec = dec != null ? dec : 2;
        return Number(val).toLocaleString('tr-TR', {
            minimumFractionDigits: dec,
            maximumFractionDigits: dec
        });
    }

    function formatChange(pct) {
        if (pct == null) return '<span class="s-chg" style="color:var(--text-muted)">—</span>';
        var sign = pct >= 0 ? '+' : '';
        var cls = pct >= 0 ? 'up' : 'down';
        return '<span class="s-chg ' + cls + '">' + sign + pct.toFixed(2) + '%</span>';
    }

    function changeClass(pct) {
        if (pct == null) return '';
        return pct >= 0 ? 'up' : 'down';
    }

    // ══════════════════════════════════════
    //  Chart Colors (cycling palette)
    // ══════════════════════════════════════

    var COLORS = [
        '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
        '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16',
        '#f97316', '#6366f1', '#14b8a6', '#e11d48'
    ];

    function getColor(i) { return COLORS[i % COLORS.length]; }

    // ══════════════════════════════════════
    //  Chart Creation
    // ══════════════════════════════════════

    function createLineChart(canvasId, series, options) {
        var canvas = document.getElementById(canvasId);
        if (!canvas || !series || !series.data || series.data.length === 0) return null;

        options = options || {};
        var color = options.color || COLORS[0];
        var data = series.data;

        // Period filter
        var period = options.period || '1y';
        var filtered = filterByPeriod(data, period);

        var labels = filtered.map(function(d) { return d.date; });
        var values = filtered.map(function(d) { return d.value; });

        var isDark = document.documentElement.getAttribute('data-theme') !== 'light';
        var gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
        var textColor = isDark ? '#8b9ab5' : '#64748b';

        var chart = new Chart(canvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: series.name,
                    data: values,
                    borderColor: color,
                    backgroundColor: color + '15',
                    fill: true,
                    tension: 0.3,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    pointHoverBackgroundColor: color,
                    borderWidth: 2,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 600 },
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: isDark ? '#1e293b' : '#ffffff',
                        titleColor: isDark ? '#e2e8f0' : '#1e293b',
                        bodyColor: isDark ? '#94a3b8' : '#64748b',
                        borderColor: isDark ? '#334155' : '#e2e8f0',
                        borderWidth: 1,
                        padding: 12,
                        displayColors: false,
                        callbacks: {
                            label: function(ctx) {
                                return series.name + ': ' + formatPrice(ctx.raw) + ' ' + (series.unit || '');
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: gridColor, drawBorder: false },
                        ticks: {
                            color: textColor, font: { size: 10, family: "'JetBrains Mono'" },
                            maxTicksLimit: 8,
                            callback: function(val, idx) {
                                var lbl = this.getLabelForValue(val);
                                // Show as "Oca 25" format
                                var parts = lbl.split('-');
                                if (parts.length >= 2) {
                                    var months = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
                                    return months[parseInt(parts[1])-1] + ' ' + parts[0].slice(2);
                                }
                                return lbl;
                            }
                        }
                    },
                    y: {
                        grid: { color: gridColor, drawBorder: false },
                        ticks: {
                            color: textColor,
                            font: { size: 10, family: "'JetBrains Mono'" },
                            callback: function(val) { return formatPrice(val, 0); }
                        }
                    }
                }
            }
        });

        return chart;
    }

    function filterByPeriod(data, period) {
        if (!data || !data.length) return [];
        var now = new Date();
        var cutoff;

        switch(period) {
            case '1m': cutoff = new Date(now.getTime() - 30*86400000); break;
            case '3m': cutoff = new Date(now.getTime() - 90*86400000); break;
            case '6m': cutoff = new Date(now.getTime() - 180*86400000); break;
            case '1y': cutoff = new Date(now.getTime() - 365*86400000); break;
            case 'ytd': cutoff = new Date(now.getFullYear(), 0, 1); break;
            default: return data;
        }

        var cutStr = cutoff.toISOString().split('T')[0];
        return data.filter(function(d) { return d.date >= cutStr; });
    }

    // ══════════════════════════════════════
    //  Summary Card Builder
    // ══════════════════════════════════════

    function buildSummaryCards(containerId, seriesList) {
        var container = document.getElementById(containerId);
        if (!container) return;

        var html = '';
        seriesList.forEach(function(s) {
            if (!s) return;

            var changes = '';
            if (s.change_1d_pct != null) changes += formatChange(s.change_1d_pct) + '<span class="s-chg-label">1G</span> ';
            if (s.change_1w_pct != null) changes += formatChange(s.change_1w_pct) + '<span class="s-chg-label">1H</span> ';
            if (s.change_1m_pct != null) changes += formatChange(s.change_1m_pct) + '<span class="s-chg-label">1A</span> ';
            if (s.change_ytd_pct != null) changes += formatChange(s.change_ytd_pct) + '<span class="s-chg-label">YTD</span> ';

            var range = '';
            if (s.low_52w != null && s.high_52w != null) {
                range = '52H: ' + formatPrice(s.low_52w) + ' — ' + formatPrice(s.high_52w);
            }

            html += '<div class="summary-card">' +
                '<div class="s-name">' + s.name + '</div>' +
                '<div class="s-price">' + formatPrice(s.current) + ' <span class="s-unit">' + (s.unit || '') + '</span></div>' +
                '<div class="s-changes">' + changes + '</div>' +
                (range ? '<div class="s-range">' + range + '</div>' : '') +
                '</div>';
        });

        container.innerHTML = html || '<div class="summary-card"><div class="s-name">Veri yükleniyor...</div></div>';
    }

    // ══════════════════════════════════════
    //  Data Table Builder
    // ══════════════════════════════════════

    function buildDataTable(containerId, seriesList) {
        var container = document.getElementById(containerId);
        if (!container) return;

        var html = '<table><thead><tr>' +
            '<th>İsim</th><th style="text-align:right">Fiyat</th><th style="text-align:right">1 Gün</th>' +
            '<th style="text-align:right">1 Hafta</th><th style="text-align:right">1 Ay</th>' +
            '<th style="text-align:right">YTD</th><th style="text-align:right">52H Aralık</th>' +
            '</tr></thead><tbody>';

        seriesList.forEach(function(s) {
            if (!s) return;
            html += '<tr>' +
                '<td>' + s.name + '</td>' +
                '<td class="mono" style="text-align:right">' + formatPrice(s.current) + ' <small style="color:var(--text-muted)">' + (s.unit || '') + '</small></td>' +
                '<td class="mono ' + changeClass(s.change_1d_pct) + '" style="text-align:right">' + (s.change_1d_pct != null ? (s.change_1d_pct >= 0 ? '+' : '') + s.change_1d_pct.toFixed(2) + '%' : '—') + '</td>' +
                '<td class="mono ' + changeClass(s.change_1w_pct) + '" style="text-align:right">' + (s.change_1w_pct != null ? (s.change_1w_pct >= 0 ? '+' : '') + s.change_1w_pct.toFixed(2) + '%' : '—') + '</td>' +
                '<td class="mono ' + changeClass(s.change_1m_pct) + '" style="text-align:right">' + (s.change_1m_pct != null ? (s.change_1m_pct >= 0 ? '+' : '') + s.change_1m_pct.toFixed(2) + '%' : '—') + '</td>' +
                '<td class="mono ' + changeClass(s.change_ytd_pct) + '" style="text-align:right">' + (s.change_ytd_pct != null ? (s.change_ytd_pct >= 0 ? '+' : '') + s.change_ytd_pct.toFixed(2) + '%' : '—') + '</td>' +
                '<td class="mono" style="text-align:right;color:var(--text-muted);font-size:0.75rem">' +
                    (s.low_52w != null ? formatPrice(s.low_52w) + ' — ' + formatPrice(s.high_52w) : '—') + '</td>' +
                '</tr>';
        });

        html += '</tbody></table>';
        container.innerHTML = html;
    }

    // ══════════════════════════════════════
    //  Clock & Theme (shared)
    // ══════════════════════════════════════

    function initClock() {
        var months = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
        var days = ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];
        function update() {
            var el = document.getElementById('clock');
            if (!el) return;
            var n = new Date();
            el.textContent = n.getDate() + ' ' + months[n.getMonth()] + ' ' + n.getFullYear() +
                ', ' + days[n.getDay()] + '  ' +
                String(n.getHours()).padStart(2,'0') + ':' + String(n.getMinutes()).padStart(2,'0') + ':' + String(n.getSeconds()).padStart(2,'0');
        }
        setInterval(update, 1000);
        update();
    }

    function initTheme() {
        var btn = document.getElementById('themeToggle');
        if (!btn) return;
        var saved = localStorage.getItem('theme');
        if (saved) {
            document.documentElement.setAttribute('data-theme', saved);
            btn.textContent = saved === 'dark' ? '🌙' : '☀️';
        }
        btn.addEventListener('click', function() {
            var cur = document.documentElement.getAttribute('data-theme');
            var next = cur === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            btn.textContent = next === 'dark' ? '🌙' : '☀️';
            localStorage.setItem('theme', next);
        });
    }

    // ══════════════════════════════════════
    //  Public API
    // ══════════════════════════════════════

    return {
        fetchJSON: fetchJSON,
        findSeries: findSeries,
        formatPrice: formatPrice,
        formatChange: formatChange,
        changeClass: changeClass,
        getColor: getColor,
        createLineChart: createLineChart,
        filterByPeriod: filterByPeriod,
        buildSummaryCards: buildSummaryCards,
        buildDataTable: buildDataTable,
        initClock: initClock,
        initTheme: initTheme
    };

})();

// Auto-init
document.addEventListener('DOMContentLoaded', function() {
    PM.initClock();
    PM.initTheme();
});
