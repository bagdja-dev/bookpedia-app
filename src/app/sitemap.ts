import type { MetadataRoute } from 'next';

import { getPlatformSlug } from '@/lib/platform';
import { publicFetch } from '@/lib/public-api';
import { resolveOriginFromHeaders } from '@/lib/resolve-origin';
import type { SitemapEntriesDto } from '@/lib/public-types';

/**
 * SEO Fase 2 (§2.1 seo-execution-plan.md, 16 Sep 2026) — dinamis per-Platform
 * (resolve dari Host, sama seperti `robots.ts`/`metadataBase`). Isi: Book +
 * Library publik + halaman katalog. Chapter individual SEKARANG DISERTAKAN
 * (revisi 17 Sep 2026 — keputusan lama seo-plan.md §6.2 "cukup Book-level,
 * Chapter ditemukan lewat internal link next/prev" dibuka ulang: discovery
 * pasif lewat crawling link itu lambat/tidak dijamin, sedangkan situs
 * kompetitor sejenis — Wattpad — terbukti mengandalkan tiap Chapter
 * terindeks sendiri-sendiri). TANPA pagination — skala data saat ini kecil
 * (lihat seo-plan.md §3.4, revisit dengan `generateSitemaps()` kalau Book
 * sudah ribuan).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [slug, origin] = await Promise.all([getPlatformSlug(), resolveOriginFromHeaders()]);
  const entries = await publicFetch<SitemapEntriesDto>(`/public/platforms/${slug}/sitemap-entries`);

  const staticEntries: MetadataRoute.Sitemap = [{ url: origin, changeFrequency: 'daily', priority: 1 }];

  if (!entries) {
    return staticEntries;
  }

  const bookEntries: MetadataRoute.Sitemap = entries.books.map((book) => ({
    url: `${origin}/book/${book.slug}`,
    lastModified: book.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const libraryEntries: MetadataRoute.Sitemap = entries.libraries.map((library) => ({
    url: `${origin}/library/${library.slug}`,
    lastModified: library.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  const chapterEntries: MetadataRoute.Sitemap = entries.chapters.map((chapter) => ({
    url: `${origin}/book/${chapter.bookSlug}/chapter/${chapter.orderIndex}`,
    lastModified: chapter.updatedAt,
    changeFrequency: 'monthly',
    priority: 0.5,
  }));

  return [...staticEntries, ...bookEntries, ...libraryEntries, ...chapterEntries];
}
