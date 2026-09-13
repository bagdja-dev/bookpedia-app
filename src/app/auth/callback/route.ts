import { NextRequest, NextResponse } from 'next/server';
import { setSession } from '@/lib/session';
import { consumeOAuthState, generateHandoffId, saveSessionHandoff } from '@/lib/oauth-state-store';
import { resolveOrigin } from '@/lib/resolve-origin';

const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL ?? 'https://login.bagdja.com';
const CLIENT_ID = process.env.NEXT_PUBLIC_CLIENT_ID ?? 'bookpedia';
const CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET ?? '';
const REDIRECT_URI =
  process.env.NEXT_PUBLIC_REDIRECT_URI ?? 'http://localhost:5021/auth/callback';

export async function GET(request: NextRequest) {
  const origin = resolveOrigin(request);
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL('/?error=auth_denied', origin));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL('/?error=missing_params', origin));
  }

  // code_verifier + next path dibaca dari Upstash Redis (sekali pakai, lalu
  // dihapus) — bukan dari cookie, supaya tidak terpengaruh Safari yang tidak
  // konsisten menyimpan Set-Cookie yang menempel di response redirect (lihat
  // login/route.ts).
  const decoded = await consumeOAuthState(state);

  if (!decoded) {
    return NextResponse.redirect(new URL('/?error=state_mismatch', origin));
  }

  const codeVerifier = decoded.codeVerifier;

  try {
    const tokenRes = await fetch(`${AUTH_URL}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code_verifier: codeVerifier,
      }),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error('Token exchange failed:', errBody);
      return NextResponse.redirect(new URL('/?error=token_failed', origin));
    }

    const data = await tokenRes.json();
    const accessToken: string = data.access_token;

    const payload = JSON.parse(
      Buffer.from(accessToken.split('.')[1], 'base64').toString(),
    );
    const user = {
      userId: payload.sub ?? payload.userId,
      email: payload.email,
      username: payload.username,
    };

    const nextPath = decoded.next;
    const redirectTo =
      nextPath && nextPath.startsWith('/') && !nextPath.startsWith('//')
        ? nextPath
        : '/dashboard';

    // `decoded.origin` = subdomain Platform TEMPAT USER SEBENARNYA login
    // (direkam login/route.ts) — BEDA dari `origin` request callback ini
    // (SELALU host tetap `redirect_uri`, tidak peduli subdomain mana user
    // mulai). Kalau SAMA (login dari host default sendiri) — jalur cepat,
    // set cookie langsung di response ini. Kalau BEDA (subdomain Platform
    // lain) — cookie TIDAK bisa di-set di sini (host response ini salah),
    // titipkan via session-handoff (Upstash) lalu redirect ke
    // `${decoded.origin}/auth/session?handoff=...` yang FISIK jalan di host
    // tujuan untuk benar-benar set cookie-nya. Lihat riwayat keputusan di
    // lib/platform-host.ts (kenapa BUKAN cookie `Domain` wildcard).
    const targetOrigin = decoded.origin || origin;

    if (targetOrigin === origin) {
      await setSession(accessToken, user);
      return NextResponse.redirect(new URL(redirectTo, targetOrigin));
    }

    const handoffId = generateHandoffId();
    const saved = await saveSessionHandoff(handoffId, { accessToken, user, redirectTo });
    if (!saved) {
      console.error('Session handoff gagal disimpan (Upstash Redis belum dikonfigurasi)');
      return NextResponse.redirect(new URL('/?error=server_misconfigured', origin));
    }

    const sessionUrl = new URL('/auth/session', targetOrigin);
    sessionUrl.searchParams.set('handoff', handoffId);
    return NextResponse.redirect(sessionUrl);
  } catch (err) {
    console.error('OAuth callback error:', err);
    return NextResponse.redirect(new URL('/?error=server_error', origin));
  }
}
