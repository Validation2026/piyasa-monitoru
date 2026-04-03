// netlify/functions/ai-analysis.js
// Gemini API ile piyasa analizi — her kategori için özel yorum
// ASLA yatırım tavsiyesi vermez

const https = require('https');

const GEMINI_KEY = process.env.GEMINI_API_KEY || '';

function callGemini(prompt) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
        });

        const options = {
            hostname: 'generativelanguage.googleapis.com',
            path: `/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            timeout: 15000
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    const text = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
                    resolve(text);
                } catch (e) { reject(new Error('Parse error')); }
            });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
        req.write(body);
        req.end();
    });
}

const PROMPTS = {
    'iran-risk': `Sen bir jeopolitik ve ekonomi analisti olarak Türkçe yazıyorsun. 
İran-İsrail savaşı bağlamında (Şubat 2026'dan bu yana devam ediyor) kısa bir durum analizi yap.

Formatı şu şekilde yaz:
📊 DURUM ANALİZİ
[2-3 cümle genel durum özeti]

⚔️ JEOPOLİTİK RİSKLER
• [3-4 madde — askeri gelişmeler, ittifaklar, boğaz güvenliği]

💰 EKOPOLİTİK RİSKLER
• [3-4 madde — enerji arzı, navlun, sigorta maliyetleri, ticaret rotaları]

🔮 KISA VADEDE İZLENMESİ GEREKENLER
• [2-3 madde]

⚠️ Bu analiz bilgilendirme amaçlıdır, kesinlikle yatırım tavsiyesi değildir.

Güncel, özlü ve profesyonel yaz. Spekülasyon yapma, sadece mevcut durumu analiz et.`,

    'emtia-enerji': `Türkçe kısa bir enerji piyasası analizi yaz. Brent petrol, WTI, doğalgaz ve TTF fiyatlarını etkileyen güncel faktörleri değerlendir. OPEC kararları, jeopolitik gerilimler, mevsimsel talebi kısaca analiz et. 3-4 paragraf. ⚠️ Bu yatırım tavsiyesi değildir.`,

    'emtia-metaller': `Türkçe kısa bir kıymetli madenler analizi yaz. Altın, gümüş, platin fiyatlarını etkileyen faktörler: merkez bankası alımları, enflasyon, dolar endeksi, jeopolitik risk. 3-4 paragraf. ⚠️ Bu yatırım tavsiyesi değildir.`,

    'emtia-tarim': `Türkçe kısa bir tarım emtiaları analizi yaz. Buğday, mısır, kahve, kakao, pamuk — iklim koşulları, arz-talep dengesi, navlun maliyetleri. 3-4 paragraf. ⚠️ Bu yatırım tavsiyesi değildir.`,

    'kurlar': `Türkçe kısa bir döviz piyasası analizi yaz. USD/TRY, EUR/USD, DXY odaklı — Fed/ECB/TCMB faiz politikaları, enflasyon farkları, sermaye akışları. 3-4 paragraf. ⚠️ Bu yatırım tavsiyesi değildir.`,

    'tahviller': `Türkçe kısa bir tahvil piyasası analizi yaz. ABD 10 yıllık getiri eğrisi, Fed faiz beklentileri, resesyon sinyalleri, getiri eğrisi inversiyon durumu. 3-4 paragraf. ⚠️ Bu yatırım tavsiyesi değildir.`,

    'endeksler': `Türkçe kısa bir borsa endeksleri analizi yaz. S&P 500, BIST 100, Nikkei, DAX — kazanç sezonu, makro veriler, risk iştahı, sektörel rotasyon. 3-4 paragraf. ⚠️ Bu yatırım tavsiyesi değildir.`,

    'kripto': `Türkçe kısa bir kripto para analizi yaz. Bitcoin, Ethereum — ETF akışları, halving etkisi, regülasyon gelişmeleri, DeFi ve Layer2 trendleri. 3-4 paragraf. ⚠️ Bu yatırım tavsiyesi değildir.`,

    'genel': `Türkçe kısa bir küresel piyasa özeti yaz. Emtia, döviz, tahvil, endeks ve jeopolitik gelişmeleri birlikte değerlendir. Genel risk iştahı, merkez bankası politikaları, küresel ticaret. 3-4 paragraf. ⚠️ Bu yatırım tavsiyesi değildir.`
};

exports.handler = async function(event) {
    const category = event.queryStringParameters?.cat || 'genel';

    if (!GEMINI_KEY) {
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ analysis: '⚠️ AI analiz servisi yapılandırılmamış. GEMINI_API_KEY ayarlayın.', cached: false })
        };
    }

    const prompt = PROMPTS[category] || PROMPTS['genel'];

    try {
        const analysis = await callGemini(prompt);
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=1800' // 30 dk cache
            },
            body: JSON.stringify({ analysis, cached: false, timestamp: new Date().toISOString() })
        };
    } catch (e) {
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ analysis: '⚠️ AI analiz şu anda yüklenemiyor: ' + e.message, cached: false })
        };
    }
};
