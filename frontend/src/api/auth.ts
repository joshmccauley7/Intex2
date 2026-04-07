const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5254';

export interface AuthSession {
  isAuthenticated: boolean;
  userName: string | null;
  roles: string[];
}

const ANON: AuthSession = { isAuthenticated: false, userName: null, roles: [] };

async function authFetch(path: string, options?: RequestInit): Promise<Response> {
  return fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) },
    ...options,
  });
}

export async function getAuthSession(): Promise<AuthSession> {
  try {
    const res = await authFetch('/api/auth/me');
    if (!res.ok) return ANON;
    return res.json();
  } catch {
    return ANON;
  }
}

export async function loginUser(
  userName: string,
  password: string,
  rememberMe = false
): Promise<AuthSession> {
  const res = await authFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ userName, password, rememberMe }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message ?? 'Login failed.');
  }
  return res.json();
}

export async function logoutUser(): Promise<void> {
  await authFetch('/api/auth/logout', { method: 'POST' });
}
