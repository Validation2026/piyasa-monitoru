const fs = require('fs');
const path = require('path');
const vm = require('vm');

function read(p) { return fs.readFileSync(path.join(__dirname, '../..', p), 'utf8'); }

describe('2026 Kasım statik makro doğrulama', () => {
  const fe = read('site/assets/js/faiz-enflasyon.js');
  const h = read('site/faiz-enflasyon.html');
  const calendar = read('site/ekonomik-takvim.html');
  const risk = read('site/ulke-risk.html');
  const energy = read('site/emtia-enerji.html');
  const metals = read('site/emtia-metaller.html');
  const supply = read('site/tedarik-zinciri.html');

  const ctx = {window: {}};
  const first = fe.split('// ═════════════════════════════════════════════')[0];
  vm.runInNewContext(first, ctx, {timeout:1000});
  const countries = ctx.window.__FE.COUNTRIES;
  const get = n => countries.find(c => c.n === n);

  test('50 ülke ve kaynak tarihleri korunur', () => {
    expect(countries).toHaveLength(50);
    countries.forEach(c => {
      expect(c.rateDate).toBeTruthy();
      expect(c.inflDate).toBeTruthy();
      expect(c.bondDate).toContain('2026');
      expect(c.real).toBeCloseTo(c.rate - c.infl, 2);
    });
    expect(h).toContain('14 Temmuz 2026 tarihsel');
  });

  test('resmî makro değerler doğru girilmiştir', () => {
    expect(get('Türkiye').rate).toBe(36);
    expect(get('Türkiye').infl).toBe(29.77);
    expect(get('ABD').rate).toBe(3.875);
    expect(get('ABD').inflDate).toContain('Eylül 2026');
    expect(get('Euro Bölgesi').rate).toBe(2.5);
    expect(get('Euro Bölgesi').infl).toBe(4);
    expect(get('İngiltere').rate).toBe(4);
    expect(get('Kanada').infl).toBe(3.1);
    expect(get('Japonya').rate).toBe(1.25);
    expect(get('Avustralya').rate).toBe(4.85);
    expect(get('Brezilya').infl).toBe(4.63);
    expect(get('Almanya').infl).toBe(2.8);
    expect(get('Fransa').infl).toBe(3.4);
    expect(get('İtalya').infl).toBe(5.5);
    expect(get('Çin').infl).toBe(0.7);
    expect(get('Hindistan').rate).toBe(5.5);
  });

  test('eski ve yeni dönemleri ayırır ve kaynak bağlantılarını saklar', () => {
    expect(get('Norveç').rateDate).toContain('eski');
    expect(get('Türkiye').rateUrl).toMatch(/^https:\/\//);
    expect(get('Türkiye').inflUrl).toMatch(/^https:\/\//);
    expect(fe).toContain('c.rateDate');
    expect(fe).toContain('c.inflDate');
    expect(h).toContain('geriye dönük yıllık TÜFE');
  });

  test('admin ile yönetilen ülke profili üzerine yazılmaz', () => {
    expect(risk).toContain("if(s.countryRisk && s.countryRisk.length>0)");
    expect(risk).toContain("var RISK_MACRO_VERIFIED");
    expect(risk).toContain("c.cds='—'");
  });

  test('2027 karar tarihleri ve Fed strateji istisnası takvimdedir', () => {
    expect(calendar).toContain("date:'2027-01-27',name:'Fed Faiz Kararı'");
    expect(calendar).toContain("date:'2027-03-17',name:'Fed Faiz Kararı'");
    expect(calendar).toContain("date:'2027-10-27',name:'Fed Para Politikası Strateji Toplantısı'");
    expect(calendar).toContain("date:'2027-02-04',name:'BoE Faiz Kararı'");
    expect(calendar).toContain("date:'2027-01-21',name:'TCMB Faiz Kararı'");
    expect(calendar).toContain("date:'2027-02-03',name:'ECB Faiz Kararı'");
    expect(calendar).toContain("date:'2026-11-10',name:'ABD TÜFE (Ekim)'");
  });

  test('güvenilmez güncel rakamlar yeni raporlarla değiştirilmiştir', () => {
    expect(energy).toContain('1 Kasım 2026');
    expect(energy).not.toContain('~41.0');
    expect(metals).toContain('+61 ton');
    expect(metals).not.toContain('Altın Alımları (2024-2025)');
    expect(supply).toContain('anlık veri yok');
    expect(supply).toContain('varsayımsal');
    expect(supply).not.toContain('<td>21M varil petrol</td>');
  });
});
