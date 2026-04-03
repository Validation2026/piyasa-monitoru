// netlify/functions/iran-state.js
// İran Risk admin state — GET ile oku, POST ile yaz
// Netlify Blobs kullanarak tüm cihazlarda aynı veri

const { getStore } = require('@netlify/blobs');

const DEFAULT = {
    riskScore: 50,
    hurmuzStatus: 'AÇIK / GÜVENLİ',
    manualCommodities: {},
    customMetrics: []
};

exports.handler = async function(event, context) {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        const store = getStore({ name: 'iran-risk', siteID: process.env.SITE_ID, token: process.env.NETLIFY_API_TOKEN || process.env.BLOB_TOKEN });

        if (event.httpMethod === 'GET') {
            let data;
            try {
                data = await store.get('state', { type: 'json' });
            } catch(e) {
                data = null;
            }
            return { statusCode: 200, headers, body: JSON.stringify(data || DEFAULT) };
        }

        if (event.httpMethod === 'POST') {
            let body;
            if (event.isBase64Encoded) {
                body = JSON.parse(Buffer.from(event.body, 'base64').toString('utf-8'));
            } else {
                body = JSON.parse(event.body);
            }

            if (body.pin !== 'isedes') {
                return { statusCode: 403, headers, body: JSON.stringify({ error: 'Yanlış PIN' }) };
            }

            const state = {
                riskScore: body.data.riskScore || 50,
                hurmuzStatus: body.data.hurmuzStatus || 'AÇIK / GÜVENLİ',
                manualCommodities: body.data.manualCommodities || {},
                customMetrics: body.data.customMetrics || [],
                updatedAt: new Date().toISOString()
            };

            await store.setJSON('state', state);
            return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
        }

        return { statusCode: 405, headers, body: 'Method Not Allowed' };
    } catch(e) {
        // Blobs yoksa localStorage fallback mesajı
        return { statusCode: 200, headers, body: JSON.stringify(DEFAULT) };
    }
};
