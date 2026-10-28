import { NextRequest, NextResponse } from 'next/server';

import { clearSession } from '@/lib/session';
import { buildSsoLogoutUrl, getAppUrl } from '@/lib/app-url';
import { resolveOrigin } from '@/lib/resolve-origin';

/**
 * Host yang diterima `isValidRedirectUrl()` bagdja-login sebagai
 * `redirect_uri` logout: `*.bagdja.com`, `bagdja.com`, localhost. Custom
 * domain Platform (mis. `novello.id`) DITOLAK di sana, lalu bagdja-login
 * fallback ke root `login.bagdja.com` — user login ulang tanpa konteks app
 * dan berakhir di layar "select application" (bug nyata, 28 Okt 2026).
 */
function isAcceptedBySsoLogout(origin: string): boolean {
  const hostname = new URL(origin).hostname.toLowerCase();
  return (
    hostname === 'bagdja.com' ||
    hostname.endsWith('.bagdja.com') ||
    hostname === 'localhost' ||
    hostname === '127.0.0.1'
  );
}

export async function GET(request: NextRequest) {
  await clearSession();

  // Redirect to Bagdja Login SSO logout so the shared session cookie
  // (bagdja_auth_token) is cleared — otherwise the next login skips the form.
  // `returnTo` = origin request ini (§4.2, 11 Sep 2026 — sebelumnya selalu
  // NEXT_PUBLIC_APP_URL tunggal, sekarang bounce balik ke subdomain Platform
  // tempat user sebenarnya logout).
  //
  // Custom domain (28 Okt 2026): bagdja-login tidak menerima domain di luar
  // `*.bagdja.com`, jadi returnTo dititipkan lewat host tetap Bookpedia
  // (`/auth/logout-return`) — pola sama dengan handoff origin di alur login
  // (lihat callback/route.ts). Host tetap yang memvalidasi domain tujuan.
  const origin = resolveOrigin(request);
  const returnTo = isAcceptedBySsoLogout(origin)
    ? origin
    : `${getAppUrl()}/auth/logout-return?to=${encodeURIComponent(origin)}`;

  return NextResponse.redirect(buildSsoLogoutUrl(returnTo));
}
