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
    clean = symbol.strip().upper()
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
        "LBS=F": {"name": "LBS (Kereste)",       "unit": "USD/mbf"},
        "DBA":   {"name": "DBA (Tarım ETF)",      "unit": "USD"},
        "CORN":  {"name": "CORN (Mısır ETF)",     "unit": "USD"},
        "WEAT":  {"name": "WEAT (Buğday ETF)",    "unit": "USD"},
        "SOYB":  {"name": "SOYB (Soya ETF)",      "unit": "USD"},
        "MOO":   {"name": "MOO (Tarım Şirketleri ETF)", "unit": "USD"},
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
        "MATIC-USD":{"name": "MATIC (Polygon)",  "unit": "USD"},
        "TRX-USD":  {"name": "TRX (Tron)",       "unit": "USD"},
        "BCH-USD":  {"name": "BCH (Bitcoin Cash)","unit": "USD"},
        "LTC-USD":  {"name": "LTC (Litecoin)",   "unit": "USD"},
        "UNI7083-USD": {"name": "UNI (Uniswap)", "unit": "USD"},
        "ATOM-USD": {"name": "ATOM (Cosmos)",     "unit": "USD"},
        "NEAR-USD": {"name": "NEAR Protocol",    "unit": "USD"},
        "APT-USD":  {"name": "APT (Aptos)",       "unit": "USD"},
        "SUI20947-USD": {"name": "SUI",           "unit": "USD"},
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
        # ═══════════════════════════════════════
        # ABD — Enerji & Sanayi
        # ═══════════════════════════════════════
        "XOM":       {"name": "ExxonMobil",        "unit": "USD"},
        "CVX":       {"name": "Chevron",           "unit": "USD"},
        "BA":        {"name": "Boeing",            "unit": "USD"},
        "CAT":       {"name": "Caterpillar",       "unit": "USD"},
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
