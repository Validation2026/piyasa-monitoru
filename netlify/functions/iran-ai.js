const https = require('https');
const API_KEY = 'AIzaSyDSFUr9S3kCRvFKs98ApyFV_ZtKZ-hrUyY';

function geminiRequest(path, body) {
    return new Promise((resolve, reject) => {
        const req = https.request({
            hostname: 'generativelanguage.googleapis.com',
            path: path,
            method: body ? 'POST' : 'GET',
            headers: body ? { 'Content-Type': 'application/json' } : {},
            timeout: 30000
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
                if (m.supportedGenerationMethods?.includes('generateContent')) {
                    return m.name.replace('models/', '');
                }
            }
        }
    } catch(e) {}
    return 'gemini-2.5-flash';
}

function buildPrompt() {
    const now = new Date();
    const tr = new Intl.DateTimeFormat('tr-TR', { day:'numeric', month:'long', year:'numeric', timeZone:'Europe/Istanbul' }).format(now);
    const warStart = new Date('2026-02-28T00:00:00+03:00');
    const dayCount = Math.floor((now - warStart) / 86400000);

    return `Bugün ${tr}, İran-İsrail savaşının ${dayCount}. günü.

Sen jeopolitik ve makroekonomi analistisin. İnternetten son 6 saatteki İran-İsrail savaşı haberlerini tara. Sonra aşağıdaki formatta KISA ve NET bir özet yaz. Türkçe yaz. Her madde 1 cümle olsun. Uzun paragraflar YAZMA.

📊 DURUM
• Son 6 saatteki en önemli 2-3 gelişmeyi özetle

⚔️ JEOPOLİTİK
• Askeri gelişmeler, cepheler, diplomasi (3-4 kısa madde)

💰 EKONOMİK
• Petrol, altın, navlun, sigorta, hammadde etkileri (3-4 kısa madde)

⚠️ Bilgilendirme amaçlıdır, yatırım tavsiyesi değildir.

ÖNEMLİ: Başlığın önüne "Profesyonel bir analist olarak..." gibi giriş cümlesi KOYMA. Direkt 📊 DURUM ile başla.`;
}

const FALLBACK = `📊 DURUM
• İran-İsrail arasındaki çatışma devam ediyor
• Hürmüz Boğazı ve Kızıldeniz'deki deniz trafiği risk altında

⚔️ JEOPOLİTİK
• Hürmüz Boğazı tanker trafiğinde aksaklık riski artıyor
• İsrail-İran doğrudan askeri tırmanma devam ediyor
• Hizbullah ve Husi vekâlet savaşı genişliyor
• ABD 5. Filo Basra Körfezi'nde konuşlu

💰 EKONOMİK
• Petrolde jeopolitik risk primi yükseldi
• Deniz sigortaları Basra Körfezi için katlandı
• Gemiler Ümit Burnu rotasına yöneldi, navlun arttı
• Polyester dahil petrol bazlı hammaddeler etkileniyor

⚠️ Bilgilendirme amaçlıdır, yatırım tavsiyesi değildir.`;

exports.handler = async function(event) {
    const H = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=21600'
    };

    try {
        const model = await getModel();
        const prompt = buildPrompt();
        const result = await geminiRequest(
            '/v1beta/models/' + model + ':generateContent?key=' + API_KEY,
            {
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.7, maxOutputTokens: 800 },
                tools: [{ googleSearch: {} }]
            }
        );
        let text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
        // "Profesyonel bir analist olarak" gibi giriş cümlelerini temizle
        text = text.replace(/^[^📊]*📊/, '📊').trim();
        if (text && text.length > 50) {
            return { statusCode: 200, headers: H, body: JSON.stringify({ analysis: text, source: 'gemini' }) };
        }
        return { statusCode: 200, headers: H, body: JSON.stringify({ analysis: FALLBACK, source: 'fallback' }) };
    } catch(e) {
        return { statusCode: 200, headers: H, body: JSON.stringify({ analysis: FALLBACK, source: 'fallback' }) };
    }
};
