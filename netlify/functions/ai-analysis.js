const https = require('https');

// API Key direkt gömülü
const API_KEY = 'AIzaSyDSFUr9S3kCRvFKs98ApyFV_ZtKZ-hrUyY';

function geminiRequest(path, body) {
    return new Promise((resolve, reject) => {
        const req = https.request({
            hostname: 'generativelanguage.googleapis.com',
            path: path,
            method: body ? 'POST' : 'GET',
            headers: body ? { 'Content-Type': 'application/json' } : {},
            timeout: 20000
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

async function getWorkingModel() {
    // Sırayla dene
    const candidates = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
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
    return candidates[0]; // fallback
}

async function callGemini(prompt) {
    const model = await getWorkingModel();
    const result = await geminiRequest(
        '/v1beta/models/' + model + ':generateContent?key=' + API_KEY,
        { contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.7, maxOutputTokens: 1500 } }
    );
    return result.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

const PROMPTS = {
    'iran-risk': 'Sen profesyonel bir jeopolitik ve makroekonomi analistisin. Türkçe, kısa, net, yönetici özeti kıvamında yaz. İran-İsrail savaşı (Şubat 2026 başlangıç) bağlamında analiz:\n\n📊 DURUM ANALİZİ\n2-3 cümle.\n\n⚔️ JEOPOLİTİK RİSKLER\n• 3-4 kısa madde\n\n💰 EKOPOLİTİK RİSKLER\n• 3-4 kısa madde\n\n🔮 İZLENMESİ GEREKENLER\n• 2-3 madde\n\n⚠️ Bu bilgilendirme amaçlıdır, yatırım tavsiyesi değildir.',
    'emtia-enerji': 'Türkçe, kısa ve net enerji piyasası analizi yaz. BZ (Brent), CL (WTI), NG (Doğalgaz), TTF. OPEC kararları, jeopolitik, mevsimsel talep. 3 kısa paragraf. Destan yazma. ⚠️ Yatırım tavsiyesi değildir.',
    'emtia-metaller': 'Türkçe kısa madenler analizi. XAU (Altın), XAG (Gümüş), XPT (Platin). Merkez bankası alımları, enflasyon, dolar. 3 kısa paragraf. ⚠️ Yatırım tavsiyesi değildir.',
    'emtia-tarim': 'Türkçe kısa tarım analizi. ZW (Buğday), KC (Kahve), CC (Kakao), CT (Pamuk). İklim, arz-talep, navlun. 3 kısa paragraf. ⚠️ Yatırım tavsiyesi değildir.',
    'kurlar': 'Türkçe kısa döviz analizi. USD/TRY, EUR/USD, DXY. Fed/ECB/TCMB faiz politikaları. 3 kısa paragraf. ⚠️ Yatırım tavsiyesi değildir.',
    'tahviller': 'Türkçe kısa tahvil analizi. ABD 10Y getiri, getiri eğrisi, Fed beklentileri. 3 kısa paragraf. ⚠️ Yatırım tavsiyesi değildir.',
    'endeksler': 'Türkçe kısa borsa analizi. S&P 500, BIST 100, NASDAQ, DAX. Kazanç sezonu, risk iştahı. 3 kısa paragraf. ⚠️ Yatırım tavsiyesi değildir.',
    'kripto': 'Türkçe kısa kripto analizi. BTC, ETH, SOL. ETF akışları, regülasyon. 3 kısa paragraf. ⚠️ Yatırım tavsiyesi değildir.',
    'genel': 'Türkçe kısa küresel piyasa özeti. Emtia, döviz, tahvil, endeks, jeopolitik. Risk iştahı ve merkez bankaları. 3 kısa paragraf. ⚠️ Yatırım tavsiyesi değildir.'
};

const FALLBACKS = {
    'iran-risk': '📊 DURUM ANALİZİ\nİran-İsrail çatışması bölgesel enerji arz güvenliğini tehdit etmeye devam ediyor. Hürmüz Boğazı trafiği yakından izleniyor.\n\n⚔️ JEOPOLİTİK RİSKLER\n• Hürmüz Boğazı tanker trafiğinde aksaklık riski\n• İsrail-İran doğrudan askeri tırmanma ihtimali\n• Hizbullah ve Husi vekâlet savaşı genişlemesi\n• ABD 5. Filo Basra Körfezi konuşlanması\n\n💰 EKOPOLİTİK RİSKLER\n• Petrol fiyatlarında jeopolitik risk primi\n• Deniz sigorta maliyetleri yükseldi\n• Navlun — Süveyş/Ümit Burnu rota değişikliği\n• Altın ve güvenli liman varlıklarına yönelim\n\n🔮 İZLENMESİ GEREKENLER\n• IAEA raporları ve müzakere süreçleri\n• Kızıldeniz deniz güvenliği\n• OPEC+ üretim kararları\n\n⚠️ Bu bilgilendirme amaçlıdır, yatırım tavsiyesi değildir.',
    'genel': 'Küresel piyasalarda İran-İsrail gerginliği başta olmak üzere jeopolitik riskler belirleyici. Enerji fiyatlarındaki risk primi emtia genelinde yayılıyor. Merkez bankaları enflasyon-büyüme dengesini gözetirken faiz beklentileri piyasaları şekillendiriyor.\n\n⚠️ Bu bilgilendirme amaçlıdır, yatırım tavsiyesi değildir.'
};

exports.handler = async function(event) {
    const cat = event.queryStringParameters?.cat || 'genel';
    const H = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=1800' };
    try {
        const text = await callGemini(PROMPTS[cat] || PROMPTS['genel']);
        if (text && text.length > 30) return { statusCode: 200, headers: H, body: JSON.stringify({ analysis: text }) };
        return { statusCode: 200, headers: H, body: JSON.stringify({ analysis: FALLBACKS[cat] || FALLBACKS['genel'] }) };
    } catch(e) {
        return { statusCode: 200, headers: H, body: JSON.stringify({ analysis: FALLBACKS[cat] || FALLBACKS['genel'] }) };
    }
};
