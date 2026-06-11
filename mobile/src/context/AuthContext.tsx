import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import type { User } from '../types';

const TOKEN_STORAGE_KEY = '@ivory/accessToken';
const USER_STORAGE_KEY = '@ivory/user';

interface AuthContextValue {
  /** true while restoring the saved session from AsyncStorage (app boot). */
  restoring: boolean;
  token: string | null;
  user: User | null;
  login: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [restoring, setRestoring] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [storedToken, storedUser] = await Promise.all([
          AsyncStorage.getItem(TOKEN_STORAGE_KEY),
          AsyncStorage.getItem(USER_STORAGE_KEY),
        ]);
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser) as User);
        }
      } catch {
        // corrupted session: continue logged out
      } finally {
        setRestoring(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string) => {
    const { accessToken, user: loggedUser } = await api.login(email.trim());
    setToken(accessToken);
    setUser(loggedUser);
    await Promise.all([
      AsyncStorage.setItem(TOKEN_STORAGE_KEY, accessToken),
      AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(loggedUser)),
    ]);
  }, []);

  const logout = useCallback(async () => {
    setToken(null);
    setUser(null);
    await AsyncStorage.multiRemove([TOKEN_STORAGE_KEY, USER_STORAGE_KEY]);
  }, []);

  const value = useMemo(
    () => ({ restoring, token, user, login, logout }),
    [restoring, token, user, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>.');
  return context;
}
