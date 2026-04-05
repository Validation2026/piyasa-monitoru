const https = require('https');
const API_KEY = 'AIzaSyDSFUr9S3kCRvFKs98ApyFV_ZtKZ-hrUyY';

function geminiRequest(path, body) {
    return new Promise((resolve, reject) => {
        const req = https.request({
            hostname: 'generativelanguage.googleapis.com',
            path: path,
            method: body ? 'POST' : 'GET',
            headers: body ? { 'Content-Type': 'application/json' } : {},
            timeout: 35000
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { reject(e); } });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function getModel() {
    try {
        const list = await geminiRequest('/v1beta/models?key=' + API_KEY);
        if (list.models) {
            for (const m of list.models) {
                if (m.supportedGenerationMethods?.includes('generateContent')) return m.name.replace('models/', '');
            }
        }
    } catch(e) {}
    return 'gemini-2.5-flash';
}

function buildPrompt() {
    const now = new Date();
    const tr = new Intl.DateTimeFormat('tr-TR', { day:'numeric', month:'long', year:'numeric', timeZone:'Europe/Istanbul' }).format(now);
    const dayCount = Math.floor((now - new Date('2026-02-28T00:00:00+03:00')) / 86400000);

    return `Bugün ${tr}, İran-İsrail savaşının ${dayCount}. günü.

İnternetten son 6 saatteki İran-İsrail savaşı, Hürmüz Boğazı, Orta Doğu enerji ve savunma haberlerini tara.

Yanıtını TAM OLARAK aşağıdaki iki bölümde ver. Başka hiçbir şey ekleme.

=== BÖLÜM 1: ANALİZ ===

📊 DURUM
• Son saatlerdeki en kritik 2-3 gelişmeyi somut detaylarla özetle. Hangi şehir vuruldu, kaç füze atıldı, hangi lider ne açıklama yaptı gibi spesifik bilgiler ver. "Gerilim devam ediyor" gibi boş cümleler YAZMA.

⚔️ JEOPOLİTİK
• 3-4 madde. Her maddede somut olay, aktör ismi, lokasyon veya rakam olsun. Örnek: "İsrail F-35'leri Isfahan'ı 3. kez vurdu" veya "Husi güçleri Kızıldeniz'de Norveç bayraklı tankeri hedef aldı" gibi.

💰 EKOPOLİTİK
• 3-4 madde. Spesifik fiyat hareketleri, yüzde değişimler, somut etkiler yaz. Örnek: "Brent 108$'a çıktı, savaş öncesine göre %18 yukarıda" veya "Süveyş trafiği %35 düştü, konteyner navlunu 3 katına çıktı" gibi.

⚠️ Bilgilendirme amaçlıdır, yatırım tavsiyesi değildir.

=== BÖLÜM 2: ZAMAN ÇİZELGESİ ===

Son 48 saatteki en önemli 5 olayı şu JSON formatında ver. Başka hiçbir şey ekleme, sadece JSON array:

[TIMELINE_START]
[
  {"date":"GG.AA","title":"Kısa başlık","desc":"1 cümle açıklama","tag":"mil|dip|eco|nuk"}
]
[TIMELINE_END]

tag değerleri: mil=askeri, dip=diplomatik, eco=ekonomik, nuk=nükleer

ÖNEMLİ: "Profesyonel analist olarak..." gibi giriş cümlesi KOYMA. Direkt 📊 DURUM ile başla.`;
}

const FALLBACK_ANALYSIS = `📊 DURUM
• İran-İsrail arasındaki çatışma aktif olarak devam ediyor
• Hürmüz Boğazı ve Kızıldeniz'deki deniz trafiği aksama riski altında

⚔️ JEOPOLİTİK
• Hürmüz Boğazı tanker trafiğinde aksaklık riski yükseliyor
• İsrail-İran arasında doğrudan askeri operasyonlar sürüyor
• Hizbullah ve Husi milislerinin vekâlet savaşı bölgeye yayılıyor
• ABD 5. Filo iki uçak gemisi grubuyla Basra Körfezi'nde konuşlu

💰 EKOPOLİTİK
• Brent 100$'ın üzerinde, savaş öncesine göre %15+ yukarıda
• Basra Körfezi deniz sigorta primleri 10 katına çıktı
• Gemiler Süveyş yerine Ümit Burnu rotasına yöneldi, transit 10-14 gün uzadı
• Polyester ve petrol bazlı hammaddelerde maliyet artışı sürüyor

⚠️ Bilgilendirme amaçlıdır, yatırım tavsiyesi değildir.`;

exports.handler = async function(event) {
    const H = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=21600'
    };

    try {
        const model = await getModel();
        const result = await geminiRequest(
            '/v1beta/models/' + model + ':generateContent?key=' + API_KEY,
            {
                contents: [{ parts: [{ text: buildPrompt() }] }],
                generationConfig: { temperature: 0.7, maxOutputTokens: 1200 },
                tools: [{ googleSearch: {} }]
            }
        );

        let text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
        text = text.replace(/^[^📊]*📊/, '📊').trim();

        if (!text || text.length < 50) {
            return { statusCode: 200, headers: H, body: JSON.stringify({ analysis: FALLBACK_ANALYSIS, timeline: [], source: 'fallback' }) };
        }

        // Timeline JSON parse et
        let timeline = [];
        const tlMatch = text.match(/\[TIMELINE_START\]([\s\S]*?)\[TIMELINE_END\]/);
        if (tlMatch) {
            try {
                const jsonStr = tlMatch[1].replace(/```json|```/g, '').trim();
                timeline = JSON.parse(jsonStr);
            } catch(e) {}
            // Timeline kısmını analizden çıkar
            text = text.replace(/=== BÖLÜM 2[\s\S]*$/, '').trim();
            text = text.replace(/\[TIMELINE_START\][\s\S]*\[TIMELINE_END\]/, '').trim();
        }

        // Bölüm 1 başlığını da temizle
        text = text.replace(/=== BÖLÜM 1:.*===\n?/, '').trim();

        return { statusCode: 200, headers: H, body: JSON.stringify({ analysis: text, timeline: timeline, source: 'gemini' }) };
    } catch(e) {
        return { statusCode: 200, headers: H, body: JSON.stringify({ analysis: FALLBACK_ANALYSIS, timeline: [], source: 'fallback' }) };
    }
};
