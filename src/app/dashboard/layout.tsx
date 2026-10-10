import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { getPlatformSlug } from '@/lib/platform';
import { getPlatformConfig } from '@/lib/public-api';
import { readingTypographyStyle } from '@/lib/reading-typography';

import { DashboardClientLayout } from './dashboard-client-layout';

/**
 * SEO Fase 1 (§1.3 seo-execution-plan.md, 16 Sep 2026) — Studio TIDAK boleh
 * ter-index Google (butuh login, tidak relevan publik). `robots.txt`
 * (`src/app/robots.ts`) sudah Disallow `/dashboard`, tapi itu cuma mencegah
 * CRAWL isinya — tidak menjamin URL-nya tidak muncul di index kalau ada
 * yang link ke sana. Meta `noindex` di sini adalah lapis kedua yang benar2
 * mencegah indexing.
 *
 * File ini SENGAJA dipecah dari logic Studio asli (`dashboard-client-layout.tsx`,
 * `'use client'`) — Client Component TIDAK BISA export `metadata` (batasan
 * Next.js). Server Component wrapper tipis ini yang expose metadata,
 * seluruh behavior/isi Studio TIDAK berubah sama sekali.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Tipografi bacaan Platform juga dipasang di Studio supaya editor Chapter menampilkan teks
 * persis seperti yang dibaca pembaca. `display: contents` — pembungkus ini hanya membawa
 * CSS variable, tidak mengubah layout Studio.
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const config = await getPlatformConfig(await getPlatformSlug());
  return (
    <div style={{ display: 'contents', ...readingTypographyStyle(config.readingTypography) }}>
      <DashboardClientLayout>{children}</DashboardClientLayout>
    </div>
  );
}
