İRAN BANNER — ADMIN'DEN GITHUB'A COMMIT SİSTEMİ

Bu paket şunu yapar:
- admin.html içinden /api/iran-state endpointine kayıt atılır.
- netlify/functions/iran-state.js bu kaydı GitHub'daki data/iran-state.json dosyasına commit eder.
- index.html ve iran-risk.html bannerı /api/iran-state üzerinden aynı GitHub JSON dosyasından okur.
- Banner CURRENT_IRAN_BRIEF / hazır piyasa analizi metnine düşmez.

Yüklenecek dosyalar:
1) admin.html
2) index.html
3) iran-risk.html
4) netlify/functions/iran-state.js
5) netlify.toml
6) data/iran-state.json

Netlify ortam değişkenleri:
- GITHUB_TOKEN  = GitHub fine-grained token veya classic token
- GITHUB_OWNER  = repo sahibi, örn: 21fatiharslan
- GITHUB_REPO   = repo adı, örn: piyasa-monitoru-main
- GITHUB_BRANCH = main veya master
- IRAN_STATE_PATH = data/iran-state.json
- ADMIN_PIN = admin panelde kullandığın PIN

GitHub token için gerekli izin:
- Repository contents: Read and write

Önemli:
- Token ASLA admin.html içine yazılmayacak.
- Token sadece Netlify Environment Variables alanına yazılacak.
- İlk kurulumdan sonra admin panelden bannerı bir kere kaydet.
