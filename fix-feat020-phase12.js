// FEAT-020 Phase 1.2 (Katman A: statik kapasite binary-gate matching) —
// tek seferlik, idempotent teslim betigi. Hepsi tulipfleet-dispatcher
// reposu icinde (tek repo, baska repoya dokunmuyor).
// Calistir: node fix-feat020-phase12.js   (C:\dispatcher icinde)
"use strict";
const fs = require("fs");
const path = require("path");

function ensureDir(p) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
}

function writeNewFile(relPath, content) {
  if (fs.existsSync(relPath)) {
    const existing = fs.readFileSync(relPath, "utf8");
    if (existing === content) {
      console.log(`${relPath}: zaten guncel, atlandi.`);
      return;
    }
    console.log(`${relPath}: zaten var ama icerik farkli — UZERINE YAZILDI.`);
  } else {
    console.log(`${relPath}: yeni dosya olusturuldu.`);
  }
  ensureDir(relPath);
  fs.writeFileSync(relPath, content, "utf8");
}

function anchoredReplace(relPath, oldBlock, newBlock, label) {
  const content = fs.readFileSync(relPath, "utf8");
  if (content.includes(newBlock)) {
    console.log(`${relPath} (${label}): zaten guncel, atlandi.`);
    return;
  }
  if (!content.includes(oldBlock)) {
    console.error(
      `${relPath} (${label}): HATA — eski blok bulunamadi, dosya beklenenden farkli. Elle kontrol et.`
    );
    process.exitCode = 1;
    return;
  }
  fs.writeFileSync(relPath, content.replace(oldBlock, newBlock), "utf8");
  console.log(`${relPath} (${label}): guncellendi.`);
}

// ---------------------------------------------------------------------------
// 1) FEAT-020 spec dokumani — BU SCRIPT ARTIK DOKUNMUYOR.
// (2026-10-13: spec v2.0'a guncellenip ayrica teslim edildi ve commit'lendi
// — 2db6ef5. Bu script'in eski (v1.0) __feat020_spec.md.tmp icerigi hala
// kalirsa v2.0'in uzerine yazardi; o yuzden cikarildi. __feat020_spec.md.tmp
// dosyasini da silebilirsin, artik kullanilmiyor.)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// 2) Yeni dosya: cargoScorer.test.ts (RED test)
// ---------------------------------------------------------------------------
writeNewFile(
  "src/services/dispatch/scoring/scorers/cargoScorer.test.ts",
  fs.readFileSync(path.join(__dirname, "__cargoScorer.test.ts.tmp"), "utf8")
);

// ---------------------------------------------------------------------------
// 3) cargoScorer.ts TAM DEGISTIRME (InactiveScorer -> ActiveScorer)
// ---------------------------------------------------------------------------
writeNewFile(
  "src/services/dispatch/scoring/scorers/cargoScorer.ts",
  fs.readFileSync(path.join(__dirname, "__cargoScorer.ts.tmp"), "utf8")
);

// ---------------------------------------------------------------------------
// 4) types.ts — VehicleCargoCapacity + ScoringVehicleSnapshot.cargoCapacity
// ---------------------------------------------------------------------------
anchoredReplace(
  "src/services/dispatch/scoring/types.ts",
  `export interface ScoringVehicleSnapshot {
  id: string;
  plate: string;
  latitude: number | null;
  longitude: number | null;
  speedKmh: number | null;
  movementStatus: string | null; // deriveStatus ciktisi: moving | idle | stopped
  lastUpdate: string | null;
  /**
   * Regulasyon Scorer'in Uyanisi (04.08): assess sonucu. undefined/null =
   * veri yok — scorer 0.5 notr + durust memo doner, sahte karar uretmez.
   */
  compliance?: ComplianceAssessRow | null;
}`,
  `/**
 * FEAT-020 Phase 1.1/1.2 (2026-10-12): public.vehicles'taki statik kargo
 * kapasite kolonlarinin (migration 1783400000000) snapshot kesiti.
 * undefined = alan hic gelmedi (enterprise-backend /api/dispatcher/vehicles
 * route'u bu kolonlari henuz SELECT etmiyor — FEAT-020 spec FN-3, acik madde);
 * null alanlar = arac kaydinda veri girilmemis. Ikisi de cargoScorer'da ayni
 * "veri yok" fallback'ine duser (eligible:true, notr) — hazmat gate HARIC.
 */
export interface VehicleCargoCapacity {
  volumeM3: number | null;
  weightKg: number | null;
  hazmatCertifiedClasses: string[];
}

export interface ScoringVehicleSnapshot {
  id: string;
  plate: string;
  latitude: number | null;
  longitude: number | null;
  speedKmh: number | null;
  movementStatus: string | null; // deriveStatus ciktisi: moving | idle | stopped
  lastUpdate: string | null;
  /**
   * Regulasyon Scorer'in Uyanisi (04.08): assess sonucu. undefined/null =
   * veri yok — scorer 0.5 notr + durust memo doner, sahte karar uretmez.
   */
  compliance?: ComplianceAssessRow | null;
  /** FEAT-020 Phase 1.2 — bkz. VehicleCargoCapacity yorumu. */
  cargoCapacity?: VehicleCargoCapacity | null;
}`,
  "VehicleCargoCapacity"
);

// ---------------------------------------------------------------------------
// 5) optimize/index.tsx — 3 nokta
// ---------------------------------------------------------------------------
const OPT = "src/layouts/dispatcher/tasks/optimize/index.tsx";

anchoredReplace(
  OPT,
  `  const vehicleLabels = useMemo(() => {
    const map: Record<string, string> = {};
    vehicles.forEach((v: Vehicle) => {
      map[v.id] = v.plate_no || v.id.slice(0, 8);
    });
    return map;
  }, [vehicles]);`,
  `  const vehicleLabels = useMemo(() => {
    const map: Record<string, string> = {};
    vehicles.forEach((v: Vehicle) => {
      map[v.id] = v.plate_no || v.id.slice(0, 8);
    });
    return map;
  }, [vehicles]);

  // FEAT-020 Phase 1.2: public.vehicles kargo kapasite kolonlari (Vehicle
  // tipi [key:string]:any gevsek tipli, optional chaining ile okunur).
  // GERCEK VERI AKMASI FN-3'e bagli (enterprise-backend /api/dispatcher/vehicles
  // route'u bu kolonlari henuz SELECT etmiyor, spec'te acik madde) - o kapanana
  // kadar bu map hep undefined doner, cargoScorer fallback'e duser (bloke etmez).
  const vehicleCargoCapacityById = useMemo(() => {
    const map: Record<string, ScoringVehicleSnapshot["cargoCapacity"]> = {};
    vehicles.forEach((v: Vehicle) => {
      const hasAny =
        v.cargo_capacity_volume_m3 !== undefined ||
        v.cargo_capacity_weight_kg !== undefined ||
        v.hazmat_certified_classes !== undefined;
      if (!hasAny) return;
      map[v.id] = {
        volumeM3: v.cargo_capacity_volume_m3 ?? null,
        weightKg: v.cargo_capacity_weight_kg ?? null,
        hazmatCertifiedClasses: v.hazmat_certified_classes ?? [],
      };
    });
    return map;
  }, [vehicles]);`,
  "vehicleCargoCapacityById"
);

anchoredReplace(
  OPT,
  `          lastUpdate: frame ? frame.timestamp : null,
          // Regulasyon (04.08): assess satiri; yoksa null -> scorer 0.5 notr
          compliance: assessQuery.data?.byVehicle.get(vehicleId) ?? null,
        };
      });
    },
    [vehicleLabels, assessQuery.data]
  );`,
  `          lastUpdate: frame ? frame.timestamp : null,
          // Regulasyon (04.08): assess satiri; yoksa null -> scorer 0.5 notr
          compliance: assessQuery.data?.byVehicle.get(vehicleId) ?? null,
          // FEAT-020 Phase 1.2: undefined kalirsa cargoScorer fallback'e duser.
          cargoCapacity: vehicleCargoCapacityById[vehicleId],
        };
      });
    },
    [vehicleLabels, assessQuery.data, vehicleCargoCapacityById]
  );`,
  "buildSnapshots.cargoCapacity"
);

anchoredReplace(
  OPT,
  `                  if (cRow.heffing && cRow.heffing.matched) {
                    badges.push({
                      icon: "euro",
                      text: \`€\${cRow.heffing.total_charge.toFixed(2)}\`,
                      tone: "neutral",
                    });
                  }
                }
                return [`,
  `                  if (cRow.heffing && cRow.heffing.matched) {
                    badges.push({
                      icon: "euro",
                      text: \`€\${cRow.heffing.total_charge.toFixed(2)}\`,
                      tone: "neutral",
                    });
                  }
                }
                // FEAT-020 Phase 1.2 (FN-2): binary-gate kargo elenmesi — compliance
                // "entryBlocked" rozetiyle AYNI desen, yeni state/mimari gerekmedi.
                if (r.detail.eligible === false) {
                  badges.push({ icon: "block", text: t("optimize.cargoIneligible"), tone: "warn" });
                }
                return [`,
  "badge.cargoIneligible"
);

// ---------------------------------------------------------------------------
// 6) i18n — cargoIneligible key, 3 dil
// ---------------------------------------------------------------------------
anchoredReplace("src/i18n/tr.ts", `    entryBlocked: "Giriş engelli",`, `    entryBlocked: "Giriş engelli",
    cargoIneligible: "Kargoya uygun değil",`, "i18n.tr");
anchoredReplace("src/i18n/en.ts", `    entryBlocked: "Entry blocked",`, `    entryBlocked: "Entry blocked",
    cargoIneligible: "Not cargo-eligible",`, "i18n.en");
anchoredReplace("src/i18n/nl.ts", `    entryBlocked: "Toegang geblokkeerd",`, `    entryBlocked: "Toegang geblokkeerd",
    cargoIneligible: "Niet geschikt voor lading",`, "i18n.nl");

// ---------------------------------------------------------------------------
// 7) ROADMAP.md — W24 satiri
// ---------------------------------------------------------------------------
(function updateRoadmap() {
  const p = "docs/ROADMAP.md";
  const content = fs.readFileSync(p, "utf8");
  const lines = content.split("\n");
  const idx = lines.findIndex((l) => l.startsWith("W24\t"));
  if (idx === -1) {
    console.error("docs/ROADMAP.md: HATA — W24 satiri bulunamadi. Elle kontrol et.");
    process.exitCode = 1;
    return;
  }
  if (lines[idx].includes("Phase 1.2 (matching logic, Katman A) TAMAMLANDI")) {
    console.log("docs/ROADMAP.md (W24): zaten guncel, atlandi.");
    return;
  }
  const newLine = fs.readFileSync(path.join(__dirname, "__roadmap_w24.txt.tmp"), "utf8").replace(/\n$/, "");
  lines[idx] = newLine;
  fs.writeFileSync(p, lines.join("\n"), "utf8");
  console.log("docs/ROADMAP.md (W24): guncellendi.");
})();

console.log("\nTamamlandi. Gecici .tmp dosyalarini (__*.tmp) ve bu betigi silebilirsin.");
