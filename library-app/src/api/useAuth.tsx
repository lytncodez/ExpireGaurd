import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, errorMessage, getToken, setToken, UNAUTHORIZED_EVENT } from './client';

export type Role = 'admin' | 'dispenser';

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
}

interface ApiUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

interface TokenResponse {
  access_token: string;
  user: ApiUser;
}

type Result = { success: boolean; error?: string };

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<Result>;
  signup: (name: string, email: string, password: string) => Promise<Result>;
  logout: () => void;
  /** Re-reads the signed-in user (e.g. after an admin changes their own role in Settings). */
  updateUserRole: (email: string, role: Role) => void;
  refreshUser: () => Promise<void>;
  forgotPassword: (email: string) => Promise<Result & { resetToken?: string }>;
  resetPassword: (token: string, newPassword: string) => Promise<Result>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const USER_KEY = 'expireguard_user'; // cached profile for an instant first paint; the server stays the authority

function toUser(u: ApiUser): User {
  return { id: u.id, name: u.name, email: u.email, role: u.role === 'admin' ? 'admin' : 'dispenser' };
}

function cachedUser(): User | null {
  if (!getToken()) return null;
  try {
    const saved = localStorage.getItem(USER_KEY);
    return saved ? (JSON.parse(saved) as User) : null;
  } catch {
    return null;
  }
}

function remember(user: User | null) {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  } catch {
    /* storage disabled */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(cachedUser);
  const [isLoading, setIsLoading] = useState(false);

  const applyUser = useCallback((next: User | null) => {
    setUser(next);
    remember(next);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!getToken()) {
      applyUser(null);
      return;
    }
    try {
      applyUser(toUser(await api<ApiUser>('/auth/me')));
    } catch {
      // 401 clears the token in the client; any other failure keeps the cached session for now
      if (!getToken()) applyUser(null);
    }
  }, [applyUser]);

  // Validate a stored session on load, and sign out whenever the server rejects the token.
  useEffect(() => {
    void refreshUser();
    const onUnauthorized = () => applyUser(null);
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, [refreshUser, applyUser]);

  const startSession = (data: TokenResponse) => {
    setToken(data.access_token);
    applyUser(toUser(data.user));
  };

  const login = async (email: string, password: string): Promise<Result> => {
    setIsLoading(true);
    try {
      startSession(await api<TokenResponse>('/auth/login', { method: 'POST', body: { email: email.trim(), password } }));
      return { success: true };
    } catch (err) {
      return { success: false, error: errorMessage(err) };
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (name: string, email: string, password: string): Promise<Result> => {
    setIsLoading(true);
    try {
      startSession(await api<TokenResponse>('/auth/register', {
        method: 'POST',
        body: { name: name.trim(), email: email.trim(), password },
      }));
      return { success: true };
    } catch (err) {
      return { success: false, error: errorMessage(err) };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    if (getToken()) void api('/auth/logout', { method: 'POST' }).catch(() => undefined);
    setToken(null);
    applyUser(null);
  };

  const updateUserRole = (email: string, _role: Role) => {
    if (user && user.email.toLowerCase() === email.toLowerCase()) void refreshUser();
  };

  const forgotPassword = async (email: string): Promise<Result & { resetToken?: string }> => {
    setIsLoading(true);
    try {
      const data = await api<{ message: string; reset_token?: string | null }>('/auth/forgot-password', {
        method: 'POST',
        body: { email: email.trim() },
      });
      return { success: true, resetToken: data.reset_token ?? undefined };
    } catch (err) {
      return { success: false, error: errorMessage(err) };
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (token: string, newPassword: string): Promise<Result> => {
    setIsLoading(true);
    try {
      await api('/auth/reset-password', { method: 'POST', body: { token: token.trim(), new_password: newPassword } });
      return { success: true };
    } catch (err) {
      return { success: false, error: errorMessage(err) };
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        logout,
        updateUserRole,
        refreshUser,
        forgotPassword,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
