/**
 * Piyasa Monitörü — Shared JS v3
 * Detail page ortak fonksiyonlar (sidebar.js ile birlikte çalışır)
 */
var PM=(function(){'use strict';

var D='data/';
var COLORS=['#3b82f6','#00d68f','#fbbf24','#ff4757','#a78bfa','#22d3ee','#ec4899','#84cc16','#f97316','#6366f1','#14b8a6','#e11d48'];
var LOGO_CACHE={};
var TV_LOGO_BASE='https://s3-symbol-logo.tradingview.com/';
var DATA_CACHE_TTL_MS=120000; // 2 dk: sayfalar arası geçişte hızlı, veri güncelliği korunur
var DATA_CACHE_KEY_PREFIX='pm:data:';
var DATA_MEM_CACHE={};
var DATA_INFLIGHT={};
var CHART_JS_URL='https://cdn.jsdelivr.net/npm/chart.js@4';
var CHART_JS_PROMISE=null;

function ensureChartJs(){
    if(window.Chart) return Promise.resolve(window.Chart);
    if(CHART_JS_PROMISE) return CHART_JS_PROMISE;
    CHART_JS_PROMISE=new Promise(function(resolve,reject){
        var existing=document.querySelector('script[data-chartjs="true"]');
        if(existing){
            existing.addEventListener('load', function(){ resolve(window.Chart); }, { once:true });
            existing.addEventListener('error', function(){ reject(new Error('Chart.js yüklenemedi')); }, { once:true });
            return;
        }
        var sc=document.createElement('script');
        sc.src=CHART_JS_URL;
        sc.async=true;
        sc.setAttribute('data-chartjs','true');
        sc.onload=function(){ resolve(window.Chart); };
        sc.onerror=function(){ reject(new Error('Chart.js yüklenemedi')); };
        document.head.appendChild(sc);
    });
    return CHART_JS_PROMISE;
}

function nowTs(){ return Date.now(); }
function cacheKey(file){ return DATA_CACHE_KEY_PREFIX+file; }

function readSessionCache(file){
    try{
        var raw=sessionStorage.getItem(cacheKey(file));
        if(!raw) return null;
        var parsed=JSON.parse(raw);
        if(!parsed||!parsed.ts||parsed.data==null) return null;
        if((nowTs()-parsed.ts)>DATA_CACHE_TTL_MS) return null;
        return parsed.data;
    }catch(_){ return null; }
}

function writeSessionCache(file,data){
    try{
        sessionStorage.setItem(cacheKey(file), JSON.stringify({ts:nowTs(), data:data}));
    }catch(_){ }
}

function fetchJson(file){
    return fetch(D+file, { cache:'default' }).then(function(r){
        if(!r.ok) throw new Error('HTTP '+r.status);
        return r.json();
    });
}

function fj(file,opts){
    opts=opts||{};
    var force=opts.force===true;
    var hit=DATA_MEM_CACHE[file];
    if(!force&&hit&&(nowTs()-hit.ts)<=DATA_CACHE_TTL_MS) return Promise.resolve(hit.data);

    var ss=force?null:readSessionCache(file);
    if(ss){
        DATA_MEM_CACHE[file]={ts:nowTs(),data:ss};
        return Promise.resolve(ss);
    }

    if(DATA_INFLIGHT[file]) return DATA_INFLIGHT[file];

    DATA_INFLIGHT[file]=fetchJson(file).then(function(data){
        DATA_MEM_CACHE[file]={ts:nowTs(),data:data};
        writeSessionCache(file,data);
        return data;
    }).catch(function(){ return null; }).finally(function(){
        delete DATA_INFLIGHT[file];
    });

    return DATA_INFLIGHT[file];
}
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

var YAHOO_TO_TV={
    'BZ=F':'brent','CL=F':'wti',
    'GC=F':'xauusd','SI=F':'xagusd','PL=F':'xptusd','PA=F':'xpdusd',
    'ZN=F':'znc','DX-Y.NYB':'dxy',
    '^IRX':'us03my','2YY=F':'us02y','^FVX':'us05y','^TNX':'us10y','^TYX':'us30y',
    '^GSPC':'spx','^IXIC':'ndx','^STOXX50E':'sx5e','^FTSE':'ukx',
    '^GDAXI':'dax','^FCHI':'px1','^N225':'ni225','^BSESN':'sensex',
    '^KS11':'kospi','^TWII':'taiex','^MERV':'imv','^AXJO':'xjo','^IBEX':'ibc',
    '000001.SS':'shcomp'
};
function tradingViewCandidates(series){
    if(!series||!series.id)return [];
    var id=(series.id||'').trim();
    if(!id)return [];
    var out=[];
    var tv=YAHOO_TO_TV[id];
    if(tv){
        out.push(TV_LOGO_BASE+tv+'.svg');
        out.push(TV_LOGO_BASE+tv+'--big.svg');
        return out;
    }
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

function safeId(id){
    return(id||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
}

function logoImg(series,size){
    size=size||22;
    var safeName=((series&&series.name)||'Varlık').replace(/"/g,'');
    var fallback=logoUrl(series);
    var sid=safeId(series&&series.id);

    // Aday listesi: yerel SVG ilk sırada
    var candidates=[];
    if(sid) candidates.push('assets/logos/'+sid+'.svg');

    // CDN adayları (yedek)
    var cdn=(series&&Array.isArray(series.logo_candidates)&&series.logo_candidates.length)
        ? series.logo_candidates.slice() : tradingViewCandidates(series);
    if(series&&series.logo_url) cdn.unshift(series.logo_url);
    candidates=candidates.concat(cdn);
    candidates=candidates.filter(function(u,idx){return u&&candidates.indexOf(u)===idx;});

    var src=candidates.length?candidates[0]:fallback;
    return '<img class="asset-logo" src="'+src+'" alt="'+safeName+'" width="'+size+'" height="'+size+'" loading="lazy" decoding="async" data-logo-candidates="'+candidates.join('|')+'" data-logo-index="0" data-logo-fallback="'+fallback+'" onerror="window.PMLogoNext(this)">';
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
    // Tıklayınca detay popup aç
    el.querySelectorAll('.scard').forEach(function(card,i){
        card.style.cursor='pointer';
        card.setAttribute('tabindex','0');
        card.addEventListener('click',function(){ if(seriesList[i]) showAssetModal(seriesList[i]); });
        card.addEventListener('keydown',function(e){ if((e.key==='Enter'||e.key===' ')&&seriesList[i]){e.preventDefault();showAssetModal(seriesList[i]);} });
    });
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

function sparkSvg(data,color){
    if(!data||data.length<2)return '';
    var pts=data.slice(-20).map(function(d){return d.value});
    var min=Math.min.apply(null,pts),max=Math.max.apply(null,pts);
    var rng=(max-min)||1;
    var W=48,H=16;
    var step=W/(pts.length-1);
    var path=pts.map(function(v,i){var x=(i*step).toFixed(1);var y=(H-((v-min)/rng)*H).toFixed(1);return(i?'L':'M')+x+' '+y}).join(' ');
    var trendColor=color||(pts[pts.length-1]>=pts[0]?'#00d68f':'#ff4757');
    return '<svg class="tbl-spark" width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'" aria-hidden="true"><path d="'+path+'" fill="none" stroke="'+trendColor+'" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round"/></svg>';
}

function isAnomaly(s){
    if(!s||!s.data||s.data.length<10||s.change_1d_pct==null)return false;
    var vals=s.data.slice(-30);
    var changes=[];
    for(var i=1;i<vals.length;i++){
        var prev=vals[i-1].value,cur=vals[i].value;
        if(prev)changes.push(((cur-prev)/prev)*100);
    }
    if(changes.length<5)return false;
    var m=changes.reduce(function(a,b){return a+b},0)/changes.length;
    var v=changes.reduce(function(a,b){return a+(b-m)*(b-m)},0)/changes.length;
    var sd=Math.sqrt(v);
    if(sd<0.01)return false;
    return Math.abs(s.change_1d_pct-m)>2*sd;
}

function xmlEscape(v){
    if(v==null)return'';
    return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function xlsCellHtml(v){
    if(v==null||v==='')return '<td></td>';
    if(typeof v==='number'&&isFinite(v))return '<td style="mso-number-format:\'0.00##\'">'+v+'</td>';
    return '<td>'+xmlEscape(v)+'</td>';
}
function xlsRowHtml(cells, isHeader){
    var tag=isHeader?'th':'td';
    if(!isHeader)return '<tr>'+cells.map(xlsCellHtml).join('')+'</tr>';
    return '<tr>'+cells.map(function(v){return '<'+tag+' style="background:#e5e7eb;font-weight:bold">'+xmlEscape(v)+'</'+tag+'></tr>'}).join('')+'</tr>';
}

// Tek bir HTML tablosunu (başlıklı satır[0], diğer satırlar veri) Excel sayfası olarak üret
function htmlSheetTable(headerRow, dataRows){
    var thead='<thead><tr>'+headerRow.map(function(v){return '<th style="background:#e5e7eb;font-weight:bold;border:1px solid #999">'+xmlEscape(v)+'</th>'}).join('')+'</tr></thead>';
    var tbody='<tbody>'+dataRows.map(function(r){
        return '<tr>'+r.map(function(v){
            if(v==null||v==='')return '<td style="border:1px solid #ccc"></td>';
            if(typeof v==='number'&&isFinite(v))return '<td style="border:1px solid #ccc;mso-number-format:\'0.00##\'">'+v+'</td>';
            return '<td style="border:1px solid #ccc">'+xmlEscape(v)+'</td>';
        }).join('')+'</tr>';
    }).join('')+'</tbody>';
    return '<table border="1" cellspacing="0" cellpadding="4">'+thead+tbody+'</table>';
}

// Çok sayfalı HTML-Excel dosyası üret (Excel 2007+ tüm sayfa tanımlarını okur)
function buildExcelHtmlDoc(sheets){
    // sheets: [{name, headerRow, dataRows}, ...]
    var worksheetXml = sheets.map(function(s){
        return '<x:ExcelWorksheet><x:Name>'+xmlEscape(s.name)+'</x:Name><x:WorksheetOptions xmlns:x="urn:schemas-microsoft-com:office:excel"><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet>';
    }).join('');
    var tablesHtml = sheets.map(function(s, i){
        var tbl = htmlSheetTable(s.headerRow, s.dataRows);
        // Sayfa kırılması: ilk tablo hariç page-break-before ekle
        if(i===0) return tbl;
        return '<br clear="all" style="mso-special-character:line-break;page-break-before:always"/>'+tbl;
    }).join('');
    return '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">'+
        '<head><meta http-equiv="Content-Type" content="application/vnd.ms-excel; charset=UTF-8"/>'+
        '<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets>'+worksheetXml+'</x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->'+
        '<style>table{border-collapse:collapse}td,th{padding:4px 8px;font-family:Calibri,Arial,sans-serif;font-size:11pt}</style>'+
        '</head><body>'+tablesHtml+'</body></html>';
}

function downloadExcelFile(html, filename){
    // UTF-8 BOM ekle — Türkçe karakterler için
    var blob=new Blob(['\ufeff'+html],{type:'application/vnd.ms-excel;charset=utf-8'});
    var url=URL.createObjectURL(blob);
    var a=document.createElement('a');
    a.href=url;a.download=(filename||'piyasa')+'.xls';
    document.body.appendChild(a);a.click();
    setTimeout(function(){document.body.removeChild(a);URL.revokeObjectURL(url)},100);
}

function exportTableExcel(seriesList,filename){
    // Sheet 1: Özet — anlık görüntü
    var summaryHeader=['Varlık','Birim','Fiyat','1G %','1H %','1A %','YTD %','52H Düşük','52H Yüksek'];
    var summaryData=[];
    seriesList.forEach(function(s){if(!s)return;
        summaryData.push([
            s.name||'', s.unit||'',
            s.current!=null?Number(s.current):'',
            s.change_1d_pct!=null?Number(s.change_1d_pct.toFixed(4)):'',
            s.change_1w_pct!=null?Number(s.change_1w_pct.toFixed(4)):'',
            s.change_1m_pct!=null?Number(s.change_1m_pct.toFixed(4)):'',
            s.change_ytd_pct!=null?Number(s.change_ytd_pct.toFixed(4)):'',
            s.low_52w!=null?Number(s.low_52w):'',
            s.high_52w!=null?Number(s.high_52w):''
        ]);
    });

    // Sheet 2: Tarihsel (uzun format)
    var longHeader=['Tarih','Varlık','Değer','Birim'];
    var longData=[];
    seriesList.forEach(function(s){
        if(!s||!s.data||!s.data.length)return;
        s.data.forEach(function(d){
            if(!d||d.value==null)return;
            longData.push([d.date||'', s.name||'', Number(d.value), s.unit||'']);
        });
    });

    // Sheet 3: Tarihsel (geniş format — her varlık bir sütun)
    var namedSeries = seriesList.filter(function(s){return s&&s.data&&s.data.length});
    var wideHeader=['Tarih'].concat(namedSeries.map(function(s){return s.name||''}));
    var dateMap={};
    namedSeries.forEach(function(s){
        s.data.forEach(function(d){
            if(!d||d.value==null)return;
            if(!dateMap[d.date])dateMap[d.date]={};
            dateMap[d.date][s.id||s.name]=d.value;
        });
    });
    var wideData=Object.keys(dateMap).sort().map(function(dt){
        var row=[dt];
        namedSeries.forEach(function(s){
            var key=s.id||s.name;
            row.push(dateMap[dt][key]!=null?Number(dateMap[dt][key]):'');
        });
        return row;
    });

    var html = buildExcelHtmlDoc([
        {name:'Özet', headerRow:summaryHeader, dataRows:summaryData},
        {name:'Tarihsel', headerRow:longHeader, dataRows:longData},
        {name:'Tarihsel (Geniş)', headerRow:wideHeader, dataRows:wideData}
    ]);
    downloadExcelFile(html, filename||'piyasa');
}

function formatUpdatedAt(iso){
    if(!iso)return'';
    try{
        var d=new Date(iso);if(isNaN(d.getTime()))return iso;
        var pad=function(n){return String(n).padStart(2,'0')};
        return pad(d.getDate())+'.'+pad(d.getMonth()+1)+'.'+d.getFullYear()+' '+pad(d.getHours())+':'+pad(d.getMinutes());
    }catch(e){return iso}
}

function buildTable(containerId,seriesList,opts){
    var el=document.getElementById(containerId);if(!el)return;
    opts=opts||{};
    var stampSrc=opts.updatedAt||(_lastMeta&&_lastMeta.updated_at);
    var updatedAt=stampSrc?formatUpdatedAt(stampSrc):'';
    var fileBase=opts.file||(_lastMeta&&_lastMeta.pageId)||containerId||'piyasa';
    var toolbar='<div class="tbl-toolbar">'+
        '<div class="tbl-search-wrap"><span class="tbl-search-ico">🔍</span>'+
        '<input type="search" class="tbl-search" id="'+containerId+'_search" placeholder="Varlık ara…" aria-label="Tabloda ara"></div>'+
        '<button type="button" class="tbl-csv-btn" id="'+containerId+'_csv" aria-label="Excel olarak indir" title="Özet + tarihsel verileri Excel\'e indir">⬇ Excel</button>'+
        (updatedAt?'<span class="tbl-updated">📅 Son güncellenme: '+updatedAt+'</span>':'')+
    '</div>';
    var h=toolbar+'<div class="tbl-wrap"><table><thead><tr><th>İsim</th><th class="r">Fiyat</th><th class="r">1 Gün</th><th class="r">1 Hafta</th><th class="r">1 Ay</th><th class="r">YTD</th><th class="r">Trend</th><th class="r">52H Aralık</th></tr></thead><tbody>';
    seriesList.forEach(function(s){if(!s)return;
        function cv(p){if(p==null)return'<td class="mono r dim">—</td>';return'<td class="mono r '+cc(p)+'">'+(p>=0?'+':'')+p.toFixed(2)+'%</td>'}
        var anom=isAnomaly(s);
        var nameKey=(s.name||'').toLocaleLowerCase('tr')+' '+(s.id||'').toLowerCase();
        var anomTitle=anom?' title="Olağandışı hareket: 30 günlük ortalamadan 2σ sapma"':'';
        h+='<tr class="'+(anom?'tbl-anomaly':'')+'" data-search="'+nameKey.replace(/"/g,'')+'"'+anomTitle+'>'+
            '<td class="asset-name-cell">'+logoImg(s,18)+'<span>'+s.name+'</span>'+(anom?'<span class="tbl-anom-badge" aria-label="Olağandışı">⚠</span>':'')+'</td>'+
            '<td class="mono r">'+fp(s.current)+' <span class="dim">'+(s.unit||'')+'</span></td>'+
            cv(s.change_1d_pct)+cv(s.change_1w_pct)+cv(s.change_1m_pct)+cv(s.change_ytd_pct)+
            '<td class="r">'+sparkSvg(s.data)+'</td>'+
            '<td class="mono r dim" style="font-size:.7rem">'+(s.low_52w!=null?fp(s.low_52w)+' — '+fp(s.high_52w):'—')+'</td>'+
        '</tr>';
    });h+='</tbody></table></div>';el.innerHTML=h;

    var search=document.getElementById(containerId+'_search');
    var tbody=el.querySelector('tbody');
    if(search&&tbody){
        search.addEventListener('input',function(){
            var q=(search.value||'').toLocaleLowerCase('tr').trim();
            tbody.querySelectorAll('tr').forEach(function(tr){
                if(!q){tr.style.display='';return}
                var key=tr.getAttribute('data-search')||'';
                tr.style.display=key.indexOf(q)!==-1?'':'none';
            });
        });
    }
    var csvBtn=document.getElementById(containerId+'_csv');
    if(csvBtn)csvBtn.addEventListener('click',function(){exportTableExcel(seriesList,fileBase)});
    // Tablo satırına tıklayınca detay popup aç
    if(tbody){
        var rows=tbody.querySelectorAll('tr');
        var visibleIdx=0;
        rows.forEach(function(tr,i){
            var s=seriesList[i];
            if(!s)return;
            tr.style.cursor='pointer';
            tr.setAttribute('tabindex','0');
            tr.addEventListener('click',function(e){
                if(e.target.closest('a,button,input,select,textarea'))return;
                showAssetModal(s);
            });
            tr.addEventListener('keydown',function(e){ if(e.key==='Enter'||e.key===' '){e.preventDefault();showAssetModal(s);} });
        });
    }
}

/* ══════════════════════════════════════════
   ASSET DETAIL MODAL (arama sonucu popup)
   ══════════════════════════════════════════ */
var _assetModalEl = null;
function ensureAssetModal(){
    if(_assetModalEl) return _assetModalEl;
    var el = document.createElement('div');
    el.className = 'asset-modal-overlay';
    el.id = 'assetModalOverlay';
    el.setAttribute('aria-hidden','true');
    el.innerHTML = '<div class="asset-modal" role="dialog" aria-modal="true" aria-labelledby="assetModalTitle">'+
        '<button type="button" class="asset-modal-close" aria-label="Kapat">×</button>'+
        '<div class="asset-modal-head"><div id="assetModalIcon"></div><div><h3 id="assetModalTitle">—</h3><div class="asset-modal-sub" id="assetModalSub"></div></div></div>'+
        '<div class="asset-modal-price"><span class="amv" id="assetModalValue">—</span> <span class="amu" id="assetModalUnit"></span></div>'+
        '<div class="asset-modal-chgs" id="assetModalChgs"></div>'+
        '<div class="asset-modal-range" id="assetModalRange"></div>'+
        '<div class="asset-modal-chart"><canvas id="assetModalChart"></canvas></div>'+
        '<div class="asset-modal-footer"><a class="asset-modal-goto" id="assetModalGoto" href="#">Tam sayfa detayı →</a></div>'+
    '</div>';
    document.body.appendChild(el);
    el.addEventListener('click', function(e){ if(e.target === el) closeAssetModal(); });
    el.querySelector('.asset-modal-close').addEventListener('click', closeAssetModal);
    document.addEventListener('keydown', function(e){
        if(e.key === 'Escape' && el.classList.contains('show')) closeAssetModal();
    });
    _assetModalEl = el;
    return el;
}
var _assetModalChart = null;
function closeAssetModal(){
    var el = _assetModalEl;
    if(!el) return;
    el.classList.remove('show');
    el.setAttribute('aria-hidden','true');
    if(_assetModalChart){try{_assetModalChart.destroy()}catch(e){} _assetModalChart=null}
    // URL'den asset parametresini temizle
    try{
        var u = new URL(location.href);
        if(u.searchParams.has('asset')){
            u.searchParams.delete('asset');
            history.replaceState({}, '', u.toString());
        }
    }catch(e){}
}
function showAssetModal(series, opts){
    if(!series) return;
    opts = opts || {};
    ensureAssetModal();
    var el = _assetModalEl;
    document.getElementById('assetModalIcon').innerHTML = logoImg(series, 36);
    document.getElementById('assetModalTitle').textContent = series.name || series.id;
    document.getElementById('assetModalSub').textContent = (series.id||'')+(opts.pageLabel?(' · '+opts.pageLabel):'');
    document.getElementById('assetModalValue').textContent = fp(series.current);
    document.getElementById('assetModalUnit').textContent = series.unit || '';
    var chgsEl = document.getElementById('assetModalChgs');
    var chgs = '';
    if(series.change_1d_pct!=null) chgs += fc(series.change_1d_pct)+'<span class="chg-label">1G</span> ';
    if(series.change_1w_pct!=null) chgs += fc(series.change_1w_pct)+'<span class="chg-label">1H</span> ';
    if(series.change_1m_pct!=null) chgs += fc(series.change_1m_pct)+'<span class="chg-label">1A</span> ';
    if(series.change_ytd_pct!=null) chgs += fc(series.change_ytd_pct)+'<span class="chg-label">YTD</span>';
    chgsEl.innerHTML = chgs;
    var rangeEl = document.getElementById('assetModalRange');
    rangeEl.innerHTML = series.low_52w!=null ? ('52H: <b>'+fp(series.low_52w)+'</b> — <b>'+fp(series.high_52w)+'</b>') : '';
    var gotoEl = document.getElementById('assetModalGoto');
    if(opts.pageHref){gotoEl.href = opts.pageHref; gotoEl.style.display=''}
    else gotoEl.style.display='none';

    el.classList.add('show');
    el.setAttribute('aria-hidden','false');
    // Mini chart
    setTimeout(function(){
        if(_assetModalChart){try{_assetModalChart.destroy()}catch(e){}}
        if(series.data && series.data.length){
            _assetModalChart = makeChart('assetModalChart', series, {color:'#3b82f6', period:'1y'});
        }
    }, 30);
}
function openAssetFromUrl(data){
    if(!data || !data.series) return false;
    try{
        var u = new URL(location.href);
        var assetId = u.searchParams.get('asset');
        if(!assetId) return false;
        var match = null;
        for(var i=0;i<data.series.length;i++){
            var s = data.series[i];
            if(s && (s.id === assetId || (s.name && s.name.toLowerCase() === assetId.toLowerCase()))){
                match = s; break;
            }
        }
        if(match) {
            setTimeout(function(){ showAssetModal(match); }, 200);
            return true;
        }
    }catch(e){}
    return false;
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

var OVERRIDE_CACHE_TTL_MS=10000;
var OVERRIDE_MEM_CACHE={};
var OVERRIDE_INFLIGHT={};

function loadOverrides(pageId) {
    if(!pageId) return Promise.resolve({});
    var c=OVERRIDE_MEM_CACHE[pageId];
    if(c&&(nowTs()-c.ts)<=OVERRIDE_CACHE_TTL_MS) return Promise.resolve(c.data);
    if(OVERRIDE_INFLIGHT[pageId]) return OVERRIDE_INFLIGHT[pageId];

    OVERRIDE_INFLIGHT[pageId]=fetch('/api/page-state?page=' + encodeURIComponent(pageId), { cache:'no-store' })
        .then(function(r) { return r.json(); })
        .then(function(d) {
            var ov=(d && d.overrides) ? d.overrides : {};
            OVERRIDE_MEM_CACHE[pageId]={ts:nowTs(), data:ov};
            return ov;
        }).catch(function() { return {}; })
        .finally(function(){ delete OVERRIDE_INFLIGHT[pageId]; });

    return OVERRIDE_INFLIGHT[pageId];
}

var _lastMeta = null;
var _lastData = null;
function loadData(file, pageId) {
    // Veri ve override'lari paralel yukle, override'lari uygula
    return Promise.all([fj(file), loadOverrides(pageId)]).then(function(r){
        var data = r[0], ov = r[1];
        if (data && data.series && ov) applyOverrides(data.series, ov);
        // Veri eski mi? (60 dk üstü)
        if (data && data.meta && data.meta.updated_at) {
            try { showStaleBanner(data.meta.updated_at, 60); } catch(e){}
            _lastMeta = { updated_at: data.meta.updated_at, file: file, pageId: pageId };
        }
        _lastData = data;
        // URL'de ?asset=ID varsa detay popup'ını otomatik aç
        try { openAssetFromUrl(data); } catch(e){}
        return data;
    });
}
function getLastMeta(){ return _lastMeta; }

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

function downloadExcel(sheets, filename){
    var html=buildExcelHtmlDoc(sheets);
    downloadExcelFile(html, filename);
}
return{fj:fj,fs:fs,fp:fp,fc:fc,cc:cc,gc:gc,filterPeriod:filterPeriod,miniSpark:miniSpark,makeChart:makeChart,makeAreaChart:makeAreaChart,buildSummary:buildSummary,buildCharts:buildCharts,buildTable:buildTable,buildComparisonChart:buildComparisonChart,buildBarChart:buildBarChart,buildDonutChart:buildDonutChart,buildHeatmap:buildHeatmap,applyOverrides:applyOverrides,loadOverrides:loadOverrides,loadData:loadData,getLastMeta:getLastMeta,showStaleBanner:showStaleBanner,countUp:countUp,initScrollReveal:initScrollReveal,flashUpdate:flashUpdate,exportTableExcel:exportTableExcel,downloadExcel:downloadExcel,sparkSvg:sparkSvg,isAnomaly:isAnomaly,formatUpdatedAt:formatUpdatedAt,showAssetModal:showAssetModal,openAssetFromUrl:openAssetFromUrl,ensureChartJs:ensureChartJs};
})();

// Scroll reveal'ı DOM hazır olunca başlat
if(document.readyState !== 'loading') PM.initScrollReveal();
else document.addEventListener('DOMContentLoaded', PM.initScrollReveal);

/* ══════════════════════════════════════════
   GLOBAL ZAMAN FİLTRESİ (TÜM GRAFİKLERİ AYNI ANDA GÜNCELLER)
   ══════════════════════════════════════════ */
document.addEventListener("click", function(e) {
    if (e.target.classList.contains('tf-btn') && e.target.hasAttribute('data-tf')) {
        var btn = e.target;
        var container = btn.closest('.chart-timeframes');
        var tf = btn.getAttribute('data-tf');
        if(!container || !tf) return;
        
        // Sadece tıklanan butonu aktif (mavi) yap
        container.querySelectorAll('.tf-btn').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');

        // Sayfadaki TÜM Chart.js grafiklerini bul ve döngüye sok
        for (var id in Chart.instances) {
            var chartInstance = Chart.instances[id];
            if (!chartInstance || chartInstance.config.type !== 'line') continue;
            var canvasEl = chartInstance.canvas;
            if(!canvasEl || !canvasEl.closest || !canvasEl.closest('#chartsGrid')) continue;

            // Eğer grafiğin orijinal (5 yıllık) verisini henüz yedeklemediysek, ilk tıklamada yedekle
            if (!chartInstance.originalLabels) {
                chartInstance.originalLabels = Array.isArray(chartInstance.data.labels) ? chartInstance.data.labels.slice() : [];
                chartInstance.originalData = (chartInstance.data.datasets && chartInstance.data.datasets[0] && Array.isArray(chartInstance.data.datasets[0].data)) ? chartInstance.data.datasets[0].data.slice() : [];
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
                    if (tf === 'Tümü' || (!isNaN(itemDate.getTime()) && itemDate >= cutoffDate)) {
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
});

/* ══════════════════════════════════════════
   HEATMAP -> DETAILS GEÇİŞİ (ortak animasyon)
   ══════════════════════════════════════════ */
document.addEventListener('click', function(e){
    var row = e.target && e.target.closest ? e.target.closest('.heatmap-tbl tbody tr') : null;
    if(!row) return;
    var table = row.closest('.heatmap-tbl');
    if(!table) return;
    var nameEl = row.querySelector('.hm-name');
    var assetName = nameEl ? (nameEl.textContent || '').trim() : '';
    if(!assetName) return;

    row.classList.remove('heatmap-jump-flash');
    void row.offsetWidth;
    row.classList.add('heatmap-jump-flash');

    var cardsBtn = document.querySelector('.view-btn[data-view="cards"]');
    if(cardsBtn && !cardsBtn.classList.contains('on')) cardsBtn.click();

    setTimeout(function(){
        var candidates = Array.prototype.slice.call(document.querySelectorAll('.chrt,.scard'));
        if(!candidates.length) return;
        var normalized = assetName.toLocaleLowerCase('tr').replace(/\s+/g,' ').trim();
        var hit = candidates.find(function(el){
            var txt = (el.textContent || '').toLocaleLowerCase('tr').replace(/\s+/g,' ').trim();
            return txt.indexOf(normalized) !== -1;
        }) || candidates[0];
        if(!hit) return;
        hit.scrollIntoView({behavior:'smooth', block:'center'});
        hit.classList.remove('detail-jump-pulse');
        void hit.offsetWidth;
        hit.classList.add('detail-jump-pulse');
    }, 260);
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
