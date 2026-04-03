const https = require('https');
const GEMINI_KEY = process.env.GEMINI_API_KEY || '';

function callGemini(prompt) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 1500 }
        });
        const req = https.request({
            hostname: 'generativelanguage.googleapis.com',
            path: '/v1beta/models/gemini-2.5-flash:generateContent?key=' + GEMINI_KEY,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            timeout: 20000
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    const text = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
                    if (text) resolve(text); else reject(new Error('Boş yanıt'));
                } catch (e) { reject(e); }
            });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
        req.write(body);
        req.end();
    });
}

const PROMPTS = {
    'iran-risk': 'Sen bir jeopolitik ve ekonomi analistisin. Türkçe yaz. İran-İsrail savaşı (Şubat 2026 başlangıç) bağlamında kısa analiz:\n\n📊 DURUM ANALİZİ\n2-3 cümle genel özet.\n\n⚔️ JEOPOLİTİK RİSKLER\n• 3-4 madde\n\n💰 EKOPOLİTİK RİSKLER\n• 3-4 madde\n\n🔮 İZLENMESİ GEREKENLER\n• 2-3 madde\n\n⚠️ Bu bilgilendirme amaçlıdır, yatırım tavsiyesi değildir.',
    'emtia-enerji': 'Türkçe kısa enerji piyasası analizi. Brent, WTI, doğalgaz. OPEC, jeopolitik, talep. 3 paragraf. ⚠️ Yatırım tavsiyesi değildir.',
    'emtia-metaller': 'Türkçe kısa madenler analizi. Altın, gümüş. Merkez bankası alımları, enflasyon, dolar. 3 paragraf. ⚠️ Yatırım tavsiyesi değildir.',
    'emtia-tarim': 'Türkçe kısa tarım emtia analizi. Buğday, kahve, kakao. İklim, arz-talep. 3 paragraf. ⚠️ Yatırım tavsiyesi değildir.',
    'kurlar': 'Türkçe kısa döviz analizi. USD/TRY, EUR/USD, DXY. Fed/ECB/TCMB faiz. 3 paragraf. ⚠️ Yatırım tavsiyesi değildir.',
    'tahviller': 'Türkçe kısa tahvil analizi. ABD 10Y, getiri eğrisi, Fed beklentileri. 3 paragraf. ⚠️ Yatırım tavsiyesi değildir.',
    'endeksler': 'Türkçe kısa borsa analizi. S&P 500, BIST 100. Kazanç sezonu, risk iştahı. 3 paragraf. ⚠️ Yatırım tavsiyesi değildir.',
    'kripto': 'Türkçe kısa kripto analizi. Bitcoin, Ethereum. ETF, regülasyon. 3 paragraf. ⚠️ Yatırım tavsiyesi değildir.',
    'genel': 'Türkçe kısa küresel piyasa özeti. Emtia, döviz, tahvil, endeks. Risk iştahı, merkez bankaları. 3 paragraf. ⚠️ Yatırım tavsiyesi değildir.'
};

// Gemini çalışmazsa kullanılacak sabit analizler
const FALLBACKS = {
    'iran-risk': '📊 DURUM ANALİZİ\nİran-İsrail arasındaki çatışma bölgesel enerji arz güvenliğini tehdit etmeye devam ediyor. Hürmüz Boğazı trafiği yakından izleniyor.\n\n⚔️ JEOPOLİTİK RİSKLER\n• Hürmüz Boğazı\'ndan geçen tanker trafiğinde aksaklık riski\n• İsrail-İran arasında doğrudan askeri tırmanma ihtimali\n• Hizbullah ve Husi milislerinin vekâlet savaşı genişlemesi\n• ABD 5. Filo\'nun Basra Körfezi\'ndeki konuşlanması\n\n💰 EKOPOLİTİK RİSKLER\n• Ham petrol fiyatlarında jeopolitik risk primi devam ediyor\n• Deniz sigorta maliyetleri Basra Körfezi rotaları için yükseldi\n• Navlun ücretlerinde Süveyş-Ümit Burnu rota değişikliği etkisi\n• Altın ve güvenli liman varlıklarına yönelim sürüyor\n\n🔮 İZLENMESİ GEREKENLER\n• IAEA nükleer denetim raporları ve müzakere süreçleri\n• Kızıldeniz ve Aden Körfezi'ndeki deniz güvenliği gelişmeleri\n• OPEC+ üretim kararları ve yedek kapasite durumu\n\n⚠️ Bu bilgilendirme amaçlıdır, yatırım tavsiyesi değildir.',
    'emtia-enerji': 'Enerji piyasalarında İran-İsrail gerginliği kaynaklı risk primi fiyatlanmaya devam ediyor. Hürmüz Boğazı\'ndaki olası aksaklıklar petrol arzını tehdit ederken, OPEC+ üretim politikaları dengeleyici bir rol üstleniyor.\n\nDoğalgaz tarafında mevsimsel talep azalması fiyatları baskılıyor, ancak LNG rotalarındaki jeopolitik riskler Avrupa TTF fiyatlarını destekliyor. ABD Henry Hub fiyatları ihracat kapasitesi artışıyla yeni denge arıyor.\n\n⚠️ Bu bilgilendirme amaçlıdır, yatırım tavsiyesi değildir.',
    'emtia-metaller': 'Kıymetli madenlerde güvenli liman talebi sürerken, merkez bankalarının altın alımları fiyatları desteklemeye devam ediyor. Dolar endeksindeki hareketler ve reel faiz oranları altın fiyatlamasında belirleyici olmaya devam ediyor.\n\nEndüstriyel metallerde Çin\'in ekonomik toparlanma hızı ve küresel imalat PMI verileri yön belirliyor. Bakır, yeşil enerji dönüşümünün uzun vadeli talebiyle destekleniyor.\n\n⚠️ Bu bilgilendirme amaçlıdır, yatırım tavsiyesi değildir.',
    'emtia-tarim': 'Tarım emtialarında iklim koşulları ve arz güvenliği endişeleri fiyatları etkiliyor. Buğday ve mısırda Karadeniz bölgesindeki ticaret rotaları ile Güney Amerika hasat beklentileri izleniyor.\n\nKahve ve kakao fiyatlarında arz kısıtları devam ederken, navlun maliyetlerindeki artış tüm tarım emtialarını etkiliyor.\n\n⚠️ Bu bilgilendirme amaçlıdır, yatırım tavsiyesi değildir.',
    'kurlar': 'Döviz piyasalarında Fed ve ECB\'nin faiz politikaları temel belirleyici olmaya devam ediyor. USD/TRY\'de TCMB\'nin sıkı para politikası ve cari denge gelişmeleri izleniyor.\n\nDolar endeksi (DXY) ABD makro verileri ve küresel risk iştahıyla yönleniyor. Gelişmekte olan ülke para birimlerinde jeopolitik riskler ve carry trade dinamikleri etkili.\n\n⚠️ Bu bilgilendirme amaçlıdır, yatırım tavsiyesi değildir.',
    'tahviller': 'ABD tahvil piyasasında Fed\'in faiz patikası beklentileri getiri eğrisini şekillendiriyor. 10 yıllık getiri enflasyon beklentileri ve güvenli liman talebinin etkisinde.\n\nGetiri eğrisinin eğimi resesyon sinyalleri açısından yakından izleniyor. Küresel merkez bankalarının politika farklılıkları tahvil piyasalarında volatiliteyi artırıyor.\n\n⚠️ Bu bilgilendirme amaçlıdır, yatırım tavsiyesi değildir.',
    'endeksler': 'Küresel hisse senedi piyasalarında kazanç sezonu beklentileri ve makro veriler yön belirliyor. S&P 500 yapay zeka harcamalarının büyüme üzerindeki etkisini fiyatlıyor.\n\nBIST 100\'de yabancı yatırımcı akışları ve TL\'deki reel değerlenme belirleyici. Asya endeksleri Çin\'in ekonomi politikaları ve yen hareketleriyle yönleniyor.\n\n⚠️ Bu bilgilendirme amaçlıdır, yatırım tavsiyesi değildir.',
    'kripto': 'Kripto para piyasasında kurumsal adaptasyon ve ETF akışları gündemde. Bitcoin\'in halving sonrası arz dinamikleri ve makro korelasyonlar fiyatlamayı etkiliyor.\n\nEthereum ekosisteminde Layer 2 çözümleri ve staking getirileri ilgi çekiyor. Regülasyon gelişmeleri tüm piyasayı yakından ilgilendiriyor.\n\n⚠️ Bu bilgilendirme amaçlıdır, yatırım tavsiyesi değildir.',
    'genel': 'Küresel piyasalarda İran-İsrail gerginliği başta olmak üzere jeopolitik riskler belirleyici olmaya devam ediyor. Enerji fiyatlarındaki risk primi emtia genelinde yayılım gösteriyor.\n\nMerkez bankaları enflasyon ve büyüme arasındaki dengeyi gözetirken, faiz beklentileri döviz ve tahvil piyasalarını şekillendiriyor. Risk iştahı jeopolitik gelişmelere duyarlı.\n\n⚠️ Bu bilgilendirme amaçlıdır, yatırım tavsiyesi değildir.'
};

exports.handler = async function(event) {
    const cat = event.queryStringParameters?.cat || 'genel';
    const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=1800' };

    // Gemini API key yoksa fallback
    if (!GEMINI_KEY) {
        return { statusCode: 200, headers, body: JSON.stringify({ analysis: FALLBACKS[cat] || FALLBACKS['genel'], source: 'fallback' }) };
    }

    try {
        const analysis = await callGemini(PROMPTS[cat] || PROMPTS['genel']);
        if (analysis && analysis.length > 20) {
            return { statusCode: 200, headers, body: JSON.stringify({ analysis, source: 'gemini' }) };
        }
        // Gemini boş döndü → fallback
        return { statusCode: 200, headers, body: JSON.stringify({ analysis: FALLBACKS[cat] || FALLBACKS['genel'], source: 'fallback' }) };
    } catch (e) {
        return { statusCode: 200, headers, body: JSON.stringify({ analysis: FALLBACKS[cat] || FALLBACKS['genel'], source: 'fallback' }) };
    }
};
