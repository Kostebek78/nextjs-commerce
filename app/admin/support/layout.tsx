import { isAdmin } from '@/app/api/support/auth/route';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function SupportAdminLayout({ children }: { children: React.ReactNode }) {
  const headers = await import('next/headers');
  const cookieStore = await headers.cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join('; ');

  const request = new Request('http://support.local/admin/support', {
    headers: { cookie: cookieHeader },
  });

  if (!isAdmin(request)) redirect('/admin/login');

  return children;
}
