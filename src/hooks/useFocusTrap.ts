"use client";

import { useEffect, useRef, useCallback } from "react";

const FOCUSABLE = "a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])";

export function useFocusTrap(active: boolean, initialFocusRef?: React.RefObject<HTMLElement>) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active || !containerRef.current) return;

    const el = containerRef.current;
    const focusables = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE));

    if (focusables.length === 0) return;

    // Initial focus: preferred element or first focusable
    const toFocus = initialFocusRef?.current ?? focusables[0];
    if (toFocus) {
      toFocus.focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    el.addEventListener("keydown", handleKeyDown);
    return () => el.removeEventListener("keydown", handleKeyDown);
  }, [active, initialFocusRef]);

  return containerRef;
}
