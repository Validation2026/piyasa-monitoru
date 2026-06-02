const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadExcelHelpers() {
  const appJs = fs.readFileSync(path.join(__dirname, '../../site/assets/js/app.js'), 'utf8');
  const start = appJs.indexOf('function xmlEscape');
  const end = appJs.indexOf('// Tek bir HTML tablosunu', start);
  if (start === -1 || end === -1) throw new Error('Excel helper block not found');
  const context = {};
  vm.createContext(context);
  vm.runInContext(appJs.slice(start, end), context);
  return context;
}

describe('app Excel helper HTML', () => {
  test('xlsRowHtml renders a single valid header row', () => {
    const { xlsRowHtml } = loadExcelHelpers();
    const html = xlsRowHtml(['Varlık', '1A %'], true);

    expect(html).toBe('<tr><th style="background:#e5e7eb;font-weight:bold">Varlık</th><th style="background:#e5e7eb;font-weight:bold">1A %</th></tr>');
    expect((html.match(/<tr>/g) || []).length).toBe(1);
    expect((html.match(/<\/tr>/g) || []).length).toBe(1);
  });

  test('xlsRowHtml escapes text cells', () => {
    const { xlsRowHtml } = loadExcelHelpers();
    expect(xlsRowHtml(['<script>'], false)).toBe('<tr><td>&lt;script&gt;</td></tr>');
  });
});
