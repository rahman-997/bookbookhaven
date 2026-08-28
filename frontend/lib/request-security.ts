import type { NextRequest } from 'next/server';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function configuredSiteOrigin() {
  const value = process.env.NEXT_PUBLIC_SITE_URL;
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function isCrossSiteMutation(request: NextRequest) {
  if (SAFE_METHODS.has(request.method)) return false;

  const allowedOrigins = new Set([request.nextUrl.origin]);
  const configured = configuredSiteOrigin();
  if (configured) allowedOrigins.add(configured);

  const origin = request.headers.get('origin');
  if (origin) return !allowedOrigins.has(origin);

  return request.headers.get('sec-fetch-site') !== 'same-origin';
}

export function sessionMaxAgeSeconds(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 60 * 60;
  return Math.min(Math.floor(parsed), 60 * 60 * 24 * 30);
}
