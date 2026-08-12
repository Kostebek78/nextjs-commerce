export const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
export async function api(path: string, init: RequestInit = {}) {
  const r = await fetch(`${API}${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
    cache: 'no-store',
  });
  if (!r.ok) throw new Error((await r.text()).slice(0, 200));
  return r.json();
}
