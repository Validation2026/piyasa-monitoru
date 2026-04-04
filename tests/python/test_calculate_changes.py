"""
calculate_changes() birim testleri — yahoo_finance.py ve fred_macro.py
"""
import sys
from pathlib import Path
from unittest.mock import patch
from datetime import datetime

# collectors modülünü import edebilmek için path ekle
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "collectors"))

from yahoo_finance import calculate_changes as yf_calculate_changes
from fred_macro import calculate_changes as fred_calculate_changes


# ─── Yardımcı ───

def make_points(values, start_date="2024-01-02"):
    """Değer listesinden data point listesi oluşturur."""
    from datetime import datetime, timedelta
    base = datetime.strptime(start_date, "%Y-%m-%d")
    return [
        {"date": (base + timedelta(days=i)).strftime("%Y-%m-%d"), "value": v}
        for i, v in enumerate(values)
    ]


# ═══════════════════════════════════════════
#  Yahoo Finance — calculate_changes
# ═══════════════════════════════════════════

class TestYFCalculateChanges:

    def test_empty_list(self):
        assert yf_calculate_changes([]) == {}

    def test_single_point(self):
        assert yf_calculate_changes([{"date": "2024-01-01", "value": 100}]) == {}

    def test_1d_change(self):
        pts = make_points([100, 110])
        result = yf_calculate_changes(pts)
        assert result["1d"] == 10.0

    def test_1d_negative_change(self):
        pts = make_points([100, 90])
        result = yf_calculate_changes(pts)
        assert result["1d"] == -10.0

    def test_1w_change(self):
        # 6+ veri noktası gerekiyor
        pts = make_points([100, 101, 102, 103, 104, 120])
        result = yf_calculate_changes(pts)
        assert result["1w"] == 20.0

    def test_1m_change(self):
        # 23+ veri noktası gerekiyor
        values = [100] + [101] * 21 + [125]
        pts = make_points(values)
        result = yf_calculate_changes(pts)
        assert result["1m"] == 25.0

    def test_3m_change(self):
        # 67+ veri noktası gerekiyor
        values = [200] + [201] * 65 + [250]
        pts = make_points(values)
        result = yf_calculate_changes(pts)
        assert result["3m"] == 25.0

    def test_1y_change(self):
        # 200+ veri noktası gerekiyor
        values = [80] + [85] * 199 + [100]
        pts = make_points(values)
        result = yf_calculate_changes(pts)
        assert result["1y"] == 25.0

    def test_ytd_change(self):
        current_year = str(datetime.now().year)
        pts = [
            {"date": f"{current_year}-01-02", "value": 100},
            {"date": f"{current_year}-02-01", "value": 110},
            {"date": f"{current_year}-03-01", "value": 120},
        ]
        result = yf_calculate_changes(pts)
        assert result["ytd"] == 20.0

    def test_no_ytd_when_no_current_year_data(self):
        pts = make_points([100, 110], start_date="2020-01-01")
        result = yf_calculate_changes(pts)
        assert "ytd" not in result

    def test_zero_old_value_returns_none(self):
        pts = make_points([0, 100])
        result = yf_calculate_changes(pts)
        assert result["1d"] is None

    def test_keys_absent_when_insufficient_data(self):
        pts = make_points([100, 110, 120])  # sadece 3 veri
        result = yf_calculate_changes(pts)
        assert "1d" in result
        assert "1w" not in result
        assert "1m" not in result
        assert "3m" not in result
        assert "1y" not in result

    def test_negative_values(self):
        pts = make_points([-10, -5])
        result = yf_calculate_changes(pts)
        assert result["1d"] == 50.0  # (-5 - (-10)) / |-10| * 100 = +50%

    def test_precision(self):
        pts = make_points([100, 133.33])
        result = yf_calculate_changes(pts)
        assert result["1d"] == 33.33


# ═══════════════════════════════════════════
#  FRED Macro — calculate_changes
# ═══════════════════════════════════════════

class TestFredCalculateChanges:

    def test_empty_list(self):
        assert fred_calculate_changes([]) == {}

    def test_single_point(self):
        assert fred_calculate_changes([{"date": "2024-01-01", "value": 50}]) == {}

    def test_prev_pct(self):
        pts = make_points([100, 115])
        result = fred_calculate_changes(pts)
        assert result["prev_pct"] == 15.0

    def test_prev_pct_negative(self):
        pts = make_points([100, 80])
        result = fred_calculate_changes(pts)
        assert result["prev_pct"] == -20.0

    def test_yoy_change(self):
        # 13+ veri noktası gerekiyor
        values = [200] + [210] * 11 + [240]
        pts = make_points(values)
        result = fred_calculate_changes(pts)
        assert result["yoy_pct"] == 20.0

    def test_ytd_requires_two_current_year_points(self):
        current_year = str(datetime.now().year)
        pts = [
            {"date": f"{current_year}-01-15", "value": 100},
            {"date": f"{current_year}-06-15", "value": 130},
        ]
        result = fred_calculate_changes(pts)
        assert result["ytd_pct"] == 30.0

    def test_no_ytd_with_single_current_year_point(self):
        current_year = str(datetime.now().year)
        pts = [
            {"date": "2020-06-01", "value": 100},
            {"date": f"{current_year}-03-01", "value": 120},
        ]
        result = fred_calculate_changes(pts)
        assert "ytd_pct" not in result

    def test_zero_old_value(self):
        pts = make_points([0, 50])
        result = fred_calculate_changes(pts)
        assert result["prev_pct"] is None
