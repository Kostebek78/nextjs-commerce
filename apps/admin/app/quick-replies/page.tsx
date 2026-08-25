'use client';
import { useEffect, useState } from 'react';
import { api } from '../../src/api';
export default function QuickReplies() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    api('/quick-replies')
      .then((d) => setItems(d.quickReplies ?? []))
      .catch(() => {});
  }, []);
  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const r = await api('/quick-replies', {
      method: 'POST',
      body: JSON.stringify({ title: f.get('title'), message: f.get('message'), isActive: true }),
    });
    setItems([r.quickReply, ...items]);
    e.currentTarget.reset();
  }
  return (
    <>
      <h1>Hazır Cevaplar</h1>
      <form onSubmit={add} className="card grid" style={{ padding: 16 }}>
        <input className="input" name="title" placeholder="Başlık" />
        <textarea className="input" name="message" placeholder="Mesaj" />
        <button className="btn">Ekle</button>
      </form>
      <div className="grid" style={{ marginTop: 16 }}>
        {items.map((q) => (
          <div className="card" style={{ padding: 16 }} key={q.id}>
            <b>{q.title}</b>
            <p>{q.message}</p>
          </div>
        ))}
      </div>
    </>
  );
}
