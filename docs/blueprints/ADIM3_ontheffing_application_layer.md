# Adım 3 — Ontheffing Engine Uygulama Katmanı (BLUEPRINT)

> **Durum:** Tasarım reçetesi. Kod DEĞİL — taze oturumda bu dokümandan koda dökülecek.
> **Tarih:** 2026-06-02 (Sıra 3 sonu)
> **Hedef sunucu:** `fleet-enterprise-01` (dispatcher backend, `/opt/enterprise/`)
> **Önkoşullar (hepsi HAZIR):**
>
> - `enterprise.nl_compliance_vehicle_ontheffings` + `enterprise.nl_dagontheffing_counters` + enum `nl_ontheffing_type` (migration 1781600000000) ✅
> - `public.vehicles.emission_class` / `date_first_admission` / `carrosserie_code` (migration 1781700000000) ✅
> - `enterprise.nl_compliance_zones._meta.here_envzone_id` (migration 1781800000000, 19/21 mapped) ✅
> - HERE Tour Planning Model 1 LOCKED (ADR-0011 §8.6, ADR-0012 §3.6/§3.8)

---

## 0. Mevcut Fastify deseni (kanıtlandı 2026-06-02, mevcut koddan)

Yeni route bu desene BİREBİR uyacak:

```js
// routes/<name>.js
'use strict';
async function xRoutes(fastify) {
  fastify.get('/api/dispatcher/...', { preHandler: fastify.authenticate }, async (request, reply) => {
    const companyId = request.user.company_id;          // JWT claim — tenant isolation (ADR-0009 §4.4)
    if (!companyId) return reply.code(403).send({ error: 'Forbidden', message: 'Token missing company_id claim' });
    try {
      const result = await fastify.pg.query(`SELECT ...`, [companyId]);  // @fastify/postgres
      return { ...: result.rows, count: result.rowCount };
    } catch (err) {
      request.log.error({ err }, '...');
      return reply.code(500).send({ error: 'Internal Server Error', message: '...' });
    }
  });
}
module.exports = xRoutes;
```

- **DB:** `fastify.pg.query(sql, [params])` → `result.rows` / `result.rowCount`
- **Auth:** `preHandler: fastify.authenticate` (JWT), `request.user.company_id`
- **Tenant isolation:** her sorgu `WHERE company_id = $1` ile scope edilir
- **Register:** `server.js` `buildApp()` içine `await fastify.register(require('./routes/compliance'));`
- **Schema boundary (ADR-0009 §4.5.1):** dispatcher `enterprise.*` okur/yazar, `public.*` SADECE SELECT

---

## 1. checkCompliance — saf fonksiyon (DB'siz, test edilebilir)

Konum önerisi: `lib/checkCompliance.js` (route'tan ayrı, unit-test edilebilir saf fonksiyon).

### İmza

```js
/**
 * @param {Object} vehicle - { emission_class, date_first_admission, carrosserie_code, vehicle_category }
 * @param {Object} zone    - { zone_id, rules }  (rules = nl_compliance_zones.rules JSONB)
 * @param {Date}   onDate  - değerlendirme tarihi (default: now) — DET cutoff'ları için
 * @returns {Object} {
 *   status: 'compliant' | 'exempt_auto' | 'needs_exemption' | 'blocked' | 'unknown',
 *   reason: string,
 *   needs_dagontheffing: boolean   // status==='needs_exemption' ise true
 * }
 */
function checkCompliance(vehicle, zone, onDate = new Date()) { ... }
```

### Karar matrisi (CVDR752146/1 — sırayla değerlendirilir, ilk eşleşen kazanır)

| #   | Koşul                                                                                | Sonuç               | Gerekçe                                                      |
| --- | ------------------------------------------------------------------------------------ | ------------------- | ------------------------------------------------------------ |
| 1   | `emission_class` veya `date_first_admission` NULL                                    | `unknown`           | Veri eksik — değerlendirilemez (uyar, engelleme)             |
| 2   | `emission_class = 'zero_emission'`                                                   | `compliant`         | ZE araç her zaman girebilir                                  |
| 3   | `carrosserie_code` ∈ otomatik-istisna seti (SH, SB, SF, 15,16,19,23,26,27,31)        | `exempt_auto`       | RDW kentekenherkenning otomatik tanır                        |
| 4   | 40+ yaş (onDate − date_first_admission ≥ 40yıl)                                      | `exempt_auto`       | Oldtimer muafiyeti                                           |
| 5   | `emission_class ∈ (euro_6, euro_vi, euro_7)` AND `date_first_admission < 2025-01-01` | `needs_exemption`\* | Geçiş hakkı 2029'a kadar (\*aslında geçiş dönemi — bkz. NOT) |
| 6   | `date_first_admission ≥ 2025-01-01` AND fosil (zero_emission değil)                  | `blocked`           | Yeni fosil araç — geçiş hakkı yok                            |
| 7   | diğer (euro_5 ve altı, vb.)                                                          | `needs_exemption`   | Dagontheffing gerekir                                        |

> **NOT (taze oturumda netleştirilecek):** Satır 5'in tam mantığı zone'un kendi geçiş takvimine bağlı (`rules.shared_rules.access_rules.transition_*`). Euro 6 + DET<2025 bazı zone'larda 2027, bazılarında 2029 geçiş hakkına sahip. checkCompliance, zone'un `rules` JSONB'sindeki geçiş kurallarını okumalı — sabit kodlanmamalı. Bu, fonksiyonun zone-parametrik olmasını gerektirir. **Açık tasarım sorusu:** geçiş takvimini `rules`'tan mı okuyalım yoksa ayrı bir kural tablosu mu? (öneri: `rules` JSONB'den, çünkü zone başına zaten orada)

> **carrosserie_code seti** kaynağı: ADR-0012 §3.7 + kullanıcı kanıtı (SH=tekerlekli sandalye bestelauto; SB/SF=özel amaç; 15/16/19/23/26/27/31=vrachtauto özel). Sabit liste olarak `lib/`'de tutulabilir.

---

## 2. Endpoint listesi (hepsi `preHandler: fastify.authenticate`)

### 2.1 `POST /api/dispatcher/compliance/check`

Bir araç + zone (veya araç + zone listesi) için uyum değerlendirir. **Salt-okunur** (counter düşmez).

- **Body:** `{ vehicle_id, zone_ids: [...] }` (veya plan bazlı: `{ assignments: [{vehicle_id, zone_id}] }`)
- **Mantık:**
  1. `vehicle_id`'yi `public.vehicles`'tan çek (company_id scope) → compliance kolonları
  2. Her `zone_id` için `enterprise.nl_compliance_zones`'tan `rules` çek
  3. `checkCompliance(vehicle, zone)` çağır
  4. `needs_exemption` çıkanlar için ilgili counter'ı oku (`nl_dagontheffing_counters`) → "8/12 kaldı" bilgisi ekle
- **Yanıt:** `{ results: [{ vehicle_id, zone_id, status, reason, dagontheffing: { used, limit, remaining } }] }`
- **Yazma YOK** — sadece değerlendirme + advisory bilgi

### 2.2 `GET /api/dispatcher/compliance/ontheffing/counters?year=2026`

Şirketin tüm zone'lardaki dagontheffing bütçe durumu.

- **Query:** `year` (default: bulunulan yıl)
- **Sorgu:** `SELECT zone_id, used_count, annual_limit FROM enterprise.nl_dagontheffing_counters WHERE company_id=$1 AND year=$2`
- **Yanıt:** `{ year, counters: [{ zone_id, used_count, annual_limit, remaining }] }`
- Henüz kaydı olmayan zone → `used_count: 0, remaining: 12` (lazy: kayıt yoksa default göster)

### 2.3 `POST /api/dispatcher/compliance/ontheffing/consume` ← ADVISORY ONAY (hibrit)

Dispatcher "evet, 1 günlük muafiyet harca" dediğinde çağrılır. **Counter'ı artıran TEK endpoint.**

- **Body:** `{ vehicle_id, zone_id, date, reference? }`
- **Mantık (tek transaction):**
  1. Counter'ı UPSERT + kilitle: `INSERT ... ON CONFLICT (company_id,zone_id,year) DO UPDATE SET used_count = used_count + 1 ... WHERE used_count < annual_limit RETURNING ...`
     - Eğer `used_count >= annual_limit` → 409 Conflict ("12/12 dolu, hak kalmadı")
     - CHECK constraint (`used_count <= annual_limit`) ikinci güvenlik katmanı
  2. `nl_compliance_vehicle_ontheffings`'e dagontheffing kaydı ekle (`ontheffing_type='dagontheffing'`, `valid_from=valid_to=date`, `source='dispatcher_confirm'`, `reference`)
  3. Her ikisi aynı transaction (`BEGIN/COMMIT`) — counter++ ile kayıt atomik
- **Yanıt:** `{ consumed: true, counter: { used_count, remaining }, ontheffing_id }`
- **Idempotency düşün (açık soru):** aynı vehicle+zone+date için çift consume? (öneri: UNIQUE(vehicle_id,zone_id,valid_from) on dagontheffing rows, ya da app-layer guard)

### 2.4 `GET /api/dispatcher/compliance/vehicle/:id/exemptions`

Bir aracın aktif/geçmiş muafiyetleri (langdurige dahil).

- **Sorgu:** `SELECT * FROM enterprise.nl_compliance_vehicle_ontheffings WHERE vehicle_id=$1 AND company_id=$2 ORDER BY valid_from DESC`
- **Yanıt:** `{ vehicle_id, ontheffings: [{ id, zone_id, ontheffing_type, status, valid_from, valid_to, reference }] }`
- Aktif filtre opsiyonel: `?active=true` → `status='active' AND now() BETWEEN valid_from AND valid_to`

### 2.5 `POST /api/dispatcher/routing/except-zone-ids` ← HERE Model 1 köprüsü

Bir araç + görev (zone) seti için HERE `exceptZoneIds` dizisini üretir.

- **Body:** `{ vehicle_id, zone_ids: [...] }`
- **Mantık:**
  1. Her zone için: araç o zone'da `compliant` / `exempt_auto` / `exempt_granted` (aktif ontheffing) mı? → checkCompliance + exemptions sorgusu
  2. Eğer evet (araç girebilir) → zone'un `_meta.here_envzone_id`'sini al
  3. `here_envzone_id` NULL ise (Dordrecht/Arnhem) → **ATLA** (Layer-2 only, HERE'e gönderilmez)
  4. NULL değilse → diziye ekle
- **Yanıt:** `{ except_zone_ids: ["here:cm:envzone:625", ...], layer2_only_zones: ["dordrecht_ze_zone_2026", ...] }`
- Bu dizi, Tour Planning payload'unda `profiles[].avoid.zoneCategories.exceptZoneIds` olarak kullanılır
- **layer2_only_zones** → dispatcher'a "bu zone'lar HERE'de yok, sadece bizim hard-validation koruyor" uyarısı

---

## 3. Advisory akış (hibrit — uçtan uca, ADR-0005 Mode 1)

```
1. Dispatcher plan oluşturur (görevler + araç atamaları)
2. Frontend → POST /compliance/check (tüm araç×zone)
3. needs_exemption çıkanlar için UI gösterir:
   "Araç X, Amsterdam ZE-zone uyumlu değil. Bu yıl 8/12 hakkınız kaldı. 1 hak harca?"
4. Dispatcher [Onayla] → POST /compliance/ontheffing/consume
   → counter++ (atomik) + ontheffing kaydı
5. Frontend → POST /routing/except-zone-ids (güncel exemption durumuyla)
   → exceptZoneIds dizisi
6. Tour Planning çağrısı: profiles[].avoid.zoneCategories = {
     categories: ["environmental"],
     exceptZoneIds: [<adım 5'ten>]
   }
7. HERE optimize rota döndürür (exempt zone'lara girebilir)
8. (Paralel/her zaman) Compliance Layer: tüm zone'lar için hard-validation +
   ihlal/ceza riski raporu — HERE'den BAĞIMSIZ (Dordrecht/Arnhem dahil her şey)
```

**Kritik prensip:** counter ASLA otomatik düşmez (adım 4 dispatcher onayı şart). HERE soft-avoid (adım 6-7) verimlilik; Compliance Layer (adım 8) uyumluluk — iki katman ayrı.

---

## 4. Dosya planı (taze oturumda oluşturulacak)

```
/opt/enterprise/
  lib/
    checkCompliance.js          # saf fonksiyon (§1) + carrosserie_code seti + DET kuralları
    exceptZoneIds.js            # §2.5 mantığı (here_envzone_id toplama, null atlama)
  routes/
    compliance.js               # §2.1–2.4 endpoint'leri
    routing.js                  # §2.5 (ya da compliance.js içinde)
  server.js                     # + await fastify.register(require('./routes/compliance'));
```

**Test:** `checkCompliance.js` saf fonksiyon → unit test (Jest) kolayca yazılır. Karar matrisinin her satırı için bir test case.

---

## 5. Tasarım kararları (RESOLVED 2026-06-02) + kalan kanıt adımı

Blueprint'in açık soruları gözden geçirildi ve karara bağlandı:

1. **Geçiş takvimi kaynağı → `rules` JSONB (zone-parametrik).** checkCompliance, Euro+DET cutoff'larını koda gömmez; `zone.rules.shared_rules.access_rules` (ve gerekirse `city_overlay` override) altfrom okur. Her belediye farklı geçiş tarihi uygulayabilir (Rotterdam ≠ Amsterdam) — hardcode mimari hata olur. Saf fonksiyon girdisi dinamik: `checkCompliance(vehicle, zone, onDate)` zaten `zone.rules`'u alıyor. **Açık alt-nokta:** `rules` JSONB'de cutoff alan adı standardı (`transition_euro6_det_cutoff` gibi) — mevcut seed'lerde bu alan VAR MI yoksa eklenecek mi, kodlamadan önce bir zone'un `rules`'u SELECT'le kontrol edilmeli.

2. **consume idempotency → DB-layer partial unique index.** App-guard async race condition'da çift-tıklamayı engelleyemez (iki dispatcher aynı araç+gün → 2 hak boşa). Çözüm additive migration:

   ```sql
   CREATE UNIQUE INDEX uidx_vehicle_zone_date_dagontheffing
   ON enterprise.nl_compliance_vehicle_ontheffings (vehicle_id, zone_id, valid_from)
   WHERE ontheffing_type = 'dagontheffing';
   ```

   Çift istek → DB UNIQUE violation (23505) → Fastify catch → 409 Conflict. Counter haksız artmaz. **Yeni migration gerekir** (örn. `1781900000000_add-dagontheffing-idempotency-index.sql`) — B migration'ında (1781600000000) yoktu. Bu, consume endpoint'inden ÖNCE uygulanmalı.

3. **check endpoint girdi → batch.** `{ assignments: [{vehicle_id, zone_id}, ...] }`. Tekli durum dizi=1 ile kapsanır; 20 araç tek HTTP döngüsünde (sub-second) doğrulanır, N-request problemi yok.

4. **vehicle_category → iki ayrı istisna seti.** carrosserie istisnaları kategoriye bağlı:

   ```js
   const BESTELAUTO_EXEMPT_CODES = new Set(["SH"]);
   const VRACHTAUTO_EXEMPT_CODES = new Set(["15", "16", "19", "23", "26", "27", "31", "SB", "SF"]);
   ```

   checkCompliance, `vehicle.vehicle_category`'ye göre doğru seti seçip `.has()` kontrolü yapar. SH ağır vasıtada, 15 panelvanda anlamsız — kategori ayrımı `unknown`/yanlış-pozitif azaltır. **Açık alt-nokta:** `vehicle_category` değerleri (`truck_heavy` default'unu gördük) bedrijfsauto/vrachtauto'ya nasıl maplenecek — değer listesi kodlamadan önce `SELECT DISTINCT vehicle_category` ile görülmeli.

5. **HERE sınırı → blueprint sadece `exceptZoneIds` üretir.** Asıl Tour Planning HTTP POST'u ayrı orkestrasyon servisi (`src/services/hereRoutingProvider.js` veya `lib/hereRoutingProvider.js`) bu endpoint'i/fonksiyonu dahili çağırır. Kapsam kayması önlenir. ADR-0014 (IRoutingProvider) ile hizalı.

### Kalan KANIT adımı (taze oturumun İLK işi — varsayım değil)

6. **DB rolü yazma yetkisi → SMOKE-WRITE TEST ŞART.** İddia: `enterprise_backend` rolü `enterprise.*`'ta ALL PRIVILEGES'a sahip (Sıra 2.9.3'te `ALTER DEFAULT PRIVILEGES` ile mühürlendiği belirtiliyor). **Bu kanıtlanmadan "hazır" sayılmaz**, iki nedenle:

   - Mevcut `db.js` yorumu: _"Phase 1 uses fleetadmin superuser"_ — yani çalışan kod şu an superuser'la bağlanıyor olabilir; `.env`'deki `DATABASE_URL` hangi rolü kullanıyor kontrol edilmeli.
   - `ALTER DEFAULT PRIVILEGES` sadece _sonradan_ oluşturulan tablolara uygulanır. 3 yeni tablo (1781600000000) o ALTER'dan SONRA mı oluştu? Önceyse default privilege almamış olabilir → açık `GRANT` gerekir.

   **Taze oturum ilk komutu** (fleet-enterprise-01 veya prod psql, `enterprise_backend` rolüyle):

   ```sql
   -- enterprise_backend rolüyle dene (dummy insert + rollback)
   BEGIN;
   INSERT INTO enterprise.nl_dagontheffing_counters (company_id, zone_id, year, used_count)
   VALUES ('<gerçek-company-uuid>', 'amsterdam_ze_zone_2026', 2026, 0);
   ROLLBACK;  -- veya bir test company ile INSERT + DELETE
   ```

   Eğer permission denied → kodlamadan önce `GRANT INSERT, UPDATE, SELECT ON ALL TABLES IN SCHEMA enterprise TO enterprise_backend;` (ADR-0009 §4.1 kapsamında, tulipfleet-backend migration olarak).

## 6. Bağımlılık notu

- Bu katman **yazma** yapacak ilk dispatcher kodu (consume → INSERT/UPDATE). Önceki her şey read-only (vehicles SELECT) idi. DB rolü yazma yetkisi (açık soru #5) kodlamadan önce kanıtlanmalı.
- `recreate` gerekecek: yeni route + `.env`'deki HERE_API_KEY okunduğunda `docker compose up -d --force-recreate` (ENTERPRISE_INFRASTRUCTURE.md §5.5).
