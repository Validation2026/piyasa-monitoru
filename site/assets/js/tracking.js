(function(){
  'use strict';

  var CONSENT_KEY = 'pmAnalyticsConsent';
  var VISITOR_KEY = 'pmVisitorId';

  var UMAMI_WEBSITE_ID = '225a22e7-ab30-4bf1-bf98-97a49841e69b';
  var UMAMI_HOST = 'https://umami.validasyon.net';

  var UMAMI_SCRIPTS = [
    {
      id: 'pmUmamiAnalyticsScript',
      src: UMAMI_HOST + '/script.js',
      attrs: {
        'data-website-id': UMAMI_WEBSITE_ID
      }
    },
    {
      id: 'pmUmamiRecorderScript',
      src: UMAMI_HOST + '/recorder.js',
      attrs: {
        'data-website-id': UMAMI_WEBSITE_ID,
        'data-sample-rate': '0.15',
        'data-mask-level': 'moderate',
        'data-max-duration': '300000'
      }
    }
  ];
  function getConsent(){
    try { return localStorage.getItem(CONSENT_KEY) || ''; } catch(e) { return ''; }
  }
  function setConsent(value){
    try { localStorage.setItem(CONSENT_KEY, value); } catch(e) {}
  }
  function visitorId(){
    try {
      var existing = localStorage.getItem(VISITOR_KEY);
      if (existing) return existing;
      var id = 'pmv-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
      localStorage.setItem(VISITOR_KEY, id);
      return id;
    } catch(e) {
      return 'pmv-session-' + Math.random().toString(36).slice(2, 10);
    }
  }
  function loadScript(config){
    if (document.getElementById(config.id)) return;

    var script = document.createElement('script');
    script.id = config.id;
    script.src = config.src;
    script.defer = true;
    script.async = false;

    Object.keys(config.attrs || {}).forEach(function(key){
      script.setAttribute(key, config.attrs[key]);
    });

    document.head.appendChild(script);
  }

  function loadUmami(){
    if (getConsent() !== 'accepted') return;
    if (window.PM_UMAMI_LOADED) return;

    window.PM_UMAMI_LOADED = true;
    UMAMI_SCRIPTS.forEach(loadScript);
  }
  function track(){
    if (getConsent() !== 'accepted') return;
    loadUmami();
    try {
      fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        body: JSON.stringify({
          consent: 'accepted',
          visitorId: visitorId(),
          page: location.pathname + location.search,
          title: document.title,
          referrer: document.referrer || ''
        })
      }).catch(function(){});
    } catch(e) {}
  }
  function hideBanner(){
    var el = document.getElementById('pmCookieBanner');
    if (el) el.remove();
  }
  function showBanner(){
    if (getConsent() || document.getElementById('pmCookieBanner')) return;
    var el = document.createElement('div');
    el.id = 'pmCookieBanner';
    el.style.cssText = 'position:fixed;left:16px;right:16px;bottom:16px;z-index:99999;max-width:760px;margin:auto;background:#0f172a;color:#fff;border:1px solid rgba(255,255,255,.15);border-radius:14px;padding:14px;box-shadow:0 18px 45px rgba(15,23,42,.35);font-family:system-ui,-apple-system,Segoe UI,sans-serif';
    el.innerHTML = '<div style="font-weight:800;margin-bottom:6px">🍪 Ziyaretçi analitiği</div>' +
      '<div style="font-size:.82rem;line-height:1.45;color:#dbeafe;margin-bottom:12px">Siteyi geliştirmek için, kabul edersen anonim ziyaretçi ID, sayfa, giriş saati, referrer, tarayıcı ve yaklaşık konum bilgisi kaydedilir. Reddedersen takip yapılmaz.</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">' +
      '<button type="button" id="pmCookieReject" style="border:1px solid #475569;background:transparent;color:#fff;border-radius:9px;padding:8px 12px;font-weight:800;cursor:pointer">Reddet</button>' +
      '<button type="button" id="pmCookieAccept" style="border:0;background:#3b82f6;color:#fff;border-radius:9px;padding:8px 12px;font-weight:800;cursor:pointer">Kabul et</button>' +
      '</div>';
    document.body.appendChild(el);
    document.getElementById('pmCookieAccept').onclick = function(){ setConsent('accepted'); hideBanner(); track(); };
    document.getElementById('pmCookieReject').onclick = function(){ setConsent('rejected'); hideBanner(); };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function(){ showBanner(); track(); });
  } else {
    showBanner(); track();
  }
})();
