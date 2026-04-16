"""
Logo İndirici — Tüm sembollerin logolarını indirir ve yerel olarak saklar.
Kullanım: python collectors/fetch_logos.py
"""
import json, os, re, sys, time, requests
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from config import ALL_YF_GROUPS, FOREX_COUNTRY_MAP

ROOT = Path(__file__).resolve().parent.parent
LOGO_DIR = ROOT / "site" / "assets" / "logos"
LOGO_DIR.mkdir(parents=True, exist_ok=True)
DATA_DIR = ROOT / "data"
SITE_DATA = ROOT / "site" / "data"

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"

# ══════════════════════════════════════════════════
#  Logo Kaynak Haritaları
# ══════════════════════════════════════════════════

# Kripto → CoinGecko slug
CRYPTO_CG = {
    "BTC-USD": "bitcoin", "ETH-USD": "ethereum", "BNB-USD": "binancecoin",
    "SOL-USD": "solana", "XRP-USD": "ripple", "ADA-USD": "cardano",
    "DOGE-USD": "dogecoin", "AVAX-USD": "avalanche-2", "DOT-USD": "polkadot",
    "LINK-USD": "chainlink", "MATIC-USD": "matic-network", "TRX-USD": "tron",
    "BCH-USD": "bitcoin-cash", "LTC-USD": "litecoin", "UNI7083-USD": "uniswap",
    "ATOM-USD": "cosmos", "NEAR-USD": "near", "APT-USD": "aptos",
    "SUI20947-USD": "sui",
}

# Hisse → şirket domain (Google favicon için)
STOCK_DOMAINS = {
    "AAPL": "apple.com", "MSFT": "microsoft.com", "GOOGL": "google.com",
    "AMZN": "amazon.com", "NVDA": "nvidia.com", "META": "meta.com",
    "TSLA": "tesla.com", "AVGO": "broadcom.com", "AMD": "amd.com",
    "INTC": "intel.com", "CRM": "salesforce.com", "ORCL": "oracle.com",
    "ADBE": "adobe.com", "NFLX": "netflix.com", "JPM": "jpmorganchase.com",
    "V": "visa.com", "MA": "mastercard.com", "JNJ": "jnj.com",
    "UNH": "unitedhealthgroup.com", "LLY": "lilly.com", "PG": "pg.com",
    "KO": "coca-cola.com", "PEP": "pepsico.com", "WMT": "walmart.com",
    "COST": "costco.com", "HD": "homedepot.com", "DIS": "disney.com",
    "XOM": "exxonmobil.com", "CVX": "chevron.com", "BA": "boeing.com",
    "CAT": "caterpillar.com", "ASML": "asml.com", "NVO": "novonordisk.com",
    "SAP": "sap.com", "SHEL": "shell.com", "AZN": "astrazeneca.com",
    "UL": "unilever.com", "TTE": "totalenergies.com", "TSM": "tsmc.com",
    "005930.KS": "samsung.com", "BABA": "alibaba.com", "PDD": "pinduoduo.com",
    "TM": "toyota.com", "SONY": "sony.com", "BHP": "bhp.com",
    # BIST
    "GARAN.IS": "garantibbva.com.tr", "AKBNK.IS": "akbank.com",
    "YKBNK.IS": "yapikredi.com.tr", "ISCTR.IS": "isbank.com.tr",
    "VAKBN.IS": "vakifbank.com.tr", "HALKB.IS": "halkbank.com.tr",
    "TSKB.IS": "tskb.com.tr", "QNBFB.IS": "qnbfinansbank.com",
    "ALBRK.IS": "albaraka.com.tr", "SKBNK.IS": "sekerbank.com.tr",
    "KCHOL.IS": "koc.com.tr", "SAHOL.IS": "sabanci.com",
    "DOHOL.IS": "doganholding.com.tr", "AGHOL.IS": "anadolugrubu.com.tr",
    "TKFEN.IS": "tekfen.com.tr", "TAVHL.IS": "tavhavalimanlari.com.tr",
    "GSRAY.IS": "galatasaray.org", "EREGL.IS": "erdemir.com.tr",
    "TUPRS.IS": "tupras.com.tr", "ASELS.IS": "aselsan.com.tr",
    "FROTO.IS": "fordotosan.com.tr", "TOASO.IS": "tofas.com.tr",
    "SISE.IS": "sisecam.com.tr", "ARCLK.IS": "arcelik.com.tr",
    "VESTL.IS": "vestel.com.tr", "OTKAR.IS": "otokar.com.tr",
    "KRDMD.IS": "kardemir.com", "TTRAK.IS": "turktraktor.com.tr",
    "BRISA.IS": "brisa.com.tr", "PETKM.IS": "petkim.com.tr",
    "ENKAI.IS": "enka.com", "CIMSA.IS": "cimsa.com.tr",
    "OYAKC.IS": "oyakcimento.com", "SASA.IS": "sfrplastik.com",
    "EGEEN.IS": "egeendustri.com.tr", "CEMTS.IS": "cemtas.com.tr",
    "KLMSN.IS": "klimasan.com.tr", "THYAO.IS": "turkishairlines.com",
    "PGSUS.IS": "flypgs.com", "DOAS.IS": "dogusotomotiv.com.tr",
    "BIMAS.IS": "bim.com.tr", "MGROS.IS": "migros.com.tr",
    "SOKM.IS": "sokmarket.com.tr", "ULKER.IS": "ulker.com.tr",
    "AEFES.IS": "anadoluefes.com", "CCOLA.IS": "cci.com.tr",
    "TCELL.IS": "turkcell.com.tr", "TTKOM.IS": "turktelekom.com.tr",
    "LOGO.IS": "logo.com.tr", "AKSEN.IS": "aksaenerji.com.tr",
    "AKSA.IS": "aksa.com", "KOZAL.IS": "kozaaltin.com.tr",
    "KOZAA.IS": "kozamaden.com.tr", "GUBRF.IS": "gubretas.com.tr",
    "HEKTS.IS": "hektas.com.tr", "EKGYO.IS": "emlakkonut.com.tr",
    "ISGYO.IS": "isgyo.com.tr", "TURSG.IS": "turkiyesigorta.com.tr",
    "KONTR.IS": "kontrolmatik.com",
}

# ETF → fon sağlayıcı domain
ETF_DOMAINS = {
    "URA": "globalxetfs.com", "KRBN": "kraneshares.com",
    "USO": "uscfinvestments.com", "UNG": "uscfinvestments.com",
    "XLE": "ssga.com", "XOP": "ssga.com", "ICLN": "ishares.com",
    "TAN": "invesco.com", "NLR": "vaneck.com",
    "GLD": "ssga.com", "SLV": "ishares.com",
    "PPLT": "aberdeenstandard.com", "PALL": "aberdeenstandard.com",
    "GDX": "vaneck.com", "GDXJ": "vaneck.com", "SIL": "globalxetfs.com",
    "PHYS": "sprott.com", "PSLV": "sprott.com", "SPPP": "sprott.com",
    "SIVR": "aberdeenstandard.com", "SILJ": "etfmg.com",
    "RING": "ishares.com", "PICK": "ishares.com",
    "URNM": "sprott.com", "CPER": "uscfinvestments.com",
    "DBB": "invesco.com", "DBA": "invesco.com",
    "CORN": "teucrium.com", "WEAT": "teucrium.com",
    "SOYB": "teucrium.com", "MOO": "vaneck.com",
    "LIT": "globalxetfs.com", "COPX": "globalxetfs.com",
    "SLX": "vaneck.com", "BDRY": "etfmg.com", "REMX": "vaneck.com",
    "XLB": "ssga.com", "XLI": "ssga.com", "GUNR": "flexshares.com",
    "BATT": "amplifyetfs.com", "PAVE": "globalxetfs.com",
    "WOOD": "ishares.com", "FIW": "firsttrust.com", "IYT": "ishares.com",
    "TLT": "ishares.com", "IEF": "ishares.com", "SHY": "ishares.com",
    "TBT": "proshares.com", "HYG": "ishares.com", "LQD": "ishares.com",
    "EMB": "ishares.com", "BNDX": "vanguard.com",
}


def safe_id(symbol):
    """Symbol ID'yi dosya adına çevir."""
    return re.sub(r"[^a-z0-9]+", "-", symbol.lower()).strip("-")


def download(url, dest, timeout=15):
    """URL'den dosya indir. Başarılıysa True döner."""
    try:
        r = requests.get(url, headers={"User-Agent": UA}, timeout=timeout, allow_redirects=True)
        if r.status_code == 200 and len(r.content) > 200:
            with open(dest, "wb") as f:
                f.write(r.content)
            return True
    except Exception:
        pass
    return False


def fetch_crypto_logo(symbol):
    """CoinGecko API ile kripto logosu indir."""
    cg_id = CRYPTO_CG.get(symbol)
    if not cg_id:
        return False
    dest = LOGO_DIR / f"{safe_id(symbol)}.png"
    if dest.exists():
        return True
    try:
        api = f"https://api.coingecko.com/api/v3/coins/{cg_id}"
        r = requests.get(api, headers={"User-Agent": UA}, timeout=15,
                         params={"localization": "false", "tickers": "false",
                                 "market_data": "false", "community_data": "false"})
        if r.status_code == 200:
            img_url = r.json().get("image", {}).get("small")
            if img_url and download(img_url, dest):
                return True
    except Exception:
        pass
    # Fallback: doğrudan bilinen URL dene
    fallbacks = [
        f"https://assets.coingecko.com/coins/images/1/small/{cg_id}.png",
        f"https://cryptologos.cc/logos/{cg_id}-{symbol.split('-')[0].lower()}-logo.png",
    ]
    for url in fallbacks:
        if download(url, dest):
            return True
    return False


def fetch_flag(country_code):
    """Ülke bayrağı PNG indir."""
    cc = country_code.lower()
    dest = LOGO_DIR / f"flag-{cc}.png"
    if dest.exists():
        return True
    urls = [
        f"https://flagcdn.com/w80/{cc}.png",
        f"https://flagsapi.com/{cc.upper()}/flat/64.png",
    ]
    for url in urls:
        if download(url, dest):
            return True
    return False


def fetch_forex_flags(symbol):
    """Döviz çifti için iki ülke bayrağı indir."""
    head = symbol.split("=")[0].upper()
    if len(head) < 6:
        return False
    left, right = head[:3], head[3:6]
    c1 = FOREX_COUNTRY_MAP.get(left, "").lower()
    c2 = FOREX_COUNTRY_MAP.get(right, "").lower()
    ok = True
    if c1:
        ok = fetch_flag(c1) and ok
    if c2:
        ok = fetch_flag(c2) and ok
    return ok


def fetch_stock_logo(symbol):
    """Google favicon ile hisse/ETF logosu indir."""
    domain = STOCK_DOMAINS.get(symbol) or ETF_DOMAINS.get(symbol)
    if not domain:
        return False
    dest = LOGO_DIR / f"{safe_id(symbol)}.png"
    if dest.exists():
        return True
    urls = [
        f"https://www.google.com/s2/favicons?sz=128&domain={domain}",
        f"https://logo.clearbit.com/{domain}",
        f"https://icons.duckduckgo.com/ip3/{domain}.ico",
    ]
    for url in urls:
        if download(url, dest):
            return True
    return False


def fetch_generic_logo(symbol):
    """TradingView CDN ile genel logo dene."""
    from config import YAHOO_TO_TV, TV_LOGO_BASE
    dest = LOGO_DIR / f"{safe_id(symbol)}.png"
    if dest.exists():
        return True
    tv = YAHOO_TO_TV.get(symbol, "").lower()
    if not tv:
        clean = symbol.replace("=F", "").replace("=X", "").replace("^", "")
        clean = re.sub(r"[^A-Za-z0-9]", "", clean).lower()
        tv = clean
    urls = [
        f"{TV_LOGO_BASE}/{tv}.svg",
        f"{TV_LOGO_BASE}/{tv}--big.svg",
    ]
    for url in urls:
        if download(url, dest):
            return True
    return False


def update_json_logos():
    """JSON dosyalarındaki logo alanlarını yerel yollarla güncelle."""
    files = [
        "commodities_energy.json", "commodities_metals.json",
        "commodities_agriculture.json", "industrial.json",
        "currencies.json", "bonds.json", "indices.json",
        "crypto.json", "stocks.json",
    ]
    for ddir in [DATA_DIR, SITE_DATA]:
        for fname in files:
            fpath = ddir / fname
            if not fpath.exists():
                continue
            with open(fpath, "r", encoding="utf-8") as f:
                data = json.load(f)

            changed = False
            for s in data.get("series", []):
                sid = s.get("id", "")
                local_file = LOGO_DIR / f"{safe_id(sid)}.png"
                local_path = f"assets/logos/{safe_id(sid)}.png"
                if local_file.exists() and s.get("logo_local") != local_path:
                    s["logo_local"] = local_path
                    changed = True

                # Forex bayrak çiftleri
                if sid.endswith("=X"):
                    head = sid.split("=")[0].upper()
                    if len(head) >= 6:
                        left, right = head[:3], head[3:6]
                        c1 = FOREX_COUNTRY_MAP.get(left, "").lower()
                        c2 = FOREX_COUNTRY_MAP.get(right, "").lower()
                        pair = []
                        if c1 and (LOGO_DIR / f"flag-{c1}.png").exists():
                            pair.append(f"assets/logos/flag-{c1}.png")
                        if c2 and (LOGO_DIR / f"flag-{c2}.png").exists():
                            pair.append(f"assets/logos/flag-{c2}.png")
                        if len(pair) == 2 and s.get("logo_pair_local") != pair:
                            s["logo_pair_local"] = pair
                            changed = True

            if changed:
                with open(fpath, "w", encoding="utf-8") as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)

        # summary.json
        spath = ddir / "summary.json"
        if spath.exists():
            with open(spath, "r", encoding="utf-8") as f:
                data = json.load(f)
            changed = False
            for s in data.get("series", []):
                sid = s.get("id", "")
                local_file = LOGO_DIR / f"{safe_id(sid)}.png"
                local_path = f"assets/logos/{safe_id(sid)}.png"
                if local_file.exists() and s.get("logo_local") != local_path:
                    s["logo_local"] = local_path
                    changed = True
            if changed:
                with open(spath, "w", encoding="utf-8") as f:
                    json.dump(data, f, ensure_ascii=False)


def main():
    print("🖼️  Logo İndirici v1")
    print(f"   Hedef: {LOGO_DIR}\n")

    ok, fail = 0, 0
    for group in ALL_YF_GROUPS:
        cat = group["category"]
        print(f"\n{'='*50}")
        print(f"📦 {cat} ({len(group['symbols'])} sembol)")
        for symbol in group["symbols"]:
            sid = safe_id(symbol)
            dest = LOGO_DIR / f"{sid}.png"

            # Zaten varsa atla
            if dest.exists():
                print(f"   ⏭️  {symbol}: zaten var")
                ok += 1
                continue

            success = False

            # Kripto
            if symbol in CRYPTO_CG:
                success = fetch_crypto_logo(symbol)
            # Döviz
            elif symbol.endswith("=X"):
                success = fetch_forex_flags(symbol)
            # Hisse/ETF
            elif symbol in STOCK_DOMAINS or symbol in ETF_DOMAINS:
                success = fetch_stock_logo(symbol)

            # Genel fallback (TradingView CDN)
            if not success:
                success = fetch_generic_logo(symbol)

            if success:
                print(f"   ✅ {symbol}")
                ok += 1
            else:
                print(f"   ❌ {symbol}: logo bulunamadı")
                fail += 1

            time.sleep(0.3)

    print(f"\n{'='*50}")
    print(f"✅ {ok} logo indirildi/mevcut, ❌ {fail} başarısız")

    print("\n📝 JSON dosyaları güncelleniyor...")
    update_json_logos()
    print("✅ Tamamlandı!")


if __name__ == "__main__":
    main()
