/**
 * Resolusi Platform (tenant) berdasarkan Host header — port dari
 * `bagdja-auction-web/middleware.ts` (algoritma host-resolution terbukti
 * production, lihat plan/architecture/custom-domain-setup.md), TAPI
 * mekanisme threading-nya BEDA (keputusan §4.2, 11 Sep 2026): bookpedia-app
 * inject header internal (`PLATFORM_SLUG_HEADER`) alih-alih rewrite path
 * `/{slug}/...` — dibaca via `lib/platform.ts` (Server Component) atau
 * `PlatformProvider` Context (Client Component). Alasan: baik root layout
 * maupun komponen client (`dashboard/layout.tsx`, `onboarding/page.tsx`)
 * tidak bisa baca `params` dari URL segment manapun, jadi butuh jalur
 * headers()/Context terlepas dari path di-rewrite atau tidak — pindah
 * seluruh route tree ke `app/[platformSlug]/...` cuma untung kecil untuk
 * risiko relokasi besar.
 *
 * 3 kasus (Case 1 auction-web "apex + /{slug}/... -> redirect subdomain"
 * SENGAJA TIDAK di-port — tidak relevan tanpa path-based routing):
 *  1. localhost/host kosong/apex platform host -> Platform DEFAULT
 *     (`NEXT_PUBLIC_DEFAULT_PLATFORM_SLUG`, dev lokal & fallback)
 *  2. `{slug}.{PLATFORM_HOST}` (wildcard subdomain) -> slug langsung dari
 *     hostname, TANPA panggilan API. `{slug}.localhost` (tanpa perlu
 *     `/etc/hosts`) ikut dicek di sini untuk kemudahan dev lokal — lihat
 *     `LOCAL_SUBDOMAIN_PATTERN`.
 *  3. Host lain (kandidat custom domain) -> `GET /public/platforms/resolve
 *     ?host=...` — infra §4.3 (Traefik/DNS) sudah aktif production sejak
 *     16 Sep 2026 (custom domain `novello.bagdja.com` terverifikasi & jalan).
 *
 * Susulan 17 Sep 2026 (SEO, `seo-execution-plan.md` §4): SETELAH slug
 * ter-resolve (kasus 1-3 di atas), path yang match pola verifikasi Google
 * Search Console (`/google<hash>.html`) dibalas LANGSUNG dari
 * `platforms.search_console_verification_content` Platform yang resolve —
 * bukan halaman aplikasi, jadi dicek sebelum `withPlatformSlug()`.
 *
 * `/auth/*` HARUS dikecualikan PALING AWAL — pelajaran insiden nyata
 * auction-web (lupa ini bikin `/auth/session` di custom domain 404).
 */
import { NextResponse, type NextRequest } from 'next/server';

import { PLATFORM_SLUG_HEADER } from '@/lib/platform-slug-header';
import { PLATFORM_HOST } from '@/lib/platform-host';

const API_URL = process.env.NEXT_PUBLIC_BOOKPEDIA_API_URL ?? 'http://localhost:5020';
const DEFAULT_PLATFORM_SLUG = process.env.NEXT_PUBLIC_DEFAULT_PLATFORM_SLUG ?? 'bookpedia';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

const SUBDOMAIN_PATTERN = new RegExp(`^([a-z0-9-]+)\\.${PLATFORM_HOST.replace(/\./g, '\\.')}$`);

/**
 * Kemudahan dev lokal (11 Sep 2026) — `{slug}.localhost` resolve otomatis ke
 * `127.0.0.1` di browser modern/OS manapun (RFC 6761), TANPA perlu edit
 * `/etc/hosts`. Dicek terpisah dari `SUBDOMAIN_PATTERN` supaya `.env` tetap
 * boleh berisi domain PRODUCTION asli (`NEXT_PUBLIC_PLATFORM_URL=https://
 * bookpedia.bagdja.com`) tanpa perlu di-toggle manual tiap mau tes subdomain
 * lokal. Aman di production juga (Host asli tidak akan pernah `*.localhost`),
 * jadi tidak perlu digerbang `NODE_ENV`.
 */
const LOCAL_SUBDOMAIN_PATTERN = /^([a-z0-9-]+)\.localhost$/;

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

function withPlatformSlug(request: NextRequest, slug: string): NextResponse {
  const headers = new Headers(request.headers);
  headers.set(PLATFORM_SLUG_HEADER, slug);
  return NextResponse.next({ request: { headers } });
}

/**
 * Verifikasi Google Search Console per-Platform (17 Sep 2026, susulan SEO —
 * lihat plan/bookpedia/seo-execution-plan.md §4). Filename Google SELALU
 * berpola `google<hash>.html` — dicek di sini SEBELUM rute aplikasi manapun,
 * dibalas apa adanya dari `platforms.search_console_verification_content`
 * milik Platform yang resolve dari Host request. Menggantikan pendekatan
 * file statis di `public/` (dibagikan SEMUA Platform, butuh rebuild tiap
 * Platform baru mau verifikasi) — sekarang per-Platform lewat Platform
 * Settings, tanpa deploy ulang.
 */
const GOOGLE_VERIFICATION_PATTERN = /^\/google[a-zA-Z0-9_-]+\.html$/;

async function getPlatformVerificationFile(slug: string): Promise<{ filename: string; content: string } | null> {
  try {
    const res = await fetch(`${API_URL}/public/platforms/${encodeURIComponent(slug)}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      searchConsoleVerificationFilename?: string | null;
      searchConsoleVerificationContent?: string | null;
    };
    if (!data.searchConsoleVerificationFilename || !data.searchConsoleVerificationContent) return null;
    return { filename: data.searchConsoleVerificationFilename, content: data.searchConsoleVerificationContent };
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/auth/')) {
    return NextResponse.next();
  }

  const hostHeader = request.headers.get('host') ?? '';
  const hostname = hostHeader.split(':')[0];

  let slug: string;
  if (!hostname || LOCAL_HOSTS.has(hostname) || hostname === PLATFORM_HOST) {
    slug = DEFAULT_PLATFORM_SLUG;
  } else {
    const subdomainMatch = hostname.match(SUBDOMAIN_PATTERN) ?? hostname.match(LOCAL_SUBDOMAIN_PATTERN);
    if (subdomainMatch) {
      slug = subdomainMatch[1];
    } else {
      const resolved = await resolveSlugForDomain(hostname);
      if (!resolved) {
        // Host tak-terdaftar (custom domain belum di-resolve) — diamkan,
        // biarkan `getPlatformSlug()` fallback ke default. Lihat catatan
        // risiko di plan §4.2 (revisit jadi halaman "Platform not found"
        // begitu §4.3 aktif).
        return NextResponse.next();
      }
      slug = resolved;
    }
  }

  if (GOOGLE_VERIFICATION_PATTERN.test(request.nextUrl.pathname)) {
    const file = await getPlatformVerificationFile(slug);
    if (file && `/${file.filename}` === request.nextUrl.pathname) {
      return new NextResponse(file.content, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }
  }

  return withPlatformSlug(request, slug);
}

export const config = {
  matcher: ['/((?!_next|api|favicon.ico).*)'],
};
