"""Regressions: TCMB collector must never publish invented macro time series."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "collectors"))
import tcmb_makro as macro  # noqa: E402


def test_tufe_index_is_converted_to_yoy_rate():
    index = [
        {"date": "2025-10-01", "value": 100.0},
        {"date": "2026-09-01", "value": 127.0},
        {"date": "2026-10-01", "value": 129.77},
    ]
    yoy = macro.to_annual_inflation(index)
    assert yoy == [{"date": "2026-10-01", "value": 29.77}]


def test_parser_supports_evds3_monthly_date_and_drops_invalid_values():
    items = [
        {"Tarih": "10-2026", "TP_TUKFIY2025_GENEL": "129,77"},
        {"Tarih": "09-2026", "TP_TUKFIY2025_GENEL": "127.00"},
        {"Tarih": "08-2026", "TP_TUKFIY2025_GENEL": "null"},
    ]
    points = macro.parse_evds(items, "TP.TUKFIY2025.GENEL")
    assert points == [
        {"date": "2026-09-01", "value": 127.0},
        {"date": "2026-10-01", "value": 129.77},
    ]


def test_unverified_series_has_no_numeric_fallback():
    code = "TP.BANKA.K01"
    row = macro.build_row(code, macro.SERIES[code], [], "Unavailable", "unavailable")
    assert row["current"] is None
    assert row["data"] == []
    assert row["latest_date"] is None
    assert row["source"] == "Unavailable"


def test_legacy_seed_snapshot_is_never_reused(tmp_path, monkeypatch):
    data_dir = tmp_path / "data"
    data_dir.mkdir()
    code = "TP.FG.J0"
    legacy = {"series": [{"id": code, "source": "Seed",
                          "data": [{"date": "2026-11-01", "value": 9999}],
                          "latest_date": "2026-11-01"}]}
    (data_dir / "turkiye_makro.json").write_text(json.dumps(legacy))
    monkeypatch.setattr(macro, "DATA_DIR", data_dir)
    assert macro.valid_existing_trusted(code) is None


def test_empty_evds_is_failure_but_safe_snapshot_is_written(tmp_path, monkeypatch):
    monkeypatch.setattr(macro, "DATA_DIR", tmp_path / "data")
    monkeypatch.setattr(macro, "EVDS_KEY", "")
    status = macro.main()
    assert status == 1  # GitHub Action must be visibly marked as failed.
    data = json.loads((tmp_path / "data" / "turkiye_makro.json").read_text())
    assert len(data["series"]) == len(macro.SERIES) == 24
    assert data["meta"]["live_count"] == 0
    assert data["meta"]["unavailable_count"] == 22
    assert all(x["source"] != "Seed" for x in data["series"])
    assert all(x["current"] is None for x in data["series"]
               if x["status"] == "unavailable")
    assert next(x for x in data["series"] if x["name"] == "TÜFE (Yıllık %)")["current"] == 29.77
    assert next(x for x in data["series"] if x["name"] == "TCMB Politika Faizi")["current"] == 36.0
    site = json.loads((tmp_path / "site" / "data" / "turkiye_makro.json").read_text())
    assert site == data
