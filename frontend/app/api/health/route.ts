import { NextResponse } from 'next/server';
import { internalApiUrl } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const response = await fetch(`${internalApiUrl}/health`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(4_000)
    });

    if (!response.ok) {
      return NextResponse.json({ status: 'degraded', backend: response.status }, { status: 503 });
    }

    const backend = await response.json();
    return NextResponse.json({ status: 'ok', frontend: 'ok', backend });
  } catch {
    return NextResponse.json({ status: 'degraded', frontend: 'ok', backend: 'unreachable' }, { status: 503 });
  }
}
