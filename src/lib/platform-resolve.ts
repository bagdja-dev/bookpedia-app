/**
 * Resolusi slug Platform dari Host request — SATU sumber logika untuk
 * `middleware.ts` (inject header internal ke request aplikasi) dan
 * `app/api/proxy/[...path]/route.ts` (forward header ke Bookpedia API).
 *
 * Dipisah 27 Okt 2026 karena bug nyata: masuk Studio Platform `bizact`
 * menampilkan Library milik `novello`. Penyebabnya header
 * `x-bookpedia-platform-slug` tidak sampai ke API, lalu API (saat itu masih
 * fail-open) jatuh ke lookup tanpa filter platform. Middleware sudah resolve
 * slug dengan benar, tapi proxy route cuma meneruskan header KALAU ada —
 * tanpa jalur cadangan. Sekarang proxy route bisa resolve sendiri dari Host.
 *
 * Algoritma (port dari `bagdja-auction-web/middleware.ts`):
 *  1. localhost/host kosong/apex platform host -> Platform DEFAULT
 *  2. `{slug}.{PLATFORM_HOST}` atau `{slug}.localhost` -> slug dari hostname
 *  3. host lain (kandidat custom domain) -> `GET /public/platforms/resolve`
 *     ke API
 */

import { PLATFORM_HOST } from './platform-host';

export { PLATFORM_HOST };

export const API_URL = process.env.NEXT_PUBLIC_BOOKPEDIA_API_URL ?? 'http://localhost:5020';

export const DEFAULT_PLATFORM_SLUG = process.env.NEXT_PUBLIC_DEFAULT_PLATFORM_SLUG ?? 'bookpedia';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

const SUBDOMAIN_PATTERN = new RegExp(`^([a-z0-9-]+)\\.${PLATFORM_HOST.replace(/\./g, '\\.')}$`);

/**
 * `{slug}.localhost` resolve otomatis ke `127.0.0.1` di browser modern/OS
 * manapun (RFC 6761), TANPA perlu edit `/etc/hosts`. Dicek terpisah supaya
 * `.env` tetap boleh berisi domain PRODUCTION asli. Aman di production
 * (Host asli tidak akan pernah `*.localhost`).
 */
const LOCAL_SUBDOMAIN_PATTERN = /^([a-z0-9-]+)\.localhost$/;

/** Ambil hostname (tanpa port) dari nilai header `Host`. */
export function hostnameFromHost(hostHeader: string | null | undefined): string {
  return (hostHeader ?? '').split(':')[0];
}

async function resolveSlugForDomain(host: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/public/platforms/resolve?host=${encodeURIComponent(host)}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { slug?: string };
    return data.slug ?? null;
  } catch {
    return null;
  }
}

/**
 * Slug Platform untuk sebuah hostname, `null` kalau host tidak bisa
 * di-resolve (custom domain belum terdaftar / API tidak bisa dihubungi).
 */
export async function resolvePlatformSlugFromHost(hostHeader: string | null | undefined): Promise<string | null> {
  const hostname = hostnameFromHost(hostHeader);

  if (!hostname || LOCAL_HOSTS.has(hostname) || hostname === PLATFORM_HOST) {
    return DEFAULT_PLATFORM_SLUG;
  }

  const subdomainMatch = hostname.match(SUBDOMAIN_PATTERN) ?? hostname.match(LOCAL_SUBDOMAIN_PATTERN);
  if (subdomainMatch) {
    return subdomainMatch[1];
  }

  return resolveSlugForDomain(hostname);
}
