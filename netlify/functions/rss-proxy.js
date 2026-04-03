// netlify/functions/rss-proxy.js
// Google News RSS proxy — CORS sorunsuz haber çekme

const https = require('https');
const http = require('http');

function fetchURL(url) {
    return new Promise((resolve, reject) => {
        const mod = url.startsWith('https') ? https : http;
        const req = mod.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            timeout: 10000
        }, (res) => {
            // Follow redirects
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return fetchURL(res.headers.location).then(resolve).catch(reject);
            }
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    });
}

exports.handler = async function(event) {
    const q = event.queryStringParameters && event.queryStringParameters.q;
    if (!q) {
        return { statusCode: 400, body: JSON.stringify({ error: 'q parametresi gerekli' }) };
    }

    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=tr&gl=TR&ceid=TR:tr`;

    try {
        const xml = await fetchURL(rssUrl);

        // Basit XML parse — <item> bloklarını çıkar
        const items = [];
        const itemRegex = /<item>([\s\S]*?)<\/item>/g;
        let match;
        while ((match = itemRegex.exec(xml)) !== null && items.length < 10) {
            const block = match[1];
            const title = (block.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '';
            const link = (block.match(/<link>([\s\S]*?)<\/link>/) || [])[1] || '';
            const pubDate = (block.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1] || '';

            if (title) {
                items.push({
                    title: title.replace(/<!\[CDATA\[|\]\]>/g, '').trim(),
                    link: link.trim(),
                    date: pubDate.trim()
                });
            }
        }

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=300'
            },
            body: JSON.stringify({ items })
        };
    } catch (e) {
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: e.message, items: [] })
        };
    }
};
