# TulipFleet B.V. — Project Context for NotebookLM Research Defter

**Version:** 1.0
**Date:** 2026-05-30
**Purpose:** Bu doküman NotebookLM'in TulipFleet Enterprise Dispatcher projesini doğru bağlamda anlaması için hazırlandı. Özellikle **17 NL ZE-Zone şehri scale-out research'ü** için kaynak referansıdır.

---

## 1. Şirket ve Ürün Özeti

**TulipFleet B.V.** — Hollanda'da kayıtlı B2B IoT fleet management SaaS şirketi.

**Hedef pazar:** Avrupa orta segment lojistik, özellikle Hollanda K/M-segment 3PL'leri (Top 100 Logistiek Dienstverleners 2025 segmentation, 50-300 araçlık şirketler).

**Müşteri örnekleri (target):** Dobbe Transport, TMA Logistics, De Dekker, Deudekom.

**Ürün katmanları:**
1. ESP32-S3 telematik donanımı (production'da, v4.9.0+)
2. Driver mobil uygulaması (iOS App Store + Google Play Store, v2.0.6)
3. Admin web paneli (production'da)
4. **Enterprise Dispatcher** (şu an inşa ediliyor — bu dokümanın odağı)

**Slogan:** "From Tracking App to Operational Brain"

**Diferansiyel:**
- **Flagship integrated product** — donanım+yazılım tek paket
- **Open ingestion layer** — Geotab/Verizon Connect/Samsara müşterileri için
- **NL-specialized compliance moat** — Vrachtwagenheffing (Temmuz 2026) + ZE-Zone (2025-2026) için özelleşmiş katman
- **Workaround-aware design** — Excel/telefon entegrasyon senaryosu olarak kabul edilir, Mode 3 (tam otonom) explicit out-of-scope

---

## 2. Phase 1 İlerlemesi (Sıra 2.9.5 — Amsterdam Pilot Başarısı)

### Amsterdam ZE-Zone Production Seed (2026-05-30)

**Status:** ✅ Production'da, COMMIT'lendi.

**Schema (`enterprise.nl_compliance_zones`):**
```sql
zone_id          text PRIMARY KEY
city             text NOT NULL
zone_type        text CHECK (zone_type IN ('ze_zone', 'weight_restriction',
                                            'time_window', 'tolling_corridor',
                                            'environmental'))
polygon          geometry(Polygon, 4326) NOT NULL
rules            jsonb NOT NULL
effective_from   date NOT NULL
effective_to     date
source           text NOT NULL
source_url       text
last_verified_at timestamptz DEFAULT now()
notes            text
created_at       timestamptz DEFAULT now()
updated_at       timestamptz DEFAULT now()
```

**Amsterdam pilot kaydı:**
- `zone_id`: `amsterdam_ze_zone_2026`
- `zone_type`: `ze_zone`
- `polygon`: 7.8402 km², 666 vertices, valid POLYGON, centroid (4.9005, 52.3715)
- `effective_from`: 2026-01-01
- `effective_to`: 2027-12-31 (2028 A10 expansion için placeholder)
- `source`: `amsterdam_toegangsbeleid_v2026_05`

### Derivation Yöntemi (RESEARCH §G.4 reçetesi)

**Kaynak GeoJSON layer'lar (Amsterdam belediye API'si):**
- `https://kaart.amsterdam.nl/api/layers/19419.json` — Milieuzone + ZE-Zone union (Polygon, 13 KB)
- `https://kaart.amsterdam.nl/api/layers/42487.json` — Bestel- en vrachtauto milieuzone ring (MultiPolygon, 36 KB)

**Derivation SQL formülü:**
```sql
WITH layers AS (
  SELECT ST_GeomFromGeoJSON(pg_read_file('/tmp/layer_19419.json')::jsonb->'features'->0->>'geometry') AS g_19419,
         ST_GeomFromGeoJSON(pg_read_file('/tmp/layer_42487.json')::jsonb->'features'->0->>'geometry') AS g_42487
),
makevalid AS (
  SELECT ST_MakeValid(g_19419) AS v_19419, ST_MakeValid(g_42487) AS v_42487 FROM layers
),
diff AS (
  SELECT ST_Difference(v_19419, v_42487) AS d FROM makevalid
),
dumped AS (
  SELECT (ST_Dump(d)).geom AS poly FROM diff
),
filtered AS (
  SELECT poly FROM dumped WHERE ABS(ST_Area(poly::geography)) > 1000
)
SELECT ST_Union(poly)::geometry(Polygon, 4326) AS ze_zone_polygon FROM filtered;
```

**Disipline notu:** `ST_MakeValid` zorunlu (ring orientation hatası lwgeom_area_spher negatif değer döndürüyordu). `ABS(ST_Area(...))` defansif emniyet.

### Sanity Test (11 nokta, hepsi PASS)

| Lokasyon | lon | lat | Beklenen | Sonuç |
|---|---|---|---|---|
| Dam Square | 4.8924 | 52.3731 | inside | PASS |
| Amsterdam Centraal | 4.9008 | 52.3791 | inside | PASS |
| Rembrandtplein | 4.8956 | 52.3661 | inside | PASS |
| Leidseplein | 4.8830 | 52.3640 | inside | PASS |
| Waterlooplein | 4.9020 | 52.3667 | inside | PASS |
| Westerpark | 4.8757 | 52.3863 | outside | PASS |
| Vondelpark | 4.8730 | 52.3580 | outside | PASS |
| RAI Zuid | 4.8854 | 52.3417 | outside | PASS |
| NDSM Noord | 4.8997 | 52.4011 | outside | PASS |
| Schiphol | 4.7639 | 52.3086 | outside | PASS |
| Haarlem | 4.6379 | 52.3812 | outside | PASS |

### Rules JSONB Yapısı

```jsonc
{
  "shared_rules": {
    "regulation_basis": "RVV 1990 + CVDR752146/1",
    "vehicle_classes": {
      "bedrijfsauto": "N1/N2 (bestelauto + lichte vrachtauto)",
      "vrachtauto":   "N2/N3 (vrachtauto + trekker)"
    },
    "access_rules": {
      "ze_emission_class_minimum": "zero_emission",
      "transition_2025_2027_n1n2_euro_minimum": 6,
      "transition_2028_n3_euro_minimum": 6
    },
    "ontheffing_fees_eur": {
      "dagontheffing": 100,
      "kortdurende_ontheffing_1week": 60,
      "maatwerk_ontheffing_1maand": 25,
      "verzendkosten": 30,
      "bezwaarschrift": 0,
      "source": "Rotterdam CVDR749151/1 proxy (landelijk afgestemd)",
      "carrier_regulation_proxy": "Rotterdam - Amsterdam own CVDR pending"
    },
    "exempt_categories": [
      "zero_emission",
      "essential_services",
      "emergency_services",
      "national_ontheffing_via_RDW"
    ],
    "national_ontheffing_recognition": {
      "basis": "Art 17 RVV (cross-zone)",
      "central_loket": "RDW"
    }
  },
  "city_overlay": {
    "city": "Amsterdam",
    "ontheffing_fees_eur": {
      "bedrijfseconomische_art13": 250,
      "afwijkingsbevoegdheid_art14": 250,
      "fee_verification_status": "rotterdam_proxy_used",
      "verify_after": "2026-06-15"
    },
    "regulation_id": "CVDR752146/1",
    "regulation_url": "https://lokaleregelgeving.overheid.nl/CVDR752146"
  }
}
```

**Önemli not:** Amsterdam ücret tablosu Rotterdam CVDR749151/1'den proxy alındı, çünkü Amsterdam'ın kendi CVDR'i henüz indekslenmemişti. `verify_after: 2026-06-15` — gelecek doğrulama tarihi.

---

## 3. Mimari Bağlam

### Stack

| Katman | Teknoloji |
|---|---|
| Firmware | ESP32-S3 (Arduino framework) |
| Messaging | EMQX MQTT (self-hosted Docker container) |
| Backend | Fastify (Node.js, **Express değil**) |
| Database | PostgreSQL 16 + PostGIS + TimescaleDB |
| Mobile | React Native + Expo SDK 54 |
| Hosting | Hetzner Germany (Falkenstein, GDPR) |
| VRP | HERE Tour Planning API (managed, ADR-0002) |

### Production Servers

| Server | IP | Rol |
|---|---|---|
| `fleet-prod-01` | 46.224.1.192 | Driver app backend + MQTT + PostgreSQL |
| `fleet-enterprise-01` | 49.12.246.212 | Enterprise dispatcher backend |

Private network (`tulipfleet-internal` 10.0.0.0/16) iki sunucuyu birleştirir.

### Önemli Komutlar

```bash
# PostgreSQL container
docker exec 6601902c43f0_fleet-postgres psql -U fleetadmin -d fleet_tracking

# Staging DB (port 5433)
docker exec 6601902c43f0_fleet-postgres psql -U fleetadmin -d fleet_tracking_staging

# Backups
/opt/fleet/backups/
```

---

## 4. 17 NL ZE-Zone Şehri Scale-Out Hedefi

### Hedef Şehirler (alphabetic, 18 — Amsterdam dahil edilmedi çünkü zaten yapıldı)

`opwegnaarzes.nl` ve `milieuzones.nl` referans olarak alındı. Tam kesin liste belirsiz — bazı belediyeler **zero emission zone** ilan etti, bazıları sadece **milieuzone** (eski tip diesel kısıtı) uyguluyor.

1. Almere
2. Apeldoorn
3. Arnhem
4. Breda
5. Delft
6. Den Haag (The Hague)
7. Dordrecht
8. Eindhoven
9. Enschede
10. Groningen
11. Haarlem
12. 's-Hertogenbosch
13. Leiden
14. Maastricht
15. Nijmegen
16. Rotterdam
17. Tilburg
18. Utrecht
19. Zwolle

### Her Şehir İçin İhtiyaç Duyulan Bilgi

1. **Polygon kaynak URL** — resmi belediye GeoJSON veya RWS merkezi
2. **Effective date** — yürürlük başlama tarihi
3. **Legal basis** — CVDR ID veya Verkeersbesluit ref
4. **Format** — GeoJSON / ArcGIS REST / shapefile / PDF
5. **Zone type** — `ze_zone` veya `milieuzone_dieselvrachtauto` veya `milieuzone_bestelauto`
6. **CVDR fee yapısı** — eğer RDW Centraal Loket merkezi ise harmonize, değilse şehir bazında farklı

### Bilinen Engel

**RWS merkezi ArcGIS endpoint:**
```
https://geostenen.grid.rws.nl/server/rest/services/CEH/CEH_P/FeatureServer/94
```

Bu endpoint **18 ZE-Zone'u tek FeatureCollection'da** sunuyor olabilir. Ancak **Hetzner Germany IP'sinden TCP timeout** (port 443, 5 sn). DNS çözüldü (51.138.12.28), ama bağlantı reddediliyor. Olasılıklar:
- NL geo-fencing (sadece NL IP'leri kabul)
- Datacenter/VPN/proxy IP'leri blocked
- Server tarafı throttling

**Alternatif çözüm yolu:**
- Lokal makineden (Türkiye IP veya NL VPN) erişim
- NotebookLM web search ile bypass denemesi
- Geodan kaartviewer (TLN ortağı, https://www.geodan.nl/actualiteit/zero-emissie-zones-en-stadslogistiek/)
- Belediye bazında ayrı kaynak discovery (her şehrin `kaart.[gemeente].nl` benzeri portal)

### Bilinen İpuçları

- **Rotterdam:** `https://kaartlaag.rotterdam.nl/ze-zone` (Amsterdam'dan farklı subdomain), ZE-Zone 2025-01-01'de yürürlüğe girdi (Amsterdam'dan 1 yıl önce)
- **Amsterdam:** `https://kaart.amsterdam.nl/api/layers/{ID}.json` paterni
- **RDW Centraal Loket:** opwegnaarzes.nl'ye göre tüm ontheffing süreci merkezi RDW üzerinden — fee yapısı harmonize olabilir
- **CVDR portal:** `https://lokaleregelgeving.overheid.nl/CVDR{ID}` — yasal metin source-of-truth
- **Milieuzone vs ZE-Zone ayrımı:** Bazı şehirler ikisini birden uyguluyor (örn. Rotterdam Maasvlakte milieuzone hâlâ aktif + yeni ZE-Zone şehir içi)

---

## 5. NotebookLM'den Beklenen Çıktı

### Görev 1 — 18 şehir tablosu

| Şehir | Zone Type | Effective Date | Source URL | Format | CVDR Ref | Notes |
|---|---|---|---|---|---|---|

### Görev 2 — RWS endpoint discovery

NotebookLM web search ile aşağıdaki URL'yi açabiliyor mu?

```
https://geostenen.grid.rws.nl/server/rest/services/CEH/CEH_P/FeatureServer/94?f=json
```

Eğer açıksa:
- Layer name nedir?
- Kaç feature var (1 toplu vs 18 ayrı)?
- Field schema (city, effective_date, zone_type kolonları var mı)?
- Query syntax: `?where=1=1&outFields=*&f=geojson` ile GeoJSON export mümkün mü?

### Görev 3 — Geodan kaartviewer analizi

`geodan.nl/actualiteit/zero-emissie-zones-en-stadslogistiek/` sayfasındaki kaartviewer linki bul. Arkasındaki GeoJSON endpoint discovery (browser DevTools Network tab pattern).

### Görev 4 — RDW Centraal Loket doğrulama

Ontheffing süreci her şehirde **gerçekten** merkezi RDW üzerinden mi? Eğer öyleyse `shared_rules.ontheffing_fees_eur` Amsterdam pilotundaki Rotterdam proxy **doğru** demektir, 17 şehir için aynı kalır. Değilse şehir bazında farklılaşan ücretler var, `city_overlay` zenginleştirilmeli.

### Görev 5 — Strateji önerisi

3 olası yol var. NotebookLM araştırma sonucuna göre hangisi gerçekçi?

- **A) Tek RWS API call** → 18 şehir batch derive (2-3 saat)
- **B) Karma yaklaşım** → 5-8 şehir resmi API, kalanlar manuel (3-5 gün)
- **C) Belediye bazlı tek tek** → 18 ayrı kaynak research + derive (1-2 hafta)

---

## 6. Migration Disiplini (Amsterdam pilotunda kanıtlandı)

Her şehir için aynı paterni uygulamak gerek:

1. **WKT derive** — Amsterdam reçetesi (ST_Difference + ST_MakeValid + filter)
2. **Sanity test** — 11 nokta (5 inside landmark, 6 outside landmark)
3. **Migration script** — idempotent, BEGIN/COMMIT, `WHERE NOT EXISTS` (pgmigrations.name UNIQUE constraint yok)
4. **Staging dry-run** — apply + verify + DELETE cleanup
5. **Production pre-backup** — `/opt/fleet/backups/pre_{name}_{timestamp}.sql.gz`
6. **Production apply** — `psql -v ON_ERROR_STOP=on -f migration.sql`
7. **Verification** — area_km2, vertex count, validity, pgmigrations entry

Tek bir şehir için tahmini süre: **15-30 dakika** (Amsterdam reçetesi reuse + sanity landmarks).

18 şehir × 30 dk = ~9 saat, eğer RWS API tek query'de veriyorsa. Aksi takdirde her şehirin kaynak research'ü ek 30-60 dk.

---

## 7. References

### Repository (privately hosted)

```
github.com/mightyforever74/tulipfleet-dispatcher
```

### Commit Bağlamı

- **Amsterdam pilot commit:** `e42080b` (2026-05-30)
- **Migration:** `migrations/1779300000000_seed-nl-compliance-zones-pilot-amsterdam.sql`
- **Scripts:** `scripts/amsterdam-ze-zone-derive/` (derive.sh, derive.sql, generate-migration-v2.sh, stage-dryrun-v2.sh, inspect.sh, amsterdam_ze_zone.wkt)

### Önceki Research Dokümanları

- `docs/research/RESEARCH_Q1_Q2_RESULTS.md` — Amsterdam ST_Difference reçetesi (§G), 11-point sanity, fee research
- `docs/adr/ADR-0012-nl-compliance-layer.md` — 3-Phase Internal → Premium → Standalone strategy
- `docs/analysis/bottleneck-analysis-2026-05-30.md` — function-level shared infrastructure analizi
- `docs/analysis/sectoral-patterns-2026-05-30.md` — sectoral pattern extraction (Uber, DoorDash, Onfleet, Stripe, Netflix, Shopify)

### Strategic Positioning Documents

- `docs/ROADMAP.md` — Phase 1 / 1.1 / 2 / 3 evolution, 33-item Feature Wishlist Coverage Matrix
- 12 ADR (`docs/adr/ADR-0001` to `ADR-0014`)
- 17 FEAT spec (`docs/functions/FEAT-001` to `FEAT-106`)

---

## 8. NotebookLM Disipline

- **URL'leri DOĞRULA** — fake link verme, "bulamadım" demek "uydurmak"tan iyidir
- **Web search aktif** olduğundan emin ol (sources sekmesinde)
- **Tablo formatı** prose yerine
- **Türkçe analiz**, tablo başlıkları İngilizce, URL'ler aslı
- **Belirsiz konularda** "spec-belirsiz" yaz, tahmin etme
- **Premature optimization** uyar — eğer 18 şehir tek seferde yapmak hatalıysa, alternatif öner

---

## Change Log

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 2026-05-30 | Cem Bakir | İlk doküman — NotebookLM scale-out research defteri context. Amsterdam pilot başarısı belgelendi, 18 şehir hedefi tanımlandı, RWS endpoint engeli kaydedildi, alternatif kaynak listesi sağlandı. |
