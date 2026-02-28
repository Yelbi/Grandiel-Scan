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

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<string[]>([]);

  // Cargar desde localStorage solo en el cliente
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CONFIG.STORAGE_KEYS.FAVORITES);
      if (stored) setFavorites(JSON.parse(stored) as string[]);
    } catch {
      // localStorage no disponible
    }
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
      try {
        localStorage.setItem(
          CONFIG.STORAGE_KEYS.FAVORITES,
          JSON.stringify(next),
        );
      } catch {}
      return next;
    });
  }, []);

  return (
    <FavoritesContext.Provider value={{ favorites, isFavorite, toggle }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavoritesContext() {
  return useContext(FavoritesContext);
}
