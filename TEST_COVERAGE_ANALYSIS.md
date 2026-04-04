# Test Kapsama Analizi - Piyasa Monitoru

## Mevcut Durum

Projede **resmi bir test altyapisi bulunmuyor**. Mevcut test benzeri dosyalar yalnizca API baglantisini manuel olarak dogrulayan debug scriptleridir:

| Dosya | Amac |
|-------|------|
| `collectors/debug_test.py` | Yahoo Finance API ve TCMB EVDS baglanti testi |
| `collectors/debug_tcmb.py` | TCMB EVDS endpoint kesfetme araci |
| `collectors/debug_evds_series.py` | EVDS seri kodlarini dogrulama |

- Test framework'u yok (pytest, jest, vb.)
- CI/CD pipeline'inda test adimi yok
- Birim testleri, entegrasyon testleri veya e2e testleri yok

---

## Onerilen Test Iyilestirme Alanlari

### 1. Python Collectors - Birim Testleri (ONCELIK: YUKSEK)

**Hedef dosya:** `collectors/yahoo_finance.py`

Bu dosyadaki `calculate_changes()` fonksiyonu tamamen saf (pure) bir fonksiyondur ve kolayca test edilebilir. Asagidaki senaryolar test edilmelidir:

- **Normal veri ile degisim hesaplama:** 1 gunluk, 1 haftalik, 1 aylik, 3 aylik, YTD ve 1 yillik degisim yuzdeleri
- **Sinir durumlari:** Bos liste, tek eleman, sifir degerli eski fiyat, None degerleri
- **YTD hesaplamasi:** Yil basi ve yil sonu verileri, yil degisimi
- **Negatif degisim:** Dusus senaryolari

**Hedef dosya:** `collectors/fred_macro.py`

Bu dosyadaki `calculate_changes()` fonksiyonu da benzer sekilde test edilmelidir:

- Onceki donem degisimi (`prev_pct`)
- YTD degisimi
- Yillik degisim (`yoy_pct`)

**Tahmini etki:** Bu iki fonksiyon tum fiyat degisimi hesaplamalarinin temelini olusturuyor. Hatali hesaplamalar tum dashboard'a yanlis veri yansitir.

---

### 2. Yahoo Finance API Yanit Ayrıstirma (ONCELIK: YUKSEK)

**Hedef fonksiyon:** `fetch_yahoo_direct()` - API yanit parse islemi

Mock ile test edilmesi gereken senaryolar:

- Basarili API yaniti: `chart.result[0].timestamp` ve `indicators.quote[0].close` dogru parse ediliyor mu?
- Bos yanit (`result: []`): `None` donuyor mu?
- Eksik alanlar (`timestamp` var ama `close` yok): Hata firlatmadan `None` donuyor mu?
- `None` degerli `close` elemanlari: Filtreleniyor mu?
- HTTP hatalari (429 rate limit, 500 server error): Exception yakalanip `None` donuyor mu?

---

### 3. Netlify Functions - API Testleri (ONCELIK: ORTA)

**`ai-analysis.js`:**
- Gecerli kategori parametresi ile dogru analiz metni donuyor mu?
- Gecersiz/eksik `cat` parametresi ile `genel` kategorisine fallback yapiyor mu?
- CORS header'lari dogru mu?
- Yanit formati `{ analysis: string }` mi?

**`iran-state.js`:**
- GET istegi mevcut state'i donduruyor mu?
- State yokken DEFAULT degerleri donuyor mu?
- POST ile gecerli PIN ve veri: state guncelleniyor mu?
- Yanlis PIN ile 403 donuyor mu?
- OPTIONS istegi (CORS preflight) 200 donduruyor mu?
- Base64 encoded body dogru decode ediliyor mu?
- Gecersiz JSON body ile hata yonetimi

**`rss-proxy.js`:**
- `q` parametresi olmadan 400 donuyor mu?
- XML parse islemi: `<item>` bloklari dogru cikartiliyor mu?
- CDATA wrapping temizleniyor mu?
- Maksimum 10 haber siniri uygulanıyor mu?
- Redirect takibi calisiyor mu?
- Timeout durumunda hata yonetimi

---

### 4. Frontend JavaScript - Birim Testleri (ONCELIK: ORTA)

**`site/assets/js/app.js`** icindeki yardimci fonksiyonlar:

- `fp()` (format price): Fiyat formatlamasi dogru mu? (ondalik basamak, binlik ayirici)
- `fc()` (format change): Yuzde degisim formatlamasi, renk kodlari
- `fs()` (find series): Seri ID'sine gore dogru seri bulunuyor mu?
- `fj()` (fetch JSON): Hata durumlarinda davranisi
- `makeChart()`: Chart.js konfigurasyonu dogru olusturuluyor mu?

---

### 5. Veri Butunlugu Testleri (ONCELIK: ORTA)

**`collectors/config.py`** icindeki konfigürasyon dogrulamasi:

- Tum semboller gecerli Yahoo Finance formatinda mi? (ornek: `=F`, `-USD`, `.IS` sonekleri)
- Tekrarlanan sembol var mi? (HG=F ve LBS=F hem metals hem industrial'da var - kasitli mi?)
- Tum gruplarin `file`, `category`, `symbols` alanlari mevcut mu?
- Her sembolun `name` ve `unit` alanlari dolu mu?

**JSON cikti dosyalari:**
- Cikti JSON sema dogrulamasi (her seride `id`, `name`, `current`, `data` alanlari var mi?)
- `data` dizisindeki tarih formati tutarli mi? (`YYYY-MM-DD`)
- `high_52w >= low_52w` kontrolu

---

### 6. CI/CD Pipeline'ina Test Adimi Ekleme (ONCELIK: YUKSEK)

Mevcut GitHub Actions workflow'larina test adimi eklenmeli:

```yaml
# .github/workflows/update-market.yml icine eklenecek
- name: Testleri calistir
  run: |
    pip install pytest
    pytest tests/ -v
```

Bu sayede her veri guncelleme oncesinde temel hesaplama mantigi dogrulanir ve hatali veri uretimi onlenir.

---

## Onerilen Test Altyapisi

### Python (collectors)
- **Framework:** `pytest`
- **Mock:** `unittest.mock` veya `pytest-mock`
- **Kapsam:** `pytest-cov`

### JavaScript (netlify functions + frontend)
- **Framework:** `jest` veya `vitest`
- **Mock:** `jest` dahili mock'lari

### Dosya Yapisi
```
tests/
  python/
    test_calculate_changes.py    # Degisim hesaplama birim testleri
    test_yahoo_parser.py         # API yanit parse testleri
    test_fred_macro.py           # FRED veri isleme testleri
    test_config_integrity.py     # Konfigurasyon dogrulama
  javascript/
    ai-analysis.test.js          # AI analiz endpoint testi
    iran-state.test.js           # Iran state endpoint testi
    rss-proxy.test.js            # RSS proxy endpoint testi
    app-utils.test.js            # Frontend yardimci fonksiyon testleri
```

---

## Oncelik Siralaması

| Oncelik | Alan | Neden |
|---------|------|-------|
| 1 | `calculate_changes()` birim testleri | Tum dashboard verilerinin temeli, saf fonksiyon, test etmesi kolay |
| 2 | CI/CD'ye test adimi ekleme | Otomatik dogrulama olmadan testlerin degeri sinirli |
| 3 | Yahoo API yanit parse testleri | Dis API'ye bagimli, format degisikliklerini erken yakalama |
| 4 | Netlify function testleri | API guvenilirligini saglama, ozellikle guvenlik (PIN dogrulama) |
| 5 | Konfigurasyon butunluk testleri | Tekrarlanan semboller ve eksik alan tespiti |
| 6 | Frontend yardimci fonksiyon testleri | Kullaniciya gosterilen verilerin dogru formatlanmasi |

---

## Guvenlik Notu

`iran-state.js` dosyasinda PIN (`isedes`) kodda acik olarak yazili. Bu bir guvenlik riski olusturur ve environment variable'a tasinmalidir. Test yazilirken bu durum da ele alinmalidir.
