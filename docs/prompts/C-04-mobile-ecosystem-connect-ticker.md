# CURSOR GOREV: TulipFleet Landing — Mobil Ekosistem + Connect CTA + Screenshot Ticker

Proje: C:\tulipfleet-landing (Astro + Tailwind + React Islands).
v4 + Polish v1 + C-0 sozlesmelerinin TUM kurallari gecerli (Human Copywriting §0.1, Yasakli Ifadeler, rozet disiplini, durustluk, consent altyapisina dokunma).
Mevcut kapsam BOZULMAZ; asagidaki 3 ekleme sifir kirilmayla entegre edilir. npm run build sifir hata; prefers-reduced-motion tum yeni animasyonlarda zorunlu.

---

## 1. YENI ANA BOLUM — "Ofisten Sahaya Canli Yonetim" (Hero'dan sonra 2. sira)

- **Konum:** Hero + Excel seridinin ARDINA, Feature Tabs'tan ONCE (bu ikincil ozellik degil, sistemin yarisi). Yeni Astro bolumu + kucuk React Island (ekran dongusu icin).
- **Baslik:** "Ofisten Sahaya Canli Yonetim: Akilli Komuta Merkezi & Mobil Saha Koprusu"
- **Ana metin (human tonda, ritmik — aynen ya da cok yakin kullan):**

  > "B2B filo yonetiminde en guclu kartinizi cebinizde unutmayin. TulipFleet sadece bir masaustu yazilimi degil; ofisinizle saha operasyonunuz arasinda 7/24 yasayan mobil bir koprudur. Mobil admin fonksiyonlariyla ister masanizda ister yolda olun: tum araclarinizi canli haritada izler, operasyon ikazlarini (istisna bildirimleri) ve gorev dagilimini gorur, hatta cebinizden tek tikla yeni gorev atarsiniz."
  > _(NOT: "surus hatalari" IFADESI KULLANILMAZ — surucu koclugu yol-haritasidir; "operasyon ikazlari / istisna bildirimleri" CANLI ve dogru ifadedir.)_

- **Advisory metni:**

  > "Dispatcher panelinde gorevleri TulipFleet algoritmalarinin suzgecinden gecirin. Size sunulan rotalari ve onerileri GEREKCELERIYLE gorup secin; secimlerinizin sonuclarini anlik izleyin. Son karar her zaman sizde."

- **CANLI OPERASYON DONGUSU (gorsel zincir — yatay adim seridi, her adimda gercek ekran karesi slotu):**
  `Dispatcher’dan Gorev Ata` ➔ `Surucunun Cebine Push Dussun` ➔ `Gorev Kabul Edilsin` ➔ `Canli Haritada Izle` ➔ `Teslimat Tamamlansin` ➔ `Muhurlu Gorev Sonu Raporu Olussun`
  Solda telefon-cerceveli (CSS mockup frame) gercek app kareleri (3'lu fade dongusu, kaynak: §3 klasoru); sagda zincir + metin.
- **App Store + Google Play rozetleri:** Resmi rozet SVG'leri, linkler `src/config/stores.ts` dosyasindan (`{ appStoreUrl: "", playStoreUrl: "" }` — bos ise rozet render edilir ama link '#' + `[MUSTERI DOLDURACAK: magaza linkleri]` TODO).
- "iOS + Android'de yayinda" rozeti `[CANLI]` yesil.

---

## 2. B2B CONNECT CTA + /connect SAYFASI (durust versiyon)

- **CTA:** Pricing bolumunun altina VE header nav'a ikincil stil buton/link: "Gelistiriciler & ERP Entegrasyonu — TulipFleet Connect". Hero'daki ana CTA ciftine DOKUNULMAZ (trial birincil kalir).
- **Hedef:** YENI `/connect` sayfasi (`en`+`tr`).
- **Icerik:** Baslik + `[YOL HARITASI — YAKINDA]` rozeti (rozet disiplini aynen).
- **Deger onerisi (gercek kapsam):** "ERP/TMS sistemleriniz icin REST + Webhook API: ZE-Zone uygunluk sorgusu, Vrachtwagenheffing maliyet hesabi, gorev/filo verisi." _(SAP/Oracle gibi MARKA ISMI ANILMAZ; "MQTT API" DENMEZ.)_
- **DURUSTLUK:** Sahte dokumantasyon, sahte endpoint ornegi, sahte API key gorseli YASAK. Bir adet TEMSILI istek/yanit blogu gosterilebilir — ustunde "Ornek tasarim — lansmanda kesinlesecek" etiketiyle.
- **Erken erisim formu:** Early-access desenimizin aynisi (ad, e-posta, firma, kullanim senaryosu) ➔ mailto taslagi `info@tulipfleet.com` + "veya dogrudan yazin" satiri. Backend endpoint YOK — TODO isaretle.

---

## 3. MOBIL SCREENSHOT TICKER / BENTO SERIDI (social proof — gercek urun)

- **Kaynak klasor:** `public/screenshots/mobile/` (BU repoda — dispatcher degil!).
- **Dosya deseni:** Sira numarali gorseller (`01-*.jpeg/png`) + ayni numarali `.md` caption dosyalari (LinkedIn arsivinden secilmis metinler).
- **Bilesen:** GPU-dostu sonsuz yatay ticker (CSS transform tabanli) YA DA bento grid — 10+ gorselde ticker, azsa bento sec. Lazy-load (`loading="lazy"`), genislik/yukseklik atributlari (CLS onleme).
- **CAPTION SUZGECI (kritik):** `.md` metinleri HAM BASILMAZ. Cursor her caption'i soyle uyarlar:
  - Duyuru dili/tarihler ("bugun ekledik", "bu hafta") AYIKLANIR — kalici-deger diline cevrilir.
  - §0.1 yasakli jenerik kelimeler temizlenir.
  - `[CANLI]` disiplinine aykiri hicbir iddia caption'a giremez (supheli ifade ➔ caption kisaltilir, iddia atlanir).
  - Her caption 1-2 cumle, ekrani anlatir ("Surucu gorev listesi — kabul/baslat akisi").
- **Klasor BOS ya da YOKSA:** Bilesen yine kurulur, 6 placeholder slot + belirgin `[MUSTERI DOLDURACAK: public/screenshots/mobile/ icine numarali gorsel+caption]` TODO — build KIRILMAZ.
- **prefers-reduced-motion:** Ticker durur, statik grid gosterilir.

---

## 4. TESLIM

- Kucuk commit'ler (bolum basina); README'ye "Mobil Ekosistem" bolumu: `screenshots` klasor sozlesmesi (numara+caption), `stores.ts` doldurma, `/connect` TODO'lari.
- Build sifir hata/uyari; Lighthouse dusmez (yeni gorseller lazy, ticker CSS-tabanli).
