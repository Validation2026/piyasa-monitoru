const { getStore, connectLambda } = require('@netlify/blobs');

const DEFAULT = {
    riskScore: 50,
    hurmuzStatus: 'AÇIK / GÜVENLİ',
    manualCommodities: {},
    customMetrics: []
};

exports.handler = async function(event) {
    // Bu satır ZORUNLU — Netlify Blobs kimlik doğrulaması için
    connectLambda(event);

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
        const store = getStore("iran-risk");

        if (event.httpMethod === 'GET') {
            let data = await store.get("state", { type: "json" });
            if (!data) data = DEFAULT;
            return { statusCode: 200, headers, body: JSON.stringify(data) };
        }

        if (event.httpMethod === 'POST') {
            let payload = event.body;
            if (event.isBase64Encoded) {
                payload = Buffer.from(event.body, 'base64').toString('utf-8');
            }
            const body = JSON.parse(payload);

            if (body.pin !== 'isedes') {
                return { statusCode: 403, headers, body: JSON.stringify({ error: 'Yanlış PIN' }) };
            }

            const state = {
                riskScore: body.data.riskScore || 50,
                hurmuzStatus: body.data.hurmuzStatus || 'AÇIK / GÜVENLİ',
                manualCommodities: body.data.manualCommodities || {},
                customMetrics: body.data.customMetrics || [],
                timeline: body.data.timeline || [],
                countryRisk: body.data.countryRisk || null,
                updatedAt: new Date().toISOString()
            };

            await store.setJSON("state", state);
            return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
        }

        return { statusCode: 405, headers, body: 'Method Not Allowed' };
    } catch (error) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    }
};
