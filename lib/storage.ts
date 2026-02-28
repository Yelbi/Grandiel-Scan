'use client';

import { useCallback, useEffect, useState } from 'react';
import { CONFIG } from './config';
import type { HistoryEntry, ReadingMode, ReaderSettings } from './types';

const { STORAGE_KEYS } = CONFIG;

// ──────────────────────────────────────────────
// Generic hook
// ──────────────────────────────────────────────

function useLocalStorage<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const stored = localStorage.getItem(key);
      return stored !== null ? (JSON.parse(stored) as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const set = useCallback(
    (newValue: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved =
          typeof newValue === 'function'
            ? (newValue as (prev: T) => T)(prev)
            : newValue;
        try {
          localStorage.setItem(key, JSON.stringify(resolved));
        } catch (e) {
          console.error(`Error guardando en localStorage [${key}]:`, e);
        }
        return resolved;
      });
    },
    [key],
  );

  return [value, set] as const;
}

// ──────────────────────────────────────────────
// Favorites
// ──────────────────────────────────────────────

export function useFavorites() {
  const [favorites, setFavorites] = useLocalStorage<string[]>(
    STORAGE_KEYS.FAVORITES,
    [],
  );

  const isFavorite = useCallback(
    (mangaId: string) => favorites.includes(mangaId),
    [favorites],
  );

  const toggle = useCallback(
    (mangaId: string) => {
      setFavorites((prev) =>
        prev.includes(mangaId)
          ? prev.filter((id) => id !== mangaId)
          : [...prev, mangaId],
      );
    },
    [setFavorites],
  );

  return { favorites, isFavorite, toggle };
}

// ──────────────────────────────────────────────
// History
// ──────────────────────────────────────────────

export function useHistory() {
  const [history, setHistory] = useLocalStorage<HistoryEntry[]>(
    STORAGE_KEYS.HISTORY,
    [],
  );

  const addEntry = useCallback(
    (entry: HistoryEntry) => {
      setHistory((prev) => {
        const filtered = prev.filter((e) => e.mangaId !== entry.mangaId);
        return [entry, ...filtered].slice(0, CONFIG.PAGINATION.MAX_HISTORY_ITEMS);
      });
    },
    [setHistory],
  );

  const getLastRead = useCallback(
    (mangaId: string) => history.find((e) => e.mangaId === mangaId) ?? null,
    [history],
  );

  const clearHistory = useCallback(() => setHistory([]), [setHistory]);

  return { history, addEntry, getLastRead, clearHistory };
}

// ──────────────────────────────────────────────
// Theme
// ──────────────────────────────────────────────

export function useTheme() {
  const [theme, setTheme] = useLocalStorage<'dark' | 'light'>(
    STORAGE_KEYS.THEME,
    'dark',
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, [setTheme]);

  return { theme, setTheme, toggle };
}

// ──────────────────────────────────────────────
// Reading mode
// ──────────────────────────────────────────────

export function useReadingMode() {
  const [mode, setMode] = useLocalStorage<ReadingMode>(
    STORAGE_KEYS.READING_MODE,
    'paginated',
  );

  const toggle = useCallback(() => {
    setMode((prev) => (prev === 'paginated' ? 'continuous' : 'paginated'));
  }, [setMode]);

  return { mode, setMode, toggle };
}

// ──────────────────────────────────────────────
// Seen chapters (notifications)
// ──────────────────────────────────────────────

export function useSeenChapters() {
  const [seen, setSeen] = useLocalStorage<Record<string, number[]>>(
    STORAGE_KEYS.SEEN_CHAPTERS,
    {},
  );

  const markSeen = useCallback(
    (mangaId: string, chapter: number) => {
      setSeen((prev) => ({
        ...prev,
        [mangaId]: [...new Set([...(prev[mangaId] ?? []), chapter])],
      }));
    },
    [setSeen],
  );

  const isSeen = useCallback(
    (mangaId: string, chapter: number) =>
      (seen[mangaId] ?? []).includes(chapter),
    [seen],
  );

  const markAllSeen = useCallback(
    (mangaId: string, chapters: number[]) => {
      setSeen((prev) => ({ ...prev, [mangaId]: chapters }));
    },
    [setSeen],
  );

  return { seen, markSeen, isSeen, markAllSeen };
}

// ──────────────────────────────────────────────
// Reader settings
// ──────────────────────────────────────────────

const DEFAULT_READER_SETTINGS: ReaderSettings = {
  zoom: 100,
  brightness: 100,
  contrast: 100,
  fitMode: 'width',
  backgroundColor: '#000000',
};

export function useReaderSettings() {
  const [settings, setSettings] = useLocalStorage<ReaderSettings>(
    STORAGE_KEYS.READER_SETTINGS,
    DEFAULT_READER_SETTINGS,
  );

  const updateSetting = useCallback(
    <K extends keyof ReaderSettings>(key: K, value: ReaderSettings[K]) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
    },
    [setSettings],
  );

  const resetSettings = useCallback(
    () => setSettings(DEFAULT_READER_SETTINGS),
    [setSettings],
  );

  return { settings, updateSetting, resetSettings };
}

// ──────────────────────────────────────────────
// Search history
// ──────────────────────────────────────────────

export function useSearchHistory() {
  const [searchHistory, setSearchHistory] = useLocalStorage<string[]>(
    STORAGE_KEYS.SEARCH_HISTORY,
    [],
  );

  const addQuery = useCallback(
    (query: string) => {
      if (!query.trim()) return;
      setSearchHistory((prev) =>
        [query, ...prev.filter((q) => q !== query)].slice(
          0,
          CONFIG.PAGINATION.MAX_SEARCH_HISTORY,
        ),
      );
    },
    [setSearchHistory],
  );

  const clearSearchHistory = useCallback(
    () => setSearchHistory([]),
    [setSearchHistory],
  );

  return { searchHistory, addQuery, clearSearchHistory };
}
