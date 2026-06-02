"""
Yahoo Finance Collector (v3 — Düzeltilmiş)
query2.finance.yahoo.com API'si + yf.download() fallback.

Kullanım:
    python collectors/yahoo_finance.py
"""

import json
import re
import sys
import time
from datetime import datetime, timezone, timedelta, date
from pathlib import Path

import requests
import pandas as pd

try:
    import yfinance as yf
    HAS_YF = True
except ImportError:
    HAS_YF = False

sys.path.insert(0, str(Path(__file__).resolve().parent))
from config import ALL_YF_GROUPS, DATA_DIR, FOREX_COUNTRY_MAP, tradingview_logo_meta

ROOT_DIR = Path(__file__).resolve().parent.parent
LOGO_DIR = ROOT_DIR / "site" / "assets" / "logos"
SYMBOL_PRICE_SCALE = {
    # Yahoo ZR=F fiyatını cent bazında döndürebildiği için her zaman /100 normalize et.
    "ZR=F": 0.01,
}


def _safe_id(symbol):
    return re.sub(r"[^a-z0-9]+", "-", symbol.lower()).strip("-")


def _local_logo_meta(symbol):
    """Yerel logo dosyası varsa path döner."""
    meta = {}
    sid = _safe_id(symbol)
    local_file = LOGO_DIR / f"{sid}.png"
    if local_file.exists():
        meta["logo_local"] = f"assets/logos/{sid}.png"
    # Forex bayrak çifti
    if symbol.endswith("=X"):
        head = symbol.split("=")[0].upper()
        if len(head) >= 6:
            left, right = head[:3], head[3:6]
            c1 = FOREX_COUNTRY_MAP.get(left, "").lower()
            c2 = FOREX_COUNTRY_MAP.get(right, "").lower()
            pair = []
            if c1 and (LOGO_DIR / f"flag-{c1}.png").exists():
                pair.append(f"assets/logos/flag-{c1}.png")
            if c2 and (LOGO_DIR / f"flag-{c2}.png").exists():
                pair.append(f"assets/logos/flag-{c2}.png")
            if len(pair) == 2:
                meta["logo_pair_local"] = pair
    return meta


def _scale_value(symbol: str, value: float | None) -> float | None:
    """Sembol bazlı fiyat ölçek düzeltmesi uygula."""
    if value is None:
        return None
    factor = SYMBOL_PRICE_SCALE.get(symbol, 1.0)
    return round(float(value) * factor, 4)


def _apply_symbol_scale(symbol: str, points: list[dict]) -> list[dict]:
    """Sembol bazlı ölçek düzeltmesini tarihsel veri noktalarına uygula."""
    factor = SYMBOL_PRICE_SCALE.get(symbol, 1.0)
    if factor == 1.0:
        return points
    scaled = []
    for p in points:
        v = p.get("value")
        if v is None:
            scaled.append(p)
            continue
        scaled.append({
            "date": p["date"],
            "value": round(float(v) * factor, 4),
        })
    return scaled

# ═══════════════════════════════════════════════════════════
#  YÖNTEM 1 (Birincil): Doğrudan Yahoo Chart API — query2
# ═══════════════════════════════════════════════════════════

YAHOO_CHART_URL = "https://query2.finance.yahoo.com/v8/finance/chart/{symbol}"

YAHOO_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
}


def fetch_yahoo_direct(symbol: str, range_str: str = "5y", interval: str = "1d") -> tuple[list, float | None] | None:
    """Yahoo Finance chart API'sinden tarihsel (günlük) veri çeker.

    Dönüş: (points, live_price) — live_price, meta.regularMarketPrice
    alanından gelir. Fakat bu alan bazen kapanış fiyatına takılır;
    daha güncel bir canlı fiyat için fetch_yahoo_intraday_latest() kullanılır.
    """

    # includePrePost=true: vadeli ve 24 saat işlem gören enstrümanlar için kritik
    params = {
        "range": range_str,
        "interval": interval,
        "includePrePost": "true",
        "_": int(time.time() * 1000),  # cache-buster
    }

    try:
        resp = requests.get(
            YAHOO_CHART_URL.format(symbol=symbol),
            headers=YAHOO_HEADERS, params=params, timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()

        result = data.get("chart", {}).get("result", [])
        if not result:
            return None

        chart = result[0]
        timestamps = chart.get("timestamp", [])
        quotes = chart.get("indicators", {}).get("quote", [{}])[0]
        closes = quotes.get("close", [])

        if not timestamps or not closes:
            return None

        points = []
        for ts, val in zip(timestamps, closes):
            if val is not None:
                dt = datetime.fromtimestamp(ts, tz=timezone.utc)
                points.append({
                    "date": dt.strftime("%Y-%m-%d"),
                    "value": round(float(val), 4)
                })

        if not points:
            return None

        meta = chart.get("meta", {}) or {}
        live_raw = meta.get("regularMarketPrice")
        live_price = None
        if live_raw is not None:
            try:
                live_price = round(float(live_raw), 4)
            except (TypeError, ValueError):
                live_price = None

        return points, live_price

    except Exception as e:
        print(f"      Yahoo API hatası ({symbol}): {e}")
        return None


def fetch_yahoo_intraday_latest(symbol: str) -> float | None:
    """En güncel canlı fiyatı 1 dakikalık intraday bar'dan çeker.

    Günlük bar'lar piyasa kapanışına kadar tazelenmediği için,
    chart meta'daki regularMarketPrice bazen saatlerce eski kalıyor.
    1m/5d interval + includePrePost ile Yahoo'nun şu anki en son
    yayınladığı bar'ı alırız — bu gerçek canlı fiyata en yakın veri.
    """
    params = {
        "range": "5d",
        "interval": "1m",
        "includePrePost": "true",
        "_": int(time.time() * 1000),
    }
    try:
        resp = requests.get(
            YAHOO_CHART_URL.format(symbol=symbol),
            headers=YAHOO_HEADERS, params=params, timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()

        result = data.get("chart", {}).get("result", [])
        if not result:
            return None

        chart = result[0]
        meta = chart.get("meta", {}) or {}

        # 1) meta.regularMarketPrice (intraday endpoint'inde genelde taze)
        meta_price = meta.get("regularMarketPrice")
        meta_time = meta.get("regularMarketTime")

        # 2) intraday bar'ların son non-null kapanışı
        timestamps = chart.get("timestamp", []) or []
        closes = chart.get("indicators", {}).get("quote", [{}])[0].get("close", []) or []
        last_bar_price = None
        last_bar_time = None
        for t, c in zip(reversed(timestamps), reversed(closes)):
            if c is not None:
                last_bar_price = c
                last_bar_time = t
                break

        # En taze timestamp hangisiyse onu kullan
        candidates = []
        if meta_price is not None and meta_time is not None:
            candidates.append((int(meta_time), float(meta_price)))
        if last_bar_price is not None and last_bar_time is not None:
            candidates.append((int(last_bar_time), float(last_bar_price)))

        if not candidates:
            return None

        candidates.sort(key=lambda x: x[0], reverse=True)
        return round(candidates[0][1], 4)

    except Exception as e:
        print(f"      Intraday hatası ({symbol}): {e}")
        return None


# ═══════════════════════════════════════════════════════════
#  YÖNTEM 2 (Fallback): yf.download()
# ═══════════════════════════════════════════════════════════

def fetch_yf_download(symbol: str) -> list | None:
    """yfinance ile tek sembol indir."""
    if not HAS_YF:
        return None

    try:
        df = yf.download(symbol, period="5y", interval="1d", progress=False)
        if df.empty:
            return None

        points = []
        for date, row in df.iterrows():
            # yfinance 1.2.0 MultiIndex column olabilir
            try:
                close_val = float(row["Close"].iloc[0]) if isinstance(row["Close"], pd.Series) else float(row["Close"])
            except Exception:
                close_val = float(row["Close"])

            points.append({
                "date": pd.Timestamp(date).strftime("%Y-%m-%d"),
                "value": round(close_val, 4)
            })

        return points if points else None

    except Exception as e:
        print(f"      yf.download hatası ({symbol}): {e}")
        return None


# ═══════════════════════════════════════════════════════════
#  Değişim Hesaplamaları
# ═══════════════════════════════════════════════════════════

def calculate_changes(data_points: list) -> dict:
    """
    Değişim yüzdelerini hesaplar.
    - 1d: son iki nokta
    - 1w/1m/3m/1y: işlem günü-adedi (yaklaşık) bazlı index lookback
      (sırasıyla 5, 22, 66, 200)
    - ytd: sadece veri son noktası cari yıldaysa; baz olarak önceki yıl sonu
      veya yoksa cari yıldaki ilk nokta
    """
    if len(data_points) < 2:
        return {}

    parsed = []
    for p in data_points:
        try:
            dd = datetime.strptime(p["date"], "%Y-%m-%d").date()
        except Exception:
            continue
        if p.get("value") is None:
            continue
        parsed.append((dd, p["value"]))

    if len(parsed) < 2:
        return {}

    parsed.sort(key=lambda x: x[0])
    values = [v for _, v in parsed]
    current = values[-1]
    latest_date = parsed[-1][0]

    def pct(old, new):
        if old and old != 0 and new is not None:
            return round(((new - old) / abs(old)) * 100, 2)
        return None

    changes = {}
    changes["1d"] = pct(values[-2], current)

    # İşlem günü adedi bazlı lookback (test beklentisiyle uyumlu)
    lookbacks = [("1w", 5), ("1m", 22), ("3m", 66), ("1y", 200)]
    n = len(values)
    for key, lb in lookbacks:
        if n > lb:
            changes[key] = pct(values[-(lb + 1)], current)

    # YTD yalnızca veri gerçekten cari yıldaysa hesaplanır
    today_year = datetime.now().year
    if latest_date.year == today_year:
        prev_year_end = date(latest_date.year - 1, 12, 31)
        base = None
        for dd, v in parsed:
            if dd <= prev_year_end:
                base = v
            else:
                break
        if base is None:
            current_year_points = [v for dd, v in parsed if dd.year == latest_date.year]
            if current_year_points:
                base = current_year_points[0]
        if base is not None:
            changes["ytd"] = pct(base, current)

    return changes


def calculate_52w_range(data_points: list) -> dict:
    """Son 52 hafta içindeki en yüksek ve en düşük değeri hesaplar.

    Collector 5 yıllık tarihsel veri tutar; fakat JSON alan adları
    high_52w/low_52w olduğu için aralık yalnızca son 365 günü kapsamalıdır.
    """
    parsed = []
    for p in data_points or []:
        try:
            dd = datetime.strptime(p["date"], "%Y-%m-%d").date()
        except Exception:
            continue
        value = p.get("value")
        if value is None:
            continue
        try:
            parsed.append((dd, float(value)))
        except (TypeError, ValueError):
            continue

    if not parsed:
        return {"high_52w": None, "low_52w": None}

    parsed.sort(key=lambda x: x[0])
    latest_date = parsed[-1][0]
    cutoff = latest_date - timedelta(days=365)
    values_52w = [v for dd, v in parsed if dd >= cutoff]
    if not values_52w:
        values_52w = [parsed[-1][1]]

    return {
        "high_52w": round(max(values_52w), 4),
        "low_52w": round(min(values_52w), 4),
    }

# ═══════════════════════════════════════════════════════════
#  Grup Fetch — Her sembol: önce API, sonra yfinance
# ═══════════════════════════════════════════════════════════

def fetch_group(group: dict) -> dict:
    symbols = list(group["symbols"].keys())
    symbol_meta = group["symbols"]

    print(f"\n{'='*60}")
    print(f"📦 {group['category']} ({len(symbols)} sembol)")

    series_list = []
    errors = []

    for symbol in symbols:
        meta = symbol_meta[symbol]

        # Önce doğrudan API dene
        live_price = None
        direct = fetch_yahoo_direct(symbol)
        if direct is not None:
            points, live_price = direct
            source = "Yahoo API"
        else:
            points = None

        # Başarısızsa yfinance dene
        if points is None:
            points = fetch_yf_download(symbol)
            source = "yfinance"

        if points is None:
            errors.append(symbol)
            print(f"   ❌ {meta['name']} ({symbol}): Veri alınamadı")
            continue

        # Sembol bazlı tarihsel fiyat ölçek düzeltmesi.
        points = _apply_symbol_scale(symbol, points)

        # Canlı fiyatı intraday 1m bar'dan override et — günlük endpoint
        # meta'sı bazen saatlerce eski kalıyor, intraday her zaman daha taze.
        intraday_price = fetch_yahoo_intraday_latest(symbol)
        if intraday_price is not None:
            live_price = intraday_price
            source = f"{source} + 1m"

        # Sembol bazlı canlı fiyat ölçek düzeltmesi.
        live_price = _scale_value(symbol, live_price)

        # Birim/ölçek tutarsızlığı koruması: Yahoo bazı future'ları (ör. ZR=F)
        # tarihsel veride USc/cwt, intraday'da USD/cwt gibi farklı ölçeklerde
        # döndürebiliyor. Canlı fiyat son kapanıştan 5x'ten fazla sapıyorsa
        # sessizce elenir; tarihsel veri ile devam edilir.
        if live_price is not None and points:
            ref = points[-1].get("value")
            if ref and ref != 0:
                ratio = live_price / ref
                if ratio > 5 or ratio < 0.2:
                    print(f"   ⚠️ {symbol}: canlı fiyat birim uyumsuz "
                          f"(live={live_price} vs son kapanış={ref}); elenir")
                    live_price = None
                    source = source.replace(" + 1m", "")

        # Piyasa açıkken regularMarketPrice son günlük kapanışı geçebilir.
        # Değişim hesapları için canlı fiyatı bugünün bar'ı gibi ekliyoruz;
        # tarihsel veri ("data" alanı) yine sadece kapanış noktalarını içerir.
        if live_price is not None:
            current = live_price
            today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            synthetic_today = {"date": today_str, "value": live_price}
            if points[-1]["date"] == today_str:
                points_for_calc = points[:-1] + [synthetic_today]
            else:
                points_for_calc = points + [synthetic_today]
        else:
            current = points[-1]["value"]
            points_for_calc = points

        changes = calculate_changes(points_for_calc)
        range_52w = calculate_52w_range(points)
        logo_meta = tradingview_logo_meta(symbol, meta)
        local_meta = _local_logo_meta(symbol)

        entry = {
            "id": symbol,
            "name": meta["name"],
            "unit": meta["unit"],
            "logo_url": logo_meta.get("logo_url"),
            "logo_pair": logo_meta.get("logo_pair", []),
            "logo_candidates": logo_meta.get("logo_candidates", []),
            "current": current,
            "change_1d_pct": changes.get("1d"),
            "change_1w_pct": changes.get("1w"),
            "change_1m_pct": changes.get("1m"),
            "change_3m_pct": changes.get("3m"),
            "change_ytd_pct": changes.get("ytd"),
            "change_1y_pct": changes.get("1y"),
            "high_52w": range_52w["high_52w"],
            "low_52w": range_52w["low_52w"],
            "data": points
        }
        # Yerel logo varsa ekle
        if local_meta.get("logo_local"):
            entry["logo_local"] = local_meta["logo_local"]
        if local_meta.get("logo_pair_local"):
            entry["logo_pair_local"] = local_meta["logo_pair_local"]

        series_list.append(entry)

        print(f"   ✅ {meta['name']}: {current} {meta['unit']} ({source})")
        time.sleep(0.3)

    now_utc = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    return {
        "meta": {
            "source": "Yahoo Finance",
            "category": group["category"],
            "updated_at": now_utc,
            "symbol_count": len(series_list),
            "errors": errors
        },
        "series": series_list
    }


# ═══════════════════════════════════════════════════════════
#  Activities
# ═══════════════════════════════════════════════════════════

def update_activities():
    activities_file = DATA_DIR / "activities.json"
    activities = []
    if activities_file.exists():
        try:
            with open(activities_file, "r", encoding="utf-8") as f:
                activities = json.load(f).get("activities", [])
        except Exception:
            pass

    now_utc = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    activities.insert(0, {
        "type": "data",
        "source_key": "yahoo_finance",
        "title": "Yahoo Finance",
        "text": "emtia, kur ve endeks verileri güncellendi",
        "timestamp": now_utc
    })
    activities = activities[:50]

    with open(activities_file, "w", encoding="utf-8") as f:
        json.dump({"activities": activities}, f, ensure_ascii=False, indent=2)


# ═══════════════════════════════════════════════════════════
#  Summary — Ana sayfa için hafif veri
# ═══════════════════════════════════════════════════════════

def generate_summary(all_results: list) -> dict:
    """Tüm verilerin hafif özetini oluştur (chart data olmadan)."""
    summary = {
        "meta": {
            "updated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "total_series": 0
        },
        "series": []
    }

    for result in all_results:
        if not result or "series" not in result:
            continue
        for s in result["series"]:
            # Sadece son 30 veri noktası (sparkline için)
            spark_data = s.get("data", [])[-30:] if s.get("data") else []
            entry = {
                "id": s["id"],
                "name": s["name"],
                "unit": s.get("unit", ""),
                "logo_url": s.get("logo_url"),
                "logo_pair": s.get("logo_pair", []),
                "logo_candidates": s.get("logo_candidates", []),
                "current": s.get("current"),
                "change_1d_pct": s.get("change_1d_pct"),
                "change_1w_pct": s.get("change_1w_pct"),
                "change_1m_pct": s.get("change_1m_pct"),
                "change_ytd_pct": s.get("change_ytd_pct"),
                "change_1y_pct": s.get("change_1y_pct"),
                "high_52w": s.get("high_52w"),
                "low_52w": s.get("low_52w"),
                "spark": spark_data
            }
            if s.get("logo_local"):
                entry["logo_local"] = s["logo_local"]
            if s.get("logo_pair_local"):
                entry["logo_pair_local"] = s["logo_pair_local"]
            summary["series"].append(entry)
            summary["meta"]["total_series"] += 1

    return summary


# ═══════════════════════════════════════════════════════════
#  Main
# ═══════════════════════════════════════════════════════════

def main():
    print("🚀 Yahoo Finance Collector v3")
    print(f"   Veri dizini: {DATA_DIR}")
    print(f"   Zaman: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"   yfinance: {'v' + yf.__version__ if HAS_YF else 'yüklü değil (sadece API)'}")

    total = 0
    all_results = []

    for group in ALL_YF_GROUPS:
        try:
            result = fetch_group(group)

            total += result["meta"]["symbol_count"]
            all_results.append(result)

            output_file = DATA_DIR / group["file"]
            with open(output_file, "w", encoding="utf-8") as f:
                json.dump(result, f, ensure_ascii=False, indent=2)

            ok = result["meta"]["symbol_count"]
            fail = len(result["meta"]["errors"])
            print(f"   💾 {output_file.name}: {ok}✅ {fail}❌")

        except Exception as e:
            print(f"   ❌ Grup hatası ({group['category']}): {e}")

    # Ana sayfa için hafif summary oluştur
    summary = generate_summary(all_results)
    summary_file = DATA_DIR / "summary.json"
    with open(summary_file, "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False)
    print(f"   💾 summary.json: {summary['meta']['total_series']} seri (hafif)")

    update_activities()
    print(f"\n{'='*60}")
    print(f"✅ Toplam {total} seri kaydedildi!")


if __name__ == "__main__":
    main()
