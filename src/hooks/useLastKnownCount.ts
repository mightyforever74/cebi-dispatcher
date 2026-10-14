import { useEffect, useRef, useState } from "react";

// D7-3 (7) (15 Eki 2026): DataTable yukleme sirasinda her zaman sabit 10
// (veya pageSize) satirlik skeleton gosteriyordu - orn. Drivers'da tipik
// olarak yalnizca ~4 kayit varken 10 satirlik iskelet, veri gelince
// goze batan bir CLS/sigrama yaratiyordu. Bu hook, bir listenin SON
// BASARILI yuklemesindeki kayit sayisini localStorage'a yazar; bir
// sonraki (soguk/yenilenmis) yuklemede, veri gelmeden once, skeleton
// o "son bilinen" sayida satir gosterir - sabit varsayilan yerine.
const PREFIX = "tf:lastCount:";

function readStoredCount(key: string): number | undefined {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (raw == null) return undefined;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  } catch {
    // localStorage erisilemez (gizli sekme/kota) - sessizce yok say.
    return undefined;
  }
}

/**
 * `key`: liste icin benzersiz bir ad (orn. "drivers", "vehicles").
 * `count`: mevcut render'daki GERCEK kayit sayisi (veri gelmediyse undefined).
 * `isLoading`: liste su an yukleniyor mu - true iken yazilmaz, yalnizca okunur.
 * Donen deger: skeleton satir sayisi icin kullanilacak "son bilinen" kayit
 * sayisi (hic bilinmiyorsa undefined - cagiran taraf kendi varsayilanina duser).
 */
export function useLastKnownCount(
  key: string,
  count: number | undefined,
  isLoading: boolean
): number | undefined {
  const [known, setKnown] = useState<number | undefined>(() => readStoredCount(key));
  const lastWritten = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (isLoading) return;
    if (count == null || count <= 0) return;
    if (lastWritten.current === count) return;
    lastWritten.current = count;
    setKnown(count);
    try {
      window.localStorage.setItem(PREFIX + key, String(count));
    } catch {
      // localStorage erisilemez (gizli sekme/kota) - sessizce yok say.
    }
  }, [key, count, isLoading]);

  return known;
}

export default useLastKnownCount;
