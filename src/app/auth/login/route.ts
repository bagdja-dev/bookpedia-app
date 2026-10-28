import { NextRequest, NextResponse } from 'next/server';
import { generateCodeVerifier, generateCodeChallenge, buildAuthorizeUrl } from '@/lib/auth';
import { generateStateId, saveOAuthState } from '@/lib/oauth-state-store';
import { resolveOrigin } from '@/lib/resolve-origin';
import { resolvePlatformSlugFromHost } from '@/lib/platform-resolve';

function safeNextPath(next: string | null): string | null {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return null;
  return next;
}

export async function GET(request: NextRequest) {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const next = safeNextPath(request.nextUrl.searchParams.get('next'));
  // Direkam SEKARANG (subdomain Platform asal user klik login) — redirect_uri
  // OAuth ke bagdja-auth cuma boleh satu host tetap, jadi callback tidak
  // pernah tahu subdomain asal dari request-nya sendiri. Lihat
  // oauth-state-store.ts (field `origin`) & callback/route.ts.
  const origin = resolveOrigin(request);

  // code_verifier + next path disimpan di Upstash Redis (bukan cookie) —
  // supaya tidak bergantung pada cookie yang di-set sebelum redirect
  // bertahan lintas navigasi ke IdP dan balik lagi. `state` yang dikirim ke
  // IdP cuma ID pendek acak (lihat oauth-state-store.ts).
  const stateId = generateStateId();
  const saved = await saveOAuthState(stateId, { codeVerifier, next, origin });
  if (!saved) {
    console.error('Upstash Redis belum dikonfigurasi (KV_REST_API_URL/TOKEN atau UPSTASH_REDIS_REST_URL/TOKEN)');
    return NextResponse.redirect(new URL('/?error=server_misconfigured', resolveOrigin(request)));
  }

  // Bookpedia intentionally keeps silent SSO: account selection is not
  // required when a user already has an active Bagdja Login session.
  // `brand` = slug Platform asal (subdomain/custom domain) supaya
  // login.bagdja.com menampilkan logo/background Platform ini. `/auth/*`
  // dilewati middleware, jadi slug di-resolve langsung dari host origin.
  const brand = await resolvePlatformSlugFromHost(new URL(origin).host);
  const authorizeUrl = buildAuthorizeUrl(stateId, codeChallenge, false, brand);
  return NextResponse.redirect(authorizeUrl);
}
