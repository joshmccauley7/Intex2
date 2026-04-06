const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5254';

export async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE_URL}${path}`, options);
  if (!res.ok) throw new Error(`API error ${res.status}: ${res.statusText}`);
  return res.json();
}
