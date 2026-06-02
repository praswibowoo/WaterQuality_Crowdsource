import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import axios from 'axios';

interface User {
  id: string;
  username: string;
  name?: string;
  role: string;
}

export interface LoginLogEntry {
  id: string;
  action: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (name: string, username: string, password: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  getLoginHistory: () => Promise<LoginLogEntry[]>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/auth/me`, {
          withCredentials: true,
        });
        setUser(response.data.user);
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    checkSession();
  }, []);

  const isAuthenticated = !!user;

  const login = useCallback(async (username: string, password: string) => {
    const response = await axios.post(
      `${API_BASE_URL}/auth/login`,
      { username, password },
      { withCredentials: true }
    );
    setUser(response.data.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await axios.post(
        `${API_BASE_URL}/auth/logout`,
        {},
        { withCredentials: true }
      );
    } catch {
      // Even if API call fails, clear local state
    }
    setUser(null);
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    await axios.post(
      `${API_BASE_URL}/auth/change-password`,
      { currentPassword, newPassword },
      { withCredentials: true }
    );
  }, []);

  const getLoginHistory = useCallback(async (): Promise<LoginLogEntry[]> => {
    const response = await axios.get(`${API_BASE_URL}/auth/login-history`, {
      withCredentials: true,
    });
    return response.data.logs;
  }, []);

  const register = useCallback(async (name: string, username: string, password: string) => {
    const response = await axios.post(
      `${API_BASE_URL}/auth/register`,
      { name, username, password },
      { withCredentials: true }
    );
    setUser(response.data.user);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, isLoading, login, logout, register, changePassword, getLoginHistory }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
