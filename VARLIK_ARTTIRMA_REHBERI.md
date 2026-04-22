# Varlık Sayısını Artırma Rehberi (iran-risk hariç)

Bu rehber, `iran-risk` sayfasına dokunmadan diğer piyasa sayfalarındaki varlıkları artırmak için hızlı bir operasyon akışı sunar.

## 1) Sayfa → veri dosyası eşleşmesi

Site sayfaları doğrudan `site/data/*.json` dosyalarını kullanır. Veri üretimi ise `collectors/config.py` içindeki kategori tanımlarından gelir.

- Tahviller → `bonds.json`
- Emtia Enerji → `commodities_energy.json`
- Emtia Metaller → `commodities_metals.json`
- Emtia Tarım → `commodities_agriculture.json`
- Sanayi → `industrial.json`
- Kurlar → `currencies.json`
- Endeksler → `indices.json`
- Kripto → `crypto.json`
- Hisseler → `stocks.json`

> Not: `iran-risk.html` ayrı bir sayfadır ve bu akışa dahil değildir.

## 2) Yeni varlık ekleme adımları

1. `collectors/config.py` içinde ilgili grubun `symbols` alanına yeni sembol ekle.
2. Veri çekimini çalıştır:
   - `python collectors/yahoo_finance.py`
3. Gerekirse değişim yüzdelerini tekrar hesapla:
   - `python collectors/recompute_changes.py`
4. JSON çıktılarını doğrula (`data/*.json` ve `site/data/*.json`).

## 3) Logo isimlendirme standardı

Frontend logo ararken önce şu yolu dener:

- `site/assets/logos/<safe_id(symbol)>.svg`

Buradaki `safe_id(symbol)` dönüşümü:

- tüm harfleri küçült
- harf/rakam dışı karakterleri `-` yap
- baştaki/sondaki `-` karakterlerini temizle

Örnekler:

- `BTC-USD` → `btc-usd.svg`
- `USDTRY=X` → `usdtry-x.svg`
- `GARAN.IS` → `garan-is.svg`
- `^TNX` → `tnx.svg`
- `SUI20947-USD` → `sui20947-usd.svg`

## 4) Logo isimlerini toplu üretme

Bu repo içinde logo dosya adı listesi üretmek için:

- `python collectors/generate_logo_name_list.py`
- sadece bir grup için: `python collectors/generate_logo_name_list.py --group currencies`
- TSV çıktısı: `python collectors/generate_logo_name_list.py --format tsv > logo-list.tsv`

Script, mevcut tüm varlıklar için önerilen `.svg` ve `.png` adlarını üretir.

## 5) Operasyon önerisi (yüksek hacim ekleme)

- Önce kategori bazlı 20–30 sembol ekleme paketleri yap.
- Her paketten sonra `yahoo_finance.py` + hızlı görsel kontrol yap.
- En son toplu logo üretip `site/assets/logos` içine aynı isimlerle koy.
- `iran-risk.html` ve `netlify/functions/iran-state.js` dosyalarına dokunma.
