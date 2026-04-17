exports.handler = async function(event) {
    const cat = event.queryStringParameters?.cat || 'genel';
    const H = {'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Cache-Control':'public, max-age=3600'};
    const A = {
'iran-risk': `📊 GENEL DURUM
İran-İsrail savaşı 28 Şubat 2026'da İsrail'in İran nükleer tesislerine düzenlediği kapsamlı hava operasyonuyla başladı. İran aynı gün balistik füzelerle karşılık verdi. Çatışma o günden bu yana karşılıklı saldırılarla devam ediyor. Bölgedeki tüm aktörler — ABD, Hizbullah, Husiler — çatışmaya doğrudan ya da dolaylı olarak dahil olmuş durumda.

⚔️ ASKERİ VE JEOPOLİTİK GELİŞMELER
• İsrail F-35'leri İsfahan ve Natanz nükleer tesislerini birden fazla kez vurdu; İran'ın uranyum zenginleştirme kapasitesinin büyük bölümü devre dışı kaldı
• İran hipersonik balistik füzelerle Demir Kubbe savunma sistemini en az bir kez aştı; Tel Aviv yakınlarına isabet kaydedildi
• Hizbullah kuzey İsrail'e 200'ü aşkın roket saldırısı düzenledi; İsrail karşılığında Beyrut'un güney banliyölerini bombaladı
• Husi güçleri Kızıldeniz'de ticari gemilere saldırılarını sürdürüyor; Bab el-Mandeb Boğazı yüksek risk altında
• ABD 5. Filo Basra Körfezi'nde iki uçak gemisi grubuyla tam konuşlanma halinde; bölgeye ek kuvvet sevkiyatı devam ediyor
• Diplomatik alanda Çin ve Hindistan arabuluculuk girişimleri başlattı ancak somut ilerleme sağlanamadı

💰 EKONOMİK ETKİLER
• Brent petrol savaş öncesindeki 85 dolardan 108 dolara fırladı — varil başına %27 artış; OPEC+ günlük 500 bin varil acil üretim artışı kararı aldı
• Hürmüz Boğazı'ndan dünya petrolünün yaklaşık %20'si geçiyor; olası bir kapanma küresel enerji arzını doğrudan tehdit ediyor
• Basra Körfezi deniz sigorta primleri savaş öncesine göre 10 katına çıktı; navlun maliyetlerinde %40 artış yaşandı
• Süveyş Kanalı trafiği %30 düştü; gemiler Ümit Burnu rotasına yöneldi, transit süreler 10-14 gün uzadı
• Altın güvenli liman talebiyle 4.500 doların üzerine çıktı; küresel risk iştahı belirgin şekilde zayıfladı

🔮 İZLENMESİ GEREKENLER
• Hürmüz Boğazı'ndaki tanker trafiği ve İran donanma hareketleri
• IAEA nükleer denetim raporları ve olası yeni yaptırım kararları
• Kızıldeniz'deki Husi saldırılarının sıklığı ve kapsamı
• OPEC+ acil toplantıları ve üretim politikası değişiklikleri
• ABD-İran arasında olası doğrudan askeri temas riski

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

'hisseler': `BIST hisselerinde yabancı yatırımcı akışları ve şirket kârlılık beklentileri fiyatlamaların merkezinde yer alıyor. Bankacılık sektörü yüksek faiz ortamında net faiz marjı avantajını koruyor.

ABD mega-cap teknoloji hisselerinde yapay zekâ yatırımları ve bulut bilişim büyümesi değerlemeleri destekliyor. NVIDIA, Microsoft ve Alphabet yapay zekâ altyapısında öne çıkarken, Tesla elektrikli araç rekabetinde baskı altında.

Küresel hisse piyasalarında ticaret gerginlikleri ve merkez bankası politikaları belirleyici olmaya devam ediyor. Gelişen piyasa hisselerinde dolar endeksindeki hareketler ve emtia fiyatları önemli değişkenler arasında.

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

'kure': `Küre genelinde para akışları 24 saat boyunca üç büyük zaman diliminde el değiştiriyor: Asya (Tokyo-Şanghay-Hong Kong), Avrupa (Londra-Frankfurt) ve Amerika (New York-Toronto). Günlük ~7 trilyon USD FX hacmi, yaklaşık 100 trilyon USD küresel piyasa değeri bu ağda dolaşıyor.

Stratejik darboğazlar kritik: Hürmüz'den günde 20 milyon varil petrol, Malakka'dan küresel ticaretin %25'i, Süveyş'ten konteyner trafiğinin %30'u geçiyor. Bab el-Mandeb Husi saldırıları nedeniyle yüksek sigorta primiyle işliyor; Kerç aktif çatışma hattında.

Enerji altyapısı: TürkStream, TANAP ve BTC Türkiye'yi enerji hub'ı haline getiriyor. Nord Stream devre dışı; Druzhba yaptırım baskısı altında. ABD Körfez LNG ihracatı Avrupa'ya yönelirken Katar LNG Asya'nın bel kemiği.

Deniz kabloları: 2Africa, MAREA, JUPITER gibi mega kablolar küresel internetin %95'ini taşıyor. Kızıldeniz'de kablo kesintileri veri trafiğinde şok yaratabilir.

⚠️ Bu analiz bilgilendirme amaçlıdır, yatırım tavsiyesi değildir.`,

'faiz-enflasyon': `Küresel para politikası döngüsü çok kutuplu: Fed/BoE temkinli duraklama, ECB/BoC/Riksbank/SNB aktif indirim patikasında, BoJ ise normalleşme adımlarıyla ters yönde. Türkiye yüksek faiz - yüksek enflasyon ikileminde dezenflasyon patikasına geçiş denemesinde.

Reel faiz haritası: Brezilya, Meksika ve Kolombiya yüksek pozitif reel faizle öne çıkarken, Çin ve bazı EM'ler düşük/negatif reel faizle büyümeye ağırlık veriyor. Rusya savaş ekonomisinde yüksek faize rağmen enflasyon baskısı sürüyor. Arjantin ve Türkiye yüksek nominal faiz ama enflasyonu aşan reel patika yakalamaya çalışıyor.

10Y tahvil cephesinde: ABD 4.4% bandı küresel risksiz faiz referansı, Euro bölgesi 2.5% civarında, EM'lerde 6-15% aralığında geniş bir spektrum. Japonya 10Y'nin 1.4% üzerine çıkması yen-taşıma ticareti üzerinde risk unsuru.

Takip: Fed nokta grafiği, ECB ileri yönlendirme, TCMB adım büyüklüğü, BoJ tahvil alım programının sonlandırılması.

⚠️ Bu analiz bilgilendirme amaçlıdır, yatırım tavsiyesi değildir.`,

'ekonomik-takvim': `Önümüzdeki dönemde Fed, ECB ve TCMB faiz kararları piyasaların başlıca odak noktası olmaya devam edecek. ABD enflasyon verileri ve istihdam rakamları Fed'in faiz patikasını doğrudan belirleyecek.

Türkiye'de TÜİK enflasyon verileri ve TCMB politika kararları TL varlıklar için kritik önem taşıyor. Dezenflasyon sürecinin hızı yatırımcı güvenini doğrudan etkiliyor.

Euro Bölgesi büyüme ve PMI verileri ECB'nin faiz indirim hızını şekillendirecek. Çin büyüme verileri emtia ve gelişmekte olan ülke piyasaları için yön verici nitelik taşıyor.

⚠️ Bu analiz bilgilendirme amaçlıdır, yatırım tavsiyesi değildir.`
    };
    return {statusCode:200, headers:H, body:JSON.stringify({analysis: A[cat]||A['genel']})};
};
