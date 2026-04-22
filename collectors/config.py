"""
Piyasa Monitörü — Konfigürasyon (Yahoo Finance Only)
EVDS kaldırıldı. Tüm veriler Yahoo Finance'den.
"""

import os
import re
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)
TV_LOGO_BASE = "https://s3-symbol-logo.tradingview.com"

# Yahoo Finance → TradingView sembol eşlemesi (logo URL doğruluğu için)
# Sadece Yahoo Finance sembolü TradingView sembolünden farklı olanlar.
YAHOO_TO_TV = {
    # ── Enerji ──
    "BZ=F": "BRENT",
    "CL=F": "WTI",
    # ── Kıymetli Madenler ──
    "GC=F": "XAUUSD",
    "SI=F": "XAGUSD",
    "PL=F": "XPTUSD",
    "PA=F": "XPDUSD",
    # ── Sanayi ──
    "ZN=F": "ZNC",
    # ── Döviz ──
    "DX-Y.NYB": "DXY",
    # ── Tahvil Faizleri ──
    "^IRX": "US03MY",
    "2YY=F": "US02Y",
    "^FVX": "US05Y",
    "^TNX": "US10Y",
    "^TYX": "US30Y",
    # ── Endeksler ──
    "^GSPC": "SPX",
    "^IXIC": "NDX",
    "^STOXX50E": "SX5E",
    "^FTSE": "UKX",
    "^GDAXI": "DAX",
    "^FCHI": "PX1",
    "^N225": "NI225",
    "^BSESN": "SENSEX",
    "^KS11": "KOSPI",
    "^TWII": "TAIEX",
    "^MERV": "IMV",
    "^AXJO": "XJO",
    "^IBEX": "IBC",
    "000001.SS": "SHCOMP",
}

FOREX_COUNTRY_MAP = {
    "USD": "US", "EUR": "EU", "GBP": "GB", "TRY": "TR", "JPY": "JP", "CHF": "CH",
    "AUD": "AU", "CAD": "CA", "NZD": "NZ", "CNY": "CN", "BRL": "BR", "MXN": "MX",
    "INR": "IN", "ZAR": "ZA", "SEK": "SE", "NOK": "NO", "SGD": "SG", "THB": "TH",
    "KRW": "KR", "PLN": "PL", "HUF": "HU", "AED": "AE", "RUB": "RU", "SAR": "SA",
}


def _tv_symbol_candidates(symbol: str) -> list[str]:
    """TradingView için olası logo URL'lerini üret."""
    if not symbol:
        return []
    clean = symbol.strip()

    # Explicit Yahoo → TradingView mapping
    tv_sym = YAHOO_TO_TV.get(clean)
    if tv_sym:
        # Exchange prefix varsa (ör. BIST:GARAN)
        if ":" in tv_sym:
            exchange, ticker = tv_sym.split(":", 1)
            return [
                f"{TV_LOGO_BASE}/{exchange}-{ticker}.svg",
                f"{TV_LOGO_BASE}/{exchange}-{ticker}--big.svg",
                f"{TV_LOGO_BASE}/{ticker.lower()}.svg",
                f"{TV_LOGO_BASE}/{ticker.lower()}--big.svg",
            ]
        lower = tv_sym.lower()
        return [
            f"{TV_LOGO_BASE}/{lower}.svg",
            f"{TV_LOGO_BASE}/{lower}--big.svg",
        ]

    # Mapping'te yoksa mevcut mantık
    clean = clean.upper()
    base = clean
    if clean.endswith("=X"):
        base = clean[:-2]
    elif clean.endswith("=F"):
        base = clean[:-2]
    exchange = None
    suffix_exchange = {
        ".IS": "BIST",
        ".KS": "KRX",
        ".SS": "SSE",
        ".L": "LSE",
        ".PA": "EURONEXT",
        ".DE": "XETR",
        ".MI": "MIL",
        ".TO": "TSX",
    }
    for suffix, ex in suffix_exchange.items():
        if clean.endswith(suffix):
            exchange = ex
            base = clean[: -len(suffix)]
            break

    normalized = re.sub(r"[^A-Z0-9]", "", base)
    lower = normalized.lower()

    urls = []
    if exchange:
        urls.append(f"{TV_LOGO_BASE}/{exchange}-{normalized}.svg")
        urls.append(f"{TV_LOGO_BASE}/{exchange}-{normalized}--big.svg")
    urls.append(f"{TV_LOGO_BASE}/{lower}.svg")
    urls.append(f"{TV_LOGO_BASE}/{lower}--big.svg")
    return list(dict.fromkeys(urls))


def _tv_forex_pair(symbol: str) -> list[str]:
    """USDTRY=X gibi pariteler için ülke bayrağı ikonları."""
    head = symbol.split("=")[0].upper()
    if len(head) < 6:
        return []
    left, right = head[:3], head[3:6]
    c1 = FOREX_COUNTRY_MAP.get(left)
    c2 = FOREX_COUNTRY_MAP.get(right)
    if not c1 or not c2:
        return []
    return [
        f"{TV_LOGO_BASE}/country/{c1}--big.svg",
        f"{TV_LOGO_BASE}/country/{c2}--big.svg",
    ]


def tradingview_logo_meta(symbol: str, meta: dict) -> dict:
    """
    Sembol için logo metadata üretir.
    İstenirse config'ten `logo_url`, `logo_pair`, `logo_candidates` override edilebilir.
    """
    if meta.get("logo_url") or meta.get("logo_pair") or meta.get("logo_candidates"):
        return {
            "logo_url": meta.get("logo_url"),
            "logo_pair": meta.get("logo_pair"),
            "logo_candidates": meta.get("logo_candidates", []),
        }

    logo_pair = _tv_forex_pair(symbol) if symbol.endswith("=X") else []
    logo_candidates = _tv_symbol_candidates(symbol)

    if symbol.endswith("-USD"):
        coin = re.sub(r"\d", "", symbol.split("-")[0].upper())
        logo_candidates = [f"{TV_LOGO_BASE}/{coin.lower()}.svg"] + logo_candidates
        logo_candidates = list(dict.fromkeys(logo_candidates))

    return {
        "logo_url": logo_candidates[0] if logo_candidates else None,
        "logo_pair": logo_pair,
        "logo_candidates": logo_candidates,
    }
    
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
        "URA":   {"name": "URA (Uranyum ETF)",         "unit": "USD"},
        "KRBN":  {"name": "KRBN (Karbon Kredisi ETF)", "unit": "USD"},
        "USO":   {"name": "USO (Ham Petrol ETF)",      "unit": "USD"},
        "UNG":   {"name": "UNG (Doğalgaz ETF)",        "unit": "USD"},
        "XLE":   {"name": "XLE (Enerji Sektörü ETF)",  "unit": "USD"},
        "XOP":   {"name": "XOP (Petrol & Gaz Arama)",   "unit": "USD"},
        "ICLN":  {"name": "ICLN (Temiz Enerji ETF)",    "unit": "USD"},
        "TAN":   {"name": "TAN (Güneş Enerjisi ETF)",    "unit": "USD"},
        "NLR":   {"name": "NLR (Nükleer Enerji ETF)",   "unit": "USD"},
        "XES":   {"name": "XES (Petrol Servisleri ETF)", "unit": "USD"},
        "OIH":   {"name": "OIH (Oil Services ETF)",      "unit": "USD"},
        "VDE":   {"name": "VDE (Vanguard Energy ETF)",   "unit": "USD"},
        "PXE":   {"name": "PXE (Dinamik Enerji ETF)",    "unit": "USD"},
        "CRAK":  {"name": "CRAK (Rafineri ETF)",         "unit": "USD"},
        "FCG":   {"name": "FCG (Doğalgaz Üreticileri)",  "unit": "USD"},
        "BNO":   {"name": "BNO (Brent Petrol Fonu)",     "unit": "USD"},
        "DBO":   {"name": "DBO (Petrol Fonu)",           "unit": "USD"},
        "UCO":   {"name": "UCO (Ham Petrol 2x)",         "unit": "USD"},
        "BOIL":  {"name": "BOIL (Doğalgaz 2x)",          "unit": "USD"},
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
        "GLD":   {"name": "GLD (Altın ETF)",              "unit": "USD"},
        "SLV":   {"name": "SLV (Gümüş ETF)",              "unit": "USD"},
        "PPLT":  {"name": "PPLT (Platin ETF)",            "unit": "USD"},
        "PALL":  {"name": "PALL (Paladyum ETF)",          "unit": "USD"},
        "GDX":   {"name": "GDX (Altın Madencileri ETF)",   "unit": "USD"},
        "GDXJ":  {"name": "GDXJ (Küçük Altın Madencileri)", "unit": "USD"},
        "SIL":   {"name": "SIL (Gümüş Madencileri ETF)",   "unit": "USD"},
        # Fiziksel Maden Fonları (Kağıt üzerinde değil, kasasında gerçek maden tutan popüler fonlar)
        "PHYS":  {"name": "PHYS (Sprott Fiziksel Altın)", "unit": "USD"},
        "PSLV":  {"name": "PSLV (Sprott Fiziksel Gümüş)", "unit": "USD"},
        "SPPP":  {"name": "SPPP (Sprott Fiziksel Platin & Paladyum)", "unit": "USD"},
        "SIVR":  {"name": "SIVR (Fiziksel Gümüş ETF)", "unit": "USD"},

        # Madencilik Alt Kırılımları ve Spesifik ETF'ler
        "SILJ":  {"name": "SILJ (Küçük Gümüş Madencileri ETF)", "unit": "USD"},
        "RING":  {"name": "RING (Küresel Altın Madencileri)", "unit": "USD"},
        "PICK":  {"name": "PICK (Küresel Maden & Metal Üreticileri)", "unit": "USD"},
        "URNM":  {"name": "URNM (Uranyum Madencileri ETF)", "unit": "USD"}, # Nükleer trendi için çok popüler

        # Endüstriyel / Baz Metal ETF'leri (Vadeli kontratlar yerine fiyatı fon üzerinden takip etmek için)
        "CPER":  {"name": "CPER (Bakır ETF)", "unit": "USD"},
        "DBB":   {"name": "DBB (Baz Metaller Fonu - Al, Zn, Cu)", "unit": "USD"},
        "URA":   {"name": "URA (Uranyum ETF)", "unit": "USD"},
        "IAU":   {"name": "IAU (Altın ETF)", "unit": "USD"},
        "SGOL":  {"name": "SGOL (Fiziksel Altın ETF)", "unit": "USD"},
        "BAR":   {"name": "BAR (GraniteShares Gold)", "unit": "USD"},
        "DBP":   {"name": "DBP (Kıymetli Metaller Fonu)", "unit": "USD"},
        "JJN":   {"name": "JJN (Nikel ETN)", "unit": "USD"},
        "JJT":   {"name": "JJT (Kalay ETN)", "unit": "USD"},
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
        "ZO=F":  {"name": "ZO (Yulaf)",         "unit": "USc/bu"},
        "ZR=F":  {"name": "ZR (Pirinç)",        "unit": "USD/cwt"},
        "CT=F":  {"name": "CT (Pamuk)",         "unit": "USc/lb"},
        "KC=F":  {"name": "KC (Kahve)",         "unit": "USc/lb"},
        "SB=F":  {"name": "SB (Şeker)",         "unit": "USc/lb"},
        "CC=F":  {"name": "CC (Kakao)",         "unit": "USD/ton"},
        "OJ=F":  {"name": "OJ (Portakal Suyu)", "unit": "USc/lb"},
        "LBR=F": {"name": "LBR (Kereste)",       "unit": "USD/mbf"},
        "DBA":   {"name": "DBA (Tarım ETF)",      "unit": "USD"},
        "CORN":  {"name": "CORN (Mısır ETF)",     "unit": "USD"},
        "WEAT":  {"name": "WEAT (Buğday ETF)",    "unit": "USD"},
        "SOYB":  {"name": "SOYB (Soya ETF)",      "unit": "USD"},
        "MOO":   {"name": "MOO (Tarım Şirketleri ETF)", "unit": "USD"},
        "CANE":  {"name": "CANE (Şeker ETF)",     "unit": "USD"},
        "NIB":   {"name": "NIB (Kakao ETN)",      "unit": "USD"},
        "JO":    {"name": "JO (Kahve ETN)",       "unit": "USD"},
        "COW":   {"name": "COW (Hayvancılık ETN)", "unit": "USD"},
        "RJA":   {"name": "RJA (Tarım Endeksi ETN)", "unit": "USD"},
        "FTGC":  {"name": "FTGC (Çeşitlendirilmiş Emtia)", "unit": "USD"},
        "PDBA":  {"name": "PDBA (Optimum Yield Agriculture)", "unit": "USD"},
    }
}

CURRENCIES = {
    "file": "currencies.json",
    "category": "Döviz Kurları",
    "symbols": {
        # TRY çaprazları
        "USDTRY=X": {"name": "USD/TRY", "unit": "TRY"},
        "EURTRY=X": {"name": "EUR/TRY", "unit": "TRY"},
        "GBPTRY=X": {"name": "GBP/TRY", "unit": "TRY"},
        "CHFTRY=X": {"name": "CHF/TRY", "unit": "TRY"},
        "CNYTRY=X": {"name": "CNY/TRY", "unit": "TRY"},
        "SARTRY=X": {"name": "SAR/TRY", "unit": "TRY"},
        "RUBTRY=X": {"name": "RUB/TRY", "unit": "TRY"},
        # Majors
        "EURUSD=X": {"name": "EUR/USD", "unit": "USD"},
        "GBPUSD=X": {"name": "GBP/USD", "unit": "USD"},
        "USDJPY=X": {"name": "USD/JPY", "unit": "JPY"},
        "USDCHF=X": {"name": "USD/CHF", "unit": "CHF"},
        "AUDUSD=X": {"name": "AUD/USD", "unit": "USD"},
        "USDCAD=X": {"name": "USD/CAD", "unit": "CAD"},
        "NZDUSD=X": {"name": "NZD/USD", "unit": "USD"},
        "USDCNY=X": {"name": "USD/CNY", "unit": "CNY"},
        # Gelişen piyasalar & diğer
        "USDBRL=X": {"name": "USD/BRL", "unit": "BRL"},
        "USDMXN=X": {"name": "USD/MXN", "unit": "MXN"},
        "USDINR=X": {"name": "USD/INR", "unit": "INR"},
        "USDZAR=X": {"name": "USD/ZAR", "unit": "ZAR"},
        "USDSEK=X": {"name": "USD/SEK", "unit": "SEK"},
        "USDNOK=X": {"name": "USD/NOK", "unit": "NOK"},
        "USDSGD=X": {"name": "USD/SGD", "unit": "SGD"},
        "USDTHB=X": {"name": "USD/THB", "unit": "THB"},
        "USDKRW=X": {"name": "USD/KRW", "unit": "KRW"},
        # Endeks
        "DX-Y.NYB": {"name": "Dolar Endeksi (DXY)", "unit": ""},
        # Avrupa ve Diğer Çaprazlar
        "EURGBP=X": {"name": "EUR/GBP", "unit": "GBP"},
        "EURCHF=X": {"name": "EUR/CHF", "unit": "CHF"},
        "GBPEUR=X": {"name": "GBP/EUR", "unit": "EUR"},
        # Gelişen Avrupa / Diğer
        "USDPLN=X": {"name": "USD/PLN (Polonya Zlotisi)", "unit": "PLN"},
        "USDHUF=X": {"name": "USD/HUF (Macar Forinti)", "unit": "HUF"},
        "USDAED=X": {"name": "USD/AED (BAE Dirhemi)", "unit": "AED"},
        "USDHKD=X": {"name": "USD/HKD", "unit": "HKD"},
        "USDIDR=X": {"name": "USD/IDR", "unit": "IDR"},
        "USDPHP=X": {"name": "USD/PHP", "unit": "PHP"},
        "USDILS=X": {"name": "USD/ILS", "unit": "ILS"},
        "USDCLP=X": {"name": "USD/CLP", "unit": "CLP"},
        "USDCOP=X": {"name": "USD/COP", "unit": "COP"},
        "USDKZT=X": {"name": "USD/KZT", "unit": "KZT"},
        "USDQAR=X": {"name": "USD/QAR", "unit": "QAR"},
        "EURJPY=X": {"name": "EUR/JPY", "unit": "JPY"},
        "GBPJPY=X": {"name": "GBP/JPY", "unit": "JPY"},
        "EURAUD=X": {"name": "EUR/AUD", "unit": "AUD"},
        "EURNOK=X": {"name": "EUR/NOK", "unit": "NOK"},
    }
}

BONDS = {
    "file": "bonds.json",
    "category": "Tahvil Faizleri",
    "symbols": {
        # ABD Hazine getirileri
        "^IRX":     {"name": "ABD 3 Aylık",       "unit": "%"},
        "2YY=F":    {"name": "ABD 2 Yıllık",       "unit": "%"},
        "^FVX":     {"name": "ABD 5 Yıllık",       "unit": "%"},
        "^TNX":     {"name": "ABD 10 Yıllık",      "unit": "%"},
        "^TYX":     {"name": "ABD 30 Yıllık",      "unit": "%"},
        # Tahvil ETF'leri
        "TLT":      {"name": "TLT (20+ Yıl Tahvil ETF)", "unit": "USD"},
        "IEF":      {"name": "IEF (7-10 Yıl Tahvil ETF)", "unit": "USD"},
        "SHY":      {"name": "SHY (1-3 Yıl Tahvil ETF)", "unit": "USD"},
        "TBT":      {"name": "TBT (Kısa Tahvil 2x Ters)", "unit": "USD"},
        "HYG":      {"name": "HYG (Yüksek Getirili Tahvil)", "unit": "USD"},
        "LQD":      {"name": "LQD (Yatırım Düzeyi Tahvil)", "unit": "USD"},
        "EMB":      {"name": "EMB (Gelişen Piyasa Tahvil)", "unit": "USD"},
        "BNDX":     {"name": "BNDX (Uluslararası Tahvil)", "unit": "USD"},
        "BND":      {"name": "BND (Toplam Tahvil Piyasası)", "unit": "USD"},
        "AGG":      {"name": "AGG (Core US Aggregate)", "unit": "USD"},
        "TIP":      {"name": "TIP (Enflasyona Endeksli Tahvil)", "unit": "USD"},
        "MUB":      {"name": "MUB (Belediye Tahvilleri)", "unit": "USD"},
        "JNK":      {"name": "JNK (High Yield ETF)", "unit": "USD"},
        "BIL":      {"name": "BIL (1-3 Ay Hazine Bonosu)", "unit": "USD"},
        "SGOV":     {"name": "SGOV (0-3 Ay Hazine)", "unit": "USD"},
        "VGIT":     {"name": "VGIT (Orta Vadeli Hazine)", "unit": "USD"},
        "EDV":      {"name": "EDV (Uzun Vadeli Treasury)", "unit": "USD"},
        "TIPS":     {"name": "PIMCO 15+ Year TIPS", "unit": "USD"},
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
        "^AXJO":     {"name": "ASX 200",        "unit": "AUD"},
        "^IBEX":     {"name": "IBEX 35",        "unit": "EUR"},
        "^VIX":     {"name": "VIX (Korku Endeksi)",     "unit": "Puan"},
        "^BVSP":     {"name": "Bovespa",        "unit": "BRL"},
        "^NSEI":     {"name": "Nifty 50",       "unit": "INR"},
        "^JKSE":     {"name": "IDX Composite",  "unit": "IDR"},
        "^TA125.TA": {"name": "TA-125",         "unit": "ILS"},
        "^AEX":      {"name": "AEX",            "unit": "EUR"},
        "^SSMI":     {"name": "SMI",            "unit": "CHF"},
        "^OMX":      {"name": "OMX Stockholm 30", "unit": "SEK"},
        "^N100":     {"name": "Euronext 100",   "unit": "EUR"},
        "^SPTSE":    {"name": "S&P/TSX",        "unit": "CAD"},
        "^KLSE":     {"name": "FTSE Bursa Malaysia", "unit": "MYR"},
    }
}

CRYPTO = {
    "file": "crypto.json",
    "category": "Kripto Paralar",
    "symbols": {
        "BTC-USD":  {"name": "BTC (Bitcoin)",    "unit": "USD"},
        "ETH-USD":  {"name": "ETH (Ethereum)",   "unit": "USD"},
        "BNB-USD":  {"name": "BNB",              "unit": "USD"},
        "SOL-USD":  {"name": "SOL (Solana)",     "unit": "USD"},
        "XRP-USD":  {"name": "XRP",              "unit": "USD"},
        "ADA-USD":  {"name": "ADA (Cardano)",    "unit": "USD"},
        "DOGE-USD": {"name": "DOGE (Dogecoin)",  "unit": "USD"},
        "AVAX-USD": {"name": "AVAX (Avalanche)", "unit": "USD"},
        "DOT-USD":  {"name": "DOT (Polkadot)",   "unit": "USD"},
        "LINK-USD": {"name": "LINK (Chainlink)", "unit": "USD"},
        "POL-USD": {"name": "POL (Polygon)",     "unit": "USD"},
        "TRX-USD":  {"name": "TRX (Tron)",       "unit": "USD"},
        "BCH-USD":  {"name": "BCH (Bitcoin Cash)","unit": "USD"},
        "LTC-USD":  {"name": "LTC (Litecoin)",   "unit": "USD"},
        "UNI7083-USD": {"name": "UNI (Uniswap)", "unit": "USD"},
        "ATOM-USD": {"name": "ATOM (Cosmos)",     "unit": "USD"},
        "NEAR-USD": {"name": "NEAR Protocol",    "unit": "USD"},
        "APT-USD":  {"name": "APT (Aptos)",       "unit": "USD"},
        "SUI20947-USD": {"name": "SUI",           "unit": "USD"},
        "TON11419-USD": {"name": "TON (Toncoin)", "unit": "USD"},
        "HBAR-USD": {"name": "HBAR (Hedera)", "unit": "USD"},
        "XLM-USD": {"name": "XLM (Stellar)", "unit": "USD"},
        "ETC-USD": {"name": "ETC (Ethereum Classic)", "unit": "USD"},
        "FIL-USD": {"name": "FIL (Filecoin)", "unit": "USD"},
        "ARB11841-USD": {"name": "ARB (Arbitrum)", "unit": "USD"},
        "OP-USD": {"name": "OP (Optimism)", "unit": "USD"},
        "SEI-USD": {"name": "SEI", "unit": "USD"},
        "INJ-USD": {"name": "INJ (Injective)", "unit": "USD"},
        "RUNE-USD": {"name": "RUNE (THORChain)", "unit": "USD"},
        "TIA22861-USD": {"name": "TIA (Celestia)", "unit": "USD"},
        "WIF-USD": {"name": "WIF (dogwifhat)", "unit": "USD"},
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
        "LBR=F":  {"name": "LBR (Kereste)",        "unit": "USD/mbf"},
        "RR=F":   {"name": "RR (Kauçuk)",          "unit": "USc/lb"},
        "URA":    {"name": "URA (Uranyum ETF)",    "unit": "USD"},
        "LIT":    {"name": "LIT (Lityum ETF)",     "unit": "USD"},
        "COPX":   {"name": "COPX (Bakır Madenci)", "unit": "USD"},
        "SLX":    {"name": "SLX (Çelik ETF)",      "unit": "USD"},
        "BDRY":   {"name": "BDRY (Kuru Yük Navlun)","unit": "USD"},
        "REMX":   {"name": "REMX (Nadir Toprak)",  "unit": "USD"},
        # Temel Materyaller ve Geniş Sanayi Fonları
        "XLB":    {"name": "XLB (Temel Materyaller ETF)", "unit": "USD"}, # Kimya, ambalaj, inşaat malzemeleri
        "XLI":    {"name": "XLI (Sanayi Sektörü ETF)", "unit": "USD"},    # Ağır sanayi, makine ve havacılık
        "GUNR":   {"name": "GUNR (Küresel Doğal Kaynaklar)", "unit": "USD"},
        
        # Geleceğin Hammaddeleri ve Batarya Teknolojileri (LIT'i tamamlayıcı)
        "BATT":   {"name": "BATT (Batarya Teknolojileri ETF)", "unit": "USD"},
        
        # Altyapı, İnşaat ve Diğer Kaynaklar
        "PAVE":   {"name": "PAVE (Altyapı ve İnşaat ETF)", "unit": "USD"},
        "WOOD":   {"name": "WOOD (Küresel Kereste ve Ormancılık)", "unit": "USD"}, # LBS=F (Kereste) fon karşılığı
        "FIW":    {"name": "FIW (Su Kaynakları ETF)", "unit": "USD"}, # Sanayinin en büyük sarf kalemi
        
        # Taşımacılık ve Lojistik (BDRY'yi tamamlayıcı)
        "IYT":    {"name": "IYT (Taşımacılık Sektörü ETF)", "unit": "USD"},
        "AIRR":   {"name": "AIRR (Industrial Renaissance ETF)", "unit": "USD"},
        "MXI":    {"name": "MXI (Global Materials ETF)", "unit": "USD"},
        "IGE":    {"name": "IGE (North American Natural Resources)", "unit": "USD"},
        "GNR":    {"name": "GNR (Global Natural Resources)", "unit": "USD"},
        "XME":    {"name": "XME (Metals & Mining ETF)", "unit": "USD"},
        "DOV":    {"name": "Dover", "unit": "USD"},
        "IR":     {"name": "Ingersoll Rand", "unit": "USD"},
        "PCAR":   {"name": "Paccar", "unit": "USD"},
        "WM":     {"name": "Waste Management", "unit": "USD"},
    }
}

STOCKS = {
    "file": "stocks.json",
    "category": "Hisse Senetleri",
    "symbols": {
        # ═══════════════════════════════════════
        # BIST — Bankacılık
        # ═══════════════════════════════════════
        "GARAN.IS":  {"name": "Garanti BBVA",      "unit": "TRY"},
        "AKBNK.IS":  {"name": "Akbank",            "unit": "TRY"},
        "YKBNK.IS":  {"name": "Yapı Kredi",        "unit": "TRY"},
        "ISCTR.IS":  {"name": "İş Bankası C",      "unit": "TRY"},
        "VAKBN.IS":  {"name": "VakıfBank",         "unit": "TRY"},
        "HALKB.IS":  {"name": "Halkbank",          "unit": "TRY"},
        "TSKB.IS":   {"name": "TSKB",              "unit": "TRY"},
        "QNBFB.IS":  {"name": "QNB Finansbank",    "unit": "TRY"},
        "ALBRK.IS":  {"name": "Albaraka Türk",     "unit": "TRY"},
        "SKBNK.IS":  {"name": "Şekerbank",         "unit": "TRY"},
        # ═══════════════════════════════════════
        # BIST — Holding & Yatırım
        # ═══════════════════════════════════════
        "KCHOL.IS":  {"name": "Koç Holding",       "unit": "TRY"},
        "SAHOL.IS":  {"name": "Sabancı Holding",   "unit": "TRY"},
        "DOHOL.IS":  {"name": "Doğan Holding",     "unit": "TRY"},
        "AGHOL.IS":  {"name": "AG Anadolu Grubu",  "unit": "TRY"},
        "TKFEN.IS":  {"name": "Tekfen Holding",    "unit": "TRY"},
        "TAVHL.IS":  {"name": "TAV Havalimanları",  "unit": "TRY"},
        "GSRAY.IS":  {"name": "Galatasaray",  "unit": "TRY"},
        # ═══════════════════════════════════════
        # BIST — Sanayi & Üretim
        # ═══════════════════════════════════════
        "EREGL.IS":  {"name": "Ereğli Demir Çelik","unit": "TRY"},
        "TUPRS.IS":  {"name": "Tüpraş",           "unit": "TRY"},
        "ASELS.IS":  {"name": "ASELSAN",           "unit": "TRY"},
        "FROTO.IS":  {"name": "Ford Otosan",       "unit": "TRY"},
        "TOASO.IS":  {"name": "Tofaş Oto.",        "unit": "TRY"},
        "SISE.IS":   {"name": "Şişecam",           "unit": "TRY"},
        "ARCLK.IS":  {"name": "Arçelik",           "unit": "TRY"},
        "VESTL.IS":  {"name": "Vestel",            "unit": "TRY"},
        "OTKAR.IS":  {"name": "Otokar",            "unit": "TRY"},
        "KRDMD.IS":  {"name": "Kardemir D",        "unit": "TRY"},
        "TTRAK.IS":  {"name": "Türk Traktör",      "unit": "TRY"},
        "BRISA.IS":  {"name": "Brisa",             "unit": "TRY"},
        "PETKM.IS":  {"name": "Petkim",            "unit": "TRY"},
        "ENKAI.IS":  {"name": "Enka İnşaat",       "unit": "TRY"},
        "CIMSA.IS":  {"name": "Çimsa",             "unit": "TRY"},
        "OYAKC.IS":  {"name": "Oyak Çimento",      "unit": "TRY"},
        "SASA.IS":   {"name": "SASA Polyester",    "unit": "TRY"},
        "EGEEN.IS":  {"name": "Ege Endüstri",      "unit": "TRY"},
        "CEMTS.IS":  {"name": "Çemtaş Çelik",      "unit": "TRY"},
        "KLMSN.IS":  {"name": "Klimasan",          "unit": "TRY"},
        # ═══════════════════════════════════════
        # BIST — Havacılık & Ulaşım
        # ═══════════════════════════════════════
        "THYAO.IS":  {"name": "THY",               "unit": "TRY"},
        "PGSUS.IS":  {"name": "Pegasus",           "unit": "TRY"},
        "DOAS.IS":   {"name": "Doğuş Otomotiv",    "unit": "TRY"},
        # ═══════════════════════════════════════
        # BIST — Perakende & Tüketim
        # ═══════════════════════════════════════
        "BIMAS.IS":  {"name": "BİM Mağazaları",   "unit": "TRY"},
        "MGROS.IS":  {"name": "Migros",            "unit": "TRY"},
        "SOKM.IS":   {"name": "Şok Market",        "unit": "TRY"},
        "ULKER.IS":  {"name": "Ülker",             "unit": "TRY"},
        "AEFES.IS":  {"name": "Anadolu Efes",      "unit": "TRY"},
        "CCOLA.IS":  {"name": "Coca-Cola İçecek",  "unit": "TRY"},
        # ═══════════════════════════════════════
        # BIST — Telekom & Teknoloji
        # ═══════════════════════════════════════
        "TCELL.IS":  {"name": "Turkcell",          "unit": "TRY"},
        "TTKOM.IS":  {"name": "Türk Telekom",      "unit": "TRY"},
        "LOGO.IS":   {"name": "Logo Yazılım",      "unit": "TRY"},
        # ═══════════════════════════════════════
        # BIST — Enerji
        # ═══════════════════════════════════════
        "AKSEN.IS":  {"name": "Aksa Enerji",       "unit": "TRY"},
        "AKSA.IS":   {"name": "Aksa Akrilik",      "unit": "TRY"},
        # ═══════════════════════════════════════
        # BIST — Madencilik & Tarım
        # ═══════════════════════════════════════
        "KOZAL.IS":  {"name": "Koza Altın",        "unit": "TRY"},
        "KOZAA.IS":  {"name": "Koza Anadolu Metal","unit": "TRY"},
        "GUBRF.IS":  {"name": "Gübre Fabrikaları", "unit": "TRY"},
        "HEKTS.IS":  {"name": "Hektaş",            "unit": "TRY"},
        # ═══════════════════════════════════════
        # BIST — GYO & Sigorta & Finans
        # ═══════════════════════════════════════
        "EKGYO.IS":  {"name": "Emlak Konut GYO",   "unit": "TRY"},
        "ISGYO.IS":  {"name": "İş GYO",            "unit": "TRY"},
        "TURSG.IS":  {"name": "Türkiye Sigorta",   "unit": "TRY"},
        "KONTR.IS":  {"name": "Kontrolmatik",      "unit": "TRY"},
        "ASTOR.IS":  {"name": "Astor Enerji",      "unit": "TRY"},
        "SMRTG.IS":  {"name": "Smart Güneş",       "unit": "TRY"},
        "CWENE.IS":  {"name": "CW Enerji",         "unit": "TRY"},
        "GESAN.IS":  {"name": "Girişim Elektrik",  "unit": "TRY"},
        "ODAS.IS":   {"name": "Odaş Elektrik",     "unit": "TRY"},
        "ZOREN.IS":  {"name": "Zorlu Enerji",      "unit": "TRY"},
        "ENJSA.IS":  {"name": "Enerjisa Enerji",   "unit": "TRY"},
        "ALFAS.IS":  {"name": "Alfa Solar",        "unit": "TRY"},
        "MIATK.IS":  {"name": "Mia Teknoloji",     "unit": "TRY"},
        "KCAER.IS":  {"name": "Kocaer Çelik",      "unit": "TRY"},
        "BORLS.IS":  {"name": "Borlease",          "unit": "TRY"},
        "REEDR.IS":  {"name": "Reeder Teknoloji",  "unit": "TRY"},
        "TABGD.IS":  {"name": "TAB Gıda",          "unit": "TRY"},
        "MAVI.IS":   {"name": "Mavi Giyim",        "unit": "TRY"},
        "KONYA.IS":  {"name": "Konya Çimento",     "unit": "TRY"},
        "SOKM.IS":   {"name": "Şok Market",        "unit": "TRY"},
        "MPARK.IS":  {"name": "MLP Sağlık",        "unit": "TRY"},
        "GENIL.IS":  {"name": "Gen İlaç",          "unit": "TRY"},
        "ECILC.IS":  {"name": "Eczacıbaşı İlaç",   "unit": "TRY"},
        "SELEC.IS":  {"name": "Selçuk Ecza",       "unit": "TRY"},
        "FENER.IS":  {"name": "Fenerbahçe",        "unit": "TRY"},
        "BJKAS.IS":  {"name": "Beşiktaş",          "unit": "TRY"},
        "TRGYO.IS":  {"name": "Torunlar GYO",      "unit": "TRY"},
        "AKFGY.IS":  {"name": "Akfen GYO",         "unit": "TRY"},
        "VAKKO.IS":  {"name": "Vakko",             "unit": "TRY"},
        "PRKME.IS":  {"name": "Park Elektrik",     "unit": "TRY"},
        "DOHOL.IS":  {"name": "Doğan Holding",     "unit": "TRY"},
        "ENERY.IS":  {"name": "Enerya Enerji",     "unit": "TRY"},
        "EUPWR.IS":  {"name": "Europower Enerji",  "unit": "TRY"},
        # ═══════════════════════════════════════
        # ABD — Mega-Cap Teknoloji
        # ═══════════════════════════════════════
        "AAPL":      {"name": "Apple",             "unit": "USD"},
        "MSFT":      {"name": "Microsoft",         "unit": "USD"},
        "GOOGL":     {"name": "Alphabet (Google)", "unit": "USD"},
        "AMZN":      {"name": "Amazon",            "unit": "USD"},
        "NVDA":      {"name": "NVIDIA",            "unit": "USD"},
        "META":      {"name": "Meta (Facebook)",   "unit": "USD"},
        "TSLA":      {"name": "Tesla",             "unit": "USD"},
        "AVGO":      {"name": "Broadcom",          "unit": "USD"},
        "AMD":       {"name": "AMD",               "unit": "USD"},
        "INTC":      {"name": "Intel",             "unit": "USD"},
        "CRM":       {"name": "Salesforce",        "unit": "USD"},
        "ORCL":      {"name": "Oracle",            "unit": "USD"},
        "ADBE":      {"name": "Adobe",             "unit": "USD"},
        "NFLX":      {"name": "Netflix",           "unit": "USD"},
        "CSCO":      {"name": "Cisco",             "unit": "USD"},
        "QCOM":      {"name": "Qualcomm",          "unit": "USD"},
        "TXN":       {"name": "Texas Instruments", "unit": "USD"},
        "IBM":       {"name": "IBM",               "unit": "USD"},
        "NOW":       {"name": "ServiceNow",        "unit": "USD"},
        "PANW":      {"name": "Palo Alto",         "unit": "USD"},
        "MU":        {"name": "Micron",            "unit": "USD"},
        "PLTR":      {"name": "Palantir",          "unit": "USD"},
        "SHOP":      {"name": "Shopify",           "unit": "USD"},
        "UBER":      {"name": "Uber",              "unit": "USD"},
        "SNOW":      {"name": "Snowflake",         "unit": "USD"},
        "CRWD":      {"name": "CrowdStrike",       "unit": "USD"},
        "ARM":       {"name": "Arm Holdings",      "unit": "USD"},
        "ADP":       {"name": "ADP",               "unit": "USD"},
        "INTU":      {"name": "Intuit",            "unit": "USD"},
        # ═══════════════════════════════════════
        # ABD — Finans & Sağlık & Tüketim
        # ═══════════════════════════════════════
        "JPM":       {"name": "JPMorgan Chase",    "unit": "USD"},
        "V":         {"name": "Visa",              "unit": "USD"},
        "MA":        {"name": "Mastercard",        "unit": "USD"},
        "JNJ":       {"name": "Johnson & Johnson", "unit": "USD"},
        "UNH":       {"name": "UnitedHealth",      "unit": "USD"},
        "LLY":       {"name": "Eli Lilly",         "unit": "USD"},
        "PG":        {"name": "Procter & Gamble",  "unit": "USD"},
        "KO":        {"name": "Coca-Cola",         "unit": "USD"},
        "PEP":       {"name": "PepsiCo",           "unit": "USD"},
        "WMT":       {"name": "Walmart",           "unit": "USD"},
        "COST":      {"name": "Costco",            "unit": "USD"},
        "HD":        {"name": "Home Depot",        "unit": "USD"},
        "DIS":       {"name": "Disney",            "unit": "USD"},
        "BAC":       {"name": "Bank of America",   "unit": "USD"},
        "WFC":       {"name": "Wells Fargo",       "unit": "USD"},
        "GS":        {"name": "Goldman Sachs",     "unit": "USD"},
        "MS":        {"name": "Morgan Stanley",    "unit": "USD"},
        "BLK":       {"name": "BlackRock",         "unit": "USD"},
        "BRK":       {"name": "Berkshire",         "unit": "USD"},
        "PFE":       {"name": "Pfizer",            "unit": "USD"},
        "MRK":       {"name": "Merck",             "unit": "USD"},
        "ABBV":      {"name": "AbbVie",            "unit": "USD"},
        "TMO":       {"name": "Thermo Fisher",     "unit": "USD"},
        "ABT":       {"name": "Abbott",            "unit": "USD"},
        "NKE":       {"name": "Nike",              "unit": "USD"},
        "MCD":       {"name": "McDonald's",        "unit": "USD"},
        "SBUX":      {"name": "Starbucks",         "unit": "USD"},
        "CMCSA":     {"name": "Comcast",           "unit": "USD"},
        "T":         {"name": "AT&T",              "unit": "USD"},
        # ═══════════════════════════════════════
        # ABD — Enerji & Sanayi
        # ═══════════════════════════════════════
        "XOM":       {"name": "ExxonMobil",        "unit": "USD"},
        "CVX":       {"name": "Chevron",           "unit": "USD"},
        "BA":        {"name": "Boeing",            "unit": "USD"},
        "CAT":       {"name": "Caterpillar",       "unit": "USD"},
        "GE":        {"name": "GE Aerospace",      "unit": "USD"},
        "RTX":       {"name": "RTX",               "unit": "USD"},
        "LMT":       {"name": "Lockheed Martin",   "unit": "USD"},
        "NOC":       {"name": "Northrop Grumman",  "unit": "USD"},
        "DE":        {"name": "Deere",             "unit": "USD"},
        "HON":       {"name": "Honeywell",         "unit": "USD"},
        "UNP":       {"name": "Union Pacific",     "unit": "USD"},
        "COP":       {"name": "ConocoPhillips",    "unit": "USD"},
        "SLB":       {"name": "Schlumberger",      "unit": "USD"},
        "EOG":       {"name": "EOG Resources",     "unit": "USD"},
        # ═══════════════════════════════════════
        # Küresel — Avrupa
        # ═══════════════════════════════════════
        "ASML":      {"name": "ASML Holding",      "unit": "EUR"},
        "NVO":       {"name": "Novo Nordisk",      "unit": "USD"},
        "SAP":       {"name": "SAP SE",            "unit": "USD"},
        "SHEL":      {"name": "Shell",             "unit": "USD"},
        "AZN":       {"name": "AstraZeneca",       "unit": "USD"},
        "UL":        {"name": "Unilever",          "unit": "USD"},
        "TTE":       {"name": "TotalEnergies",     "unit": "USD"},
        "NVS":       {"name": "Novartis",          "unit": "USD"},
        "ROG":       {"name": "Roche",             "unit": "USD"},
        "BP":        {"name": "BP",                "unit": "USD"},
        "RIO":       {"name": "Rio Tinto",         "unit": "USD"},
        "HSBC":      {"name": "HSBC",              "unit": "USD"},
        "UBS":       {"name": "UBS",               "unit": "USD"},
        "SAN":       {"name": "Santander",         "unit": "USD"},
        "ING":       {"name": "ING",               "unit": "USD"},
        "GSK":       {"name": "GSK",               "unit": "USD"},
        "DTEGY":     {"name": "Deutsche Telekom",  "unit": "USD"},
        "BMWYY":     {"name": "BMW",               "unit": "USD"},
        "VWAGY":     {"name": "Volkswagen",        "unit": "USD"},
        "NSRGY":     {"name": "Nestle",            "unit": "USD"},
        "LRLCY":     {"name": "L'Oreal",           "unit": "USD"},
        "MC":        {"name": "LVMH",              "unit": "USD"},
        # ═══════════════════════════════════════
        # Küresel — Asya-Pasifik
        # ═══════════════════════════════════════
        "TSM":       {"name": "TSMC",              "unit": "USD"},
        "005930.KS": {"name": "Samsung",           "unit": "KRW"},
        "BABA":      {"name": "Alibaba",           "unit": "USD"},
        "PDD":       {"name": "PDD (Pinduoduo)",   "unit": "USD"},
        "TM":        {"name": "Toyota Motor",      "unit": "USD"},
        "SONY":      {"name": "Sony Group",        "unit": "USD"},
        "BHP":       {"name": "BHP Group",         "unit": "USD"},
        "HMC":       {"name": "Honda",             "unit": "USD"},
        "NTDOY":     {"name": "Nintendo",          "unit": "USD"},
        "MUFG":      {"name": "Mitsubishi UFJ",    "unit": "USD"},
        "SMFG":      {"name": "Sumitomo Mitsui",   "unit": "USD"},
        "MELI":      {"name": "MercadoLibre",      "unit": "USD"},
        "INFY":      {"name": "Infosys",           "unit": "USD"},
        "HDB":       {"name": "HDFC Bank",         "unit": "USD"},
        "IBN":       {"name": "ICICI Bank",        "unit": "USD"},

        # ── BIST Ek Paket ─────────────────────────────
        "ANSGR.IS": {"name": "Anadolu Sigorta", "unit": "TRY"},
        "AKGRT.IS": {"name": "Aksigorta", "unit": "TRY"},
        "AGESA.IS": {"name": "Agesa Hayat", "unit": "TRY"},
        "ANHYT.IS": {"name": "Anadolu Hayat", "unit": "TRY"},
        "ISMEN.IS": {"name": "İş Yatırım", "unit": "TRY"},
        "OYYAT.IS": {"name": "Oyak Yatırım", "unit": "TRY"},
        "GLBMD.IS": {"name": "Global Menkul", "unit": "TRY"},
        "GWIND.IS": {"name": "Galata Wind", "unit": "TRY"},
        "NATEN.IS": {"name": "Naturel Enerji", "unit": "TRY"},
        "YEOTK.IS": {"name": "Yeo Teknoloji", "unit": "TRY"},
        "AKFYE.IS": {"name": "Akfen Yenilenebilir", "unit": "TRY"},
        "BIOEN.IS": {"name": "Biotrend", "unit": "TRY"},
        "SUWEN.IS": {"name": "Suwen", "unit": "TRY"},
        "KOTON.IS": {"name": "Koton", "unit": "TRY"},
        "BIGCH.IS": {"name": "BigChefs", "unit": "TRY"},
        "KRONT.IS": {"name": "Kron Teknoloji", "unit": "TRY"},
        "LINK.IS": {"name": "Link Bilgisayar", "unit": "TRY"},
        "DESPC.IS": {"name": "Despec", "unit": "TRY"},
        "INDES.IS": {"name": "İndeks Bilgisayar", "unit": "TRY"},
        "PENTA.IS": {"name": "Penta Teknoloji", "unit": "TRY"},
        "ALARK.IS": {"name": "Alarko Holding", "unit": "TRY"},
        "GLYHO.IS": {"name": "Global Yatırım", "unit": "TRY"},
        "IHLAS.IS": {"name": "İhlas Holding", "unit": "TRY"},
        "NTHOL.IS": {"name": "Net Holding", "unit": "TRY"},
        "GSDHO.IS": {"name": "GSD Holding", "unit": "TRY"},
        "AKCNS.IS": {"name": "Akçansa", "unit": "TRY"},
        "BOBET.IS": {"name": "Boğaziçi Beton", "unit": "TRY"},
        "KRVGD.IS": {"name": "Kervan Gıda", "unit": "TRY"},
        "ULUUN.IS": {"name": "Ulusoy Un", "unit": "TRY"},
        "PNSUT.IS": {"name": "Pınar Süt", "unit": "TRY"},
        "PETUN.IS": {"name": "Pınar Et", "unit": "TRY"},
        "BANVT.IS": {"name": "Banvit", "unit": "TRY"},
        "GOZDE.IS": {"name": "Gözde Girişim", "unit": "TRY"},
        "GOLTS.IS": {"name": "Göltaş Çimento", "unit": "TRY"},
        "NUGYO.IS": {"name": "Nurol GYO", "unit": "TRY"},
        "OZGYO.IS": {"name": "Özderici GYO", "unit": "TRY"},
        "RYGYO.IS": {"name": "Reysaş GYO", "unit": "TRY"},
        "KLGYO.IS": {"name": "Kiler GYO", "unit": "TRY"},
        "DAPGM.IS": {"name": "DAP GYO", "unit": "TRY"},
        "ORGE.IS": {"name": "Orge Enerji", "unit": "TRY"},
        
        # ── ABD Mega/Quality ──────────────────────────
        "AMAT": {"name": "Applied Materials", "unit": "USD"},
        "LRCX": {"name": "Lam Research", "unit": "USD"},
        "KLAC": {"name": "KLA", "unit": "USD"},
        "ANET": {"name": "Arista Networks", "unit": "USD"},
        "MSI": {"name": "Motorola Solutions", "unit": "USD"},
        "CDNS": {"name": "Cadence", "unit": "USD"},
        "SNPS": {"name": "Synopsys", "unit": "USD"},
        "FTNT": {"name": "Fortinet", "unit": "USD"},
        "NET": {"name": "Cloudflare", "unit": "USD"},
        "DDOG": {"name": "Datadog", "unit": "USD"},
        "ZS": {"name": "Zscaler", "unit": "USD"},
        "MDB": {"name": "MongoDB", "unit": "USD"},
        "TEAM": {"name": "Atlassian", "unit": "USD"},
        "PYPL": {"name": "PayPal", "unit": "USD"},
        "SQ": {"name": "Block", "unit": "USD"},
        "COIN": {"name": "Coinbase", "unit": "USD"},
        "KKR": {"name": "KKR", "unit": "USD"},
        "BX": {"name": "Blackstone", "unit": "USD"},
        "SPGI": {"name": "S&P Global", "unit": "USD"},
        "ICE": {"name": "Intercontinental Exchange", "unit": "USD"},
        "CME": {"name": "CME Group", "unit": "USD"},
        "MSCI": {"name": "MSCI", "unit": "USD"},
        "MO": {"name": "Altria", "unit": "USD"},
        "PM": {"name": "Philip Morris", "unit": "USD"},
        "ELV": {"name": "Elevance Health", "unit": "USD"},
        "CI": {"name": "Cigna", "unit": "USD"},
        "CVS": {"name": "CVS Health", "unit": "USD"},
        "MDT": {"name": "Medtronic", "unit": "USD"},
        "ISRG": {"name": "Intuitive Surgical", "unit": "USD"},
        "SYK": {"name": "Stryker", "unit": "USD"},
        "BDX": {"name": "Becton Dickinson", "unit": "USD"},
        "ZTS": {"name": "Zoetis", "unit": "USD"},
        "LOW": {"name": "Lowe's", "unit": "USD"},
        "TGT": {"name": "Target", "unit": "USD"},
        "ROST": {"name": "Ross Stores", "unit": "USD"},
        "TJX": {"name": "TJX", "unit": "USD"},
        "BKNG": {"name": "Booking", "unit": "USD"},
        "ABNB": {"name": "Airbnb", "unit": "USD"},
        "MAR": {"name": "Marriott", "unit": "USD"},
        "HLT": {"name": "Hilton", "unit": "USD"},
        
        # ── ABD Sanayi / Enerji / Ulaştırma ───────────
        "ETN": {"name": "Eaton", "unit": "USD"},
        "PH": {"name": "Parker Hannifin", "unit": "USD"},
        "ITW": {"name": "Illinois Tool Works", "unit": "USD"},
        "EMR": {"name": "Emerson", "unit": "USD"},
        "ROK": {"name": "Rockwell Automation", "unit": "USD"},
        "JCI": {"name": "Johnson Controls", "unit": "USD"},
        "TT": {"name": "Trane Technologies", "unit": "USD"},
        "CSX": {"name": "CSX", "unit": "USD"},
        "NSC": {"name": "Norfolk Southern", "unit": "USD"},
        "FDX": {"name": "FedEx", "unit": "USD"},
        "UPS": {"name": "UPS", "unit": "USD"},
        "DAL": {"name": "Delta", "unit": "USD"},
        "UAL": {"name": "United Airlines", "unit": "USD"},
        "AAL": {"name": "American Airlines", "unit": "USD"},
        "OXY": {"name": "Occidental", "unit": "USD"},
        "MPC": {"name": "Marathon Petroleum", "unit": "USD"},
        "PSX": {"name": "Phillips 66", "unit": "USD"},
        "VLO": {"name": "Valero", "unit": "USD"},
        "KMI": {"name": "Kinder Morgan", "unit": "USD"},
        "WMB": {"name": "Williams Companies", "unit": "USD"},
        
        # ── Avrupa / Global ADR ───────────────────────
        "RACE": {"name": "Ferrari", "unit": "USD"},
        "STLA": {"name": "Stellantis", "unit": "USD"},
        "MBGYY": {"name": "Mercedes-Benz", "unit": "USD"},
        "PRYMY": {"name": "Prysmian", "unit": "USD"},
        "SNY": {"name": "Sanofi", "unit": "USD"},
        "GLE": {"name": "Societe Generale", "unit": "USD"},
        "BNPQY": {"name": "BNP Paribas", "unit": "USD"},
        "DB": {"name": "Deutsche Bank", "unit": "USD"},
        "BBVA": {"name": "BBVA", "unit": "USD"},
        "ISP": {"name": "Intesa Sanpaolo", "unit": "USD"},
        "RHHBY": {"name": "Roche Holding", "unit": "USD"},
        "NOVN": {"name": "Novartis ADR Alt", "unit": "USD"},
        "SI": {"name": "Siemens ADR", "unit": "USD"},
        "AIQUY": {"name": "Air Liquide", "unit": "USD"},
        "DANOY": {"name": "Danone", "unit": "USD"},
        "HEINY": {"name": "Heineken", "unit": "USD"},
        "ADRNY": {"name": "Koninklijke Ahold", "unit": "USD"},
        "FERG": {"name": "Ferguson", "unit": "USD"},
        "RELX": {"name": "RELX", "unit": "USD"},
        "EXPGY": {"name": "Experian", "unit": "USD"},
        
        # ── Asya / LatAm Global ───────────────────────
        "BIDU": {"name": "Baidu", "unit": "USD"},
        "JD": {"name": "JD.com", "unit": "USD"},
        "NTES": {"name": "NetEase", "unit": "USD"},
        "TME": {"name": "Tencent Music", "unit": "USD"},
        "LI": {"name": "Li Auto", "unit": "USD"},
        "NIO": {"name": "NIO", "unit": "USD"},
        "XPEV": {"name": "XPeng", "unit": "USD"},
        "BYDDY": {"name": "BYD", "unit": "USD"},
        "PBR": {"name": "Petrobras", "unit": "USD"},
        "VALE": {"name": "Vale", "unit": "USD"},
        "ITUB": {"name": "Itau Unibanco", "unit": "USD"},
        "NU": {"name": "Nubank", "unit": "USD"},
        "GRAB": {"name": "Grab", "unit": "USD"},
        "SE": {"name": "Sea Ltd", "unit": "USD"},
        "YUMC": {"name": "Yum China", "unit": "USD"},
        "ASX": {"name": "ASE Technology", "unit": "USD"},
        "CHT": {"name": "Chunghwa Telecom", "unit": "USD"},
        "PKX": {"name": "POSCO", "unit": "USD"},
        "KB": {"name": "KB Financial", "unit": "USD"},
        "SHG": {"name": "Shinhan Financial", "unit": "USD"},
        "TCEHY": {"name": "Tencent", "unit": "USD"},
        "BBD": {"name": "Banco Bradesco", "unit": "USD"},
        "CIB": {"name": "Bancolombia", "unit": "USD"},
        "YPF": {"name": "YPF", "unit": "USD"},
        "GGB": {"name": "Gerdau", "unit": "USD"},
        "SID": {"name": "CSN", "unit": "USD"},
        "AU": {"name": "AngloGold Ashanti", "unit": "USD"},
        "GFI": {"name": "Gold Fields", "unit": "USD"},
        "SBSW": {"name": "Sibanye-Stillwater", "unit": "USD"},
        "BAP": {"name": "Credicorp", "unit": "USD"},
        "EC": {"name": "Ecopetrol", "unit": "USD"},
        "PAM": {"name": "Pampa Energia", "unit": "USD"},
        "WDS": {"name": "Woodside Energy", "unit": "USD"},
        "GOLD": {"name": "Barrick Gold", "unit": "USD"},
        "EXK": {"name": "Endeavour Silver", "unit": "USD"},
        "PAAS": {"name": "Pan American Silver", "unit": "USD"},
        "SCCO": {"name": "Southern Copper", "unit": "USD"},
        "BTI": {"name": "British American Tobacco", "unit": "USD"},
        "MRNA": {"name": "Moderna", "unit": "USD"},
        "REGN": {"name": "Regeneron", "unit": "USD"},
        "VRTX": {"name": "Vertex Pharma", "unit": "USD"},
        "GILD": {"name": "Gilead", "unit": "USD"},
        "AMGN": {"name": "Amgen", "unit": "USD"},
        "ADSK": {"name": "Autodesk", "unit": "USD"},
        "WDAY": {"name": "Workday", "unit": "USD"},
        "DOCU": {"name": "DocuSign", "unit": "USD"},
        "OKTA": {"name": "Okta", "unit": "USD"},
        "MSTR": {"name": "MicroStrategy", "unit": "USD"},
        "RBLX": {"name": "Roblox", "unit": "USD"},
        "HUBS": {"name": "HubSpot", "unit": "USD"},
        "TTD": {"name": "Trade Desk", "unit": "USD"},
        "SPOT": {"name": "Spotify", "unit": "USD"},
        "ADDYY": {"name": "Adidas ADR", "unit": "USD"},
        "SCHYY": {"name": "Schneider Electric ADR", "unit": "USD"},
        "EADSY": {"name": "Airbus ADR", "unit": "USD"},
        "DNNNY": {"name": "Danone ADR Alt", "unit": "USD"},
        "RNLSY": {"name": "Renault ADR", "unit": "USD"},
        "VLVLY": {"name": "Volvo ADR", "unit": "USD"},
        "ALIZY": {"name": "Allianz ADR", "unit": "USD"},
        "BAYRY": {"name": "Bayer ADR", "unit": "USD"},
        "IFNNY": {"name": "Infineon ADR", "unit": "USD"},
        "BASFY": {"name": "BASF ADR", "unit": "USD"},
        "DHLGY": {"name": "DHL ADR", "unit": "USD"},
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
    STOCKS,
]
