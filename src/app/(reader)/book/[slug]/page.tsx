import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { User } from 'lucide-react';
import { ContinueReadingButton } from '@/components/reader/continue-reading-button';
import { Badge } from '@/components/ui/badge';
import { BOOK_STATUS_LABEL, BOOK_STATUS_VARIANT } from '@/lib/status';
import { BOOK_TYPE_BADGE_LABEL, formatBookBylinePrefix } from '@/lib/book-byline';
import { getPlatformSlug } from '@/lib/platform';
import { getPlatformConfig, publicFetch } from '@/lib/public-api';
import type { BookDetailDto } from '@/lib/public-types';

interface BookPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: BookPageProps): Promise<Metadata> {
  const { slug: bookSlug } = await params;
  const platformSlug = await getPlatformSlug();
  const [config, book] = await Promise.all([
    getPlatformConfig(platformSlug),
    publicFetch<BookDetailDto>(`/public/platforms/${platformSlug}/books/${bookSlug}`),
  ]);
  if (!book) {
    return { title: `Cerita tidak ditemukan — ${config.nama}` };
  }
  return {
    title: `${book.judul} — ${config.nama}`,
    description: book.sinopsis ?? `Baca ${book.judul} oleh ${book.library.nama} di ${config.nama}.`,
  };
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default async function BookDetailPage({ params }: BookPageProps) {
  const { slug: bookSlug } = await params;
  const platformSlug = await getPlatformSlug();
  const book = await publicFetch<BookDetailDto>(`/public/platforms/${platformSlug}/books/${bookSlug}`);

  if (!book) {
    notFound();
  }

  const firstChapter = book.chapters[0];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-6 sm:flex-row">
        <div className="w-40 shrink-0 overflow-hidden rounded-lg border border-[var(--reader-border)] bg-[var(--reader-surface)] shadow-sm sm:w-56">
          <div className="aspect-[3/4] w-full bg-[var(--reader-bg)]">
            {book.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- cover dari URL bebas milik penulis
              <img src={book.coverUrl} alt={book.judul} className="h-full w-full object-cover" />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center text-5xl font-semibold text-[var(--reader-muted)]"
                style={{ fontFamily: 'var(--font-source-serif)' }}
              >
                {book.judul.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-3">
          <h1
            className="text-2xl font-semibold text-[var(--reader-foreground)] sm:text-3xl"
            style={{ fontFamily: 'var(--font-source-serif)' }}
          >
            {book.judul}
          </h1>

          <p className="w-fit text-sm text-[var(--reader-muted)]">
            {formatBookBylinePrefix(book)}{' '}
            <Link
              href={`/library/${book.library.slug}`}
              className="underline-offset-2 hover:text-[var(--reader-terracotta)] hover:underline"
            >
              {book.library.nama}
            </Link>
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={BOOK_STATUS_VARIANT[book.status]}>{BOOK_STATUS_LABEL[book.status]}</Badge>
            {book.bookType !== 'original' && (
              <span className="rounded-full bg-[var(--reader-terracotta)]/10 px-2.5 py-0.5 text-xs font-medium text-[var(--reader-terracotta)]">
                {BOOK_TYPE_BADGE_LABEL[book.bookType]}
              </span>
            )}
            {book.genre && (
              <span className="rounded-full bg-[var(--reader-bg)] px-2.5 py-0.5 text-xs text-[var(--reader-muted)]">
                {book.genre.nama}
              </span>
            )}
            <span className="text-xs text-[var(--reader-muted)]">{book.chapters.length} chapter</span>
          </div>

          {book.sinopsis && (
            <p className="text-sm leading-relaxed text-[var(--reader-foreground)]/90">{book.sinopsis}</p>
          )}

          {firstChapter && (
            <ContinueReadingButton
              bookId={book.id}
              slug={book.slug}
              firstChapterOrderIndex={firstChapter.orderIndex}
            />
          )}
        </div>
      </div>

      <div className="mt-10">
        <h2
          className="mb-3 text-lg font-semibold text-[var(--reader-foreground)]"
          style={{ fontFamily: 'var(--font-source-serif)' }}
        >
          Daftar Chapter
        </h2>

        {book.chapters.length === 0 ? (
          <p className="rounded-lg border border-[var(--reader-border)] bg-[var(--reader-surface)] px-4 py-6 text-center text-sm text-[var(--reader-muted)]">
            Belum ada chapter yang diterbitkan.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--reader-border)] overflow-hidden rounded-lg border border-[var(--reader-border)] bg-[var(--reader-surface)]">
            {book.chapters.map((chapter) => (
              <li key={chapter.id}>
                <Link
                  href={`/book/${book.slug}/chapter/${chapter.orderIndex}`}
                  className="flex items-center justify-between gap-4 px-4 py-3 text-sm transition-colors hover:bg-[var(--reader-bg)]"
                >
                  <span className="truncate text-[var(--reader-foreground)]">
                    {chapter.orderIndex}. {chapter.judul}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {!chapter.isFree && (
                      <User className="h-3.5 w-3.5 text-[var(--reader-muted)]" aria-label="Perlu login" />
                    )}
                    {chapter.publishedAt && (
                      <span className="text-xs text-[var(--reader-muted)]">{formatDate(chapter.publishedAt)}</span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
