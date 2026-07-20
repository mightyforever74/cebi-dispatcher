/**
 * KARGO UYUMU scorer — INACTIVE (backlog add-on task).
 *
 * Onayli karar (2026-07-20): draft task formu kargo gereksinimi
 * (capacity_required / hacim / agirlik / emisyon sinifi) TOPLAMIYOR —
 * optimize/index.tsx submit payload'i yalnizca pickup/dropoff gonderiyor
 * (koddan kanitli). Eslesecek veri olmadan kargo skoru uretmek uydurma olur.
 * Veri toplama isi ayri bir backlog kalemi; o kalem + Phase 1.1 arac
 * kapasite kolonlari geldiginde bu scorer aktiflesecek.
 */

import { InactiveScorer } from "../types";

export const cargoScorer: InactiveScorer = {
  id: "cargo",
  label: "Kargo",
  available: false,
  reason:
    "Task formu henuz kargo gereksinimi (hacim/agirlik/emisyon) toplamiyor ve arac " +
    "kapasite kolonlari Phase 1.1 migration'ini bekliyor. Veri toplama, ayri bir " +
    "backlog kalemi olarak planlandi.",
};
