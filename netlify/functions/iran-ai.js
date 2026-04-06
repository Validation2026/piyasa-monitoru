const https = require('https');

function httpRequest(options, body) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => { try { resolve({ status: res.statusCode, data: JSON.parse(data) }); } catch(e) { resolve({ status: res.statusCode, data: data }); } });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
        if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
        req.end();
    });
}

function buildPrompt() {
    const now = new Date();
    const tr = new Intl.DateTimeFormat('tr-TR', { day:'numeric', month:'long', year:'numeric', timeZone:'Europe/Istanbul' }).format(now);
    const dayCount = Math.floor((now - new Date('2026-02-28T00:00:00+03:00')) / 86400000);

    return `Bugün ${tr}, İran-İsrail savaşının ${dayCount}. günü.

Türkçe yaz. Kısa, net, somut. Her madde 1 cümle. Boş laf YAZMA. Türkçe karakterleri (ş, ç, ğ, ü, ö, ı, İ) doğru kullan.

📊 DURUM
• Savaşın bugünkü genel durumunu 2-3 maddede özetle. Somut ol — hangi cephede ne oluyor, hangi diplomatik adım atıldı.

⚔️ JEOPOLİTİK
• 3-4 madde. Aktör ismi, lokasyon, somut gelişme. Örnek: "ABD B-2 bombardıman uçaklarını Diego Garcia'ya konuşlandırdı" gibi.

💰 EKONOMİK
• 3-4 madde. Fiyat, yüzde, rakam ver. Örnek: "Brent savaş öncesi 85$'tan 108$'a çıktı, %27 artış" gibi.

⚠️ Bilgilendirme amaçlıdır, yatırım tavsiyesi değildir.

ÖNEMLİ: Direkt 📊 DURUM ile başla. Giriş cümlesi koyma.`;
}

// Method 1: Groq (free tier - needs GROQ_API_KEY env var)
async function tryGroq() {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return null;

    const body = JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: buildPrompt() }],
        temperature: 0.7,
        max_tokens: 800
    });

    const result = await httpRequest({
        hostname: 'api.groq.com',
        path: '/openai/v1/chat/completions',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
        timeout: 20000
    }, body);

    if (result.status === 200 && result.data.choices?.[0]?.message?.content) {
        let text = result.data.choices[0].message.content;
        text = text.replace(/^[^📊]*📊/, '📊').trim();
        if (text.length > 50) return text;
    }
    return null;
}

// Method 2: HuggingFace Inference API (free, no key required for some models)
async function tryHuggingFace() {
    const apiKey = process.env.HF_API_KEY || '';
    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = 'Bearer ' + apiKey;

    const body = JSON.stringify({
        inputs: buildPrompt(),
        parameters: { max_new_tokens: 800, temperature: 0.7, return_full_text: false }
    });

    const result = await httpRequest({
        hostname: 'api-inference.huggingface.co',
        path: '/models/mistralai/Mistral-7B-Instruct-v0.3',
        method: 'POST',
        headers: headers,
        timeout: 25000
    }, body);

    if (result.status === 200 && Array.isArray(result.data) && result.data[0]?.generated_text) {
        let text = result.data[0].generated_text;
        text = text.replace(/^[^📊]*📊/, '📊').trim();
        if (text.length > 50) return text;
    }
    return null;
}

// Method 3: Gemini (original, kept as fallback)
async function tryGemini() {
    const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyDSFUr9S3kCRvFKs98ApyFV_ZtKZ-hrUyY';

    // Get available model
    let model = 'gemini-2.0-flash';
    try {
        const list = await httpRequest({
            hostname: 'generativelanguage.googleapis.com',
            path: '/v1beta/models?key=' + apiKey,
            method: 'GET',
            timeout: 10000
        });
        if (list.status === 200 && list.data.models) {
            for (const m of list.data.models) {
                if (m.supportedGenerationMethods?.includes('generateContent')) {
                    model = m.name.replace('models/', '');
                    break;
                }
            }
        }
    } catch(e) {}

    const result = await httpRequest({
        hostname: 'generativelanguage.googleapis.com',
        path: '/v1beta/models/' + model + ':generateContent?key=' + apiKey,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        timeout: 25000
    }, {
        contents: [{ parts: [{ text: buildPrompt() }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 800 }
    });

    if (result.status === 200) {
        let text = result.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        text = text.replace(/^[^📊]*📊/, '📊').trim();
        if (text.length > 50) return text;
    }
    return null;
}

const FALLBACK = `📊 DURUM
• İran-İsrail savaşı 28 Şubat'tan bu yana aktif olarak devam ediyor; karşılıklı füze ve hava saldırıları yoğunlaşmış durumda
• Hürmüz Boğazı'nda İran donanması tatbikat sürdürüyor, tanker geçişlerinde aksamalar yaşanıyor
• ABD ve müttefikleri Basra Körfezi'nde iki uçak gemisi grubuyla tam konuşlanma halinde

⚔️ JEOPOLİTİK
• İsrail F-35'leri İsfahan ve Natanz nükleer tesislerini defalarca vurdu; İran'ın zenginleştirme kapasitesinin büyük kısmı devre dışı kaldı
• İran hipersonik balistik füzelerle Demir Kubbe savunmasını en az bir kez deldi, Tel Aviv yakınlarına isabet kaydedildi
• Hizbullah kuzey İsrail'e 200'den fazla roket attı; İsrail karşılığında Beyrut'un güney banliyölerini bombaladı
• Husi güçleri Kızıldeniz'de ticari gemileri hedef almaya devam ediyor, Bab el-Mandeb geçişi yüksek risk altında

💰 EKONOMİK
• Brent petrol savaş öncesi 85 dolardan 108 dolara fırladı; varil başına %27 artış — OPEC+ günlük 500 bin varil acil üretim artışı kararı aldı
• Basra Körfezi deniz sigorta primleri savaş öncesine göre 10 katına çıktı, navlun maliyetleri %40 arttı
• Süveyş Kanalı trafiği %30 düştü; gemiler Ümit Burnu rotasına yöneldi, transit süreler 10-14 gün uzadı
• Altın güvenli liman talebiyle 4.500 doların üzerine çıktı; petrol bazlı tüm hammaddelerde maliyet artışı sürüyor

⚠️ Bu analiz bilgilendirme amaçlıdır, yatırım tavsiyesi değildir.`;

exports.handler = async function(event) {
    const H = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=10800'
    };

    // Try providers in order: Groq -> HuggingFace -> Gemini -> Fallback
    const providers = [
        { name: 'groq', fn: tryGroq },
        { name: 'huggingface', fn: tryHuggingFace },
        { name: 'gemini', fn: tryGemini }
    ];

    for (const provider of providers) {
        try {
            const text = await provider.fn();
            if (text) {
                return { statusCode: 200, headers: H, body: JSON.stringify({ analysis: text, source: provider.name }) };
            }
        } catch(e) {
            // Continue to next provider
        }
    }

    return { statusCode: 200, headers: H, body: JSON.stringify({ analysis: FALLBACK, source: 'fallback' }) };
};
