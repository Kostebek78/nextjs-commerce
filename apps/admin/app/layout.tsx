import './globals.css';
import Link from 'next/link';
export const metadata = { title: 'Temmuz Online Canlı Destek' };
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>
        <div className="layout">
          <aside className="side">
            <h2>Temmuz Destek</h2>
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/conversations">Konuşmalar</Link>
            <Link href="/visitors">Ziyaretçiler</Link>
            <Link href="/quick-replies">Hazır Cevaplar</Link>
            <Link href="/settings">Ayarlar</Link>
          </aside>
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
