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
| `ENTERPRISE_INFRASTRUCTURE.md` §5.3 `.env` alan listesi | `NODE_ENV, PORT, HOST, DATABASE_URL, JWT_SECRET, MQTT_*, LOG_LEVEL` — `INTERNAL_BRIDGE_TOKEN`/`INTERNAL_CORE_API_URL` hiç yok | Bu iki değişken gerçekte gerekliydi (routes/tasks.js approve akışı) ama enterprise `.env`'inde hiç tanımlı değildi | Faz 3'te eklendi (bkz. §5 Faz 3, §6.6-6.8). Doküman bu iki alanı hiç listelememiş — eksik doküman, kod bunu ortaya çıkardı. |
| `/api/driver/tasks` status filtresi vs. proje geneli | Filtre: `pending, pending_review, accepted, in_progress` — `assigned` yok | `assigned`, `fleet-stats`/vehicle-silme/driver-silme sorgularında "aktif görev" kategorisine zaten dahil (3 ayrı yerde kanıtlı) | Kod içi tutarsızlık, doküman değil — bkz. §4.1 ve §6.11. **Düzeltildi, bkz. §5 Faz 4.** |

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

## 4. İş 3 — Task Management Temeli — UÇTAN UCA TAMAMLANDI, SÜRÜCÜ GÖRÜNÜRLÜĞÜ DE DÜZELTİLDİ (2026-07-04/15)
### GERÇEK, ÇALIŞAN Kod — "Proposed" Değil

> **Durum notu:** Bu mimari **zaten inşa edilmiş ve çalışıyor** — `tulipfleet-enterprise-backend/routes/tasks.js` ve `tulipfleet-backend/routes/internalBridge.js`'ten birebir okundu, sonra frontend'e bağlanıp canlı olarak test edildi.

**Gerçek zincir (VRP/batch-optimize akışı, tekli task formu yok — bilinçli mimari karar §4.1) — CANLI DOĞRULANDI:**
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
       └─ axios.POST → INTERNAL_CORE_API_URL (ana backend'in "Internal Bridge"i, STAGING portu 3001)
              header: X-Internal-Bridge-Token (SABİT servis-token — JWT DEĞİL)
                → ana backend (staging): POST /api/internal/bridge/tasks
                     ├─ users.id → drivers.id çevirisi (SELECT)
                     ├─ atomik task_no üretimi (company_task_counters, ON CONFLICT DO UPDATE)
                     └─ public.tasks INSERT (status='assigned'; enterprise_dispatch_task_id FK dolu)
                            → GET /api/driver/tasks artık 'assigned'ı da gösteriyor (2026-07-15 fix)
                            ✅ Sürücü artık görevi görebiliyor, canlı doğrulandı
                            ⚠ Push bildirimi hâlâ yok — BUG #2, bkz. §4.1
```

**Kanıt (2026-07-04, ilk canlı test):** Amsterdam Centraal → Rotterdam Centraal task'ı optimize edildi, onaylandı. `fleet_tracking_staging.public.tasks`: `task_no=TLP-26-00003`, `status=assigned`, `enterprise_dispatch_task_id` dolu, `vehicle_id` mock filosundan biri.

**Kritik düzeltmeler (mimari tasarım, önceki taslağa göre):**
1. **JWT forward YOK.** Sabit servis-token (`INTERNAL_BRIDGE_TOKEN`) + IP-allowlist kullanılıyor.
2. **Kargo/zaman-penceresi alanları zaten şemada** — `enterprise.dispatch_tasks`'ta ek migration gerekmiyor.
3. **Basit tek-task formu yok, VRP akışı korunuyor** — tek task da `tasks=[1 eleman]` olarak geçer.
4. **`public.tasks.enterprise_dispatch_task_id`** FK kolonu iki sistemi eşleştiren köprü, canlı testte doldu.
5. **Internal Bridge, production (3000) değil STAGING (3001) portuna gider** — veri tutarlılığı gereği (bkz. §6.8).

### 4.1 Sürücü Görünürlüğü ve Bildirimi — İKİ BUG, BİRİ ÇÖZÜLDÜ (2026-07-04→15)

**Kullanıcının orijinal sorusu (2026-07-04):** "Task oluşturduk, şoför/araçla ilişkilendirdik ama görevi şoföre GÖNDERMEYİ dispatcher'dan tasarlamadık — bu mobil app'te de test edilmeli."

**BUG #1 — `assigned` statüsü sürücü endpoint'inin filtresinde yoktu — ✅ ÇÖZÜLDÜ (2026-07-15)**

Kök sebep: `GET /api/driver/tasks`'ın status filtresi `pending, pending_review, accepted, in_progress` idi, `assigned` yoktu — halbuki `assigned`, aynı server.js içinde üç ayrı yerde (`fleet-stats`, vehicle-silme, driver-silme kontrolleri) zaten "aktif görev" sayılıyordu. Mühendislik kararı: task'ın statüsünü değiştirmek yerine (sürücünün vermediği bir onayı simüle eder) **endpoint filtresine `assigned` eklendi** — en dar kapsamlı, projenin kendi tutarlılığıyla uyumlu yama.

**Uygulama (2026-07-15):**
- `tulipfleet-backend` production: commit `20d9ad0`, `git push` ile GitHub'a yazıldı, `docker restart fleet-backend` ile deploy edildi.
- `tulipfleet-backend` staging (`/opt/fleet/backend-staging`, ayrı bir checkout, aynı repo): `git stash` → `git pull` (7 commit geride olduğu ortaya çıktı, `20d9ad0` de içindeydi) → stash zaten gereksizdi, `git stash drop` ile temizlendi → `pm2 restart fleet-staging --update-env`.
- **Canlı doğrulama (Pieter'in gerçek kimliğiyle üretilen JWT):** `GET /api/driver/tasks` artık **3 görev** döndürüyor — `TLP-26-00003` (bizim test görevimiz) **ve** daha önce hiç görünmeyen iki eski görev (`TLP-26-00002`, `TLP-26-00001`, 20 Haziran'dan kalma). Bug'ın etkisi sanılandan genişti — sadece yeni testimizi değil, geçmişte sessizce kaybolmuş görevleri de gizliyordu.
- **Not (255KB dosya sınırı):** `server.js` çok büyük olduğu için GitHub'a doğrudan `create_or_update_file` ile yazılamadı (context/view sınırı) — yama sunucuda `sed` ile uygulandı, sonra normal `git add/commit/push` ile GitHub'a yansıtıldı. Bkz. §6.12.

**BUG #2 — Push notification altyapısı var ama hiç tetiklenmiyor — ❌ HENÜZ ÇÖZÜLMEDİ**
- `internalBridge.js`'in `POST /api/internal/bridge/tasks` handler'ı **sadece** `public.tasks` INSERT yapıyor — hiçbir push tetikleme kodu içermiyor. GitHub code search: `sendPushNotification` ana backend'de **0 sonuç.**
- Mobil push kayıt altyapısı **çalışıyor**: `POST /api/push/register` var, Expo token `users.expo_push_token` sütununa yazılıyor.
- `expo_push_token` alanı server.js'in **hiçbir başka yerinde okunmuyor/kullanılmıyor** — token kaydediliyor, hiç gönderim için kullanılmıyor.

**Sonraki adım (ADIM 3, henüz başlanmadı):** Push tetikleme — `internalBridge.js`'e mi, ayrı bir servise mi eklenecek kararı, önce `CreateTaskScreen.js`'in kullandığı mevcut atama akışının push gönderip göndermediği incelendikten sonra verilecek.

**Açık noktalar (varsaymıyorum, doğrulanmadı):**
- `getRoutingProvider()`'ın gerçek sağlayıcısı **doğrulandı: mock.** `lib/routing/factory.js`'de HERE Tour Planning entegrasyonu yorum satırında ("Future expansion gate, July 2026 sprint") — kod her zaman `MockRoutingProvider` döndürüyor. Mock, seçilen `vehicles[]`'i fiilen kullanmıyor; her zaman sabit 4 test aracı arasında round-robin dağıtım yapıyor — dispatcher UI'ında açık bir uyarı olarak gösteriliyor.
- **`enterprise.behavior_events`:** `docs/SCHEMA_REFERENCE.md`'de yok — henüz gerçek değil, `FEAT-007`/`FEAT-010` blueprint'lerinde tanımlı (tasarım niyeti). **Kanıt hiyerarşisi:** `SCHEMA_REFERENCE.md` + `ROADMAP.md`'nin "Done/✅" maddeleri = kanıt; `FEAT-*` = niyet. Çelişkide SCHEMA_REFERENCE kazanır.
- `FEAT-105`/`FN-09`: Phase 2, customer-funded, henüz spec aşamasında, production'da doğrulanamaz.

---

## 5. Revize Uygulama Çeklisti

**Faz 0 — Doğrulama (kod yok) — TAMAMLANDI (2026-07-03)**
- [x] Enterprise backend'de mevcut bir HTTP-forward/proxy deseni var mı incele → `routes/tasks.js` → `internalBridge.js` "Internal Bridge" deseni.
- [x] `enterprise.notification_preferences` için gerçek migration-runner'ı gör → enterprise backend'in kendi migration-runner'ı yok, migration'lar `tulipfleet-backend/migrations/`'da.

**Faz 1 — E-posta Entegrasyonu persist — TAMAMEN BİTTİ, CANLI KULLANICI TESTİYLE DOĞRULANDI (2026-07-03/04)**
- [x] Migration commit edildi: `762fcc9`, düzeltildi `98a3933`
- [x] Endpoint commit edildi: `32581ec` + register `6aae8b6`
- [x] Frontend bağlandı: `a28c7b7`
- [x] Deploy tamamlandı (staging + production migration, enterprise backend rebuild, health check'ler Cloudflare üzerinden doğrulandı)
- [x] Canlı kullanıcı testi: "Save" gerçekten çalışıyor, `fleet_tracking_staging`'de kayıt doğrulandı (Phase 1 mimarisine uygun).

**Faz 2 — Alarm/İkaz gerçek entegrasyon — TAMAMLANDI (2026-07-03), DEPLOY GEREKMEDİ**
- [x] Doğrudan bağlantı kararı, mock 5 uyarı kaldırıldı, gerçek `/api/alerts` bağlandı (`26ca933`, `c81a79c`), 16-tip sözlüğü eşlendi.

**Faz 3 — Task Management temeli — TEKNİK OLARAK BİTTİ, UÇTAN UCA CANLI TESTLE DOĞRULANDI (2026-07-04)**
- [x] Frontend (hook + sayfa + route + buton): `4259597`, `5315d8b`, `139ba2d`, `c1e8010`
- [x] 3 TypeScript hatası düzeltildi: `d97c4d0`, `85b189a`
- [x] Altyapı: `INTERNAL_BRIDGE_TOKEN`/`INTERNAL_CORE_API_URL` eklendi, port-binding riski yönetildi (çift-bind), UFW kuralı eklendi, staging portuna yönlendirildi.
- [x] Canlı test: Amsterdam→Rotterdam task'ı onaylandı, `public.tasks`'ta gerçek satır doğrulandı.
- **Bilinen sınır #1:** Routing motoru mock, HERE entegrasyonu henüz yazılmadı — UI'da açıkça belirtiliyor.

**Faz 4 — Sürücü Görünürlüğü ve Bildirimi — KISMEN TAMAMLANDI (2026-07-04→15)**
- [x] Kök sebep analizi: iki ayrı bug kesin kod kanıtıyla tespit edildi (§4.1)
- [x] **BUG #1 çözüldü:** `GET /api/driver/tasks` filtresine `assigned` eklendi
  - Production: commit `20d9ad0`, `docker restart fleet-backend` ile deploy edildi
  - Staging: `git pull` ile senkronize edildi (aynı commit'i getirdi), `pm2 restart fleet-staging --update-env` ile deploy edildi
  - Canlı doğrulama: Pieter'in JWT'siyle `GET /api/driver/tasks` → 3 görev dönüyor (`TLP-26-00001/2/3`), hepsi daha önce gizliydi
- [ ] **ADIM 3 (sıradaki):** BUG #2 — push notification tetikleme. Önce `CreateTaskScreen.js`'in mevcut atama akışının push gönderip göndermediği incelenecek, sonra `internalBridge.js`'e mi ayrı bir servise mi ekleneceğine karar verilecek.

**Genel proje kuralı (her faza uygulanır):**
- [ ] Her yeni entegrasyonda alan-adı uyumluluk kontrolü
- [ ] Her kod/doküman çelişkisi §1 tablosuna eklenir, unutulmaz

---

## 6. Deploy Süreçlerinden Öğrenilen Dersler (2026-07-03→15)

### 6.1 Migration dosyalarında "Down Migration" bloğu mutlaka `/* */` içinde olmalı
`psql < dosya.sql` dosyayı baştan sona çalıştırır — satır yorumuyla (`--`) açılan bir "Down Migration" başlığının altındaki gerçek SQL komutları (`DROP TABLE` vb.) **çalışır**, migration kendi kendini siler. Düzeltme: Down bloğu `/* ... */` içine alındı. **Kural:** Her migration'da Down bloğu blok yorumla test edilmeden commit edilmez.

### 6.2 Sunucunun yerel git'i uzun süredir güncellenmemiş olabilir — büyük fast-forward riski
Tek bir `git pull`, birikmiş çok sayıda commit'i (yeni klasörler, büyük `server.js` değişiklikleri dahil) birden getirebilir. **Kural:** Büyük fast-forward'lardan sonra `git log --oneline <eski>..<yeni>` ile kapsamı gözden geçir.

### 6.3 Untracked dosyalar `git pull`'u durdurur — sil, taşıma
`mv` ile geçici klasöre taşı, `md5sum` ile origin'deki karşılıklarıyla karşılaştır, farklıysa kullanıcıya göster. **Kural:** Asla doğrudan silme.

### 6.4 Git remote'unda yanlışlıkla bir uygulama JWT'si bulundu — güvenlik notu
PAT yerine yanlışlıkla yapıştırılmış bir oturum token'ı hem `git pull`'u bozdu hem credential sızıntısıydı. **Açık nokta:** O JWT'nin iptali doğrulanmadı.

### 6.5 "Başarılı" UI mesajı, doğru veritabanına yazıldığı anlamına gelmez
Çok-veritabanlı sistemlerde her zaman gerçek satırı sorgula — hangi DB'ye yazıldığını `DATABASE_URL`'den veya doğrudan sorgulayarak teyit et.

### 6.6 Docker port binding'i değiştirmek production'ı kırabilir — her zaman çift-bind kullan
Mevcut binding'i değiştirme (replace), yanına ekle (`"127.0.0.1:PORT:PORT"` + `"PRIVATE_IP:PORT:PORT"` birlikte). Her değişiklikten sonra hem içeriden hem dışarıdan health check yap.

### 6.7 UFW `default deny` altında Docker container'ları görünür kalabilir, native/PM2 process'ler kalmayabilir
Docker'ın kendi iptables kuralları UFW'nin önüne geçebilir; native process'ler için PostgreSQL'in izlediği desenle açık bir UFW kuralı gerekir.

### 6.8 Internal Bridge'in hedef portu, kaynak backend'in bağlı olduğu veritabanına göre seçilmeli
Port numarasından değil, veri akışının tutarlılığından (hangi DB'ye yazılıyor) türet.

### 6.9 PM2'nin `env <id>` komutu güncel `.env` değerlerini göstermeyebilir
Gerçek davranışla (doğru/yanlış girdiyle isteği tetikleyip beklenen hata kodunu görerek) test et, `pm2 env`/`printenv`'e güvenme.

### 6.10 "Uçtan uca çalışıyor" demek "iş süreci tamamlandı" demek değildir
Bir API zincirinin veritabanına ulaşması ile bir insan kullanıcının o bilgiyi gerçekten alması farklı "uç"lardır — Faz 4'ün tamamı bu dersin somut kanıtı: Faz 3 "bitti" dedik, ama gerçek kullanıcı sorusu iki bug ortaya çıkardı.

### 6.11 Büyük bir dosyada tekrar tekrar SSH ile arama yapmak yerine bir kez çekip yerelde/GitHub'da ara
253KB'lik `server.js`'i sunucuda defalarca `grep`/`cat` ile aratmak yerine, GitHub'dan bir kez çekip yerel bir dosyada arandı — hem hızlı hem SSH oturum karışıklığı riski yok.

### 6.12 ÇOK BÜYÜK dosyalar (200KB+) GitHub'a doğrudan `create_or_update_file` ile yazılamaz — sunucuda yamalayıp normal git akışıyla push et (YENİ, 2026-07-15)
`server.js` (253KB) için `view` aracı bile dosyanın **ortasını kesti** (7576 satırdan sadece baş/son görünür oldu) — bu, dosyanın tamamını tek bir `create_or_update_file` çağrısında güvenle taşıyamayacağımı gösterdi. Küçük/orta dosyalarda (Faz 1-3 boyunca hep bu şekilde çalıştı) "GitHub'a doğrudan commit ediyorum" yaklaşımı doğruydu, ama bu boyutta **teknik bir sınır** var. Çözüm: yamayı (küçük, birkaç satırlık bir değişiklik) sunucuda `sed`/manuel düzenlemeyle uygula, `grep` ile doğrula, sonra **kullanıcının kendi `git add/commit/push`'uyla** GitHub'a yansıt — ayrıca iki ayrı checkout'un (production `/opt/fleet/backend`, staging `/opt/fleet/backend-staging`, aynı repo) **ikisinde de** aynı yamanın uygulanması ve **ikisinin de** ayrı ayrı restart edilmesi gerektiği unutulmamalı. **Kural:** Bir dosyanın boyutunu (`wc -c` ya da GitHub'ın "large file" uyarısı) commit'ten önce kontrol et; büyükse doğrudan yazmayı deneme, sunucu-taraflı yama + normal git akışına geç.

### 6.13 Bir repo'nun birden fazla checkout'u (production + staging) varsa, biri diğerinin önüne geçebilir
Staging 7 commit geride ve kendi uncommitted değişikliğine (bizim manuel yamamız) sahipti. `git pull` öncesi `git stash` ile değişiklik saklandı; pull'un getirdiği commit'ler zaten aynı düzeltmeyi içeriyordu (production'a daha önce push edilmişti), bu yüzden `git stash pop` yerine `git stash drop` ile çakışma riski hiç alınmadan temizlendi. **Kural:** Stash açmadan önce pull sonucunun stash'lenen değişikliği zaten içerip içermediğini kontrol et (`grep` ile) — gereksiz bir `pop` denemesi, aslında hiç gerekmeyen bir merge çakışması yaratabilir.

---

## Değişiklik Günlüğü
| Tarih | Değişiklik |
|---|---|
| 2026-07-03 | Doküman oluşturuldu. İki-sunuculu API-Driven mimari kararı kilitlendi. |
| 2026-07-03 | **KESİN ONAY.** §0, §1, §2-4, §5 kullanıcı tarafından resmi olarak onaylandı. Task Management "Proposed" olarak işaretlendi. İş 1 teyit edildi. İş 2: 5 mock uyarı → 3 kritik tip. |
| 2026-07-03 | Checklist tutarlılık düzeltmesi. Faz 0 tamamlandı işaretlendi. Faz 1 migration konumu netleştirildi. Faz 3, gerçek VRP akışıyla uyumlu hale getirildi. |
| 2026-07-03 (2. tur) | Settings sayfası temizliği tamamlandı (Part 1-5). Faz 1 kod tarafı GitHub'a commit edildi. |
| 2026-07-03 (3. tur) | Faz 2 tamamlandı, doğrudan commit edildi, deploy gerekmedi. |
| 2026-07-04 (4. tur) | Faz 1 uçtan uca deploy tamamlandı. Migration Down-block hatası düzeltildi. Git credential sorunu düzeltildi. Enterprise backend deploy edildi. |
| 2026-07-04 (5. tur) | Canlı kullanıcı testi tamamlandı (Faz 1) — "Save" gerçekten çalışıyor, staging'e yazdığı doğrulandı. |
| 2026-07-04 (6. tur) | Faz 3 tamamen bitti, uçtan uca canlı testle doğrulandı. Internal Bridge yapılandırıldı, bir production kesintisi yaşanıp hemen düzeltildi, port/UFW dersleri çıkarıldı. |
| 2026-07-04 (7. tur) | Kullanıcı kritik açık nokta buldu: sürücüye görev bildirimi yok. İki ayrı bug (assigned filtre eksikliği + atıl push altyapısı) kesin kod kanıtıyla tespit edildi. §4.1 ve Faz 4 eklendi. |
| 2026-07-15 (8. tur) | **BUG #1 tamamen çözüldü ve uçtan uca doğrulandı.** `GET /api/driver/tasks` filtresine `assigned` eklendi. 253KB'lik `server.js`'in GitHub'a doğrudan yazılamayacağı keşfedildi (view aracı bile dosyayı kesti) — yama sunucuda uygulanıp normal git akışıyla push edildi (`20d9ad0`). Hem production hem staging (ayrı checkout, ayrı process) senkronize edilip restart edildi. Canlı testte beklenenden fazla kanıt çıktı: sadece test görevimiz değil, daha önce sessizce gizlenmiş iki eski görev de (`TLP-26-00001/2`) ortaya çıktı — bug'ın etkisi sanılandan genişti. §6.12 ve §6.13 yeni dersler olarak eklendi. **BUG #2 (push notification) hâlâ açık, ADIM 3 bekliyor.** |
