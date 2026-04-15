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
# Seed (API yoksa / başarısız olursa) — Nisan 2026 civarı realistik
# ══════════════════════════════════════════════════════════════
SEED = {
    "TP.FG.J0":         {"cur": 35.4,      "prev24": 64.8},
    "TP.FG.J2":         {"cur": 30.2,      "prev24": 58.1},
    "TP.DK.USD.A.YTL":  {"cur": 42.15,     "prev24": 27.40},
    "TP.DK.EUR.A.YTL":  {"cur": 45.60,     "prev24": 29.90},
    "TP.DK.GBP.A.YTL":  {"cur": 53.80,     "prev24": 34.80},
    "TP.APIFON4":       {"cur": 45.0,      "prev24": 25.0},
    "TP.AB.B1.A":       {"cur": 162000,    "prev24": 112000},
    "TP.PR.M2YTL":      {"cur": 21500000,  "prev24": 12800000},
    "TP.ODEMGZS.BDTGE": {"cur": -1200,     "prev24": -5800},
    "TP.TIG08":         {"cur": 8.5,       "prev24": 9.6},
    "TP.KKO.G1":        {"cur": 75.8,      "prev24": 76.3},
    "TP.TG2.Y01":       {"cur": 82.5,      "prev24": 79.5},
    "TP.RSKS.G1":       {"cur": 104.3,     "prev24": 101.2},
    "TP.SANURA.S1":     {"cur": 136.5,     "prev24": 128.0},
    "TP.PRGOS.G1":      {"cur": 158.2,     "prev24": 138.0},
    "TP.BUTCEA.Y18":    {"cur": -285000,   "prev24": -180000},
    "TP.BUTCEA.Y19":    {"cur": -42000,    "prev24": -28000},
    "TP.KTF10":         {"cur": 8950000,   "prev24": 4500000},
    "TP.KTF11":         {"cur": 520000,    "prev24": 470000},
    "TP.BANKA.A01":     {"cur": 32500000,  "prev24": 19800000},
    "TP.BANKA.K01":     {"cur": 18200000,  "prev24": 11500000},
    "TP.BANKA.M01":     {"cur": 21800000,  "prev24": 13600000},
    "TP.BANKA.T01":     {"cur": 1.85,      "prev24": 1.62},
    "TP.BANKA.S01":     {"cur": 17.4,      "prev24": 18.1},
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
