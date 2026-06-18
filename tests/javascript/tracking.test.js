const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '../..');
const siteDir = path.join(repoRoot, 'site');

describe('Umami tracking integration', () => {
  test('all top-level HTML pages include the shared tracking script exactly once', () => {
    const htmlFiles = fs
      .readdirSync(siteDir)
      .filter((name) => name.endsWith('.html'));

    expect(htmlFiles.length).toBeGreaterThan(0);

    for (const file of htmlFiles) {
      const html = fs.readFileSync(path.join(siteDir, file), 'utf8');
      const matches = html.match(/assets\/js\/tracking\.js/g) || [];
      expect(matches.length).toBe(1);
      expect(html.slice(html.lastIndexOf('<script src="assets/js/tracking.js"></script>'))).toMatch(/^<script src="assets\/js\/tracking\.js"><\/script>\s*<\/body>\s*<\/html>\s*$/);
    }
  });

  test('tracking script points both Umami scripts to the configured website id', () => {
    const trackingJs = fs.readFileSync(path.join(siteDir, 'assets/js/tracking.js'), 'utf8');

    expect(trackingJs).toContain("var UMAMI_WEBSITE_ID = '225a22e7-ab30-4bf1-bf98-97a49841e69b';");
    expect(trackingJs).toContain("var UMAMI_HOST = 'https://umami.validasyon.net';");
    expect(trackingJs).toContain("src: UMAMI_HOST + '/script.js'");
    expect(trackingJs).toContain("src: UMAMI_HOST + '/recorder.js'");
    expect((trackingJs.match(/'data-website-id': UMAMI_WEBSITE_ID/g) || []).length).toBe(2);
  });
});
