const https = require(‘https’);
const API_KEY = ‘AIzaSyDSFUr9S3kCRvFKs98ApyFV_ZtKZ-hrUyY’;

function geminiRequest(path, body) {
return new Promise((resolve, reject) => {
const req = https.request({
hostname: ‘generativelanguage.googleapis.com’,
path: path,
method: body ? ‘POST’ : ‘GET’,
headers: body ? { ‘Content-Type’: ‘application/json’ } : {},
timeout: 25000
}, (res) => {
let data = ‘’;
res.on(‘data’, chunk => data += chunk);
res.on(‘end’, () => { try { resolve(JSON.parse(data)); } catch(e) { reject(e); } });
});
req.on(‘error’, reject);
req.on(‘timeout’, () => { req.destroy(); reject(new Error(‘timeout’)); });
if (body) req.write(JSON.stringify(body));
req.end();
});
}

async function getModel() {
try {
const list = await geminiRequest(’/v1beta/models?key=’ + API_KEY);
if (list.models) {
for (const m of list.models) {
if (m.supportedGenerationMethods?.includes(‘generateContent’)) return m.name.replace(‘models/’, ‘’);
}
}
} catch(e) {}
return ‘gemini-2.5-flash’;
}

function buildPrompt() {
const now = new Date();
const tr = new Intl.DateTimeFormat(‘tr-TR’, { day:‘numeric’, month:‘long’, year:‘numeric’, timeZone:‘Europe/Istanbul’ }).format(now);
const dayCount = Math.floor((now - new Date(‘2026-02-28T00:00:00+03:00’)) / 86400000);

```
return `Bugün ${tr}, İran-İsrail savaşının ${dayCount}. günü.
```

Türkçe yaz. Kısa, net, somut. Her madde 1 cümle. Boş laf YAZMA.

📊 DURUM
• Savaşın bugünkü genel durumunu 2-3 maddede özetle. Somut ol — hangi cephede ne oluyor, hangi diplomatik adım atıldı.

⚔️ JEOPOLİTİK
• 3-4 madde. Aktör ismi, lokasyon, somut gelişme. Örnek: “ABD B-2 bombardıman uçaklarını Diego Garcia’ya konuşlandırdı” gibi.

💰 EKOPOLİTİK
• 3-4 madde. Fiyat, yüzde, rakam ver. Örnek: “Brent savaş öncesi 85$’tan 108$’a çıktı, %27 artış” gibi.

⚠️ Bilgilendirme amaçlıdır, yatırım tavsiyesi değildir.

ÖNEMLİ: “Profesyonel analist olarak…” gibi giriş cümlesi KOYMA. Direkt 📊 DURUM ile başla. Maddelerin başına • koy.`;
}

const FALLBACK = `📊 DURUM
• İran-İsrail savaşı 28 Şubat’tan bu yana aktif olarak devam ediyor, karşılıklı füze ve hava saldırıları yoğunlaşmış durumda
• Hürmüz Boğazı’nda İran donanması tatbikat sürdürüyor, tanker geçişlerinde aksamalar yaşanıyor
• ABD ve müttefikleri Basra Körfezi’nde iki uçak gemisi grubuyla tam konuşlanma halinde

⚔️ JEOPOLİTİK
• İsrail F-35’leri Isfahan ve Natanz nükleer tesislerini defalarca vurdu, İran zenginleştirme kapasitesinin büyük kısmını kaybetti
• İran hipersonik balistik füzelerle Demir Kubbe savunmasını en az bir kez deldi, Tel Aviv yakınlarına isabet kaydedildi
• Hizbullah kuzey İsrail’e 200+ roket attı, İsrail karşılığında Beyrut güney banliyölerini bombaladı
• Husi güçleri Kızıldeniz’de ticari gemileri hedef almaya devam ediyor, Bab el-Mandeb geçişi riskli

💰 EKOPOLİTİK
• Brent petrol savaş öncesi 85$’tan 108$’a fırladı, varil başına %27 artış — OPEC+ 500K varil/gün acil üretim artışı kararı aldı
• Basra Körfezi deniz sigorta primleri savaş öncesine göre 10 katına çıktı, navlun maliyetleri %40 arttı
• Süveyş Kanalı trafiği %30 düştü, gemiler Ümit Burnu rotasına yöneldi — transit süreler 10-14 gün uzadı
• Altın güvenli liman talebiyle 4.500$ üzerine çıktı, polyester ve petrol bazlı tüm hammaddelerde maliyet artışı sürüyor

⚠️ Bilgilendirme amaçlıdır, yatırım tavsiyesi değildir.`;

exports.handler = async function(event) {
const H = {
‘Content-Type’: ‘application/json’,
‘Access-Control-Allow-Origin’: ‘*’,
‘Cache-Control’: ‘public, max-age=10800’
};

```
try {
    const model = await getModel();
    const result = await geminiRequest(
        '/v1beta/models/' + model + ':generateContent?key=' + API_KEY,
        {
            contents: [{ parts: [{ text: buildPrompt() }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 800 }
        }
    );
    let text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
    text = text.replace(/^[^📊]*📊/, '📊').trim();
    if (text && text.length > 50) {
        return { statusCode: 200, headers: H, body: JSON.stringify({ analysis: text, source: 'gemini' }) };
    }
    return { statusCode: 200, headers: H, body: JSON.stringify({ analysis: FALLBACK, source: 'fallback' }) };
} catch(e) {
    return { statusCode: 200, headers: H, body: JSON.stringify({ analysis: FALLBACK, source: 'fallback' }) };
}
```

};
