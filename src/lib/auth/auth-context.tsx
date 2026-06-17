"use client";

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

// --- Types ---

/** Safe user type (without password) — used by both client and server */
export type AppUser = {
  id: string;
  username: string;
  email: string;
};

type AuthState = {
  user: AppUser | null;
  isLoading: boolean;
};

type AuthAction =
  | { type: "SET_USER"; user: AppUser }
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

/** Maps a Supabase auth user to our app-level AppUser type. */
function mapUser(user: User): AppUser {
  return {
    id: user.id,
    username:
      (user.user_metadata?.username as string | undefined) ??
      user.email?.split("@")[0] ??
      "User",
    email: user.email ?? "",
  };
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

  // Restore session and subscribe to auth state changes
  useEffect(() => {
    const supabase = createClient();

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        dispatch({ type: "SET_USER", user: mapUser(session.user) });
      } else {
        dispatch({ type: "SET_LOADING", isLoading: false });
      }
    });

    // Subscribe to auth state changes (login, logout, token refresh, etc.)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        dispatch({ type: "SET_USER", user: mapUser(session.user) });
      } else {
        dispatch({ type: "CLEAR_USER" });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    dispatch({ type: "SET_LOADING", isLoading: true });

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        dispatch({ type: "SET_LOADING", isLoading: false });
        return { ok: false, error: error.message };
      }

      // onAuthStateChange will update the user state
      return { ok: true };
    } catch {
      dispatch({ type: "SET_LOADING", isLoading: false });
      return { ok: false, error: "Network error. Please try again." };
    }
  }, []);

  const register = useCallback(
    async (data: { username: string; email: string; password: string }) => {
      dispatch({ type: "SET_LOADING", isLoading: true });

      try {
        const supabase = createClient();
        const { error } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            data: { username: data.username },
          },
        });

        if (error) {
          dispatch({ type: "SET_LOADING", isLoading: false });
          return { ok: false, error: error.message };
        }

        // onAuthStateChange will update the user state if email confirmation
        // is disabled. If email confirmation is enabled, the user will need
        // to confirm their email before being logged in.
        return { ok: true };
      } catch {
        dispatch({ type: "SET_LOADING", isLoading: false });
        return { ok: false, error: "Network error. Please try again." };
      }
    },
    []
  );

  const logout = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    // onAuthStateChange will dispatch CLEAR_USER
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
