/**
 * Piyasa Monitörü — Shared JS v3
 * Detail page ortak fonksiyonlar (sidebar.js ile birlikte çalışır)
 */
var PM=(function(){'use strict';

var D='data/';
var COLORS=['#3b82f6','#00d68f','#fbbf24','#ff4757','#a78bfa','#22d3ee','#ec4899','#84cc16','#f97316','#6366f1','#14b8a6','#e11d48'];
var LOGO_CACHE={};
var TV_LOGO_BASE='https://s3-symbol-logo.tradingview.com/';

function fj(f){return fetch(D+f+'?t='+Date.now()).then(function(r){return r.json()}).catch(function(){return null})}
function fs(d,id){if(!d||!d.series)return null;for(var i=0;i<d.series.length;i++)if(d.series[i].id===id)return d.series[i];return null}
function fp(v,dec){if(v==null)return'—';dec=dec!=null?dec:2;return Number(v).toLocaleString('tr-TR',{minimumFractionDigits:dec,maximumFractionDigits:dec})}
function fc(p){if(p==null)return'<span class="chg" style="color:var(--t3)">—</span>';var s=p>=0?'+':'';var c=p>=0?'u':'d';return'<span class="chg '+c+'">'+s+p.toFixed(2)+'%</span>'}
function cc(p){return p!=null?(p>=0?'u':'d'):''}
function gc(i){return COLORS[i%COLORS.length]}

function hashCode(str){
    var h=0;
    if(!str)return h;
    for(var i=0;i<str.length;i++)h=((h<<5)-h)+str.charCodeAt(i),h|=0;
    return Math.abs(h);
}

function initials(name,id){
    var src=(name||id||'X').replace(/\s+/g,' ').trim();
    if(!src)return'X';
    var parts=src.split(' ');
    if(parts.length>1)return(parts[0][0]+parts[1][0]).toUpperCase();
    return src.replace(/[^A-Za-z0-9]/g,'').slice(0,2).toUpperCase()||'X';
}

function logoUrl(series){
    var key=(series&&series.id?series.id:'')+'|'+(series&&series.name?series.name:'');
    if(LOGO_CACHE[key])return LOGO_CACHE[key];
    var src=key||'asset';
    var h=hashCode(src)%360;
    var c1='hsl('+h+', 75%, 48%)';
    var c2='hsl('+((h+42)%360)+', 80%, 58%)';
    var txt=initials(series&&series.name,series&&series.id);
    var svg='<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">'+
        '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">'+
        '<stop offset="0%" stop-color="'+c1+'"/><stop offset="100%" stop-color="'+c2+'"/></linearGradient></defs>'+
        '<rect width="44" height="44" rx="11" fill="url(#g)"/>'+
        '<text x="50%" y="53%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-size="15" font-family="Outfit,Arial,sans-serif" font-weight="700">'+txt+'</text></svg>';
    var url='data:image/svg+xml;utf8,'+encodeURIComponent(svg);
    LOGO_CACHE[key]=url;
    return url;
}

function tradingViewCandidates(series){
    if(!series||!series.id)return [];
    var id=(series.id||'').trim();
    if(!id)return [];
    var out=[];
    var base=id.toUpperCase();
    var suffixMap={'.IS':'BIST','.KS':'KRX','.L':'LSE','.PA':'EURONEXT','.DE':'XETR','.MI':'MIL','.TO':'TSX'};
    var ex=null;
    Object.keys(suffixMap).forEach(function(sf){
        if(base.slice(-sf.length)===sf){ ex=suffixMap[sf]; base=base.slice(0,-sf.length); }
    });
    var normalized=base.toLowerCase().replace(/[^a-z0-9]/g,'');
    if(ex){
        out.push(TV_LOGO_BASE+ex+'-'+base+'.svg');
        out.push(TV_LOGO_BASE+ex+'-'+base+'--big.svg');
        out.push(TV_LOGO_BASE+ex+'-'+normalized+'.svg');
    }
    out.push(TV_LOGO_BASE+base.toLowerCase()+'.svg');
    out.push(TV_LOGO_BASE+base.toLowerCase()+'--big.svg');
    if(id.indexOf('-')!==-1){
        out.push(TV_LOGO_BASE+id.toLowerCase().replace(/[^a-z0-9]/g,'')+'.svg');
    }
    return out.filter(function(u,idx){ return out.indexOf(u)===idx; });
}

function pmLogoNext(img){
    if(!img)return;
    var raw=img.getAttribute('data-logo-candidates')||'';
    if(!raw)return;
    var all=raw.split('|').filter(Boolean);
    var idx=parseInt(img.getAttribute('data-logo-index')||'0',10);
    idx++;
    if(idx<all.length){
        img.setAttribute('data-logo-index',String(idx));
        img.src=all[idx];
        return;
    }
    img.onerror=null;
    img.src=img.getAttribute('data-logo-fallback')||logoUrl(null);
}

function logoImg(series,size){
    size=size||22;
    var safeName=((series&&series.name)||'Varlık').replace(/"/g,'');
    var candidates=tradingViewCandidates(series);
    var fallback=logoUrl(series);
    var src=candidates.length?candidates[0]:fallback;
    return '<img class="asset-logo" src="'+src+'" alt="'+safeName+' logosu" width="'+size+'" height="'+size+'" loading="lazy" decoding="async" data-logo-candidates="'+candidates.join('|')+'" data-logo-index="0" data-logo-fallback="'+fallback+'" onerror="window.PMLogoNext(this)">';
}
window.PMLogoNext=pmLogoNext;
                   
function filterPeriod(data, period) {
    if (!data || !data.length) return [];
    if (period === 'all') return data;
    
    var now = new Date();
    var cut;
    
    switch (period) {
        case '1m': cut = new Date(now.getTime() - 30 * 864e5); break;
        case '3m': cut = new Date(now.getTime() - 90 * 864e5); break;
        case '6m': cut = new Date(now.getTime() - 180 * 864e5); break;
        case '1y': cut = new Date(now.getTime() - 365 * 864e5); break;
        case '2y': cut = new Date(now.getTime() - 730 * 864e5); break;
        case '3y': cut = new Date(now.getTime() - 1095 * 864e5); break;
        case '5y': cut = new Date(now.getTime() - 1825 * 864e5); break;
        case 'ytd': cut = new Date(now.getFullYear(), 0, 1); break;
        default: return data;
    }
    
    var cs = cut.toISOString().split('T')[0];
    return data.filter(function(d) { return d.date >= cs });
}

function miniSpark(canvasId,data,color){
    var c=document.getElementById(canvasId);if(!c||!data||data.length<2)return;
    var pts=data.slice(-60).map(function(d){return d.value});
    new Chart(c,{type:'line',data:{labels:pts.map(function(){return''}),datasets:[{data:pts,borderColor:color,backgroundColor:color+'15',fill:true,tension:.4,pointRadius:0,borderWidth:1.5}]},options:{responsive:true,maintainAspectRatio:false,animation:false,plugins:{legend:{display:false},tooltip:{enabled:false}},scales:{x:{display:false},y:{display:false}}}})
}

function downsample(arr,max){if(!arr||arr.length<=max)return arr;var step=arr.length/max;var result=[];for(var i=0;i<max;i++){var idx=Math.floor(i*step);result.push(arr[idx])}if(arr.length>0)result[result.length-1]=arr[arr.length-1];return result}

function makeChart(canvasId,series,opts){
    var c=document.getElementById(canvasId);if(!c||!series||!series.data||!series.data.length)return null;
    opts=opts||{};var color=opts.color||COLORS[0];
    var filtered=filterPeriod(series.data,opts.period||'all');
    filtered=downsample(filtered,300);
    var labels=filtered.map(function(d){return d.date});var vals=filtered.map(function(d){return d.value});
    var dark=document.documentElement.getAttribute('data-theme')!=='light';
    var grid=dark?'rgba(255,255,255,.05)':'rgba(0,0,0,.05)';var txt=dark?'#8a99b2':'#475569';
    var MO=['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
    return new Chart(c,{type:'line',data:{labels:labels,datasets:[{label:series.name,data:vals,borderColor:color,backgroundColor:color+'12',fill:true,tension:.3,pointRadius:0,pointHoverRadius:4,pointHoverBackgroundColor:color,borderWidth:1.5}]},options:{responsive:true,maintainAspectRatio:false,animation:false,interaction:{mode:'index',intersect:false},plugins:{legend:{display:false},tooltip:{backgroundColor:dark?'#1e293b':'#fff',titleColor:dark?'#e8edf5':'#0f172a',bodyColor:dark?'#8a99b2':'#475569',borderColor:dark?'#334155':'#dde4ed',borderWidth:1,padding:10,displayColors:false,callbacks:{label:function(ctx){return series.name+': '+fp(ctx.raw)+' '+(series.unit||'')}}}},scales:{x:{grid:{color:grid,drawBorder:false},ticks:{color:txt,font:{size:10,family:"'JetBrains Mono'"},maxTicksLimit:window.innerWidth<600?4:8,callback:function(v){var l=this.getLabelForValue(v);var p=l.split('-');if(p.length>=2)return MO[parseInt(p[1])-1]+' '+p[0].slice(2);return l}}},y:{grid:{color:grid,drawBorder:false},ticks:{color:txt,font:{size:10,family:"'JetBrains Mono'"},callback:function(v){return fp(v,0)}}}}}})
}

function buildSummary(containerId,seriesList){
    var el=document.getElementById(containerId);if(!el)return;var h='';
    seriesList.forEach(function(s,i){if(!s)return;
        var chgs='';
        if(s.change_1d_pct!=null)chgs+=fc(s.change_1d_pct)+'<span class="chg-label">1G</span> ';
        if(s.change_1w_pct!=null)chgs+=fc(s.change_1w_pct)+'<span class="chg-label">1H</span> ';
        if(s.change_1m_pct!=null)chgs+=fc(s.change_1m_pct)+'<span class="chg-label">1A</span> ';
        if(s.change_ytd_pct!=null)chgs+=fc(s.change_ytd_pct)+'<span class="chg-label">YTD</span> ';
        var range=s.low_52w!=null?'52H: '+fp(s.low_52w)+' — '+fp(s.high_52w):'';
        var sid='mini-spark-'+i;
        var ariaLabel = s.name+': '+fp(s.current)+' '+(s.unit||'')+(s.change_1d_pct!=null?', günlük değişim '+s.change_1d_pct.toFixed(2)+'%':'');
        h+='<div class="scard fade-in" style="animation-delay:'+(.05*i)+'s" role="group" aria-label="'+ariaLabel.replace(/"/g,'')+'"><div class="scard-name">'+logoImg(s,18)+'<span>'+s.name+'</span></div><div class="scard-price">'+fp(s.current)+' <span class="scard-unit">'+(s.unit||'')+'</span></div><div class="scard-chgs">'+chgs+'</div>'+(range?'<div class="scard-range">'+range+'</div>':'')+'<div class="scard-spark"><canvas id="'+sid+'" aria-hidden="true"></canvas></div></div>';    
        });
    el.innerHTML=h;
    setTimeout(function(){seriesList.forEach(function(s,i){if(s&&s.data)miniSpark('mini-spark-'+i,s.data,gc(i))})},50);
}

function buildCharts(containerId,seriesList,period){
    var el=document.getElementById(containerId);if(!el)return;el.innerHTML='';var charts=[];
    seriesList.forEach(function(s,i){if(!s)return;
        var cid='chart-'+i;var card=document.createElement('div');card.className='chrt fade-in';card.style.animationDelay=(.05*i)+'s';
        card.setAttribute('role','figure');
        card.setAttribute('aria-label',s.name+' grafiği');
        var pBadge=s.change_1d_pct!=null?fc(s.change_1d_pct):'';
        card.innerHTML='<div class="chrt-title">'+logoImg(s,20)+'<span>'+s.name+'</span></div><div class="chrt-sub"><span class="live">'+fp(s.current)+' '+(s.unit||'')+'</span>'+pBadge+'</div><canvas id="'+cid+'" aria-hidden="true"></canvas>';    
        el.appendChild(card);var ch=makeChart(cid,s,{color:gc(i),period:period});if(ch)charts.push(ch);
    });return charts;
}

function buildTable(containerId,seriesList){
    var el=document.getElementById(containerId);if(!el)return;
    var h='<table><thead><tr><th>İsim</th><th class="r">Fiyat</th><th class="r">1 Gün</th><th class="r">1 Hafta</th><th class="r">1 Ay</th><th class="r">YTD</th><th class="r">52H Aralık</th></tr></thead><tbody>';
    seriesList.forEach(function(s){if(!s)return;
        function cv(p){if(p==null)return'<td class="mono r dim">—</td>';return'<td class="mono r '+cc(p)+'">'+(p>=0?'+':'')+p.toFixed(2)+'%</td>'}
        h+='<tr><td class="asset-name-cell">'+logoImg(s,18)+'<span>'+s.name+'</span></td><td class="mono r">'+fp(s.current)+' <span class="dim">'+(s.unit||'')+'</span></td>'+cv(s.change_1d_pct)+cv(s.change_1w_pct)+cv(s.change_1m_pct)+cv(s.change_ytd_pct)+'<td class="mono r dim" style="font-size:.7rem">'+(s.low_52w!=null?fp(s.low_52w)+' — '+fp(s.high_52w):'—')+'</td></tr>';   
    });h+='</tbody></table>';el.innerHTML=h;
}

// Comparison multi-line chart (normalized to %)
function buildComparisonChart(canvasId,seriesList,period){
    var c=document.getElementById(canvasId);if(!c||!seriesList||!seriesList.length)return null;
    var dark=document.documentElement.getAttribute('data-theme')!=='light';
    var grid=dark?'rgba(255,255,255,.05)':'rgba(0,0,0,.05)';var txt=dark?'#8a99b2':'#475569';
    var MO=['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
    // Tum tarihlerin birlesimi: x ekseni butun grafik boyunca uzansin
    var dateSet={};
    var perSeries=[];
    seriesList.forEach(function(s,i){
        if(!s||!s.data){perSeries.push(null);return;}
        var filtered=downsample(filterPeriod(s.data,period||'1y'),300);
        if(!filtered.length){perSeries.push(null);return;}
        var base=filtered[0].value;if(!base){perSeries.push(null);return;}
        var map={};
        filtered.forEach(function(d){map[d.date]=((d.value-base)/base)*100;dateSet[d.date]=1});
        perSeries.push({s:s,i:i,map:map});
    });
    var allLabels=Object.keys(dateSet).sort();
    var datasets=[];
    perSeries.forEach(function(ps){
        if(!ps)return;
        var data=allLabels.map(function(dt){return ps.map[dt]!=null?ps.map[dt]:null});
        datasets.push({label:ps.s.name,data:data,borderColor:gc(ps.i),backgroundColor:'transparent',tension:.3,pointRadius:0,pointHoverRadius:4,borderWidth:2,spanGaps:true});
    });
    return new Chart(c,{type:'line',data:{labels:allLabels,datasets:datasets},options:{responsive:true,maintainAspectRatio:false,animation:false,interaction:{mode:'index',intersect:false},plugins:{legend:{display:true,position:'top',labels:{color:txt,font:{size:11,family:"'Outfit'"},boxWidth:12,padding:12}},tooltip:{backgroundColor:dark?'#1e293b':'#fff',titleColor:dark?'#e8edf5':'#0f172a',bodyColor:dark?'#8a99b2':'#475569',borderColor:dark?'#334155':'#dde4ed',borderWidth:1,padding:10,callbacks:{label:function(ctx){if(ctx.raw==null)return'';return ctx.dataset.label+': '+(ctx.raw>=0?'+':'')+ctx.raw.toFixed(2)+'%'}}}},scales:{x:{grid:{color:grid,drawBorder:false},ticks:{color:txt,font:{size:10,family:"'JetBrains Mono'"},maxTicksLimit:6,callback:function(v){var l=this.getLabelForValue(v);var p=l.split('-');if(p.length>=2)return MO[parseInt(p[1])-1]+' '+p[0].slice(2);return l}}},y:{grid:{color:grid,drawBorder:false},ticks:{color:txt,font:{size:10,family:"'JetBrains Mono'"},callback:function(v){return(v>=0?'+':'')+v.toFixed(0)+'%'}}}}}});
}

function applyOverrides(seriesList, overrides) {
    if (!overrides || !seriesList) return seriesList;
    seriesList.forEach(function(s) {
        if (!s || !overrides[s.id]) return;
        var ov = overrides[s.id];
        if (ov.value != null) s.current = ov.value;
        if (ov.change_1d != null) s.change_1d_pct = ov.change_1d;
        if (ov.change_1w != null) s.change_1w_pct = ov.change_1w;
    });
    return seriesList;
}

function loadOverrides(pageId) {
    return fetch('/api/page-state?page=' + pageId).then(function(r) { return r.json(); }).then(function(d) {
        return (d && d.overrides) ? d.overrides : {};
    }).catch(function() { return {}; });
}

function loadData(file, pageId) {
    // Veri ve override'lari paralel yukle, override'lari uygula
    return Promise.all([fj(file), loadOverrides(pageId)]).then(function(r){
        var data = r[0], ov = r[1];
        if (data && data.series && ov) applyOverrides(data.series, ov);
        // Veri eski mi? (60 dk üstü)
        if (data && data.meta && data.meta.updated_at) {
            try { showStaleBanner(data.meta.updated_at, 60); } catch(e){}
        }
        return data;
    });
}

/* ══════════════════════════════════════════
   STALE DATA BANNER (Veri eskilik uyarısı)
   ══════════════════════════════════════════ */
function showStaleBanner(updatedAt, thresholdMinutes){
    if(!updatedAt) return;
    var t = new Date(updatedAt).getTime();
    if(!t || isNaN(t)) return;
    var diffMin = (Date.now() - t) / 60000;
    var limit = thresholdMinutes || 60;
    if(diffMin < limit) return;
    // Banner zaten varsa iki kez ekleme
    if(document.getElementById('staleBanner')) return;
    var hoursAgo = Math.floor(diffMin/60);
    var ago = hoursAgo >= 1 ? (hoursAgo+' saat') : (Math.floor(diffMin)+' dakika');
    var el = document.createElement('div');
    el.id = 'staleBanner';
    el.className = 'stale-banner';
    el.setAttribute('role','status');
    el.setAttribute('aria-live','polite');
    el.innerHTML = '<span class="stale-icon" aria-hidden="true">⚠️</span>'+
        '<span><b>Veri güncel olmayabilir.</b> Son güncelleme '+ago+' önce.</span>';
    var head = document.querySelector('.page-head');
    if(head && head.parentNode) head.parentNode.insertBefore(el, head.nextSibling);
}

/* ══════════════════════════════════════════
   COUNT-UP (Sayıya yumuşak geçiş)
   ══════════════════════════════════════════ */
function countUp(el, from, to, opts){
    if(!el) return;
    opts = opts || {};
    var dur = opts.duration || 900;
    var dec = opts.decimals != null ? opts.decimals : 2;
    var start = performance.now();
    function step(t){
        var p = Math.min(1, (t-start)/dur);
        var eased = 1 - Math.pow(1-p, 3); // easeOutCubic
        var val = from + (to-from) * eased;
        el.textContent = Number(val).toLocaleString('tr-TR',{minimumFractionDigits:dec,maximumFractionDigits:dec});
        if(p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

/* ══════════════════════════════════════════
   SCROLL REVEAL (IntersectionObserver)
   ══════════════════════════════════════════ */
function initScrollReveal(){
    if(!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function(entries){
        entries.forEach(function(e){
            if(e.isIntersecting){
                e.target.classList.add('is-visible');
                io.unobserve(e.target);
            }
        });
    }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });
    document.querySelectorAll('.reveal').forEach(function(el){ io.observe(el); });
}

/* ══════════════════════════════════════════
   FLASH UPDATE (fiyat değişince yeşil/kırmızı parlama)
   ══════════════════════════════════════════ */
function flashUpdate(el, direction){
    if(!el) return;
    var cls = direction === 'up' ? 'flash-up' : direction === 'down' ? 'flash-down' : 'flash-update';
    el.classList.remove('flash-up','flash-down','flash-update');
    // reflow
    void el.offsetWidth;
    el.classList.add(cls);
}

/* ══════════════════════════════════════════
   BAR CHART — Performans sıralaması (yatay bar)
   ══════════════════════════════════════════ */
function buildBarChart(canvasId, seriesList, changeKey){
    var c = document.getElementById(canvasId); if(!c) return null;
    changeKey = changeKey || 'change_1d_pct';
    var items = seriesList.filter(function(s){ return s && s[changeKey] != null; })
        .map(function(s){ return { name: s.name, val: s[changeKey] }; })
        .sort(function(a,b){ return b.val - a.val; });
    if(!items.length) return null;
    var labels = items.map(function(d){ return d.name; });
    var vals = items.map(function(d){ return d.val; });
    var colors = vals.map(function(v){ return v >= 0 ? '#00d68f' : '#ff4757'; });
    var txt = '#475569';
    return new Chart(c, {
        type: 'bar',
        data: { labels: labels, datasets: [{ data: vals, backgroundColor: colors, borderRadius: 4, barPercentage: 0.7 }] },
        options: {
            indexAxis: 'y', responsive: true, maintainAspectRatio: false, animation: { duration: 600 },
            plugins: { legend: { display: false }, tooltip: {
                callbacks: { label: function(ctx){ return (ctx.raw >= 0 ? '+' : '') + ctx.raw.toFixed(2) + '%'; } }
            }},
            scales: {
                x: { grid: { color: 'rgba(0,0,0,.05)', drawBorder: false }, ticks: { color: txt, font: { size: 10, family: "'JetBrains Mono'" }, callback: function(v){ return (v>=0?'+':'')+v+'%'; } } },
                y: { grid: { display: false }, ticks: { color: txt, font: { size: 11, family: "'Outfit'" } } }
            }
        }
    });
}

/* ══════════════════════════════════════════
   DONUT CHART — Dağılım/ağırlık gösterimi
   ══════════════════════════════════════════ */
function buildDonutChart(canvasId, labels, values, colors){
    var c = document.getElementById(canvasId); if(!c) return null;
    colors = colors || labels.map(function(_,i){ return gc(i); });
    return new Chart(c, {
        type: 'doughnut',
        data: { labels: labels, datasets: [{ data: values, backgroundColor: colors, borderWidth: 2, borderColor: '#fff', hoverOffset: 6 }] },
        options: {
            responsive: true, maintainAspectRatio: false, animation: { duration: 600 },
            cutout: '65%',
            plugins: {
                legend: { position: 'right', labels: { color: '#475569', font: { size: 11, family: "'Outfit'" }, padding: 10, boxWidth: 14 } },
                tooltip: { callbacks: { label: function(ctx){ return ctx.label + ': ' + fp(ctx.raw); } } }
            }
        }
    });
}

/* ══════════════════════════════════════════
   HEATMAP TABLE — Renkli performans matrisi
   ══════════════════════════════════════════ */
function buildHeatmap(containerId, seriesList){
    var el = document.getElementById(containerId); if(!el) return;
    var periods = [
        { key: 'change_1d_pct', label: '1G' },
        { key: 'change_1w_pct', label: '1H' },
        { key: 'change_1m_pct', label: '1A' },
        { key: 'change_3m_pct', label: '3A' },
        { key: 'change_ytd_pct', label: 'YTD' },
        { key: 'change_1y_pct', label: '1Y' }
    ];
    function heatColor(v){
        if(v == null) return 'background:transparent;color:var(--t3)';
        var abs = Math.min(Math.abs(v), 10);
        var intensity = abs / 10;
        if(v >= 0) return 'background:rgba(0,214,143,' + (intensity * 0.25).toFixed(2) + ');color:#00a870';
        return 'background:rgba(255,71,87,' + (intensity * 0.25).toFixed(2) + ');color:#e8364b';
    }
    var h = '<table class="heatmap-tbl"><thead><tr><th>Varlık</th><th class="r">Fiyat</th>';
    periods.forEach(function(p){ h += '<th class="r">' + p.label + '</th>'; });
    h += '</tr></thead><tbody>';
    seriesList.forEach(function(s){
        if(!s) return;
        h += '<tr><td class="hm-name">' + s.name + '</td><td class="mono r">' + fp(s.current) + '</td>';
        periods.forEach(function(p){
            var v = s[p.key];
            h += '<td class="mono r hm-cell" style="' + heatColor(v) + '">' + (v != null ? (v >= 0 ? '+' : '') + v.toFixed(2) + '%' : '—') + '</td>';
        });
        h += '</tr>';
    });
    h += '</tbody></table>';
    el.innerHTML = h;
}

/* ══════════════════════════════════════════
   AREA CHART — Gradient dolgulu alan grafiği
   ══════════════════════════════════════════ */
function makeAreaChart(canvasId, series, opts){
    var c = document.getElementById(canvasId); if(!c || !series || !series.data || !series.data.length) return null;
    opts = opts || {}; var color = opts.color || COLORS[0];
    var filtered = filterPeriod(series.data, opts.period || 'all');
    filtered = downsample(filtered, 300);
    var labels = filtered.map(function(d){ return d.date; });
    var vals = filtered.map(function(d){ return d.value; });
    var ctx = c.getContext('2d');
    var grad = ctx.createLinearGradient(0, 0, 0, c.parentElement ? c.parentElement.clientHeight || 260 : 260);
    grad.addColorStop(0, color + '40');
    grad.addColorStop(0.7, color + '08');
    grad.addColorStop(1, color + '00');
    var txt = '#475569';
    var MO = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
    return new Chart(c, {
        type: 'line',
        data: { labels: labels, datasets: [{ label: series.name, data: vals, borderColor: color, backgroundColor: grad, fill: true, tension: 0.35, pointRadius: 0, pointHoverRadius: 5, pointHoverBackgroundColor: color, borderWidth: 2 }] },
        options: {
            responsive: true, maintainAspectRatio: false, animation: false,
            interaction: { mode: 'index', intersect: false },
            plugins: { legend: { display: false }, tooltip: {
                backgroundColor: '#fff', titleColor: '#0f172a', bodyColor: '#475569', borderColor: '#dde4ed', borderWidth: 1, padding: 10, displayColors: false,
                callbacks: { label: function(ctx){ return series.name + ': ' + fp(ctx.raw) + ' ' + (series.unit || ''); } }
            }},
            scales: {
                x: { grid: { display: false }, ticks: { color: txt, font: { size: 10, family: "'JetBrains Mono'" }, maxTicksLimit: window.innerWidth < 600 ? 4 : 8, callback: function(v){ var l = this.getLabelForValue(v); var p = l.split('-'); if(p.length >= 2) return MO[parseInt(p[1])-1]+' '+p[0].slice(2); return l; } } },
                y: { grid: { color: 'rgba(0,0,0,.04)', drawBorder: false }, ticks: { color: txt, font: { size: 10, family: "'JetBrains Mono'" }, callback: function(v){ return fp(v,0); } } }
            }
        }
    });
}

return{fj:fj,fs:fs,fp:fp,fc:fc,cc:cc,gc:gc,filterPeriod:filterPeriod,miniSpark:miniSpark,makeChart:makeChart,makeAreaChart:makeAreaChart,buildSummary:buildSummary,buildCharts:buildCharts,buildTable:buildTable,buildComparisonChart:buildComparisonChart,buildBarChart:buildBarChart,buildDonutChart:buildDonutChart,buildHeatmap:buildHeatmap,applyOverrides:applyOverrides,loadOverrides:loadOverrides,loadData:loadData,showStaleBanner:showStaleBanner,countUp:countUp,initScrollReveal:initScrollReveal,flashUpdate:flashUpdate};
})();

// Scroll reveal'ı DOM hazır olunca başlat
if(document.readyState !== 'loading') PM.initScrollReveal();
else document.addEventListener('DOMContentLoaded', PM.initScrollReveal);

/* ══════════════════════════════════════════
   TRADINGVIEW STİLİ TAM EKRAN İŞLEVİ (HD)
   ══════════════════════════════════════════ */
document.addEventListener("click", function(e) {
    // Tıklanan şey grafik (canvas) ise
    if (e.target.tagName.toLowerCase() === 'canvas') {
        var canvas = e.target;
        // Grafiği değil, onu saran "kart" div'ini tam ekran yapıyoruz (Başlıklar da gelsin diye)
        var chartContainer = canvas.parentElement; 
        
        chartContainer.classList.toggle('tv-fullscreen-mode');
        
        // Arka planın kaymasını engelle
        if (chartContainer.classList.contains('tv-fullscreen-mode')) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        
        // SİHİRLİ KISIM: Chart.js'in grafiği bulanıklaştırmadan HD kalitede baştan çizmesini zorla
        setTimeout(function() {
            window.dispatchEvent(new Event('resize'));
        }, 50);
    }
});

/* ══════════════════════════════════════════
   GLOBAL ZAMAN FİLTRESİ (TÜM GRAFİKLERİ AYNI ANDA GÜNCELLER)
   ══════════════════════════════════════════ */
document.addEventListener("click", function(e) {
    if (e.target.classList.contains('tf-btn')) {
        var btn = e.target;
        var container = btn.parentElement;
        var tf = btn.getAttribute('data-tf');
        
        // Sadece tıklanan butonu aktif (mavi) yap
        container.querySelectorAll('.tf-btn').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');

        // Sayfadaki TÜM Chart.js grafiklerini bul ve döngüye sok
        for (var id in Chart.instances) {
            var chartInstance = Chart.instances[id];
            
            if (chartInstance) {
                // Eğer grafiğin orijinal (5 yıllık) verisini henüz yedeklemediysek, ilk tıklamada yedekle
                if (!chartInstance.originalLabels) {
                    chartInstance.originalLabels = [...chartInstance.data.labels];
                    chartInstance.originalData = [...chartInstance.data.datasets[0].data];
                }

                var cutoffDate = new Date();

                // Tarih sınırını belirle
                if(tf === '1A') cutoffDate.setMonth(cutoffDate.getMonth() - 1);
                else if(tf === '3A') cutoffDate.setMonth(cutoffDate.getMonth() - 3);
                else if(tf === '6A') cutoffDate.setMonth(cutoffDate.getMonth() - 6);
                else if(tf === '1Y') cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);
                else if(tf === '2Y') cutoffDate.setFullYear(cutoffDate.getFullYear() - 2);
                else if(tf === '3Y') cutoffDate.setFullYear(cutoffDate.getFullYear() - 3);
                else if(tf === '5Y') cutoffDate.setFullYear(cutoffDate.getFullYear() - 5);
                else if(tf === 'YTD') {
                    cutoffDate = new Date(cutoffDate.getFullYear(), 0, 1);
                }

                var filteredLabels = [];
                var filteredData = [];

                // Verileri filtrele
                for (var i = 0; i < chartInstance.originalLabels.length; i++) {
                    var itemDate = new Date(chartInstance.originalLabels[i]);
                    if (tf === 'Tümü' || itemDate >= cutoffDate) {
                        filteredLabels.push(chartInstance.originalLabels[i]);
                        filteredData.push(chartInstance.originalData[i]);
                    }
                }

                // Grafiğe yeni veriyi ver ve çiz
                chartInstance.data.labels = filteredLabels;
                chartInstance.data.datasets[0].data = filteredData;
                chartInstance.update();

                // 🌟 SİHİRLİ ANİMASYON TETİKLEYİCİSİ 🌟
                // Animasyonu önce silip, tarayıcıyı zorla yenileyip (reflow), tekrar ekliyoruz
                chartInstance.canvas.style.animation = 'none';
                chartInstance.canvas.offsetHeight; /* Tarayıcıyı kandırıp animasyonu sıfırlıyoruz */
                chartInstance.canvas.style.animation = 'fadeInUp 0.5s ease-out forwards';
            }
        }
    }
});

/* ══════════════════════════════════════════
   AKILLI TAM EKRAN (DİNAMİK SAYFALAR İÇİN KESİN ÇÖZÜM)
   ══════════════════════════════════════════ */

// 1. Yeni canvas eklendiğinde otomatik buton yerleştir (MutationObserver)
function addExpandBtn(canvas) {
    var container = canvas.closest('.charts > div') || canvas.parentElement;
    if (!container || container.classList.contains('chart-box-relative')) return;
    container.classList.add('chart-box-relative');
    var btn = document.createElement('button');
    btn.className = 'chart-expand-btn';
    btn.innerHTML = '⛶';
    btn.title = 'Tam Ekran';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Grafiği tam ekran yap');
    btn.setAttribute('aria-pressed', 'false');
    if (window.getComputedStyle(container).position === 'static') {
        container.style.position = 'relative';
    }
    container.appendChild(btn);
}
// Sayfa yüklendiğinde mevcut canvas'ları tara
document.querySelectorAll('.charts canvas, .chrt canvas, .kpi-spark canvas').forEach(addExpandBtn);
// Sonradan eklenen grafikleri MutationObserver ile yakala
var _chartObserver = new MutationObserver(function(mutations) {
    mutations.forEach(function(m) {
        m.addedNodes.forEach(function(node) {
            if (node.nodeType !== 1) return;
            if (node.tagName === 'CANVAS') addExpandBtn(node);
            var canvases = node.querySelectorAll ? node.querySelectorAll('canvas') : [];
            canvases.forEach(addExpandBtn);
        });
    });
});
_chartObserver.observe(document.body, { childList: true, subtree: true });

// 2. Büyütme/Kapatma butonuna tıklanma olayını dinle
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('chart-expand-btn')) {
        var btn = e.target;
        var container = btn.parentElement;
        var canvas = container.querySelector('canvas');
        var chartInstance = Chart.getChart(canvas);
        
        container.classList.toggle('tv-fullscreen-mode');
        
        if (container.classList.contains('tv-fullscreen-mode')) {
            // TAM EKRANA GEÇİŞ
            document.body.style.overflow = 'hidden';
            btn.innerHTML = '✖';
            btn.title = 'Kapat';
            btn.setAttribute('aria-label','Tam ekrandan çık');
            btn.setAttribute('aria-pressed','true');

            if (chartInstance) {
                chartInstance.options.maintainAspectRatio = false; // Oran inadını kır
                chartInstance.update('none'); // Animasyonsuz anında güncelle
            }
        } else {
            // NORMAL EKRANA DÖNÜŞ
            document.body.style.overflow = '';
            btn.innerHTML = '⛶';
            btn.title = 'Tam Ekran';
            btn.setAttribute('aria-label','Grafiği tam ekran yap');
            btn.setAttribute('aria-pressed','false');
            
            if (chartInstance) {
                chartInstance.options.maintainAspectRatio = true; // Oran korumasını geri aç
                chartInstance.update('none');
            }
        }
        
        // Yeni ekran boyutuna göre grafiği HD kalitede zorla çizdir
        setTimeout(function() {
            if (chartInstance) chartInstance.resize();
            window.dispatchEvent(new Event('resize'));
        }, 50);
    }
});

/* ══════════════════════════════════════════
   ESC TUŞU İLE TAM EKRANDAN ÇIKIŞ
   ══════════════════════════════════════════ */
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        var fs = document.querySelector('.tv-fullscreen-mode');
        if (fs) {
            fs.classList.remove('tv-fullscreen-mode');
            document.body.style.overflow = '';
            var btn = fs.querySelector('.chart-expand-btn');
            if (btn) {
                btn.innerHTML = '⛶';
                btn.title = 'Tam Ekran';
            }
            var canvas = fs.querySelector('canvas');
            var chartInstance = canvas ? Chart.getChart(canvas) : null;
            if (chartInstance) {
                chartInstance.options.maintainAspectRatio = true;
                chartInstance.update('none');
            }
            setTimeout(function() { window.dispatchEvent(new Event('resize')); }, 50);
        }
    }
});

/* ══════════════════════════════════════════
   AKILLI OTOMATİK YENİLEME (MOBİL İÇİN)
   ══════════════════════════════════════════ */
(function() {
    var lastSeen = Date.now();
    
    // Kullanıcı sekmeye her geri döndüğünde çalışır
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'visible') {
            var now = Date.now();
            // Eğer kullanıcı sayfadan çıkalı 2 dakikadan (120.000 milisaniye) fazla olmuşsa
            if (now - lastSeen > 120000) {
                // true parametresi ile tarayıcı önbelleğini ezip zorla yeniler
                window.location.reload(true); 
            }
            lastSeen = now;
        }
    });
})();
