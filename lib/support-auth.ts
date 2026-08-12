import { createHmac, timingSafeEqual } from 'node:crypto';

export const SUPPORT_ADMIN_COOKIE = 'support_admin';
const DEV_EMAIL = 'admin@example.com';
const DEV_PASSWORD = 'change-me-now';

export function getSupportAdminCredentials() {
  const email = process.env.SUPPORT_ADMIN_EMAIL;
  const password = process.env.SUPPORT_ADMIN_PASSWORD;
  if (email && password) return { email, password };
  if (process.env.NODE_ENV !== 'production') return { email: DEV_EMAIL, password: DEV_PASSWORD };
  return null;
}

function getSecret() {
  return process.env.SUPPORT_ADMIN_SECRET || (process.env.NODE_ENV !== 'production' ? 'change-this-support-secret' : '');
}

function sign(email: string) {
  return createHmac('sha256', getSecret()).update(email).digest('hex');
}

export function encodeAdminEmail(email: string) {
  return Buffer.from(email, 'utf8').toString('base64url');
}

function decodeAdminEmail(value: string) {
  try {
    return Buffer.from(value, 'base64url').toString('utf8');
  } catch {
    return '';
  }
}

export function createAdminSession(email: string) {
  return `${encodeAdminEmail(email)}.${sign(email)}`;
}

export function validAdminSession(value?: string) {
  if (!value || !getSecret()) return false;
  const separator = value.lastIndexOf('.');
  if (separator <= 0) return false;
  const email = decodeAdminEmail(value.slice(0, separator));
  const signature = value.slice(separator + 1);
  if (!email || !signature) return false;
  const expected = sign(email);
  return expected.length === signature.length && timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export function isAdminRequest(request: Request) {
  const cookie = request.headers.get('cookie')
    ?.split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${SUPPORT_ADMIN_COOKIE}=`))
    ?.slice(SUPPORT_ADMIN_COOKIE.length + 1);
  return validAdminSession(cookie);
}
