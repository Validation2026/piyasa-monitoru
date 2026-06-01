const { getStore, connectLambda } = require('@netlify/blobs');
'use strict';

const DEFAULT = {
  riskScore: 50,
  hurmuzStatus: 'AÇIK / GÜVENLİ',
  manualCommodities: {},
  customMetrics: [],
  timeline: [],
  countryRisk: null,
  bannerBrief: null,
  bannerHeadline: '',
  bannerSummary: ''
};

const HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0'
};

function json(statusCode, body) {
  return { statusCode, headers: HEADERS, body: JSON.stringify(body) };
}

function cleanText(v) {
  return String(v == null ? '' : v).trim();
}

function encodeBase64(str) {
  return Buffer.from(str, 'utf8').toString('base64');
}

function decodeBase64(str) {
  return Buffer.from(String(str || '').replace(/\n/g, ''), 'base64').toString('utf8');
}

function getBannerFrom(input) {
  input = input || {};
  const bb = input.bannerBrief || input.iranBanner || input.adminBanner || {};
  const headline = cleanText(bb.headline || bb.title || input.bannerHeadline);
  const summary = cleanText(bb.summary || bb.text || input.bannerSummary);
  return { headline, summary };
}

function hasBanner(input) {
  const b = getBannerFrom(input);
  return !!(b.headline || b.summary);
}

function putBannerEverywhere(state, banner) {
  const headline = cleanText(banner && banner.headline);
  const summary = cleanText(banner && banner.summary);

  if (!headline && !summary) return state;

  const normalized = { headline, summary };
  state.bannerBrief = normalized;
  state.iranBanner = normalized;
  state.adminBanner = normalized;
  state.bannerHeadline = headline;
  state.bannerSummary = summary;

  // Piyasa analiziyle karışmasın.
  delete state.briefHeadline;
  delete state.briefSummary;

  return state;
}

function mergeWithoutLosingBlob(current, incoming) {
  current = current && typeof current === 'object' ? current : {};
  incoming = incoming && typeof incoming === 'object' ? incoming : {};

  // ÖNEMLİ:
  // Gelen body eksik alan gönderirse mevcut Blob alanlarını silme.
  // Sadece gerçekten gönderilen alanları güncelle.
  const state = { ...current };

  if ('riskScore' in incoming) state.riskScore = incoming.riskScore;
  if ('hurmuzStatus' in incoming) state.hurmuzStatus = incoming.hurmuzStatus;
  if ('manualCommodities' in incoming) state.manualCommodities = incoming.manualCommodities || {};
  if ('customMetrics' in incoming) state.customMetrics = incoming.customMetrics || [];
  if ('timeline' in incoming) state.timeline = incoming.timeline || [];
  if ('countryRisk' in incoming) state.countryRisk = incoming.countryRisk || null;

  // Banner gönderildiyse güncelle; gönderilmediyse mevcut banner aynen kalsın.
  if (hasBanner(incoming)) {
    putBannerEverywhere(state, getBannerFrom(incoming));
  } else if (hasBanner(current)) {
    putBannerEverywhere(state, getBannerFrom(current));
  }

  state.updatedAt = new Date().toISOString();
  return state;
}

function githubConfig() {
  return {
    token: process.env.GITHUB_TOKEN || '',
    owner: process.env.GITHUB_OWNER || '',
    repo: process.env.GITHUB_REPO || '',
    branch: process.env.GITHUB_BRANCH || 'main',
    path: process.env.IRAN_BANNER_PATH || 'data/iran-banner.json'
  };
}

function githubEnabled() {
  const cfg = githubConfig();
  return !!(cfg.token && cfg.owner && cfg.repo && cfg.path);
}

async function ghFetch(url, options = {}) {
  const cfg = githubConfig();
  const res = await fetch(url, {
    ...options,
    headers: {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${cfg.token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'risk-monitor-admin-banner',
      ...(options.headers || {})
    }
  });

  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (_) { data = { raw: text }; }

  if (!res.ok) {
    const err = new Error((data && data.message) || `GitHub API hatası (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

async function readGithubBannerFile() {
  const cfg = githubConfig();
  const encodedPath = cfg.path.split('/').map(encodeURIComponent).join('/');
  const url = `https://api.github.com/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/contents/${encodedPath}?ref=${encodeURIComponent(cfg.branch)}`;

  try {
    const file = await ghFetch(url);
    let data = {};
    try { data = JSON.parse(decodeBase64(file.content || '')); } catch (_) { data = {}; }
    return { data, sha: file.sha || null };
  } catch (err) {
    if (err.status === 404) return { data: {}, sha: null };
    throw err;
  }
}

async function writeGithubBannerFile(banner, fullBlobState) {
  if (!githubEnabled()) {
    return { skipped: true, reason: 'GitHub env yok' };
  }

  const current = await readGithubBannerFile();
  const cfg = githubConfig();

  // GitHub'a SADECE banner ve küçük metadata yazıyoruz.
  // Blob'daki customMetrics/timeline/countryRisk burada tutulmuyor; onlar Blob'da kalıyor.
  const contentObject = {
    bannerBrief: {
      headline: cleanText(banner.headline),
      summary: cleanText(banner.summary)
    },
    bannerHeadline: cleanText(banner.headline),
    bannerSummary: cleanText(banner.summary),
    updatedAt: fullBlobState.updatedAt || new Date().toISOString()
  };

  const body = {
    message: `admin: iran banner update ${contentObject.updatedAt}`,
    content: encodeBase64(JSON.stringify(contentObject, null, 2) + '\n'),
    branch: cfg.branch
  };

  if (current.sha) body.sha = current.sha;

  const encodedPath = cfg.path.split('/').map(encodeURIComponent).join('/');
  const url = `https://api.github.com/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/contents/${encodedPath}`;

  const result = await ghFetch(url, { method: 'PUT', body: JSON.stringify(body) });
  return {
    skipped: false,
    path: cfg.path,
    commit: result && result.commit ? result.commit.sha : null
  };
}

exports.handler = async function(event) {
  connectLambda(event);

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: HEADERS, body: '' };
  }

  try {
    const store = getStore('iran-risk');

    if (event.httpMethod === 'GET') {
      let data = await store.get('state', { type: 'json' });
      if (!data) data = DEFAULT;
      return json(200, data);
    }

    if (event.httpMethod !== 'POST') {
      return json(405, { success: false, error: 'Method Not Allowed' });
    }

    let payload = event.body || '{}';
    if (event.isBase64Encoded) {
      payload = Buffer.from(event.body || '', 'base64').toString('utf-8');
    }

    const body = JSON.parse(payload || '{}');

    const expectedPin = process.env.ADMIN_PIN || 'isedes';
    if (String(body.pin || '') !== String(expectedPin)) {
      return json(403, { success: false, error: 'Yanlış PIN' });
    }

    const incoming = body.data && typeof body.data === 'object' ? body.data : body;

    let current = await store.get('state', { type: 'json' });
    if (!current) current = DEFAULT;

    const nextState = mergeWithoutLosingBlob(current, incoming);

    // 1) Asıl admin state HER ZAMAN Blob'a yazılır.
    await store.setJSON('state', nextState);

    // 2) Sadece banner gönderildiyse GitHub'a ayrıca commit atılır.
    let github = { skipped: true, reason: 'Bu kayıtta banner değişmedi' };
    if (hasBanner(incoming)) {
      github = await writeGithubBannerFile(getBannerFrom(nextState), nextState);
    }

    return json(200, {
      success: true,
      message: 'Blob güncellendi. Banner varsa GitHub’a ayrıca commit atıldı.',
      github,
      state: nextState
    });
  } catch (error) {
    return json(error.status || 500, {
      success: false,
      error: error.message || 'Bilinmeyen hata',
      detail: error.data || undefined
    });
  }
};
