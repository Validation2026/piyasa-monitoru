"""
config.py konfigürasyon bütünlük testleri
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "collectors"))

from config import ALL_YF_GROUPS, DATA_DIR


class TestConfigIntegrity:

    def test_all_groups_have_required_keys(self):
        for group in ALL_YF_GROUPS:
            assert "file" in group, f"Grup'ta 'file' anahtarı eksik: {group.get('category', '?')}"
            assert "category" in group, f"Grup'ta 'category' anahtarı eksik"
            assert "symbols" in group, f"Grup'ta 'symbols' anahtarı eksik: {group.get('category', '?')}"

    def test_all_groups_have_json_filename(self):
        for group in ALL_YF_GROUPS:
            assert group["file"].endswith(".json"), \
                f"Dosya adı .json ile bitmeli: {group['file']}"

    def test_all_symbols_have_name_and_unit(self):
        for group in ALL_YF_GROUPS:
            for symbol, meta in group["symbols"].items():
                assert "name" in meta, \
                    f"'{symbol}' sembolünde 'name' eksik ({group['category']})"
                assert "unit" in meta, \
                    f"'{symbol}' sembolünde 'unit' eksik ({group['category']})"

    def test_no_empty_symbol_names(self):
        for group in ALL_YF_GROUPS:
            for symbol, meta in group["symbols"].items():
                assert meta["name"].strip(), \
                    f"'{symbol}' sembolünde boş name ({group['category']})"

    def test_groups_not_empty(self):
        for group in ALL_YF_GROUPS:
            assert len(group["symbols"]) > 0, \
                f"Boş grup: {group['category']}"

    def test_minimum_group_count(self):
        assert len(ALL_YF_GROUPS) >= 8, \
            f"En az 8 grup bekleniyor, {len(ALL_YF_GROUPS)} bulundu"

    def test_unique_filenames(self):
        filenames = [g["file"] for g in ALL_YF_GROUPS]
        assert len(filenames) == len(set(filenames)), \
            f"Tekrarlanan dosya adları: {[f for f in filenames if filenames.count(f) > 1]}"

    def test_unique_category_names(self):
        categories = [g["category"] for g in ALL_YF_GROUPS]
        assert len(categories) == len(set(categories)), \
            f"Tekrarlanan kategori adları: {[c for c in categories if categories.count(c) > 1]}"

    def test_data_dir_path(self):
        assert DATA_DIR.name == "data"

    def test_known_symbol_formats(self):
        """Yahoo Finance sembol formatlarını doğrula."""
        valid_suffixes = ("=F", "=X", "-USD", ".IS", ".SS")
        valid_prefixes = ("^",)

        for group in ALL_YF_GROUPS:
            for symbol in group["symbols"]:
                has_suffix = any(symbol.endswith(s) for s in valid_suffixes)
                has_prefix = any(symbol.startswith(p) for p in valid_prefixes)
                # DX-Y.NYB gibi özel semboller, ETF'ler (URA, LIT, COPX vb.)
                is_special = symbol in ("DX-Y.NYB",)
                is_etf = symbol.isalpha() and symbol.isupper()

                assert has_suffix or has_prefix or is_special or is_etf, \
                    f"Tanınmayan sembol formatı: {symbol} ({group['category']})"

    def test_duplicate_symbols_across_groups(self):
        """Gruplar arası tekrarlanan sembolleri tespit et."""
        seen = {}
        duplicates = []
        for group in ALL_YF_GROUPS:
            for symbol in group["symbols"]:
                if symbol in seen:
                    duplicates.append(
                        f"{symbol}: {seen[symbol]} & {group['category']}"
                    )
                else:
                    seen[symbol] = group["category"]

        # Bilinen tekrarlar — bu kasıtlıysa bu satırları güncelleyin
        known_duplicates = {"HG=F", "ALI=F", "LBS=F"}
        unexpected = [d for d in duplicates
                      if d.split(":")[0].strip() not in known_duplicates]

        assert not unexpected, \
            f"Beklenmeyen tekrarlanan semboller: {unexpected}"
