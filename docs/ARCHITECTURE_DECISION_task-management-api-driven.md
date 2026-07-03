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
| Alarm popover mock içeriği (ZE-Zone, sevk gecikmesi vb.) | — | Tamamen benim (Claude) ürettiğim placeholder, gerçek veriye bağlı değildi | Bu turda temizleniyor (bkz. §3) |

**Kural:** Bundan sonra herhangi bir doküman/kod çelişkisi tespit edilirse, bu tabloya yeni satır eklenir — asla sessizce unutulmaz.

---

## 2. İş 1 — E-posta Entegrasyonu (`/system/settings`)

**Mevcut durum (kanıtlı, commit `ca9577b`):** `EmailIntegration` bileşeni zaten kodda — 3 soru (kurumsal e-posta, mail istemcisi tercihi, uyarı filtreleri), tamamen **mock/local state**, "Kaydet" hiçbir yere persist etmiyor.

**Hedef persist modeli:**
- Yeni tablo: **`enterprise.notification_preferences`** (enterprise backend'in **kendi şeması** — `public.*` değil). INTEGRATION_BOUNDARIES §5.3: *"yeni schema/tablo enterprise.* altında → prod-side koordinasyon gerekmez, enterprise backend tek başına sahiplenir."* Bu, §0'daki "public.*'a yazma yok" kuralını **ihlal etmez** çünkü hedef public şema değil.
- FK: `user_id` → `public.users(id)` (SELECT-only okuma, referans için; yazma `enterprise.*`'da kalır).
- Endpoint: enterprise backend'in kendi route'u — `PUT /api/dispatcher/notification-preferences`, `GET /api/dispatcher/notification-preferences`.

**Açık nokta:** Migration + endpoint henüz yazılmadı. Ayrı bir oturumda, `tulipfleet-enterprise-backend` reposunun gerçek migration-runner'ı görülerek yapılmalı — varsaymadan.

---

## 3. İş 2 — Alarm/İkaz Popover Demo Temizliği

**Mevcut durum:** Navbar zil ikonu altında 5 tamamen mock `mailto:` uyarısı (ZE-Zone, sevk gecikmesi, telemetri kopması, düşük yakıt) — hiçbiri gerçek veriye bağlı değil.

**Hedef model (§0 ilkesiyle tutarlı — okuma, yazma değil):**
- Dispatcher, ana backend'in gerçek `GET /api/alerts` (server.js:2147, kanıtlı endpoint) verisini **okur**.
- `resolve` aksiyonu da aynı ilkeyle: ana backend'in `PUT /api/alerts/:id/resolve`'ına gider — enterprise backend DB'ye dokunmaz, sadece HTTP proxy/forward yapar.

**Açık karar noktası (henüz kanıtlanmadı, varsaymıyorum):** Dispatcher frontend bu veriye **doğrudan** `api.tulipfleet.com`'a mı bağlanacak (company_id scoped JWT ile — ENTERPRISE_INFRASTRUCTURE §6.3'teki smoke-test deseninde aynı JWT her iki backend'de de geçerli), yoksa `enterprise-api.tulipfleet.com` üzerinden **proxy** mi edilecek? **Öneri:** proxy — dispatcher zaten tüm veri için `enterprise-api` desenini kullanıyor (tutarlılık), ama bu enterprise backend'de yeni bir forward-endpoint yazımı gerektirir.

**Alert tipi sözlüğü** (gerçek, `AdminAlerts.js`'den kanıtlı — mock'un yerini bunlar alacak): `HARD_BRAKE, HARD_ACCEL, HARD_TURN, SHARP_TURN, IMPACT, OVERSPEED, speed, geofence, geofence_entry, geofence_exit, fuel, maintenance, battery, idle, sos, default`.

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
- Enterprise backend'in kendi migration mekanizması bulunamadı (`lib/`'de yok) — enterprise şemasına ait migration'lar (`enterprise-schema-init.sql` dahil) fiziksel olarak `tulipfleet-backend/migrations/`'da duruyor. Faz 1'de `enterprise.notification_preferences` migration'ının nereye yazılacağı bu yüzden netleşmeli.
- `getRoutingProvider()`'ın gerçek sağlayıcısı (HERE Tour Planning dolu mu, mock/null mu) doğrulanmadı — SYSTEM_TOPOLOGY.md daha önce "Tour Planning: YOK" demişti, ama burada bir factory/interface zaten çağrılıyor; çelişki olabilir, ayrı incelenmeli.
- **`enterprise.behavior_events` — düzeltme (2026-07-03):** Bu tablo `docs/SCHEMA_REFERENCE.md`'de (canlı `\d` çıktısı, son doğrulama 2026-06-18) yok — **henüz gerçek değil.** Ama "halüsinasyon" demek yanlıştı: tablo gerçekten var olan `FEAT-007-driver-performance-coaching.md` ve `FEAT-010` blueprint dokümanlarında tanımlı — sorun, bu "tasarım niyeti" dokümanlarının canlı şemayla karıştırılmasıydı. **Kanıt hiyerarşisi kuralı (bundan sonra geçerli):** `docs/SCHEMA_REFERENCE.md` + `ROADMAP.md`'deki "Done/✅" işaretli maddeler = kanıt; `FEAT-*` spec dosyaları = tasarım niyeti, henüz production değil. ADR'ler bile bazen hatalı olabilir — örnek: ADR-0011 "drivers.skills kolonu var" diyor ama SCHEMA_REFERENCE bunu açıkça yalanlıyor (yetkinlik `enterprise.dispatch_tasks.skill_required`'da tutulur). Çelişki halinde SCHEMA_REFERENCE her zaman kazanır.
- `FEAT-105` (AI Agent: PDF/email order parsing) ve `FN-09` (`POST /api/webhooks/orders/external`, `FEAT-003` spec'inde) — ROADMAP/ADR-0011'e göre **Phase 2, customer-funded, henüz spec aşamasında.** "Setup your mailbox" özelliği bu kapsamda; production'da doğrulanamaz çünkü henüz yazılmadı.

---

## 5. Revize Uygulama Çeklisti

**Faz 0 — Doğrulama (kod yok) — TAMAMLANDI (2026-07-03)**
- [x] Enterprise backend'de mevcut bir HTTP-forward/proxy deseni var mı incele → **buldu:** `routes/tasks.js` (`/optimize/approve`) → `tulipfleet-backend/routes/internalBridge.js` "Internal Bridge" deseni (servis-token + IP-allowlist), bkz. §4.
- [x] `enterprise.notification_preferences` için gerçek migration-runner'ı gör → **sonuç:** enterprise backend'in kendi migration-runner'ı **yok** (`plugins/db.js` sadece connection pool, `package.json`'da migration kütüphanesi yok). Enterprise şemasına ait migration'lar (`enterprise-schema-init.sql` dahil) fiziksel olarak `tulipfleet-backend/migrations/`'da duruyor — Faz 1 bu deseni izleyecek.

**Faz 1 — E-posta Entegrasyonu persist**
- [ ] `enterprise.notification_preferences` migration → **`tulipfleet-backend/migrations/`** reposuna yazılır (Faz 0 bulgusu: enterprise backend'in kendi migration-runner'ı yok; dosya `enterprise-schema-init.sql` deseniyle aynı yerde durur). "Prod koordinasyonu gerekmez" (INTEGRATION_BOUNDARIES §5.3) GRANT/onay süreci içindir, dosyanın deposunu değiştirmez.
- [ ] `GET/POST /api/dispatcher/notification-preferences` endpoint (enterprise backend, `PUT` değil — `server.js` CORS `methods` listesinde PUT yok, kanıtlı)
- [ ] Frontend `EmailIntegration`'ı mock state'ten bu endpoint'e bağla (dispatcher'ın HTTP client deseni önce bulunmalı — açık nokta)

**Faz 2 — Alarm/İkaz gerçek entegrasyon**
- [ ] Proxy mi doğrudan mı kararını ver (öneri: proxy)
- [ ] Mock 5 uyarıyı kaldır, gerçek `GET /api/alerts` + `PUT /api/alerts/:id/resolve` bağla
- [ ] 16-tip sözlüğünü (ikon/renk/i18n) `AdminAlerts.js`'deki `ALERT_CONFIG_MAP` ile birebir eşle

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

## Değişiklik Günlüğü
| Tarih | Değişiklik |
|---|---|
| 2026-07-03 | Doküman oluşturuldu. İki-sunuculu API-Driven mimari kararı kilitlendi. |
| 2026-07-03 | **KESİN ONAY.** §0, §1, §2-4, §5 kullanıcı tarafından resmi olarak onaylandı — "havacılık disiplinine yakışır, kusursuz ve açık kapı bırakmayan mühendislik" ifadesiyle. Task Management bölümü "Proposed API-Driven Tunnel Design" olarak işaretlendi (kod henüz yazılmadı, tasarım önerisi). İş 1 (EmailIntegration) origin'den teyit edildi: kod zaten tam, 3-sorulu form + mock state çalışıyor, ek değişiklik gerekmedi. İş 2 (Navbar): 5 mock uyarı, `AdminAlerts.js` gerçek `ALERT_CONFIG_MAP` sözlüğünden seçilmiş 3 kritik tiple (sos, IMPACT, battery) değiştirildi. |
| 2026-07-03 | **Checklist tutarlılık düzeltmesi.** §5 Faz 0 maddeleri tamamlandı olarak işaretlendi (bulgu özetiyle). Faz 1'deki migration konumu netleştirildi: `tulipfleet-backend/migrations/` (enterprise backend'in kendi migration-runner'ı olmadığı kanıtlandığı için). Faz 3, §4'teki kanıtlanmış VRP akışı gerçeğiyle uyumlu hale getirildi — eski "forward endpoint / Create Task formu" taslağı kaldırıldı, yerine mevcut `optimize`/`approve` akışını frontend'e bağlayan maddeler yazıldı.
