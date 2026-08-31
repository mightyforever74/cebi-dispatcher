# DEMO-CAPABILITIES.md — PortXL / Rotterdam Odaklı Kanıtlı Yetenek Envanteri
**Tarih:** 30.08.2026 · **Kural:** Yalnız 02.09'da ekranda çalışan (KARAR-1) · **Kanıt sütunu:** smoke ref / dosya / tarih. Commit hash sütununu Cem `git log` ile doldurur.

## TIER A — Canlı gösterilecek (smoke PASS kanıtlı, 29.08)
| Yetenek | Jüri ne görür | Kanıt | Hash |
|---|---|---|---|
| Canlı filo haritası — Bearer token'lı REST location polling | `live-fleet-map`'te saniyeler içinde güncellenen araçlar | M3a PASS + F12 ekran görüntüsü (`/api/locations/latest` 200, `/api/vehicles/active` 200) | ___ |
| Görev panosu | Görev listesi/panosu yüklenir | M3b PASS | ___ |
| Görev atama → sürücüye anlık push ("Yeni Görev Atandı") | Dispatcher'dan atanan görev sürücü telefonuna düşer | M3c PASS + Phase 4 zinciri grep kanıtı (21.07.2026, prod+staging) | ___ |
| Rol tabanlı erişim: driver / admin / superadmin | Farklı panellere farklı yetkiyle giriş | A4+M1a+M1c PASS; eski şifreler 401 (A5, A6) | ___ |
| OTP ile şifre sıfırlama (6 haneli, e-posta) | forgot→OTP→reset→login zinciri | M2Ra-c PASS; route'lar prod'da kanıtlı (A8, A9) | ___ |
| Çok dilli sürücü mobil uygulaması — 9 dil, NL dahil | Sürücü telefonu EN/NL arayüzle | `i18n.js` kanıtı: bg,de,en,es,fr,it,ku,nl,tr · iOS Build 32 App Store'da, Android vCode 28 Closed Testing | ___ |
| (31.08 sonrası) Rotterdam canlı telemetri simülasyonu | Maasvlakte II→Botlek→Waalhaven rotasında hareket eden araçlar | KARAR-3a + `DEMO-SIM-MQTT-SPEC.md`; hareket kanıt videosu 31.08'de eklenecek | ___ |

## TIER B — Anlatılacak / provada doğrulanırsa gösterilecek (kod düzeyinde kanıtlı, canlı smoke YOK)
| Yetenek | Kanıt | Not |
|---|---|---|
| NL ZE-zone veri seti: 21 zone / 20 şehir, NDW DATEX II kaynaklı | `nl_compliance_zones` (enterprise DB, MultiPolygon/4326); kaynak `opendata.ndw.nu/emissiezones.xml.gz` | Rotterdam bölgesi mevcut — demo rotası bunun içinden geçecek |
| Geofence + `emission_zone` kategorisi + CSRD süre takibi | Mobil `AdminGeofenceScreen.js:109,118`; CSRD karbon süre takibi | Pazartesi provasında canlı doğrulanırsa Tier A'ya taşınır |
| Karbon raporlama: CarbonSummary/Trend/Vehicle | `CarbonSummaryCards.js`, `CarbonTrendChart.js`, `CarbonVehicleChart.js` | CSRD anlatısının görsel ayağı |
| Yakıt & maliyet analitiği + rapor export | `AdminFuelDashboard.js`, `FuelTrendChart.js`, `CostAnalysisChart.js`, `reportExport.js` | |
| Vrachtwagenheffing Period-1 tarifeleri | Backend veri seti (memory kaydı) | Rotterdam kamyon lojistiği için diferansiyatör; provada ekran kanıtı alınmalı |
| Danışmanlık modunda dispatch + karar audit trail | Dispatcher `decisionLog.ts` + scorer dosyaları (29.08 audit'te görüldü) | Arayüz kısmen TR (KARAR-5 kapsamı dışı) → gösterilirse hızlı geçilir |
| Self-servis SaaS: trial→active→suspended, kota, Komuta Merkezi | FEAT-SaaS S1–S5b tamam (memory) | Fiyat söylenir: Starter €15 / Pro €25 / Enterprise €29–35 per araç |
| Donanım: ESP32-S3, fw v5.0.4, BLE+QR+WiFi provisioning, MQTT/TLS 8883, ivmeölçer | `fleet_tracker_v5_0_4.ino:73` + `DeviceSetupScreen.js` (QR_SCAN akışı) | Fiziksel cihaz kameraya gösterilebilir |
| TimescaleDB zaman serisi + retention politikası | `add_retention_policy('locations','7 days')` (memory, prod) | Teknik soru gelirse |

## TIER C — YASAK İDDİALAR (söylenirse demo yanar)
- ❌ Batarya SoC / şarj yönetimi / EV enerji takibi — YOK (yalnız `fuel_type: electric` etiketi)
- ❌ "WebSocket real-time" — mimari REST polling (M3a kanıtı)
- ❌ FastAPI — backend **Fastify/Node**
- ❌ Self-servis yeni kayıt canlıda — `public-signup` prod'da yok (KARAR-4)
- ❌ Mevcut kapsam dışı API taahhüdü (SIRA-4)

## Demo giriş bilgisi
Jüri kapısı: `demo@tulipfleet.com` (KARAR-4). Şirket: Dobbe Transport + (31.08 sonrası) Rotterdam demo şirketi.
