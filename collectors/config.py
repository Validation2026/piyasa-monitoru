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
        "BZ=F":  {"name": "BZ (Brent)",        "unit": "USD/bbl"},
        "CL=F":  {"name": "CL (WTI)",           "unit": "USD/bbl"},
        "NG=F":  {"name": "NG (Doğalgaz)",  "unit": "USD/MMBtu"},
        "TTF=F": {"name": "TTF (Avrupa Gaz)", "unit": "EUR/MWh"},
        "HO=F":  {"name": "HO (Isıtma Yağı)",          "unit": "USD/gal"},
        "RB=F":  {"name": "RB (Benzin)",         "unit": "USD/gal"},
    }
}

COMMODITIES_METALS = {
    "file": "commodities_metals.json",
    "category": "Kıymetli Madenler & Metaller",
    "symbols": {
        "GC=F":  {"name": "XAU (Altın)",      "unit": "USD/oz"},
        "SI=F":  {"name": "XAG (Gümüş)",      "unit": "USD/oz"},
        "PL=F":  {"name": "XPT (Platin)",      "unit": "USD/oz"},
        "PA=F":  {"name": "XPD (Paladyum)",    "unit": "USD/oz"},
        "HG=F":  {"name": "HG (Bakır)",       "unit": "USD/lb"},
        "ALI=F": {"name": "ALI (Alüminyum)",   "unit": "USD/ton"},
    }
}

COMMODITIES_AGRICULTURE = {
    "file": "commodities_agriculture.json",
    "category": "Tarım",
    "symbols": {
        "ZW=F":  {"name": "ZW (Buğday)",       "unit": "USc/bu"},
        "ZC=F":  {"name": "ZC (Mısır)",        "unit": "USc/bu"},
        "ZS=F":  {"name": "ZS (Soya)","unit": "USc/bu"},
        "ZM=F":  {"name": "ZM (Soya Küspesi)",  "unit": "USD/ton"},
        "ZL=F":  {"name": "ZL (Soya Yağı)",    "unit": "USc/lb"},
        "CT=F":  {"name": "CT (Pamuk)",         "unit": "USc/lb"},
        "KC=F":  {"name": "KC (Kahve)",         "unit": "USc/lb"},
        "SB=F":  {"name": "SB (Şeker)",         "unit": "USc/lb"},
        "CC=F":  {"name": "CC (Kakao)",         "unit": "USD/ton"},
        "OJ=F":  {"name": "OJ (Portakal Suyu)", "unit": "USc/lb"},
        "LBS=F": {"name": "LBS (Kereste)",       "unit": "USD/mbf"},
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
        "2YY=F":    {"name": "ABD 2 Yıllık",       "unit": "%"},
        "^FVX":     {"name": "ABD 5 Yıllık",       "unit": "%"},
        "^TNX":     {"name": "ABD 10 Yıllık",      "unit": "%"},
        "^TYX":     {"name": "ABD 30 Yıllık",      "unit": "%"},
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
        "BTC-USD":  {"name": "BTC (Bitcoin)",   "unit": "USD"},
        "ETH-USD":  {"name": "ETH (Ethereum)",  "unit": "USD"},
        "BNB-USD":  {"name": "BNB",       "unit": "USD"},
        "SOL-USD":  {"name": "SOL (Solana)",    "unit": "USD"},
        "XRP-USD":  {"name": "XRP",       "unit": "USD"},
        "ADA-USD":  {"name": "ADA (Cardano)",   "unit": "USD"},
        "DOGE-USD": {"name": "DOGE (Dogecoin)",  "unit": "USD"},
        "AVAX-USD": {"name": "AVAX (Avalanche)", "unit": "USD"},
        "DOT-USD":  {"name": "DOT (Polkadot)",  "unit": "USD"},
        "LINK-USD": {"name": "LINK (Chainlink)", "unit": "USD"},
    }
}

INDUSTRIAL = {
    "file": "industrial.json",
    "category": "Sanayi & Hammadde",
    "symbols": {
        "HG=F":   {"name": "HG (Bakır)",         "unit": "USD/lb"},
        "ALI=F":  {"name": "ALI (Alüminyum)",     "unit": "USD/ton"},
        "ZN=F":   {"name": "ZN (Çinko)",          "unit": "USD/ton"},
        "NI=F":   {"name": "NI (Nikel)",           "unit": "USD/ton"},
        "SN=F":   {"name": "SN (Kalay)",           "unit": "USD/ton"},
        "PB=F":   {"name": "PB (Kurşun)",          "unit": "USD/ton"},
        "LBS=F":  {"name": "LBS (Kereste)",        "unit": "USD/mbf"},
        "RR=F":   {"name": "RR (Kauçuk)",          "unit": "USc/lb"},
        "URA":    {"name": "URA (Uranyum ETF)",    "unit": "USD"},
        "LIT":    {"name": "LIT (Lityum ETF)",     "unit": "USD"},
        "COPX":   {"name": "COPX (Bakır Madenci)", "unit": "USD"},
        "SLX":    {"name": "SLX (Çelik ETF)",      "unit": "USD"},
        "BDRY":   {"name": "BDRY (Kuru Yük Navlun)","unit": "USD"},
        "REMX":   {"name": "REMX (Nadir Toprak)",  "unit": "USD"},
    }
}

ALL_YF_GROUPS = [
    COMMODITIES_ENERGY,
    COMMODITIES_METALS,
    COMMODITIES_AGRICULTURE,
    INDUSTRIAL,
    CURRENCIES,
    BONDS,
    INDICES,
    CRYPTO,
]
