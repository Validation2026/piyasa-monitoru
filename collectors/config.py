"""
Piyasa Monitörü — Konfigürasyon (Yahoo Finance Only)
EVDS kaldırıldı. Tüm veriler Yahoo Finance'den.
"""

import os
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)

COMMODITIES_ENERGY = {
    "file": "commodities_energy.json",
    "category": "Enerji",
    "symbols": {
        "BZ=F":  {"name": "Brent Petrol",        "unit": "USD/bbl"},
        "CL=F":  {"name": "WTI Petrol",           "unit": "USD/bbl"},
        "NG=F":  {"name": "Doğalgaz (Henry Hub)",  "unit": "USD/MMBtu"},
        "MTF=F": {"name": "Avrupa Doğalgaz (TTF)", "unit": "EUR/MWh"},
        "HO=F":  {"name": "Isıtma Yağı",          "unit": "USD/gal"},
        "RB=F":  {"name": "Benzin (RBOB)",         "unit": "USD/gal"},
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
        "ZW=F":  {"name": "Buğday",       "unit": "USc/bu"},
        "ZC=F":  {"name": "Mısır",        "unit": "USc/bu"},
        "ZS=F":  {"name": "Soya Fasulyesi","unit": "USc/bu"},
        "ZM=F":  {"name": "Soya Küspesi",  "unit": "USD/ton"},
        "ZL=F":  {"name": "Soya Yağı",    "unit": "USc/lb"},
        "CT=F":  {"name": "Pamuk",         "unit": "USc/lb"},
        "KC=F":  {"name": "Kahve",         "unit": "USc/lb"},
        "SB=F":  {"name": "Şeker",         "unit": "USc/lb"},
        "CC=F":  {"name": "Kakao",         "unit": "USD/ton"},
        "OJ=F":  {"name": "Portakal Suyu", "unit": "USc/lb"},
        "LBS=F": {"name": "Kereste",       "unit": "USD/mbf"},
        "LE=F":  {"name": "Canlı Sığır",   "unit": "USc/lb"},
        "HE=F":  {"name": "Yağsız Domuz",  "unit": "USc/lb"},
    }
}

CURRENCIES = {
    "file": "currencies.json",
    "category": "Döviz Kurları",
    "symbols": {
        "USDTRY=X": {"name": "USD/TRY", "unit": "TRY"},
        "EURTRY=X": {"name": "EUR/TRY", "unit": "TRY"},
        "GBPTRY=X": {"name": "GBP/TRY", "unit": "TRY"},
        "CHFTRY=X": {"name": "CHF/TRY", "unit": "TRY"},
        "JPYTRY=X": {"name": "JPY/TRY", "unit": "TRY"},
        "CADTRY=X": {"name": "CAD/TRY", "unit": "TRY"},
        "AUDTRY=X": {"name": "AUD/TRY", "unit": "TRY"},
        "CNYTRY=X": {"name": "CNY/TRY", "unit": "TRY"},
        "SARTRY=X": {"name": "SAR/TRY", "unit": "TRY"},
        "EURUSD=X": {"name": "EUR/USD", "unit": "USD"},
        "GBPUSD=X": {"name": "GBP/USD", "unit": "USD"},
        "USDJPY=X": {"name": "USD/JPY", "unit": "JPY"},
        "USDCHF=X": {"name": "USD/CHF", "unit": "CHF"},
        "AUDUSD=X": {"name": "AUD/USD", "unit": "USD"},
        "USDCAD=X": {"name": "USD/CAD", "unit": "CAD"},
        "NZDUSD=X": {"name": "NZD/USD", "unit": "USD"},
        "USDCNY=X": {"name": "USD/CNY", "unit": "CNY"},
        "DX-Y.NYB": {"name": "Dolar Endeksi (DXY)", "unit": ""},
    }
}

BONDS = {
    "file": "bonds.json",
    "category": "Tahvil Faizleri",
    "symbols": {
        "^IRX":  {"name": "ABD 3 Aylık",   "unit": "%"},
        "^FVX":  {"name": "ABD 5 Yıllık",  "unit": "%"},
        "^TNX":  {"name": "ABD 10 Yıllık", "unit": "%"},
        "^TYX":  {"name": "ABD 30 Yıllık", "unit": "%"},
    }
}

INDICES = {
    "file": "indices.json",
    "category": "Endeksler",
    "symbols": {
        "XU100.IS":  {"name": "BIST 100",       "unit": "TRY"},
        "XU030.IS":  {"name": "BIST 30",        "unit": "TRY"},
        "^GSPC":     {"name": "S&P 500",        "unit": "USD"},
        "^DJI":      {"name": "Dow Jones",      "unit": "USD"},
        "^IXIC":     {"name": "NASDAQ",         "unit": "USD"},
        "^RUT":      {"name": "Russell 2000",   "unit": "USD"},
        "^STOXX50E": {"name": "Euro Stoxx 50",  "unit": "EUR"},
        "^FTSE":     {"name": "FTSE 100",       "unit": "GBP"},
        "^GDAXI":    {"name": "DAX 40",         "unit": "EUR"},
        "^FCHI":     {"name": "CAC 40",         "unit": "EUR"},
        "^N225":     {"name": "Nikkei 225",     "unit": "JPY"},
        "^HSI":      {"name": "Hang Seng",      "unit": "HKD"},
        "000001.SS": {"name": "Shanghai Comp.",  "unit": "CNY"},
        "^BSESN":    {"name": "BSE Sensex",     "unit": "INR"},
        "^KS11":     {"name": "KOSPI",          "unit": "KRW"},
        "^TWII":     {"name": "TAIEX",          "unit": "TWD"},
        "^MERV":     {"name": "MERVAL",         "unit": "ARS"},
    }
}

CRYPTO = {
    "file": "crypto.json",
    "category": "Kripto Paralar",
    "symbols": {
        "BTC-USD":  {"name": "Bitcoin",   "unit": "USD"},
        "ETH-USD":  {"name": "Ethereum",  "unit": "USD"},
        "BNB-USD":  {"name": "BNB",       "unit": "USD"},
        "SOL-USD":  {"name": "Solana",    "unit": "USD"},
        "XRP-USD":  {"name": "XRP",       "unit": "USD"},
        "ADA-USD":  {"name": "Cardano",   "unit": "USD"},
        "DOGE-USD": {"name": "Dogecoin",  "unit": "USD"},
        "AVAX-USD": {"name": "Avalanche", "unit": "USD"},
        "DOT-USD":  {"name": "Polkadot",  "unit": "USD"},
        "LINK-USD": {"name": "Chainlink", "unit": "USD"},
    }
}

ALL_YF_GROUPS = [
    COMMODITIES_ENERGY,
    COMMODITIES_METALS,
    COMMODITIES_AGRICULTURE,
    CURRENCIES,
    BONDS,
    INDICES,
    CRYPTO,
]
