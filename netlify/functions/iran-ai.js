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

    return `Bugun ${tr}, Iran-Israil savasinin ${dayCount}. gunu.

Turkce yaz. Kisa, net, somut. Her madde 1 cumle. Bos laf YAZMA.

📊 DURUM
• Savasin bugunku genel durumunu 2-3 maddede ozetle. Somut ol.

⚔️ JEOPOLITIK
• 3-4 madde. Aktor ismi, lokasyon, somut gelisme.

💰 EKONOMIK
• 3-4 madde. Fiyat, yuzde, rakam ver.

⚠️ Bilgilendirme amaclidir, yatirim tavsiyesi degildir.

ONEMLI: Direkt 📊 DURUM ile basla.`;
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
• Iran-Israil savasi 28 Subat'tan bu yana aktif olarak devam ediyor, karsilikli fuze ve hava saldirilari yogunlasmis durumda
• Hurmuz Bogazi'nda Iran donanmasi tatbikat surduruyor, tanker gecislerinde aksamalar yasaniyor
• ABD ve muttefikleri Basra Korfezi'nde iki ucak gemisi grubuyla tam konuslanma halinde

⚔️ JEOPOLITIK
• Israil F-35'leri Isfahan ve Natanz nukleer tesislerini defalarca vurdu, Iran zenginlestirme kapasitesinin buyuk kismini kaybetti
• Iran hipersonik balistik fuzelerle Demir Kubbe savunmasini en az bir kez deldi, Tel Aviv yakinlarina isabet kaydedildi
• Hizbullah kuzey Israil'e 200+ roket atti, Israil karsiliginda Beyrut guney banliyolerini bombaladi
• Husi gucleri Kizildeniz'de ticari gemileri hedef almaya devam ediyor, Bab el-Mandeb gecisi riskli

💰 EKONOMIK
• Brent petrol savas oncesi 85$'tan 108$'a firladi, varil basina %27 artis — OPEC+ 500K varil/gun acil uretim artisi karari aldi
• Basra Korfezi deniz sigorta primleri savas oncesine gore 10 katina cikti, navlun maliyetleri %40 artti
• Suveys Kanali trafigi %30 dustu, gemiler Umit Burnu rotasina yoneldi — transit sureler 10-14 gun uzadi
• Altin guvenli liman talebiyle 4.500$ uzerine cikti, polyester ve petrol bazli tum hammaddelerde maliyet artisi suruyor

⚠️ Bilgilendirme amaclidir, yatirim tavsiyesi degildir.`;

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
