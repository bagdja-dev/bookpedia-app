import type { ReactNode } from 'react';
import Link from 'next/link';
import { Source_Serif_4 } from 'next/font/google';

import { ReaderAuthNav } from '@/components/reader/reader-auth-nav';
import { SearchBar } from '@/components/reader/search-bar';
import { getPlatformSlug } from '@/lib/platform';
import { getPlatformConfig } from '@/lib/public-api';

// Font serif jadi hero untuk judul & teks baca (wireframe Fase 2 yang sudah
// disetujui) — beda dari font sans default Studio (`layout.tsx` root).
// Diambil di sini (bukan root layout) supaya rute Studio tidak ikut memuat
// font ini.
const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  variable: '--font-source-serif',
  display: 'swap',
});

/**
 * Layout rute publik reader — RINGAN, TANPA chrome shadcn dashboard (sidebar
 * dsb) yang dipakai `/dashboard`. Server Component murni supaya SSR penuh
 * (SEO); satu-satunya bagian client adalah `ReaderAuthNav` (status login).
 * Lihat plan/bookpedia/overview.md §5.
 *
 * `nama`/`logoUrl`/`colors` diambil dari `GET /public/platforms/:platformSlug`
 * (Fase 4, §4.2 — menggantikan `GET /public/config` global lama), Platform
 * di-resolve dari Host via `middleware.ts` (`getPlatformSlug()`). `colors`
 * diterapkan lewat `<style>` inline yang override CSS var `.bookpedia-reader`
 * di globals.css — kalau config gagal dimuat / belum diedit, nilainya
 * identik dengan default hardcode lama (lihat `PLATFORM_CONFIG_FALLBACK`),
 * jadi TIDAK ADA perubahan visual sampai memang ada yang mengedit config.
 */
export default async function ReaderLayout({ children }: { children: ReactNode }) {
  const slug = await getPlatformSlug();
  const config = await getPlatformConfig(slug);
  const c = config.colors;

  return (
    <div className={`bookpedia-reader ${sourceSerif.variable} flex min-h-screen flex-col`}>
      <style>{`
        .bookpedia-reader {
          --reader-bg: ${c.bg};
          --reader-surface: ${c.surface};
          --reader-foreground: ${c.foreground};
          --reader-muted: ${c.muted};
          --reader-border: ${c.border};
          --reader-terracotta: ${c.terracotta};
          --reader-terracotta-foreground: ${c.terracottaForeground};
          --reader-mustard: ${c.mustard};
          --reader-olive: ${c.olive};
        }
      `}</style>

      <header className="sticky top-0 z-10 border-b border-[var(--reader-border)] bg-[var(--reader-surface)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-xl font-semibold tracking-tight text-[var(--reader-terracotta)]"
            style={{ fontFamily: 'var(--font-source-serif)' }}
          >
            {config.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- logo dari URL config bebas domain, bukan aset lokal
              <img src={config.logoUrl} alt={config.nama} className="h-7 w-auto" />
            ) : (
              config.nama
            )}
          </Link>

          <SearchBar />

          <div className="ml-auto">
            <ReaderAuthNav lockStudio={config.lockStudio} />
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-[var(--reader-border)] px-4 py-6 text-center text-xs text-[var(--reader-muted)] sm:px-6">
        {config.nama} — Baca &amp; tulis cerita, oleh Bagdja.
      </footer>
    </div>
  );
}
