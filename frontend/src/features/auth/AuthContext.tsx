// Minimal auth state for routing. Full auth (login/signup/session) lands in Phase 4.
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Teacher } from '@/types';
import { api } from '@/lib/api/client';

interface AuthState {
  user: Teacher | null;
  loading: boolean;
  setUser: (u: Teacher | null) => void;
}

const AuthCtx = createContext<AuthState>({ user: null, loading: true, setUser: () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.me()
      .then(d => setUser(d.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  return <AuthCtx.Provider value={{ user, loading, setUser }}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  return useContext(AuthCtx);
}
