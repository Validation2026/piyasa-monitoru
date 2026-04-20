"""
Yahoo Finance API yanıt parse testleri — fetch_yahoo_direct() mock ile
"""
import sys
from pathlib import Path
from unittest.mock import patch, MagicMock

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "collectors"))

from yahoo_finance import fetch_yahoo_direct


def _mock_response(json_data, status_code=200):
    """requests.get için mock response oluşturur."""
    mock = MagicMock()
    mock.status_code = status_code
    mock.json.return_value = json_data
    mock.raise_for_status.return_value = None
    if status_code >= 400:
        mock.raise_for_status.side_effect = Exception(f"HTTP {status_code}")
    return mock


def _chart_response(timestamps, closes, regular_market_price=None):
    """Geçerli Yahoo chart API yanıt formatı oluşturur."""
    result = {
        "timestamp": timestamps,
        "indicators": {
            "quote": [{"close": closes}]
        }
    }
    if regular_market_price is not None:
        result["meta"] = {"regularMarketPrice": regular_market_price}
    return {"chart": {"result": [result]}}


class TestFetchYahooDirect:

    @patch("yahoo_finance.requests.get")
    def test_successful_parse(self, mock_get):
        ts = [1704067200, 1704153600, 1704240000]  # 2024-01-01, 02, 03
        closes = [100.1234, 101.5678, 102.9999]
        mock_get.return_value = _mock_response(_chart_response(ts, closes))

        result = fetch_yahoo_direct("TEST")

        assert result is not None
        points, live_price = result
        assert len(points) == 3
        assert points[0]["date"] == "2024-01-01"
        assert points[0]["value"] == 100.1234
        assert points[2]["value"] == 102.9999  # round(102.9999, 4) = 102.9999
        assert live_price is None  # meta yok

    @patch("yahoo_finance.requests.get")
    def test_empty_result_array(self, mock_get):
        mock_get.return_value = _mock_response({"chart": {"result": []}})
        assert fetch_yahoo_direct("TEST") is None

    @patch("yahoo_finance.requests.get")
    def test_missing_result_key(self, mock_get):
        mock_get.return_value = _mock_response({"chart": {}})
        assert fetch_yahoo_direct("TEST") is None

    @patch("yahoo_finance.requests.get")
    def test_missing_timestamps(self, mock_get):
        data = {"chart": {"result": [{"indicators": {"quote": [{"close": [100]}]}}]}}
        mock_get.return_value = _mock_response(data)
        assert fetch_yahoo_direct("TEST") is None

    @patch("yahoo_finance.requests.get")
    def test_missing_closes(self, mock_get):
        data = {"chart": {"result": [{"timestamp": [1704067200], "indicators": {"quote": [{}]}}]}}
        mock_get.return_value = _mock_response(data)
        assert fetch_yahoo_direct("TEST") is None

    @patch("yahoo_finance.requests.get")
    def test_none_values_filtered(self, mock_get):
        ts = [1704067200, 1704153600, 1704240000]
        closes = [100.0, None, 102.0]
        mock_get.return_value = _mock_response(_chart_response(ts, closes))

        result = fetch_yahoo_direct("TEST")

        assert result is not None
        points, _ = result
        assert len(points) == 2
        assert points[0]["value"] == 100.0
        assert points[1]["value"] == 102.0

    @patch("yahoo_finance.requests.get")
    def test_all_none_values_returns_none(self, mock_get):
        ts = [1704067200, 1704153600]
        closes = [None, None]
        mock_get.return_value = _mock_response(_chart_response(ts, closes))
        assert fetch_yahoo_direct("TEST") is None

    @patch("yahoo_finance.requests.get")
    def test_http_error_returns_none(self, mock_get):
        mock_get.return_value = _mock_response({}, status_code=429)
        assert fetch_yahoo_direct("TEST") is None

    @patch("yahoo_finance.requests.get")
    def test_network_error_returns_none(self, mock_get):
        mock_get.side_effect = ConnectionError("Network unreachable")
        assert fetch_yahoo_direct("TEST") is None

    @patch("yahoo_finance.requests.get")
    def test_timeout_returns_none(self, mock_get):
        mock_get.side_effect = TimeoutError("Request timed out")
        assert fetch_yahoo_direct("TEST") is None

    @patch("yahoo_finance.requests.get")
    def test_date_format_is_yyyy_mm_dd(self, mock_get):
        ts = [1704067200]  # 2024-01-01 UTC
        closes = [50.0]
        mock_get.return_value = _mock_response(_chart_response(ts, closes))

        result = fetch_yahoo_direct("TEST")
        points, _ = result
        assert len(points[0]["date"]) == 10
        assert points[0]["date"].count("-") == 2

    @patch("yahoo_finance.requests.get")
    def test_live_price_from_meta(self, mock_get):
        ts = [1704067200, 1704153600]
        closes = [100.0, 101.0]
        mock_get.return_value = _mock_response(
            _chart_response(ts, closes, regular_market_price=105.5)
        )

        result = fetch_yahoo_direct("TEST")
        assert result is not None
        points, live_price = result
        assert len(points) == 2
        assert live_price == 105.5

    @patch("yahoo_finance.requests.get")
    def test_live_price_invalid_value(self, mock_get):
        ts = [1704067200]
        closes = [100.0]
        mock_get.return_value = _mock_response(
            _chart_response(ts, closes, regular_market_price="N/A")
        )

        result = fetch_yahoo_direct("TEST")
        assert result is not None
        _, live_price = result
        assert live_price is None
