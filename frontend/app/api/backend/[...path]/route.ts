import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { internalApiUrl } from '@/lib/api';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function isCrossSiteMutation(request: NextRequest) {
  if (SAFE_METHODS.has(request.method)) return false;

  const origin = request.headers.get('origin');
  if (origin && origin !== request.nextUrl.origin) return true;

  return request.headers.get('sec-fetch-site') === 'cross-site';
}

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  if (isCrossSiteMutation(request)) {
    return NextResponse.json(
      { success: false, error: { code: 'CROSS_SITE_REQUEST_BLOCKED', message: 'Cross-site state-changing requests are not allowed' } },
      { status: 403 }
    );
  }

  const { path } = await context.params;
  const cookieStore = await cookies();
  const token = cookieStore.get('bookhaven_token')?.value;
  const target = `${internalApiUrl}/${path.map(encodeURIComponent).join('/')}${request.nextUrl.search}`;
  const headers = new Headers();
  const contentType = request.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);
  headers.set('accept', 'application/json');
  if (token) headers.set('authorization', `Bearer ${token}`);
  const body = ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer();

  try {
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body,
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000)
    });
    const responseHeaders = new Headers();
    const upstreamType = upstream.headers.get('content-type');
    if (upstreamType) responseHeaders.set('content-type', upstreamType);
    responseHeaders.set('cache-control', 'no-store');
    return new NextResponse(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'BACKEND_UNAVAILABLE', message: 'The BookHaven API is temporarily unavailable' } },
      { status: 503 }
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const PUT = proxy;
export const DELETE = proxy;
