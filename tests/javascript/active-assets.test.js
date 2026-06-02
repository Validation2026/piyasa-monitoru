const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadActiveAssets() {
  const code = fs.readFileSync(path.join(__dirname, '../../site/assets/js/active-assets.js'), 'utf8');
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(code, context);
  return context.window;
}

describe('active asset allow-list', () => {
  test('filters inactive assets without mutating original payload', () => {
    const { PMFilterActiveData } = loadActiveAssets();
    const payload = {
      meta: { symbol_count: 2 },
      series: [
        { id: 'BZ=F', name: 'Brent' },
        { id: 'USO', name: 'Inactive oil ETF' },
      ],
    };

    const filtered = PMFilterActiveData('commodities_energy.json', payload);

    expect(filtered.series.map((s) => s.id)).toEqual(['BZ=F']);
    expect(filtered.meta.symbol_count).toBe(1);
    expect(payload.series).toHaveLength(2);
  });

  test('keeps unknown files unchanged', () => {
    const { PMFilterActiveData } = loadActiveAssets();
    const payload = { series: [{ id: 'ANY' }] };
    expect(PMFilterActiveData('unknown.json', payload)).toBe(payload);
  });
});
