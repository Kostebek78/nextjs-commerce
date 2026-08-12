'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '../../src/api';

export default function Conversations() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { api('/conversations').then((d) => setItems(d.conversations ?? [])); }, []);
  return (
    <>
      <h1>Konuşmalar</h1>
      <div className="grid">
        {items.map((c) => (
          <Link className="card" style={{ padding: 16, textDecoration: 'none', color: 'inherit' }} href={`/conversations/${c.id}`} key={c.id}>
            <b>{c.visitor?.productName ?? c.visitor?.currentTitle ?? c.visitor?.visitorId}</b>
            <p>{c.messages?.[0]?.message ?? 'Mesaj yok'}</p>
            <span>{c.status}</span>
          </Link>
        ))}
      </div>
    </>
  );
}
