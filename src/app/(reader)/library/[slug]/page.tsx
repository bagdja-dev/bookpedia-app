import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { BookCard } from '@/components/reader/book-card';
import { getPlatformSlug } from '@/lib/platform';
import { getPlatformConfig, publicFetch } from '@/lib/public-api';
import { buildSocialMetadata } from '@/lib/seo';
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
  const title = `${library.nama} — ${config.nama}`;
  const description = library.deskripsi ?? `Karya-karya dari ${library.nama} di ${config.nama}.`;
  return {
    title,
    description,
    alternates: { canonical: `/library/${library.slug}` },
    ...buildSocialMetadata({ title, description, imageUrl: library.coverUrl }),
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

  return (
    <div>
      <div className="border-b border-[var(--reader-border)] bg-[var(--reader-surface)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 sm:flex-row sm:items-center sm:px-6">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--reader-border)] bg-[var(--reader-bg)]">
            {library.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- cover dari URL bebas milik penulis
              <img src={library.coverUrl} alt={library.nama} className="h-full w-full object-cover" />
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
              {library.nama}
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
          <div className="grid items-start gap-4 grid-cols-[repeat(auto-fit,minmax(140px,1fr))]">
            {library.books.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                showStatus={config.showBookStatus}
                showRating={config.enableRating}
                showLike={config.enableLike}
                showComment={config.enableComment}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
