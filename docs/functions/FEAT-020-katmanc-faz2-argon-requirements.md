# FEAT-020 Katman C — Faz 2: Argon Mobil Ekranı Mimari ve UI Gereksinim Taslağı

| Alan | Değer |
|---|---|
| **Durum** | Taslak (implementasyon dışı) — Cem onayı bekliyor |
| **Üst doküman** | `docs/functions/FEAT-020-capacity-aware-delivery-promising.md` §6.3 |
| **Bağımlılık** | Faz 1 (backend + dispatcher) **TAMAMLANDI 2026-10-13** — bu taslak, Faz 1'de gerçekten inşa edilmiş kontratı esas alır, varsayımsal bir API tasarlamaz |
| **Kapsam dışı** | MQTT/telemetry entegrasyonu (bkz. §0 — bu turda inşa edilen hiçbir şey telemetry değil), argon repo'sunun gerçek kod yapısına bakılmadı (bu session'da argon klonlanmadı) — §4'teki sprint 1 bu yüzden "kod tabanını incele" ile başlıyor |

---

## 0. Önemli düzeltme — "telemetry" değil, sürücü self-report

İstekte "canlı telemetry verisi" ve "MQTT/REST snapshot entegrasyonu" ifadeleri geçiyor — bunu netleştirmek gerekiyor, çünkü **Faz 1'de inşa edilen şey telemetry değil**:

- Araç **konumu** hep ve sadece ESP32-S3 tracker'dan gelir (ürün ilkesi: telefon GPS'i hiç kullanılmaz). Bu Katman C ile değişmedi, değişmeyecek.
- Canlı **kargo kapasitesi** tamamen farklı bir veri: sürücünün mobil formda **elle girdiği**, "şu an boş hacmim/ağırlığım bu" diyen bir self-report. MQTT yok, otomatik sensör yok — sürücü butona basmadan hiçbir şey güncellenmez.
- Bu ayrım mobil ekranın UX'ini de belirliyor: bir "canlı telemetry göstergesi" değil, bir **form + submit** akışı.

Aşağıdaki tüm bölümler bu gerçek üzerine kuruludur.

---

## 1. Veri Modelleri ve API Uç Noktaları

### 1.1 Zaten var olan, mobilin tüketeceği endpoint

**`PATCH /api/driver/live-capacity`** (core backend, `tulipfleet-backend/routes/driver.js`, prod'da canlı — commit `93dff86`)

```
Auth: Bearer <driver JWT>  (fastify.authenticate)
Body: { volume_m3?: number, weight_kg?: number }   -- ikisi de opsiyonel, biri gonderilmezse o alan null kalir
```

| Durum | Yanıt |
|---|---|
| Başarılı | `200 { vehicle: { id, live_cargo_volume_m3, live_cargo_weight_kg, live_cargo_reported_at } }` |
| Validasyon hatası | `400 { error: "invalid_volume" \| "invalid_weight" }` |
| Sürücünün aktif araç ataması yok | `404 { error: "NO_ACTIVE_VEHICLE_ASSIGNMENT" }` |
| Sunucu hatası | `500 { error: "Internal server error" }` |

Önemli: **`vehicle_id` body'de YOK** — araç, sürücünün `device_assignments` kaydından (status='active') sunucu tarafında çözümlenir. Mobil hangi aracı güncellediğini seçemez, bu kasıtlı (yetki sızması önleme). Bu yüzden mobil ekran "hangi araç" diye sormaz — zaten bildiği (aktif) aracın kapasitesini bildirir.

Hacim/ağırlık **eksik (null)** gönderilebilir — sürücü sadece birini rapor edebilir (örn. hacim doldu ama ağırlık hâlâ müsait). Sıfır (`0`) geçerli bir değerdir ("tamamen dolu, boş yer yok") — "boş/eksik" ile karıştırılmamalı.

### 1.2 Eksik — Faz 2'nin backend'e ekleyeceği YENİ endpoint (henüz yok)

Mobil ekranın şu iki şeyi öğrenmesi gerekiyor, ama şu an bunu sağlayan hiçbir endpoint yok:

1. **Bu şirket canlı kapasite takibini kullanıyor mu?** (`public.companies.cargo_capacity_tracking` — `required`/`optional`/`off`). `off` ise mobil ekran hiç gösterilmemeli.
2. **Sürücünün aktif aracının statik (MAX) kapasitesi ne?** (`cargo_capacity_volume_m3/weight_kg`, Phase 1.1) — slider'ın üst sınırı ve "X m³ / Y kg kapasiteden ne kadarı boş" bağlamı için gerekli.

Önerilen yeni endpoint — **`GET /api/driver/my-vehicle-capacity`** (core backend, `routes/driver.js`'e eklenecek, `device_assignments` + `vehicles` + `companies` join'i, aynı auth deseni):

```
Auth: Bearer <driver JWT>
Response 200:
{
  tracking: "required" | "optional" | "off",
  vehicle: {
    id, plate_no,
    maxVolumeM3: number | null, maxWeightKg: number | null,
    liveVolumeM3: number | null, liveWeightKg: number | null, liveReportedAt: string | null
  }
}
Response 404: { error: "NO_ACTIVE_VEHICLE_ASSIGNMENT" }
```

Bu, Faz 2'nin **gerçek ilk kodlama görevi** — Faz 1 bunu kapsamıyordu çünkü dispatcher tarafı zaten enterprise-backend üzerinden kendi SELECT'ini yapıyordu, mobilin simetriği yoktu.

### 1.3 Validation kuralları (mobil form, backend'le simetrik olmalı)

`routes/liveCapacityHelpers.js`'teki kurallarla birebir aynı olmalı (backend zaten bunu uyguluyor, mobil sadece kullanıcıyı erken uyarmak için aynısını tekrarlar):
- Negatif değer kabul edilmez
- Boş/temizlenmiş alan `null` olarak gönderilir (o alanı "bilinmiyor" yapar, sıfır değil)
- `0`, geçerli ve "dolu" anlamına gelen bir değerdir
- Sayı `maxVolumeM3`/`maxWeightKg`'ı aşarsa (statik max'tan fazla "boş yer" bildirmek mantıksız) — **backend bunu reddetmiyor** (kasıtlı: sunucu tarafında bu kontrol yok), mobil tarafta sadece UI uyarısı/soft-warning olarak ele alınmalı, sert validasyon hatası OLMAMALI.

---

## 2. UI / UX Ekran Akışları ve Bileşen Tasarımı

### 2.1 Ekranın gösterilme koşulu

Ekran, sürücünün ana görev akışında (muhtemelen görev detay/aktif görev ekranında bir bölüm veya ayrı bir sekme) **sadece** `tracking !== 'off'` ise görünür. `required` ise görev tamamlama akışında nazik bir hatırlatma/soft-prompt (zorunlu blok değil — spec'te hiçbir yerde "zorunlu" kelimesi backend'de bir kısıtlamaya dönüşmedi, bu sadece UI nüansı).

### 2.2 Ana bileşenler

- **Çift slider/stepper** — hacim (m³) ve ağırlık (kg), `GET /api/driver/my-vehicle-capacity`'den gelen `maxVolumeM3`/`maxWeightKg` ile sınırlı. Statik max yoksa (`null`) slider yerine düz sayı girişi (TextInput, mobile klavye `numeric`), çünkü sınır bilinmiyor.
- **Hızlı aksiyon butonları:** "Tamamen boş" (max değerleri doldurur) / "Tamamen dolu" (sıfır doldurur) — sürücü her seferinde hassas sayı girmek zorunda kalmasın.
- **Son rapor bilgisi:** `liveReportedAt` varsa "Son bildirim: X dakika önce" — sürücü neyin güncel neyin bayat olduğunu görsün (staleness UI'da gösterilir, backend'de kontrol edilmiyor — bkz. Faz 1 spec §6.1 madde 5, bilerek açık bırakıldı).
- **Gönder butonu** — `PATCH /api/driver/live-capacity` çağrısı, başarı/hata toast'ı (projenin mevcut `useNotifications` benzeri deseniyle — argon'un kendi toast bileşeni neyse onunla, dispatcher'daki `components/Notifications` BİREBİR aynı olmak zorunda değil, farklı repo).
- **Araç konumu/telemetry göstergesi İSTENMEDİ** — bu ekran konum göstermez (§0), sadece kapasite.

### 2.3 Offline / bağlantısız durum

Sürücü sahada, bağlantı zayıf/yok olabilir (depo, kapalı alan). Strateji:

1. Form her zaman açılır ve doldurulabilir (son bilinen `maxVolumeM3`/`maxWeightKg`'ı yerel cache'den okur, cihaz offline'sa son çekilen değerle sınırlı).
2. Gönder'e basıldığında ağ yoksa: istek **yerel bir offline queue'ya** (AsyncStorage, tek-slotlu — "son rapor" mantığıyla, art arda offline denemelerde eskiyi YENİSİYLE DEĞİŞTİRİR, kuyruğa çoklu kayıt BİRİKTİRMEZ; çünkü bu "şu an boş kapasitem" tipi bir veri, sıralı event log değil, en son değer önemli) yazılır, UI "Gönderilecek (bağlantı bekleniyor)" rozeti gösterir.
3. Bağlantı geri geldiğinde (NetInfo veya mevcut connectivity hook'u neyse) otomatik retry; başarılıysa queue temizlenir.
4. Retry başarısız olursa (401/403/500) kullanıcıya açık hata gösterilir, sessizce denenip bırakılmaz.

### 2.4 Sürücü deneyimi notları

- Mesajlar kısa, Türkçe/Hollandaca/İngilizce (projenin 9-dil i18n gate'ine tabi — argon'un kendi `i18n-add-keys.mjs` akışıyla eklenmeli, dispatcher'ın `scripts/i18n-gate.mjs`'i değil, argon'un kendi eşdeğeri).
- Sürücüye asla "bu veri zorunlu" diye bloklayıcı bir modal çıkarılmaz (spec'in "asla bloke etmez" ilkesi backend'de var, mobil UI'da da aynı ruh korunmalı).

---

## 3. Entegrasyon ve Kontrat Haritası

```
┌─────────────────┐  PATCH /api/driver/live-capacity   ┌──────────────────────┐
│  Argon Mobil     │ ──────────────────────────────────▶│ tulipfleet-backend   │
│  (surucu formu)  │                                      │ (core, public.vehicles)│
│                  │  GET /api/driver/my-vehicle-capacity│                      │
│                  │ ◀──────────────────────────────────│ (YENI, Faz 2)        │
└─────────────────┘                                      └──────────┬───────────┘
                                                                     │ ayni satir
                                                                     │ (public.vehicles)
                                                                     ▼
┌─────────────────┐  GET /api/dispatcher/vehicles        ┌──────────────────────┐
│  Dispatcher Web  │ ◀──────────────────────────────────│ tulipfleet-enterprise-│
│  (optimize/      │  (statik+canli+tracking, FN-3       │ backend              │
│   index.tsx)     │   kapandi, ayni satiri SELECT)       │                      │
└────────┬─────────┘                                      └──────────────────────┘
         │ resolveCargoCapacity() — SADECE dispatcher'da
         ▼
   cargoScorer.ts (degismedi)
```

**Kritik prensip:** `cargoCapacityResolver.ts`'teki karar mantığı (statik mi canlı mı, `tracking` değerine göre) **SADECE dispatcher'da** yaşar. Mobil bu mantığı **asla tekrar etmez/bilmez** — mobil sadece "şu anki boş kapasitem bu" der, hangi verinin ne zaman kullanılacağına dispatcher karar verir. Mobil tarafta `cargoCapacityResolver` benzeri bir kopya kod YAZILMAMALI — bu, iki yerde aynı kararın farklılaşması riskini (bug sınıfı: "mobilde farklı, webde farklı davranış") baştan keser.

Mobil'in tek sorumluluğu: `tracking` değerine göre ekranı göster/gizle (§2.1) — bu da bir "karar" değil, basit bir görünürlük anahtarı.

---

## 4. Faz 2 Uygulama Yol Haritası (öneri)

| Sprint | İş | Çıktı |
|---|---|---|
| **1. Kod tabanı incelemesi + backend endpoint** | argon repo'sunun gerçek yapısı incelenir (ekran/route/store konvansiyonları — bu taslak argon kodunu görmeden yazıldı, varsayımlar burada doğrulanır). `GET /api/driver/my-vehicle-capacity` RED→GREEN TDD ile `tulipfleet-backend`'e eklenir (device_assignments + vehicles + companies join, §1.2) | Yeni endpoint, testli, staging'de doğrulanmış |
| **2. API client + store** | Argon'un mevcut API client deseniyle (`validate-serial`/`assign-device` çağırdığı yer neyse) iki yeni çağrı: GET my-vehicle-capacity, PATCH live-capacity. Offline queue state (AsyncStorage, §2.3) | API katmanı, offline queue altyapısı |
| **3. UI Layout** | Ekran/bölüm (§2.1-2.2): slider/stepper, hızlı aksiyon butonları, son rapor bilgisi, gönder butonu. i18n key'leri 9 dile eklenir | Ekran, i18n-complete |
| **4. Offline/retry entegrasyonu** | NetInfo tetiklemeli otomatik retry, hata/başarı toast'ları, "gönderilecek" rozeti | Offline akış çalışır durumda |
| **5. E2E mobil test** | Gerçek cihaz/emülatörde: rapor gönder → core DB'de görün → dispatcher'da `cargoCapacityResolver` doğru sonucu versin (Faz 1'in staging E2E'sine simetrik, bu kez mobil UI üzerinden) | Faz 2 TAMAMLANDI işareti |

---

## Açık maddeler (implementasyona geçmeden Cem'in netleştirmesi gerekenler)

1. **Ekranın yeri:** Ayrı bir sekme mi, yoksa mevcut görev detay ekranının bir bölümü mü?
2. **`required` modunda UI nüansı:** Soft-prompt ne zaman tetiklenir — görev kabul ederken mi, tamamlarken mi, periyodik mi?
3. **Argon'un gerçek offline/connectivity altyapısı** zaten var mı (başka bir akışta kullanılıyor mu) yoksa bu, Faz 2 ile birlikte ilk kez mi kuruluyor?
