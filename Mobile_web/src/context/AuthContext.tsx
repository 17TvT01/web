import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import { API_BASE_URL } from '@shared/config/env';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface AuthResult {
  success: boolean;
  message?: string;
}

interface AuthContextValue {
  user: User | null;
  initializing: boolean;
  login: (email: string, password: string) => Promise<AuthResult>;
  register: (name: string, email: string, password: string) => Promise<AuthResult>;
  logout: () => void;
}

const STORAGE_KEY = 'mobile_web_user';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const parseUser = (value: string | null): User | null => {
  if (!value) {
    return null;
  }
  try {
    return JSON.parse(value) as User;
  } catch {
    return null;
  }
};

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return null;
    }
    return parseUser(localStorage.getItem(STORAGE_KEY));
  });
  const [initializing, setInitializing] = useState<boolean>(true);

  useEffect(() => {
    setInitializing(false);
  }, []);

  const persistUser = useCallback((nextUser: User | null) => {
    setUser(nextUser);
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }
    if (nextUser) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      try {
        const response = await fetch(`${API_BASE_URL}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (!response.ok) {
          const message = typeof data?.error === 'string' ? data.error : 'Đăng nhập thất bại.';
          return { success: false, message };
        }
        const nextUser: User = {
          id: String(data.id ?? ''),
          name: data.name ?? 'Khách hàng',
          email: data.email ?? email,
          avatar: data.avatar
        };
        persistUser(nextUser);
        return { success: true };
      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Không thể kết nối tới máy chủ.'
        };
      }
    },
    [persistUser]
  );

  const register = useCallback(
    async (name: string, email: string, password: string): Promise<AuthResult> => {
      try {
        const response = await fetch(`${API_BASE_URL}/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password })
        });
        const data = await response.json();
        if (!response.ok) {
          const message = typeof data?.error === 'string' ? data.error : 'Đăng ký thất bại.';
          return { success: false, message };
        }
        return { success: true };
      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Không thể kết nối tới máy chủ.'
        };
      }
    },
    []
  );

  const logout = useCallback(() => {
    persistUser(null);
  }, [persistUser]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      initializing,
      login,
      register,
      logout
    }),
    [user, initializing, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth phải được sử dụng trong AuthProvider');
  }
  return context;
};
