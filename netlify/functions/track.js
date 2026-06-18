const { getStore, connectLambda } = require('@netlify/blobs');

const MAX_EVENTS = 500;
const STORE_NAME = 'visitor-analytics';
const PIN = process.env.ADMIN_PIN || 'isedes';

const HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
};

function json(statusCode, body) {
  return { statusCode, headers: HEADERS, body: JSON.stringify(body) };
}

function cleanText(value, max = 240) {
  return String(value == null ? '' : value).replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max);
}

function getHeader(headers, name) {
  const key = Object.keys(headers || {}).find((k) => k.toLowerCase() === name.toLowerCase());
  return key ? headers[key] : '';
}

function clientIp(event) {
  const raw = getHeader(event.headers, 'x-forwarded-for') || getHeader(event.headers, 'client-ip') || '';
  return cleanText(raw.split(',')[0], 80);
}

function looseGeoFromText(value) {
  const text = String(value || '');
  const city = text.match(/\"city\"\s*:\s*\"([^\"]+)\"/);
  const countryName = text.match(/\"name\"\s*:\s*\"([^\"]+)\"/);
  const countryCode = text.match(/\"code\"\s*:\s*\"([^\"]+)\"/);
  if (!city && !countryName && !countryCode) return null;
  return {
    city: city ? city[1] : '',
    country: { name: countryName ? countryName[1] : '', code: countryCode ? countryCode[1] : '' }
  };
}

function parseJsonMaybe(value) {
  const raw = cleanText(value, 1000);
  if (!raw) return null;

  const candidates = [raw];
  if (/^[A-Za-z0-9+/=_-]+$/.test(raw)) {
    try { candidates.push(Buffer.from(raw.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')); } catch (_) {}
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === 'object') return parsed;
    } catch (_) {
      const loose = looseGeoFromText(candidate);
      if (loose) return loose;
    }
  }
  return null;
}

function countryName(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value.name || value.code || '';
}

function countryCity(event) {
  const h = event.headers || {};
  const nfGeo = parseJsonMaybe(getHeader(h, 'x-nf-geo')) || {};
  return {
    country: cleanText(countryName(nfGeo.country) || getHeader(h, 'x-country') || getHeader(h, 'cf-ipcountry'), 80),
    city: cleanText(nfGeo.city || getHeader(h, 'x-nf-city') || getHeader(h, 'x-city'), 80)
  };
}

function parseBody(event) {
  let payload = event.body || '{}';
  if (event.isBase64Encoded) payload = Buffer.from(payload, 'base64').toString('utf8');
  try { return JSON.parse(payload); } catch (_) { return {}; }
}

function safeVisitorId(value) {
  const id = cleanText(value, 80);
  return /^[a-zA-Z0-9._:-]{8,80}$/.test(id) ? id : '';
}

async function readEvents(store) {
  const data = await store.get('events', { type: 'json' });
  return Array.isArray(data) ? data : [];
}

exports.handler = async function(event) {
  connectLambda(event);

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: HEADERS, body: '' };

  try {
    const store = getStore(STORE_NAME);

    if (event.httpMethod === 'GET') {
      const pin = event.queryStringParameters && event.queryStringParameters.pin;
      if (pin !== PIN) return json(403, { success: false, error: 'Yanlis PIN' });

      const limit = Math.max(1, Math.min(parseInt(event.queryStringParameters.limit || '100', 10) || 100, MAX_EVENTS));
      const events = (await readEvents(store)).slice(-limit).reverse();
      return json(200, { success: true, count: events.length, events });
    }

    if (event.httpMethod !== 'POST') return json(405, { success: false, error: 'Method Not Allowed' });

    const body = parseBody(event);
    if (body.consent !== 'accepted') {
      return json(202, { success: true, skipped: true });
    }

    const geo = countryCity(event);
    const now = new Date().toISOString();
    const record = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      visitedAt: now,
      visitorId: safeVisitorId(body.visitorId) || 'anonim',
      page: cleanText(body.page || '/', 180),
      title: cleanText(body.title || '', 180),
      referrer: cleanText(body.referrer || '', 300),
      userAgent: cleanText(getHeader(event.headers, 'user-agent'), 300),
      language: cleanText(getHeader(event.headers, 'accept-language'), 120),
      ip: clientIp(event),
      country: geo.country,
      city: geo.city
    };

    const events = await readEvents(store);
    events.push(record);
    const trimmed = events.slice(-MAX_EVENTS);
    await store.setJSON('events', trimmed);

    return json(200, { success: true, id: record.id });
  } catch (error) {
    return json(500, { success: false, error: error.message });
  }
};
