"""
TCMB EVDS — Endpoint Bulucu
Farklı URL formatlarını deneyerek çalışan endpoint'i bulur.

    python collectors/debug_tcmb.py
"""

import requests
import sys
from pathlib import Path
from urllib.parse import urlencode

sys.path.insert(0, str(Path(__file__).resolve().parent))
from config import EVDS_API_KEY

SERIES = "TP.FG.J0"
START = "01-01-2025"
END = "01-04-2026"

params_dict = {
    "series": SERIES,
    "startDate": START,
    "endDate": END,
    "type": "json",
}

# Denenecek URL formatları
TESTS = [
    # 1) evds2 — path style (eski format)
    {
        "name": "evds2 path-style, key=header",
        "url": f"https://evds2.tcmb.gov.tr/service/evds/{urlencode(params_dict)}",
        "headers": {"key": EVDS_API_KEY},
    },
    # 2) evds2 — query string
    {
        "name": "evds2 query-string, key=header",
        "url": f"https://evds2.tcmb.gov.tr/service/evds?{urlencode(params_dict)}",
        "headers": {"key": EVDS_API_KEY},
    },
    # 3) evds2 — key in params (eski usul)
    {
        "name": "evds2 query-string, key=param",
        "url": f"https://evds2.tcmb.gov.tr/service/evds?{urlencode({**params_dict, 'key': EVDS_API_KEY})}",
        "headers": {},
    },
    # 4) evds3 — path style
    {
        "name": "evds3 path-style, key=header",
        "url": f"https://evds3.tcmb.gov.tr/service/evds/{urlencode(params_dict)}",
        "headers": {"key": EVDS_API_KEY},
    },
    # 5) evds3 — query string
    {
        "name": "evds3 query-string, key=header",
        "url": f"https://evds3.tcmb.gov.tr/service/evds?{urlencode(params_dict)}",
        "headers": {"key": EVDS_API_KEY},
    },
    # 6) evds2 — allow_redirects=False ile gerçek redirect URL'sini gör
    {
        "name": "evds2 NO-REDIRECT (redirect URL bul)",
        "url": f"https://evds2.tcmb.gov.tr/service/evds/{urlencode(params_dict)}",
        "headers": {"key": EVDS_API_KEY},
        "no_redirect": True,
    },
    # 7) evds2 path-style with / separator instead of ?
    {
        "name": "evds2 slash-path series=...&",
        "url": f"https://evds2.tcmb.gov.tr/service/evds/series={SERIES}&startDate={START}&endDate={END}&type=json",
        "headers": {"key": EVDS_API_KEY},
    },
]

print("=" * 60)
print(f"🔍 TCMB EVDS Endpoint Test")
print(f"   API Key: ***{EVDS_API_KEY[-4:]}")
print(f"   Seri: {SERIES}")
print("=" * 60)

for t in TESTS:
    print(f"\n🧪 {t['name']}")
    print(f"   URL: {t['url'][:120]}...")

    try:
        kwargs = {
            "headers": t.get("headers", {}),
            "timeout": 15,
        }
        if t.get("no_redirect"):
            kwargs["allow_redirects"] = False

        resp = requests.get(t["url"], **kwargs)

        print(f"   Status: {resp.status_code}")
        ct = resp.headers.get("content-type", "bilinmiyor")
        print(f"   Content-Type: {ct}")

        if resp.status_code in (301, 302, 303, 307, 308):
            print(f"   🔀 Redirect → {resp.headers.get('Location', 'yok')}")

        if "json" in ct.lower():
            data = resp.json()
            items = data.get("items", [])
            print(f"   ✅ JSON yanıt! {len(items)} kayıt")
            if items:
                print(f"   İlk kayıt: {items[0]}")
        elif "html" in ct.lower():
            print(f"   ❌ HTML yanıt: {resp.text[:150]}...")
        else:
            print(f"   Body: {resp.text[:200]}...")

    except Exception as e:
        print(f"   ❌ Hata: {e}")

print("\n" + "=" * 60)
print("Sonucu bana gönder!")