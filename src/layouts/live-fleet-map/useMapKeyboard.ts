import { useEffect, type RefObject } from "react";

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

interface MapKeyboardOptions {
  searchRef: RefObject<HTMLInputElement>;
  panelOpen: boolean;
  helpOpen: boolean;
  onClosePanel: () => void;
  onFitFleet: () => void;
  onToggleFollow: () => void;
  onToggleHelp: () => void;
}

export function useMapKeyboard({
  searchRef,
  panelOpen,
  helpOpen,
  onClosePanel,
  onFitFleet,
  onToggleFollow,
  onToggleHelp,
}: MapKeyboardOptions): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === "Escape") {
        if (helpOpen) {
          onToggleHelp();
          return;
        }
        if (panelOpen) onClosePanel();
        return;
      }
      if (isTypingTarget(e.target)) return;
      if (e.key === "/" ) {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        onFitFleet();
        return;
      }
      if (e.key === "t" || e.key === "T") {
        e.preventDefault();
        onToggleFollow();
        return;
      }
      if (e.key === "?") {
        e.preventDefault();
        onToggleHelp();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    searchRef,
    panelOpen,
    helpOpen,
    onClosePanel,
    onFitFleet,
    onToggleFollow,
    onToggleHelp,
  ]);
}
