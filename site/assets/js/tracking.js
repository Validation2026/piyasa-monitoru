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
  function removeLegacyBanner(){
    var el = document.getElementById('pmCookieBanner');
    if (el) el.remove();
  }


  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function(){ removeLegacyBanner(); track(); });
  } else {
    removeLegacyBanner(); track();
  }
})();
