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


function cleanBoolean(value) {
  return value === true;
}

function fallbackDeviceType(userAgent) {
  const ua = String(userAgent || '').toLowerCase();
  if (/ipad|tablet|kindle|silk|playbook/.test(ua)) return 'Tablet';
  if (/mobi|android|iphone|ipod|blackberry|iemobile|opera mini/.test(ua)) return 'Mobil';
  return 'Masaüstü';
}

function normalizeDevice(value, userAgent) {
  const device = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return {
    deviceType: cleanText(device.deviceType || fallbackDeviceType(userAgent), 40),
    platform: cleanText(device.platform || '', 80),
    language: cleanText(device.language || '', 80),
    screen: cleanText(device.screen || '', 40),
    viewport: cleanText(device.viewport || '', 40),
    timezone: cleanText(device.timezone || '', 80),
    touch: cleanBoolean(device.touch),
    cookies: cleanBoolean(device.cookies),
    connection: cleanText(device.connection || '', 40)
  };
}

function safeVisitorId(value) {
  const id = cleanText(value, 80);
  return /^[a-zA-Z0-9._:-]{8,80}$/.test(id) ? id : '';
}

async function readEvents(store) {
  const data = await store.get('events', { type: 'json' });
  return Array.isArray(data) ? data : [];
}

async function readVisitors(store) {
  const data = await store.get('visitors', { type: 'json' });
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { nextNumber: 1, byId: {} };
  }
  return {
    nextNumber: Math.max(1, parseInt(data.nextNumber, 10) || 1),
    byId: data.byId && typeof data.byId === 'object' && !Array.isArray(data.byId) ? data.byId : {}
  };
}

function visitorLabel(number) {
  return `Anonim Ziyaretçi #${number}`;
}

function normalizeVisitorEntry(entry, fallbackNumber) {
  const number = Math.max(1, parseInt(entry && entry.number, 10) || fallbackNumber);
  return {
    number,
    label: cleanText((entry && entry.label) || visitorLabel(number), 80),
    firstSeenAt: cleanText(entry && entry.firstSeenAt, 40),
    lastSeenAt: cleanText(entry && entry.lastSeenAt, 40),
    visits: Math.max(0, parseInt(entry && entry.visits, 10) || 0)
  };
}

function getOrCreateVisitor(visitors, visitorId, now) {
  const byId = visitors.byId;
  if (byId[visitorId]) {
    const existing = normalizeVisitorEntry(byId[visitorId], visitors.nextNumber);
    existing.lastSeenAt = now;
    existing.visits += 1;
    byId[visitorId] = existing;
    return existing;
  }

  const number = visitors.nextNumber;
  const created = {
    number,
    label: visitorLabel(number),
    firstSeenAt: now,
    lastSeenAt: now,
    visits: 1
  };
  byId[visitorId] = created;
  visitors.nextNumber = number + 1;
  return created;
}

async function ensureVisitorLabels(store, events) {
  const visitors = await readVisitors(store);
  let changed = false;
  const chronological = events.slice().sort((a, b) => String(a.visitedAt || '').localeCompare(String(b.visitedAt || '')));

  chronological.forEach((event) => {
    const visitorId = safeVisitorId(event.visitorId) || 'anonim';
    const seenAt = cleanText(event.visitedAt || new Date().toISOString(), 40);
    if (!visitors.byId[visitorId]) {
      const number = visitors.nextNumber;
      visitors.byId[visitorId] = {
        number,
        label: visitorLabel(number),
        firstSeenAt: seenAt,
        lastSeenAt: seenAt,
        visits: 0
      };
      visitors.nextNumber = number + 1;
      changed = true;
    }
    const entry = normalizeVisitorEntry(visitors.byId[visitorId], visitors.nextNumber);
    if (!entry.firstSeenAt || seenAt < entry.firstSeenAt) entry.firstSeenAt = seenAt;
    if (!entry.lastSeenAt || seenAt > entry.lastSeenAt) entry.lastSeenAt = seenAt;
    visitors.byId[visitorId] = entry;
  });

  const enriched = events.map((event) => {
    const visitorId = safeVisitorId(event.visitorId) || 'anonim';
    const entry = visitors.byId[visitorId];
    return { ...event, visitorNumber: entry.number, visitorLabel: entry.label };
  });

  if (changed) await store.setJSON('visitors', visitors);
  return { events: enriched, visitors };
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
      const allEvents = await readEvents(store);
      const labeled = await ensureVisitorLabels(store, allEvents);
      const events = labeled.events.slice(-limit).reverse();
      return json(200, { success: true, count: events.length, events });
    }

    if (event.httpMethod !== 'POST') return json(405, { success: false, error: 'Method Not Allowed' });

    const body = parseBody(event);
    if (body.consent !== 'accepted') {
      return json(202, { success: true, skipped: true });
    }

    const geo = countryCity(event);
    const userAgent = cleanText(getHeader(event.headers, 'user-agent'), 300);
    const device = normalizeDevice(body.device, userAgent);
    const now = new Date().toISOString();
    const visitorId = safeVisitorId(body.visitorId) || 'anonim';
    const visitors = await readVisitors(store);
    const visitor = getOrCreateVisitor(visitors, visitorId, now);

    const record = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      visitedAt: now,
      visitorId,
      visitorNumber: visitor.number,
      visitorLabel: visitor.label,
      page: cleanText(body.page || '/', 180),
      title: cleanText(body.title || '', 180),
      referrer: cleanText(body.referrer || '', 300),
      userAgent,
      language: cleanText(device.language || getHeader(event.headers, 'accept-language'), 120),
      deviceType: device.deviceType,
      platform: device.platform,
      screen: device.screen,
      viewport: device.viewport,
      timezone: device.timezone,
      touch: device.touch,
      cookies: device.cookies,
      connection: device.connection,
      ip: clientIp(event),
      country: geo.country,
      city: geo.city
    };

    const events = await readEvents(store);
    events.push(record);
    const trimmed = events.slice(-MAX_EVENTS);
    await store.setJSON('events', trimmed);
    await store.setJSON('visitors', visitors);

    return json(200, { success: true, id: record.id, visitorLabel: record.visitorLabel });
  } catch (error) {
    return json(500, { success: false, error: error.message });
  }
};
