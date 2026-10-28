import { NextRequest, NextResponse } from 'next/server';

import { getAppUrl } from '@/lib/app-url';
import { resolvePlatformSlugFromHost } from '@/lib/platform-resolve';

/**
 * Pantulan balik setelah SSO logout untuk Platform ber-custom domain (28 Okt
 * 2026). bagdja-login cuma mau redirect ke `*.bagdja.com`, jadi
 * `auth/logout/route.ts` mengarahkan `redirect_uri` ke route ini di host
 * tetap Bookpedia dengan `?to=<origin custom domain>`.
 *
 * `to` WAJIB divalidasi — tanpa itu route ini jadi open redirect. Hanya host
 * yang resolve ke Platform terdaftar (`resolvePlatformSlugFromHost`, resolver
 * yang sama dipakai middleware) yang diterima; selain itu fallback ke app URL
 * default. Path/query dari `to` sengaja dibuang, cukup origin-nya.
 */
async function resolveSafeReturnOrigin(to: string | null): Promise<string | null> {
  if (!to) return null;

  let url: URL;
  try {
    url = new URL(to);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;

  const slug = await resolvePlatformSlugFromHost(url.host);
  return slug ? url.origin : null;
}

export async function GET(request: NextRequest) {
  const target = await resolveSafeReturnOrigin(request.nextUrl.searchParams.get('to'));
  return NextResponse.redirect(target ?? getAppUrl());
}
