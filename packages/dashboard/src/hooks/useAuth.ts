import { useState, useCallback, createContext, useContext } from 'react';
import { login as apiLogin, register as apiRegister } from '../api/client';

const TOKEN_KEY = 'radiator_token';
const ORG_KEY = 'radiator_org_id';
const USER_KEY = 'radiator_user_id';

interface AuthState {
  token: string | null;
  orgId: string | null;
  login: (email: string, password: string) => Promise<any>;
  register: (email: string, password: string, orgName: string) => Promise<any>;
  logout: () => void;
}

export const AuthContext = createContext<AuthState | null>(null);

export function useAuthProvider(): AuthState {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem(TOKEN_KEY),
  );
  const [orgId, setOrgId] = useState<string | null>(
    () => localStorage.getItem(ORG_KEY),
  );

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiLogin(email, password);
    localStorage.setItem(TOKEN_KEY, res.token);
    localStorage.setItem(ORG_KEY, res.orgId);
    localStorage.setItem(USER_KEY, res.userId);
    setToken(res.token);
    setOrgId(res.orgId);
    return res;
  }, []);

  const register = useCallback(
    async (email: string, password: string, orgName: string) => {
      const res = await apiRegister(email, password, orgName);
      localStorage.setItem(TOKEN_KEY, res.token);
      localStorage.setItem(ORG_KEY, res.orgId);
      localStorage.setItem(USER_KEY, res.userId);
      setToken(res.token);
      setOrgId(res.orgId);
      return res;
    },
    [],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ORG_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setOrgId(null);
  }, []);

  return { token, orgId, login, register, logout };
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
