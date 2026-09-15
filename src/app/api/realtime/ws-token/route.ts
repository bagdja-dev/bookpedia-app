import { NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_BOOKPEDIA_API_URL ?? 'http://localhost:5020';

export async function GET() {
  try {
    const response = await fetch(`${API_BASE}/public/realtime/ws-token`, { cache: 'no-store' });
    if (!response.ok) {
      return NextResponse.json({ error: 'Realtime service unavailable' }, { status: response.status });
    }

    return NextResponse.json(await response.json());
  } catch (error) {
    console.error('[ws-token proxy] fetch failed:', error);
    return NextResponse.json({ error: 'Realtime service unavailable' }, { status: 502 });
  }
}
