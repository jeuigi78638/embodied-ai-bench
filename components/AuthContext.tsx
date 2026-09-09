"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export interface User {
  id: string;
  email: string;
  nickname: string;
}

interface AuthCtx {
  user: User | null;
  loading: boolean;
  authPrompt: boolean;
  promptLogin: () => void;
  dismissAuth: () => void;
  login: (email: string, password: string) => Promise<string | null>;
  register: (
    email: string,
    password: string,
    nickname: string
  ) => Promise<string | null>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setUser: (u: User | null) => void;
}

const Ctx = createContext<AuthCtx>({
  user: null,
  loading: true,
  authPrompt: false,
  promptLogin: () => {},
  dismissAuth: () => {},
  login: async () => null,
  register: async () => null,
  logout: async () => {},
  refresh: async () => {},
  setUser: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authPrompt, setAuthPrompt] = useState(false);

  const promptLogin = useCallback(() => setAuthPrompt(true), []);
  const dismissAuth = useCallback(() => setAuthPrompt(false), []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      const j = await res.json();
      setUser(j?.user ?? null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const j = await res.json();
      if (!j?.ok) return j?.error || "登录失败";
      setUser(j.user);
      return null;
    } catch {
      return "网络错误，请稍后重试";
    }
  }, []);

  const register = useCallback(
    async (email: string, password: string, nickname: string) => {
      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email, password, nickname }),
        });
        const j = await res.json();
        if (!j?.ok) return j?.error || "注册失败";
        setUser(j.user);
        return null;
      } catch {
        return "网络错误，请稍后重试";
      }
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* ignore */
    }
    setUser(null);
  }, []);

  return (
    <Ctx.Provider
      value={{ user, loading, authPrompt, promptLogin, dismissAuth, login, register, logout, refresh, setUser }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  return useContext(Ctx);
}
