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

/* ─────────────────────────────────────────────────────────
   THEME
───────────────────────────────────────────────────────── */
type Theme = 'dark' | 'light';

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  toggle: () => {},
  setTheme: () => {},
});

export function useThemeContext() {
  return useContext(ThemeContext);
}

function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CONFIG.STORAGE_KEYS.THEME);
      if (stored === 'light' || stored === 'dark') setThemeState(stored);
    } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    try { localStorage.setItem(CONFIG.STORAGE_KEYS.THEME, t); } catch {}
  }, []);

  const toggle = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, toggle, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

/* ─────────────────────────────────────────────────────────
   USER PROFILE
───────────────────────────────────────────────────────── */
export interface UserProfile {
  id: string;
  username: string;
  avatar: string;
  createdAt: number;
}

interface UserProfileContextValue {
  profile: UserProfile | null;
  isLoggedIn: boolean;
  register: (username: string, avatar: string) => void;
  updateProfile: (updates: Partial<Pick<UserProfile, 'username' | 'avatar'>>) => void;
  logout: () => void;
}

const UserProfileContext = createContext<UserProfileContextValue>({
  profile: null,
  isLoggedIn: false,
  register: () => {},
  updateProfile: () => {},
  logout: () => {},
});

export function useUserProfile() {
  return useContext(UserProfileContext);
}

function UserProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_PROFILE);
      if (stored) setProfile(JSON.parse(stored) as UserProfile);
    } catch {}
  }, []);

  const register = useCallback((username: string, avatar: string) => {
    const newProfile: UserProfile = {
      id: `user_${Date.now()}`,
      username,
      avatar,
      createdAt: Date.now(),
    };
    setProfile(newProfile);
    try { localStorage.setItem(CONFIG.STORAGE_KEYS.USER_PROFILE, JSON.stringify(newProfile)); } catch {}
  }, []);

  const updateProfile = useCallback(
    (updates: Partial<Pick<UserProfile, 'username' | 'avatar'>>) => {
      setProfile((prev) => {
        if (!prev) return prev;
        const updated = { ...prev, ...updates };
        try { localStorage.setItem(CONFIG.STORAGE_KEYS.USER_PROFILE, JSON.stringify(updated)); } catch {}
        return updated;
      });
    },
    [],
  );

  const logout = useCallback(() => {
    setProfile(null);
    try { localStorage.removeItem(CONFIG.STORAGE_KEYS.USER_PROFILE); } catch {}
  }, []);

  return (
    <UserProfileContext.Provider
      value={{ profile, isLoggedIn: profile !== null, register, updateProfile, logout }}
    >
      {children}
    </UserProfileContext.Provider>
  );
}

/* ─────────────────────────────────────────────────────────
   FAVORITES
───────────────────────────────────────────────────────── */
interface FavoritesContextValue {
  favorites: string[];
  isFavorite: (mangaId: string) => boolean;
  toggle: (mangaId: string) => void;
}

const FavoritesContext = createContext<FavoritesContextValue>({
  favorites: [],
  isFavorite: () => false,
  toggle: () => {},
});

export function useFavoritesContext() {
  return useContext(FavoritesContext);
}

function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CONFIG.STORAGE_KEYS.FAVORITES);
      if (stored) setFavorites(JSON.parse(stored) as string[]);
    } catch {}
  }, []);

  const isFavorite = useCallback(
    (mangaId: string) => favorites.includes(mangaId),
    [favorites],
  );

  const toggle = useCallback((mangaId: string) => {
    setFavorites((prev) => {
      const next = prev.includes(mangaId)
        ? prev.filter((id) => id !== mangaId)
        : [...prev, mangaId];
      try { localStorage.setItem(CONFIG.STORAGE_KEYS.FAVORITES, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  return (
    <FavoritesContext.Provider value={{ favorites, isFavorite, toggle }}>
      {children}
    </FavoritesContext.Provider>
  );
}

/* ─────────────────────────────────────────────────────────
   HISTORY
───────────────────────────────────────────────────────── */
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

export function useHistoryContext() {
  return useContext(HistoryContext);
}

function HistoryProvider({ children }: { children: ReactNode }) {
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
      const next = [entry, ...filtered].slice(0, CONFIG.PAGINATION.MAX_HISTORY_ITEMS);
      try { localStorage.setItem(CONFIG.STORAGE_KEYS.HISTORY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const getLastRead = useCallback(
    (mangaId: string) => history.find((e) => e.mangaId === mangaId) ?? null,
    [history],
  );

  const clearHistory = useCallback(() => {
    setHistory([]);
    try { localStorage.removeItem(CONFIG.STORAGE_KEYS.HISTORY); } catch {}
  }, []);

  return (
    <HistoryContext.Provider value={{ history, addEntry, getLastRead, clearHistory }}>
      {children}
    </HistoryContext.Provider>
  );
}

/* ─────────────────────────────────────────────────────────
   ROOT PROVIDERS
───────────────────────────────────────────────────────── */
export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <UserProfileProvider>
        <FavoritesProvider>
          <HistoryProvider>
            {children}
          </HistoryProvider>
        </FavoritesProvider>
      </UserProfileProvider>
    </ThemeProvider>
  );
}
