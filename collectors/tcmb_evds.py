"""
TCMB EVDS Collector (v3)
'evds' Python paketini kullanır — EVDS3 ile uyumlu.

Kurulum:
    pip install evds

Kullanım:
    python collectors/tcmb_evds.py
"""

import json
import sys
import time
from datetime import datetime, timezone, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from config import EVDS_API_KEY, EVDS_SERIES, DATA_DIR

# ── evds paketi import ──
try:
    from evds import evdsAPI
    HAS_EVDS = True
except ImportError:
    HAS_EVDS = False
    print("❌ 'evds' paketi bulunamadı!")
    print("   Kur: pip install evds")
    sys.exit(1)


def fetch_series(evds_client, series_code: str, start_date: str, end_date: str) -> list:
    """
    evds paketi ile seri çeker.
    start_date, end_date: 'DD-MM-YYYY' formatında
    """
    try:
        data = evds_client.get_data(
            [series_code],
            startdate=start_date,
            enddate=end_date,
        )

        if data is None or data.empty:
            return []

        # DataFrame kolonları: 'Tarih', 'TP_FG_J0' gibi
        value_col = series_code.replace(".", "_")

        # Kolon adını bul (büyük/küçük harf farkı olabilir)
        matching_cols = [c for c in data.columns if c != "Tarih"]
        if not matching_cols:
            return []

        col = matching_cols[0]  # İlk veri kolonu

        results = []
        for _, row in data.iterrows():
            date_str = str(row["Tarih"])
            raw_val = row[col]

            if raw_val is None or str(raw_val).strip() == "" or str(raw_val) == "nan":
                continue

            # Tarihi ISO formatına çevir
            try:
                # evds paketi Tarih'i farklı formatlarda dönebilir
                if "-" in date_str and len(date_str) == 10 and date_str[4] == "-":
                    iso_date = date_str  # zaten YYYY-MM-DD
                elif "-" in date_str:
                    dt = datetime.strptime(date_str.strip(), "%d-%m-%Y")
                    iso_date = dt.strftime("%Y-%m-%d")
                else:
                    iso_date = date_str
            except ValueError:
                iso_date = date_str

            try:
                val = float(str(raw_val).replace(",", "."))
            except (ValueError, TypeError):
                continue

            results.append({"date": iso_date, "value": round(val, 4)})

        return results

    except Exception as e:
        print(f"   ❌ {series_code}: {e}")
        return []


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
    print("🚀 TCMB EVDS Collector v3 (evds paketi)")
    print(f"   API Key: ***{EVDS_API_KEY[-4:]}")

    if EVDS_API_KEY == "BURAYA_KENDI_KEYINI_YAZ":
        print("   ❌ config.py'de EVDS_API_KEY'i ayarla!")
        sys.exit(1)

    # evds client oluştur
    try:
        evds_client = evdsAPI(EVDS_API_KEY)
        print("   ✅ EVDS bağlantısı kuruldu")
    except Exception as e:
        print(f"   ❌ EVDS bağlantı hatası: {e}")
        print("   legacySSL ile deneniyor...")
        try:
            evds_client = evdsAPI(EVDS_API_KEY, legacySSL=True)
            print("   ✅ EVDS bağlantısı kuruldu (legacySSL)")
        except Exception as e2:
            print(f"   ❌ legacySSL de başarısız: {e2}")
            sys.exit(1)

    # Son 3 yıl
    end_date = datetime.now().strftime("%d-%m-%Y")
    start_date = (datetime.now() - timedelta(days=3 * 365)).strftime("%d-%m-%Y")

    series_config = EVDS_SERIES["series"]
    series_list = []
    errors = []

    for code, meta in series_config.items():
        print(f"   📡 {meta['name']} ({code})...", end=" ", flush=True)

        data_points = fetch_series(evds_client, code, start_date, end_date)

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
        time.sleep(1)

    # JSON kaydet
    now_utc = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    result = {
        "meta": {
            "source": "TCMB EVDS",
            "category": "Türkiye Makro Verileri",
            "updated_at": now_utc,
            "series_count": len(series_list),
            "errors": errors
        },
        "series": series_list
    }

    output_file = DATA_DIR / EVDS_SERIES["file"]
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(f"\n   💾 {output_file.name}: {len(series_list)} seri")
    update_activities()
    print(f"\n{'='*60}")
    print(f"✅ TCMB EVDS tamamlandı! ({len(series_list)}/{len(series_config)} başarılı)")


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
        "source_key": "tcmb_evds",
        "title": "TCMB EVDS",
        "text": "makro ekonomik veriler güncellendi",
        "timestamp": now_utc
    })
    activities = activities[:50]

    with open(activities_file, "w", encoding="utf-8") as f:
        json.dump({"activities": activities}, f, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main()