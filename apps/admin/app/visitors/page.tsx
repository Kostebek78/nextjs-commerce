import { API } from '../../src/api';
export default async function Visitors() {
  const data = await fetch(`${API}/visitors`, { cache: 'no-store' })
    .then((r) => r.json())
    .catch(() => ({ visitors: [] }));
  return (
    <>
      <h1>Canlı Ziyaretçiler</h1>
      <div className="grid">
        {(data.visitors ?? []).map((v: any) => (
          <div className="card" style={{ padding: 16 }} key={v.id}>
            <b>
              {v.online ? '🟢' : '⚪'} {v.visitorId}
            </b>
            <p>{v.productName ?? v.currentTitle}</p>
            <p className="muted">{v.currentUrl}</p>
            <small>
              {v.deviceType} / {v.browser} / son aktivite{' '}
              {new Date(v.lastSeenAt).toLocaleString('tr-TR')}
            </small>
          </div>
        ))}
      </div>
    </>
  );
}
