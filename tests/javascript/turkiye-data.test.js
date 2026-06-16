const { _test } = require('../../netlify/functions/turkiye-data');

describe('turkiye-data helpers', () => {
  test('RSS başlıklarını ve etki metnini üretir', () => {
    const xml = `<rss><channel><item><title><![CDATA[TCMB faiz kararı açıklandı - Kaynak]]></title><link>https://example.com</link><pubDate>Mon, 01 Jan 2024 12:00:00 GMT</pubDate></item></channel></rss>`;
    const items = _test.parseRss(xml);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('TCMB faiz kararı açıklandı');
    expect(items[0].etki).toContain('TCMB');
  });

  test('piyasa, makro ve haberden risk skoru oluşturur', () => {
    const data = _test.buildData(
      [{ title: 'Enflasyon ve kur baskısı arttı' }],
      { markets: {
        usdtry: { value: 40, display: '40,0000 ₺', changePct: 0.5, history: [39, 40] },
        dxy: { value: 105, display: '105,00', history: [104, 105] },
        brent: { value: 82, display: '$82,00', history: [80, 82] },
        us10y: { value: 4.5, display: '%4,50', history: [4.4, 4.5] },
        bist100: { changePct: -1.2, display: '10.000', history: [10100, 10000] }
      }, errors: [] },
      [{ name: 'TCMB Politika Faizi', value: 37, display: '37,00%', unit: '%' }]
    );
    expect(data.riskScore.score).toBeGreaterThan(40);
    expect(data.sources).toContain('Yahoo Finance chart API');
    expect(data.stressMap.map(x => x.name)).toContain('ABD Faizi');
  });

  test('makro dosyasından son gözlemleri okur', () => {
    const macro = _test.readMacroSnapshot();
    expect(Array.isArray(macro)).toBe(true);
    expect(macro.length).toBeGreaterThan(0);
    expect(macro[0]).toHaveProperty('display');
  });
});
