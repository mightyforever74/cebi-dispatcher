# SYSTEM_TOPOLOGY.md

Amaç: TulipFleet'in fiziksel sistem haritası. Hangi backend hangi sunucuda,
hangi dış servis (HERE, Google, OWM) nerede ve hangi üründe çalışıyor, ne
henüz YOK. Bir bilgi ADR/ROADMAP ile çeliştiğinde, çalışan kod + bu doküman
kazanır. Son doğrulama: 2026-06-18 (server.js + canlı grep ile).

## Backend'ler (üç ayrı çalışma yeri)

| Backend | Repo | Sunucu | Çalışma | Path / Container | API |
|---------|------|--------|---------|------------------|-----|
| Ana fleet (mobil app) | `tulipfleet-backend` (C:\tulipfleet-backend) | fleet-prod-01 (46.224.1.192) | Docker | `fleet-backend` / `/opt/fleet/backend/server.js` (~2800+ satır) | api.tulipfleet.com |
| Ana fleet — staging | aynı | fleet-prod-01 | PM2 | `fleet-staging` / `/opt/fleet/backend-staging/` | staging-api.tulipfleet.com |
| Enterprise dispatcher | `tulipfleet-enterprise-backend` | fleet-enterprise-01 (49.12.246.212) | Docker | `tulipfleet-enterprise-backend` / `/opt/enterprise` | enterprise-api.tulipfleet.com |

Not: dört repo var — `tulipfleet` (mobil RN/Expo), `tulipfleet-backend` (ana
fleet API), `tulipfleet-dispatcher` (dispatcher frontend), `tulipfleet-enterprise-backend`
(dispatcher API). "Backend" denince hangisi olduğu mutlaka belirtilmeli.

## Dış servis entegrasyonları — CANLI vs YOK

| Servis / Ürün | Durum | Nerede | Kanıt |
|---------------|-------|--------|-------|
| **HERE Routing API v8** (`router.hereapi.com/v8/routes`) | ✅ CANLI | Ana fleet backend, `/api/driver/route-traffic` (server.js:6457), `/api/driver/drive-conditions` (server.js:6674) | tek-rota trafik/ETA, transportMode=truck, summary+incidents |
| **HERE Tour Planning** (VRP solver, `tourplanning.hereapi.com`) | ❌ YOK | hiçbir backend'de | grep boş: server.js + enterprise container; ADR-0002 kararı, henüz implement edilmedi |
| **Google Maps API'leri** (Directions, Geocoding, Distance Matrix, Maps SDK) | ✅ CANLI | Mobil app (sürücü rota haritası) + billing aktif | INFRASTRUCTURE.md:130 |
| **OpenWeatherMap** | ✅ CANLI | Ana fleet backend, `/api/driver/drive-conditions` weather bloğu | server.js, OPENWEATHER_API_KEY |

## Kritik ayrım: HERE Routing ≠ HERE Tour Planning

İki FARKLI HERE ürünü, karıştırma:
- **Routing API v8** (canlı): bir araç, origin→destination, trafikli süre +
  incidents. Sürücü tarafı. `HERE_API_KEY` route handler içinde `fetch` ile.
- **Tour Planning** (yok): çok araç, çok stop, VRPTW+CVRP. Dispatcher solver.
  ADR-0002/ADR-0014 konusu. `submitPlan/pollStatus/fetchResult` interface'i
  henüz yazılmadı.

"HERE çalışıyor mu" sorusunun cevabı: Routing API evet, Tour Planning hayır.

## Lock-in gözlemi (ADR-0014 için)

Mevcut iki HERE Routing çağrısı route handler'a `fetch(url)` ile gömülü,
`HERE_API_KEY` doğrudan endpoint'te, ve iki endpoint birbirinin kopyası (aynı
HERE bloğu server.js:6485 ve 6696'da tekrar). ADR-0002 §4.2'nin uyardığı
lock-in zaten başlamış ve dağınık. IRoutingProvider boundary'si gelecekteki
Tour Planning'i değil, mevcut bu Routing çağrılarını da kapsamalı.

## Güncelleme kuralı
Yeni dış servis eklenince ya da bir backend taşınınca burayı güncelle, "Son
doğrulama" tarihini yenile. Container/path varsayma — `docker ps` ve grep ile
doğrula. Bu doküman çalışan koddan beslenir, hafızadan değil.
