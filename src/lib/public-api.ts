/**
 * Public, UNAUTHENTICATED fetch helper untuk rute reader (`(reader)/*`).
 *
 * Beda dari `backendFetch` (lib/backend-api.ts): itu khusus dipanggil dari
 * Route Handler BFF proxy dengan token sesi (httpOnly cookie) untuk rute
 * Studio yang authenticated. Helper ini dipanggil LANGSUNG dari Server
 * Component (SSR/ISR), tanpa Authorization header, tanpa lewat proxy — supaya
 * konten reader ter-render penuh di HTML awal response (SEO, Google crawl
 * langsung tanpa nunggu client-side fetch). Lihat plan/bookpedia/overview.md §5
 * dan execution-plan.md Fase 2.
 */
import { cache } from 'react';

import type { PlatformProfileDto, TagDto } from './public-types';

const API_BASE = process.env.NEXT_PUBLIC_BOOKPEDIA_API_URL ?? 'http://localhost:5020';

/**
 * Default SAMA PERSIS dengan seed awal `platforms` di backend (migration
 * 20260910000000_platforms_and_platform_staff.sql) — dipakai kalau
 * `GET /public/platforms/:platformSlug` gagal dimuat, supaya tampilan tetap
 * identik dengan sebelum fitur ini ada (bukan layar rusak/kosong).
 */
const PLATFORM_CONFIG_FALLBACK: PlatformProfileDto = {
  nama: 'Bookpedia',
  slug: 'bookpedia',
  logoUrl: null,
  faviconUrl: null,
  notificationSoundUrl: null,
  colors: {
    bg: '#fbf6ee',
    surface: '#fffdf8',
    foreground: '#2c2114',
    muted: '#7a6c57',
    border: '#e6d9c3',
    terracotta: '#c1502e',
    terracottaForeground: '#fdf8f0',
    mustard: '#d79a2c',
    olive: '#6b7a4c',
  },
  lockStudio: false,
  rendererKey: 'reader',
  maxFreeChapters: 0,
  showBookStatus: true,
  maxTagsPerBook: 5,
  searchConsoleVerificationFilename: null,
  searchConsoleVerificationContent: null,
  enableRating: true,
  ratingMode: 'book',
  enableLike: true,
  enableComment: true,
  enableShare: true,
  seoDefaultH1: '{{title}}',
  seoDefaultTitle: '{{title}} — {{platform}}',
  seoDefaultDescription: 'Baca {{title}} di {{platform}}.',
  seoDefaultOgTitle: null,
  seoDefaultOgDescription: null,
  seoDefaultOgType: 'website',
  seoPrefix: null,
  seoSuffix: null,
};

/**
 * GET publik ke `bookpedia-api`. Return `null` kalau 404 ATAU request gagal
 * (network error, backend belum jalan, response bukan JSON, dst) — pemanggil
 * di halaman detail (Library/Book/Chapter) memanggil `notFound()` dari
 * `next/navigation` saat menerima `null`; pemanggil di halaman katalog
 * (list, tidak pernah 404) menampilkan state kosong/error ringan.
 */
export async function publicFetch<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      // ISR — konten publik cukup segar tiap 60 detik, tidak perlu
      // full-dynamic per request seperti rute Studio.
      next: { revalidate: 60 },
    });

    if (res.status === 404) {
      return null;
    }

    if (!res.ok) {
      console.error(`[publicFetch] GET ${path} -> ${res.status}: ${res.statusText}`);
      return null;
    }

    return (await res.json()) as T;
  } catch (err) {
    console.error(`[publicFetch] GET ${path} failed:`, err);
    return null;
  }
}

/**
 * Wrapper `publicFetch('/public/platforms/:platformSlug')` dengan fallback
 * aman (lihat `PLATFORM_CONFIG_FALLBACK` di atas) — pemanggil TIDAK PERLU
 * cek `null`, selalu dapat object lengkap. Dibungkus `cache()` (React) —
 * beberapa pemanggil dalam satu request (root layout + reader layout +
 * page) dedupe jadi satu fetch, bukan berulang.
 */
export const getPlatformConfig = cache(async (platformSlug: string): Promise<PlatformProfileDto> => {
  const config = await publicFetch<Partial<PlatformProfileDto>>(
    `/public/platforms/${encodeURIComponent(platformSlug)}`,
  );
  if (!config) return PLATFORM_CONFIG_FALLBACK;
  return {
    nama: config.nama || PLATFORM_CONFIG_FALLBACK.nama,
    slug: config.slug || platformSlug,
    logoUrl: config.logoUrl ?? PLATFORM_CONFIG_FALLBACK.logoUrl,
    faviconUrl: config.faviconUrl ?? PLATFORM_CONFIG_FALLBACK.faviconUrl,
    notificationSoundUrl: config.notificationSoundUrl ?? PLATFORM_CONFIG_FALLBACK.notificationSoundUrl,
    colors: { ...PLATFORM_CONFIG_FALLBACK.colors, ...config.colors },
    lockStudio: config.lockStudio ?? PLATFORM_CONFIG_FALLBACK.lockStudio,
    rendererKey: config.rendererKey || PLATFORM_CONFIG_FALLBACK.rendererKey,
    maxFreeChapters: config.maxFreeChapters ?? PLATFORM_CONFIG_FALLBACK.maxFreeChapters,
    showBookStatus: config.showBookStatus ?? PLATFORM_CONFIG_FALLBACK.showBookStatus,
    maxTagsPerBook: config.maxTagsPerBook ?? PLATFORM_CONFIG_FALLBACK.maxTagsPerBook,
    searchConsoleVerificationFilename: config.searchConsoleVerificationFilename ?? null,
    searchConsoleVerificationContent: config.searchConsoleVerificationContent ?? null,
    enableRating: config.enableRating ?? PLATFORM_CONFIG_FALLBACK.enableRating,
    ratingMode: config.ratingMode ?? PLATFORM_CONFIG_FALLBACK.ratingMode,
    enableLike: config.enableLike ?? PLATFORM_CONFIG_FALLBACK.enableLike,
    enableComment: config.enableComment ?? PLATFORM_CONFIG_FALLBACK.enableComment,
    enableShare: config.enableShare ?? PLATFORM_CONFIG_FALLBACK.enableShare,
    seoDefaultH1: config.seoDefaultH1 ?? PLATFORM_CONFIG_FALLBACK.seoDefaultH1,
    seoDefaultTitle: config.seoDefaultTitle ?? PLATFORM_CONFIG_FALLBACK.seoDefaultTitle,
    seoDefaultDescription: config.seoDefaultDescription ?? PLATFORM_CONFIG_FALLBACK.seoDefaultDescription,
    seoDefaultOgTitle: config.seoDefaultOgTitle ?? PLATFORM_CONFIG_FALLBACK.seoDefaultOgTitle,
    seoDefaultOgDescription: config.seoDefaultOgDescription ?? PLATFORM_CONFIG_FALLBACK.seoDefaultOgDescription,
    seoDefaultOgType: config.seoDefaultOgType ?? PLATFORM_CONFIG_FALLBACK.seoDefaultOgType,
    seoPrefix: config.seoPrefix ?? PLATFORM_CONFIG_FALLBACK.seoPrefix,
    seoSuffix: config.seoSuffix ?? PLATFORM_CONFIG_FALLBACK.seoSuffix,
  };
});

/**
 * Autocomplete Tag (Fase 6) — dipanggil dari CLIENT (Studio Book form,
 * komponen `'use client'`), beda dari helper lain di file ini yang dipanggil
 * Server Component. Browser `fetch` polos (Next.js cache extension
 * `next: {revalidate}` cuma berlaku di server) supaya hasil selalu segar
 * saat mengetik.
 */
export async function searchTags(platformSlug: string, search: string): Promise<TagDto[]> {
  try {
    const res = await fetch(
      `${API_BASE}/public/platforms/${encodeURIComponent(platformSlug)}/tags?search=${encodeURIComponent(search)}`,
    );
    if (!res.ok) return [];
    return (await res.json()) as TagDto[];
  } catch {
    return [];
  }
}

/**
 * Fase 7 — catat 1x "buka" Chapter (statistik baca). Dipanggil dari
 * komponen client `ChapterViewTracker`, TANPA lewat `apiClient`/proxy
 * authenticated (endpoint publik, dihitung untuk pembaca anonim juga) —
 * pola sama `searchTags` di atas (fetch polos langsung ke backend).
 * Fire-and-forget: gagal diam-diam, tidak pernah men-throw ke pemanggil.
 */
export async function recordChapterView(platformSlug: string, bookSlug: string, orderIndex: number): Promise<void> {
  try {
    await fetch(
      `${API_BASE}/public/platforms/${encodeURIComponent(platformSlug)}/books/${encodeURIComponent(bookSlug)}/chapters/${orderIndex}/view`,
      { method: 'POST' },
    );
  } catch (err) {
    console.error('[recordChapterView] gagal catat view:', err);
  }
}
