const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '../../site/iran-risk.html'), 'utf8');
const start = html.indexOf('function tlEscHtml(');
const end = html.indexOf('function rebuildTimeline(){', start);

function timelineHarness() {
    if (start < 0 || end < 0) throw new Error('İran zaman çizelgesi kodu bulunamadı');
    const code = html.slice(start, end);
    const status = { textContent: '' };
    let renders = 0;
    const factory = new Function('document', 'rebuildTimeline', 'dotMap',
        'var AUTO_TLE=[];\n' + code +
        '\nreturn {classify:tlClassify, cleanLink:tlCleanLink, escape:tlEscHtml, update:updateAutomaticTimeline, items:function(){return AUTO_TLE;}};');
    const api = factory({ getElementById: () => status }, () => { renders++; },
        {mil:'red',dip:'blue',eco:'orange',nuk:'purple'});
    return { api, status, renders: () => renders };
}

describe('İran savaş zaman çizelgesi', () => {
    test('Türkçe harf ve konu kategorileri doğru çalışır', () => {
        const { api } = timelineHarness();
        expect(api.classify('İran füze saldırısı')).toBe('mil');
        expect(api.classify('İran nükleer reaktör açıklaması')).toBe('nuk');
        expect(api.classify('İran ateşkes görüşmeleri')).toBe('dip');
        expect(api.classify('Hürmüz petrol fiyatları')).toBe('eco');
    });

    test('14 günlük haberleri deduplikasyonla ve kaynakla alır', () => {
        const { api, status, renders } = timelineHarness();
        const recent = new Date(Date.now() - 86400000).toUTCString();
        const old = new Date(Date.now() - 20 * 86400000).toUTCString();
        api.update([
            { title: 'İran İsrail füze saldırısı - Reuters', date: recent, link: 'https://news.google.com/a', source: 'Reuters' },
            { title: 'İran İsrail füze saldırısı - Reuters', date: recent, link: 'https://news.google.com/a', source: 'Reuters' },
            { title: 'İran nükleer görüşmeleri - BBC', date: recent, link: 'https://news.google.com/b', source: 'BBC' },
            { title: 'Spor karşılaşması', date: recent, link: 'https://news.google.com/c', source: 'Spor' },
            { title: 'İran petrol', date: old, link: 'https://news.google.com/d', source: 'Eski' },
            { title: 'İran petrol', date: recent, link: 'javascript:alert(1)', source: 'Kötü URL' }
        ]);
        expect(api.items()).toHaveLength(2);
        expect(api.items().map(e => e.source).sort()).toEqual(['BBC','Reuters']);
        expect(api.items().every(e => /^\d{4}-\d{2}-\d{2}$/.test(e.date))).toBe(true);
        expect(status.textContent).toContain('2 güncel haber');
        expect(renders()).toBe(1);
    });

    test('kötü URL ve HTML işaretleri engellenir', () => {
        const { api } = timelineHarness();
        expect(api.cleanLink('javascript:alert(1)')).toBe('');
        expect(api.cleanLink('https://news.google.com/a')).toContain('https://');
        expect(api.escape('<img src=x onerror=alert(1)>')).not.toContain('<img');
    });

    test('manuel olay kaydı ayrı kalır; otomatik öğeler sadece haber olarak etiketlenir', () => {
        const { api } = timelineHarness();
        const recent = new Date(Date.now() - 86400000).toUTCString();
        api.update([{title:'İran İsrail açıklaması ve ateşkes görüşmeleri',date:recent,
            link:'https://news.google.com/e',source:'Haber'}]);
        expect(api.items()).toHaveLength(1);
        expect(api.items()[0].origin).toBe('auto');
        expect(api.items()[0].ds).toContain('bağımsız doğrulama değildir');
        expect(html).toContain("origin:'manual'");
    });
});
