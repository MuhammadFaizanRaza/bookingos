'use client';

import * as React from 'react';
import { api, tokenStore } from '@/lib/api';
import type { AuthResponse, AuthUser } from '@/lib/types';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setSession: (res: AuthResponse) => void;
  logout: () => void;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const token = tokenStore.get();
    if (!token) {
      setIsLoading(false);
      return;
    }
    api.auth
      .me()
      .then((u) => setUser(u))
      .catch(() => {
        // Token invalid/expired or API offline — keep app usable in demo.
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const setSession = React.useCallback((res: AuthResponse) => {
    tokenStore.set(res.accessToken, res.refreshToken);
    setUser(res.user);
  }, []);

  const logout = React.useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  const value = React.useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      setSession,
      logout,
    }),
    [user, isLoading, setSession, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
