"""
EVDS3 Seri Kodu Keşif Aracı
Hangi seri kodlarının çalıştığını test eder, alternatifleri dener.

    python collectors/debug_evds_series.py
"""

import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from config import EVDS_API_KEY

from evds import evdsAPI

# Test edilecek seri kodları: [açıklama, [denenecek_kodlar]]
SERIES_TO_TEST = [
    # TÜFE
    ("TÜFE Aylık %", ["TP.FG.J0", "TP.TUFE1YG.T1"]),
    ("TÜFE Yıllık %", ["TP.FG.J1", "TP.TUFE1YG.T11", "TP.FE.OKTG01"]),

    # ÜFE / Yİ-ÜFE
    ("ÜFE Aylık %", ["TP.FG.J2T1", "TP.FG.J2", "TP.YIUFE2.Y1"]),
    ("ÜFE Yıllık %", ["TP.FG.J4T1", "TP.FG.J4", "TP.YIUFE2.Y11"]),

    # Faiz
    ("AOFM", ["TP.TRB.AGORT", "TP.APIFON4", "TP.PY.P01"]),
    ("Politika Faizi", ["TP.PY.P01", "TP.PY.P02", "TP.PY.P03"]),

    # Dış Ticaret
    ("İhracat", ["TP.TS.XM01", "TP.DT.IHRC01", "TP.ODEMGOS.IHRGOS"]),
    ("İthalat", ["TP.TS.IM01", "TP.DT.ITHLT01", "TP.ODEMGOS.ITHGOS"]),
    ("Dış Ticaret Dengesi", ["TP.TS.TI01", "TP.DT.DTIGE01"]),

    # Güven
    ("Tüketici Güven", ["TP.TG2.Y01", "TP.TG3.Y01"]),
    ("Reel Sektör Güven", ["TP.RSKS.G1", "TP.RSKS.A1"]),

    # Sanayi
    ("Sanayi Üretim Endeksi", ["TP.SANURA.S1", "TP.N2SY01", "TP.SANAYI2015.Y1"]),
    ("Kapasite Kullanım", ["TP.KKO.G1", "TP.KKO2.G1", "TP.KAPKULL.G1"]),

    # Döviz Kuru
    ("USD/TRY Alış", ["TP.DK.USD.A.YTL", "TP.DK.USD.A"]),
    ("EUR/TRY Alış", ["TP.DK.EUR.A.YTL", "TP.DK.EUR.A"]),

    # Para Politikası
    ("M2 Para Arzı", ["TP.PR.M2YTL", "TP.PR.M2"]),
]

print("=" * 60)
print("🔍 EVDS3 Seri Kodu Keşif Aracı")
print("=" * 60)

evds_client = evdsAPI(EVDS_API_KEY)

working = []
failed = []

for name, codes in SERIES_TO_TEST:
    print(f"\n📊 {name}")
    found = False

    for code in codes:
        try:
            data = evds_client.get_data(
                [code],
                startdate="01-01-2025",
                enddate="02-04-2026",
            )

            if data is not None and not data.empty:
                rows = len(data)
                print(f"   ✅ {code} → {rows} satır")
                working.append({"name": name, "code": code, "rows": rows})
                found = True
                break  # İlk çalışanı al
            else:
                print(f"   ❌ {code} → Boş veri")

        except Exception as e:
            err_msg = str(e)[:80]
            print(f"   ❌ {code} → {err_msg}")

        time.sleep(0.5)

    if not found:
        failed.append(name)
        print(f"   ⛔ Hiçbir kod çalışmadı!")

    time.sleep(1)

# Özet
print("\n" + "=" * 60)
print("📋 SONUÇ:")
print(f"   ✅ Çalışan: {len(working)}")
for w in working:
    print(f"      {w['name']}: {w['code']} ({w['rows']} satır)")

print(f"\n   ❌ Başarısız: {len(failed)}")
for f in failed:
    print(f"      {f}")

print("\n" + "=" * 60)
print("Bu sonucu bana gönder — config.py'deki seri kodlarını güncelleyeceğim!")