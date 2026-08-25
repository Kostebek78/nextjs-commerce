'use client';
import { useEffect, useState } from 'react';
import { api } from '../../src/api';

export default function Visitors() {
  const [visitors, setVisitors] = useState<any[]>([]);
  useEffect(() => { api('/visitors').then((d) => setVisitors(d.visitors ?? [])); }, []);
  return (
    <>
      <h1>Canlı Ziyaretçiler</h1>
      <div className="grid">
        {visitors.map((v) => (
          <div className="card" style={{ padding: 16 }} key={v.id}>
            <b>{v.online ? '🟢' : '⚪'} {v.visitorId}</b>
            <p>{v.productName ?? v.currentTitle}</p>
            <p className="muted">{v.currentUrl}</p>
            <small>{v.deviceType} / {v.browser} / son aktivite {new Date(v.lastSeenAt).toLocaleString('tr-TR')}</small>
          </div>
        ))}
      </div>
    </>
  );
}
