"""
FRED API Collector — Türkiye Makro Verileri
Federal Reserve Bank of St. Louis - FRED API
Ücretsiz API key: https://fred.stlouisfed.org/docs/api/api_key.html

Kullanım:
    python collectors/fred_macro.py
"""

import json
import sys
import time
from datetime import datetime, timezone, timedelta
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).resolve().parent))
from config import DATA_DIR

# FRED API
FRED_API_KEY = "BURAYA_FRED_KEY_YAZ"  # https://fred.stlouisfed.org/docs/api/api_key.html
FRED_BASE = "https://api.stlouisfed.org/fred/series/observations"

# Türkiye makro serileri
FRED_SERIES = {
    "TURCPIALLMINMEI": {"name": "TÜFE Aylık Değişim (2025=100)", "category": "Enflasyon"},
    "FPCPITOTLZGTUR":  {"name": "Enflasyon Yıllık (%)",          "category": "Enflasyon"},
    "INTDSRTRM193N":   {"name": "Politika Faiz Oranı (%)",       "category": "Faiz"},
    "TURCPALTT01IXOBM":{"name": "Çekirdek Enflasyon (%)",        "category": "Enflasyon"},
    "TURGDPNQDSMEI":   {"name": "GSYİH (Çeyreklik, Milyon TRY)", "category": "Büyüme"},
    "TURPROMANMEI":    {"name": "Sanayi Üretim Endeksi",         "category": "Sanayi"},
    "LRUN64TTTRM156S": {"name": "İşsizlik Oranı (%)",            "category": "İstihdam"},
    "XTEXVA01TRM664S": {"name": "İhracat (Milyon USD)",          "category": "Dış Ticaret"},
    "XTIMVA01TRM664S": {"name": "İthalat (Milyon USD)",          "category": "Dış Ticaret"},
    "CCUSMA02TRM659N": {"name": "Cari İşlemler Dengesi (M. USD)","category": "Dış Ticaret"},
    "MABMM301TRM189S": {"name": "M3 Para Arzı (Milyon TRY)",    "category": "Para"},
    "IRLTLT01TRM156N": {"name": "Uzun Vadeli Faiz (%)",          "category": "Faiz"},
}


def fetch_fred_series(series_id: str, start_date: str = "2020-01-01") -> list:
    """FRED API'den tek bir seri çeker."""

    params = {
        "series_id": series_id,
        "api_key": FRED_API_KEY,
        "file_type": "json",
        "observation_start": start_date,
        "sort_order": "asc",
    }

    try:
        resp = requests.get(FRED_BASE, params=params, timeout=30)
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        print(f"   ❌ {series_id}: {e}")
        return []

    observations = data.get("observations", [])
    if not observations:
        return []

    results = []
    for obs in observations:
        date = obs.get("date", "")
        val = obs.get("value", "")
        if val == "." or val == "" or val is None:
            continue
        try:
            results.append({"date": date, "value": round(float(val), 4)})
        except (ValueError, TypeError):
            continue

    return results


def calculate_changes(data_points: list) -> dict:
    if len(data_points) < 2:
        return {}

    current = data_points[-1]["value"]

    def pct(old, new):
        if old and old != 0:
            return round(((new - old) / abs(old)) * 100, 2)
        return None

    changes = {}
    changes["prev_pct"] = pct(data_points[-2]["value"], current)

    current_year = str(datetime.now().year)
    ytd = [p for p in data_points if p["date"].startswith(current_year)]
    if len(ytd) >= 2:
        changes["ytd_pct"] = pct(ytd[0]["value"], current)

    if len(data_points) >= 13:
        changes["yoy_pct"] = pct(data_points[-13]["value"], current)

    return changes


def main():
    print("🚀 FRED Macro Collector")
    print(f"   API Key: {'***' + FRED_API_KEY[-4:] if len(FRED_API_KEY) > 4 else '⚠️ AYARLANMAMIŞ'}")

    if FRED_API_KEY == "BURAYA_FRED_KEY_YAZ":
        print("   ❌ FRED API key ayarla!")
        print("   Ücretsiz al: https://fred.stlouisfed.org/docs/api/api_key.html")
        sys.exit(1)

    series_list = []
    errors = []

    for code, meta in FRED_SERIES.items():
        print(f"   📡 {meta['name']} ({code})...", end=" ", flush=True)

        data_points = fetch_fred_series(code)

        if not data_points:
            errors.append(code)
            print("❌")
            continue

        current = data_points[-1]["value"]
        changes = calculate_changes(data_points)

        series_list.append({
            "id": code,
            "name": meta["name"],
            "category": meta["category"],
            "current": current,
            "latest_date": data_points[-1]["date"],
            "change_prev_pct": changes.get("prev_pct"),
            "change_ytd_pct": changes.get("ytd_pct"),
            "change_yoy_pct": changes.get("yoy_pct"),
            "data": data_points
        })

        print(f"✅ {current} (son: {data_points[-1]['date']}, {len(data_points)} veri)")
        time.sleep(0.5)

    now_utc = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    result = {
        "meta": {
            "source": "FRED API",
            "category": "Türkiye Makro Verileri",
            "updated_at": now_utc,
            "series_count": len(series_list),
            "errors": errors
        },
        "series": series_list
    }

    output_file = DATA_DIR / "macro_turkey.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(f"\n   💾 macro_turkey.json: {len(series_list)} seri")
    print(f"✅ FRED Collector tamamlandı! ({len(series_list)}/{len(FRED_SERIES)} başarılı)")


if __name__ == "__main__":
    main()
