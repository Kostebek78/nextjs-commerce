export const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export function authToken() {
  if (typeof window === 'undefined') return undefined;
  return window.localStorage.getItem('temmuz_admin_token') ?? undefined;
}

export async function api(path: string, init: RequestInit = {}) {
  const token = authToken();
  const r = await fetch(`${API}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  });
  if (!r.ok) throw new Error((await r.text()).slice(0, 200));
  return r.json();
}
