import { create } from 'zustand';
import * as api from '../api/auth';
import type { AuthUser, LoginInput, RegisterInput } from '../types/auth';

interface AuthState {
  user: AuthUser | null;
  /** In-memory only: lost on reload, silently restored via the refresh cookie. */
  accessToken: string | null;
  refreshToken: string | null;
  status: 'idle' | 'loading' | 'authenticated' | 'error';
  error: string | null;

  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  bootstrap: () => Promise<void>;
  /** Consumes the accessToken handed back by the Google callback redirect. */
  completeGoogleLogin: (accessToken: string) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => {
  const setTokens = (accessToken: string, refreshToken: string) =>
    set({ accessToken, refreshToken, error: null });

  const reset = () =>
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      status: 'idle',
      error: null,
    });

  api.configureApi({
    baseUrl: import.meta.env.VITE_API_URL ?? '/api',
    getAccessToken: () => get().accessToken,
    getRefreshToken: () => get().refreshToken,
    onTokens: setTokens,
    onReset: reset,
    refresh: api.refreshToken,
  });

  const applyAuth = (res: { user: AuthUser; accessToken: string; refreshToken: string }) => {
    setTokens(res.accessToken, res.refreshToken);
    set({ user: res.user, status: 'authenticated' });
  };

  return {
    user: null,
    accessToken: null,
    refreshToken: null,
    status: 'idle',
    error: null,

    async login(input) {
      set({ status: 'loading', error: null });
      try {
        applyAuth(await api.login(input));
      } catch (error) {
        set({ status: 'error', error: toMessage(error) });
        throw error;
      }
    },

    async register(input) {
      set({ status: 'loading', error: null });
      try {
        applyAuth(await api.register(input));
      } catch (error) {
        set({ status: 'error', error: toMessage(error) });
        throw error;
      }
    },

    /** Called on app mount: silently re-authenticate from the refresh cookie. */
    async bootstrap() {
      const refresh = get().refreshToken;
      if (get().status === 'loading' || (!refresh && get().user)) return;
      set({ status: 'loading', error: null });
      try {
        const tokens = await api.refreshToken();
        setTokens(tokens.accessToken, tokens.refreshToken);
        const user = await api.me();
        set({ user, status: 'authenticated' });
      } catch {
        reset();
      }
    },

    async completeGoogleLogin(accessToken) {
      set({ status: 'loading', error: null });
      try {
        // The Google callback already set a fresh refresh cookie; rotate it
        // once so the store also holds its own token pair in memory.
        const tokens = await api.refreshToken();
        setTokens(tokens.accessToken, tokens.refreshToken);
        const user = await api.me();
        set({ user, status: 'authenticated' });
      } catch {
        // Fallback: use the access token passed via the redirect URL.
        if (!accessToken) {
          reset();
          return;
        }
        set({ accessToken });
        try {
          const user = await api.me();
          set({ user, status: 'authenticated', error: null });
        } catch {
          reset();
        }
      }
    },

    async logout() {
      try {
        await api.logout();
      } finally {
        reset();
      }
    },

    async logoutAll() {
      try {
        await api.logoutAll();
      } finally {
        reset();
      }
    },

    setUser: (user) => set({ user }),
  };
});

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong';
}
