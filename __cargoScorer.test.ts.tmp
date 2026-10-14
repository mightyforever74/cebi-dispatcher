/**
 * cargoScorer — FEAT-020 Phase 1.2 (Katman A: statik kapasite binary-gate).
 * Spec: docs/functions/FEAT-020-capacity-aware-delivery-promising.md §6.
 * Kilitli RED test — implementasyon cargoScorer.ts'de, bu dosyada degil.
 */
import { cargoScorer } from "./cargoScorer";
import { ScoringTask, ScoringVehicleSnapshot } from "../types";

function vehicle(overrides: Partial<ScoringVehicleSnapshot> = {}): ScoringVehicleSnapshot {
  return {
    id: "v1",
    plate: "NL-01-TF",
    latitude: null,
    longitude: null,
    speedKmh: null,
    movementStatus: null,
    lastUpdate: null,
    ...overrides,
  };
}

function task(capacity?: {
  volume_m3?: number | null;
  weight_kg?: number | null;
  hazmat_classes?: string[];
}): ScoringTask {
  return {
    id: "t1",
    pickup: { lat: 52.0, lng: 4.5 },
    dropoff: { lat: 52.1, lng: 4.6 },
    constraints: capacity
      ? {
          capacity_required: {
            volume_m3: capacity.volume_m3 ?? null,
            weight_kg: capacity.weight_kg ?? null,
            hazmat_classes: capacity.hazmat_classes ?? [],
          },
          skill_required: [],
          extended: {
            direction: "outbound",
            location_type: "customer",
            time_window_start: null,
            time_window_end: null,
          },
        }
      : undefined,
  };
}

describe("cargoScorer (FEAT-020 Phase 1.2, Katman A)", () => {
  it("is an ActiveScorer (registry entegrasyonu)", () => {
    expect(cargoScorer.available).toBe(true);
  });

  it("1) gorev kisitsiz -> her arac eligible:true, value 1.0", () => {
    const detail = cargoScorer.score(vehicle(), task());
    expect(detail.eligible).toBe(true);
    expect(detail.value).toBe(1.0);
  });

  it("2) arac verisi yok (volume+weight null, hazmat bos) -> fallback eligible:true, value 1.0", () => {
    const v = vehicle({
      cargoCapacity: { volumeM3: null, weightKg: null, hazmatCertifiedClasses: [] },
    });
    const detail = cargoScorer.score(v, task({ volume_m3: 10, weight_kg: 500 }));
    expect(detail.eligible).toBe(true);
    expect(detail.value).toBe(1.0);
    expect(detail.memo).toMatch(/kapasite verisi yok/i);
  });

  it("3) hacim yetersiz -> eligible:false, value 0", () => {
    const v = vehicle({
      cargoCapacity: { volumeM3: 5, weightKg: 1000, hazmatCertifiedClasses: [] },
    });
    const detail = cargoScorer.score(v, task({ volume_m3: 10, weight_kg: 500 }));
    expect(detail.eligible).toBe(false);
    expect(detail.value).toBe(0);
  });

  it("4) agirlik yetersiz -> eligible:false, value 0", () => {
    const v = vehicle({
      cargoCapacity: { volumeM3: 20, weightKg: 300, hazmatCertifiedClasses: [] },
    });
    const detail = cargoScorer.score(v, task({ volume_m3: 10, weight_kg: 500 }));
    expect(detail.eligible).toBe(false);
    expect(detail.value).toBe(0);
  });

  it("5) hacim+agirlik yeterli, hazmat gerektirmiyor -> eligible:true, 0 < value <= 1", () => {
    const v = vehicle({
      cargoCapacity: { volumeM3: 20, weightKg: 1000, hazmatCertifiedClasses: [] },
    });
    const detail = cargoScorer.score(v, task({ volume_m3: 10, weight_kg: 500 }));
    expect(detail.eligible).toBe(true);
    expect(detail.value).toBeGreaterThan(0);
    expect(detail.value).toBeLessThanOrEqual(1);
  });

  it("6) hazmat gerekli + arac sertifikasiz -> eligible:false (hacim/agirlik yeterli olsa da)", () => {
    const v = vehicle({
      cargoCapacity: { volumeM3: 20, weightKg: 1000, hazmatCertifiedClasses: [] },
    });
    const detail = cargoScorer.score(v, task({ volume_m3: 10, weight_kg: 500, hazmat_classes: ["ADR3"] }));
    expect(detail.eligible).toBe(false);
    expect(detail.value).toBe(0);
  });

  it("7) hazmat gerekli + arac tam sertifikali -> eligible:true", () => {
    const v = vehicle({
      cargoCapacity: { volumeM3: 20, weightKg: 1000, hazmatCertifiedClasses: ["ADR3", "ADR8"] },
    });
    const detail = cargoScorer.score(v, task({ volume_m3: 10, weight_kg: 500, hazmat_classes: ["ADR3"] }));
    expect(detail.eligible).toBe(true);
  });

  it("8) hazmat gerekli + arac kismi sertifikali (bir sinif eksik) -> eligible:false", () => {
    const v = vehicle({
      cargoCapacity: { volumeM3: 20, weightKg: 1000, hazmatCertifiedClasses: ["ADR3"] },
    });
    const detail = cargoScorer.score(
      v,
      task({ volume_m3: 10, weight_kg: 500, hazmat_classes: ["ADR3", "ADR8"] })
    );
    expect(detail.eligible).toBe(false);
  });

  it("9) arac verisi YOK ama hazmat gerekiyor ve sertifika da yok -> hazmat gate once calisir, eligible:false", () => {
    const v = vehicle({
      cargoCapacity: { volumeM3: null, weightKg: null, hazmatCertifiedClasses: [] },
    });
    const detail = cargoScorer.score(v, task({ hazmat_classes: ["ADR3"] }));
    expect(detail.eligible).toBe(false);
    expect(detail.value).toBe(0);
  });

  it("cargoCapacity hic gelmemis (undefined, FN-3 kapanmadan hep bu durum) -> fallback eligible:true", () => {
    const v = vehicle(); // cargoCapacity undefined
    const detail = cargoScorer.score(v, task({ volume_m3: 10, weight_kg: 500 }));
    expect(detail.eligible).toBe(true);
    expect(detail.value).toBe(1.0);
  });
});
