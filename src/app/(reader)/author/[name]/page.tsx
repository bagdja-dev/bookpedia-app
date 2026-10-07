import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { BookMasonryGrid } from '@/components/reader/book-masonry-grid';
import { getPlatformSlug } from '@/lib/platform';
import { getPlatformConfig, publicFetch } from '@/lib/public-api';
import { buildSocialMetadata, resolveSeoTemplates } from '@/lib/seo';
import type { OriginalAuthorProfileDto } from '@/lib/public-types';

interface OriginalAuthorPageProps {
  params: Promise<{ name: string }>;
}

export async function generateMetadata({ params }: OriginalAuthorPageProps): Promise<Metadata> {
  const { name } = await params;
  const platformSlug = await getPlatformSlug();
  const [config, author] = await Promise.all([
    getPlatformConfig(platformSlug),
    publicFetch<OriginalAuthorProfileDto>(`/public/platforms/${platformSlug}/authors/${encodeURIComponent(name)}`),
  ]);

  const authorName = author?.nama ?? decodeURIComponent(name);
  const title = `${authorName} — Karya Penulis Asli`;
  const description = `Jelajahi semua karya ${authorName} yang diterbitkan di ${config.nama}.`;

  return {
    title,
    description,
    alternates: { canonical: `/author/${encodeURIComponent(name)}` },
    ...buildSocialMetadata({ title, description, imageUrl: config.logoUrl, type: 'profile' }),
  };
}

export default async function OriginalAuthorPage({ params }: OriginalAuthorPageProps) {
  const { name } = await params;
  const platformSlug = await getPlatformSlug();
  const [config, author] = await Promise.all([
    getPlatformConfig(platformSlug),
    publicFetch<OriginalAuthorProfileDto>(`/public/platforms/${platformSlug}/authors/${encodeURIComponent(name)}`),
  ]);

  if (!author) {
    notFound();
  }

  const decodedName = author.nama;
  const seo = resolveSeoTemplates(
    [
      { h1: `${decodedName} — Penulis Asli`, title: `${decodedName} — Karya Penulis Asli`, description: `Jelajahi karya penulis asli ${decodedName} di ${config.nama}.`, ogTitle: `${decodedName} — Karya Penulis Asli`, ogDescription: `Jelajahi karya penulis asli ${decodedName} di ${config.nama}.`, ogType: 'profile', prefix: config.seoPrefix, suffix: config.seoSuffix },
      { h1: config.seoDefaultH1, title: config.seoDefaultTitle, description: config.seoDefaultDescription, ogTitle: config.seoDefaultOgTitle, ogDescription: config.seoDefaultOgDescription, ogType: config.seoDefaultOgType, prefix: config.seoPrefix, suffix: config.seoSuffix },
    ],
    { title: decodedName, platform: config.nama, library: config.nama, author: decodedName },
    { title: `${decodedName} — Karya Penulis Asli`, description: `Jelajahi karya penulis asli ${decodedName} di ${config.nama}.`, h1: `${decodedName} — Penulis Asli`, ogType: 'profile' },
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-8 border-b border-[var(--reader-border)] pb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--reader-terracotta)]">Penulis Asli</p>
        <h1
          className="mt-2 text-3xl font-semibold text-[var(--reader-foreground)] sm:text-4xl"
          style={{ fontFamily: 'var(--font-source-serif)' }}
        >
          {seo.h1}
        </h1>
        <p className="mt-3 text-sm text-[var(--reader-muted)]">
          {author.books.length} karya yang diterbitkan di {config.nama}.
        </p>
      </div>

      {author.books.length === 0 ? (
        <p className="rounded-lg border border-[var(--reader-border)] bg-[var(--reader-surface)] px-4 py-8 text-center text-sm text-[var(--reader-muted)]">
          Belum ada karya penulis asli ini yang diterbitkan.
        </p>
      ) : (
        <BookMasonryGrid
          books={author.books}
          platformSlug={platformSlug}
          showStatus
          showRating={config.enableRating}
          showLike={config.enableLike}
          showComment={config.enableComment}
        />
      )}
    </div>
  );
}
