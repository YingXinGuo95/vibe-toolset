"use client";

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { User } from "./stub-users";

// --- Types ---

type AuthState = {
  user: User | null;
  isLoading: boolean;
};

type AuthAction =
  | { type: "SET_USER"; user: User }
  | { type: "CLEAR_USER" }
  | { type: "SET_LOADING"; isLoading: boolean };

type AuthResult = { ok: boolean; error?: string };

type AuthContextValue = AuthState & {
  login: (email: string, password: string) => Promise<AuthResult>;
  register: (data: {
    username: string;
    email: string;
    password: string;
  }) => Promise<AuthResult>;
  logout: () => void;
};

// --- Helpers ---

const SESSION_COOKIE = "session";

function parseUserFromCookie(): User | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]*)`)
  );
  if (!match) return null;
  try {
    const data = JSON.parse(decodeURIComponent(match[1]));
    if (data && data.id && data.email) return data as User;
  } catch {
    // invalid cookie payload
  }
  return null;
}

function clearSessionCookie() {
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

// --- Reducer ---

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "SET_USER":
      return { ...state, user: action.user, isLoading: false };
    case "CLEAR_USER":
      return { ...state, user: null, isLoading: false };
    case "SET_LOADING":
      return { ...state, isLoading: action.isLoading };
    default:
      return state;
  }
}

// --- Context ---

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, {
    user: null,
    isLoading: true,
  });

  // Restore session from cookie on mount
  useEffect(() => {
    const user = parseUserFromCookie();
    if (user) {
      dispatch({ type: "SET_USER", user });
    } else {
      dispatch({ type: "SET_LOADING", isLoading: false });
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    dispatch({ type: "SET_LOADING", isLoading: true });

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok && data.ok && data.user) {
        dispatch({ type: "SET_USER", user: data.user });
        return { ok: true };
      }

      dispatch({ type: "SET_LOADING", isLoading: false });
      return {
        ok: false,
        error: data.error ?? "errorInvalidCredentials",
      };
    } catch {
      dispatch({ type: "SET_LOADING", isLoading: false });
      return { ok: false, error: "Network error. Please try again." };
    }
  }, []);

  const register = useCallback(
    async (data: { username: string; email: string; password: string }) => {
      dispatch({ type: "SET_LOADING", isLoading: true });

      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        const result = await res.json();

        if (res.ok && result.ok && result.user) {
          dispatch({ type: "SET_USER", user: result.user });
          return { ok: true };
        }

        dispatch({ type: "SET_LOADING", isLoading: false });
        return { ok: false, error: result.error ?? "Registration failed" };
      } catch {
        dispatch({ type: "SET_LOADING", isLoading: false });
        return { ok: false, error: "Network error. Please try again." };
      }
    },
    []
  );

  const logout = useCallback(() => {
    clearSessionCookie();
    dispatch({ type: "CLEAR_USER" });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
