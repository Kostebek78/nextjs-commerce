import Link from 'next/link';
import { API } from '../../src/api';
export default async function Conversations() {
  const data = await fetch(`${API}/conversations`, { cache: 'no-store' })
    .then((r) => r.json())
    .catch(() => ({ conversations: [] }));
  return (
    <>
      <h1>Konuşmalar</h1>
      <div className="grid">
        {(data.conversations ?? []).map((c: any) => (
          <Link
            className="card"
            style={{ padding: 16, textDecoration: 'none', color: 'inherit' }}
            href={`/conversations/${c.id}`}
            key={c.id}
          >
            <b>{c.visitor?.productName ?? c.visitor?.currentTitle ?? c.visitor?.visitorId}</b>
            <p>{c.messages?.[0]?.message ?? 'Mesaj yok'}</p>
            <span>{c.status}</span>
          </Link>
        ))}
      </div>
    </>
  );
}
