# DEMO-CAPABILITIES.md — Kanıtlı Yetenek Envanteri (v2, 4 Ekim 2026)
**Önceki sürüm:** v1 PortXL/Rotterdam (30.08.2026) — git geçmişinde. **Kural:** yalnız prod'da çalışan ve kanıtı olan satır Tier A'ya girer; kanıt sütunu rapor/commit/tarih. **Giriş kapısı:** `demo@tulipfleet.com` (Dobbe Transport) — şifre kartında; admin kimliği `admin@fleet.com` (Tulip Lojistik) yalnız iç test (qa WORKING_RULES "Demo / Test Kimliği").

## TIER A — Canlı gösterilir (prod, kanıtlı)
| Yetenek | Müşteri ne görür | Kanıt |
|---|---|---|
| Canlı filo haritası (dispatcher) | `app.tulipfleet.com` Live map: araçlar, kümeleme ≥20, bağlantı rozeti (live/polling/stale), `/ F T` kısayolları, light/dark | UI D3 (61fb58b), fleet-sim-prod 14 araç (28 Eyl), Lighthouse Desktop A11y 100 / CLS 0 (qa TODO §9) |
| Görev yönetimi | Tasks tablosu/kartlar, durum çipleri, 390 px kart görünümü, EN/TR/NL | D4/D5/D7-2 raporları; `verify:i18n` 623 key |
| Dispatcher'dan görev → sürücü telefonuna anlık push | Approve → core `tasks` satırı → "Yeni Görev Atandı" bildirimi | Enterprise cutover 27 Eyl, TUL-26-00041/42 prod zinciri (qa CUTOVER_P0_DISCOVERY §5d) |
| **Müşteri takip linki** (yeni) | Tasks satırı → "Takip linki" → oluştur/kopyala/iptal; müşteri `track.tulipfleet.com/v/…` sayfasında rota + (yola çıkınca) canlı konum; 30 gün, iptal edilebilir | core `aa5cffd`, dispatcher `9d1fcef`, prod turu 4 Eki (qa TODO §10) |
| Sürücü mobil uygulaması, 9 dil | iOS App Store 2.0.7 (39); Android 2.0.7 (31) kapalı test / üretim incelemede | qa BUILD.md §12; SESSION_NOTES 16–19 Eyl |
| Kimlik ve rol | Sidenav'da e-posta + rol · şirket; driver dispatcher uçlarında 403 | Mini-sprint A–H 28 Eyl (enterprise `4bbae16`, core `4501b35`) |
| OTP ile şifre sıfırlama | forgot → 6 haneli kod → reset → login | ROADMAP 2026-08-20 (4ea0cbe), prod curl kanıtı |
| Sürücü kalite sayaçları (mobil Reports) | hard brake / overspeed sayaçları canlı alarmlardan | core `b8abbe5`, prod Dobbe `days=365` Pieter 1/1 (4 Eki) |
| Rotterdam canlı telemetri simülasyonu | Haritada hareket eden araçlar (fleet-sim v3 prod) | PM2 `fleet-sim-prod` 28 Eyl; **açık:** Rotterdam Port Demo üssü (fallback Utrecht) — demo kiti maddesi |

## TIER B — Anlatılır; provada doğrulanırsa gösterilir
| Yetenek | Kanıt | Not |
|---|---|---|
| NL ZE-zone veri seti: 21 zone / 20 şehir, NDW DATEX II | `enterprise.nl_compliance_zones` (MultiPolygon/4326) | Rotterdam bölgesi mevcut |
| Geofence + `emission_zone` kategorisi, CSRD süre takibi | mobil `AdminGeofenceScreen.js` | |
| Karbon / yakıt / maliyet analitiği + export | `CarbonSummaryCards`, `FuelTrendChart`, `CostAnalysisChart`, `reportExport.js` | Dil: "yakıt tüketimine dayalı tahmini CO2e ile CSRD hazırlığını destekler" (qa CSRD_COMPLIANCE_ANALYSIS) — "tam CSRD uyumlu rapor" DENMEZ |
| Vrachtwagenheffing Period-1 tarifeleri | backend veri seti | ekran kanıtı alınmalı |
| Danışmanlık modunda dispatch + karar audit trail | `decisionLog.ts`, `dispatch_decision_log`, scorer dosyaları | Optimize ekranı **mock** uyarısı taşır (D8-H); skorlar kuş uçuşu |
| İstisna yönetimi (FEAT-010) | 5 monitör (`exceptionMonitors.js`), Ikaz Yönetimi UI | 6 exception tipi mobil manifestte yok (qa TODO §4) |
| Self-servis SaaS: trial → active → suspended, kota, Komuta Merkezi | FEAT-SaaS S1–S5b | fiyat: Starter €15 / Pro €25 / Enterprise €29–35 per araç — **küçük filo kararı açık** (qa PRE_NL B2b) |
| Donanım: ESP32-S3, fw v5.0.4, BLE+QR+WiFi provisioning, MQTT/TLS | `fleet_tracker_v5_0_4.ino`, `DeviceSetupScreen.js` | gerçek cihaz offline (yeni MQTT şifresi flash bekliyor) |
| TimescaleDB zaman serisi + retention | `add_retention_policy('locations','7 days')` | teknik soru gelirse |

## TIER C — YASAK İDDİALAR
- ❌ "Rota optimizasyonu / VRP çalışıyor" — Optimize **mock** (`enterprise lib/routing/factory.js:9`); HERE Tour Planning Phase 2, müşteri tetikli. Söylenebilen: "görev süreleri ve Live map rotaları HERE truck routing ile hesaplanır".
- ❌ "Sürücü tamamlayınca dispatcher planı güncellenir" — köprü tek yönlü (ADR-0009 §4.4, Phase 2).
- ❌ Batarya SoC / EV enerji takibi — yok (yalnız `fuel_type: electric` etiketi); yakıt göstergesi FEAT-007-EXT prod'da kalıcı yazıcı yok.
- ❌ "WebSocket real-time" — REST polling (+ MQTT yalnız enterprise subscribe).
- ❌ FastAPI — backend Fastify/Node.
- ❌ Self-servis yeni kayıt canlıda — `public-signup` prod'da yok (KARAR-4).
- ❌ "Tam CSRD uyumlu rapor otomatik üretir".
- ❌ Takip sayfasında ETA — MVP-2 (şimdi `eta: null`).

## Demo kiti — açık maddeler (qa PRE_NL_CHECKLIST "Demo kiti")
fleet-sim Rotterdam Port Demo üssü · test görevleri TUL-26-00041/42 temizliği · takip sayfası harita merkezi (konum yokken Türkiye'ye düşüyor) · "1 komutla açılır demo" komut satırı.
