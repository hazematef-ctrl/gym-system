import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import {
  ApiError,
  getCurrentUser,
  loginUser,
  logoutUser,
  type AuthUser,
} from "../../../services/api";

type Credentials = {
  phone: string;
  password: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authError: string | null;
  login: (credentials: Credentials) => Promise<AuthUser>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const authRevision = useRef(0);

  useEffect(() => {
    let isCurrent = true;
    const revision = authRevision.current;

    getCurrentUser()
      .then((currentUser) => {
        if (isCurrent && authRevision.current === revision) {
          setUser(currentUser);
          setAuthError(null);
        }
      })
      .catch((error: unknown) => {
        if (!isCurrent || authRevision.current !== revision) {
          return;
        }

        if (error instanceof ApiError && error.status === 401) {
          setUser(null);
          setAuthError(null);
          return;
        }

        setUser(null);
        setAuthError(
          error instanceof Error
            ? error.message
            : "Could not verify your session.",
        );
      })
      .finally(() => {
        if (isCurrent && authRevision.current === revision) {
          setIsLoading(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  const login = useCallback(async (credentials: Credentials) => {
    const authenticatedUser = await loginUser(credentials);
    authRevision.current += 1;
    setUser(authenticatedUser);
    setAuthError(null);
    setIsLoading(false);
    return authenticatedUser;
  }, []);

  const logout = useCallback(async () => {
    await logoutUser();
    authRevision.current += 1;
    setUser(null);
    setAuthError(null);
    setIsLoading(false);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: user !== null,
      isLoading,
      authError,
      login,
      logout,
    }),
    [user, isLoading, authError, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
