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

'emtia-enerji': `Enerji piyasalarında İran-İsrail gerginliği kaynaklı jeopolitik risk primi fiyatlanmaya devam ediyor. Hürmüz Boğazı'ndaki olası bir aksaklık küresel ham petrol arzını doğrudan tehdit etmektedir. OPEC+'ın üretim politikaları ve ABD stratejik stok kararları piyasadaki dengeleyici unsurlar arasında yer alıyor.

Doğalgaz cephesinde LNG rotalarındaki jeopolitik riskler Avrupa TTF fiyatlarını desteklemeye devam ediyor. ABD Henry Hub fiyatları artan ihracat kapasitesiyle yeni denge noktası arıyor. Mevsimsel talep azalması kısmen baskılayıcı etki yaratıyor.

⚠️ Bu analiz bilgilendirme amaçlıdır, yatırım tavsiyesi değildir.`,

'emtia-metaller': `Kıymetli madenlerde güvenli liman talebi güçlü seyrini koruyor. Merkez bankalarının altın alımları rekor seviyelere ulaşırken, reel faiz oranları ve dolar endeksi fiyatlamada temel belirleyiciler arasında öne çıkıyor.

Endüstriyel metallerde Çin'in ekonomik toparlanma hızı ve küresel imalat PMI verileri yön belirliyor. Bakır, yeşil enerji dönüşümü ve elektrikli araç talebiyle uzun vadeli yapısal destekten faydalanıyor.

⚠️ Bu analiz bilgilendirme amaçlıdır, yatırım tavsiyesi değildir.`,

'emtia-tarim': `Tarım emtialarında iklim koşulları ve küresel arz güvenliği endişeleri gündemin ön sıralarında yer alıyor. Buğday ve mısır piyasalarında Karadeniz bölgesi ticaret rotaları ile Güney Amerika hasat beklentileri yakından takip ediliyor.

Kahve ve kakao fiyatlarında üretici ülkelerdeki arz kısıtları belirleyici olmaya devam ediyor. Navlun maliyetlerindeki artış ve Kızıldeniz rota değişiklikleri tüm tarım emtialarının maliyet yapısını etkiliyor.

⚠️ Bu analiz bilgilendirme amaçlıdır, yatırım tavsiyesi değildir.`,

'kurlar': `Döviz piyasalarında Fed ve ECB'nin faiz politikaları temel fiyatlama dinamiğini oluşturuyor. USD/TRY paritesinde TCMB'nin sıkı para politikası duruşu ve cari dengedeki iyileşme önemli takip kalemleri arasında bulunuyor.

Gelişmekte olan ülke para birimlerinde jeopolitik riskler ve carry trade dinamikleri belirleyici olmaya devam ediyor. Japon yeninde BoJ'un politika normalleşme adımları volatiliteyi artırıyor. Dolar endeksi ABD makroekonomik verileri ve küresel risk iştahıyla yönleniyor.

⚠️ Bu analiz bilgilendirme amaçlıdır, yatırım tavsiyesi değildir.`,

'tahviller': `ABD tahvil piyasasında Fed'in faiz patikası beklentileri getiri eğrisini şekillendiren temel unsur olmaya devam ediyor. 10 yıllık getiri, enflasyon beklentileri ve güvenli liman talebinin kesişim noktasında seyrediyor.

Getiri eğrisinin eğimi olası resesyon sinyalleri açısından yakından izleniyor. Küresel merkez bankalarının farklılaşan para politikaları tahvil piyasalarındaki volatiliteyi artırıyor. Japonya Merkez Bankası'nın normalleşme adımları JGB getirilerinde yukarı yönlü baskı oluşturuyor.

⚠️ Bu analiz bilgilendirme amaçlıdır, yatırım tavsiyesi değildir.`,

'endeksler': `Küresel hisse senedi piyasalarında şirket kazanç sezonu beklentileri ve makroekonomik veriler yön belirlemeye devam ediyor. S&P 500 endeksinde yapay zekâ yatırımlarının büyümeye katkısı fiyatlamaların merkezinde yer alıyor.

BIST 100 endeksinde yabancı sermaye akışları ve Türk lirasındaki reel değerlenme belirleyici faktörler arasında öne çıkıyor. Asya piyasalarında Çin'in ekonomi politikaları ve yen hareketleri bölgesel endeksleri etkiliyor.

⚠️ Bu analiz bilgilendirme amaçlıdır, yatırım tavsiyesi değildir.`,

'kripto': `Kripto para piyasasında kurumsal benimseme süreci ve spot ETF akışları gündemin merkezinde yer alıyor. Bitcoin'in halving sonrası arz dinamikleri ve makroekonomik korelasyonlar fiyat hareketlerini belirliyor.

Ethereum ekosisteminde katman 2 ölçeklendirme çözümleri yatırımcı ilgisini çekmeye devam ediyor. Küresel düzenleme çerçevelerindeki gelişmeler tüm kripto para piyasasını doğrudan etkiliyor.

⚠️ Bu analiz bilgilendirme amaçlıdır, yatırım tavsiyesi değildir.`,

'sanayi': `Sanayi hammaddelerinde küresel imalat PMI verileri ve Çin'in talebi temel belirleyiciler arasında yer alıyor. Bakır ve alüminyum, elektrikli araç üretimi ve yenilenebilir enerji yatırımlarıyla yapısal talep artışı yaşıyor.

Çelik sektöründe Çin'in aşırı kapasite sorunu ve ihracat baskısı küresel fiyatları etkilemeye devam ediyor. Nadir toprak elementlerinde arz güvenliği endişeleri ve Çin'in ihracat kısıtlamaları fiyatları destekliyor. Lityum ve uranyum, enerji dönüşümünün stratejik hammaddeleri olarak önemini artırıyor.

Kuru yük navlun endeksi küresel ticaret hacminin öncü göstergesi olarak izleniyor. Kızıldeniz rota değişiklikleri navlun maliyetlerini yukarı çekiyor.

⚠️ Bu analiz bilgilendirme amaçlıdır, yatırım tavsiyesi değildir.`,

'genel': `Küresel piyasalarda İran-İsrail gerginliği başta olmak üzere jeopolitik riskler fiyatlamaların temel belirleyicisi olmaya devam ediyor. Enerji fiyatlarındaki risk primi emtia genelinde yayılım etkisi gösteriyor.

Merkez bankaları enflasyon ile büyüme arasındaki hassas dengeyi gözetirken, faiz beklentileri döviz ve tahvil piyasalarını doğrudan şekillendiriyor. Risk iştahı jeopolitik gelişmelere karşı yüksek duyarlılık sergiliyor.

⚠️ Bu analiz bilgilendirme amaçlıdır, yatırım tavsiyesi değildir.`,

'navlun': `Küresel deniz taşımacılığında Kızıldeniz ve Hürmüz Boğazı rotalarındaki güvenlik riskleri navlun maliyetlerini artırmaya devam ediyor. Konteyner hatları Ümit Burnu rotasına yönelirken transit süreleri 10-14 gün uzadı.

Kuru yük navlun endeksi demir cevheri, kömür ve tahıl taşımacılığının barometresi olarak küresel ticaret hacmini yansıtıyor. Çin'in ithalat talebi endeksin başlıca belirleyicisi olmaya devam ediyor.

Konteyner piyasasında Şangay-Avrupa rotası fiyatları jeopolitik risklerin etkisiyle normalin üzerinde seyrediyor. Sigorta primleri Basra Körfezi ve Kızıldeniz geçişlerinde belirgin şekilde yükseldi.

⚠️ Bu analiz bilgilendirme amaçlıdır, yatırım tavsiyesi değildir.`,

'merkez-bankalari': `Küresel merkez bankaları enflasyon ve büyüme arasındaki dengeyi gözetirken birbirinden farklılaşan politika yolları izliyor. Fed temkinli bir faiz indirim döngüsü sürdürürken, ECB daha kararlı gevşeme sinyalleri veriyor.

TCMB sıkı para politikasını korumaya devam ediyor. Politika faizi yüksek seviyede tutulurken enflasyonda düşüş eğilimi izleniyor. Reel faizin pozitif bölgede kalması yabancı yatırımcı ilgisini canlı tutuyor.

Japonya Merkez Bankası negatif faiz döneminden çıkarak normalleşme sürecini başlattı ancak adımları son derece temkinli atıyor. Yendeki zayıflık piyasa müdahalesi riskini gündemde tutuyor.

⚠️ Bu analiz bilgilendirme amaçlıdır, yatırım tavsiyesi değildir.`,

'kuresel-risk': `Küresel risk haritasında İran-İsrail savaşı ve Rusya-Ukrayna çatışması iki temel jeopolitik odak noktası olmayı sürdürüyor. VIX endeksi belirsizlik dönemlerinde belirgin yükselişler gösteriyor.

Enerji güvenliği, gıda arzı ve tedarik zinciri kesintileri küresel risk algısını şekillendiren başlıca faktörler arasında yer alıyor. Gelişmekte olan ülkelerde sermaye çıkışları ve kur baskısı yakından takip ediliyor.

Küresel büyüme tahminleri IMF ve Dünya Bankası projeksiyonları doğrultusunda güncelleniyor. ABD-Çin arasındaki ticari gerilimler ve teknoloji rekabeti ilave risk unsurları oluşturuyor.

⚠️ Bu analiz bilgilendirme amaçlıdır, yatırım tavsiyesi değildir.`,

'ulke-risk': `Ülke risk profillerinde kredi derecelendirme kuruluşlarının not değişiklikleri ve CDS spreadleri öncü göstergeler olarak izleniyor.

Türkiye'de TCMB'nin sıkı para politikası ve enflasyonla mücadele programı kredi notu görünümünü olumlu yönde etkiliyor. Cari açığın daralması ve döviz rezervlerindeki artış güven artırıcı sinyaller veriyor.

İran-İsrail savaşı bölge ülkelerinin risk primlerini yükseltirken, enerji ihracatçıları artan petrol gelirlerinden faydalanıyor. Rusya uluslararası finansal izolasyonunu sürdürmeye devam ediyor.

⚠️ Bu analiz bilgilendirme amaçlıdır, yatırım tavsiyesi değildir.`,

'ekonomik-takvim': `Önümüzdeki dönemde Fed, ECB ve TCMB faiz kararları piyasaların başlıca odak noktası olmaya devam edecek. ABD enflasyon verileri ve istihdam rakamları Fed'in faiz patikasını doğrudan belirleyecek.

Türkiye'de TÜİK enflasyon verileri ve TCMB politika kararları TL varlıklar için kritik önem taşıyor. Dezenflasyon sürecinin hızı yatırımcı güvenini doğrudan etkiliyor.

Euro Bölgesi büyüme ve PMI verileri ECB'nin faiz indirim hızını şekillendirecek. Çin büyüme verileri emtia ve gelişmekte olan ülke piyasaları için yön verici nitelik taşıyor.

⚠️ Bu analiz bilgilendirme amaçlıdır, yatırım tavsiyesi değildir.`
    };
    return {statusCode:200, headers:H, body:JSON.stringify({analysis: A[cat]||A['genel']})};
};
