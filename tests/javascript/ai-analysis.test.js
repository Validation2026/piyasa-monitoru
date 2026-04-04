/**
 * ai-analysis.js Netlify function testleri
 */

const { handler } = require('../../netlify/functions/ai-analysis');

function makeEvent(cat) {
    return {
        queryStringParameters: cat !== undefined ? { cat } : {}
    };
}

describe('ai-analysis handler', () => {

    test('geçerli kategori ile doğru analiz döner', async () => {
        const res = await handler(makeEvent('kripto'));
        expect(res.statusCode).toBe(200);

        const body = JSON.parse(res.body);
        expect(body.analysis).toBeDefined();
        expect(body.analysis.length).toBeGreaterThan(0);
        expect(body.analysis.toLowerCase()).toContain('kripto');
    });

    test('eksik cat parametresi ile genel analiz döner', async () => {
        const res = await handler({ queryStringParameters: {} });
        expect(res.statusCode).toBe(200);

        const body = JSON.parse(res.body);
        expect(body.analysis).toBeDefined();
        expect(body.analysis.toLowerCase()).toContain('piyasa');
    });

    test('null queryStringParameters ile genel analiz döner', async () => {
        const res = await handler({ queryStringParameters: null });
        expect(res.statusCode).toBe(200);

        const body = JSON.parse(res.body);
        expect(body.analysis).toBeDefined();
    });

    test('bilinmeyen kategori ile genel fallback döner', async () => {
        const res = await handler(makeEvent('bilinmeyen-kategori'));
        expect(res.statusCode).toBe(200);

        const body = JSON.parse(res.body);
        expect(body.analysis).toBeDefined();
    });

    test('CORS header doğru ayarlanmış', async () => {
        const res = await handler(makeEvent('kurlar'));
        expect(res.headers['Access-Control-Allow-Origin']).toBe('*');
        expect(res.headers['Content-Type']).toBe('application/json');
    });

    test('cache header ayarlanmış', async () => {
        const res = await handler(makeEvent('kurlar'));
        expect(res.headers['Cache-Control']).toContain('max-age');
    });

    test('tüm bilinen kategoriler yanıt döner', async () => {
        const categories = [
            'iran-risk', 'emtia-enerji', 'emtia-metaller', 'emtia-tarim',
            'kurlar', 'tahviller', 'endeksler', 'kripto', 'sanayi', 'genel', 'navlun'
        ];

        for (const cat of categories) {
            const res = await handler(makeEvent(cat));
            expect(res.statusCode).toBe(200);
            const body = JSON.parse(res.body);
            expect(body.analysis).toBeDefined();
            expect(body.analysis.length).toBeGreaterThan(50);
        }
    });

    test('yanıt JSON formatında', async () => {
        const res = await handler(makeEvent('genel'));
        expect(() => JSON.parse(res.body)).not.toThrow();
    });
});
