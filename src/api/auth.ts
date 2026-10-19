/**
 * Typed access to every backend auth endpoint.
 *
 * The refresh token is also returned in the JSON body (the backend additionally
 * sets an httpOnly `refresh_token` cookie scoped to /auth). We keep it in memory
 * and send it explicitly on refresh/logout so both paths work.
 */
import type {
  AuthResponse,
  AuthUser,
  LoginInput,
  MessageResponse,
  RegisterInput,
} from '../types/auth';

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

type ApiConfig = {
  baseUrl: string;
  getAccessToken: () => string | null;
  getRefreshToken: () => string | null;
  /** Replaces the in-memory token pair after login/register/refresh. */
  onTokens: (accessToken: string, refreshToken: string) => void;
  /** Clears state after logout-all or when refresh fails. */
  onReset: () => void;
  /** Performs POST /auth/refresh, avoiding an import cycle with the store. */
  refresh: () => Promise<{ accessToken: string; refreshToken: string }>;
};

let config: ApiConfig;

export function configureApi(next: ApiConfig) {
  config = next;
}

function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  return fetch(`${config.baseUrl}${path}`, {
    credentials: 'include',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(config.getAccessToken()
        ? { Authorization: `Bearer ${config.getAccessToken()}` }
        : {}),
      ...init.headers,
    },
  }).then(async (res) => {
    const body = (await res.json().catch(() => null)) as
      | { message?: string | string[] }
      | null;
    if (!res.ok) {
      const message = Array.isArray(body?.message)
        ? body.message.join(', ')
        : (body?.message ?? `Request failed (${res.status})`);
      throw new ApiError(res.status, message);
    }
    return body as T;
  });
}

async function refreshOnce(): Promise<Response | null> {
  try {
    const tokens = await config.refresh();
    config.onTokens(tokens.accessToken, tokens.refreshToken);
    return null;
  } catch {
    config.onReset();
    // Make the caller rethrow its original error; nothing more to try.
    return null;
  }
}

/** Sends a request, and transparently retries once after refreshing on 401. */
async function authedRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  try {
    return await request<T>(path, init);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      await refreshOnce();
      if (!config.getAccessToken()) throw error;
      return request<T>(path, init);
    }
    throw error;
  }
}

// ---------- Endpoints ----------

export function register(dto: RegisterInput) {
  return authedRequest<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export function login(dto: LoginInput) {
  return authedRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export function refreshToken() {
  const body = config.getRefreshToken()
    ? JSON.stringify({ refreshToken: config.getRefreshToken() })
    : '{}';
  return request<{ accessToken: string; refreshToken: string }>('/auth/refresh', {
    method: 'POST',
    body,
  });
}

export function logout() {
  return authedRequest<MessageResponse>('/auth/logout', {
    method: 'POST',
    body: JSON.stringify(
      config.getRefreshToken() ? { refreshToken: config.getRefreshToken() } : {},
    ),
  });
}

export function logoutAll() {
  return authedRequest<MessageResponse>('/auth/logout-all', { method: 'POST' });
}

export function me() {
  return authedRequest<AuthUser>('/auth/me');
}

/** Full URL for starting the Google OAuth flow (plain redirect, no fetch). */
export function googleAuthUrl() {
  return `${config.baseUrl}/auth/google`;
}
