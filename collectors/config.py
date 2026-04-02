"""
Piyasa Monitörü — Merkezi Konfigürasyon
Tüm semboller, API ayarları ve veri kategorileri.
"""

import os
from pathlib import Path

# ── Paths ──────────────────────────────────────────────
ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)

# ── TCMB EVDS ─────────────────────────────────────────
EVDS_API_KEY = os.environ.get("TCMB_API_KEY", "BURAYA_KENDI_KEYINI_YAZ")
EVDS_BASE_URL = "https://evds2.tcmb.gov.tr/service/evds"

# ── Yahoo Finance Sembolleri ───────────────────────────

COMMODITIES_ENERGY = {
    "file": "commodities_energy.json",
    "category": "Enerji",
    "symbols": {
        "BZ=F":  {"name": "Brent Petrol",       "unit": "USD/bbl"},
        "CL=F":  {"name": "WTI Petrol",          "unit": "USD/bbl"},
        "NG=F":  {"name": "Doğalgaz (Henry Hub)", "unit": "USD/MMBtu"},
        "MTF=F": {"name": "Avrupa Doğalgaz (TTF)","unit": "EUR/MWh"},
    }
}

COMMODITIES_METALS = {
    "file": "commodities_metals.json",
    "category": "Kıymetli Madenler & Metaller",
    "symbols": {
        "GC=F":  {"name": "Altın",      "unit": "USD/oz"},
        "SI=F":  {"name": "Gümüş",      "unit": "USD/oz"},
        "PL=F":  {"name": "Platin",      "unit": "USD/oz"},
        "PA=F":  {"name": "Paladyum",    "unit": "USD/oz"},
        "HG=F":  {"name": "Bakır",       "unit": "USD/lb"},
        "ALI=F": {"name": "Alüminyum",   "unit": "USD/ton"},
    }
}

COMMODITIES_AGRICULTURE = {
    "file": "commodities_agriculture.json",
    "category": "Tarım",
    "symbols": {
        "ZW=F":  {"name": "Buğday",   "unit": "USc/bu"},
        "ZC=F":  {"name": "Mısır",    "unit": "USc/bu"},
        "ZS=F":  {"name": "Soya",     "unit": "USc/bu"},
        "CT=F":  {"name": "Pamuk",    "unit": "USc/lb"},
        "KC=F":  {"name": "Kahve",    "unit": "USc/lb"},
        "SB=F":  {"name": "Şeker",    "unit": "USc/lb"},
        "CC=F":  {"name": "Kakao",    "unit": "USD/ton"},
    }
}

CURRENCIES = {
    "file": "currencies.json",
    "category": "Döviz Kurları",
    "symbols": {
        "USDTRY=X": {"name": "USD/TRY", "unit": "TRY"},
        "EURTRY=X": {"name": "EUR/TRY", "unit": "TRY"},
        "GBPTRY=X": {"name": "GBP/TRY", "unit": "TRY"},
        "JPYTRY=X": {"name": "JPY/TRY", "unit": "TRY"},
        "CHFTRY=X": {"name": "CHF/TRY", "unit": "TRY"},
        "EURUSD=X": {"name": "EUR/USD", "unit": "USD"},
        "GBPUSD=X": {"name": "GBP/USD", "unit": "USD"},
        "USDJPY=X": {"name": "USD/JPY", "unit": "JPY"},
        "DX-Y.NYB":  {"name": "Dolar Endeksi (DXY)", "unit": ""},
    }
}

BONDS = {
    "file": "bonds.json",
    "category": "Tahvil Faizleri",
    "symbols": {
        "^TNX":  {"name": "ABD 10 Yıllık",    "unit": "%"},
        "^FVX":  {"name": "ABD 5 Yıllık",     "unit": "%"},
        "^TYX":  {"name": "ABD 30 Yıllık",    "unit": "%"},
        "^IRX":  {"name": "ABD 3 Aylık",       "unit": "%"},
    }
}

INDICES = {
    "file": "indices.json",
    "category": "Endeksler",
    "symbols": {
        "XU100.IS":  {"name": "BIST 100",     "unit": "TRY"},
        "XU030.IS":  {"name": "BIST 30",      "unit": "TRY"},
        "^GSPC":     {"name": "S&P 500",      "unit": "USD"},
        "^DJI":      {"name": "Dow Jones",    "unit": "USD"},
        "^IXIC":     {"name": "NASDAQ",       "unit": "USD"},
        "^STOXX50E": {"name": "Euro Stoxx 50","unit": "EUR"},
        "^FTSE":     {"name": "FTSE 100",     "unit": "GBP"},
        "^N225":     {"name": "Nikkei 225",   "unit": "JPY"},
    }
}

ALL_YF_GROUPS = [
    COMMODITIES_ENERGY,
    COMMODITIES_METALS,
    COMMODITIES_AGRICULTURE,
    CURRENCIES,
    BONDS,
    INDICES,
]

# ── TCMB EVDS Serileri (EVDS3 ile test edilmiş çalışanlar) ──
EVDS_SERIES = {
    "file": "macro_turkey.json",
    "series": {
        # ✅ Çalışan seriler
        "TP.FG.J0":        {"name": "TÜFE Endeksi (2003=100)",        "category": "Enflasyon"},
        "TP.FE.OKTG01":    {"name": "TÜFE Yıllık Değişim (%)",        "category": "Enflasyon"},
        "TP.APIFON4":      {"name": "TCMB Ağırlıklı Ort. Fonlama Maliyeti", "category": "Faiz"},
        "TP.TG2.Y01":      {"name": "Tüketici Güven Endeksi",         "category": "Güven"},
        "TP.DK.USD.A.YTL": {"name": "USD/TRY (TCMB Alış)",           "category": "Döviz"},
        "TP.DK.EUR.A.YTL": {"name": "EUR/TRY (TCMB Alış)",           "category": "Döviz"},
    }
}
