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

export function UserProfileProvider({ children }: { children: ReactNode }) {
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
    try {
      localStorage.setItem(CONFIG.STORAGE_KEYS.USER_PROFILE, JSON.stringify(newProfile));
    } catch {}
  }, []);

  const updateProfile = useCallback(
    (updates: Partial<Pick<UserProfile, 'username' | 'avatar'>>) => {
      setProfile((prev) => {
        if (!prev) return prev;
        const updated = { ...prev, ...updates };
        try {
          localStorage.setItem(CONFIG.STORAGE_KEYS.USER_PROFILE, JSON.stringify(updated));
        } catch {}
        return updated;
      });
    },
    [],
  );

  const logout = useCallback(() => {
    setProfile(null);
    try {
      localStorage.removeItem(CONFIG.STORAGE_KEYS.USER_PROFILE);
    } catch {}
  }, []);

  return (
    <UserProfileContext.Provider
      value={{ profile, isLoggedIn: profile !== null, register, updateProfile, logout }}
    >
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile() {
  return useContext(UserProfileContext);
}
