"use client";

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const r = await fetch('/api/support/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });
      if (r.ok) {
        router.replace('/admin/support');
        router.refresh();
      } else {
        const d = await r.json().catch(() => ({}));
        setError(d.error || 'Giriş başarısız.');
      }
    } catch {
      setError('Giriş sırasında bağlantı hatası oluştu.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-4 py-8 text-neutral-900">
      <form onSubmit={submit} className="w-full max-w-md rounded-3xl bg-white p-8 text-neutral-900 shadow-2xl ring-1 ring-black/5">
        <div className="mb-8">
          <p className="text-sm font-semibold text-blue-600">Müşteri destek merkezi</p>
          <h1 className="mt-2 text-3xl font-bold text-neutral-950">Yetkili girişi</h1>
          <p className="mt-2 text-sm text-neutral-600">Canlı ziyaretçileri ve konuşmaları yönet.</p>
        </div>

        <label className="block text-sm font-semibold text-neutral-800">
          E-posta
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            autoComplete="username"
            className="mt-2 mb-4 block w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 caret-blue-600 outline-none placeholder:text-neutral-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            placeholder="admin@example.com"
            required
          />
        </label>

        <label className="block text-sm font-semibold text-neutral-800">
          Şifre
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="current-password"
            className="mt-2 mb-4 block w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 caret-blue-600 outline-none placeholder:text-neutral-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            placeholder="Şifrenizi girin"
            required
          />
        </label>

        {error && <p className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p>}
        <button disabled={loading} className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
          {loading ? 'Giriş yapılıyor...' : 'Panele gir'}
        </button>
      </form>
    </main>
  );
}
