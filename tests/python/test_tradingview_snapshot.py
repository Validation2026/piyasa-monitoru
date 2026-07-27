import json

import pytest

from collectors.tradingview_snapshot import apply_snapshots, parse_localized_number


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("90,50 USD", 90.5),
        ("4.100,50", 4100.5),
        ("4,100.50 USD", 4100.5),
        ("−6,49%", -6.49),
        ("+0.81%", 0.81),
    ],
)
def test_parse_localized_number(text, expected):
    assert parse_localized_number(text) == expected


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
