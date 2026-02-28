'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { CONFIG } from '@/lib/config';
import type { HistoryEntry } from '@/lib/types';

interface HistoryContextValue {
  history: HistoryEntry[];
  addEntry: (entry: HistoryEntry) => void;
  getLastRead: (mangaId: string) => HistoryEntry | null;
  clearHistory: () => void;
}

const HistoryContext = createContext<HistoryContextValue>({
  history: [],
  addEntry: () => {},
  getLastRead: () => null,
  clearHistory: () => {},
});

export function HistoryProvider({ children }: { children: ReactNode }) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CONFIG.STORAGE_KEYS.HISTORY);
      if (stored) setHistory(JSON.parse(stored) as HistoryEntry[]);
    } catch {}
  }, []);

  const addEntry = useCallback((entry: HistoryEntry) => {
    setHistory((prev) => {
      const filtered = prev.filter((e) => e.mangaId !== entry.mangaId);
      const next = [entry, ...filtered].slice(
        0,
        CONFIG.PAGINATION.MAX_HISTORY_ITEMS,
      );
      try {
        localStorage.setItem(CONFIG.STORAGE_KEYS.HISTORY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const getLastRead = useCallback(
    (mangaId: string) => history.find((e) => e.mangaId === mangaId) ?? null,
    [history],
  );

  const clearHistory = useCallback(() => {
    setHistory([]);
    try {
      localStorage.removeItem(CONFIG.STORAGE_KEYS.HISTORY);
    } catch {}
  }, []);

  return (
    <HistoryContext.Provider value={{ history, addEntry, getLastRead, clearHistory }}>
      {children}
    </HistoryContext.Provider>
  );
}

export function useHistoryContext() {
  return useContext(HistoryContext);
}
