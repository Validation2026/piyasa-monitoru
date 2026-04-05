const https = require('https');
const API_KEY = 'AIzaSyDSFUr9S3kCRvFKs98ApyFV_ZtKZ-hrUyY';

function geminiRequest(path, body) {
    return new Promise((resolve, reject) => {
        const req = https.request({
            hostname: 'generativelanguage.googleapis.com',
            path: path,
            method: body ? 'POST' : 'GET',
            headers: body ? { 'Content-Type': 'application/json' } : {},
            timeout: 25000
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

const PROMPT = `Sen profesyonel bir jeopolitik ve makroekonomi analistisin. Türkçe yaz. Kısa, net, yönetici özeti kıvamında ol. Destan yazma.

İran-İsrail savaşı (28 Şubat 2026 başlangıç) bağlamında BUGÜNKÜ durumu analiz et.

Şu başlıkları kullan:

📊 DURUM ANALİZİ
2-3 cümle genel durum özeti. Savaşın kaçıncı gününde olduğumuzu, son gelişmeleri ve genel gidişatı özetle.

⚔️ ASKERİ DURUM
• 3-4 kısa madde (son askeri gelişmeler, cepheler, füze saldırıları, deniz durumu)

💰 EKONOMİK ETKİLER
• 3-4 kısa madde (petrol, altın, navlun, sigorta, polyester hammadde, Hürmüz Boğazı etkisi)

🔮 KISA VADEDE İZLENMESİ GEREKENLER
• 2-3 kısa madde

⚠️ Bu analiz bilgilendirme amaçlıdır, yatırım tavsiyesi değildir.`;

const FALLBACK = `📊 DURUM ANALİZİ
İran-İsrail arasındaki çatışma Şubat 2026'dan bu yana devam ediyor. Hürmüz Boğazı ve Kızıldeniz'deki deniz trafiği aksama riski altında.

⚔️ ASKERİ DURUM
• Hürmüz Boğazı'ndan geçen tanker trafiğinde aksaklık riski artıyor
• İsrail-İran arasında doğrudan askeri tırmanma devam ediyor
• Hizbullah ve Husi milislerinin vekâlet savaşı genişliyor
• ABD 5. Filo Basra Körfezi'nde konuşlu

💰 EKONOMİK ETKİLER
• Ham petrol fiyatlarında jeopolitik risk primi yükseldi
• Deniz sigorta maliyetleri Basra Körfezi rotaları için katlandı
• Navlun — Süveyş→Ümit Burnu rota değişikliği maliyetleri arttı
• Polyester dahil petrol bazlı hammaddeler doğrudan etkileniyor

🔮 KISA VADEDE İZLENMESİ GEREKENLER
• IAEA nükleer denetim raporları ve diplomatik müzakereler
• Kızıldeniz ve Aden Körfezi'ndeki Husi saldırıları
• OPEC+ acil üretim artışı kararları

⚠️ Bu analiz bilgilendirme amaçlıdır, yatırım tavsiyesi değildir.`;

exports.handler = async function(event) {
    const H = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=1800'
    };

    try {
        const model = await getModel();
        const result = await geminiRequest(
            '/v1beta/models/' + model + ':generateContent?key=' + API_KEY,
            {
                contents: [{ parts: [{ text: PROMPT }] }],
                generationConfig: { temperature: 0.7, maxOutputTokens: 1500 }
            }
        );
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (text && text.length > 50) {
            return { statusCode: 200, headers: H, body: JSON.stringify({ analysis: text, source: 'gemini' }) };
        }
        return { statusCode: 200, headers: H, body: JSON.stringify({ analysis: FALLBACK, source: 'fallback' }) };
    } catch(e) {
        return { statusCode: 200, headers: H, body: JSON.stringify({ analysis: FALLBACK, source: 'fallback' }) };
    }
};
