import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type TableDensity = "compact" | "comfortable";

export const DENSITY_STORAGE_KEY = "tf.density";

export const DENSITY_ROW_PX: Record<TableDensity, number> = {
  compact: 40,
  comfortable: 56,
};

function readStoredDensity(): TableDensity {
  try {
    const raw = window.localStorage.getItem(DENSITY_STORAGE_KEY);
    if (raw === "compact" || raw === "comfortable") return raw;
  } catch {
    /* private mode / SSR */
  }
  return "comfortable";
}

type DensityApi = {
  density: TableDensity;
  rowPx: number;
  setDensity: (next: TableDensity) => void;
  toggleDensity: () => void;
};

const DensityContext = createContext<DensityApi | null>(null);

function persistDensity(next: TableDensity): void {
  try {
    window.localStorage.setItem(DENSITY_STORAGE_KEY, next);
  } catch {
    /* private mode / SSR */
  }
}

export function DensityProvider({ children }: { children: ReactNode }) {
  const [density, setDensityState] = useState<TableDensity>(readStoredDensity);
  const setDensity = useCallback((next: TableDensity) => {
    persistDensity(next);
    setDensityState(next);
  }, []);
  const toggleDensity = useCallback(() => {
    setDensityState((prev) => {
      const next: TableDensity = prev === "compact" ? "comfortable" : "compact";
      persistDensity(next);
      return next;
    });
  }, []);
  const value = useMemo<DensityApi>(
    () => ({
      density,
      rowPx: DENSITY_ROW_PX[density],
      setDensity,
      toggleDensity,
    }),
    [density, setDensity, toggleDensity]
  );
  return createElement(DensityContext.Provider, { value }, children);
}

export function useDensity(): DensityApi {
  const ctx = useContext(DensityContext);
  if (ctx) return ctx;
  return {
    density: "comfortable",
    rowPx: DENSITY_ROW_PX.comfortable,
    setDensity: persistDensity,
    toggleDensity: () => persistDensity("compact"),
  };
}
