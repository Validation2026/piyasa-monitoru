# Piyasa Monitörü

Türkiye ve global piyasalar için canlı haber, makro veri ve operasyonel risk raporlama uygulaması. Netlify Functions üzerinde Gemini ile AI destekli operasyonel risk raporu üretir.

## Kurulum

```bash
npm install
```

## AI (Gemini) Kurulumu

Operasyonel risk raporu, ana sayfadaki `AI Piyasa Analizi` ve İran risk özetleri Google Gemini ile üretilir. Netlify Functions artık kök dizindeki `.env` dosyasını otomatik okur; yine de gerçek anahtarı **kesinlikle repoya commit etme**. `.env` dosyası `.gitignore` içinde tutulur ve local çalışmada `process.env.GEMINI_API_KEY` olarak yüklenir.

### 1. Anahtar al

[Google AI Studio](https://aistudio.google.com/app/apikey) üzerinden bir API anahtarı oluştur.

### 2. Üretim ortamı (Netlify)

Netlify dashboard → **Site settings → Environment variables** → şu değişkenleri ekle:

| Key | Value |
| --- | --- |
| `GEMINI_API_KEY` | (oluşturduğun anahtar) |
| `GEMINI_MODEL` | `gemini-2.5-flash` (opsiyonel, varsayılan bu) |

Değişiklik sonrası site yeniden deploy edilmeli.

### 3. Local geliştirme

Kök dizinde `.env` dosyası oluştur (`.gitignore`'da, commit edilmez). Ana sayfa ve `iran-risk.html` içindeki AI kutuları `/api/ai-analysis` ve `/api/iran-brief` fonksiyonları üzerinden bu anahtarı kullanır:

```env
GEMINI_API_KEY=your-key-here
GEMINI_MODEL=gemini-2.5-flash
```

Netlify CLI ile çalıştır. Fonksiyonlar `.env` dosyasını otomatik yüklediği için ayrıca `export` yapman gerekmez:

```bash
npx netlify dev
```

## Test

```bash
npm test          # tüm Jest testleri
npm run test:py   # Python tarafı
```

## Önemli Notlar

- `.env.example` sadece template'tir, içine gerçek anahtar yazma. Gerçek anahtar sadece lokal `.env` veya Netlify Environment variables içinde olmalı.
- Eğer bir anahtar yanlışlıkla commit edilirse: anahtarı **derhal revoke et** (Google AI Studio → Delete API key) ve yenisini Netlify env vars'a ekle. Git history'den silmek tek başına yeterli değildir.
