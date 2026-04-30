# Piyasa Monitörü

Türkiye ve global piyasalar için canlı haber, makro veri ve operasyonel risk raporlama uygulaması. Netlify Functions üzerinde Gemini ile AI destekli operasyonel risk raporu üretir.

## Kurulum

```bash
npm install
```

## AI (Gemini) Kurulumu

Operasyonel risk raporu Google Gemini ile üretilir. Anahtarı **kesinlikle** repoya commit etme — `process.env.GEMINI_API_KEY` üzerinden okunur.

### 1. Anahtar al

[Google AI Studio](https://aistudio.google.com/app/apikey) üzerinden bir API anahtarı oluştur.

### 2. Üretim ortamı (Netlify)

Netlify dashboard → **Site settings → Environment variables** → şu değişkenleri ekle:

| Key | Value |
| --- | --- |
| `GEMINI_API_KEY` | (oluşturduğun anahtar) |
| `GEMINI_MODEL` | `gemini-1.5-pro` (opsiyonel, varsayılan bu) |

Değişiklik sonrası site yeniden deploy edilmeli.

### 3. Local geliştirme

Kök dizinde `.env` dosyası oluştur (`.gitignore`'da, commit edilmez):

```env
GEMINI_API_KEY=your-key-here
GEMINI_MODEL=gemini-1.5-pro
```

Netlify CLI ile çalıştır:

```bash
npx netlify dev
```

## Test

```bash
npm test          # tüm Jest testleri
npm run test:py   # Python tarafı
```

## Önemli Notlar

- `.env.example` sadece template'tir, içine gerçek anahtar yazma.
- Eğer bir anahtar yanlışlıkla commit edilirse: anahtarı **derhal revoke et** (Google AI Studio → Delete API key) ve yenisini Netlify env vars'a ekle. Git history'den silmek tek başına yeterli değildir.
