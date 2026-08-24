import { NextRequest, NextResponse } from 'next/server';
import { internalApiUrl } from '@/lib/api';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const upstream = await fetch(`${internalApiUrl}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body, cache: 'no-store', signal: AbortSignal.timeout(10_000) });
    const payload = await upstream.json();
    if (!upstream.ok) return NextResponse.json(payload, { status: upstream.status });
    const response = NextResponse.json({ success: true, data: payload.data.user });
    response.cookies.set('bookhaven_token', payload.data.token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 7 });
    return response;
  } catch {
    return NextResponse.json({ success: false, error: { code: 'BACKEND_UNAVAILABLE', message: 'Sign in is temporarily unavailable' } }, { status: 503 });
  }
}
