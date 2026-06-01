'use strict';

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0'
};

function json(statusCode, body) {
  return { statusCode, headers: JSON_HEADERS, body: JSON.stringify(body) };
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

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Eksik ortam değişkeni: ${name}`);
  return value;
}

function githubConfig() {
  return {
    token: requiredEnv('GITHUB_TOKEN'),
    owner: requiredEnv('GITHUB_OWNER'),
    repo: requiredEnv('GITHUB_REPO'),
    branch: process.env.GITHUB_BRANCH || 'main',
    path: process.env.IRAN_STATE_PATH || 'data/iran-state.json'
  };
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
    const msg = data && data.message ? data.message : `GitHub API hatası (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function readStateFile() {
  const cfg = githubConfig();
  const url = `https://api.github.com/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/contents/${cfg.path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(cfg.branch)}`;
  try {
    const file = await ghFetch(url);
    const content = decodeBase64(file.content || '');
    let state = {};
    try { state = content ? JSON.parse(content) : {}; } catch (_) { state = {}; }
    return { state, sha: file.sha || null };
  } catch (err) {
    if (err.status === 404) return { state: {}, sha: null };
    throw err;
  }
}

async function writeStateFile(state, sha, attempt = 1) {
  const cfg = githubConfig();
  const url = `https://api.github.com/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/contents/${cfg.path.split('/').map(encodeURIComponent).join('/')}`;
  const body = {
    message: `admin: iran banner/state update ${new Date().toISOString()}`,
    content: encodeBase64(JSON.stringify(state, null, 2) + '\n'),
    branch: cfg.branch
  };
  if (sha) body.sha = sha;

  try {
    return await ghFetch(url, { method: 'PUT', body: JSON.stringify(body) });
  } catch (err) {
    // Aynı anda iki kayıt olduysa en güncel SHA ile bir kere daha dene.
    if ((err.status === 409 || err.status === 422) && attempt === 1) {
      const latest = await readStateFile();
      return writeStateFile(mergeState(latest.state, state), latest.sha, 2);
    }
    throw err;
  }
}

function getBannerFrom(input) {
  input = input || {};
  const bb = input.bannerBrief || input.iranBanner || input.adminBanner || {};
  return {
    headline: cleanText(bb.headline || bb.title || input.bannerHeadline),
    summary: cleanText(bb.summary || bb.text || input.bannerSummary)
  };
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

  // Bilerek briefHeadline / briefSummary yazmıyoruz.
  // Bunlar piyasa analizi tarafıyla karışmasın diye banner kaynağı değil.
  delete state.briefHeadline;
  delete state.briefSummary;
  return state;
}

function mergeState(current, incoming) {
  current = current && typeof current === 'object' ? current : {};
  incoming = incoming && typeof incoming === 'object' ? incoming : {};

  const merged = { ...current, ...incoming };

  const incomingBanner = getBannerFrom(incoming);
  const currentBanner = getBannerFrom(current);
  const finalBanner = (incomingBanner.headline || incomingBanner.summary) ? incomingBanner : currentBanner;
  putBannerEverywhere(merged, finalBanner);

  // Eski hazır yazı yanlışlıkla state'e geldiyse banner diye kullanma.
  const badHeadline = 'Ateşkes kırılgan, Hürmüz riski yüksek, piyasa stresi yeniden artıyor';
  if (cleanText(merged.bannerHeadline) === badHeadline && (currentBanner.headline || currentBanner.summary)) {
    putBannerEverywhere(merged, currentBanner);
  }

  merged.updatedAt = new Date().toISOString();
  return merged;
}

exports.handler = async function handler(event) {
  try {
    if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: JSON_HEADERS, body: '' };

    if (event.httpMethod === 'GET') {
      const { state } = await readStateFile();
      return json(200, state);
    }

    if (event.httpMethod !== 'POST') {
      return json(405, { success: false, error: 'Method not allowed' });
    }

    const body = JSON.parse(event.body || '{}');
    const expectedPin = process.env.ADMIN_PIN || '';
    if (expectedPin && String(body.pin || '') !== expectedPin) {
      return json(401, { success: false, error: 'PIN hatalı' });
    }

    const incoming = body.data && typeof body.data === 'object' ? body.data : body;
    const { state: current, sha } = await readStateFile();
    const merged = mergeState(current, incoming);
    const result = await writeStateFile(merged, sha);

    return json(200, {
      success: true,
      message: 'GitHub\'a commit atıldı.',
      commit: result && result.commit ? result.commit.sha : null,
      path: githubConfig().path,
      state: merged
    });
  } catch (err) {
    return json(err.status || 500, {
      success: false,
      error: err.message || 'Bilinmeyen hata',
      detail: err.data || undefined
    });
  }
};
