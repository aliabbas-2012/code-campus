'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'code-campus-editor-font-size';
const DEFAULT_FONT_SIZE = 14;
const MIN_FONT_SIZE = 10;
const MAX_FONT_SIZE = 28;
const STEP = 2;

function clamp(value: number): number {
  return Math.min(Math.max(value, MIN_FONT_SIZE), MAX_FONT_SIZE);
}

function readStoredFontSize(): number {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? Number(stored) : NaN;
    if (!Number.isNaN(parsed)) return clamp(parsed);
  } catch {
    // localStorage can throw in private-browsing/blocked-storage contexts — fall through.
  }
  return DEFAULT_FONT_SIZE;
}

/** Persists the Monaco code editor's font size to localStorage (shared across every project —
 * a size someone picks once should stick everywhere, same as the light/dark theme preference). */
export function useEditorFontSize(): {
  fontSize: number;
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
  resetFontSize: () => void;
} {
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE);

  useEffect(() => {
    queueMicrotask(() => setFontSize(readStoredFontSize()));
  }, []);

  const persist = useCallback((value: number) => {
    setFontSize(value);
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      // Best-effort persistence only.
    }
  }, []);

  const increaseFontSize = useCallback(() => {
    setFontSize((prev) => {
      const next = clamp(prev + STEP);
      persist(next);
      return next;
    });
  }, [persist]);

  const decreaseFontSize = useCallback(() => {
    setFontSize((prev) => {
      const next = clamp(prev - STEP);
      persist(next);
      return next;
    });
  }, [persist]);

  const resetFontSize = useCallback(() => {
    persist(DEFAULT_FONT_SIZE);
  }, [persist]);

  return { fontSize, increaseFontSize, decreaseFontSize, resetFontSize };
}
