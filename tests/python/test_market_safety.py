import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

from collectors.yahoo_finance import merge_market_group, valid_market_entry, write_market_json


def entry(symbol, value=100, days=5):
    return {"id": symbol, "current": value, "data": [
        {"date": f"2026-11-{i+1:02d}", "value": value}
        for i in range(days)
    ]}


def payload(*entries):
    return {"meta": {"updated_at": "2026-11-27T08:00:00Z", "errors": []},
            "series": list(entries)}


GROUP = {"category": "test", "symbols": {"A": {}, "B": {}}}


class TestMarketRefreshSafety(unittest.TestCase):
    def test_missing_symbol_preserves_old_price_and_history(self):
        old_a, old_b = entry("A"), entry("B")
        result, count, changed = merge_market_group(GROUP, payload(old_a, old_b), payload(entry("A", 110)))
        self.assertEqual(count, 1)
        self.assertTrue(changed)
        self.assertEqual(result["series"], [entry("A", 110), old_b])
        self.assertEqual(result["meta"]["retained_symbols"], ["B"])

    def test_invalid_nan_and_truncated_history_are_rejected(self):
        old_a, old_b = entry("A"), entry("B")
        result, count, _ = merge_market_group(
            GROUP, payload(old_a, old_b), payload(entry("A", float("nan")), entry("B", 150, days=1)))
        self.assertEqual(count, 0)
        self.assertEqual(result["series"], [old_a, old_b])
        self.assertEqual(result["meta"]["retained_symbols"], ["A", "B"])
        self.assertEqual(result["meta"]["updated_at"], "2026-11-27T08:00:00Z")

    def test_unchanged_values_do_not_force_new_commit(self):
        first, _, _ = merge_market_group(GROUP, payload(entry("A"), entry("B")), payload(entry("A"), entry("B")))
        fresh = payload(entry("A"), entry("B"))
        fresh["meta"]["updated_at"] = "2026-11-27T09:00:00Z"
        second, count, changed = merge_market_group(GROUP, first, fresh)
        self.assertEqual(count, 2)
        self.assertFalse(changed)
        self.assertEqual(first, second)

    def test_empty_group_without_previous_data_aborts(self):
        with self.assertRaises(RuntimeError):
            merge_market_group(GROUP, {}, payload())

    def test_invalid_json_never_overwrites_existing_file(self):
        with TemporaryDirectory() as tmp:
            path = Path(tmp) / "prices.json"
            path.write_text('{"safe": true}', encoding="utf-8")
            with self.assertRaises(ValueError):
                write_market_json(path, {"price": float("inf")})
            self.assertEqual(path.read_text(encoding="utf-8"), '{"safe": true}')

    def test_invalid_history_value_rejected(self):
        value = entry("A")
        value["data"][0]["value"] = float("nan")
        self.assertFalse(valid_market_entry(value))


if __name__ == "__main__":
    unittest.main()
