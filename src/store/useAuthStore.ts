import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AuthUser {
  [key: string]: unknown;
}

interface AuthStore {
  token: string | null;
  refreshToken: string | null;
  expiresAt: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithOAuth: (provider: "google" | "facebook" | "instagram") => Promise<void>;
  signUpRedirect: () => void;
  logout: () => void;
  refreshAuthState: () => void;
}

const AUTH_API_URL = (process.env.REACT_APP_AUTH_API_URL || "https://api.tulipfleet.com").replace(
  /\/+$/,
  ""
);
const STORAGE_KEY = "dispatcher-auth";

const isTokenValid = (expiresAt: string | null) => {
  return !!expiresAt && new Date(expiresAt) > new Date();
};

export const useAuthStore = create<AuthStore>()(
  persist<AuthStore>(
    (set): AuthStore => ({
      token: null,
      refreshToken: null,
      expiresAt: null,
      user: null,
      isAuthenticated: false,

      login: async (email, password) => {
        const endpoint = `${AUTH_API_URL}/api/auth/login`;
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(`Login failed: ${response.status} ${text}`);
        }

        const payload = await response.json();
        const { token, refreshToken, expiresIn, user } = payload as {
          token?: string;
          refreshToken?: string;
          expiresIn?: number;
          user?: AuthUser;
        };

        if (!token) {
          throw new Error("Login response did not return a token.");
        }

        const ttlSeconds = Number(expiresIn) > 0 ? Number(expiresIn) : 3600;
        const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

        set({
          token,
          refreshToken: refreshToken ?? null,
          expiresAt,
          user: user ?? null,
          isAuthenticated: true,
        });
      },

      loginWithOAuth: async (provider) => {
        const endpoint = `${AUTH_API_URL}/auth/oauth/${provider}`;
        try {
          const resp = await fetch(endpoint, { method: "GET" });
          if (resp.ok) {
            const payload = await resp.json();
            const { token, refreshToken, expiresIn, user } = payload as any;
            if (token && expiresIn) {
              const expiresAt = new Date(Date.now() + Number(expiresIn) * 1000).toISOString();
              set({
                token,
                refreshToken: refreshToken ?? null,
                expiresAt,
                user: user ?? null,
                isAuthenticated: true,
              });
              return;
            }
          }
        } catch {
          // network/CORS errors — fall through to simulated
        }

        // Fallback simulated token for dev
        const token = `sim-${provider}-token-${Math.random().toString(16).slice(2, 8)}`;
        const expiresIn = 3600;
        const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
        const user = { email: `oauth-${provider}@demo.tulipfleet.com`, name: `${provider} demo` } as AuthUser;
        set({ token, refreshToken: null, expiresAt, user, isAuthenticated: true });
      },

      signUpRedirect: () => {
        // kept for compatibility; sign-up UI handled in Basic component
      },

      logout: () =>
        set({
          token: null,
          refreshToken: null,
          expiresAt: null,
          user: null,
          isAuthenticated: false,
        }),

      refreshAuthState: () =>
        set((state) => ({
          isAuthenticated: !!state.token && isTokenValid(state.expiresAt),
        })),
    }),
    {
      name: STORAGE_KEY,
      getStorage: () => localStorage,
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const valid = !!state.token && isTokenValid(state.expiresAt);
        if (!valid) {
          state.token = null;
          state.refreshToken = null;
          state.expiresAt = null;
          state.user = null;
          state.isAuthenticated = false;
        } else {
          state.isAuthenticated = true;
        }
      },
    }
  )
);
