import { NextRequest, NextResponse } from 'next/server';

import { backendFetch } from '@/lib/backend-api';
import { PLATFORM_SLUG_HEADER } from '@/lib/platform-slug-header';
import { resolvePlatformSlugFromHost } from '@/lib/platform-resolve';

type RouteContext = { params: Promise<{ path: string[] }> };

function buildPath(segments: string[], searchParams: URLSearchParams): string {
  const path = '/' + segments.join('/');
  const qs = searchParams.toString();
  return qs ? `${path}?${qs}` : path;
}

/**
 * Resolve slug Platform untuk request ini.
 *
 * Prioritas: header internal yang sudah dipasang `middleware.ts`. Kalau tidak
 * ada (mis. matcher middleware tidak jalan untuk host/route tertentu, atau
 * middleware di-skip), JANGAN diteruskan kosong ke API — resolve ulang dari
 * Host request. Header kosong dulu berujung API jatuh ke lookup tanpa filter
 * platform (bug: Studio `bizact` menampilkan Library `novello`).
 */
async function resolvePlatformSlug(request: NextRequest): Promise<string | null> {
  const fromHeader = request.headers.get(PLATFORM_SLUG_HEADER);
  if (fromHeader) return fromHeader;

  const slug = await resolvePlatformSlugFromHost(request.headers.get('host'));
  if (!slug) {
    console.warn(
      `[proxy] Tidak bisa me-resolve Platform dari Host "${request.headers.get('host') ?? ''}" — request diteruskan tanpa ${PLATFORM_SLUG_HEADER}; endpoint Studio akan menolak (400).`,
    );
  }
  return slug;
}

async function proxyRequest(request: NextRequest, context: RouteContext) {
  const { path: segments } = await context.params;
  const path = buildPath(segments, request.nextUrl.searchParams);
  const method = request.method;

  const options: RequestInit = { method };

  if (method !== 'GET' && method !== 'HEAD') {
    const body = await request.text();
    if (body) options.body = body;
  }

  // Forward internal platform-slug header ke API supaya backend bisa scope
  // data per-Platform (mis. libraries, books).
  const headers: Record<string, string> = {};
  const platformSlug = await resolvePlatformSlug(request);
  if (platformSlug) {
    headers[PLATFORM_SLUG_HEADER] = platformSlug;
  }
  options.headers = headers;

  const result = await backendFetch(path, options);

  if (result.status === 401) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  if (!result.data && result.status >= 400) {
    return NextResponse.json(
      { error: result.error ?? 'Request failed' },
      { status: result.status },
    );
  }

  if (result.status === 204) {
    return new NextResponse(null, { status: 204 });
  }

  return NextResponse.json(result.data, { status: result.status });
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PATCH = proxyRequest;
export const PUT = proxyRequest;
export const DELETE = proxyRequest;
