import { NextResponse } from 'next/server';
import { internalApiUrl } from '@/lib/api';

export const dynamic = 'force-dynamic';

const noStoreHeaders = { 'Cache-Control': 'no-store, max-age=0' };

export async function GET() {
  try {
    const response = await fetch(`${internalApiUrl}/health/ready`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(4_000)
    });

    const backend = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        { status: 'degraded', frontend: 'ok', backend: backend ?? response.status },
        { status: 503, headers: noStoreHeaders }
      );
    }

    return NextResponse.json(
      { status: 'ok', frontend: 'ok', backend },
      { headers: noStoreHeaders }
    );
  } catch {
    return NextResponse.json(
      { status: 'degraded', frontend: 'ok', backend: 'unreachable' },
      { status: 503, headers: noStoreHeaders }
    );
  }
}
