const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5254';

export async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    cache: 'no-store',
    credentials: 'include',
    ...options,
  });
  if (res.status === 401) {
    const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/login?returnTo=${returnTo}`;
    throw new Error('API error 401: Unauthorized');
  }
  if (!res.ok) throw new Error(`API error ${res.status}: ${res.statusText}`);
  if (res.status === 204) return null;
  return res.json();
}
