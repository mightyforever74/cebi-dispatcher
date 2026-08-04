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

### BUG-1 Mühürlü Spec v3 (2026-08-02, Cem + NotebookLM harmanı) — UYGULAMA DURUMU
Mimari: "Mode 1 Advisory — Nihai Karar İnsandadır". Şema düzeltmeleri kanıtla
mühürlendi: kolon `vehicle_id` (assigned_vehicle_id drivers'ta yaşar);
`estimated_end` ayrı kolon YOK → köprü hesapladığı tahmini varışı
**scheduled_end**'e mühürler (Cem kararı 1 — mobil kanalla tek sözleşme);
statüler küçük harf + `accepted` dahil; kolonlar timestamp WITHOUT tz
(DB Etc/UTC) → **tsrange**. NULL pencereli eski görevler kontrolden MUAF
(Cem kararı 2b — veri uydurulmaz, yeni zincir her görevi dolu doğurur).

**Faz D — DB temeli ✅ (staging, migration `1782800000000_bug1-overlap-foundation`):**
`btree_gist` extension + `idx_tasks_time_overlap` Partial GIST
(vehicle_id, tsrange(scheduled_start, scheduled_end); WHERE aktif statüler +
her iki pencere NOT NULL) + `exception_events` CHECK'ine 19. tip
`rule_violation`. Nesne-varlık kanıtı 3/3. **PROD AYNASI BEKLİYOR.**
Ek migration `1782900000000`: `dispatch_decision_log.conflict_metadata jsonb` ✅ staging.

**Faz A — Veri zinciri ✅ (3 katman kapandı):** enterprise approve
(`00c2df1`) `time_windows` kabul eder, `scheduled_start` (yoksa NOW) +
`estimated_end` (HERE v8 truck summary / fallback 40 km/h + %15 buffer /
koordinatsızsa dürüst 2 saat) hesaplar; köprü (`a5f7345`) payload'ı alır ve
INSERT'e mühürler. Frontend bacağı (`eefaa0d`): formdaki VRPTW başlangıcı
approve'a `time_windows` olarak taşınır. Kanıt: TLP-26-00020 HERE gerçek
süresiyle doğdu (09:00→09:35:04).

**Faz B — Denetim motoru (dispatcher kanalı) ✅:** köprüde tsrange && denetimi,
numaratörden ÖNCE (409'da task_no sayacı yanmaz), `409 + conflict_metadata
{conflicting_task_no, overlap_minutes}`; enterprise 409'u
`pushed_before_conflict` ile frontend'e iletir. Smoke 3/3 PASS (S1 pencereli
doğum / S2 409 / S3 override). **Faz B-mobil ✅
(`bab199b`, staging server.js):** POST/PUT /api/tasks sert 409 overlap
denetimi — numaratör-öncesi, efektif-değer + self-exclusion, smoke 4/4 PASS.
VRP soft-warning: HERE VRP cutover'ında devreye girecek (mock'ta fiilen
dispatcher kanalı). **Cascade-delay `rule_violation` monitörü ✅
(`a0695a0`, enterprise):** in_progress pencere taşması + 30dk ufkunda
sıkışan ardışık görev → rule_violation (medium), 409 üretmez (Mode 1);
FN-06 durum-bazlı dedup; sentetik tetik kanıtlı (00017→00022, 22dk).

**Faz C — Override & ML Loglama ✅ (UI kanıtlı, 2026-08-02 gece):**
`ConflictOverrideModal` (MD2 PRO sert modal, zorunlu ≥5 kr gerekçe) +
`ApproveConflictError` yapılandırılmış 409 (`43371c8`) + sayfa kablolaması
(`eefaa0d`) + FN-18 istemci alanları (`5871321`) + backend kabul (`c478bee`)
+ routing_jobs mührü (`80dc32f`). Tasarım: çakışma override'ı araç-seçimi
override'ından (is_override GENERATED) BAĞIMSIZ — işaret conflict_metadata
IS NOT NULL; serbest gerekçe override_comment'te (§6.4 enum korunur).
**Canlı kanıt:** modal ekranda açıldı, Gerekçeli Onay geçti;
dispatch_decision_log satırı {overlap_minutes:4, TLP-26-00022} +
override_comment dolu + is_override=f (ortogonallik kanıtı);
routing_jobs.response_payload aynı mührü + gerekçeyi taşıyor.

**KALAN (BUG-1):** prod migration aynası (1782800000000 + 1782900000000) ·
migration dosyalarının sunucu kopya klasörlerine yazımı.

## BUG-2 — Çoklu Araç Seçiminde Toplu Görev Onayı (Bulk Guard) [ORTA]
1'den fazla araç seçiliyken Kaydet: konfirmasyon dialogu
("Seçtiğiniz N araç için aynı detaylarda AYRI görevler oluşturulacak — onay?").
Evet → araç adedince bağımsız task (benzersiz task_no'lar). Hayır → geri dön.

### BUG-2 UYGULAMA ✅ (2026-08-04, Cem onaylı D1/D2/D3 + F1)
**Backend (`808dff2`, enterprise routes/tasks.js):** approve orkestratörü
draft-başına transaction — assigned işareti + köprü push birlikte commit;
köprü 409'da yalnız o draft ROLLBACK (draft kalır), döngü sürer. Yanıt:
`200 {pushed:M, conflicts:[{draft_id, vehicle_id, conflict_metadata}]}` (D2);
`pushed=0 && conflicts>0` → sert 409 (tekil görev modal sözleşmesi birebir
korundu: conflict_metadata + conflicting_draft_id + pushed_before_conflict).
D1: 409 dışı köprü hatası catch-all 500 (commit olanlar durur). D3: "Plan
partially approved: M pushed, K conflicts." mesajı. Retry: aynı routing_job_id
+ override:true → status='draft' filtresi yalnız kalanları yakalar (ek
mekanizma yok). Numaratör: mevcut atomik ON CONFLICT satır kilidi yeterli
bulundu, DOKUNULMADI. Faz C mühürleme UPDATE'i autocommit'e taşındı.
**Frontend (`c22419b`, dispatcher 3 dosya):** N>1'de BulkConfirmDialog
(MD2 PRO accent, plaka listeli, ConflictOverrideModal desen ikizi); N=1 akışı
bit-bit aynı (saha kanıtlı — dialog açılmadı). Fan-out: araç başına 1 görev
kopyası, draft[i]→araç[i] indeks eşlemesi (kopyalar özdeş → backend
sırasından bağımsız; Kanban sürükleme açık). Kısmi başarı özeti (plaka ·
task_no · dk) + "Çakışanları Gerekçeli Onayla" → mevcut ConflictOverrideModal,
birikimli pushed sayacı. F1 (Cem onaylı): FN-18 karar logu YALNIZ push
edilenlere (pushedSet filtresi — draft kalanlara sahte log, retry'da mükerrer
log yok).
**Saha kanıtı (staging, 04.08):** TLP-26-00026 (NL-92-VB, temiz commit) +
TLP-26-00027 (RD-NL-78, override) — `[BridgeOverlapBlocked]` +
`[BridgeOverlapOverride]` köprü logları; routing_jobs mührü {TLP-26-00020,
30dk, gerekçe}; 409'da numaratör yanmadı (00026→00027 ardışık).

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

### BUG-4 v2 REVİZYON — Rota Katmanı Kontrol Paneli & İnteraktif UX Standartları (2026-08-02, Cem onaylı)
v1'in "yalnız tekil seçim" çözümü saha kullanımı için kısıtlayıcı bulundu ve
4 fonksiyonel gereksinime genişletildi:

1. **Çoklu Katman Kontrol Paneli (Global & Granular):** Haritaya dinamik etki
   eden Filtre/Seçim Paneli. Olasılık A — Global Switch "Tüm Rotaları Göster"
   (tek tıkla tüm aktif rotalar açılır/gizlenir). Olasılık B — plaka bazlı
   seçim (işaretlenen plakanın rota+bayrakları belirir). Olasılık C — sürücü
   adı bazlı seçim (sürücü seçilince aracı ve rotası izole edilir).
2. **Anlık (Real-time) Dinamik Yanıt:** Seçim değişimi 0-delay harita
   katmanına yansır; sayfa yenileme/bekleme yok.
3. **İki Yönlü Hover Senkronizasyonu (Cross-Highlighting):** Haritadan menüye —
   rota hover'ında çizgi kalınlaşır/parlar, sol listedeki araç kartı highlight
   olur. Menüden haritaya — kart hover'ında o aracın rotası öne çıkar.
4. **UI/UX Standardı:** Dark-mode tema (MD2 PRO / MD3 referansı) bozulmadan,
   yer kaplamayan Floating Map Control Widget olarak.

**İlk açılış varsayılanı (Cem kararı):** Global switch KAPALI — sayfa yalnız
araç ikonlarıyla açılır; rota katmanı kullanıcı seçimiyle eklenir (v1 amacı +
50-300 araçlık hedef filo ölçeği; demoda canlı açılış geçişi anlatı öğesi).

**DURUM: UYGULANDI ✅ (2026-08-02, commits `d958729` + `5f6539c`).** Dosyalar:
`src/store/useRouteLayerStore.ts` (görünürlük tek kaynağı + hover state,
0-delay Zustand), `src/components/MapControlWidget/index.tsx` (floating panel,
daraltılabilir), `src/hooks/useDriverIndex.ts` (Olasılık C — atanmamış sürücü
deviceId:null guard'lı, Cem düzeltmesi #1), `LiveFleetMap.tsx` entegrasyonu
(isRouteVisible tek karar noktası; TEK Polyline/araç SABİT key + dinamik
pathOptions hover stili — unmount/remount yok, titreme yok, Cem düzeltmesi #2;
Marker+Polyline+kart çift yönlü hover-sync; durum lejantı sağ-alta taşındı).
Eşleme zinciri: drivers.assigned_vehicle_id (UUID) → VehicleTelemetry.vehicle_id
(snapshot) → device_id. Sıfır backend dokunuşu; esbuild sözdizimi kapısı PASS.
**EK (aynı gün): Infinite auto-zoom loop fix'i `75036d5`** — flyTo tek-atımlık
FlyRequest'e (seq) bağlandı; telemetri tiki kadrajı ezemez; 4 UI testi Cem
tarafından geçirildi.

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

### BUG-6 GUNCELLEME (ayni gece, kod kaniti + fix c6dc3c6):
Kok neden KESIN: varsayilan atama round-robin, "override" tanimi scorer #1'e
gore — ikisi farkli oldugu anda dokunulmamis onay bile override sayiliyordu.
FIX: tek-task akisinda varsayilan atama = scorer #1 (coklu-task round-robin
fallback). Dokunulmamis onay artik is_override=f; dialog yalniz gercek
suruklemede. override_reason=NULL kod bug'i DEGIL (dialog #20 geregi opsiyonel).

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
GÜNCEL DURUM (2026-08-02 gece): BUG-9 ✅ (3947d54) · BUG-6 ✅ (c6dc3c6) ·
BUG-3a fix hazır (EAS build bekler) · BUG-4 v2 ✅ (d958729+5f6539c) + zoom-loop
✅ (75036d5) · **BUG-1 ✅ Faz A/B-dispatcher/C/D-staging (UI kanıtlı)**.
GÜNCEL DURUM (2026-08-04): BUG-1 Faz B-mobil ✅ (bab199b) + cascade monitörü ✅
(a0695a0) · **BUG-2 ✅ (808dff2 backend + c22419b frontend, saha kanıtlı
00026/00027)** · KALAN: BUG-1 prod ayna (migration 1782800000000 +
1782900000000) → BUG-3b (nav ekranı görev adı) → GÖZLEM-7/8 doğrulama.
