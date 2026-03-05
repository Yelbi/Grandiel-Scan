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
import { createClient } from '@/lib/supabase/client';

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
  loading: boolean;
  register: (username: string, avatar: string, email: string) => Promise<{ error?: string }>;
  updateProfile: (updates: Partial<Pick<UserProfile, 'username' | 'avatar'>>) => Promise<void>;
  logout: () => Promise<void>;
}

const UserProfileContext = createContext<UserProfileContextValue>({
  profile:       null,
  isLoggedIn:    false,
  loading:       true,
  register:      async () => ({}),
  updateProfile: async () => {},
  logout:        async () => {},
});

export function useUserProfile() {
  return useContext(UserProfileContext);
}

function UserProfileProvider({ children }: { children: ReactNode }) {
  // useState con lazy initializer garantiza una sola instancia del cliente
  const [supabase] = useState(() => createClient());
  const [profile, setProfile]   = useState<UserProfile | null>(null);
  const [loading, setLoading]   = useState(true);

  const loadProfile = useCallback(async (
    userId: string,
    metadata?: Record<string, unknown>,
  ) => {
    const { data } = await supabase
      .from('users')
      .select('id, username, avatar, created_at')
      .eq('id', userId)
      .single();

    if (data) {
      setProfile({
        id:        data.id,
        username:  data.username,
        avatar:    data.avatar,
        createdAt: new Date(data.created_at).getTime(),
      });
      return;
    }

    // Fila no encontrada — crearla desde los metadatos del usuario de Supabase Auth.
    // Esto ocurre cuando el trigger SQL no está configurado en el proyecto.
    const username = (metadata?.username as string | undefined)?.trim();
    const avatar   = (metadata?.avatar  as string | undefined) ?? '/img/avatars/avatar1.svg';
    if (username) {
      const { data: newUser } = await supabase
        .from('users')
        .insert({ id: userId, username, avatar })
        .select('id, username, avatar, created_at')
        .single();
      if (newUser) {
        setProfile({
          id:        newUser.id,
          username:  newUser.username,
          avatar:    newUser.avatar,
          createdAt: new Date(newUser.created_at).getTime(),
        });
      }
    }
  }, [supabase]);

  useEffect(() => {
    // Comprobar sesión activa al montar
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        loadProfile(user.id, user.user_metadata).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Escuchar cambios de sesión (login / logout / token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          await loadProfile(session.user.id, session.user.user_metadata);
        } else {
          setProfile(null);
        }
      },
    );

    return () => subscription.unsubscribe();
  }, [supabase, loadProfile]);

  /**
   * Registra un usuario con email + magic link.
   * El trigger SQL de Supabase (5.4) crea la fila en public.users automáticamente.
   */
  const register = useCallback(
    async (username: string, avatar: string, email: string): Promise<{ error?: string }> => {
      const { error } = await supabase.auth.signUp({
        email,
        password: crypto.randomUUID(), // contraseña aleatoria — se usa magic link
        options: {
          data: { username, avatar },
          emailRedirectTo: `${window.location.origin}/api/auth/callback`,
        },
      });
      if (error) return { error: error.message };
      return {};
    },
    [supabase],
  );

  const updateProfile = useCallback(
    async (updates: Partial<Pick<UserProfile, 'username' | 'avatar'>>) => {
      if (!profile) return;
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', profile.id);
      if (!error) {
        setProfile((prev) => (prev ? { ...prev, ...updates } : prev));
      }
    },
    [profile, supabase],
  );

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, [supabase]);

  return (
    <UserProfileContext.Provider
      value={{ profile, isLoggedIn: !!profile, loading, register, updateProfile, logout }}
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
  favorites:  [],
  isFavorite: () => false,
  toggle:     () => {},
});

export function useFavoritesContext() {
  return useContext(FavoritesContext);
}

function FavoritesProvider({ children }: { children: ReactNode }) {
  const [supabase] = useState(() => createClient());
  const { profile } = useUserProfile();
  const [favorites, setFavorites] = useState<string[]>([]);

  // Recarga favoritos cuando cambia el estado de auth
  useEffect(() => {
    if (profile) {
      supabase
        .from('favorites')
        .select('manga_id')
        .eq('user_id', profile.id)
        .then(({ data }) => {
          setFavorites(data ? data.map((r: { manga_id: string }) => r.manga_id) : []);
        });
    } else {
      try {
        const stored = localStorage.getItem(CONFIG.STORAGE_KEYS.FAVORITES);
        setFavorites(stored ? (JSON.parse(stored) as string[]) : []);
      } catch { setFavorites([]); }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, supabase]);

  const isFavorite = useCallback(
    (mangaId: string) => favorites.includes(mangaId),
    [favorites],
  );

  // Actualización optimista: el estado local cambia de inmediato,
  // la BD se actualiza en segundo plano.
  const toggle = useCallback((mangaId: string) => {
    const isFav = favorites.includes(mangaId);
    const next = isFav
      ? favorites.filter((id) => id !== mangaId)
      : [...favorites, mangaId];

    setFavorites(next);

    if (profile) {
      if (isFav) {
        void supabase.from('favorites').delete()
          .eq('user_id', profile.id).eq('manga_id', mangaId);
      } else {
        void supabase.from('favorites').insert({ user_id: profile.id, manga_id: mangaId });
      }
    } else {
      try { localStorage.setItem(CONFIG.STORAGE_KEYS.FAVORITES, JSON.stringify(next)); } catch {}
    }
  }, [favorites, profile, supabase]);

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
  history:      [],
  addEntry:     () => {},
  getLastRead:  () => null,
  clearHistory: () => {},
});

export function useHistoryContext() {
  return useContext(HistoryContext);
}

function HistoryProvider({ children }: { children: ReactNode }) {
  const [supabase] = useState(() => createClient());
  const { profile } = useUserProfile();
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  // Recarga historial cuando cambia el estado de auth
  useEffect(() => {
    if (profile) {
      supabase
        .from('reading_history')
        .select('manga_id, chapter, page, updated_at, mangas(title)')
        .eq('user_id', profile.id)
        .order('updated_at', { ascending: false })
        .limit(CONFIG.PAGINATION.MAX_HISTORY_ITEMS)
        .then(({ data }) => {
          if (data) {
            setHistory(data.map((r) => ({
              mangaId:   r.manga_id as string,
              chapter:   r.chapter as number,
              page:      (r.page as number | null) ?? undefined,
              timestamp: new Date(r.updated_at as string).getTime(),
              title:     ((r.mangas as unknown) as { title: string } | null)?.title ?? (r.manga_id as string),
            })));
          }
        });
    } else {
      try {
        const stored = localStorage.getItem(CONFIG.STORAGE_KEYS.HISTORY);
        setHistory(stored ? (JSON.parse(stored) as HistoryEntry[]) : []);
      } catch { setHistory([]); }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, supabase]);

  const addEntry = useCallback((entry: HistoryEntry) => {
    // Actualización optimista del estado local
    setHistory((prev) => {
      const filtered = prev.filter((e) => e.mangaId !== entry.mangaId);
      const next = [entry, ...filtered].slice(0, CONFIG.PAGINATION.MAX_HISTORY_ITEMS);
      if (!profile) {
        try { localStorage.setItem(CONFIG.STORAGE_KEYS.HISTORY, JSON.stringify(next)); } catch {}
      }
      return next;
    });

    if (profile) {
      // Upsert: borrar la entrada anterior y crear una nueva
      void supabase.from('reading_history').delete()
        .eq('user_id', profile.id).eq('manga_id', entry.mangaId)
        .then(() => supabase.from('reading_history').insert({
          user_id:  profile.id,
          manga_id: entry.mangaId,
          chapter:  entry.chapter,
          page:     entry.page ?? 1,
        }));
    }
  }, [profile, supabase]);

  const getLastRead = useCallback(
    (mangaId: string) => history.find((e) => e.mangaId === mangaId) ?? null,
    [history],
  );

  const clearHistory = useCallback(() => {
    setHistory([]);
    if (profile) {
      void supabase.from('reading_history').delete().eq('user_id', profile.id);
    } else {
      try { localStorage.removeItem(CONFIG.STORAGE_KEYS.HISTORY); } catch {}
    }
  }, [profile, supabase]);

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
