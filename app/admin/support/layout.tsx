import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { isAdminRequest } from 'lib/support-auth';

export const dynamic = 'force-dynamic';

export default async function SupportAdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll().map((cookie) => `${cookie.name}=${cookie.value}`).join('; ');
  const request = new Request('http://support.local/admin/support', { headers: { cookie: cookieHeader } });

  if (!isAdminRequest(request)) redirect('/admin/login');
  return children;
}
