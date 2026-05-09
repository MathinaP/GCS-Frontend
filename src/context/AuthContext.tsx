import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import api from '../lib/api';

interface AuthUser { id: number; name: string; email: string; }

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>(null!);

function loadStored(): { user: AuthUser | null; token: string | null } {
  const token = localStorage.getItem('gcs_token');
  const raw   = localStorage.getItem('gcs_user');
  const user  = raw ? (JSON.parse(raw) as AuthUser) : null;
  return { token, user };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const stored = loadStored();
  const [user,    setUser]  = useState<AuthUser | null>(stored.user);
  const [token,   setToken] = useState<string | null>(stored.token);
  const [loading, setLoading] = useState(!!stored.token); // only verify if we have a token

  useEffect(() => {
    if (!stored.token) return;
    api.defaults.headers.common['Authorization'] = `Bearer ${stored.token}`;
    api.get<AuthUser>('/me')
      .then(r => {
        setUser(r.data);
        localStorage.setItem('gcs_user', JSON.stringify(r.data));
      })
      .catch(() => {
        localStorage.removeItem('gcs_token');
        localStorage.removeItem('gcs_user');
        delete api.defaults.headers.common['Authorization'];
        setUser(null);
        setToken(null);
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function login(email: string, password: string) {
    const r = await api.post<{ token: string; user: AuthUser }>('/login', { email, password });
    localStorage.setItem('gcs_token', r.data.token);
    localStorage.setItem('gcs_user', JSON.stringify(r.data.user));
    api.defaults.headers.common['Authorization'] = `Bearer ${r.data.token}`;
    setToken(r.data.token);
    setUser(r.data.user);
  }

  async function logout() {
    try { await api.post('/logout'); } catch { /* ignore */ }
    localStorage.removeItem('gcs_token');
    localStorage.removeItem('gcs_user');
    delete api.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
