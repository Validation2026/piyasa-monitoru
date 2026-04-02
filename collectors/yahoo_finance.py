"""
Yahoo Finance Collector (v3 — Düzeltilmiş)
query2.finance.yahoo.com API'si + yf.download() fallback.

Kullanım:
    python collectors/yahoo_finance.py
"""

import json
import sys
import time
from datetime import datetime, timezone, timedelta
from pathlib import Path

import requests
import pandas as pd

try:
    import yfinance as yf
    HAS_YF = True
except ImportError:
    HAS_YF = False

sys.path.insert(0, str(Path(__file__).resolve().parent))
from config import ALL_YF_GROUPS, DATA_DIR


# ═══════════════════════════════════════════════════════════
#  YÖNTEM 1 (Birincil): Doğrudan Yahoo Chart API — query2
# ═══════════════════════════════════════════════════════════

YAHOO_CHART_URL = "https://query2.finance.yahoo.com/v8/finance/chart/{symbol}"

def fetch_yahoo_direct(symbol: str, range_str: str = "1y", interval: str = "1d") -> list | None:
    """Yahoo Finance chart API'sinden veri çeker. query2 kullanır."""

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    params = {"range": range_str, "interval": interval, "includePrePost": "false"}

    try:
        resp = requests.get(
            YAHOO_CHART_URL.format(symbol=symbol),
            headers=headers, params=params, timeout=15,
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

        return points if points else None

    except Exception as e:
        print(f"      Yahoo API hatası ({symbol}): {e}")
        return None


# ═══════════════════════════════════════════════════════════
#  YÖNTEM 2 (Fallback): yf.download()
# ═══════════════════════════════════════════════════════════

def fetch_yf_download(symbol: str) -> list | None:
    """yfinance ile tek sembol indir."""
    if not HAS_YF:
        return None

    try:
        df = yf.download(symbol, period="1y", interval="1d", progress=False)
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
    if len(data_points) < 2:
        return {}

    current = data_points[-1]["value"]

    def pct(old, new):
        if old and old != 0:
            return round(((new - old) / abs(old)) * 100, 2)
        return None

    changes = {}

    if len(data_points) >= 2:
        changes["1d"] = pct(data_points[-2]["value"], current)
    if len(data_points) >= 6:
        changes["1w"] = pct(data_points[-6]["value"], current)
    if len(data_points) >= 23:
        changes["1m"] = pct(data_points[-23]["value"], current)
    if len(data_points) >= 67:
        changes["3m"] = pct(data_points[-67]["value"], current)

    # YTD
    current_year = str(datetime.now().year)
    ytd = [p for p in data_points if p["date"].startswith(current_year)]
    if ytd:
        changes["ytd"] = pct(ytd[0]["value"], current)

    # 1Y
    if len(data_points) >= 200:
        changes["1y"] = pct(data_points[0]["value"], current)

    return changes


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
        points = fetch_yahoo_direct(symbol)
        source = "Yahoo API"

        # Başarısızsa yfinance dene
        if points is None:
            points = fetch_yf_download(symbol)
            source = "yfinance"

        if points is None:
            errors.append(symbol)
            print(f"   ❌ {meta['name']} ({symbol}): Veri alınamadı")
            continue

        current = points[-1]["value"]
        changes = calculate_changes(points)
        values = [p["value"] for p in points]

        series_list.append({
            "id": symbol,
            "name": meta["name"],
            "unit": meta["unit"],
            "current": current,
            "change_1d_pct": changes.get("1d"),
            "change_1w_pct": changes.get("1w"),
            "change_1m_pct": changes.get("1m"),
            "change_3m_pct": changes.get("3m"),
            "change_ytd_pct": changes.get("ytd"),
            "change_1y_pct": changes.get("1y"),
            "high_52w": round(max(values), 4),
            "low_52w": round(min(values), 4),
            "data": points
        })

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
#  Main
# ═══════════════════════════════════════════════════════════

def main():
    print("🚀 Yahoo Finance Collector v3")
    print(f"   Veri dizini: {DATA_DIR}")
    print(f"   Zaman: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"   yfinance: {'v' + yf.__version__ if HAS_YF else 'yüklü değil (sadece API)'}")

    total = 0

    for group in ALL_YF_GROUPS:
        try:
            result = fetch_group(group)
            total += result["meta"]["symbol_count"]

            output_file = DATA_DIR / group["file"]
            with open(output_file, "w", encoding="utf-8") as f:
                json.dump(result, f, ensure_ascii=False, indent=2)

            ok = result["meta"]["symbol_count"]
            fail = len(result["meta"]["errors"])
            print(f"   💾 {output_file.name}: {ok}✅ {fail}❌")

        except Exception as e:
            print(f"   ❌ Grup hatası ({group['category']}): {e}")

    update_activities()
    print(f"\n{'='*60}")
    print(f"✅ Toplam {total} seri kaydedildi!")


if __name__ == "__main__":
    main()