import { NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'node:crypto';

export const runtime = 'nodejs';

const cookieName = 'support_admin';
const DEV_EMAIL = 'admin@example.com';
const DEV_PASSWORD = 'change-me-now';

function getCredentials() {
  const email = process.env.SUPPORT_ADMIN_EMAIL;
  const password = process.env.SUPPORT_ADMIN_PASSWORD;

  if (email && password) return { email, password };

  if (process.env.NODE_ENV !== 'production') {
    return { email: DEV_EMAIL, password: DEV_PASSWORD };
  }

  return null;
}

function secret() {
  return process.env.SUPPORT_ADMIN_SECRET || (process.env.NODE_ENV !== 'production' ? 'change-this-support-secret' : '');
}

function sign(value: string) {
  return createHmac('sha256', secret()).update(value).digest('hex');
}

function encodeEmail(email: string) {
  return Buffer.from(email, 'utf8').toString('base64url');
}

function decodeEmail(value: string) {
  try {
    return Buffer.from(value, 'base64url').toString('utf8');
  } catch {
    return '';
  }
}

function validSession(value: string | undefined) {
  if (!value || !secret()) return false;
  const separator = value.lastIndexOf('.');
  if (separator <= 0) return false;
  const encodedEmail = value.slice(0, separator);
  const signature = value.slice(separator + 1);
  const email = decodeEmail(encodedEmail);
  if (!email || !signature) return false;
  const expected = sign(email);
  return expected.length === signature.length && timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export function isAdmin(request: Request) {
  const cookie = request.headers
    .get('cookie')
    ?.split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${cookieName}=`))
    ?.slice(cookieName.length + 1);

  return validSession(cookie);
}

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; password?: string };
  const credentials = getCredentials();

  if (!credentials || body.email !== credentials.email || body.password !== credentials.password) {
    return NextResponse.json({ error: 'E-posta veya şifre hatalı.' }, { status: 401 });
  }

  const value = `${encodeEmail(credentials.email)}.${sign(credentials.email)}`;
  const response = NextResponse.json({ ok: true });
  response.cookies.set(cookieName, value, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 8
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(cookieName, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0
  });
  return response;
}

export async function GET(request: Request) {
  return NextResponse.json({ authenticated: isAdmin(request) });
}
