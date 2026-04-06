const { getStore, connectLambda } = require('@netlify/blobs');

exports.handler = async function(event) {
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

    const page = event.queryStringParameters?.page;
    if (!page || !/^[a-z0-9-]+$/.test(page)) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Gecersiz sayfa parametresi' }) };
    }

    try {
        const store = getStore("page-overrides");

        if (event.httpMethod === 'GET') {
            let data = await store.get(page, { type: "json" });
            if (!data) data = { overrides: {}, updatedAt: null };
            return { statusCode: 200, headers, body: JSON.stringify(data) };
        }

        if (event.httpMethod === 'POST') {
            let payload = event.body;
            if (event.isBase64Encoded) {
                payload = Buffer.from(event.body, 'base64').toString('utf-8');
            }
            const body = JSON.parse(payload);

            if (body.pin !== 'isedes') {
                return { statusCode: 403, headers, body: JSON.stringify({ error: 'Yanlis PIN' }) };
            }

            const state = {
                overrides: body.data?.overrides || {},
                updatedAt: new Date().toISOString()
            };

            await store.setJSON(page, state);
            return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
        }

        return { statusCode: 405, headers, body: 'Method Not Allowed' };
    } catch (error) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    }
};
