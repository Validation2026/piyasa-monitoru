import json

import pytest

from collectors import yahoo_finance
from collectors.tradingview_snapshot import (
    apply_snapshots,
    load_snapshot_store,
    overlay_series_entry,
    parse_localized_number,
    round_two,
    save_snapshot_store,
)


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("90,50 USD", 90.5),
        ("2,781 USD", 2.781),
        ("59,500", 59.5),
        ("4.100,50", 4100.5),
        ("4,100.50 USD", 4100.5),
        ("−6,49%", -6.49),
        ("+0.81%", 0.81),
    ],
)
def test_parse_localized_number(text, expected):
    assert parse_localized_number(text) == expected


def test_round_two_uses_financial_half_up_rounding():
    assert round_two(2.775) == 2.78
    assert round_two(63.574) == 63.57


def test_apply_snapshots_preserves_card_data_shape(tmp_path):
    payload = {
        "meta": {"source": "Yahoo Finance"},
        "series": [{"id": "BZ=F", "current": 80, "change_1m_pct": 12, "data": [{"date": "2026-01-01", "value": 80}]}],
    }
    path = tmp_path / "commodities_energy.json"
    path.write_text(json.dumps(payload), encoding="utf-8")
    snapshot = {
        "BZ=F": {
            "price": 90.5,
            "change_1d_pct": -6.49,
            "captured_at": "2026-07-27T04:00:00Z",
            "resolved_url": "https://tr.tradingview.com/symbols/UKOIL/",
        }
    }

    assert apply_snapshots(snapshot, (tmp_path,)) == 1
    result = json.loads(path.read_text(encoding="utf-8"))
    series = result["series"][0]
    assert series["current"] == 90.5
    assert series["change_1d_pct"] == -6.49
    assert series["change_1m_pct"] == 12
    assert series["data"] == payload["series"][0]["data"]
    assert series["live_source"] == "TradingView page snapshot"
    assert result["meta"]["tradingview_snapshot_at"] == "2026-07-27T04:00:00Z"


def test_overlay_rounds_to_two_decimals_and_replaces_yahoo():
    entry = {"id": "NG=F", "current": 2.9999, "change_1d_pct": 8.8888}
    snapshots = {
        "NG=F": {
            "price": 2.774,
            "change_1d_pct": -1.236,
            "captured_at": "2026-07-27T04:00:00Z",
            "resolved_url": "https://tr.tradingview.com/symbols/NG/",
        }
    }

    assert overlay_series_entry(entry, snapshots) is True
    assert entry["current"] == 2.77
    assert entry["change_1d_pct"] == -1.24
    assert entry["live_source"] == "TradingView page snapshot"


def test_snapshot_store_keeps_previous_successes(tmp_path):
    roots = (tmp_path / "data", tmp_path / "site-data")
    first = {
        "BZ=F": {
            "price": 90.5,
            "change_1d_pct": -1.2,
            "captured_at": "2026-07-27T04:00:00Z",
            "resolved_url": "https://tr.tradingview.com/symbols/UKOIL/",
        }
    }
    second = {
        "CL=F": {
            "price": 83.73,
            "change_1d_pct": 0.5,
            "captured_at": "2026-07-28T04:00:00Z",
            "resolved_url": "https://tr.tradingview.com/symbols/USOIL/",
        }
    }

    save_snapshot_store(first, roots)
    merged = save_snapshot_store(second, roots)

    assert set(merged) == {"BZ=F", "CL=F"}
    assert load_snapshot_store(roots[0] / "tradingview_snapshots.json") == merged
    assert load_snapshot_store(roots[1] / "tradingview_snapshots.json") == merged


def test_yahoo_group_keeps_tradingview_current_value(monkeypatch):
    points = [
        {"date": "2026-07-26", "value": 80.0},
        {"date": "2026-07-27", "value": 81.0},
    ]
    monkeypatch.setattr(yahoo_finance, "fetch_yahoo_direct", lambda _symbol: (points, 82.0))
    monkeypatch.setattr(yahoo_finance, "fetch_yahoo_intraday_latest", lambda _symbol: 83.0)
    monkeypatch.setattr(yahoo_finance.time, "sleep", lambda _seconds: None)
    snapshots = {
        "CL=F": {
            "price": 84.126,
            "change_1d_pct": -2.345,
            "captured_at": "2026-07-27T04:00:00Z",
            "resolved_url": "https://tr.tradingview.com/symbols/USOIL/",
        }
    }
    group = {
        "category": "Enerji",
        "symbols": {"CL=F": {"name": "CL (WTI)", "unit": "USD/bbl"}},
    }

    result = yahoo_finance.fetch_group(group, snapshots)

    assert result["series"][0]["current"] == 84.13
    assert result["series"][0]["change_1d_pct"] == -2.35
    assert result["series"][0]["live_source"] == "TradingView page snapshot"
