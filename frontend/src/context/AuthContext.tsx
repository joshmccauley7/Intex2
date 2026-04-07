import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getAuthSession, logoutUser, type AuthSession } from '../api/auth';

interface AuthContextValue {
  session: AuthSession;
  isAdmin: boolean;
  isLoading: boolean;
  refreshSession: () => Promise<void>;
  logout: () => Promise<void>;
}

const ANON: AuthSession = { isAuthenticated: false, userName: null, roles: [] };

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession>(ANON);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    const s = await getAuthSession();
    setSession(s);
    setIsLoading(false);
  }, []);

  const logout = useCallback(async () => {
    await logoutUser();
    setSession(ANON);
  }, []);

  useEffect(() => { refreshSession(); }, [refreshSession]);

  const isAdmin = session.isAuthenticated && session.roles.includes('admin');

  return (
    <AuthContext.Provider value={{ session, isAdmin, isLoading, refreshSession, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
