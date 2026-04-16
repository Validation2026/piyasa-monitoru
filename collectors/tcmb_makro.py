"""
Türkiye Makro Collector — TCMB EVDS + TÜİK + BDDK

Otomatik: TCMB EVDS v2 API'den veri çeker (aylık frekans).
Gerekli env var: TCMB_EVDS_KEY  (https://evds2.tcmb.gov.tr/index.php?/evds/login)

Env var YOKSA: realistic seed data ile minimal 24-aylık seri üretir
(sayfa boş görünmesin diye).

Kullanım:
    python collectors/tcmb_makro.py
"""

import json
import os
import random
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlencode

import requests

sys.path.insert(0, str(Path(__file__).resolve().parent))
from config import DATA_DIR

EVDS_KEY = (os.environ.get("TCMB_EVDS_KEY") or os.environ.get("TCMB_API_KEY") or "").strip()
EVDS_BASE = "https://evds2.tcmb.gov.tr/service/evds/"

# Kategori kodları
CAT_TCMB = "tcmb"   # Para politikası & döviz
CAT_TUIK = "tuik"   # Reel ekonomi & enflasyon
CAT_HAZINE = "hazine"  # Kamu maliyesi
CAT_BDDK = "bddk"   # Bankacılık

# ══════════════════════════════════════════════════════════════
# Seri kodları (TCMB EVDS)
# Notlar:
#   - Frekans: aylık (5) / günlük (1) / çeyreklik (3)
#   - Formül: son değer (0)
# ══════════════════════════════════════════════════════════════
SERIES = {
    # TCMB — Para Politikası & Döviz
    "TP.FG.J0":          {"name": "TÜFE (Yıllık %)",            "unit": "%",       "cat": CAT_TUIK,   "freq": 5,  "formul": 0},
    "TP.FG.J2":          {"name": "Yİ-ÜFE (Yıllık %)",          "unit": "%",       "cat": CAT_TUIK,   "freq": 5,  "formul": 0},
    "TP.DK.USD.A.YTL":   {"name": "USD/TRY (TCMB Alış)",        "unit": "TRY",     "cat": CAT_TCMB,   "freq": 1,  "formul": 0},
    "TP.DK.EUR.A.YTL":   {"name": "EUR/TRY (TCMB Alış)",        "unit": "TRY",     "cat": CAT_TCMB,   "freq": 1,  "formul": 0},
    "TP.DK.GBP.A.YTL":   {"name": "GBP/TRY (TCMB Alış)",        "unit": "TRY",     "cat": CAT_TCMB,   "freq": 1,  "formul": 0},
    "TP.APIFON4":        {"name": "TCMB Politika Faizi",        "unit": "%",       "cat": CAT_TCMB,   "freq": 1,  "formul": 0},
    "TP.AB.B1.A":        {"name": "Brüt Uluslararası Rezerv",   "unit": "Mn USD",  "cat": CAT_TCMB,   "freq": 5,  "formul": 0},
    "TP.PR.M2YTL":       {"name": "M2 Para Arzı",               "unit": "Mn TL",   "cat": CAT_TCMB,   "freq": 5,  "formul": 0},
    "TP.ODEMGZS.BDTGE":  {"name": "Cari Denge",                 "unit": "Mn USD",  "cat": CAT_TCMB,   "freq": 5,  "formul": 0},

    # TÜİK — Reel Ekonomi
    "TP.TIG08":          {"name": "İşsizlik Oranı (TÜİK)",       "unit": "%",       "cat": CAT_TUIK,   "freq": 5,  "formul": 0},
    "TP.KKO.G1":         {"name": "Kapasite Kullanım Oranı",    "unit": "%",       "cat": CAT_TUIK,   "freq": 5,  "formul": 0},
    "TP.TG2.Y01":        {"name": "Tüketici Güven Endeksi",     "unit": "Puan",    "cat": CAT_TUIK,   "freq": 5,  "formul": 0},
    "TP.RSKS.G1":        {"name": "Reel Sektör Güven Endeksi",  "unit": "Puan",    "cat": CAT_TUIK,   "freq": 5,  "formul": 0},
    "TP.SANURA.S1":      {"name": "Sanayi Üretim Endeksi",      "unit": "Endeks",  "cat": CAT_TUIK,   "freq": 5,  "formul": 0},
    "TP.PRGOS.G1":       {"name": "Perakende Satış Endeksi",    "unit": "Endeks",  "cat": CAT_TUIK,   "freq": 5,  "formul": 0},

    # Hazine — Kamu Maliyesi
    "TP.BUTCEA.Y18":     {"name": "Merkezi Bütçe Dengesi",      "unit": "Mn TL",   "cat": CAT_HAZINE, "freq": 5,  "formul": 0},
    "TP.BUTCEA.Y19":     {"name": "Faiz Dışı Denge",            "unit": "Mn TL",   "cat": CAT_HAZINE, "freq": 5,  "formul": 0},
    "TP.KTF10":          {"name": "İç Borç Stoku",              "unit": "Mn TL",   "cat": CAT_HAZINE, "freq": 5,  "formul": 0},
    "TP.KTF11":          {"name": "Dış Borç Stoku",             "unit": "Mn USD",  "cat": CAT_HAZINE, "freq": 5,  "formul": 0},

    # BDDK — Bankacılık
    "TP.BANKA.A01":      {"name": "Sektör Toplam Aktif",        "unit": "Mn TL",   "cat": CAT_BDDK,   "freq": 5,  "formul": 0},
    "TP.BANKA.K01":      {"name": "Toplam Kredi Hacmi",         "unit": "Mn TL",   "cat": CAT_BDDK,   "freq": 5,  "formul": 0},
    "TP.BANKA.M01":      {"name": "Toplam Mevduat",             "unit": "Mn TL",   "cat": CAT_BDDK,   "freq": 5,  "formul": 0},
    "TP.BANKA.T01":      {"name": "Takipteki Krediler (NPL)",   "unit": "%",       "cat": CAT_BDDK,   "freq": 5,  "formul": 0},
    "TP.BANKA.S01":      {"name": "Sermaye Yeterlilik Oranı",   "unit": "%",       "cat": CAT_BDDK,   "freq": 5,  "formul": 0},
}

# ══════════════════════════════════════════════════════════════
# Seed (API yoksa / başarısız olursa) — Nisan 2026 gerçek verilerle kalibre
# Kaynaklar: TÜİK, TCMB, BDDK, Hazine (Mart-Nisan 2026 açıklamaları)
# prev24 = Nisan 2024 civarı gerçek veriler
# ══════════════════════════════════════════════════════════════
SEED = {
    # TÜİK — Mart 2026: TÜFE yıllık %30.87, Yİ-ÜFE yıllık %28.08
    "TP.FG.J0":         {"cur": 30.87,      "prev24": 69.80},   # TÜFE yıllık (Nis 2024: ~%69.8)
    "TP.FG.J2":         {"cur": 28.08,      "prev24": 55.70},   # Yİ-ÜFE yıllık (Nis 2024: ~%55.7)
    # TCMB — Nisan 2026 kur ve faiz
    "TP.DK.USD.A.YTL":  {"cur": 44.75,      "prev24": 32.40},   # USD/TRY 15 Nisan 2026
    "TP.DK.EUR.A.YTL":  {"cur": 52.86,      "prev24": 34.80},   # EUR/TRY 15 Nisan 2026
    "TP.DK.GBP.A.YTL":  {"cur": 60.39,      "prev24": 40.50},   # GBP/TRY 15 Nisan 2026
    "TP.APIFON4":       {"cur": 37.0,       "prev24": 50.0},    # Politika faizi %37 (Nis 2024: %50)
    "TP.AB.B1.A":       {"cur": 161600,     "prev24": 128000},  # Brüt rezerv 161.6 milyar USD (9 Nis 2026)
    "TP.PR.M2YTL":      {"cur": 25686000,   "prev24": 15800000},# M2 para arzı Şubat 2026: 25.69 trilyon TL
    "TP.ODEMGZS.BDTGE": {"cur": -7500,      "prev24": -5220},   # Cari denge Şubat 2026: -7.5 milyar USD
    # TÜİK — İstihdam ve güven
    "TP.TIG08":         {"cur": 8.5,        "prev24": 8.7},     # İşsizlik Şubat 2026: %8.5
    "TP.KKO.G1":        {"cur": 73.3,       "prev24": 76.1},    # KKO Mart 2026: %73.3
    "TP.TG2.Y01":       {"cur": 85.0,       "prev24": 79.6},    # Tüketici güven Mart 2026: 85.0
    "TP.RSKS.G1":       {"cur": 103.0,      "prev24": 102.5},   # Reel sektör güven ~103
    "TP.SANURA.S1":     {"cur": 139.5,      "prev24": 131.2},   # Sanayi üretim (Şubat 2026 yıllık %2.2 artış)
    "TP.PRGOS.G1":      {"cur": 165.0,      "prev24": 142.0},   # Perakende satış (Şubat 2026 yıllık %15.6 artış)
    # Hazine — Kamu maliyesi
    "TP.BUTCEA.Y18":    {"cur": -285000,    "prev24": -180000},  # Bütçe dengesi ~-285 milyar TL
    "TP.BUTCEA.Y19":    {"cur": -42000,     "prev24": -28000},   # Faiz dışı denge ~-42 milyar TL
    "TP.KTF10":         {"cur": 10200000,   "prev24": 5200000},  # İç borç ~10.2 trilyon TL (Q1 2026 borçlanma ile)
    "TP.KTF11":         {"cur": 565000,     "prev24": 476000},   # Dış borç ~565 milyar USD
    # BDDK — Bankacılık (Şubat 2026 aylık bülten)
    "TP.BANKA.A01":     {"cur": 48870000,   "prev24": 25200000}, # Toplam aktif 48.87 trilyon TL
    "TP.BANKA.K01":     {"cur": 23646000,   "prev24": 13500000}, # Toplam kredi 23.65 trilyon TL
    "TP.BANKA.M01":     {"cur": 28295000,   "prev24": 15800000}, # Toplam mevduat 28.3 trilyon TL
    "TP.BANKA.T01":     {"cur": 2.57,       "prev24": 1.87},    # NPL Ocak 2026: %2.57
    "TP.BANKA.S01":     {"cur": 17.0,       "prev24": 18.4},    # SYR ~%17 (Ocak 2026)
}


# ══════════════════════════════════════════════════════════════
# EVDS API çağrısı
# ══════════════════════════════════════════════════════════════
def fetch_evds(code: str, start: str, end: str, freq: int = 5) -> list | None:
    """TCMB EVDS'den seri çek. key header'da gider."""
    if not EVDS_KEY:
        return None
    params = {
        "series": code,
        "startDate": start,
        "endDate": end,
        "type": "json",
        "frequency": freq,
    }
    url = EVDS_BASE + urlencode(params)
    try:
        resp = requests.get(url, headers={"key": EVDS_KEY}, timeout=20)
        if resp.status_code != 200:
            return None
        data = resp.json()
        return data.get("items", []) or None
    except Exception:
        return None


def parse_evds(items: list, code: str) -> list:
    """EVDS item'larını [{date, value}] formatına çevir."""
    col = code.replace(".", "_")
    points = []
    for it in items:
        date_raw = (it.get("Tarih") or "").strip()
        val_raw = it.get(col)
        if val_raw in (None, "null", ""):
            continue
        try:
            v = float(val_raw)
        except (TypeError, ValueError):
            continue
        iso = None
        try:
            if len(date_raw) == 10 and date_raw[2] == "-":
                dd, mm, yyyy = date_raw.split("-")
                iso = f"{yyyy}-{mm}-{dd}"
            elif len(date_raw) == 7 and date_raw[2] == "-":
                mm, yyyy = date_raw.split("-")
                iso = f"{yyyy}-{mm}-01"
            elif len(date_raw) == 4:  # YYYY
                iso = f"{date_raw}-12-31"
        except Exception:
            continue
        if iso:
            points.append({"date": iso, "value": round(v, 4)})
    points.sort(key=lambda p: p["date"])
    return points


# ══════════════════════════════════════════════════════════════
# Seed synthetic series (fallback)
# ══════════════════════════════════════════════════════════════
def synth_series(code: str) -> list:
    seed = SEED.get(code, {"cur": 100.0, "prev24": 95.0})
    cur = seed["cur"]
    prev = seed["prev24"]
    rng = random.Random(hash(code) & 0xFFFFFFFF)
    today = datetime.now().replace(day=1)
    points = []
    for i in range(24, -1, -1):
        # Ayı hesapla
        year = today.year
        month = today.month - i
        while month <= 0:
            month += 12
            year -= 1
        t = (24 - i) / 24.0
        val = prev + (cur - prev) * t
        val *= 1 + rng.uniform(-0.02, 0.02)
        points.append({
            "date": f"{year:04d}-{month:02d}-01",
            "value": round(val, 4),
        })
    return points


# ══════════════════════════════════════════════════════════════
# Değişim hesapları
# ══════════════════════════════════════════════════════════════
def calc_changes(points: list) -> dict:
    if len(points) < 2:
        return {}
    cur = points[-1]["value"]

    def pct(old, new):
        if old and old != 0:
            return round(((new - old) / abs(old)) * 100, 2)
        return None

    ch = {}
    ch["1m"] = pct(points[-2]["value"], cur)
    if len(points) >= 4:
        ch["3m"] = pct(points[-4]["value"], cur)
    if len(points) >= 7:
        ch["6m"] = pct(points[-7]["value"], cur)
    if len(points) >= 13:
        ch["1y"] = pct(points[-13]["value"], cur)
    y = str(datetime.now().year)
    ytd = [p for p in points if p["date"].startswith(y)]
    if ytd:
        ch["ytd"] = pct(ytd[0]["value"], cur)
    return ch


# ══════════════════════════════════════════════════════════════
# Main
# ══════════════════════════════════════════════════════════════
def main():
    print("=" * 60)
    print("🇹🇷 Türkiye Makro Collector (TCMB EVDS + Seed)")
    print("=" * 60)
    if EVDS_KEY:
        print(f"   ✅ TCMB_EVDS_KEY bulundu: ***{EVDS_KEY[-4:]}")
    else:
        print("   ⚠️  TCMB_EVDS_KEY yok → seed data kullanılacak.")
        print("      Gerçek veri için: https://evds2.tcmb.gov.tr/ → giriş → API anahtarı")
        print("      Sonra: export TCMB_EVDS_KEY='xxxx'")

    today = datetime.now()
    start_d = (today - timedelta(days=800)).strftime("%d-%m-%Y")
    end_d = today.strftime("%d-%m-%Y")

    series_list = []
    errors = []

    for code, meta in SERIES.items():
        points = None
        source = None

        if EVDS_KEY:
            items = fetch_evds(code, start_d, end_d, freq=meta.get("freq", 5))
            if items:
                parsed = parse_evds(items, code)
                if len(parsed) >= 2:
                    points = parsed
                    source = "TCMB EVDS"
            time.sleep(0.25)

        if not points:
            points = synth_series(code)
            source = "Seed"
            errors.append(code)

        current = points[-1]["value"]
        values = [p["value"] for p in points]
        ch = calc_changes(points)

        series_list.append({
            "id": code,
            "name": meta["name"],
            "unit": meta["unit"],
            "category": meta["cat"],
            "current": current,
            "change_1d_pct": None,
            "change_1w_pct": None,
            "change_1m_pct": ch.get("1m"),
            "change_3m_pct": ch.get("3m"),
            "change_6m_pct": ch.get("6m"),
            "change_ytd_pct": ch.get("ytd"),
            "change_1y_pct": ch.get("1y"),
            "high_52w": round(max(values), 4),
            "low_52w": round(min(values), 4),
            "data": points,
            "source": source,
        })

        icon = "✅" if source == "TCMB EVDS" else "🟡"
        print(f"   {icon} [{meta['cat']:6s}] {meta['name']}: {current} {meta['unit']}")

    now_utc = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    result = {
        "meta": {
            "source": "TCMB EVDS" + (" (+ Seed fallback)" if errors else ""),
            "category": "Türkiye Makro",
            "updated_at": now_utc,
            "symbol_count": len(series_list),
            "errors": errors,
            "has_live_key": bool(EVDS_KEY),
        },
        "series": series_list,
    }

    # data/turkiye_makro.json
    out = DATA_DIR / "turkiye_makro.json"
    with open(out, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    # site/data mirror
    site_out = DATA_DIR.parent / "site" / "data" / "turkiye_makro.json"
    site_out.parent.mkdir(parents=True, exist_ok=True)
    with open(site_out, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print("-" * 60)
    print(f"💾 {out}")
    print(f"💾 {site_out}")
    print(f"✅ Toplam {len(series_list)} seri kaydedildi ({len(series_list)-len(errors)} canlı, {len(errors)} seed)")


if __name__ == "__main__":
    main()
