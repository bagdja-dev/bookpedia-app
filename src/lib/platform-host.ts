/**
 * Base domain Platform (`NEXT_PUBLIC_PLATFORM_URL`) — dipakai `middleware.ts`
 * untuk resolusi subdomain `{slug}.{PLATFORM_HOST}`. Dipisah dari
 * middleware.ts (11 Sep 2026) supaya bisa direuse tempat lain kalau perlu,
 * tanpa duplikasi parsing URL-nya.
 *
 * Catatan riwayat: sempat juga menaruh `isPlatformHost()`/`getCookieDomain()`
 * di sini untuk skema cookie `Domain` wildcard lintas subdomain — DIBATALKAN
 * (11 Sep 2026) karena `Domain=localhost` (single-label, beda dari domain
 * asli berlabel banyak seperti `bookpedia.bagdja.com`) tidak konsisten diterima
 * semua browser, menyebabkan bug loop login di `*.localhost`. Diganti pola
 * session-handoff (lihat `lib/oauth-state-store.ts` + `app/auth/session/
 * route.ts`) yang tidak butuh cookie Domain wildcard sama sekali.
 */
export const PLATFORM_HOST = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_PLATFORM_URL ?? 'https://bookpedia.bagdja.com').hostname;
  } catch {
    return 'bookpedia.bagdja.com';
  }
})();
