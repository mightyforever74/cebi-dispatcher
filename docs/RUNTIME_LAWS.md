# RUNTIME_LAWS.md — Enterprise Backend Code & Genetics Constitution

Amaç: `tulipfleet-enterprise-backend` reposunda dil, klasör mimarisi, framework
ve veritabanı durum otoritesi kuralları. Bir kural ADR-0014 veya ön-yüz
(dispatcher) kod tabanıyla çeliştiğinde, bu dokümandaki canlı-doğrulanmış
Node.js yer-gerçekleri kazanır. Son doğrulama: 2026-06-19 (PowerShell + server.js).

## 1. Dil ve Çalışma Zamanı Otoritesi

- Bu repo **saf JavaScript (Node.js)** ile yazılmıştır. `tsconfig.json` YOKTUR.
  `src/` dizini projede YOKTUR (sadece node_modules içindeki harici kütüphanelerde
  görülür: ajv-formats, fast-jwt vb.). Kod doğrudan kök altındaki routes/lib/plugins'te yaşar.
- TypeScript anahtar kelimeleri (`interface`, `type`, `export function`, `: Type`)
  KULLANILAMAZ. `.ts` dosyası import edilemez.
- Tip güvenliği ve IDE otomatik tamamlama SADECE **JSDoc** ile sağlanır
  (`@typedef`, `@param`, `@returns`).

### 1.1 ADR (TypeScript) → bu repo (JSDoc) köprüsü
ADR-0014 kontratları TypeScript interface olarak yazılıdır (`IRoutingProvider`,
`ProviderCapabilities`, `VrpProblem`). Bu repoda onlar JSDoc `@typedef`'e indirilir.
Örnek:

ADR-0014'te:
```typescript
export interface ProviderCapabilities { computeRoute: boolean; solveVrp: boolean; }
```
Bu repoda:
```javascript
/**
 * @typedef {Object} ProviderCapabilities
 * @property {boolean} computeRoute
 * @property {boolean} solveVrp
 */
```
Kural: ADR TypeScript yazar, bu repo JSDoc'a çevirir. Kontrat anlamı korunur,
sözdizimi runtime'a uyarlanır.

## 2. Framework ve Klasör Desen Kuralları

- **Framework: Fastify** (Express DEĞİL). `server.js`: `const Fastify = require("fastify")`,
  plugin/route kaydı `fastify.register(require("./..."))` ile.
- Route deseni: her route dosyası bir Fastify plugin'i olarak export edilir ve
  server.js'te `fastify.register` ile kaydedilir.
- DB erişimi: `plugins/db.js` register edilir; handler'larda Fastify-postgres
  deseni (`fastify.pg.connect()`).
- Auth: `plugins/auth.js`, route'larda `preHandler: [fastify.authenticate]`.

Mevcut düzen (2026-06-19 canlı):
- `routes/`: HTTP endpoint + request validasyon → compliance.js, drivers.js,
  health.js, locations.js, tasks.js, vehicles.js
- `lib/`: bağımsız iş mantığı, provider soyutlamaları, algoritmalar →
  calculateHeffing.js, checkCompliance.js, exceptZoneIds.js
- `plugins/`: global Fastify eklentileri → auth.js, db.js

Yeni routing kodu bu desene uyar: provider/builder/contract → `lib/routing/`,
HTTP girişi → `routes/`.

## 3. Durum ve Veri Kalıcılığı Otoritesi

- `enterprise.routing_jobs.routing_jobs_status_check` tek meşru durum otoritesidir.
- Geçerli statüler harfiyen: `'submitted'`, `'running'`, `'completed'`, `'failed'`.
- **ADR çelişkisi (kilitlenmeli):** ADR-0014 `VrpJobStatus`'ta `pending` geçer,
  ama tablo `running` kullanır. Kod TABLO enum'unu (`running`) kullanır, ADR'deki
  `pending`'i DEĞİL. ADR-0014'e bu yönde Correction düşülecek.
- `idx_routing_jobs_request_hash_completed` UNIQUE indeksi gereği, `status='completed'`
  olan bir işin `request_hash`'i tablo genelinde benzersizdir. Deduplication kontrolü
  bu indekse göre koşar (aynı problem iki kez çözülmez).
- routing_jobs tam şeması ve dispatch_tasks FK bağı: SCHEMA_REFERENCE.md.

## 4. Config Gerçeği (2026-06-19)

- `.env.example`'da HERE Tour Planning / ROUTING_PROVIDER değişkenleri HENÜZ YOK.
  FEAT-001 provider implementasyonunda eklenecek: `ROUTING_PROVIDER` (here-tour|mock),
  ve HERE Tour Planning credential değişkenleri (OAuth ya da key, HERE hesabına göre).
- Yakıt Batch Cap Otoritesi: fuelSnapshotBatch.js script'inin çalışma sınırları ana fleet (tulipfleet-backend) .env dosyası üzerinden kontrol edilir (enterprise backend değildir).
FUEL_CAP_KM_PER_DAY: Makul lojistik günlük kilometre tavanı (default: 450).
FUEL_CAP_BLIND_DAYS: Maksimum kör-gün hesaplama sınırı (default: 5).
Bu değişkenler tanımlı değilse sistem varsayılan değerleri (450km / 5 gün) kullanır.

## 5. Güncelleme Kuralı
Repoda dil/framework/klasör deseni değişince ya da routing config eklenince burayı
güncelle, "Son doğrulama" tarihini yenile. Bu doküman çalışan koddan beslenir,
hafızadan değil. JSON kilit: `PROJECT_CONSTITUTION.json` (repo kökü).
