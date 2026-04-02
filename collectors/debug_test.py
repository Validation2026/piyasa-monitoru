"""
Debug Test — Yahoo Finance ve TCMB EVDS API'lerinin gerçek yanıtlarını gösterir.
Hataları teşhis etmek için çalıştır:
    python collectors/debug_test.py
"""

import requests
import sys

print("=" * 60)
print("🔍 API DEBUG TEST")
print("=" * 60)

# ── Test 1: Yahoo Finance Chart API ──
print("\n📊 TEST 1: Yahoo Finance Chart API")
print("-" * 40)

url = "https://query1.finance.yahoo.com/v8/finance/chart/AAPL"
headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
params = {"range": "5d", "interval": "1d"}

try:
    resp = requests.get(url, headers=headers, params=params, timeout=15)
    print(f"   Status: {resp.status_code}")
    print(f"   Headers: {dict(resp.headers)[:200] if resp.headers else 'yok'}...")
    print(f"   Body (ilk 500 char): {resp.text[:500]}")
except Exception as e:
    print(f"   ❌ Hata: {e}")

# ── Test 1b: Yahoo v8 alternatif URL ──
print("\n📊 TEST 1b: Yahoo Finance alternatif URL")
print("-" * 40)

url2 = "https://query2.finance.yahoo.com/v8/finance/chart/AAPL"
try:
    resp = requests.get(url2, headers=headers, params=params, timeout=15)
    print(f"   Status: {resp.status_code}")
    print(f"   Body (ilk 500 char): {resp.text[:500]}")
except Exception as e:
    print(f"   ❌ Hata: {e}")

# ── Test 2: yfinance kütüphanesi ──
print("\n📊 TEST 2: yfinance kütüphanesi")
print("-" * 40)

try:
    import yfinance as yf

    print(f"   yfinance version: {yf.__version__}")

    data = yf.download("AAPL", period="5d", progress=False)
    print(f"   DataFrame shape: {data.shape}")
    print(f"   Columns: {list(data.columns)}")
    if not data.empty:
        print(f"   Son satır:\n{data.tail(1)}")
    else:
        print("   ⚠️ DataFrame boş!")
except ImportError:
    print("   yfinance yüklü değil")
except Exception as e:
    print(f"   ❌ Hata: {e}")

# ── Test 3: TCMB EVDS API ──
print("\n🏦 TEST 3: TCMB EVDS API")
print("-" * 40)

# Config'den API key'i al
sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parent))
try:
    from config import EVDS_API_KEY

    masked = "***" + EVDS_API_KEY[-4:] if len(EVDS_API_KEY) > 4 else EVDS_API_KEY
    print(f"   API Key: {masked}")
except:
    EVDS_API_KEY = "YOK"
    print("   ⚠️ config.py'den API key alınamadı")

evds_url = "https://evds2.tcmb.gov.tr/service/evds"
params_evds = {
    "series": "TP.FG.J0",
    "startDate": "01-01-2025",
    "endDate": "01-04-2026",
    "type": "json",
    "key": EVDS_API_KEY,
}

try:
    resp = requests.get(evds_url, params=params_evds, timeout=30)
    print(f"   Status: {resp.status_code}")
    print(f"   URL: {resp.url}")
    print(f"   Body (ilk 500 char): {resp.text[:500]}")
except Exception as e:
    print(f"   ❌ Hata: {e}")

# ── Test 3b: TCMB EVDS — SSL verify=False denemesi ──
print("\n🏦 TEST 3b: TCMB EVDS (SSL verify=False)")
print("-" * 40)

try:
    import urllib3

    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    resp = requests.get(evds_url, params=params_evds, timeout=30, verify=False)
    print(f"   Status: {resp.status_code}")
    print(f"   Body (ilk 500 char): {resp.text[:500]}")
except Exception as e:
    print(f"   ❌ Hata: {e}")

print("\n" + "=" * 60)
print("✅ Debug test tamamlandı!")
print("Lütfen bu çıktıyı bana gönder.")