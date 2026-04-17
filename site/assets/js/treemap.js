/**
 * Piyasa Haritası — Finviz tarzı canlı treemap
 * Squarified layout (Bruls, Huijing & van Wijk 2000)
 * Veri: summary.json + stocks.json
 */
(function(){'use strict';

var D = 'data/';
function fj(f){return fetch(D+f+'?t='+Date.now()).then(function(r){return r.json()}).catch(function(){return null})}

// ─── Kategori ID'leri ───
var STOCK_IDS = null; // stocks.json'dan gelecek
var COMM_IDS = ['BZ=F','CL=F','NG=F','TTF=F','MTF=F','HO=F','RB=F','USO','UNG','XLE','XOP','ICLN','TAN','NLR','KRBN',
                'GC=F','SI=F','PL=F','PA=F','HG=F','ALI=F','GLD','SLV','PPLT','PALL','GDX','GDXJ','SIL',
                'ZW=F','ZC=F','ZS=F','ZM=F','ZL=F','ZO=F','ZR=F','CT=F','KC=F','SB=F','CC=F','OJ=F','LBS=F','LE=F','HE=F','DBA','CORN','WEAT','SOYB','MOO',
                'NI=F','SN=F','PB=F','RR=F','URA','LIT','COPX','SLX','BDRY','REMX','ZN=F'];
var FX_IDS = ['USDTRY=X','EURTRY=X','GBPTRY=X','CHFTRY=X','JPYTRY=X','CADTRY=X','AUDTRY=X','CNYTRY=X','SARTRY=X','RUBTRY=X','AEDTRY=X',
              'EURUSD=X','GBPUSD=X','USDJPY=X','USDCHF=X','AUDUSD=X','USDCAD=X','NZDUSD=X','USDCNY=X','USDBRL=X','USDMXN=X','USDINR=X','USDZAR=X','USDSEK=X','USDNOK=X','DX-Y.NYB'];
var CRYPTO_IDS = ['BTC-USD','ETH-USD','BNB-USD','SOL-USD','XRP-USD','ADA-USD','DOGE-USD','AVAX-USD','DOT-USD','LINK-USD'];
var IDX_IDS = ['XU100.IS','XU030.IS','^GSPC','^DJI','^IXIC','^RUT','^STOXX50E','^FTSE','^GDAXI','^FCHI','^N225','^HSI','000001.SS','^BSESN','^KS11','^TWII','^MERV'];

// Grup renkleri (kategori etiketi için)
var GROUP_META = {
    stocks: {name:'HİSSELER',    color:'#1e3a8a'},
    comm:   {name:'EMTİALAR',    color:'#854d0e'},
    fx:     {name:'DÖVİZ',       color:'#065f46'},
    crypto: {name:'KRİPTO',      color:'#6b21a8'},
    idx:    {name:'ENDEKSLER',   color:'#9f1239'}
};

// ─── Renk skalası (% değişim → renk) ───
function pctColor(p){
    if(p==null||isNaN(p)) return '#64748b';
    var v = Math.max(-5, Math.min(5, p));
    // -5% kırmızı, 0 gri, +5% yeşil
    if(v >= 0){
        var t = v/5; // 0..1
        // gri (#475569 ~ 71,85,105) → koyu yeşil (#166534 ~ 22,101,52)
        var r = Math.round(71 + (22-71)*t);
        var g = Math.round(85 + (101-85)*t);
        var b = Math.round(105 + (52-105)*t);
        return 'rgb('+r+','+g+','+b+')';
    } else {
        var t = -v/5;
        var r = Math.round(71 + (153-71)*t);
        var g = Math.round(85 + (27-85)*t);
        var b = Math.round(105 + (27-105)*t);
        return 'rgb('+r+','+g+','+b+')';
    }
}

// ─── Squarified Treemap ───
function squarify(items, x, y, w, h){
    // items: [{value, ...}] - value desc sıralı
    // sonuç: her item'a {x,y,w,h} atanır
    if(!items.length) return;
    if(items.length === 1){
        items[0].x=x; items[0].y=y; items[0].w=w; items[0].h=h;
        return;
    }
    var total = items.reduce(function(s,i){return s+i.value},0);
    if(total <= 0) return;

    var row = [];
    var rowSum = 0;
    var rest = items.slice();
    var curX = x, curY = y, curW = w, curH = h;

    function worst(row, len){
        if(!row.length) return Infinity;
        var maxV = 0, minV = Infinity, sum = 0;
        for(var i=0;i<row.length;i++){
            if(row[i].value>maxV) maxV=row[i].value;
            if(row[i].value<minV) minV=row[i].value;
            sum+=row[i].value;
        }
        var s2 = sum*sum;
        var l2 = len*len;
        return Math.max(l2*maxV/s2, s2/(l2*minV));
    }

    function layoutRow(row, x, y, w, h, horizontal){
        var sum = row.reduce(function(s,i){return s+i.value},0);
        if(horizontal){
            var rowH = sum/w*(h>0?1:1); // placeholder
        }
        // ...implemented below
    }

    // Simpler iterative squarify
    function draw(list, x, y, w, h){
        if(!list.length) return;
        if(list.length===1){
            list[0].x=x; list[0].y=y; list[0].w=w; list[0].h=h; return;
        }
        var totalV = list.reduce(function(s,i){return s+i.value},0);
        var shortSide = Math.min(w,h);
        var horizontal = w >= h;
        var row = [];
        var i = 0;
        while(i < list.length){
            var trial = row.concat([list[i]]);
            var trialSum = trial.reduce(function(s,x){return s+x.value},0);
            var rowLen = trialSum / totalV * (horizontal?h:w);
            // worst aspect ratio
            var tMax=0, tMin=Infinity;
            for(var j=0;j<trial.length;j++){
                if(trial[j].value>tMax)tMax=trial[j].value;
                if(trial[j].value<tMin)tMin=trial[j].value;
            }
            var tSum = trialSum;
            var wAr = Math.max((rowLen*rowLen)*tMax/(tSum*tSum), (tSum*tSum)/((rowLen*rowLen)*tMin));
            // current aspect ratio
            var cAr = Infinity;
            if(row.length){
                var cSum = row.reduce(function(s,x){return s+x.value},0);
                var cLen = cSum/totalV*(horizontal?h:w);
                var cMax=0, cMin=Infinity;
                for(var k=0;k<row.length;k++){
                    if(row[k].value>cMax)cMax=row[k].value;
                    if(row[k].value<cMin)cMin=row[k].value;
                }
                cAr = Math.max((cLen*cLen)*cMax/(cSum*cSum), (cSum*cSum)/((cLen*cLen)*cMin));
            }
            if(wAr <= cAr || row.length===0){
                row.push(list[i]); i++;
            } else {
                // fix row
                var rSum = row.reduce(function(s,x){return s+x.value},0);
                var rLen = rSum/totalV*(horizontal?w:h); // perpendicular length of row
                // actually: rowThickness along horizontal axis
                var rowThick;
                if(horizontal){
                    rowThick = rSum/totalV*w;
                    var yy = y;
                    for(var m=0;m<row.length;m++){
                        var cell = row[m];
                        var cellH = cell.value/rSum*h;
                        cell.x=x; cell.y=yy; cell.w=rowThick; cell.h=cellH;
                        yy += cellH;
                    }
                    x += rowThick; w -= rowThick; totalV -= rSum;
                } else {
                    rowThick = rSum/totalV*h;
                    var xx = x;
                    for(var m=0;m<row.length;m++){
                        var cell = row[m];
                        var cellW = cell.value/rSum*w;
                        cell.x=xx; cell.y=y; cell.w=cellW; cell.h=rowThick;
                        xx += cellW;
                    }
                    y += rowThick; h -= rowThick; totalV -= rSum;
                }
                row = [];
                horizontal = w >= h;
            }
        }
        // place remaining row
        if(row.length){
            var rSum = row.reduce(function(s,x){return s+x.value},0);
            if(horizontal){
                var rowThick = w;
                var yy = y;
                for(var m=0;m<row.length;m++){
                    var cell = row[m];
                    var cellH = cell.value/rSum*h;
                    cell.x=x; cell.y=yy; cell.w=rowThick; cell.h=cellH;
                    yy += cellH;
                }
            } else {
                var rowThick = h;
                var xx = x;
                for(var m=0;m<row.length;m++){
                    var cell = row[m];
                    var cellW = cell.value/rSum*w;
                    cell.x=xx; cell.y=y; cell.w=cellW; cell.h=rowThick;
                    xx += cellW;
                }
            }
        }
    }

    draw(items, x, y, w, h);
}

window.__TM_SQ = squarify;

// ═════════════════════════════════════════════
// VERİ YÜKLE + RENDER
// ═════════════════════════════════════════════

var state = {
    filter: 'all',
    search: '',
    all: [],       // [{id, name, group, pct, size, logo}]
    container: null,
    w: 0, h: 0
};

function classify(id){
    if(CRYPTO_IDS.indexOf(id) >= 0) return 'crypto';
    if(IDX_IDS.indexOf(id) >= 0)   return 'idx';
    if(FX_IDS.indexOf(id) >= 0)    return 'fx';
    if(COMM_IDS.indexOf(id) >= 0)  return 'comm';
    if(STOCK_IDS && STOCK_IDS.indexOf(id) >= 0) return 'stocks';
    return null;
}

function sizeFor(item){
    // size ≈ "önem" = kategori ağırlığı * tekil ağırlık
    // Hisseler: pazar değeri olsa iyi ama yok → eşit
    // Emtia/FX/Endeks: majorlara daha çok ağırlık
    var major = {
        'BTC-USD':40,'ETH-USD':20,'XRP-USD':8,'SOL-USD':8,'BNB-USD':8,
        'GC=F':30,'CL=F':30,'BZ=F':28,'NG=F':18,'SI=F':15,'HG=F':12,'ZW=F':10,'ZC=F':9,'ZS=F':9,
        'USDTRY=X':30,'EURUSD=X':28,'USDJPY=X':20,'GBPUSD=X':15,'DX-Y.NYB':18,
        '^GSPC':40,'^IXIC':35,'^DJI':32,'XU100.IS':20,'^N225':22,'^GDAXI':18,'^FTSE':18,'^HSI':16
    };
    return major[item.id] || 6;
}

function buildList(summary, stocks){
    var out = [];
    // summary serilerinden fiyat/% değişimi al
    var lut = {};
    (summary.series||[]).forEach(function(s){ lut[s.id] = s; });
    (stocks && stocks.series || []).forEach(function(s){ lut[s.id] = s; });

    function add(id, group){
        var s = lut[id]; if(!s) return;
        var pct = s.change_1d_pct;
        if(pct==null) pct = 0;
        out.push({
            id: id,
            name: s.name || id,
            group: group,
            pct: pct,
            price: s.current,
            size: sizeFor({id:id})
        });
    }

    COMM_IDS.forEach(function(i){add(i,'comm')});
    FX_IDS.forEach(function(i){add(i,'fx')});
    CRYPTO_IDS.forEach(function(i){add(i,'crypto')});
    IDX_IDS.forEach(function(i){add(i,'idx')});
    // Hisseler: stocks.json'daki tüm seriler
    if(stocks && stocks.series){
        STOCK_IDS = stocks.series.map(function(s){return s.id});
        stocks.series.forEach(function(s){
            out.push({
                id: s.id,
                name: s.name || s.id,
                group: 'stocks',
                pct: s.change_1d_pct!=null ? s.change_1d_pct : 0,
                price: s.current,
                size: 4
            });
        });
    }
    return out;
}

function filtered(){
    var q = state.search.trim().toLowerCase();
    return state.all.filter(function(it){
        if(state.filter !== 'all' && it.group !== state.filter) return false;
        if(q){
            if(it.id.toLowerCase().indexOf(q) < 0 && (it.name||'').toLowerCase().indexOf(q) < 0) return false;
        }
        return true;
    });
}

function render(){
    var container = state.container;
    if(!container) return;
    container.innerHTML = '';
    var W = container.clientWidth;
    var H = container.clientHeight;
    state.w = W; state.h = H;

    var items = filtered();
    if(!items.length){
        container.innerHTML = '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#64748b;font-size:.85rem">Eşleşme yok</div>';
        return;
    }

    // Tümü filtresinde kategorilere ayır, her biri kendi alanı
    if(state.filter === 'all'){
        var groups = {};
        items.forEach(function(it){
            (groups[it.group] = groups[it.group]||[]).push(it);
        });
        var groupArr = Object.keys(groups).map(function(k){
            var sum = groups[k].reduce(function(s,i){return s+i.size},0);
            return {key:k, value:sum, items:groups[k]};
        });
        groupArr.sort(function(a,b){return b.value-a.value});
        squarify(groupArr, 0, 0, W, H);
        groupArr.forEach(function(g){
            var pad = 14;
            // Grup etiketi
            var lbl = document.createElement('div');
            lbl.className = 'tm-group-lbl';
            lbl.style.left = g.x+'px'; lbl.style.top = g.y+'px';
            lbl.style.width = g.w+'px';
            lbl.textContent = GROUP_META[g.key].name;
            container.appendChild(lbl);

            var inner = g.items.slice().sort(function(a,b){return b.size-a.size});
            inner.forEach(function(it){it.value = it.size});
            squarify(inner, g.x+2, g.y+pad, Math.max(10,g.w-4), Math.max(10,g.h-pad-2));
            drawCells(inner);
        });
    } else {
        var arr = items.slice().sort(function(a,b){return b.size-a.size});
        arr.forEach(function(it){it.value=it.size});
        squarify(arr, 0, 0, W, H);
        drawCells(arr);
    }
}

function drawCells(cells){
    var container = state.container;
    cells.forEach(function(c){
        if(!c.w || !c.h) return;
        var div = document.createElement('div');
        div.className = 'tm-cell';
        var area = c.w*c.h;
        if(area < 2400) div.classList.add('tiny');
        else if(area < 6000) div.classList.add('small');
        div.style.left = c.x+'px'; div.style.top = c.y+'px';
        div.style.width = c.w+'px'; div.style.height = c.h+'px';
        div.style.background = pctColor(c.pct);
        var sign = c.pct>=0?'+':'';
        var sym = (c.id||'').replace('=F','').replace('=X','').replace('-USD','').replace('.IS','').replace('^','');
        div.innerHTML = '<div class="tm-sym">'+sym+'</div><div class="tm-pct">'+sign+(c.pct||0).toFixed(2)+'%</div>';
        div.addEventListener('mouseenter', function(e){ showTip(e, c) });
        div.addEventListener('mousemove', function(e){ moveTip(e) });
        div.addEventListener('mouseleave', hideTip);
        container.appendChild(div);
    });
}

var tip;
function showTip(e, c){
    if(!tip) tip = document.getElementById('tmTip');
    if(!tip) return;
    var sign = c.pct>=0?'+':'';
    var col = c.pct>=0?'#4ade80':'#f87171';
    tip.innerHTML =
        '<div class="tt-title">'+c.id+'</div>'+
        '<div class="tt-row"><span>Ad</span><span>'+(c.name||'—')+'</span></div>'+
        '<div class="tt-row"><span>Fiyat</span><span>'+(c.price!=null?Number(c.price).toLocaleString('tr-TR',{maximumFractionDigits:4}):'—')+'</span></div>'+
        '<div class="tt-row"><span>Değişim</span><span class="tt-pct" style="color:'+col+'">'+sign+(c.pct||0).toFixed(2)+'%</span></div>'+
        '<div class="tt-row"><span>Kategori</span><span>'+(GROUP_META[c.group]?GROUP_META[c.group].name:'—')+'</span></div>';
    tip.style.display = 'block';
    moveTip(e);
}
function moveTip(e){
    if(!tip) return;
    var x = e.clientX + 14;
    var y = e.clientY + 14;
    var tw = tip.offsetWidth, th = tip.offsetHeight;
    if(x + tw > window.innerWidth - 10) x = e.clientX - tw - 14;
    if(y + th > window.innerHeight - 10) y = e.clientY - th - 14;
    tip.style.left = x+'px';
    tip.style.top = y+'px';
}
function hideTip(){ if(tip) tip.style.display='none'; }

// Özet + top listeler
function renderSummary(){
    var items = state.all;
    var up = items.filter(function(i){return i.pct>0}).length;
    var dn = items.filter(function(i){return i.pct<0}).length;
    var avg = items.length ? items.reduce(function(s,i){return s+(i.pct||0)},0)/items.length : 0;
    var breadth = items.length ? Math.round(up/items.length*100) : 0;
    document.getElementById('tmTotal').textContent = items.length;
    document.getElementById('tmUp').textContent = up;
    document.getElementById('tmDn').textContent = dn;
    var avgEl = document.getElementById('tmAvg');
    avgEl.textContent = (avg>=0?'+':'')+avg.toFixed(2)+'%';
    avgEl.style.color = avg>=0?'#16a34a':'#dc2626';
    var bEl = document.getElementById('tmBreadth');
    bEl.textContent = breadth+'% ▲';
    bEl.style.color = breadth>=60?'#16a34a':breadth>=40?'#f59e0b':'#dc2626';

    var sorted = items.slice().sort(function(a,b){return b.pct-a.pct});
    var gainers = sorted.slice(0,10);
    var losers = sorted.slice(-10).reverse();
    var g = document.getElementById('tmGainers');
    var l = document.getElementById('tmLosers');
    function row(i){
        var sign = i.pct>=0?'+':'';
        var cls = i.pct>=0?'u':'d';
        return '<div class="tl-row"><span class="tl-sym">'+i.id+' <small style="color:#94a3b8">'+(i.name||'').slice(0,22)+'</small></span><span class="tl-pct '+cls+'">'+sign+i.pct.toFixed(2)+'%</span></div>';
    }
    g.innerHTML = gainers.map(row).join('');
    l.innerHTML = losers.map(row).join('');
}

// ─── Events ───
document.querySelectorAll('.tm-btn').forEach(function(b){
    b.addEventListener('click', function(){
        document.querySelectorAll('.tm-btn').forEach(function(x){x.classList.remove('active')});
        b.classList.add('active');
        state.filter = b.getAttribute('data-filter');
        render();
    });
});
document.getElementById('tmSearch').addEventListener('input', function(e){
    state.search = e.target.value;
    render();
});
window.addEventListener('resize', function(){ render(); });

// ─── Init ───
state.container = document.getElementById('treemap');

Promise.all([fj('summary.json'), fj('stocks.json')]).then(function(res){
    var summary = res[0], stocks = res[1];
    if(!summary) return;
    state.all = buildList(summary, stocks);
    renderSummary();
    render();
});

// AI
fetch('/api/ai-analysis?cat=treemap').then(function(r){return r.json()}).then(function(d){
    var el = document.getElementById('tmAi');
    if(el && d && d.analysis) el.textContent = d.analysis;
}).catch(function(){
    var el = document.getElementById('tmAi');
    if(el) el.innerHTML = '<span style="color:#94a3b8;font-style:italic">AI özeti şu an yüklenemiyor.</span>';
});

})();

