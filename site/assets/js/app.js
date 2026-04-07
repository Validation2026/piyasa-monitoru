/**
 * Piyasa Monitörü — Shared JS v3
 * Detail page ortak fonksiyonlar (sidebar.js ile birlikte çalışır)
 */
var PM=(function(){'use strict';

var D='data/';
var COLORS=['#3b82f6','#00d68f','#fbbf24','#ff4757','#a78bfa','#22d3ee','#ec4899','#84cc16','#f97316','#6366f1','#14b8a6','#e11d48'];

function fj(f){return fetch(D+f+'?t='+Date.now()).then(function(r){return r.json()}).catch(function(){return null})}
function fs(d,id){if(!d||!d.series)return null;for(var i=0;i<d.series.length;i++)if(d.series[i].id===id)return d.series[i];return null}
function fp(v,dec){if(v==null)return'—';dec=dec!=null?dec:2;return Number(v).toLocaleString('tr-TR',{minimumFractionDigits:dec,maximumFractionDigits:dec})}
function fc(p){if(p==null)return'<span class="chg" style="color:var(--t3)">—</span>';var s=p>=0?'+':'';var c=p>=0?'u':'d';return'<span class="chg '+c+'">'+s+p.toFixed(2)+'%</span>'}
function cc(p){return p!=null?(p>=0?'u':'d'):''}
function gc(i){return COLORS[i%COLORS.length]}

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
        h+='<div class="scard fade-in" style="animation-delay:'+(.05*i)+'s"><div class="scard-name">'+s.name+'</div><div class="scard-price">'+fp(s.current)+' <span class="scard-unit">'+(s.unit||'')+'</span></div><div class="scard-chgs">'+chgs+'</div>'+(range?'<div class="scard-range">'+range+'</div>':'')+'<div class="scard-spark"><canvas id="'+sid+'"></canvas></div></div>';
    });
    el.innerHTML=h;
    setTimeout(function(){seriesList.forEach(function(s,i){if(s&&s.data)miniSpark('mini-spark-'+i,s.data,gc(i))})},50);
}

function buildCharts(containerId,seriesList,period){
    var el=document.getElementById(containerId);if(!el)return;el.innerHTML='';var charts=[];
    seriesList.forEach(function(s,i){if(!s)return;
        var cid='chart-'+i;var card=document.createElement('div');card.className='chrt fade-in';card.style.animationDelay=(.05*i)+'s';
        var pBadge=s.change_1d_pct!=null?fc(s.change_1d_pct):'';
        card.innerHTML='<div class="chrt-title">'+s.name+'</div><div class="chrt-sub"><span class="live">'+fp(s.current)+' '+(s.unit||'')+'</span>'+pBadge+'</div><canvas id="'+cid+'"></canvas>';
        el.appendChild(card);var ch=makeChart(cid,s,{color:gc(i),period:period});if(ch)charts.push(ch);
    });return charts;
}

function buildTable(containerId,seriesList){
    var el=document.getElementById(containerId);if(!el)return;
    var h='<table><thead><tr><th>İsim</th><th class="r">Fiyat</th><th class="r">1 Gün</th><th class="r">1 Hafta</th><th class="r">1 Ay</th><th class="r">YTD</th><th class="r">52H Aralık</th></tr></thead><tbody>';
    seriesList.forEach(function(s){if(!s)return;
        function cv(p){if(p==null)return'<td class="mono r dim">—</td>';return'<td class="mono r '+cc(p)+'">'+(p>=0?'+':'')+p.toFixed(2)+'%</td>'}
        h+='<tr><td>'+s.name+'</td><td class="mono r">'+fp(s.current)+' <span class="dim">'+(s.unit||'')+'</span></td>'+cv(s.change_1d_pct)+cv(s.change_1w_pct)+cv(s.change_1m_pct)+cv(s.change_ytd_pct)+'<td class="mono r dim" style="font-size:.7rem">'+(s.low_52w!=null?fp(s.low_52w)+' — '+fp(s.high_52w):'—')+'</td></tr>';
    });h+='</tbody></table>';el.innerHTML=h;
}

// Comparison multi-line chart (normalized to %)
function buildComparisonChart(canvasId,seriesList,period){
    var c=document.getElementById(canvasId);if(!c||!seriesList||!seriesList.length)return null;
    var dark=document.documentElement.getAttribute('data-theme')!=='light';
    var grid=dark?'rgba(255,255,255,.05)':'rgba(0,0,0,.05)';var txt=dark?'#8a99b2':'#475569';
    var MO=['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
    var datasets=[];
    var maxLen=0;var allLabels=[];
    seriesList.forEach(function(s,i){
        if(!s||!s.data)return;
        var filtered=downsample(filterPeriod(s.data,period||'1y'),300);
        if(!filtered.length)return;
        var base=filtered[0].value;if(!base)return;
        var vals=filtered.map(function(d){return((d.value-base)/base)*100});
        var labels=filtered.map(function(d){return d.date});
        if(labels.length>maxLen){maxLen=labels.length;allLabels=labels}
        datasets.push({label:s.name,data:vals,borderColor:gc(i),backgroundColor:'transparent',tension:.3,pointRadius:0,pointHoverRadius:4,borderWidth:2});
    });
    return new Chart(c,{type:'line',data:{labels:allLabels,datasets:datasets},options:{responsive:true,maintainAspectRatio:false,animation:false,interaction:{mode:'index',intersect:false},plugins:{legend:{display:true,position:'top',labels:{color:txt,font:{size:11,family:"'Outfit'"},boxWidth:12,padding:12}},tooltip:{backgroundColor:dark?'#1e293b':'#fff',titleColor:dark?'#e8edf5':'#0f172a',bodyColor:dark?'#8a99b2':'#475569',borderColor:dark?'#334155':'#dde4ed',borderWidth:1,padding:10,callbacks:{label:function(ctx){return ctx.dataset.label+': '+(ctx.raw>=0?'+':'')+ctx.raw.toFixed(2)+'%'}}}},scales:{x:{grid:{color:grid,drawBorder:false},ticks:{color:txt,font:{size:10,family:"'JetBrains Mono'"},maxTicksLimit:6,callback:function(v){var l=this.getLabelForValue(v);var p=l.split('-');if(p.length>=2)return MO[parseInt(p[1])-1]+' '+p[0].slice(2);return l}}},y:{grid:{color:grid,drawBorder:false},ticks:{color:txt,font:{size:10,family:"'JetBrains Mono'"},callback:function(v){return(v>=0?'+':'')+v.toFixed(0)+'%'}}}}}});
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
        return data;
    });
}

return{fj:fj,fs:fs,fp:fp,fc:fc,cc:cc,gc:gc,filterPeriod:filterPeriod,miniSpark:miniSpark,makeChart:makeChart,buildSummary:buildSummary,buildCharts:buildCharts,buildTable:buildTable,buildComparisonChart:buildComparisonChart,applyOverrides:applyOverrides,loadOverrides:loadOverrides,loadData:loadData};
})();
