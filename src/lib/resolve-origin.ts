import type { NextRequest } from 'next/server';

import { getAppUrl } from '@/lib/app-url';

/**
 * Port verbatim dari `bagdja-auction-web/lib/resolve-origin.ts` (§4.2, 11
 * Sep 2026 — hardening independen dari custom-domain support, lihat
 * plan/bookpedia/execution-plan.md §4.2 & plan/architecture/custom-domain-setup.md).
 *
 * Bind address (alamat LISTEN container), bukan alamat yang bisa dituju
 * browser. Kalau salah satu ini yang ke-resolve, artinya kita sedang
 * membaca alamat server SENDIRI, bukan asal request user.
 */
const BIND_ADDRESS_HOSTNAMES = new Set(['0.0.0.0', '::', '[::]', '::0', '[::0]']);

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * `*.localhost` (mis. `pojokbaca.localhost`) — kemudahan dev lokal khusus
 * bookpedia-app untuk tes subdomain Platform (lihat middleware.ts
 * LOCAL_SUBDOMAIN_PATTERN), TIDAK ada di versi asli bagdja-auction-web yang
 * di-port file ini. Tanpa ini, proto jatuh ke fallback 'https' (baris di
 * bawah) untuk host seperti `pojokbaca.localhost` — origin yang direkam
 * jadi salah skema (https ke dev server yang cuma serve http), redirect
 * balik OAuth gagal connect, dan berujung loop login<->dashboard (ditemukan
 * dari laporan bug nyata, 11 Sep 2026).
 */
function isLocalHostname(hostname: string): boolean {
  return LOCAL_HOSTNAMES.has(hostname) || hostname.endsWith('.localhost');
}

function hostnameOf(hostHeader: string): string {
  // Buang port. IPv6 literal (`[::1]:3000`) ikut ke-handle karena bagian
  // dalam bracket tidak boleh dipecah oleh `:`.
  const withoutPort = hostHeader.startsWith('[')
    ? hostHeader.slice(0, hostHeader.indexOf(']') + 1)
    : hostHeader.split(':')[0];
  return withoutPort.toLowerCase();
}

function isUsableHost(hostHeader: string | undefined): hostHeader is string {
  if (!hostHeader) return false;
  return !BIND_ADDRESS_HOSTNAMES.has(hostnameOf(hostHeader));
}

function firstHeaderValue(request: NextRequest, name: string): string | undefined {
  return request.headers.get(name)?.split(',')[0]?.trim() || undefined;
}

/**
 * Origin asal request sebenarnya (scheme+host yang BENAR-BENAR dipakai
 * browser user) — dipakai untuk SEMUA redirect yang kita kirim balik dari
 * route `/auth/*`.
 *
 * PENTING — `request.nextUrl.origin`/`request.url` TIDAK BOLEH dipakai di
 * deployment manapun yang lewat reverse proxy (Traefik/Coolify, topologi
 * yang sama dipakai seluruh ekosistem Bagdja). Itu BUKAN dibangun dari
 * header `Host`, melainkan dari alamat LISTEN server (`HOSTNAME=0.0.0.0` di
 * container) — insiden nyata di `bagdja-auction-web` (lihat
 * custom-domain-setup.md §6.3#1) membuktikan ini SELALU salah di produksi,
 * bukan cuma kadang-kadang.
 *
 * Urutan sumber origin, dari yang paling bisa dipercaya:
 *   1. `X-Forwarded-Host` — di-set Traefik/Coolify dari request asli.
 *   2. `Host` — Traefik meneruskannya apa adanya (`passHostHeader` default
 *      true), paling universal.
 *   3. `getAppUrl()` (`NEXT_PUBLIC_APP_URL`) — host default tetap. Bukan
 *      origin request yang benar, TAPI selalu bisa dibuka browser, jadi
 *      user melihat halaman error yang wajar alih-alih
 *      `ERR_CONNECTION_REFUSED` ke alamat yang tidak ada di jaringan mana pun.
 */
export function resolveOrigin(request: NextRequest): string {
  const forwardedProto = firstHeaderValue(request, 'x-forwarded-proto');

  const forwardedHost = firstHeaderValue(request, 'x-forwarded-host');
  if (isUsableHost(forwardedHost)) {
    return `${forwardedProto || 'https'}://${forwardedHost}`;
  }

  const host = firstHeaderValue(request, 'host');
  if (isUsableHost(host)) {
    // Tanpa `x-forwarded-proto` (request tidak lewat proxy sama sekali):
    // host dev lokal pasti http, sisanya di infra ini selalu di balik TLS
    // Cloudflare/Traefik.
    const proto = forwardedProto || (isLocalHostname(hostnameOf(host)) ? 'http' : 'https');
    return `${proto}://${host}`;
  }

  return getAppUrl();
}
