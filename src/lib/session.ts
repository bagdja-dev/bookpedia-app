/**
 * Simple cookie-based session for storing JWT tokens.
 * Server-side only (used in Route Handlers and Server Components).
 *
 * Cookie httpOnly `ns_token` menyimpan JWT (tidak pernah dibaca client JS —
 * semua request ke backend lewat BFF proxy, lihat app/api/proxy). Cookie
 * `ns_user` non-httpOnly menyimpan info user ringkas untuk client component
 * (lihat hooks/use-auth.ts).
 *
 * Pola diadaptasi persis dari `bagdja-auction-admin/src/lib/session.ts`.
 */
import { cookies } from 'next/headers';

const TOKEN_COOKIE = 'ns_token';
const USER_COOKIE = 'ns_user';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24, // 24 hours
};

export interface SessionUser {
  userId: string;
  email?: string;
  username?: string;
  /** Avatar URL — klaim `picture` di JWT `/oauth/token` (bagdja-auth), hanya terisi untuk user Google OAuth. Pola sama `bagdja-website/lib/session.ts`. */
  avatar?: string;
}

/**
 * SENGAJA host-only (tanpa `Domain` attribute) — cookie `Domain` wildcard
 * (mis. `Domain=localhost`) sempat dicoba untuk dukung login lintas
 * subdomain (11 Sep 2026), tapi single-label host sintetis seperti
 * `localhost` (beda dari domain asli berlabel banyak seperti
 * `bookpedia.bagdja.com`) tidak konsisten diterima semua browser sebagai
 * Domain cookie — menyebabkan bug nyata (loop "memeriksa sesi login" di
 * subdomain `*.localhost`). Diganti pola session-handoff (lihat
 * `oauth-state-store.ts` `saveSessionHandoff`/`consumeSessionHandoff` +
 * `app/auth/session/route.ts`) — `setSession()` SELALU dipanggil dari
 * request yang FISIK sedang berada di host tujuan, jadi host-only cookie
 * sudah cukup, tidak perlu wildcard sama sekali.
 */
export async function setSession(token: string, user: SessionUser) {
  const jar = await cookies();

  jar.set(TOKEN_COOKIE, token, COOKIE_OPTIONS);
  jar.set(USER_COOKIE, JSON.stringify(user), {
    ...COOKIE_OPTIONS,
    httpOnly: false, // client needs to read user info
  });
}

export async function getSession(): Promise<{
  token: string | null;
  user: SessionUser | null;
}> {
  const jar = await cookies();
  const token = jar.get(TOKEN_COOKIE)?.value ?? null;
  const userStr = jar.get(USER_COOKIE)?.value ?? null;

  let user: SessionUser | null = null;
  if (userStr) {
    try {
      user = JSON.parse(userStr);
    } catch {
      user = null;
    }
  }

  return { token, user };
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(TOKEN_COOKIE);
  jar.delete(USER_COOKIE);
}
