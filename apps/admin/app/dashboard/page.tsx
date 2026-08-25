'use client';
import { useEffect, useState } from 'react';
import { api } from '../../src/api';

export default function Dashboard() {
  const [visitors, setVisitors] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  useEffect(() => {
    Promise.all([api('/visitors'), api('/conversations')]).then(([v, c]) => {
      setVisitors(v.visitors ?? []);
      setConversations(c.conversations ?? []);
    });
  }, []);
  const today = new Date().toDateString();
  const stats = [
    ['ONLINE VISITORS', visitors.filter((v) => v.online).length],
    ['OPEN CHATS', conversations.filter((c) => c.status === 'OPEN').length],
    ['WAITING', conversations.filter((c) => c.status === 'WAITING').length],
    ['TODAY', conversations.filter((c) => new Date(c.startedAt).toDateString() === today).length],
  ];
  return (
    <>
      <h1>Dashboard</h1>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))' }}>
        {stats.map((s) => (
          <div className="card stat" key={s[0]}>
            <b className="muted">{s[0]}</b>
            <h2>{s[1]}</h2>
          </div>
        ))}
      </div>
    </>
  );
}
