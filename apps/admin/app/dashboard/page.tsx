import { API } from '../../src/api';
async function getData() {
  const [v, c] = await Promise.all([
    fetch(`${API}/visitors`, { cache: 'no-store', credentials: 'include' })
      .then((r) => r.json())
      .catch(() => ({ visitors: [] })),
    fetch(`${API}/conversations`, { cache: 'no-store', credentials: 'include' })
      .then((r) => r.json())
      .catch(() => ({ conversations: [] })),
  ]);
  return { visitors: v.visitors ?? [], conversations: c.conversations ?? [] };
}
export default async function Dashboard() {
  const d = await getData();
  const today = new Date().toDateString();
  const stats = [
    ['ONLINE VISITORS', d.visitors.filter((v: any) => v.online).length],
    ['OPEN CHATS', d.conversations.filter((c: any) => c.status === 'OPEN').length],
    ['WAITING', d.conversations.filter((c: any) => c.status === 'WAITING').length],
    [
      'TODAY',
      d.conversations.filter((c: any) => new Date(c.startedAt).toDateString() === today).length,
    ],
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
