'use client';
import { useState } from 'react';
import { api } from '../../src/api';
export default function Login() {
  const [error, setError] = useState('');
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      const res = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: f.get('email'), password: f.get('password') }),
      });
      window.localStorage.setItem('temmuz_admin_token', res.token);
      location.href = '/dashboard';
    } catch {
      setError('Giriş başarısız');
    }
  }
  return (
    <div className="card" style={{ maxWidth: 420, margin: '8vh auto', padding: 28 }}>
      <h1>Temmuz Online Admin</h1>
      <form onSubmit={submit} className="grid">
        <input className="input" name="email" type="email" defaultValue="admin@temmuzonline.com" />
        <input className="input" name="password" type="password" defaultValue="TemmuzOnline!2026" />
        <button className="btn">Giriş yap</button>
        {error && <p>{error}</p>}
      </form>
    </div>
  );
}
