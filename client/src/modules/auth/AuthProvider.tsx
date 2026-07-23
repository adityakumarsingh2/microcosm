import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { apiRequest } from "../../shared/api/api-client";
import { AuthUser, loginUser, registerUser } from "./auth.api";

type AuthState = {
  user: AuthUser | null;
  accessToken: string | null;
  isBootstrapping: boolean;
  isAuthenticated: boolean;
  login: (input: { email: string; password: string }) => Promise<void>;
  register: (input: { name: string; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
};

type AuthResponse = {
  success: true;
  data: {
    user: AuthUser;
    accessToken: string;
  };
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function bootstrapSession() {
      try {
        const response = await apiRequest<AuthResponse>("/auth/refresh", {
          method: "POST",
        });

        if (!isMounted) return;
        setUser(response.data.user);
        setAccessToken(response.data.accessToken);
      } catch {
        if (!isMounted) return;
        setUser(null);
        setAccessToken(null);
      } finally {
        if (isMounted) {
          setIsBootstrapping(false);
        }
      }
    }

    void bootstrapSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      accessToken,
      isBootstrapping,
      isAuthenticated: Boolean(user && accessToken),
      async login(input) {
        const response = await loginUser(input);
        setUser(response.data.user);
        setAccessToken(response.data.accessToken);
      },
      async register(input) {
        const response = await registerUser(input);
        setUser(response.data.user);
        setAccessToken(response.data.accessToken);
      },
      async logout() {
        await apiRequest("/auth/logout", { method: "POST" }).catch(() => null);
        setUser(null);
        setAccessToken(null);
      },
    }),
    [accessToken, isBootstrapping, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
