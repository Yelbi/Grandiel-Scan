'use client';

import type { ReactNode } from 'react';
import { ThemeProvider } from './ThemeProvider';
import { UserProfileProvider } from './UserProfileProvider';
import { FavoritesProvider } from './FavoritesProvider';
import { HistoryProvider } from './HistoryProvider';

export function Providers({ children }: { children: ReactNode }) {
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
