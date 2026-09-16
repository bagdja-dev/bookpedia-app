/**
 * Penyimpanan `code_verifier` + `next` path sisi server (Upstash Redis),
 * dikunci oleh ID pendek acak yang dikirim sebagai `state` OAuth.
 *
 * Kenapa bukan cookie: Safari (semua mode, termasuk private) tidak konsisten
 * menyimpan Set-Cookie yang menempel di response redirect — cookie yang
 * di-set di /auth/login sebelum redirect ke IdP kadang tidak kebaca lagi di
 * /auth/callback, menyebabkan state_mismatch di iOS meski Chrome/Android
 * normal. Pola & fix ini di-port persis dari
 * `bagdja-auction-admin/src/lib/oauth-state-store.ts` (yang sendiri porting
 * dari `app/website/bagdja-website-admin/app/lib/oauth-state-store.ts`).
 *
 * Kenapa bukan `state` terenkripsi — blob terenkripsi high-entropy di query
 * string lintas domain beberapa kali ke-flag ekstensi ad-blocker/privacy
 * sebagai pola tracking token. `state` di sini cuma ID pendek (~24 karakter).
 */
import crypto from 'crypto';
import { Redis } from '@upstash/redis';

const STATE_KEY_PREFIX = 'oauth_state:';
const DEFAULT_TTL_SECONDS = 600;

const HANDOFF_KEY_PREFIX = 'session_handoff:';
const HANDOFF_TTL_SECONDS = 60;
/** Bukan dihapus langsung saat consume — grace window pendek supaya retry/double-invoke tidak langsung gagal (pelajaran bagdja-auction-web, lihat custom-domain-setup.md §6.3#2). */
const HANDOFF_CONSUMED_GRACE_SECONDS = 30;

export interface StudioOAuthStatePayload {
  codeVerifier: string;
  next: string | null;
  /**
   * Origin (scheme+host) tempat user mengklik login — direkam via
   * `resolveOrigin()` di `login/route.ts` (11 Sep 2026, fix bug login dari
   * subdomain Platform selalu balik ke host default). `redirect_uri` OAuth
   * WAJIB satu host tetap terdaftar di bagdja-auth, jadi request callback
   * SELALU tiba di host itu — origin asli baru bisa diketahui lagi lewat
   * state ini. Kalau beda dari origin request callback, `callback/route.ts`
   * memicu session-handoff (`SessionHandoffPayload` di bawah) alih-alih
   * langsung set cookie di response callback (yang host-nya beda dari
   * origin ini).
   */
  origin: string;
}

/**
 * Payload handoff sesi lintas host — dipakai saat `callback/route.ts`
 * berhasil tukar token TAPI origin tujuan (subdomain Platform asal login)
 * beda dari host callback OAuth sendiri. Cookie session TIDAK di-set di
 * response callback (host-nya salah) — sebagai gantinya token+user
 * dititipkan di sini, redirect ke `${origin}/auth/session?handoff=...`,
 * dan `app/auth/session/route.ts` (yang FISIK jalan di origin tujuan)
 * yang benar-benar set cookie-nya. Dipilih dibanding cookie `Domain`
 * wildcard (sempat dicoba, lihat riwayat di lib/platform-host.ts) karena
 * tidak bergantung sama sekali pada dukungan browser untuk Domain
 * attribute di host sintetis (mis. `localhost`).
 */
export interface SessionHandoffPayload {
  accessToken: string;
  user: { userId: string; email?: string; username?: string; avatar?: string };
  redirectTo: string;
}

let cachedClient: Redis | null | undefined;

/**
 * Terima dua konvensi nama env var — `KV_REST_API_URL`/`KV_REST_API_TOKEN`
 * (dipakai Vercel Marketplace waktu connect provider apa pun termasuk
 * Upstash, demi kompatibilitas mundur dengan `@vercel/kv`) atau
 * `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` (penamaan asli
 * Upstash kalau di-provision langsung tanpa lewat Marketplace Vercel).
 */
function getRedisClient(): Redis | null {
  if (cachedClient !== undefined) return cachedClient;

  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  // Placeholder "TODO-isi-..." (belum dikonfigurasi) harus dianggap "belum
  // dikonfigurasi", bukan value asli — kalau tidak, client Redis dibuat
  // dengan URL sampah dan langsung throw saat dipakai (bukan fallback).
  const isConfigured = Boolean(url && token && url.startsWith('https://'));

  cachedClient = isConfigured ? new Redis({ url: url!, token: token! }) : null;
  return cachedClient;
}

/**
 * Fallback in-memory — dipakai HANYA kalau Upstash belum dikonfigurasi DAN
 * bukan production (biar kesalahan config di production tetap kelihatan,
 * bukan diam-diam "berhasil" pakai memory lalu putus tiap restart/instance
 * berbeda). Untuk dev lokal ini cukup: satu proses Next.js, state cuma
 * hidup ~10 menit dan sekali pakai — tidak butuh Redis sungguhan.
 */
const memoryStore = new Map<string, { payload: StudioOAuthStatePayload; expiresAt: number }>();

function isMemoryFallbackAllowed(): boolean {
  return process.env.NODE_ENV !== 'production';
}

function purgeExpiredMemoryEntries(): void {
  const now = Date.now();
  for (const [key, entry] of memoryStore) {
    if (entry.expiresAt <= now) memoryStore.delete(key);
  }
}

/** ID pendek acak (~24 karakter base64url) — dikirim sebagai `state` ke IdP. */
export function generateStateId(): string {
  return crypto.randomBytes(18).toString('base64url');
}

export async function saveOAuthState(
  id: string,
  payload: StudioOAuthStatePayload,
  ttlSeconds = DEFAULT_TTL_SECONDS,
): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) {
    if (!isMemoryFallbackAllowed()) return false;
    purgeExpiredMemoryEntries();
    memoryStore.set(`${STATE_KEY_PREFIX}${id}`, { payload, expiresAt: Date.now() + ttlSeconds * 1000 });
    return true;
  }
  // Kirim object langsung (bukan JSON.stringify manual) — SDK @upstash/redis
  // otomatis JSON-encode saat SET dan JSON-decode saat GET/GETDEL.
  await redis.set(`${STATE_KEY_PREFIX}${id}`, payload, { ex: ttlSeconds });
  return true;
}

/** Sekali pakai — baca lalu langsung hapus (`GETDEL`, atomik) supaya `state` tidak bisa dipakai ulang (replay). */
export async function consumeOAuthState(id: string): Promise<StudioOAuthStatePayload | null> {
  const redis = getRedisClient();
  if (!redis) {
    if (!isMemoryFallbackAllowed()) return null;
    const key = `${STATE_KEY_PREFIX}${id}`;
    const entry = memoryStore.get(key);
    memoryStore.delete(key);
    if (!entry || entry.expiresAt <= Date.now()) return null;
    return entry.payload;
  }

  const raw = await redis.getdel<StudioOAuthStatePayload | string>(`${STATE_KEY_PREFIX}${id}`);
  if (!raw) return null;

  try {
    const payload = typeof raw === 'string' ? (JSON.parse(raw) as StudioOAuthStatePayload) : raw;
    if (!payload?.codeVerifier) return null;
    return payload;
  } catch {
    return null;
  }
}

// ─── Session handoff (lintas host, lihat SessionHandoffPayload) ──────────

const handoffMemoryStore = new Map<string, { payload: SessionHandoffPayload; expiresAt: number }>();

export function generateHandoffId(): string {
  return crypto.randomBytes(18).toString('base64url');
}

export async function saveSessionHandoff(id: string, payload: SessionHandoffPayload): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) {
    if (!isMemoryFallbackAllowed()) return false;
    handoffMemoryStore.set(`${HANDOFF_KEY_PREFIX}${id}`, {
      payload,
      expiresAt: Date.now() + HANDOFF_TTL_SECONDS * 1000,
    });
    return true;
  }
  await redis.set(`${HANDOFF_KEY_PREFIX}${id}`, payload, { ex: HANDOFF_TTL_SECONDS });
  return true;
}

/**
 * BUKAN `GETDEL` — grace window (perpanjang TTL pendek, bukan hapus
 * langsung) supaya kalau `/auth/session` sempat ke-invoke dua kali (retry
 * jaringan, navigasi back/forward dobel), invoke kedua tidak langsung gagal
 * `state_mismatch`. Pelajaran diambil dari insiden nyata bagdja-auction-web
 * (lihat custom-domain-setup.md §6.3#2).
 */
export async function consumeSessionHandoff(id: string): Promise<SessionHandoffPayload | null> {
  const key = `${HANDOFF_KEY_PREFIX}${id}`;
  const redis = getRedisClient();

  if (!redis) {
    if (!isMemoryFallbackAllowed()) return null;
    const entry = handoffMemoryStore.get(key);
    if (!entry || entry.expiresAt <= Date.now()) {
      handoffMemoryStore.delete(key);
      return null;
    }
    handoffMemoryStore.set(key, { payload: entry.payload, expiresAt: Date.now() + HANDOFF_CONSUMED_GRACE_SECONDS * 1000 });
    return entry.payload;
  }

  const raw = await redis.get<SessionHandoffPayload | string>(key);
  if (!raw) return null;
  await redis.expire(key, HANDOFF_CONSUMED_GRACE_SECONDS);

  try {
    return typeof raw === 'string' ? (JSON.parse(raw) as SessionHandoffPayload) : raw;
  } catch {
    return null;
  }
}
