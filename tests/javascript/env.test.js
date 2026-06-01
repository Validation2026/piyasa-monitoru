const { parseEnvLine } = require('../../netlify/functions/env');

describe('env loader parser', () => {
  test('GEMINI_API_KEY satırını okur', () => {
    expect(parseEnvLine('GEMINI_API_KEY=abc123')).toEqual({ key: 'GEMINI_API_KEY', value: 'abc123' });
  });

  test('yorumları ve boş satırları atlar', () => {
    expect(parseEnvLine('# comment')).toBeNull();
    expect(parseEnvLine('   ')).toBeNull();
  });

  test('tırnaklı değerleri çözer', () => {
    expect(parseEnvLine('GEMINI_MODEL="gemini-2.5-flash"')).toEqual({ key: 'GEMINI_MODEL', value: 'gemini-2.5-flash' });
  });
});
