exports.handler = async function(event) {
    const cat = event.queryStringParameters?.cat || 'genel';
    const H = {'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Cache-Control':'public, max-age=3600'};
    const A = {
'iran-risk': `📊 DURUM ANALİZİ
İran-İsrail arasındaki çatışma Şubat 2026'dan bu yana devam ediyor. Hürmüz Boğazı ve Kızıldeniz'deki deniz trafiği aksama riski altında.

⚔️ JEOPOLİTİK RİSKLER
• Hürmüz Boğazı'ndan geçen tanker trafiğinde aksaklık riski artıyor
• İsrail-İran arasında doğrudan askeri tırmanma devam ediyor
• Hizbullah ve Husi milislerinin vekâlet savaşı genişliyor
• ABD 5. Filo'nun Basra Körfezi'ndeki konuşlanması sürdürülüyor

💰 EKOPOLİTİK RİSKLER
• Ham petrol fiyatlarında jeopolitik risk primi yükseldi
• Deniz sigorta maliyetleri Basra Körfezi rotaları için 3 katına çıktı
• Navlun ücretlerinde Süveyş→Ümit Burnu rota değişikliği maliyetleri arttı
• Altın ve güvenli liman varlıklarına yönelim sürüyor

🔮 İZLENMESİ GEREKENLER
• IAEA nükleer denetim raporları ve diplomatik müzakereler
• Kızıldeniz ve Aden Körfezi'ndeki Husi saldırıları
• OPEC+ acil üretim artışı kararları

⚠️ Bu analiz bilgilendirme amaçlıdır, yatırım tavsiyesi değildir.`,
'emtia-enerji': `Enerji piyasalarında İran-İsrail gerginliği kaynaklı risk primi fiyatlanmaya devam ediyor. Hürmüz Boğazı'ndaki olası aksaklıklar ham petrol arzını doğrudan tehdit ediyor. OPEC+ üretim politikaları ve ABD stratejik stok kararları dengeleyici rol üstleniyor.

Doğalgaz tarafında LNG rotalarındaki jeopolitik riskler Avrupa TTF fiyatlarını destekliyor. ABD Henry Hub fiyatları ihracat kapasitesi artışıyla yeni denge arıyor. Mevsimsel talep azalması kısmen baskılayıcı etki yapıyor.

⚠️ Bu analiz bilgilendirme amaçlıdır, yatırım tavsiyesi değildir.`,
'emtia-metaller': `Kıymetli madenlerde güvenli liman talebi güçlü seyrediyor. Merkez bankalarının altın alımları rekor seviyelere ulaşırken, reel faiz oranları ve dolar endeksi fiyatlamada belirleyici olmaya devam ediyor.

Endüstriyel metallerde Çin'in ekonomik toparlanma hızı ve küresel PMI verileri yön belirliyor. Bakır, yeşil enerji dönüşümü ve elektrikli araç talebiyle uzun vadeli destekleniyor.

⚠️ Bu analiz bilgilendirme amaçlıdır, yatırım tavsiyesi değildir.`,
'emtia-tarim': `Tarım emtialarında iklim koşulları ve arz güvenliği endişeleri ön planda. Buğday ve mısırda Karadeniz bölgesi ticaret rotaları ile Güney Amerika hasat beklentileri izleniyor.

Kahve ve kakao fiyatlarında üretici ülkelerdeki arz kısıtları devam ediyor. Navlun maliyetlerindeki artış ve Kızıldeniz rota değişiklikleri tüm tarım emtialarını etkiliyor.

⚠️ Bu analiz bilgilendirme amaçlıdır, yatırım tavsiyesi değildir.`,
'kurlar': `Döviz piyasalarında Fed ve ECB'nin faiz politikaları temel belirleyici. USD/TRY'de TCMB'nin sıkı para politikası ve cari denge gelişmeleri izleniyor. Dolar endeksi ABD makro verileri ve risk iştahıyla yönleniyor.

Gelişmekte olan ülke para birimlerinde jeopolitik riskler ve carry trade dinamikleri etkili. Yen'de BoJ politika değişikliği beklentileri volatiliteyi artırıyor.

⚠️ Bu analiz bilgilendirme amaçlıdır, yatırım tavsiyesi değildir.`,
'tahviller': `ABD tahvil piyasasında Fed'in faiz patikası beklentileri getiri eğrisini şekillendiriyor. 10 yıllık getiri enflasyon beklentileri ve güvenli liman talebinin etkisinde.

Getiri eğrisinin eğimi resesyon sinyalleri açısından izleniyor. Küresel merkez bankalarının politika farklılıkları tahvil piyasalarında volatiliteyi artırıyor.

⚠️ Bu analiz bilgilendirme amaçlıdır, yatırım tavsiyesi değildir.`,
'endeksler': `Küresel hisse senedi piyasalarında kazanç sezonu beklentileri ve makro veriler yön belirliyor. S&P 500 yapay zeka yatırımlarının büyüme etkisini fiyatlıyor.

BIST 100'de yabancı akışları ve TL'deki değerlenme belirleyici. Asya'da Çin ekonomi politikaları ve yen hareketleri endeksleri etkiliyor.

⚠️ Bu analiz bilgilendirme amaçlıdır, yatırım tavsiyesi değildir.`,
'kripto': `Kripto para piyasasında kurumsal adaptasyon ve ETF akışları gündemde. Bitcoin'in halving sonrası arz dinamikleri ve makro korelasyonlar fiyatlamayı etkiliyor.

Ethereum ekosisteminde Layer 2 çözümleri ilgi çekiyor. Küresel regülasyon gelişmeleri tüm piyasayı yakından ilgilendiriyor.

⚠️ Bu analiz bilgilendirme amaçlıdır, yatırım tavsiyesi değildir.`,
'sanayi': `Sanayi hammaddelerinde küresel imalat PMI verileri ve Çin'in talebi belirleyici. Bakır ve alüminyum elektrikli araç ve yenilenebilir enerji yatırımlarıyla yapısal talep artışı yaşıyor.

Çelik sektöründe Çin'in aşırı kapasite sorunu ve ihracat baskısı küresel fiyatları etkilemeye devam ediyor. Nadir toprak elementlerinde arz güvenliği endişeleri ve Çin'in ihracat kısıtlamaları fiyatları destekliyor. Lityum ve uranyum enerji dönüşümünün stratejik hammaddeleri olarak öne çıkıyor.

Kuru yük navlun endeksi (BDI) küresel ticaret hacminin öncü göstergesi olarak izleniyor. Kızıldeniz rota değişiklikleri navlun maliyetlerini artırıyor.

⚠️ Bu analiz bilgilendirme amaçlıdır, yatırım tavsiyesi değildir.`,
'genel': `Küresel piyasalarda İran-İsrail gerginliği başta olmak üzere jeopolitik riskler belirleyici. Enerji fiyatlarındaki risk primi emtia genelinde yayılım gösteriyor.

Merkez bankaları enflasyon-büyüme dengesini gözetirken faiz beklentileri döviz ve tahvil piyasalarını şekillendiriyor. Risk iştahı jeopolitik gelişmelere duyarlı.

⚠️ Bu analiz bilgilendirme amaçlıdır, yatırım tavsiyesi değildir.`,
'navlun': `Küresel deniz taşımacılığında Kızıldeniz/Hürmüz rotalarındaki güvenlik riskleri navlun maliyetlerini artırmaya devam ediyor. Konteyner hatları Ümit Burnu rotasına yönelirken transit süreleri 10-14 gün uzadı.

Kuru yük navlun endeksi (BDI) demir cevheri, kömür ve tahıl taşımacılığının barometresi olarak küresel ticaret hacmini yansıtıyor. Çin'in ithalat talebi BDI'ın ana belirleyicisi olmaya devam ediyor.

Konteyner piyasasında Şangay-Avrupa rotası fiyatları jeopolitik risklerin etkisiyle normalin üzerinde seyrediyor. Sigorta primleri Basra Körfezi ve Kızıldeniz geçişleri için katlanmış durumda.

⚠️ Bu analiz bilgilendirme amaçlıdır, yatırım tavsiyesi değildir.`,
'merkez-bankalari': `Küresel merkez bankaları enflasyon-büyüme dengesini gözetirken farklı politika yolları izliyor. Fed faiz indirim döngüsüne temkinli devam ederken, ECB daha agresif gevşeme sinyalleri veriyor.

TCMB sıkı para politikasını sürdürüyor. Politika faizi %42.5 seviyesinde tutulurken, enflasyonda düşüş trendi izleniyor. Reel faiz pozitif bölgede kalması yabancı yatırımcı ilgisini artırıyor.

BoJ negatif faiz döneminden çıkarak normalleşme sürecine girdi ancak temkinli adımlar atıyor. Yen zayıflığı müdahale riskini canlı tutuyor.

⚠️ Bu analiz bilgilendirme amaçlıdır, yatırım tavsiyesi değildir.`,
'kuresel-risk': `Küresel risk haritasında İran-İsrail savaşı ve Rusya-Ukrayna çatışması iki ana jeopolitik odak noktası olmaya devam ediyor. VIX endeksi belirsizlik dönemlerinde yükseliyor.

Enerji güvenliği, gıda arzı ve tedarik zinciri kesintileri küresel risk algısını şekillendiren temel faktörler. Gelişmekte olan ülkelerde sermaye çıkışları ve kur baskısı izleniyor.

Küresel büyüme beklentileri IMF ve Dünya Bankası tahminleriyle takip ediliyor. ABD-Çin ticaret gerilimleri ve teknoloji savaşları ek risk unsurları oluşturuyor.

⚠️ Bu analiz bilgilendirme amaçlıdır, yatırım tavsiyesi değildir.`,
'ulke-risk': `Ülke risk profillerinde kredi derecelendirme kuruluşlarının not değişiklikleri ve CDS spreadleri öncü göstergeler olarak izleniyor.

Türkiye'de TCMB'nin sıkı para politikası ve enflasyonla mücadele programı kredi notu görünümünü iyileştiriyor. Cari açık daralması ve rezerv artışı olumlu sinyaller veriyor.

İran-İsrail savaşı bölge ülkelerinin risk primlerini artırırken, enerji ihracatçıları petrol geliri artışından faydalanıyor. Rusya uluslararası finansal izolasyonunu sürdürüyor.

⚠️ Bu analiz bilgilendirme amaçlıdır, yatırım tavsiyesi değildir.`,
'ekonomik-takvim': `Önümüzdeki dönemde Fed, ECB ve TCMB faiz kararları piyasaların ana odak noktası. ABD enflasyon verileri (TÜFE) ve istihdam rakamları Fed'in faiz patikasını belirleyecek.

Türkiye'de TÜİK enflasyon verileri ve TCMB kararları TL varlıklar için kritik önemde. Dezenflasyon sürecinin hızı yatırımcı güvenini doğrudan etkiliyor.

Euro Bölgesi GSYİH ve PMI verileri ECB'nin faiz indirim hızını şekillendirecek. Çin büyüme verileri emtia ve gelişmekte olan piyasalar için yön verici.

⚠️ Bu analiz bilgilendirme amaçlıdır, yatırım tavsiyesi değildir.`
    };
    return {statusCode:200, headers:H, body:JSON.stringify({analysis: A[cat]||A['genel']})};
};
