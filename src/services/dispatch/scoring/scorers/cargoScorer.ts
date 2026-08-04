/**
 * KARGO UYUMU scorer — INACTIVE (backlog add-on task).
 *
 * Onayli karar (2026-07-20): draft task formu kargo gereksinimi
 * (capacity_required / hacim / agirlik / emisyon sinifi) TOPLAMIYOR —
 * eslesecek veri olmadan kargo skoru uretmek uydurma olur. Veri toplama isi
 * ayri bir backlog kalemi; o kalem + Phase 1.1 arac kapasite kolonlari
 * geldiginde bu scorer aktiflesecek.
 *
 * UX turu 04.08 (Cem): reason artik KULLANICI dilinde — teknik detay (Phase
 * 1.1 / migration) bu yorumda yasar, UI'da gosterilmez.
 */

import { InactiveScorer } from "../types";

export const cargoScorer: InactiveScorer = {
  id: "cargo",
  label: "Kargo",
  available: false,
  reason:
    "Kargo filtresi yakinda: arac kapasite ve yuk verisi toplanmaya " +
    "baslayinca bu siralama aktiflesecek.",
};
