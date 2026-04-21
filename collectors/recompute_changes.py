"""
One-shot: site/data/*.json dosyalarındaki change_*_pct alanlarını ve
`current` ile tarihsel verinin birim tutarlılığını yeniden hesaplar.
Collector'ı yeniden çalıştırmadan deploy'un doğru verilerle dönmesi için.
"""
import json
from datetime import datetime, date, timedelta
from pathlib import Path


def calculate_changes(data_points):
    """yahoo_finance.calculate_changes ile aynı mantık (bu script bağımsız çalışsın diye kopya)."""
    if len(data_points) < 2:
        return {}
    current = data_points[-1]["value"]

    def pct(old, new):
        if old and old != 0 and new is not None:
            return round(((new - old) / abs(old)) * 100, 2)
        return None

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
    latest_date = parsed[-1][0]

    def value_on_or_before(target):
        best = None
        for dd, v in parsed:
            if dd <= target:
                best = v
            else:
                break
        return best

    changes = {"1d": pct(parsed[-2][1], current)}
    for key, days in [("1w", 7), ("1m", 30), ("3m", 90), ("1y", 365)]:
        base = value_on_or_before(latest_date - timedelta(days=days))
        if base is not None:
            changes[key] = pct(base, current)
    prev_year_end = date(latest_date.year - 1, 12, 31)
    base = value_on_or_before(prev_year_end)
    if base is not None:
        changes["ytd"] = pct(base, current)
    return changes

DATA_DIR = Path(__file__).resolve().parent.parent / "site" / "data"
FILES = [
    "bonds.json",
    "commodities_energy.json",
    "commodities_metals.json",
    "commodities_agriculture.json",
    "crypto.json",
    "currencies.json",
    "indices.json",
    "industrial.json",
    "stocks.json",
]


def recompute_file(path: Path) -> dict:
    stats = {"updated": 0, "unit_fixed": 0, "current_aligned": 0, "skipped": 0}
    with open(path, "r") as f:
        payload = json.load(f)

    for s in payload.get("series", []):
        data = s.get("data") or []
        if len(data) < 2:
            stats["skipped"] += 1
            continue

        last_close = data[-1].get("value")
        cur = s.get("current")

        # Birim tutarsızlığı: current, son kapanıştan 5x'ten fazla sapıyorsa
        # current'ı son kapanışa hizalıyoruz (ör. ZR=F).
        if cur is not None and last_close not in (None, 0):
            try:
                ratio = cur / last_close
            except ZeroDivisionError:
                ratio = None
            if ratio is not None and (ratio > 5 or ratio < 0.2):
                s["current"] = last_close
                cur = last_close
                stats["unit_fixed"] += 1

        # Canlı `current` her zaman değişim hesabının referans noktasıdır.
        # Son data kapanışı bugünse üstüne yaz; değilse sentetik bugün ekle.
        if cur is not None:
            today_str = datetime.utcnow().strftime("%Y-%m-%d")
            if data[-1].get("date") == today_str:
                points_for_calc = data[:-1] + [{"date": today_str, "value": cur}]
            else:
                points_for_calc = data + [{"date": today_str, "value": cur}]
            stats["current_aligned"] += 1
        else:
            points_for_calc = data

        changes = calculate_changes(points_for_calc)

        # Sadece hesaplanmış alanları yaz; eksik kalanları None yap
        for key in ("1d", "1w", "1m", "3m", "ytd", "1y"):
            field = f"change_{key}_pct"
            s[field] = changes.get(key)

        stats["updated"] += 1

    # Meta güncelleme notu
    payload.setdefault("meta", {})
    payload["meta"]["recomputed_at"] = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

    with open(path, "w") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    return stats


def main():
    total = {"updated": 0, "unit_fixed": 0, "current_aligned": 0, "skipped": 0}
    for name in FILES:
        path = DATA_DIR / name
        if not path.exists():
            print(f"⚠️  {name}: yok, atlandı")
            continue
        stats = recompute_file(path)
        for k, v in stats.items():
            total[k] = total.get(k, 0) + v
        print(f"✅ {name}: {stats}")
    print("\nTOPLAM:", total)


if __name__ == "__main__":
    main()
