// Tek seferlik düzeltme betiği — W24 (FEAT-020) satırını günceller.
// Çalıştır: node fix-roadmap.js   (C:\dispatcher içinde)
const fs = require("fs");
const path = "docs/ROADMAP.md";

const content = fs.readFileSync(path, "utf8");
const lines = content.split("\n");

const idx = lines.findIndex((l) => l.startsWith("W24\t"));
if (idx === -1) {
  console.error("W24 satırı bulunamadı — dosya zaten değişmiş olabilir. Hiçbir şey yazılmadı.");
  process.exit(1);
}

const already = lines[idx].includes("Phase 1.1 on-koşulu 2026-10-12'de BAŞLADI");
if (already) {
  console.log("W24 satırı zaten güncel görünüyor, değişiklik yapılmadı.");
  process.exit(0);
}

const newLine =
  "W24\tCapacity-Aware Delivery Promising\tCommon\tbase feature of cargo mgmt (kanban approach)\tFEAT-020\t1.1\t" +
  "📋 Spec hala pending (matching logic yazılmadı). **Phase 1.1 on-koşulu 2026-10-12'de BAŞLADI:** " +
  "`public.vehicles` kargo kapasite kolonları canlı (`tulipfleet-backend` migration `1783400000000`: " +
  "cargo_capacity_volume_m3/weight_kg + hazmat_certified_classes, nullable/additive — cargoScorer'ı aktif " +
  "eden eksik \"arz\" verisi, CapacityRequired'daki \"talep\" ile simetrik) + backend validasyonu " +
  "(`routes/vehicleCapacityHelpers.js`, 180/180) + mobil admin Create/EditVehicleScreen'e hacim/ağırlık " +
  "alanları eklendi (10 dil, ku hariç — o namespace'i hiç yok). cargoScorer HALA INACTIVE — bu sadece veri " +
  "TOPLAMAYA başlar, scorer'ı aktive eden matching logic ayrı, sonraki bir artım (spec yazılmadan atlanmadı)";

console.log("ESKİ satır:\n" + lines[idx] + "\n");
console.log("YENİ satır:\n" + newLine + "\n");

lines[idx] = newLine;
fs.writeFileSync(path, lines.join("\n"), "utf8");
console.log("docs/ROADMAP.md güncellendi.");
