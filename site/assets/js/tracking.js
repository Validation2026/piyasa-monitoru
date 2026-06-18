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

  function safeNavigatorValue(key){
    try { return navigator && navigator[key] ? String(navigator[key]) : ''; } catch(e) { return ''; }
  }
  function deviceType(){
    var ua = safeNavigatorValue('userAgent').toLowerCase();
    var platform = safeNavigatorValue('platform').toLowerCase();
    var maxTouchPoints = 0;
    try { maxTouchPoints = navigator.maxTouchPoints || 0; } catch(e) {}

    if (/ipad|tablet|kindle|silk|playbook/.test(ua) || (platform === 'macintel' && maxTouchPoints > 1)) return 'Tablet';
    if (/mobi|android|iphone|ipod|blackberry|iemobile|opera mini/.test(ua)) return 'Mobil';
    return 'Masaüstü';
  }
  function browserPlatform(){
    try {
      if (navigator.userAgentData && navigator.userAgentData.platform) return String(navigator.userAgentData.platform);
    } catch(e) {}
    return safeNavigatorValue('platform') || 'Bilinmiyor';
  }
  function screenSize(){
    try {
      if (!window.screen) return '';
      return [window.screen.width, window.screen.height].filter(Boolean).join('x');
    } catch(e) { return ''; }
  }
  function viewportSize(){
    try { return [window.innerWidth, window.innerHeight].filter(Boolean).join('x'); } catch(e) { return ''; }
  }
  function timezoneName(){
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch(e) { return ''; }
  }
  function connectionType(){
    try {
      var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      return conn && (conn.effectiveType || conn.type) ? String(conn.effectiveType || conn.type) : '';
    } catch(e) { return ''; }
  }
  function deviceInfo(){
    return {
      deviceType: deviceType(),
      platform: browserPlatform(),
      language: safeNavigatorValue('language'),
      screen: screenSize(),
      viewport: viewportSize(),
      timezone: timezoneName(),
      touch: (function(){ try { return !!(('ontouchstart' in window) || (navigator.maxTouchPoints > 0)); } catch(e) { return false; } })(),
      cookies: (function(){ try { return !!navigator.cookieEnabled; } catch(e) { return false; } })(),
      connection: connectionType()
    };
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
          referrer: document.referrer || '',
          device: deviceInfo()
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
