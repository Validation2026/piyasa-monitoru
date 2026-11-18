const { _test } = require('../../netlify/functions/turkiye-data');

describe('Türkiye makro veri bütünlüğü', () => {
  test('Seed verileri otomatik uç noktanın makro özetine sızmaz', () => {
    const rows = _test.readMacroSnapshot();
    expect(rows.length).toBeGreaterThanOrEqual(2);
    expect(rows.length).toBeLessThanOrEqual(8); // API özeti; EVDS başarılı oldukça kapsam artar.
    expect(rows.map(x => x.name)).toContain('TCMB Politika Faizi');
    expect(rows.map(x => x.name)).toContain('TÜFE (Yıllık %)');
    expect(rows.map(x => x.source)).not.toContain('Seed');
    for (const row of rows) {
      expect(row.status).not.toBe('unavailable');
      expect(row.value).toEqual(expect.any(Number));
      expect(row.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  test('Risk hesaplaması sentetik makro göstergelerden beslenmez', () => {
    const m = _test.readMacroSnapshot();
    const markets = { usdtry: {value:40}, dxy:{value:104},
                      brent:{value:80}, us10y:{value:4.0},
                      bist100:{changePct:0.5}};
    const sentiment = {level:'neutral'};
    const safe = _test.riskScoreFromMarkets(markets,sentiment,m);
    const fake = _test.riskScoreFromMarkets(markets,sentiment,[{
      name:'TCMB Politika Faizi',value:1000,source:'Seed'
    }]);
    expect(safe.score).toBeLessThan(fake.score);
  });
});
