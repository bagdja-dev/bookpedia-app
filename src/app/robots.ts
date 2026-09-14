import type { MetadataRoute } from 'next';

import { resolveOriginFromHeaders } from '@/lib/resolve-origin';

/**
 * SEO Fase 1 (§1.3 seo-execution-plan.md, 16 Sep 2026) — dinamis ikut host
 * request (sama seperti `metadataBase` root layout) supaya `Sitemap:`
 * mengarah ke domain yang benar-benar diakses (subdomain Platform atau
 * custom domain), bukan satu domain hardcode.
 *
 * `/dashboard`, `/auth`, `/my` (highlight pribadi, Fase 3) sengaja
 * di-Disallow — TAPI ini cuma lapis pertama (Disallow tidak menjamin Google
 * tidak index URL-nya kalau ada yang link ke sana, cuma mencegah crawl
 * ISI-nya). Lapis kedua: meta `robots: { index: false }` di
 * `src/app/dashboard/layout.tsx`.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const origin = await resolveOriginFromHeaders();

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard', '/auth', '/my'],
    },
    sitemap: `${origin}/sitemap.xml`,
  };
}
