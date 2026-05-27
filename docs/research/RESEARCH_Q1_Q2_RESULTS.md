# Q1 + Q2 Araştırma Sonuçları — NL ZE-Zone Master Reference

**Tarih:** 2026-05-26
**Kaynak:** opwegnaarzes.nl (üç sayfa fetch) — son güncelleme tarihleri sayfada belirtildi
**Amaç:** NotebookLM kaynak listesi + ulusal default kural referansı; Sıra 2.9.5 seed çalışması için

---

## A. 29 belediye + Schiphol — kesin liste

opwegnaarzes.nl/bedrijven/waar-komen-de-ze-zones (meta-date: 2026-03-20) sayfasının resmi listesi. **Tarih sırasına göre** sıraladım, alfabetik değil — operasyonel öncelik için bu daha kullanışlı:

### Aktif (Ocak 2025–Ocak 2026 başlangıçlı, 19 ZE-zone)

| # | Şehir | Start | T3 Resmi URL |
|---|---|---|---|
| 1 | Amersfoort | 2025-01-01 | https://www.amersfoort.nl/zero-emissie-stadslogistiek-zes-uitstootvrij-bevoorraden-0 |
| 2 | Amsterdam | 2025-01-01 | https://www.amsterdam.nl/verkeer-vervoer/milieuzone-amsterdam/ |
| 3 | Assen | 2025-01-01 | https://www.assen.nl/zero-emissiezone |
| 4 | Delft | 2025-01-01 | https://www.delft.nl/nul-emissiezone |
| 5 | Den Haag | 2025-01-01 | https://www.denhaag.nl/nl/verkeer-en-vervoer/zero-emissiezone/ |
| 6 | Eindhoven | 2025-01-01 | https://www.eindhoven.nl/projecten/nul-emissiezone |
| 7 | Gouda | 2025-01-01 | https://www.gouda.nl/gouda-werkt-aan-de-stad/zero-emissiezone-stadslogistiek/ |
| 8 | Leiden | 2025-01-01 | http://gemeente.leiden.nl/inwoners-en-ondernemers/werkzaamheden-in-leiden/mobiliteit-in-leiden/steden-bevoorraden-zonder-co2-uitstoot/ |
| 9 | Maastricht | 2025-01-01 | https://www.maastrichtbereikbaar.nl/nl/op-weg-naar-zes-maastricht/ |
| 10 | Nijmegen | 2025-01-01 | https://www.nijmegen.nl/over-de-gemeente/plannen/invoering-zero-emissiezones/ |
| 11 | Rotterdam | 2025-01-01 | https://logistiek010.nl/ze-zone-en-toegangseisen/ |
| 12 | Tilburg | 2025-01-01 | https://www.tilburg.nl/ondernemers/milieu/ontheffing-milieuzone/ |
| 13 | Utrecht | 2025-01-01 | https://www.utrecht.nl/wonen-en-leven/gezonde-leefomgeving/luchtkwaliteit/milieuzone-en-zero-emissiezone |
| 14 | Zwolle | 2025-01-01 | https://www.zwolle.nl/invoering-zero-emissiezone-in-2025 |
| 15 | 's-Hertogenbosch | 2025-03-01 | https://www.s-hertogenbosch.nl/ondernemer/milieu-en-afval/milieuzone-zero-emissie-zone |
| 16 | Groningen | 2025-04-01 | https://groningendoethetzero.nl |
| 17 | Haarlem | 2025-06-01 | https://haarlem.nl/nul-emissiezone-voor-vracht-en-bestelwagens |
| 18 | Enschede | 2025-07-01 | https://www.enschede.nl/zero-emissiezone |
| 19 | Schiphol (havalimanı) | 2026-01-01 | http://www.schiphol.nl/zes |

**ADR-0012'de "18 ZE-Zone şehri" yazıyor** ama bu sayım Schiphol'u içermiyor olabilir veya 's-Hertogenbosch ile karışmış olabilir — resmi sayfada **18 gemeente + Schiphol** denmiş. Yani 18 belediye (= 18 zone) ve Schiphol ayrı bir zone. **Sıra 2.9.5 seed'inde 19 polygon yapacağız**, hepsi `nl_compliance_zones`'da `effective_from = current_date_or_past` rowları.

### Gelecek (11 zone)

| # | Şehir | Start | T3 Resmi URL |
|---|---|---|---|
| 20 | Arnhem | 2026-06-01 | https://www.arnhem.nl/stad_en_wijken/Wegen_en_vervoer/Zero_emissiezone |
| 21 | Alphen aan den Rijn | 2027-01-01 | https://www.alphenaandenrijn.nl/Ondernemen/Zero_emissiezone |
| 22 | Venlo | 2027-01-01 | https://www.venlo.nl/zero-emissiezone-bestel-en-vrachtautos |
| 23 | Almere | 2028-01-01 | https://www.almere.nl/verkeer/uitstootvrije-zones |
| 24 | Deventer | 2028-01-01 | https://www.deventer.nl/nul-emissiezone |
| 25 | Breda | 2029-01-01 | https://www.breda.nl/duurzaam/zero-emissiezone |
| 26 | Apeldoorn | 2030-01-01 | https://doehetzero.nl/gemeente/apeldoorn/ |
| 27 | Ede | 2030-01-01 | https://ondernemen.ede.nl/zes-loket |
| 28 | Zaanstad | 2030-01-01 | https://doehetzero.nl/gemeente/zaanstad/ |
| 29 | Dordrecht | UNKNOWN | https://cms.dordrecht.nl/Inwoners/Overzicht_Inwoners/Parkeren_verkeer_en_vervoer/Overige_informatie/Zero_emissiezone_vanaf_2026 |

**Bu 11 şehir Sıra 2.9.5'in kapsamı dışında** (ADR-0012 §3.1 "18 ZE-Zone"). Phase 2'de eklenecekler. Ama lokasyon ve URL kayıtlı, gelecek seed işi için hazır.

---

## B. Ulusal default toegangsregels — kesin metinden

**Kaynak:** opwegnaarzes.nl/bedrijven/toegangsregels (meta-date: 2026-04-16). Bu metin **18+1 zonun TÜMÜ için ulusal default**'dur. Şehir-spesifik sapma yoksa, bu kurallar her zone'a uygulanır.

### B.1 — Bestelauto (van, N1 ≤ 3500 kg)

| Emission class | Datum Eerste Toelating | Bitiş tarihi |
|---|---|---|
| 0-4 (Euro 0-4) | — | **Erişim YOK** (start date'ten itibaren) |
| 5 (Euro 5) | — | **2027-01-01** |
| 6 (Euro 6) | DET < 2025-01-01 | **2029-01-01** *(kabinet uzatma planı; eski versiyonu 2028-01-01)* |
| 6 (Euro 6) | DET ≥ 2025-01-01 | **Erişim YOK** *(yeni Euro 6 hybrid'ler dahil)* |
| Zero-emission | — | Süresiz erişim |

> **Kritik detay:** *"nieuwe Euro 6 en hybride bestel- en vrachtwagens met een Datum Eerste Toelating vanaf 1-1-2025 hebben GEEN toegang"* — yani yeni Euro 6'lar bile erişim alamıyor. Bu, "Euro 6 = OK" varsayımını çürütüyor.

### B.2 — Vrachtauto (truck, N2 ve N3 > 3500 kg)

| Tip | DET aralığı | Bitiş tarihi |
|---|---|---|
| Yeni DET ≥ 2025-01-01 | — | **Zero-emission değilse erişim YOK** |
| Euro 6 **bakwagen** (rigid) | 2017-01-01 → 2019-12-31 | **2028-01-01** |
| Euro 6 **bakwagen** (rigid) | 2020-01-01 → 2024-12-31 | **2030-01-01** |
| Euro 6 **opleggertrekker** (tractor) | 2017-01-01 → 2024-12-31 | **2030-01-01** |
| Euro <6 | — | **Erişim YOK** |

### B.3 — Muafiyet kategorileri (otomatik kentekenherkenning)

**Bestelauto'lar için:**
- Oldtimer (≥40 yaş)
- Tekerlekli sandalye uygun araçlar (carrosserie code SH veya bijzonderheidscode 70, 145, 146, 147, 149)
- Engelli adaptasyonu ≥500€ olan araçlar
- Bu muafiyetler **2030-01-01'e kadar** geçerli

**Vrachtauto'lar için:**
- Kermis-/circusvoertuig (luna park / sirk)
- Exceptioneel vervoer (boyutsuz nakliye)
- Verhuisauto (taşınma kamyonu)
- Vrachtauto'lar laadkraan ≥35 tonmeter
- Carrosserie code 15, 16, 19, 23, 26, 27, 31
- Speciale doeleinden SB, SF
- Bu muafiyetler **2030-01-01'e kadar veya araç 13 yaşına ulaşana dek** (önce hangisi)

### B.4 — Diğer ulusal disiplinler
- **6 aylık waarschuwingsperiode** (uyarı periyodu, ceza yok) — her zone başlangıcından sonra
- **2026 cezası:** Bestel €130, Vracht €320
- **Ontheffing (waiver) tek otoritatif site:** [rdw.nl/ontheffing-zero-emissie](https://www.rdw.nl/ontheffing-zero-emissie) (RDW = ulusal araç tescil dairesi)
- **Kenteken (plaka) kontrolü:** RDW OVI portal ([ovi.rdw.nl](https://ovi.rdw.nl)) — DET ve emission class buradan çıkar

---

## C. NotebookLM için hazır kaynak yükleme listesi (5 katmana göre)

### T1 — Ulusal regulatory backbone

| # | URL | İçerik özeti |
|---|---|---|
| 1 | https://www.opwegnaarzes.nl | Ana sayfa, 18+10 belediye policy |
| 2 | https://www.opwegnaarzes.nl/bedrijven/toegangsregels | **ULUSAL DEFAULT KURALLAR** — emission/DET matrisi (sec. B) |
| 3 | https://www.opwegnaarzes.nl/bedrijven/waar-komen-de-ze-zones | Şehir listesi + URL'ler (sec. A) |
| 4 | https://www.opwegnaarzes.nl/bedrijven/ontheffingen | Ulusal ontheffing prosedürü |
| 5 | https://www.rdw.nl/ontheffing-zero-emissie | Resmi ontheffing başvuru |
| 6 | https://business.gov.nl/sustainable-business/sustainable-business-operations/zero-emission-zones-in-the-netherlands/ | İngilizce devlet özet |
| 7 | https://business.gov.nl/regulations/environmental-zone/ | Environmental vs ZE zone farkı |
| 8 | https://www.milieuzones.nl/en/english | Düşük emisyon harita portal |

### T2 — Akademik / bağımsız analitik

| # | URL | İçerik özeti |
|---|---|---|
| 9 | https://theicct.org/zez-netherlands-path-to-cleaner-urban-freight-oct25/ | ICCT Ekim 2025 analitik makale |

> **Boşluk:** TNO, Transport & Environment, CE Delft raporları araştırılmadı. Pilot Amsterdam'da ihtiyaç olursa eklenecek.

### T3 — Şehir-spesifik resmi (primary) — 19 zone

19 URL — Section A tablosundan, **Aktif** listenin tamamı + Schiphol.

> **NotebookLM'e ekleme stratejisi:** 19 URL × 1 source/her = 19 source. Bazı sayfalarda PDF Verkeersbesluit linki olabilir; o zaman 19+ olur. Section D'de "pilot Amsterdam derinlemesine" yapılacak, başka şehirleri o pattern oturunca eklenir.

### T4 — Şehir-spesifik tercüman/aggregator

| # | URL | İçerik özeti |
|---|---|---|
| 10 | https://urbanaccessregulations.eu/.../amsterdam-zero-emission-zone | URS Amsterdam (İngilizce) |
| 11 | https://www.eurocars.nl/en/blogs/milieuzones-en-zero-emissiezones-in-nederland/ | Eski liste (Mayıs 2025 itibariyle 16), tarihi referans |

> **Boşluk:** Diğer 18 şehir için urbanaccessregulations.eu sayfaları aranmadı. Pilot Amsterdam sonrası "URS Rotterdam" gibi sistematik tarama.

### T5 — Operasyonel / pratik

| # | URL | İçerik özeti |
|---|---|---|
| 12 | https://www.kvk.nl/en/sustainability/zero-emission-zones-what-do-they-mean-for-your-deliveries/ | KVK lojistik rehber |
| 13 | https://www.tln.nl/ledenvoordeel/tln-relatietabel-postcodegebieden-en-zero-emissiezones | TLN postcode tablosu (üye giriş gerekebilir) |

---

## D. Lessons learned bu araştırmadan

1. **Tek ulusal default değil, biri yeni eklenmiş:** Euro 6 bestel-auto'nun bitiş tarihi 2028 → 2029'a uzatılma kabinet planı. Buna göre seed'de 2029 alacağız ama `notes` JSONB'sinde "kabinet planı, henüz yasalaşmadı" notu olmalı. Source güncellik tarihi: 2026-04-16. **Bu rule değişiyor, son halini seed öncesi yeniden teyit etmemiz lazım.**

2. **Şehir-spesifik sapma henüz görülmedi:** Tüm listelenen şehirler aynı ulusal toegangsregels'e işaret ediyor görünüyor (separate per-city policy sayfaları olsa da). Yani migration UPSERT'lerinin **rules JSONB'si büyük ölçüde aynı olacak**, sadece `effective_from`, `zone_id`, `city`, `polygon` ve `source_url` farklı.

3. **Pilot Amsterdam'da doğrulanacak hipotez:** "Amsterdam'ın rules JSONB'si ulusal default + Amsterdam-spesifik ontheffing URL'i mi, yoksa Amsterdam'a özel daha sıkı bir kural var mı?" Bu sorulması gereken ilk soru. Eğer sapma yoksa, **diğer 17 zone seed işi inanılmaz kısalır** — sadece şehir ismi + URL + polygon değişir, rules sabit.

4. **Polygon hâlâ açık:** Bu fetch'lerde polygon GeoJSON URL'i çıkmadı. Pilot Amsterdam'da T3 sayfasında harita / download bağlantısı aranacak; yoksa OSM Overpass veya PDOK.

5. **Dordrecht'in start date'i UNKNOWN:** Bu Phase 2 için problem değil ama izlenecek.

6. **`'s-Hertogenbosch` URL'i geçerli, ama isim formatı dikkat:** Tablo bazen "'s Hertogenbosch", bazen "Den Bosch" (kısa adı), bazen "'s-Hertogenbosch". `city` kolonu için **resmi tam isim** kullanılacak: `'s-Hertogenbosch`. zone_id'de ASCII friendly: `s_hertogenbosch_ze_zone_2025`.

---

## E. Sonraki adım (orijinal hipotez — 2026-05-26 sabah)

NotebookLM'e Section C'deki URL'leri yükle. Pilot Amsterdam'da yapılacak ilk soru:

> *"For Amsterdam ZE-Zone, do the access rules differ from the national defaults at opwegnaarzes.nl/bedrijven/toegangsregels? Cite any city-specific deviations (different end dates, additional exempt categories, stricter weight limits, or non-24/7 time windows)."*

Cevap "No deviation" ise, **19 zone için tek migration dosyası yeter, ulusal default JSONB tüm rows'da paylaşılır.** Cevap "Deviation found in X, Y, Z" ise, sadece bu şehirler için ekstra inceleme.

Bu, "şehir başına 30 dakika" tahminini büyük ihtimalle "ortalama 10 dakika"ya indirir.

---

## F. Amsterdam Verkeersbesluit yapısı (T1 sonucu — 2026-05-26 akşam, REVIZE 2026-05-26 gece)

### F.0 ⚠️ Reçete uyarısı — CVDR'de "replacement pending" yanıltıcı olabilir

Bu Section'ın **ilk versiyonunda** Amsterdam Verkeersbesluit 2026'sının "henüz yayınlanmadığını" söyledik. Yanlıştı. T1'in ilk turunda sadece CVDR722264'e (2025 versiyon) baktım — bu sayfada *"Regeling vervallen per 01-01-2026"* yazılı, ama replacement linki YOK. Bu, **replacement'in olmadığı anlamına gelmiyor** — sadece CVDR portalı yeni regulation'ı eski ID'nin bir versiyonu olarak değil, **tamamen yeni bir CVDR ID** ile yayınlıyor.

**Doğru reçete (gelecek 17 şehir için):**

1. **Eski regulation CVDR sayfasında "vervallen" görünce, CVDR portalında keyword araması yap** — eski regulation'ın başlığına benzer + yıl (örn. *"Beleidsregels ontheffingen nul-emissiezone bedrijfs- en vrachtauto's gemeente {City} 2026"*)
2. **Aynı belediyenin diğer ZE-zone'la ilgili yeni CVDR yayınlarını kontrol et** — Beleidsregels, Aanwijzingsbesluit, Verordening leges genelde aynı dönemde yayınlanır
3. **Belediye haberleri ve persberichten** (managementsite.nl, raadsinformatie portali) çoğu zaman yeni regulation'ın resmi CVDR ID'sinden önce yayınlanır — bu yumuşak ipucu için iyi

Amsterdam için doğru güncel doc: **CVDR752146/1** (2026 versiyon). Aşağıdaki F.1-F.4 bu temiz veriyle güncellenmiş.

### F.1 Versiyon durumu (revize)

| Field | Eski 2025 (CVDR722264/1) | **Yeni 2026 (CVDR752146/1)** |
|---|---|---|
| Başlık | Ontheffingenbeleid nul-emissiezone 2025 | **Beleidsregels ontheffingen nul-emissiezone bedrijfs- en vrachtauto's gemeente Amsterdam 2026** |
| Geldend | 12-07-2024 → 31-12-2025 | **01-01-2026 → heden** |
| Status | Vervallen per 01-01-2026 | **Aktif, yürürlükte** |
| Karar tarihi | 18 juni 2024 | **30 september 2025** |
| Voorzitter | Femke Halsema | Femke Halsema (aynı) |
| Gemeentesecretaris | Peter Teesink | Peter Teesink (aynı) |
| Madde sayısı | 18 + toelichting | **20 + toelichting** |

**Pratik anlam (revize):** Seed verisinde CVDR752146/1 metnini kullanırız. `notes_internal` JSONB alanı:
```json
{
  "regulation_id": "CVDR752146/1",
  "regulation_status": "active",
  "geldend_from": "2026-01-01",
  "geldend_to": null,
  "supersedes": "CVDR722264/1 (Ontheffingenbeleid 2025)",
  "decision_date": "2025-09-30",
  "last_verified_at": "2026-05-26",
  "requires_revalidation_before": "2027-01-01"
}
```

### F.2 Ontheffing yapısı — 2026 versiyonu (14 madde)

Verkeersbesluit 4 paragrafta organize edilmiş, 2025'e göre **2 yeni langdurige ontheffing** eklendi:

#### §1 LANGDURIGE ONTHEFFINGEN — 8 madde (Centraal Loket mandate)

| Art | Konu | Bitiş tarihi | 2025'te var mıydı? |
|---|---|---|---|
| 3 | Vervangend emissieloos voertuig levertijd | Levertijd + 30 gün (uzatılabilir) | ✅ Var |
| 4 | Bijzondere voertuigen DET < 13 jaar | DET + 13 yıl, en geç 2030-01-01 | ✅ Var (genişletildi) |
| 5 | Plug-in hybride vrachtauto | 2030-01-01 | ✅ Var (2029 → 2030) |
| 6 | Niet emissieloos verkrijgbaar voertuig | 2029-12-31 (bestaand) / DET + 13 yıl (nieuw vrachtauto) / DET + 10 yıl (nieuw bedrijfsauto) | ✅ Var (yeniden yapılandırıldı) |
| 7 | Particuliere bedrijfs-/vrachtauto | 2028-01-01 | ✅ Var |
| 8 | Handicap aanpassing (≥€500) | 2030-01-01 | ✅ Var (süresiz değil!) |
| **9** | **Netcongestie ontheffing** (yetersiz şarj altyapısı) | 2 yıl, uzatılabilir | 🆕 **2026'da YENİ** |
| **10** | **Dierenambulance** | 2030-01-01 | 🆕 **2026'da YENİ** |

#### §2 DAGONTHEFFINGEN — 2 madde (Centraal Loket mandate)

| Art | Konu | Yıllık limit |
|---|---|---|
| 11 | Bedrijfsauto (van) dagontheffing | 12/zone/yıl |
| 12 | Vrachtauto dagontheffing | 12/zone/yıl |

#### §3 GEMEENTESPECIFIEKE ONTHEFFINGEN — 3 madde (kısmen lokal)

| Art | Konu | Otorite |
|---|---|---|
| 13 | Bedrijfseconomische omstandigheden | **Lokal college** karar verir + Art 13 §6: başka şehirden alınan ontheffing burada da geçerli |
| 14 | Afwijkingsbevoegdheid (hardheidsclausule) | Lokal college |
| **14a** | **Kampeerwagen otomatik (SA, zone içi sakin)** | Otomatik (başvuru yok) — 2025'te §2'deydi |

### F.3 ⚠️ Kritik mimari değişiklik — Ontheffinglerin ulusal işlerliği

**2025 versiyonunda:** Tüm langdurige ontheffingler **sadece o şehirde** geçerliydi. Bir vrachtauto Amsterdam'dan ontheffing alıp Rotterdam'a girince ayrı bir başvuru yapmak zorundaydı.

**2026 versiyonu Art 17 (Erkenning):**

> *"Ontheffingen als bedoeld in de artikelen 3 tot en met 10 en artikel 13, eerder verleend door of namens andere aan het Centraal Loket deelnemende gemeenten met een nul-emissiezone, gelden per 1 januari 2026 ook in de gemeente Amsterdam."*

Yani:
- **§1 (Art 3-10) langdurige ontheffingler:** Tüm 19 zone'da otomatik geçerli → **shared_rules**
- **§2 (Art 11, 12) dagontheffing + §3 (Art 14) afwijkingsbevoegdheid:** Sadece o şehirde geçerli → **city_overlay**
- **§3 Art 13 bedrijfseconomische** özel durum: Karar lokal **ama** geçerlilik landelijk (Art 13 §6) → **hibrit**

### F.4 Schema kararı için pratik özet

```
shared_rules JSONB:
  - §1 Art 3-10 (8 langdurige ontheffing) — ulusal metin, ulusal geçerlilik
  - §2 Art 11-12 (dagontheffing) — ulusal metin, lokal geçerlilik (zone-specific 12/yıl limit)
  - Art 17 erkenning hükmü
  - Ulusal default access rules (RVV 1990 Art 86c-86e)
  - 2026 yeni: netcongestie + dierenambulance

city_overlay JSONB:
  - §3 Art 13 (bedrijfseconomische) — lokal karar otoritesi, ulusal etki
  - §3 Art 14 (afwijkingsbevoegdheid) — tam lokal
  - §3 Art 14a (kampeerwagen otomatik) — kentekenhouder zone içi kayıtlı olmalı (şehir-spesifik kayıt)
  - Şehre özel ontheffing ücretleri (Art 13, Art 14 için — bk. G.9)
  - Şehre özel polygon (bk. G)
  - Şehre özel future plans (Amsterdam 2028 A10 expansion)
```

Bu yapı, ADR-0012 §5'in denormalize-with-overlay kararını **net şekilde** destekliyor.

---

## G. Pilot Amsterdam — Polygon derivation method (T2 + T3 sonucu)

### G.1 amsterdam.nl bestelauto regels — ulusal default ile birebir aynı

amsterdam.nl/verkeer-vervoer/milieuzones-uitstootvrije-zones/bestelauto/regels-uitstootvrije-zone-milieuzone/ sayfası tam içerik çekildi. Bestelauto için kurallar:

| Kural | Tarih | Ulusal default sapması? |
|---|---|---|
| DET ≥ 2025-01-01, fosil yakıt | Erişim yok | ✅ Aynı |
| Emission class 4 ↓ | Erişim yok | ✅ Aynı |
| Emission class 5 | 2027-01-01'e kadar | ✅ Aynı |
| Emission class 6 (DET < 2025) | 2029-01-01'e kadar | ✅ Aynı |

**Hipotez doğrulandı:** Amsterdam'ın bestelauto kuralları ulusal default ile özdeş, sapma yok.

#### Otomatik istisnalar — şehir-spesifik bir madde var

| İstisna | Süre | Sapma? |
|---|---|---|
| 40+ yaş oldtimer | 2030-01-01'e kadar | ✅ Ulusal default |
| Wheelchair (carrosserie SH + kod 70/145/146/147/149) | 2030-01-01'e kadar | ✅ Ulusal default |
| **Camper (subcategory SA) zone içi kayıtlı** | Süresiz | ⚠️ **Amsterdam-spesifik** (Art 11) |

#### Future rules — 2028 A10 expansion

Sayfa açıkça beyan ediyor:
> *"We expect that from 2028 the entire area within the Ring A10 will become an emission-free zone."*

Bu, ZE-zone polygon'unun **2028'de S100'den A10'a genişleyeceğini** belirtir. Seed verisinde:
- `effective_to`: 2027-12-31 (mevcut S100 polygon için)
- 2028'den itibaren yeni bir row eklemek için yer tutucu (versioning)

### G.2 Polygon kaynak keşfi: kaart.amsterdam.nl API pattern

amsterdam.nl sayfası `https://kaart.amsterdam.nl/milieuzones-verkeer-amsterdam` haritasına link veriyor. Mappi tabanlı bir Leaflet uygulaması. **Doğrudan GeoJSON download butonu yok**, ama F12 DevTools → Network sekmesi → Fetch/XHR filtresi ile katmanlar tek tek görülüyor.

**API endpoint pattern:**
```
https://kaart.amsterdam.nl/api/layers/{LAYER_ID}.json
```

5 katman tespit edildi (F12 trafiği):

| Layer ID | Title (`properties.title`) | Feature count | Geometry | Boyut |
|---|---|---|---|---|
| 19419 | Milieuzone / uitstootvrije zone | 1 | Polygon, 6 ring, 594 pt | 12 KB |
| 23630 | Uitstootvrije zone pleziervaart | 2 | Polygon (tekne) | 3 KB |
| 17573 | P+R Sloterdijk + 19 diğer | 20 | Point | 18 KB |
| 42487 | Bestel- en vrachtauto's (Milieuzone vanaf 2025) | 1 | MultiPolygon, 6 poly, 1260 pt | 37 KB |
| 42434 | (başlık "1" — anlamsız, anti-veri) | 1 | Polygon, 1 ring, 666 pt | 19 KB |
| 19421 (extra) | (başlıksız) | 1 | MultiPolygon, 12 poly, 12693 pt | 432 KB |

### G.3 Kritik bulgu — ZE-zone için kendi layer'ı yok

Beklenen "Cargo and van (Ejection Free Zone)" katmanı **ayrı bir layer ID'sinde bulunmuyor**. Mevcut layer'lar:
- **19419** (`Milieuzone / uitstootvrije zone`) = milieuzone ∪ ZE-zone birleşik (66.97 km²)
- **42487** (`Bestel- en vrachtauto's`) = sadece milieuzone halkası, ZE-zone hariç (59.13 km²)

İki katmanın **küçük parçaları identik** (0.5931, 0.3510, 0.2334, 0.1652, 0.0190 km² alanlarındaki enclave'lar), ana polygon ~8 km² farklı. Bu, **ZE-zone'un ikinci katmandan çıkarılması gerektiğini** kanıtlıyor.

### G.4 Derivation formülü — `ST_Difference(19419, 42487) + ST_Area > 1000 m²`

```sql
-- ZE-zone polygon türetme (resmi belediye verisinden)
WITH raw_diff AS (
  SELECT ST_Difference(layer_19419_geom, layer_42487_geom) AS geom
),
dumped AS (
  SELECT (ST_Dump(geom)).geom AS poly FROM raw_diff
),
filtered AS (
  SELECT poly FROM dumped
  WHERE ST_Area(poly::geography) > 1000  -- 1000 m² altı gürültü filtresi
)
SELECT ST_Multi(ST_Union(poly)) AS ze_zone_polygon
FROM filtered;
```

**Niye gürültü filtresi gerekli?** Ham `ST_Difference()` sonucu **26 polygon** üretti — 1 ana parça (7.84 km²) + 25 mikroskopik artefakt (~0.0001 km² = ~10 m²). Bu artefaktlar `ST_Difference`'ın iki polygon sınırında oluşturduğu floating-point precision hataları. `1000 m²` eşiği güvenli — gerçek bir enclave bu kadar küçük olmaz, ama tüm artefaktlar bu eşiğin altında.

### G.5 Final polygon metrikleri

| Metrik | Değer |
|---|---|
| Polygon sayısı | 1 |
| Alan | 7.8402 km² |
| Çevre | 16.85 km |
| Geometry type | POLYGON (4326) |
| ST_IsValid | true |
| Centroid | (4.900, 52.371) — Dam Square'a ~100 m |
| Bounding box | lon 4.83-4.98, lat 52.33-52.42 |
| WKT boyutu | 17.4 KB |
| GeoJSON boyutu | 17.4 KB |
| EWKB binary | 10.4 KB |

### G.6 Sanity test sonuçları — 11/11 PASS

| Lokasyon | Koordinat (lon, lat) | Beklenen | Gerçek | Sonuç |
|---|---|---|---|---|
| Dam Square | 4.8924, 52.3731 | inside | inside | ✅ PASS |
| Amsterdam Centraal | 4.9008, 52.3791 | inside | inside | ✅ PASS |
| Rembrandtplein | 4.8956, 52.3661 | inside | inside | ✅ PASS |
| Leidseplein | 4.8830, 52.3640 | inside | inside | ✅ PASS |
| Waterlooplein | 4.9020, 52.3667 | inside | inside | ✅ PASS |
| Westerpark | 4.8757, 52.3863 | outside | outside | ✅ PASS |
| Vondelpark | 4.8730, 52.3580 | outside | outside | ✅ PASS |
| RAI Amsterdam-Zuid | 4.8854, 52.3417 | outside | outside | ✅ PASS |
| NDSM Amsterdam-Noord | 4.8997, 52.4011 | outside | outside | ✅ PASS |
| Schiphol | 4.7639, 52.3086 | outside | outside | ✅ PASS |
| Haarlem | 4.6379, 52.3812 | outside | outside | ✅ PASS |

**Sınır doğrulaması:** Vondelpark "outside" çıktı — bu **doğru** çünkü Vondelpark Stadhouderskade'nin güneyinde, S100 dışında. Önceki varsayım yanlıştı.

### G.7 Migration için seçim: WKT format

Üç format arasında **WKT** seçildi:
- ✅ Git diff'te okunabilir (sürüm kontrol için kritik)
- ✅ 17.4 KB tek SQL INSERT'te sorun değil
- ✅ Yeniden derive gerekirse açık metin görünür
- ❌ EWKB hex string (kompakt ama opak)
- ⚠️ GeoJSON da uygun ama JSONB içine gömmek gereksiz nesting yaratır

Migration pattern:
```sql
INSERT INTO enterprise.nl_compliance_zones (city, polygon, ...)
VALUES (
  'Amsterdam',
  ST_GeomFromText('POLYGON((4.9216 52.3908, ...))', 4326),
  ...
);
```

### G.8 Gelecek 17 şehir için yöntem reçetesi

Amsterdam pilotu **şehir başına ~15 dakikalık** bir yöntem kazandırdı:

1. **F12 Network keşif:** `kaart.{city}.nl/api/layers/{ID}.json` pattern'i ara, veya benzer Mappi/Leaflet instance bul
2. **Katman karşılaştırma:** Genelde ZE+milieu birleşik bir layer + sadece milieu ayrı bir layer mevcut
3. **`ST_Difference()` derivation:** ZE-zone'un kendi layer'ı yoksa boolean fark al
4. **`ST_Area > 1000 m²` filtre:** Floating-point gürültüsünü temizle
5. **8-12 sanity noktası ile doğrula:** Centrum içi 3-5, sınırda 2, dışarıda 3-5

**Toplam tahmin:** 17 şehir × 15 dk = ~4-5 saat ZE-zone polygon kapsama. Bu pilotla bilgi kaybedilmeden ölçeklenebilir.

**Mappi kullanmayan şehirler için fallback:** PDOK (Hollanda ulusal geo portal) veya OSM Overpass API.

### G.9 Legesverordening — ulusal harmonize tarife tablosu (T5 sonucu)

**Bulgu:** 2026'dan itibaren ZE-zone ontheffing **ücretleri ulusal harmonize edildi**. Önceki "şehir-spesifik ücret" varsayımı yanlıştı.

#### G.9.1 Yasal yapı — neden ayrı verordening?

Amsterdam **Algemene Legesverordening 2026** (CVDR747167) içinde ZE-zone'a yer vermedi — eski Hoofdstuk 4 (Milieubelastende activiteiten) **"VERVALLEN"** olarak boş bırakıldı. Sebep ([Algemene Legesverordening Toelichting](https://lokaleregelgeving.overheid.nl/CVDR747167)):

> *"Er komt naast de algemene legesverordening een aparte verordening voor nul-emissie. Reden hiervoor is risicospreiding omdat de ontheffingen nul-emissiezones en de legesheffing worden overgedragen aan het RDW."*

Yani 19 ZE-zone şehri **her biri ayrı bir "Verordening leges Zero-emissiezone {City} 2026"** çıkardı (paralel, identik içerikle). Amsterdam'ınki CVDR portalında 2026-05-26 itibarıyla bireysel olarak indexlenmemiş; **Rotterdam'ınki (CVDR749151/1) proxy olarak kullanıldı** (içerikler ulusal harmonize).

> *Rotterdam verordening Toelichting:* "Doordat alle gemeenten dit mandaat hebben afgegeven gelden de ontheffingen in alle deelnemende gemeenten en daardoor 'landelijk'. Er wordt per ontheffing derhalve ook eenmalig leges geheven, doordat het Centraal loket is aangewezen als heffings- en invorderingsambtenaar door alle deelnemende gemeenten. **Ook de tarieven zijn landelijk afgestemd tot stand gekomen.**"

#### G.9.2 Ulusal tarife tablosu 2026 (€)

| Kategori | Beleidsregels Art | Tarife | shared_rules / city_overlay |
|---|---|---|---|
| Langdurige (genel) | Art 3-6, 8, 9 | **€100,00** | shared_rules |
| Langdurige particuliere | Art 7 | **€60,00** | shared_rules |
| Langdurige dierenambulance | Art 10 | **€25,00** | shared_rules |
| Verlenging (Art 3 levertijd, Art 9 netcongestie) | — | **nihil (€0)** | shared_rules |
| Dagontheffing | Art 11, 12 | **€30,00** | shared_rules |
| Bedrijfseconomische | Art 13 | **€250,00** | **city_overlay** (Rotterdam'da €250, Amsterdam doğrulanmamış) |
| Afwijkingsbevoegdheid (hardheidsclausule) | Art 14 | **€250,00** | **city_overlay** (Rotterdam'da €250, Amsterdam doğrulanmamış) |

**Önemli not — Art 13 ve Art 14 rakamları:** Rotterdam'da €250 görüldü ama bu **gerçekten city-spec olabilir veya tesadüfen aynı olabilir**. Amsterdam'ın spesifik verordening'i CVDR'de henüz indexlenmediği için doğrulanamıyor. Migration'da Amsterdam için bu iki rakamı **`null` koymak** veya **Rotterdam değerinden mirror almak** Cem'in kararına bağlı. Konservatif yaklaşım: `null` + flag "verify".

#### G.9.3 Yasal otorite zinciri

```
RVV 1990 (Reglement verkeersregels en verkeerstekens) — Art 86c-86e, 87
  ├─ Verkeersbesluit nul-emissiezone gemeente {City}      ← zone polygon + emission rules
  ├─ Beleidsregels ontheffingen nul-emissiezone {City} 2026  ← 14 ontheffing kategorisi (CVDR752146 for Amsterdam)
  ├─ Verordening leges Zero-emissiezone {City} 2026       ← tarife tablosu (CVDR749151 for Rotterdam, Amsterdam henüz indexlenmedi)
  └─ Aanwijzingsbesluit heffings- en invorderingsambtenaar  ← RDW Centraal Loket yetki devri (CVDR753297 for Amsterdam)
```

#### G.9.4 Schema önerisi — `rules.shared_rules.ontheffing_fees`

```json
{
  "shared_rules": {
    "ontheffing_fees_eur": {
      "langdurige_standaard": 100.00,
      "langdurige_particuliere": 60.00,
      "langdurige_dierenambulance": 25.00,
      "verlenging": 0.00,
      "dagontheffing": 30.00,
      "currency": "EUR",
      "valid_from": "2026-01-01",
      "source": "Verordening leges Zero-emissiezone (landelijk afgestemd)",
      "carrier_regulation_proxy": "Rotterdam CVDR749151/1 — Amsterdam own version CVDR-indexed pending"
    },
    ...
  },
  "city_overlay": {
    "ontheffing_fees_eur": {
      "bedrijfseconomische_art13": 250.00,
      "afwijkingsbevoegdheid_art14": 250.00,
      "source": "Rotterdam proxy — Amsterdam own values not yet CVDR-indexed, verify on next research cycle"
    },
    "fee_verification_status": "rotterdam_proxy_used"
  }
}
```

---

## H. Sonraki adım (güncel — 2026-05-26 gece)

### Bekleyen görevler (kanban)

| # | Görev | Durum |
|---|---|---|
| ~~T1~~ | Verkeersbesluit 2026 versiyon kontrol | ✅ DONE (revize) — Section F (CVDR752146/1 doğrulandı) |
| ~~T2~~ | Amsterdam bestelauto regels | ✅ DONE — Section G.1 |
| ~~T3~~ | Amsterdam ZE-zone polygon | ✅ DONE — Section G (7.84 km², 11/11 PASS) |
| ~~T5~~ | Amsterdam Legesverordening (ontheffing ücreti) | ✅ DONE — Section G.9 (ulusal harmonize, Rotterdam proxy) |
| M1 | GeoJSON/WKT → migration için hazırla | TODO |
| M2 | rules JSONB construct (shared + overlay) — F.4 + G.9.4 schema'ya göre | TODO |
| M3 | `1779300000000_seed-nl-compliance-zones-pilot-amsterdam.sql` yaz | TODO |
| M4 | Staging dry-run + SAVEPOINT constraint test | TODO |
| M5 | Staging apply | TODO |
| M6 | Smoke test (point-in-polygon Dam Square + grid) | TODO |
| M7 | Production apply (pre-backup + Cem onayı) | TODO |
| P1 | NOTEBOOKLM_WORKFLOW_PROTOCOL güncelleme | TODO |
| P2 | ADR-0012 §5 schema güncelleme (`ontheffing_fees_eur` alanı eklenmesi — POLYGON tipi zaten doğru, MULTIPOLYGON yanılgısı düzeltildi) | TODO |
| P3 | ADR-0012 §3.1 "18 ZE-Zone" → "19 zone (18 + Schiphol)" | TODO |
| P4 | Bu doc commit + dispatcher repo'ya push | TODO |
| **P5** | **Amsterdam'ın spesifik Verordening leges CVDR ID'sini sonraki turda doğrula** (henüz indexlenmedi, Art 13 + Art 14 €250 Rotterdam proxy) | TODO |

### Önemli schema kararları (M1-M3 öncesi sabit)

- `enterprise.nl_compliance_zones.polygon` kolonu: **`GEOMETRY(POLYGON, 4326)`** (ADR-0012 §5 + Sıra 2.9.2 production migration ile uyumlu). Amsterdam pilot polygon recovery'sinde `ST_Difference + ST_Area > 1000m²` gürültü filtresinden sonra tek parça çıkıyor — POLYGON'a sığar. *(2026-05-27 düzeltme: Dünkü turda yanlışlıkla "MULTIPOLYGON" yazılmıştı, üretim şeması ve ADR ile çelişiyordu.)*
- `rules` JSONB yapısı: `shared_rules` + `city_overlay` (denormalized, ADR-0012 §5)
- **`rules.shared_rules.ontheffing_fees_eur`** — F.9.4'teki yapı (5 alan, ulusal harmonize: 100, 60, 25, 30, 0)
- **`rules.city_overlay.ontheffing_fees_eur`** — Art 13 ve Art 14 için (Amsterdam doğrulanmamış, Rotterdam proxy €250)
- `notes_internal` JSONB: `regulation_id`, `regulation_status`, `geldend_from/to`, `supersedes`, `decision_date`, `last_verified_at`, `requires_revalidation_before`, `polygon_derivation_method`, `fee_verification_status`
- `effective_to`: Amsterdam için 2027-12-31 (2028 A10 expansion için yer tutucu)
- Migration pattern: idempotent UPSERT (ON CONFLICT DO UPDATE)

### Çözülmüş / gelecek tarama sınırları

| Konu | Durum | Sonraki tur işi |
|---|---|---|
| CVDR752146/1 tam metin | ✅ Elde edildi | — |
| Ulusal tarife rakamları (5 alan) | ✅ Elde edildi (Rotterdam proxy + landelijk afspraak metni) | — |
| Amsterdam'ın spesifik Verordening leges CVDR ID'si | ⚠️ Henüz indexlenmemiş | 1-2 hafta sonra CVDR keyword search tekrar dene |
| Art 13/14 Amsterdam-spesifik rakamları | ⚠️ Rotterdam proxy (€250) | Amsterdam Verordening CVDR-indexed olunca doğrula |
| Verkeersbesluit 2026 (zone polygon resmi metni) | ⚠️ Henüz aranmadı | Şehirde "verkeersbesluit nul-emissiezone 2024-06-18" hâlâ geçerli mi yoksa yenisi mi var? Düşük öncelik (polygon zaten elimde) |
