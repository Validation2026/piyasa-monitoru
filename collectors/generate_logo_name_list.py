"""Logo dosya isimlerini konfigürasyondaki tüm varlıklar için üretir.

Kullanım:
  python collectors/generate_logo_name_list.py
  python collectors/generate_logo_name_list.py --group currencies
  python collectors/generate_logo_name_list.py --format tsv > logo-list.tsv
"""

from __future__ import annotations

import argparse
import re
from typing import Iterable

from config import ALL_YF_GROUPS


def safe_id(symbol: str) -> str:
    """Symbol ID'yi dosya adına çevir."""
    return re.sub(r"[^a-z0-9]+", "-", symbol.lower()).strip("-")


def iter_symbols(groups: Iterable[dict], only_group: str | None = None):
    for group in groups:
        category = group.get("category", "")
        if only_group and only_group.lower() not in category.lower() and only_group.lower() != group.get("file", "").replace(".json", ""):
            continue
        for symbol, meta in group.get("symbols", {}).items():
            yield {
                "category": category,
                "symbol": symbol,
                "name": meta.get("name", symbol),
                "logo_svg": f"{safe_id(symbol)}.svg",
                "logo_png": f"{safe_id(symbol)}.png",
            }


def main() -> None:
    parser = argparse.ArgumentParser(description="Varlıklar için önerilen logo dosya isimlerini listeler")
    parser.add_argument("--group", help="Kategori adı veya dosya adı (örn: currencies, Kripto)")
    parser.add_argument("--format", choices=["table", "tsv"], default="table")
    args = parser.parse_args()

    rows = list(iter_symbols(ALL_YF_GROUPS, args.group))
    if not rows:
        print("Kriterinize uyan varlık bulunamadı.")
        return

    if args.format == "tsv":
        print("category\tsymbol\tname\tlogo_svg\tlogo_png")
        for r in rows:
            print(f"{r['category']}\t{r['symbol']}\t{r['name']}\t{r['logo_svg']}\t{r['logo_png']}")
        return

    cat_w = max(len(r["category"]) for r in rows)
    sym_w = max(len(r["symbol"]) for r in rows)
    file_w = max(len(r["logo_svg"]) for r in rows)

    print(f"{'Kategori'.ljust(cat_w)}  {'Sembol'.ljust(sym_w)}  {'Logo dosyası (önerilen)'.ljust(file_w)}")
    print(f"{'-' * cat_w}  {'-' * sym_w}  {'-' * file_w}")
    for r in rows:
        print(f"{r['category'].ljust(cat_w)}  {r['symbol'].ljust(sym_w)}  {r['logo_svg'].ljust(file_w)}")


if __name__ == "__main__":
    main()
