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


def _chart_response(timestamps, closes):
    """Geçerli Yahoo chart API yanıt formatı oluşturur."""
    return {
        "chart": {
            "result": [{
                "timestamp": timestamps,
                "indicators": {
                    "quote": [{"close": closes}]
                }
            }]
        }
    }


class TestFetchYahooDirect:

    @patch("yahoo_finance.requests.get")
    def test_successful_parse(self, mock_get):
        ts = [1704067200, 1704153600, 1704240000]  # 2024-01-01, 02, 03
        closes = [100.1234, 101.5678, 102.9999]
        mock_get.return_value = _mock_response(_chart_response(ts, closes))

        result = fetch_yahoo_direct("TEST")

        assert result is not None
        assert len(result) == 3
        assert result[0]["date"] == "2024-01-01"
        assert result[0]["value"] == 100.1234
        assert result[2]["value"] == 102.9999  # round(102.9999, 4) = 102.9999

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
        assert len(result) == 2
        assert result[0]["value"] == 100.0
        assert result[1]["value"] == 102.0

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
        assert len(result[0]["date"]) == 10
        assert result[0]["date"].count("-") == 2
