/**
 * rss-proxy.js Netlify function testleri
 */

const { handler } = require('../../netlify/functions/rss-proxy');

// https/http modüllerini mock'la
jest.mock('https', () => {
    const { EventEmitter } = require('events');
    return {
        get: jest.fn()
    };
});
jest.mock('http', () => {
    const { EventEmitter } = require('events');
    return {
        get: jest.fn()
    };
});

const https = require('https');
const { EventEmitter } = require('events');

function mockHttpsGet(responseData, statusCode = 200, headers = {}) {
    https.get.mockImplementation((url, opts, callback) => {
        const res = new EventEmitter();
        res.statusCode = statusCode;
        res.headers = headers;

        process.nextTick(() => {
            callback(res);
            res.emit('data', responseData);
            res.emit('end');
        });

        const req = new EventEmitter();
        req.destroy = jest.fn();
        return req;
    });
}

describe('rss-proxy handler', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('q parametresi olmadan 400 döner', async () => {
        const res = await handler({
            queryStringParameters: {}
        });
        expect(res.statusCode).toBe(400);
        const body = JSON.parse(res.body);
        expect(body.error).toBeDefined();
    });

    test('null queryStringParameters ile 400 döner', async () => {
        const res = await handler({
            queryStringParameters: null
        });
        expect(res.statusCode).toBe(400);
    });

    test('geçerli XML ile haber listesi döner', async () => {
        const xml = `<?xml version="1.0"?>
        <rss><channel>
            <item>
                <title><![CDATA[Test Haber 1]]></title>
                <link>https://example.com/1</link>
                <pubDate>Mon, 01 Jan 2024 12:00:00 GMT</pubDate>
            </item>
            <item>
                <title>Test Haber 2</title>
                <link>https://example.com/2</link>
                <pubDate>Tue, 02 Jan 2024 12:00:00 GMT</pubDate>
            </item>
        </channel></rss>`;

        mockHttpsGet(xml);

        const res = await handler({
            queryStringParameters: { q: 'test' }
        });

        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.body);
        expect(body.items).toHaveLength(2);
        expect(body.items[0].title).toBe('Test Haber 1');
        expect(body.items[0].link).toBe('https://example.com/1');
        expect(body.items[1].title).toBe('Test Haber 2');
    });

    test('CDATA wrapping temizlenir', async () => {
        const xml = `<rss><channel>
            <item>
                <title><![CDATA[CDATA İçerik]]></title>
                <link>https://x.com</link>
            </item>
        </channel></rss>`;

        mockHttpsGet(xml);

        const res = await handler({
            queryStringParameters: { q: 'test' }
        });

        const body = JSON.parse(res.body);
        expect(body.items[0].title).toBe('CDATA İçerik');
        expect(body.items[0].title).not.toContain('<![CDATA[');
    });

    test('maksimum 10 haber döner', async () => {
        let xml = '<rss><channel>';
        for (let i = 0; i < 15; i++) {
            xml += `<item><title>Haber ${i}</title><link>https://x.com/${i}</link></item>`;
        }
        xml += '</channel></rss>';

        mockHttpsGet(xml);

        const res = await handler({
            queryStringParameters: { q: 'test' }
        });

        const body = JSON.parse(res.body);
        expect(body.items.length).toBeLessThanOrEqual(10);
    });

    test('CORS header doğru', async () => {
        const xml = '<rss><channel></channel></rss>';
        mockHttpsGet(xml);

        const res = await handler({
            queryStringParameters: { q: 'test' }
        });

        expect(res.headers['Access-Control-Allow-Origin']).toBe('*');
        expect(res.headers['Content-Type']).toBe('application/json');
    });

    test('boş RSS ile boş items döner', async () => {
        mockHttpsGet('<rss><channel></channel></rss>');

        const res = await handler({
            queryStringParameters: { q: 'test' }
        });

        const body = JSON.parse(res.body);
        expect(body.items).toHaveLength(0);
    });
});
