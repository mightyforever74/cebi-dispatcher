# Saha Testi Bulguları — 31 Temmuz 2026 (Demo Kuru Koşusu)
> Kaynak: Cem saha testi + kanıt oturumu. UI işlerinin TAMAMI mevcut tema
> bütünlüğünde yapılır: **Material Dashboard 2 PRO React TS (Creative Tim) +
> MD3 PRO React referans** — yeni bileşen deseni icat edilmez.

## BUG-1 — Task Zaman Penceresi Çakışması (Overlap Constraint) [YÜKSEK]
Aynı araca zaman aralığı çakışan ikinci görev atanamamalı.
- Kural: Görev B'nin [scheduled_start, tahmini_varış] aralığı, aracın mevcut
  görevi A ile çakışıyorsa (başlangıç noktası aynı olsun olmasın) REDDEDİLİR.
- Backend: HTTP 409 (FEAT-010 §3.6 tek-aktif-görev sözleşmesinin zaman-pencereli
  genellemesi; tahmini_varış = HERE süre ya da haversine/60 fallback).
- Frontend: sert uyarı modalı ("Bu araca belirtilen aralıkta atanmış görev var").

## BUG-2 — Çoklu Araç Seçiminde Toplu Görev Onayı (Bulk Guard) [ORTA]
1'den fazla araç seçiliyken Kaydet: konfirmasyon dialogu
("Seçtiğiniz N araç için aynı detaylarda AYRI görevler oluşturulacak — onay?").
Evet → araç adedince bağımsız task (benzersiz task_no'lar). Hayır → geri dön.

## BUG-3 — Mobil: Aktif Görevde Rota/Özet Çizilmiyor [DEMO-KRİTİK #1]
TLP-26-00013 in_progress; "Haritada Göster" → rota ve özet YOK.
- Kayıtlı kök neden hipotezi (SESSION_NOTES ders b + bugünkü rota-uyumsuzluk
  teşhisi kök 2): dispatcher-doğumlu görevlerde route_json BOŞ → RouteMap
  Google'a metin adresle düşüp sessiz kalıyor.
- Çözüm adayları (karar bekliyor): (a) köprü task INSERT'ine koordinat/route
  yazsın; (b) mobil, görev koordinatlarından rota istesin; (c) mobil, enterprise
  geometry endpoint'ini tüketsin (HERE cache zaten hazır — tercih adayı).
- Teşhis adımı (Cem talimatı): app kill&relaunch → görev detayı → Haritada
  Göster → console/API hatası kaydı.

### BUG-3 GUNCELLEME (ayni gece, kanit + fix):
Relaunch sonrasi rota GELDI (Google geocoding metin adresle calisiyor;
route_json boslugu engel DEGIL). Yeniden siniflandirma:
- **3a KAPANDI (mobil `focus fix` commit'i):** kok neden kod kanitiyla —
  loadActiveTask yalniz mount'ta kosuyordu, focus-yenileme yoktu; gorev baska
  ekrandan baslatilinca RouteMap bayat task ile rotayi bloke ediyordu.
  Fix: navigation focus listener. Sonraki EAS build'e biner.
- **3b ACIK [KUCUK]:** navigasyon ekraninda gorev adi/task_no hicbir yerde yok.
- **3c TASARIM (bug degil):** cizim telefonun GERCEK konumundan baslar (surucu
  navigasyonu icin dogru); listedeki "Baslangic" metni gorevin pickup'i.
  Demo notu: simulasyonda telefon kamyonda degil.

## BUG-4 / UX — Dispatcher Haritada Seçici Rota Katmanı [ORTA]
Varsayılan: yalnız konum ikonları. Rota+bayrak yalnız listede seçili araç(lar)
için çizilir (checkbox/tıklama). Onlarca araçlı filoda "çorba" önlenir.

## BUG-5 — ARCHITECTURE_DECISION_task-management doc revizyonu [DOKÜMAN]
§4 anlatısı 18 Tem'da donmuş; 31 Tem revizyon bloğu eklendi (dedup kör noktası
+ fix 30a614b, HERE ilk ışık, saha bulguları işaretçisi). Bu commit'te yapıldı.

## BUG-6 — Karar Logu Sahte Override + Reason Kaybı [ORTA]
Bugün 2 onay da is_override=t, override_reason=NULL.
- Kök aday: is_override GENERATED (recommended IS DISTINCT FROM chosen);
  UI recommended_vehicle_id GÖNDERMİYOR olabilir → her onay "override".
  Ayrıca override dialogunda seçilen sebep API'ye ulaşmıyor.
- Fix: UI, ranking'in 1. sırasını recommended olarak POST'a koyar; reason
  taşınması uçtan uca doğrulanır. "Öneri dışında araç seçtiniz" ikazı da aynı
  karşılaştırmadan beslendiği için birlikte düzelir.

## GÖZLEM-7 — Push Tutarsızlığı (A yok, B var) [İZLENECEK]
Görev A onayı push üretmedi (görev oluştu), B üretti. Hipotez: A anında app
ÖN PLANDAYDI (Expo foreground'da sistem banner'ı göstermez). Doğrulama: app
arka plandayken onay tekrarı; gerekirse bridge log + Expo receipt kontrolü.

## GÖZLEM-8 — v3 Hareket Hedefi = dropoff (pickup bacağı yok) [CİLA]
v3 aracı son konumundan DOĞRUDAN dropoff'a sürer; gerçekte önce pickup'a gider.
v3.1: iki bacaklı sürüş (konum→pickup→dropoff). Demo anlatısında şimdilik
"araç yükünü almış, teslimata gidiyor" çerçevesi kullanılır.

## ÖNCELİK SIRASI (mühürlü öneri)
1) BUG-3 (demo-kritik) → 2) BUG-6 (karar logu ML verisini kirletiyor) →
3) BUG-1 (veri bütünlüğü) → 4) BUG-2 + BUG-4 (UX) → GÖZLEM-7/8 doğrulama/cila.
