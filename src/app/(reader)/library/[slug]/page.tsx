import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { BookMasonryGrid } from '@/components/reader/book-masonry-grid';
import { SafeImage } from '@/components/safe-image';
import { getPlatformSlug } from '@/lib/platform';
import { getPlatformConfig, publicFetch } from '@/lib/public-api';
import { buildSocialMetadata, resolveSeoTemplates } from '@/lib/seo';
import type { LibraryProfileDto } from '@/lib/public-types';

interface LibraryPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: LibraryPageProps): Promise<Metadata> {
  const { slug: librarySlug } = await params;
  const platformSlug = await getPlatformSlug();
  const [config, library] = await Promise.all([
    getPlatformConfig(platformSlug),
    publicFetch<LibraryProfileDto>(`/public/platforms/${platformSlug}/libraries/${librarySlug}`),
  ]);
  if (!library) {
    return { title: `Library tidak ditemukan — ${config.nama}` };
  }
  const seo = resolveSeoTemplates(
    [
      { h1: library.seoH1, title: library.seoTitle, description: library.seoDescription, ogTitle: library.seoOgTitle, ogDescription: library.seoOgDescription, ogType: library.seoOgType, prefix: library.seoPrefix, suffix: library.seoSuffix },
      { h1: config.seoDefaultH1, title: config.seoDefaultTitle, description: config.seoDefaultDescription, ogTitle: config.seoDefaultOgTitle, ogDescription: config.seoDefaultOgDescription, ogType: config.seoDefaultOgType, prefix: config.seoPrefix, suffix: config.seoSuffix },
    ],
    { title: library.nama, platform: config.nama, library: library.nama, author: library.nama },
    { title: `${library.nama} — ${config.nama}`, description: library.deskripsi ?? `Karya-karya dari ${library.nama} di ${config.nama}.`, h1: library.nama, ogType: 'profile' },
  );
  return {
    title: seo.title,
    description: seo.description,
    alternates: { canonical: `/library/${library.slug}` },
    ...buildSocialMetadata({ title: seo.ogTitle, description: seo.ogDescription, imageUrl: library.coverUrl, type: seo.ogType }),
  };
}

export default async function LibraryProfilePage({ params }: LibraryPageProps) {
  const { slug: librarySlug } = await params;
  const platformSlug = await getPlatformSlug();
  const [config, library] = await Promise.all([
    getPlatformConfig(platformSlug),
    publicFetch<LibraryProfileDto>(`/public/platforms/${platformSlug}/libraries/${librarySlug}`),
  ]);

  if (!library) {
    notFound();
  }

  const pageSeo = resolveSeoTemplates(
    [
      { h1: library.seoH1, prefix: library.seoPrefix, suffix: library.seoSuffix },
      { h1: config.seoDefaultH1, prefix: config.seoPrefix, suffix: config.seoSuffix },
    ],
    { title: library.nama, platform: config.nama, library: library.nama, author: library.nama },
    { title: library.nama, description: library.deskripsi ?? '', h1: library.nama, ogType: 'profile' },
  );

  return (
    <div>
      <div className="border-b border-[var(--reader-border)] bg-[var(--reader-surface)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 sm:flex-row sm:items-center sm:px-6">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--reader-border)] bg-[var(--reader-bg)]">
            {library.coverUrl ? (
              <SafeImage
                src={library.coverUrl}
                alt={library.nama}
                width={96}
                height={96}
                priority
                className="h-full w-full object-cover"
              />
            ) : (
              <span
                className="text-3xl font-semibold text-[var(--reader-muted)]"
                style={{ fontFamily: 'var(--font-source-serif)' }}
              >
                {library.nama.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <h1
              className="text-2xl font-semibold text-[var(--reader-foreground)] sm:text-3xl"
              style={{ fontFamily: 'var(--font-source-serif)' }}
            >
              {pageSeo.h1}
            </h1>
            {library.deskripsi && (
              <p className="mt-2 max-w-2xl text-sm text-[var(--reader-muted)]">{library.deskripsi}</p>
            )}
            <p className="mt-2 text-xs text-[var(--reader-muted)]">{library.books.length} cerita</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {library.books.length === 0 ? (
          <p className="rounded-lg border border-[var(--reader-border)] bg-[var(--reader-surface)] px-4 py-8 text-center text-sm text-[var(--reader-muted)]">
            Belum ada cerita yang diterbitkan Library ini.
          </p>
        ) : (
          <BookMasonryGrid
            books={library.books}
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
