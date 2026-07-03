# TulipFleet Dispatcher — Mimari Karar Dokümanı v1
## İki-Sunuculu, API-Driven Task Management & Alert Entegrasyonu

**Tarih:** 2026-07-03
**Durum:** Kilitlenmiş mimari karar — kod yazımından önce onaylandı.
**Kapsam:** `tulipfleet-dispatcher` (frontend), `tulipfleet-enterprise-backend`, `tulipfleet-backend` arası entegrasyon.

---

## 0. Kilitlenmiş Mimari Karar

- **Tek-sunucu migration YOK.** Mevcut iki-sunuculu yapı (`fleet-prod-01` + `fleet-enterprise-01`, private network üzerinden PostgreSQL tüneli) korunuyor.
- **`enterprise_backend` rolü `public.*`'a asla doğrudan YAZMAZ** (INTEGRATION_BOUNDARIES.md §3.1: sadece SELECT). Bu sınır delinmiyor — güvenlik ve tenant-izolasyonu gereği.
- **Tüm dispatcher→ana-sistem yazma işlemleri (task oluşturma dahil) HTTP API çağrısı üzerinden yapılır.** Enterprise backend, ana backend'in mevcut REST API'sini bir HTTP client gibi çağırır — aynı mobil app'in (`CreateTaskScreen.js`) zaten yaptığı gibi. DB-seviyesi INSERT/GRANT genişletmesi yok.
- **Okuma tarafı (task durumları, alert'ler):** Dispatcher, ana sistemin API'lerini fetch/okuma yoluyla tüketir — ayrı bir yazma kanalı gerekmez.

---

## 1. Kod vs Doküman Çelişkileri — Kayıt Altında

Bu çelişkiler **kod referans alınarak** çözülmüştür; dokümanlar zamanla güncellenmeli ama **kodda değişiklik gerektirmez**:

| Çelişki | Doküman ne diyordu | Kod ne yapıyor | Karar |
|---|---|---|---|
| MQTT alert topic ismi | ACL: `fleet/device/+/alert` (tekil) | Firmware: `fleet/device/{chipId}/alerts` (çoğul) | Kod referans; ACL dokümanı düzeltilmeli ama **sistem çalışıyor, dokunulmuyor** |
| 16 alert tipi (`ALERT_CONFIG_MAP`, `AdminAlerts.js`) | Kapsamlı bir davranış-uyarı sistemi gibi görünüyordu | Sahada sadece bir alt küme (geofence, fuel) aktif; geri kalanı **kodda yer kaplayan, henüz tetiklenmeyen fikir aşaması** | Sorun etmiyoruz — App zaten stabil, referans budur |
| Alarm popover mock içeriği (ZE-Zone, sevk gecikmesi vb.) | — | Tamamen benim (Claude) ürettiğim placeholder, gerçek veriye bağlı değildi | Faz 2'de gerçek `/api/alerts`'e bağlandı, bkz. §5 |
| `ENTERPRISE_INFRASTRUCTURE.md` §5.2 token bilgisi | "Token name: `tulipfleet-deploy-2026-05`, expiry: 2026-08-11" | Gerçek token `tulipfleet-deploy-2026-06`, expiry 18 Sep 2026 (kullanıcının GitHub ekranından kanıtlı) | Token bir kez rotate edilmiş, doküman güncellenmemiş. Sistemi etkilemiyor, sadece doküman eski. |

**Kural:** Bundan sonra herhangi bir doküman/kod çelişkisi tespit edilirse, bu tabloya yeni satır eklenir — asla sessizce unutulmaz.

---

## 2. İş 1 — E-posta Entegrasyonu (`/system/settings`) — UÇTAN UCA TAMAMLANDI

**Mevcut durum (kanıtlı, commit `ca9577b`):** `EmailIntegration` bileşeni kodda — 3 soru (kurumsal e-posta, mail istemcisi tercihi, uyarı filtreleri), gerçek API'ye bağlı.

**Persist modeli — tamamen çalışıyor:**
- Tablo: `enterprise.notification_preferences` (enterprise backend'in kendi şeması — `public.*` değil, INTEGRATION_BOUNDARIES §5.3 uyumlu).
- Endpoint: `GET/POST /api/dispatcher/notification-preferences` (`tulipfleet-enterprise-backend`).
- **Uçtan uca deploy, smoke test ve canlı kullanıcı testi 2026-07-03/04'te tamamlandı** — bkz. §5 Faz 1.
- **Önemli:** Enterprise backend Phase 1 mimarisi gereği `fleet_tracking_staging`'e bağlı (`INTEGRATION_BOUNDARIES.md` §3.1, kasıtlı karar — "production cutover for enterprise is a separate decision"). Gerçek veri şu an staging'de oluşuyor, production'daki aynı isimli tablo boş duruyor ama zararsız.

---

## 3. İş 2 — Alarm/İkaz Popover — TAMAMLANDI (2026-07-03, ikinci tur)

**Önceki durum:** Navbar zil ikonu altında 5 tamamen mock `mailto:` uyarısı (ZE-Zone, sevk gecikmesi, telemetri kopması, düşük yakıt) — hiçbiri gerçek veriye bağlı değildi.

**Karar (verildi, sorulmadan uygulandı):** **Doğrudan bağlantı** (`api.tulipfleet.com`), proxy değil — CORS zaten açık kanıtlandığı için (`Access-Control-Allow-Origin: *`, curl testi) ve BasicInfo/ChangePassword/DeleteAccount'taki desenle tutarlı olduğu için.

**Uygulanan model:**
- `GET /api/alerts` (mobil `alertsAPI.getAll`'dan kanıtlı) → gerçek uyarı listesi, `res.alerts || (Array.isArray(res) ? res : [])` defensive parse deseni.
- `PUT /api/alerts/:id/resolve` (body: `{resolution}`) → tıklanınca çağrılır, `is_resolved=true` yapar.
- 16-tip sözlüğü `AdminAlerts.js`'deki `ALERT_CONFIG_MAP` ile birebir eşlendi (severity: critical/warning/info → error/warning/info renk).
- Panel başlığı "🔥 Hot Alert Station" (İngilizce), footer'da "Setup Your Mailbox" → `/system/settings`.
- `refetchInterval: 60s` — periyodik otomatik yenileme, "sıcak" hissi için.

---

## 4. İş 3 — Task Management Temeli
### GERÇEK, ÇALIŞAN Kod — "Proposed" Değil (2026-07-03 kod incelemesiyle doğrulandı)

> **Durum notu:** Bu mimari **zaten inşa edilmiş ve çalışıyor** — `tulipfleet-enterprise-backend/routes/tasks.js` ve `tulipfleet-backend/routes/internalBridge.js`'ten birebir okundu. Önceki "Proposed API-Driven Tunnel / JWT Proxy" taslağı **yanlış varsayımdı**, gerçek kod farklı ve daha güvenli bir model kullanıyor — aşağıda düzeltildi.

**Gerçek zincir (VRP/batch-optimize akışı, tekli task formu yok — bilinçli mimari karar §4.1):**
```
Dispatcher Web UI (kullanıcı JWT'si, fastify.authenticate)
  → enterprise-api: POST /dispatcher/tasks/optimize
       tasks[], vehicles[] → getRoutingProvider().submitVrp() → enterprise.routing_jobs INSERT
       her task → enterprise.dispatch_tasks INSERT (status='draft', kendi şeması, sorun yok)
  → enterprise-api: GET /dispatcher/tasks/optimize/poll/:id (job durumu)
  → enterprise-api: POST /dispatcher/tasks/optimize/approve
       ├─ job tamamlanmış mı kontrol (enterprise.routing_jobs)
       ├─ draft dispatch_tasks'ları round-robin araca ata, 'assigned' yap
       ├─ public.drivers SELECT (assigned_vehicle_id → user_id, SELECT-only kurala uygun)
       └─ axios.POST → INTERNAL_CORE_API_URL (ana backend'in "Internal Bridge"i)
              header: X-Internal-Bridge-Token (SABİT servis-token — JWT DEĞİL)
                → ana backend: POST /api/internal/bridge/tasks
                     güvenlik: (a) token env'de yoksa fail-closed 503,
                               (b) IP allowlist — SADECE localhost/private-network
                                   (10./172.16./192.168.), (c) token eşleşmezse 401
                     ├─ users.id → drivers.id çevirisi (SELECT)
                     ├─ atomik task_no üretimi (company_task_counters, ON CONFLICT DO UPDATE)
                     └─ public.tasks INSERT (ana backend'in KENDİ rolüyle;
                         enterprise_dispatch_task_id FK kolonu zaten şemada var)
```

**Kritik düzeltmeler (önceki taslağa göre):**
1. **JWT forward YOK.** Kullanıcı token'ı sadece enterprise backend'e kadar gidiyor. Ana backend'e giden istek **sabit servis-token (`INTERNAL_BRIDGE_TOKEN`) + IP-allowlist** ile korunuyor — JWT expiry/scope karışmıyor, ayrıca network-seviyeli ikinci katman var. "Tünel" bu ikisinin toplamı.
2. **Kargo/zaman-penceresi alanları zaten şemada** — `enterprise.dispatch_tasks` (`enterprise-schema-init.sql`, ADR-0004 v2, 2026-05-13): `time_window_start`, `time_window_end` (timestamptz), `capacity_required` (jsonb), `skill_required` (text[]). Önceki "Kademe 1/2 iteratif ekleme gerekiyor" kararı **yanlış çıkarımdı** — mobil `public.tasks` tarafına bakıp genelleme yapmıştım, enterprise `dispatch_tasks` tarafında zaten vardı. **Bu alanlar için ek migration gerekmiyor.**
3. **Basit tek-task formu yok, VRP akışı korunuyor** — kullanıcı kararı: "tekerleği yeniden icat etmeyelim." Dispatcher UI, tek task'ı da `tasks=[1 eleman]` olarak optimize+approve akışından geçirecek.
4. **`public.tasks.enterprise_dispatch_task_id`** FK kolonu zaten var (muhtemelen `add-tasks-enterprise-dispatch-task-id` migration'ı) — iki sistemi eşleştiren köprü.

**Açık noktalar (varsaymıyorum, doğrulanmadı):**
- `getRoutingProvider()`'ın gerçek sağlayıcısı (HERE Tour Planning dolu mu, mock/null mu) doğrulanmadı — SYSTEM_TOPOLOGY.md daha önce "Tour Planning: YOK" demişti, ama burada bir factory/interface zaten çağrılıyor; çelişki olabilir, ayrı incelenmeli.
- **`enterprise.behavior_events` — düzeltme (2026-07-03):** Bu tablo `docs/SCHEMA_REFERENCE.md`'de (canlı `\d` çıktısı, son doğrulama 2026-06-18) yok — **henüz gerçek değil.** Ama "halüsinasyon" demek yanlıştı: tablo gerçekten var olan `FEAT-007-driver-performance-coaching.md` ve `FEAT-010` blueprint dokümanlarında tanımlı — sorun, bu "tasarım niyeti" dokümanlarının canlı şemayla karıştırılmasıydı. **Kanıt hiyerarşisi kuralı (bundan sonra geçerli):** `docs/SCHEMA_REFERENCE.md` + `ROADMAP.md`'deki "Done/✅" işaretli maddeler = kanıt; `FEAT-*` spec dosyaları = tasarım niyeti, henüz production değil. ADR'ler bile bazen hatalı olabilir — örnek: ADR-0011 "drivers.skills kolonu var" diyor ama SCHEMA_REFERENCE bunu açıkça yalanlıyor (yetkinlik `enterprise.dispatch_tasks.skill_required`'da tutulur). Çelişki halinde SCHEMA_REFERENCE her zaman kazanır.
- `FEAT-105` (AI Agent: PDF/email order parsing) ve `FN-09` (`POST /api/webhooks/orders/external`, `FEAT-003` spec'inde) — ROADMAP/ADR-0011'e göre **Phase 2, customer-funded, henüz spec aşamasında.** "Setup your mailbox" özelliği bu kapsamda; production'da doğrulanamaz çünkü henüz yazılmadı.

---

## 5. Revize Uygulama Çeklisti

**Faz 0 — Doğrulama (kod yok) — TAMAMLANDI (2026-07-03)**
- [x] Enterprise backend'de mevcut bir HTTP-forward/proxy deseni var mı incele → **buldu:** `routes/tasks.js` (`/optimize/approve`) → `tulipfleet-backend/routes/internalBridge.js` "Internal Bridge" deseni (servis-token + IP-allowlist), bkz. §4.
- [x] `enterprise.notification_preferences` için gerçek migration-runner'ı gör → **sonuç:** enterprise backend'in kendi migration-runner'ı **yok** (`plugins/db.js` sadece connection pool, `package.json`'da migration kütüphanesi yok). Enterprise şemasına ait migration'lar fiziksel olarak `tulipfleet-backend/migrations/`'da duruyor — Faz 1 bu deseni izledi.

**Faz 1 — E-posta Entegrasyonu persist — TAMAMEN BİTTİ, CANLI KULLANICI TESTİYLE DOĞRULANDI (2026-07-03/04)**
- [x] `enterprise.notification_preferences` migration → commit edildi: `tulipfleet-backend` `762fcc9`, sonra düzeltildi `98a3933`
- [x] `GET/POST /api/dispatcher/notification-preferences` endpoint → commit edildi: `tulipfleet-enterprise-backend` `32581ec` + `server.js` register `6aae8b6`
- [x] Frontend `EmailIntegration` gerçek endpoint'e bağlandı → `a28c7b7`
- [x] **DEPLOY TAMAMLANDI:**
  - Migration staging'de (`fleet_tracking_staging`) uygulandı, smoke test: `notification_preferences` tablosu 1 satır döndü
  - Migration production'da (`fleet_tracking`) uygulandı, aynı smoke test başarılı; önce `enterprise` şeması schema-only backup alındı (`/tmp/enterprise_schema_backup_20260704_015042.sql`, 29KB)
  - Enterprise backend `fleet-enterprise-01`'de `git pull && docker compose up -d --build` ile deploy edildi
  - `curl http://localhost:3001/health` → `{"status":"ok","database":"connected"}`
  - `curl https://enterprise-api.tulipfleet.com/health` → `HTTP/2 200`, `server: cloudflare` + `via: 1.1 Caddy` (uçtan uca Cloudflare üzerinden doğrulandı, ENTERPRISE_INFRASTRUCTURE.md §6.2 kriterleri karşılandı)
  - Gerçek JWT ile `GET /api/dispatcher/notification-preferences` → **`{"preferences":null}`** (body doğrudan görüldü, header'dan çıkarım değil) — route çalışıyor, DB'ye bağlanıyor, henüz kayıt yok (beklenen)
- [x] **CANLI KULLANICI TESTİ (2026-07-04):** Kullanıcı dispatcher'da gerçekten giriş yapıp formu doldurup "Save" dedi → "Settings saved" göründü. `fleet_tracking` (production) sorgulandığında `(0 rows)` çıkınca önce hata sanıldı — ama `fleet_tracking_staging` sorgulandığında **gerçek kayıt bulundu** (`notification_email=info@tulipfleet.com`, `mail_client=web`, doğru `updated_at`, backend log'unda `POST ... 200`). **Bu bir hata değil, kasıtlı bir mimari karar:** `INTEGRATION_BOUNDARIES.md` §3.1 açıkça belirtiyor — "Phase 1 dispatcher development connects here [staging]. Production cutover for enterprise is a separate decision recorded in ROADMAP." Enterprise backend'in `.env`'i kasıtlı olarak staging'e bağlı. Production'daki (`fleet_tracking`) `notification_preferences` tablosu şu an boş duruyor — zararsız, ileride cutover kararı alındığında zaten hazır olacak.
- **Sonuç: Dispatcher web arayüzünde "Save" gerçekten çalışıyor, canlı olarak doğrulandı — Phase 1 mimarisine tam uygun şekilde staging veritabanına yazıyor.**

**Faz 2 — Alarm/İkaz gerçek entegrasyon — TAMAMLANDI (2026-07-03, ikinci tur), DEPLOY GEREKMİYOR**
- [x] Proxy mi doğrudan mı kararı → **doğrudan** (`api.tulipfleet.com`), CORS açık kanıtlandığı için proxy zorunlu değildi
- [x] Mock 5 uyarı kaldırıldı, gerçek `GET /api/alerts` + `PUT /api/alerts/:id/resolve` bağlandı → commit `26ca933` (`src/hooks/useAlerts.ts`) + `c81a79c` (navbar)
- [x] 16-tip sözlüğü `AdminAlerts.js`'deki `ALERT_CONFIG_MAP` ile birebir eşlendi (icon Ionicons→MUI çevirisiyle)
- **Not:** Bu faz enterprise/ana backend'de hiçbir değişiklik gerektirmedi — `/api/alerts` zaten production'da vardı (mobil app kullanıyor). Sadece frontend değişti, deploy gerekmiyor, `git pull` sonrası hemen aktif.

**Faz 3 — Task Management temeli (§4'teki VRP akışı gerçeğiyle uyumlu — forward endpoint/Create Task formu YOK, eski taslak kaldırıldı)**
- [ ] Dispatcher frontend: harita/liste üzerinden araç + nokta seçimi → `POST /dispatcher/tasks/optimize` çağrısı (tasks[], vehicles[] — tek task da `tasks=[1 eleman]` olarak buradan geçer)
- [ ] Job durumu takibi: `GET /dispatcher/tasks/optimize/poll/:id` polling
- [ ] Onay ekranı: `POST /dispatcher/tasks/optimize/approve` — operatör planı onaylar, Internal Bridge üzerinden `public.tasks`'a otomatik düşer
- [ ] `routes.tsx`'e yeni route + sidenav girişi (form değil, optimize/approve akışının UI'ı)
- [ ] Enterprise backend ve ana backend'de kod değişikliği **gerekmiyor** — `routes/tasks.js` ve `internalBridge.js` zaten production'da çalışıyor; bu faz sadece frontend'i mevcut akışa bağlıyor.

**Genel proje kuralı (her faza uygulanır):**
- [ ] Her yeni entegrasyonda alan-adı uyumluluk kontrolü (`is_resolved` örneğindeki gibi sessiz isim hatalarına karşı)
- [ ] Her kod/doküman çelişkisi bu dokümanın §1 tablosuna eklenir, unutulmaz

---

## 6. Faz 1 Deploy Sürecinden Öğrenilen Dersler (2026-07-03/04)

Bu bölüm, ileride tekrar migration/deploy yapılırken aynı hatalara düşülmemesi için tutuluyor.

### 6.1 Migration dosyalarında "Down Migration" bloğu mutlaka `/* */` içinde olmalı

İlk migration sürümünde `-- Down Migration` başlığı sadece **satır yorumuyla** (`--`) açılmıştı; altındaki `DROP TRIGGER`/`DROP TABLE` komutları **gerçek SQL** olarak kaldı. `psql < dosya.sql` dosyayı baştan sona sırayla çalıştırdığı için migration tabloyu oluşturdu ve **hemen ardından kendi kendini sildi** — staging smoke test'te `(0 rows)` olarak yakalandı, production'a hiç uygulanmadan. Düzeltme (`98a3933`): Down Migration artık `/* ... */` blok yorumu içinde, otomatik çalışmıyor, rollback gerekirse elle kopyalanıp çalıştırılıyor. **Kural:** Bundan sonraki her migration dosyasında Down bloğu blok yorumla test edilmeden commit edilmeyecek.

### 6.2 `fleet-prod-01`'in yerel git'i uzun süredir güncellenmemiş — büyük fast-forward riski

`git pull` denendiğinde sunucunun HEAD'i (`05aad6d`) GitHub'daki güncel noktadan (`762fcc9`) **çok geride** çıktı — tek `pull`, 18 dosya/2101 satırlık birikmiş bir değişiklik seti getirdi (`server.js`, yeni `services/routing/` klasörü, `FEAT-007-EXT` özellikleri dahil). Bu, benim tek commit'imle ilgisi olmayan, önceden GitHub'a yazılmış ama sunucuya hiç deploy edilmemiş kodlardı. **Kural:** Büyük fast-forward'lardan sonra `docker rebuild` öncesi diff'in kapsamını (`git log --oneline <eski>..<yeni>`) gözden geçirmek gerekir — "küçük bir migration ekliyorum" sanılan bir pull, aslında çok daha büyük bir kod setini production'a taşıyabilir.

### 6.3 Untracked dosyalar `git pull`'u durdurur — sil, taşıma

`fleet-prod-01`'de iki untracked dosya (`FEAT-007-EXT-virtual-telematics/03-logic/calculateVirtualFuelLevel.js`, `05-integration/fuelSnapshotBatch.js`) `git pull`'u engelledi. Silmek yerine `mv` ile `/tmp`'a taşındı, sonra `md5sum` ile origin'deki karşılıklarıyla karşılaştırıldı: biri özdeşti (güvenle atılabilir), diğeri **farklıydı** (sunucuda `DRY_RUN` modu vardı, origin'de kaldırılmıştı — bilinçli bir davranış kaybı, kullanıcıya bildirildi). **Kural:** Untracked dosya çakışmasında asla doğrudan silme; taşı, hash karşılaştır, farklıysa içeriği göster ve kullanıcıya karar bırak.

### 6.4 `fleet-enterprise-01`'in git remote'unda yanlışlıkla bir dispatcher JWT'si bulundu — güvenlik notu

`git remote -v` çalıştırıldığında URL'deki "credential" kısmının bir GitHub PAT değil, **TulipFleet'in kendi dispatcher login sisteminin ürettiği bir JWT** (`demo@tulipfleet.com`, `company_admin`, gerçek bir `company_id` ile) olduğu görüldü — muhtemelen geçmişte biri PAT yapıştıracağı yere yanlışlıkla bu token'ı yapıştırmış. Bu hem `git pull`'un başarısız olmasının sebebiydi (GitHub bunu geçerli bir token formatında görmüyor) hem de bir **credential sızıntısı** (`.git/config` içinde açık metin, `git remote -v` çalıştıran herkes görebilir). Gerçek GitHub PAT (`tulipfleet-deploy-2026-06`) ile `git remote set-url` yapılarak düzeltildi. **Açık nokta:** O JWT'nin hâlâ geçerli olup olmadığı, iptal edilmesi gerekip gerekmediği doğrulanmadı — ayrı bir güvenlik incelemesi gerektirir.

### 6.5 "Settings saved" görmek, production'a yazıldığı anlamına gelmez — çok-veritabanlı sistemlerde her zaman gerçek satırı sorgula

Canlı testte kullanıcı "Settings saved" gördü, ama production DB'de `(0 rows)` çıkınca kısa süreliğine "hata mı bu" diye tereddüt yaşandı. Gerçek sebep: enterprise backend, Phase 1 mimarisi gereği kasıtlı olarak staging'e bağlı (`INTEGRATION_BOUNDARIES.md` §3.1) — hata değildi. **Kural:** İki-veritabanlı (staging/production) bir sistemde "başarılı" UI mesajı yeterli kanıt değildir; hangi DB'ye yazıldığı `.env`'deki `DATABASE_URL`'den ya da doğrudan ilgili DB'yi sorgulayarak teyit edilmeli — production'da `(0 rows)` görmek otomatik olarak "hata" anlamına gelmez, önce staging'i de kontrol et.

---

## Değişiklik Günlüğü
| Tarih | Değişiklik |
|---|---|
| 2026-07-03 | Doküman oluşturuldu. İki-sunuculu API-Driven mimari kararı kilitlendi. |
| 2026-07-03 | **KESİN ONAY.** §0, §1, §2-4, §5 kullanıcı tarafından resmi olarak onaylandı — "havacılık disiplinine yakışır, kusursuz ve açık kapı bırakmayan mühendislik" ifadesiyle. Task Management bölümü "Proposed API-Driven Tunnel Design" olarak işaretlendi (kod henüz yazılmadı, tasarım önerisi). İş 1 (EmailIntegration) origin'den teyit edildi: kod zaten tam, 3-sorulu form + mock state çalışıyor, ek değişiklik gerekmedi. İş 2 (Navbar): 5 mock uyarı, `AdminAlerts.js` gerçek `ALERT_CONFIG_MAP` sözlüğünden seçilmiş 3 kritik tiple (sos, IMPACT, battery) değiştirildi. |
| 2026-07-03 | **Checklist tutarlılık düzeltmesi.** §5 Faz 0 maddeleri tamamlandı olarak işaretlendi (bulgu özetiyle). Faz 1'deki migration konumu netleştirildi: `tulipfleet-backend/migrations/` (enterprise backend'in kendi migration-runner'ı olmadığı kanıtlandığı için). Faz 3, §4'teki kanıtlanmış VRP akışı gerçeğiyle uyumlu hale getirildi — eski "forward endpoint / Create Task formu" taslağı kaldırıldı, yerine mevcut `optimize`/`approve` akışını frontend'e bağlayan maddeler yazıldı. |
| 2026-07-03 (2. tur) | **Settings sayfası temizliği tamamlandı** (Part 1-5, `5ac306f`→`a28c7b7`) — Header/Accounts/Sessions kaldırıldı, demo alanlar silindi, BasicInfo/ChangePassword/DeleteAccount gerçek `api.tulipfleet.com` endpoint'lerine bağlandı (CORS `curl` ile doğrulandı: `Access-Control-Allow-Origin: *`), EmailIntegration İngilizce'ye çevrildi. Faz 1 (notification_preferences) kod tarafı tamamlandı ve doğrudan GitHub'a commit edildi (`762fcc9`, `32581ec`, `6aae8b6`). |
| 2026-07-03 (3. tur) | **Faz 2 (Alarm/İkaz) tamamlandı, doğrudan GitHub'a commit edildi** (`26ca933` useAlerts.ts, `c81a79c` navbar) — deploy gerekmiyor, `/api/alerts` zaten production'da vardı. Kararlar (proxy/doğrudan, hangi endpoint) sorulmadan, kanıta dayanarak doğrudan uygulandı. |
| 2026-07-04 (4. tur) | **Faz 1 uçtan uca deploy tamamlandı ve doğrulandı.** Migration'daki Down-block hatası bulundu ve düzeltildi (`98a3933`, bkz. §6.1). Staging + production'da migration başarıyla uygulandı, production backup alındı. `fleet-enterprise-01`'de git credential sorunu (yanlışlıkla yapıştırılmış dispatcher JWT'si, bkz. §6.4) tespit edildi ve gerçek PAT ile düzeltildi. Enterprise backend deploy edildi (`docker compose up -d --build`), health check'ler Cloudflare üzerinden uçtan uca doğrulandı. §6 (Öğrenilen Dersler) bölümü eklendi. |
| 2026-07-04 (5. tur) | **Canlı kullanıcı testi tamamlandı.** Kullanıcı dispatcher'da gerçekten "Save" dedi, "Settings saved" gördü. Production DB'de `(0 rows)` görülünce kısa bir tereddüt yaşandı, ama `fleet_tracking_staging`'de gerçek kayıt bulundu — `INTEGRATION_BOUNDARIES.md` §3.1'in kasıtlı Phase 1 kararıyla (enterprise backend staging'e bağlı) tam uyumlu, hata değil. §6.5 bu ders için eklendi. **Faz 1 artık hem kod hem deploy hem canlı kullanıcı testiyle tam olarak kapandı.** |
