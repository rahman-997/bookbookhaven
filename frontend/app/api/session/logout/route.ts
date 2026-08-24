import { NextRequest, NextResponse } from 'next/server';
import { isCrossSiteMutation } from '@/lib/request-security';

export async function POST(request: NextRequest) {
  if (isCrossSiteMutation(request)) {
    return NextResponse.json({ success: false, error: { code: 'CROSS_SITE_REQUEST_BLOCKED', message: 'Cross-site sign-out is not allowed' } }, { status: 403 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set('bookhaven_token', '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0
  });
  return response;
}
