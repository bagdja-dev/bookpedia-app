import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { BookMasonryGrid } from '@/components/reader/book-masonry-grid';
import { getPlatformSlug } from '@/lib/platform';
import { getPlatformConfig, publicFetch } from '@/lib/public-api';
import { buildSocialMetadata, resolveSeoTemplates } from '@/lib/seo';
import type { SeriesPublicDetailDto } from '@/lib/public-types';

interface SeriesPageProps {
  params: Promise<{ seriesId: string }>;
}

export async function generateMetadata({ params }: SeriesPageProps): Promise<Metadata> {
  const { seriesId } = await params;
  const platformSlug = await getPlatformSlug();
  const [config, series] = await Promise.all([
    getPlatformConfig(platformSlug),
    publicFetch<SeriesPublicDetailDto>(`/public/platforms/${platformSlug}/series/${seriesId}`),
  ]);

  if (!series) {
    return { title: `Series tidak ditemukan — ${config.nama}` };
  }

  const seo = resolveSeoTemplates(
    [
      { h1: series.nama, title: series.nama, description: `Lihat semua cerita dalam series ${series.nama}.`, ogType: 'book', prefix: config.seoPrefix, suffix: config.seoSuffix },
      { h1: config.seoDefaultH1, title: config.seoDefaultTitle, description: config.seoDefaultDescription, ogTitle: config.seoDefaultOgTitle, ogDescription: config.seoDefaultOgDescription, ogType: config.seoDefaultOgType, prefix: config.seoPrefix, suffix: config.seoSuffix },
    ],
    { title: series.nama, platform: config.nama, author: config.nama },
    { title: `${series.nama} — ${config.nama}`, description: `Lihat semua cerita dalam series ${series.nama}.`, h1: series.nama, ogType: 'book' },
  );

  return {
    title: seo.title,
    description: seo.description,
    alternates: { canonical: `/series/${series.id}` },
    ...buildSocialMetadata({
      title: seo.ogTitle,
      description: seo.ogDescription,
      type: seo.ogType,
    }),
  };
}

export default async function SeriesPublicPage({ params }: SeriesPageProps) {
  const { seriesId } = await params;
  const platformSlug = await getPlatformSlug();
  const [config, series] = await Promise.all([
    getPlatformConfig(platformSlug),
    publicFetch<SeriesPublicDetailDto>(`/public/platforms/${platformSlug}/series/${seriesId}`),
  ]);

  if (!series) {
    notFound();
  }

  const pageSeo = resolveSeoTemplates(
    [
      { h1: series.nama, prefix: config.seoPrefix, suffix: config.seoSuffix },
      { h1: config.seoDefaultH1, prefix: config.seoPrefix, suffix: config.seoSuffix },
    ],
    { title: series.nama, platform: config.nama, author: config.nama },
    { title: series.nama, description: `Lihat semua cerita dalam series ${series.nama}.`, h1: series.nama, ogType: 'book' },
  );

  return (
    <div>
      <div className="border-b border-[var(--reader-border)] bg-[var(--reader-surface)]">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--reader-muted)]">Series</p>
          <h1
            className="mt-2 text-2xl font-semibold text-[var(--reader-foreground)] sm:text-3xl"
            style={{ fontFamily: 'var(--font-source-serif)' }}
          >
            {pageSeo.h1}
          </h1>
          <p className="mt-2 text-sm text-[var(--reader-muted)]">
            {series.books.length} cerita dalam series ini.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {series.books.length === 0 ? (
          <p className="rounded-lg border border-[var(--reader-border)] bg-[var(--reader-surface)] px-4 py-8 text-center text-sm text-[var(--reader-muted)]">
            Belum ada cerita yang masuk ke series ini.
          </p>
        ) : (
          <BookMasonryGrid
            books={series.books}
            platformSlug={platformSlug}
            showStatus
            showRating={config.enableRating}
            showLike={config.enableLike}
            showComment={config.enableComment}
          />
        )}
      </div>
    </div>
  );
}
