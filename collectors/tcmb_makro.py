"""
Türkiye Makro Collector — TCMB EVDS + TÜİK + BDDK

Otomatik: TCMB EVDS v2 API'den veri çeker (aylık frekans).
Gerekli env var: TCMB_EVDS_KEY  (https://evds2.tcmb.gov.tr/index.php?/evds/login)

EVDS bağlantısı başarısızsa sentetik veri üretmez; yalnızca kaynaklı gözlem saklar.
EVDS3 öncelikli, EVDS2 geriye dönük denemedir.

Kullanım:
    python collectors/tcmb_makro.py
"""

import json
import os
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlencode

import requests

sys.path.insert(0, str(Path(__file__).resolve().parent))
from config import DATA_DIR

EVDS_KEY = (os.environ.get("TCMB_EVDS_KEY") or os.environ.get("TCMB_API_KEY") or "").strip()
EVDS3_BASE = "https://evds3.tcmb.gov.tr/igmevdsms-dis/"
EVDS2_BASE = "https://evds2.tcmb.gov.tr/service/evds/"

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
    "TP.FG.J0":          {"name": "TÜFE (Yıllık %)",            "unit": "%",       "cat": CAT_TUIK,   "freq": 5,  "api_code": "TP.TUKFIY2025.GENEL", "transform": "yoy_index"},
    "TP.FG.J2":          {"name": "Yİ-ÜFE (Yıllık %)",          "unit": "%",       "cat": CAT_TUIK,   "freq": 5,  "api_code": "TP.TUFE1YI.T1", "transform": "yoy_index"},
    "TP.DK.USD.A.YTL":   {"name": "USD/TRY (TCMB Alış)",        "unit": "TRY",     "cat": CAT_TCMB,   "freq": 1,  "formul": 0},
    "TP.DK.EUR.A.YTL":   {"name": "EUR/TRY (TCMB Alış)",        "unit": "TRY",     "cat": CAT_TCMB,   "freq": 1,  "formul": 0},
    "TP.DK.GBP.A.YTL":   {"name": "GBP/TRY (TCMB Alış)",        "unit": "TRY",     "cat": CAT_TCMB,   "freq": 1,  "formul": 0},
    "TCMB.PPK.POLICY":   {"name": "TCMB Politika Faizi",        "unit": "%",       "cat": CAT_TCMB,   "freq": 1,  "api_code": None},
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
    "TP.BANKA.T01":      {"name": "Takipteki Krediler (NPL)",   "unit": "%",       "cat# AOFM (TP.APIFON4), politika faizinden farklıdır; bu nedenle politika
# faizini o EVDS serisinden okumuyoruz. Yalnızca resmî PPK kararını kullanıyoruz.
# Resmî kontrol: 18 Kasım 2026. Yeni karar yayımlanınca kaynaklı kayıt güncellenmeli.
OFFICIAL_SNAPSHOTS = {
    "TP.FG.J0": {
        "date": "2026-10-01", "value": 29.77, "source": "TÜİK (resmî duyuru)",
        "url": "https://veriportali.tuik.gov.tr/tr/press/58291/metadata",
    },
    "TCMB.PPK.POLICY": {
        "date": "2026-10-22", "value": 36.0, "source": "TCMB PPK (resmî duyuru)",
        "url": "https://www.tcmb.gov.tr/wps/wcm/connect/tr/tcmb+tr/main+menu/duyurular/basin/2026/duy2026-45",
    },
}
TRUSTED_SOURCES = {"TCMB EVDS", "TÜİK (resmî duyuru)", "TCMB PPK (resmî duyuru)"}

def fetch_evds(code: str, start: str, end: str, freq: int = 5):
    """Try the currently documented EVDS3 service, then legacy EVDS2.
    The API key is sent only as a header; never logged.
    """
    if not EVDS_KEY:
        return None
    params = {"series": code, "startDate": start, "endDate": end,
              "type": "json", "frequency": freq}
    encoded = urlencode(params)
    urls = [EVDS3_BASE + encoded, EVDS2_BASE + "?" + encoded]
    for url in urls:
        try:
            resp = requests.get(url, headers={"key": EVDS_KEY},
                                timeout=(5, 12))
            if resp.status_code != 200:
                print(f"   EVDS cevap HTTP {resp.status_code}: {code}")
                continue
            payload = resp.json()
            items = payload.get("items") if isinstance(payload, dict) else None
            if isinstance(items, list) and items:
                return items
            print(f"   EVDS boş veri: {code}")
        except (requests.RequestException, ValueError, TypeError) as exc:
            print(f"   EVDS bağlantı/veri hatası ({code}): {type(exc).__name__}")
    return None

def parse_evds(items: list, code: str) -> list:
    """Turn EVDS month/day fields into sorted, unique {date,value} observations."""
    wanted = [code.replace(".", "_"), code]
    points = {}
    for item in items:
        if not isinstance(item, dict):
            continue
        raw_date = str(item.get("Tarih") or item.get("DATE") or "").strip()
        if not raw_date:
            continue
        try:
            if len(raw_date) == 10 and raw_date[2] == "-":
                dd, mm, yyyy = raw_date.split("-")
                date = f"{yyyy}-{mm}-{dd}"
            elif len(raw_date) == 10 and raw_date[4] == "-":
                date = raw_date
            elif len(raw_date) == 7 and raw_date[2] == "-":
                mm, yyyy = raw_date.split("-")
                date = f"{yyyy}-{mm}-01"
            elif len(raw_date) == 7 and raw_date[4] == "-":
                date = raw_date + "-01"
            elif len(raw_date) == 4 and raw_date.isdigit():
                date = raw_date + "-12-31"
            else:
                continue
            datetime.strptime(date, "%Y-%m-%d")
            value = next((item.get(k) for k in wanted if item.get(k) not in (None, "", "null")), None)
            if value is None:
                continue
            number = float(str(value).replace(",", "."))
            if not (-1e15 < number < 1e15):
                continue
            points[date] = {"date": date, "value": round(number, 4)}
        except (ValueError, TypeError):
            continue
    return [points[d] for d in sorted(points)]

def to_annual_inflation(index_points: list) -> list:
    """A level index is NOT annual CPI/PPI inflation: compute matching-month YoY."""
    months = {p["date"][:7]: p["value"] for p in index_points}
    out = []
    for key in sorted(months):
        year, month = map(int, key.split("-"))
        prev = f"{year - 1:04d}-{month:02d}"
        current_value, base = months[key], months.get(prev)
        if base is None or base <= 0 or current_value <= 0:
            continue
        out.append({"date": key + "-01",
                    "value": round((current_value / base - 1) * 100, 4)})
    return out

def valid_existing_trusted(code: str):
    """Reuse only genuine historical values, never legacy synthetic rows."""
    paths = [DATA_DIR / "turkiye_makro.json",
             DATA_DIR.parent / "site" / "data" / "turkiye_makro.json"]
    for p in paths:
        try:
            raw = json.loads(p.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            continue
        for entry in raw.get("series", []):
            if entry.get("id") != code or entry.get("source") not in TRUSTED_SOURCES:
                continue
            if code in {"TP.FG.J0", "TP.FG.J2"} and entry.get("method") != "yoy_index" and entry.get("source") == "TCMB EVDS":
                continue  # legacy index level might be mislabeled as annual inflation
            points = entry.get("data")
            date = entry.get("latest_date")
            if isinstance(points, list) and points and isinstance(date, str) and len(date) == 10:
                try:
                    datetime.strptime(date, "%Y-%m-%d")
                    if all(isinstance(q.get("value"), (int, float)) for q in points):
                        return entry
                except (ValueError, AttributeError, TypeError):
                    pass
    return None

def build_row(code, meta, points, source, status, source_url="", method=""):
    vals = [x["value"] for x in points]
    current = vals[-1] if vals else None
    changes = calc_changes(points) if points else {}
    return {
        "id": code, "name": meta["name"], "unit": meta["unit"],
        "category": meta["cat"], "current": current,
        "change_1d_pct": None, "change_1w_pct": None,
        "change_1m_pct": changes.get("1m"), "change_3m_pct": changes.get("3m"),
        "change_6m_pct": changes.get("6m"), "change_ytd_pct": changes.get("ytd"),
        "change_1y_pct": changes.get("1y"), "high_52w": max(vals) if vals else None,
        "low_52w": min(vals) if vals else None, "data": points,
        "latest_date": points[-1]["date"] if points else None,
        "source": source, "status": status, "source_url": source_url,
        "method": method,
    }

= 1 + rng.uniform(-0.02, 0.02)
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
    print("🇹🇷 Türkiye Makro Collector — EVDS3 + doğrulanmış gözlem; SEED YOK")
    if not EVDS_KEY:
        print("UYARI: TCMB_EVDS_KEY/TCMB_API_KEY yok; doğrulanmış son kayıtlar korunacak.")

    today = datetime.now()
    start_d = (today - timedelta(days=800)).strftime("%d-%m-%Y")
    end_d = today.strftime("%d-%m-%Y")
    rows, errors = [], []
    live_count = reused_count = official_count = 0

    for code, meta in SERIES.items():
        real_points = []
        api_code = meta.get("api_code", code)
        method = meta.get("transform", "")
        if api_code and EVDS_KEY:
            items = fetch_evds(api_code, start_d, end_d, freq=meta.get("freq", 5))
            if items:
                parsed = parse_evds(items, api_code)
                real_points = to_annual_inflation(parsed) if method == "yoy_index" else parsed

        chosen = None
        if len(real_points) >= 1:
            chosen = build_row(code, meta, real_points, "TCMB EVDS", "live",
                               "https://evds3.tcmb.gov.tr/", method)

        snapshot = OFFICIAL_SNAPSHOTS.get(code)
        if snapshot:
            manual = build_row(code, meta,
                [{"date": snapshot["date"], "value": snapshot["value"]}],
                snapshot["source"], "last_verified", snapshot["url"], "official")
            if not chosen or manual["latest_date"] > chosen["latest_date"]:
                chosen = manual

        old = valid_existing_trusted(code)
        if old and (not chosen or old["latest_date"] > chosen["latest_date"]):
            chosen = build_row(code, meta, old["data"], old["source"], "last_verified",
                               old.get("source_url", ""), old.get("method", ""))

        if not chosen:
            chosen = build_row(code, meta, [], "Unavailable", "unavailable")
            errors.append(code)
            print(f"   ❌ {meta['name']}: doğrulanmış veri yok")
        elif chosen["source"] == "TCMB EVDS":
            live_count += 1
            print(f"   ✅ {meta['name']}: {chosen['current']} ({chosen['latest_date']})")
        elif chosen["source"] in {"TÜİK (resmî duyuru)", "TCMB PPK (resmî duyuru)"}:
            official_count += 1
            print(f"   📋 {meta['name']}: {chosen['current']} ({chosen['latest_date']}, resmî son değer)")
        else:
            reused_count += 1
            print(f"   🕓 {meta['name']}: {chosen['current']} ({chosen['latest_date']}, son kayıt)")
        rows.append(chosen)

    now_utc = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    result = {
        "meta": {
            "source": "TCMB EVDS / resmî son gözlem",
            "category": "Türkiye Makro",
            "updated_at": now_utc,
            "symbol_count": len(rows),
            "live_count": live_count,
            "last_verified_count": official_count + reused_count,
            "unavailable_count": len(errors),
            "errors": errors,
            "has_live_key": bool(EVDS_KEY),
            "integrity": "synthetic values prohibited",
        },
        "series": rows,
    }
    for out in [DATA_DIR / "turkiye_makro.json",
                DATA_DIR.parent / "site" / "data" / "turkiye_makro.json"]:
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"💾 {out}")

    print(f"SONUÇ: {live_count} canlı EVDS; {official_count + reused_count} doğrulanmış son gözlem; {len(errors)} boş.")
    if live_count == 0:
        print("HATA: EVDS'den tek bir canlı veri alınamadı; GitHub Actions hata olarak işaretlenmeli.")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
