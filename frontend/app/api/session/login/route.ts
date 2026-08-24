import { NextRequest, NextResponse } from 'next/server';
import { internalApiUrl } from '@/lib/api';
import { isCrossSiteMutation, sessionMaxAgeSeconds } from '@/lib/request-security';

export async function POST(request: NextRequest) {
  if (isCrossSiteMutation(request)) {
    return NextResponse.json({ success: false, error: { code: 'CROSS_SITE_REQUEST_BLOCKED', message: 'Cross-site sign-in is not allowed' } }, { status: 403 });
  }

  try {
    const body = await request.text();
    const upstream = await fetch(`${internalApiUrl}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000)
    });
    const payload = await upstream.json();
    if (!upstream.ok) return NextResponse.json(payload, { status: upstream.status });
    const response = NextResponse.json({ success: true, data: payload.data.user });
    response.cookies.set('bookhaven_token', payload.data.token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: sessionMaxAgeSeconds(payload.data.expiresInSeconds)
    });
    return response;
  } catch {
    return NextResponse.json({ success: false, error: { code: 'BACKEND_UNAVAILABLE', message: 'Sign in is temporarily unavailable' } }, { status: 503 });
  }
}
