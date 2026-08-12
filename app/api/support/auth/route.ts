import { NextResponse } from 'next/server';
import { createAdminSession, getSupportAdminCredentials, SUPPORT_ADMIN_COOKIE, isAdminRequest } from 'lib/support-auth';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; password?: string };
  const credentials = getSupportAdminCredentials();

  if (!credentials || body.email !== credentials.email || body.password !== credentials.password) {
    return NextResponse.json({ error: 'E-posta veya şifre hatalı.' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SUPPORT_ADMIN_COOKIE, createAdminSession(credentials.email), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 8,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SUPPORT_ADMIN_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  return response;
}

export async function GET(request: Request) {
  return NextResponse.json({ authenticated: isAdminRequest(request) });
}
