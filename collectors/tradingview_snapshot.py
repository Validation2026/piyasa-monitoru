"""Capture selected TradingView quote snapshots with a real browser.

This collector intentionally updates only the fields already consumed by the
existing cards.  Historical arrays and the frontend markup are left untouched.
TradingView does not expose a stable DOM contract, so selectors are kept in one
place and failed captures never overwrite the last known value.
"""

from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]


@dataclass(frozen=True)
class Instrument:
    series_id: str
    name: str
    url: str
    files: tuple[str, ...]


INSTRUMENTS = (
    Instrument("BZ=F", "Brent", "https://tr.tradingview.com/symbols/UKOIL/", ("commodities_energy.json",)),
    Instrument("CL=F", "WTI", "https://tr.tradingview.com/symbols/WTI/", ("commodities_energy.json",)),
    Instrument("NG=F", "Doğalgaz", "https://tr.tradingview.com/symbols/NG/", ("commodities_energy.json",)),
    Instrument("TTF=F", "TTF", "https://tr.tradingview.com/symbols/NYMEX-TTF1!/", ("commodities_energy.json",)),
    Instrument("HO=F", "Isıtma Yağı", "https://tr.tradingview.com/symbols/HEATINGOIL/", ("commodities_energy.json",)),
    Instrument("RB=F", "Benzin", "https://www.tradingview.com/symbols/GASOLINE/", ("commodities_energy.json",)),
    Instrument("URA", "URA", "https://www.tradingview.com/symbols/AMEX-URA/", ("commodities_energy.json",)),
    Instrument("GC=F", "Altın", "https://www.tradingview.com/symbols/XAUUSD/", ("commodities_metals.json",)),
    Instrument("SI=F", "Gümüş", "https://www.tradingview.com/symbols/XAGUSD/", ("commodities_metals.json",)),
    Instrument("HG=F", "Bakır", "https://www.tradingview.com/symbols/COMEX-HG1!/", ("commodities_metals.json",)),
    Instrument("ALI=F", "Alüminyum", "https://www.tradingview.com/symbols/ALUMINIUM/", ("commodities_metals.json",)),
    Instrument("^VIX", "VIX", "https://www.tradingview.com/symbols/TVC-VIX/", ("indices.json",)),
)

PRICE_SELECTORS = (
    '[data-test="instrument-header-price"]',
    '[data-field="last"]',
    '.js-symbol-last',
    '[class*="lastContainer"]',
)
CHANGE_SELECTORS = (
    '[data-test="instrument-header-change-percent"]',
    '.js-symbol-change-pt',
    '[class*="changePercent"]',
)


def parse_localized_number(text: str) -> float:
    """Parse TradingView numbers in Turkish or English number formatting."""
    cleaned = text.replace("\u2212", "-").replace("\u00a0", " ")
    match = re.search(r"[-+]?\d[\d.,\s]*", cleaned)
    if not match:
        raise ValueError(f"numeric value not found in {text!r}")
    value = match.group(0).replace(" ", "")
    if "," in value and "." in value:
        if value.rfind(",") > value.rfind("."):
            value = value.replace(".", "").replace(",", ".")
        else:
            value = value.replace(",", "")
    elif "," in value:
        tail = value.rsplit(",", 1)[1]
        value = value.replace(",", ".") if len(tail) != 3 else value.replace(",", "")
    return float(value)


def _read_first_number(page: Any, selectors: tuple[str, ...]) -> tuple[float, str]:
    errors = []
    for selector in selectors:
        try:
            locator = page.locator(selector).first
            locator.wait_for(state="visible", timeout=5_000)
            text = locator.inner_text(timeout=2_000).strip()
            return parse_localized_number(text), selector
        except Exception as exc:  # Playwright uses several selector/timeout errors.
            errors.append(f"{selector}: {exc}")
    raise RuntimeError("; ".join(errors))


def capture(page: Any, instrument: Instrument, artifact_dir: Path) -> dict[str, Any]:
    page.goto(instrument.url, wait_until="domcontentloaded", timeout=60_000)
    page.wait_for_timeout(5_000)
    try:
        price, price_selector = _read_first_number(page, PRICE_SELECTORS)
        if price <= 0:
            raise ValueError(f"non-positive price: {price}")
        try:
            change, change_selector = _read_first_number(page, CHANGE_SELECTORS)
        except RuntimeError:
            change, change_selector = None, None
        return {
            "price": price,
            "change_1d_pct": change,
            "captured_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "requested_url": instrument.url,
            "resolved_url": page.url,
            "price_selector": price_selector,
            "change_selector": change_selector,
        }
    except Exception:
        artifact_dir.mkdir(parents=True, exist_ok=True)
        page.screenshot(path=str(artifact_dir / f"{instrument.series_id.replace('^', '').replace('=', '-')}.png"), full_page=True)
        raise


def apply_snapshots(snapshots: dict[str, dict[str, Any]], roots: tuple[Path, ...]) -> int:
    updated = 0
    for root in roots:
        for filename in sorted({name for item in INSTRUMENTS for name in item.files}):
            path = root / filename
            if not path.exists():
                continue
            payload = json.loads(path.read_text(encoding="utf-8"))
            changed = False
            for series in payload.get("series", []):
                snapshot = snapshots.get(series.get("id"))
                if not snapshot:
                    continue
                series["current"] = snapshot["price"]
                if snapshot.get("change_1d_pct") is not None:
                    series["change_1d_pct"] = snapshot["change_1d_pct"]
                series["live_source"] = "TradingView page snapshot"
                series["price_timestamp"] = snapshot["captured_at"]
                series["source_url"] = snapshot["resolved_url"]
                changed = True
                updated += 1
            if changed:
                payload.setdefault("meta", {})["tradingview_snapshot_at"] = max(
                    item["captured_at"] for item in snapshots.values()
                )
                path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return updated


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--artifacts", type=Path, default=ROOT / "artifacts" / "tradingview")
    parser.add_argument("--headful", action="store_true")
    args = parser.parse_args()

    try:
        from playwright.sync_api import sync_playwright
    except ImportError as exc:
        raise SystemExit("Playwright eksik: pip install playwright && playwright install chromium") from exc

    snapshots: dict[str, dict[str, Any]] = {}
    failures: list[str] = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=not args.headful)
        context = browser.new_context(
            locale="tr-TR",
            timezone_id="Europe/Istanbul",
            viewport={"width": 1440, "height": 1000},
            user_agent="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
        )
        page = context.new_page()
        for instrument in INSTRUMENTS:
            try:
                snapshots[instrument.series_id] = capture(page, instrument, args.artifacts)
                print(f"OK {instrument.name}: {snapshots[instrument.series_id]['price']}")
            except Exception as exc:
                failures.append(f"{instrument.name}: {exc}")
                print(f"ERROR {failures[-1]}")
        browser.close()

    if not snapshots:
        raise SystemExit("Hiçbir TradingView fiyatı alınamadı; mevcut veriler değiştirilmedi.")
    count = apply_snapshots(snapshots, (ROOT / "data", ROOT / "site" / "data"))
    print(f"{len(snapshots)} snapshot, {count} veri kaydı güncellendi.")
    if failures:
        print("Başarısız semboller:\n- " + "\n- ".join(failures))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
