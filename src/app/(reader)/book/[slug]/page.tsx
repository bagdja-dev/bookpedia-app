import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BookOpen, Eye, Heart, ListFilter, MessageCircle, User } from 'lucide-react';
import { ContinueReadingButton } from '@/components/reader/continue-reading-button';
import { BookRatingWidget } from '@/components/reader/book-rating-widget';
import { StarRatingDisplay } from '@/components/reader/star-rating-display';
import { Badge } from '@/components/ui/badge';
import { BOOK_STATUS_LABEL, BOOK_STATUS_VARIANT } from '@/lib/status';
import { BOOK_TYPE_BADGE_LABEL, formatBookByline, formatBookBylinePrefix } from '@/lib/book-byline';
import { buildSimilarBooksHref } from '@/lib/book-filter-href';
import { getPlatformSlug } from '@/lib/platform';
import { getPlatformConfig, publicFetch } from '@/lib/public-api';
import { resolveOriginFromHeaders } from '@/lib/resolve-origin';
import { buildSocialMetadata, toJsonLdScript } from '@/lib/seo';
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
  // bookType masuk title+description (16 Sep 2026, susulan SEO Fase 1) —
  // badge "Terjemahan"/"Adaptasi" di body SAJA sinyalnya terlalu lemah buat
  // query gabungan (mis. "terjemahan The Early Spring") dibanding title/meta
  // description, yang jauh lebih dipentingkan Google.
  const bookTypeLabel = book.bookType !== 'original' ? BOOK_TYPE_BADGE_LABEL[book.bookType] : null;
  const title = `${book.judul}${bookTypeLabel ? ` (${bookTypeLabel})` : ''} — ${config.nama}`;
  const description = book.sinopsis
    ? bookTypeLabel
      ? `${bookTypeLabel} — ${book.sinopsis}`
      : book.sinopsis
    : `Baca ${book.judul} (${formatBookByline(book)}) di ${config.nama}.`;
  return {
    title,
    description,
    alternates: { canonical: `/book/${book.slug}` },
    ...buildSocialMetadata({ title, description, imageUrl: book.coverUrl }),
  };
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default async function BookDetailPage({ params }: BookPageProps) {
  const { slug: bookSlug } = await params;
  const platformSlug = await getPlatformSlug();
  const [config, book] = await Promise.all([
    getPlatformConfig(platformSlug),
    publicFetch<BookDetailDto>(`/public/platforms/${platformSlug}/books/${bookSlug}`),
  ]);

  if (!book) {
    notFound();
  }

  const firstChapter = book.chapters[0];
  const similarHref = buildSimilarBooksHref(book);

  // JSON-LD (SEO Fase 3, plan/bookpedia/seo-execution-plan.md §3.1) — Book
  // schema.org, supaya Google bisa tampilkan rich result (cover, penulis,
  // genre). Server-rendered, tidak butuh JS client.
  const origin = await resolveOriginFromHeaders();
  // `translationOfWork`/`isBasedOn` (16 Sep 2026, susulan) — vocab resmi
  // schema.org buat Book terjemahan/adaptasi, sinyal terstruktur tambahan
  // di luar title/description (lihat bookTypeLabel di generateMetadata).
  // Cuma disertakan kalau originalAuthor terisi (field opsional).
  const originalWorkJsonLd =
    book.bookType !== 'original' && book.originalAuthor
      ? book.bookType === 'translation'
        ? { translationOfWork: { '@type': 'Book', author: { '@type': 'Person', name: book.originalAuthor } } }
        : { isBasedOn: { '@type': 'CreativeWork', author: { '@type': 'Person', name: book.originalAuthor } } }
      : {};
  const bookJsonLd = toJsonLdScript({
    '@context': 'https://schema.org',
    '@type': 'Book',
    name: book.judul,
    url: `${origin}/book/${book.slug}`,
    ...(book.coverUrl ? { image: book.coverUrl } : {}),
    ...(book.sinopsis ? { description: book.sinopsis } : {}),
    author: { '@type': 'Person', name: book.library.nama },
    ...(book.genre ? { genre: book.genre.nama } : {}),
    ...originalWorkJsonLd,
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: bookJsonLd }} />
      <div className="flex flex-col items-start gap-6 sm:flex-row">
        <div className="w-40 shrink-0 self-start overflow-hidden rounded-lg border border-[var(--reader-border)] bg-[var(--reader-surface)] shadow-sm sm:w-56">
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

          <div className="flex items-center gap-2.5">
            <Link
              href={`/library/${book.library.slug}`}
              className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--reader-border)] bg-[var(--reader-bg)]"
            >
              {book.library.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- cover dari URL bebas milik penulis
                <img src={book.library.coverUrl} alt={book.library.nama} className="h-full w-full object-cover" />
              ) : (
                <span
                  className="text-base font-semibold text-[var(--reader-muted)]"
                  style={{ fontFamily: 'var(--font-source-serif)' }}
                >
                  {book.library.nama.charAt(0).toUpperCase()}
                </span>
              )}
            </Link>
            <div className="flex flex-col gap-0.5">
              <Link
                href={`/library/${book.library.slug}`}
                className="w-fit text-sm font-semibold text-[var(--reader-foreground)] hover:text-[var(--reader-terracotta)]"
              >
                {book.library.nama}
              </Link>
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="flex items-center gap-1 text-xs text-[var(--reader-muted)]">
                  <BookOpen className="h-3.5 w-3.5" />
                  {book.library.totalBooks.toLocaleString('id-ID')} karya
                </span>
                <span className="flex items-center gap-1 text-xs text-[var(--reader-muted)]">
                  <Eye className="h-3.5 w-3.5" />
                  {book.library.totalViews.toLocaleString('id-ID')} views
                </span>
                <span className="flex items-center gap-1 text-xs text-[var(--reader-muted)]">
                  <MessageCircle className="h-3.5 w-3.5" />
                  {book.library.totalComments.toLocaleString('id-ID')} komentar
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {config.showBookStatus && (
              <Badge variant={BOOK_STATUS_VARIANT[book.status]}>{BOOK_STATUS_LABEL[book.status]}</Badge>
            )}
            {book.bookType !== 'original' && (
              <span className="rounded-full bg-[var(--reader-terracotta)]/10 px-2.5 py-0.5 text-xs font-medium text-[var(--reader-terracotta)]">
                {BOOK_TYPE_BADGE_LABEL[book.bookType]}
              </span>
            )}
            {book.category && (
              <Link
                href={`/?category=${encodeURIComponent(book.category.slug)}`}
                className="rounded-full bg-[var(--reader-bg)] px-2.5 py-0.5 text-xs text-[var(--reader-muted)] hover:text-[var(--reader-terracotta)]"
              >
                {book.category.nama}
              </Link>
            )}
            {book.genre && (
              <Link
                href={`/?genre=${encodeURIComponent(book.genre.slug)}`}
                className="rounded-full bg-[var(--reader-bg)] px-2.5 py-0.5 text-xs text-[var(--reader-muted)] hover:text-[var(--reader-terracotta)]"
              >
                {book.genre.nama}
              </Link>
            )}
            <span className="text-xs text-[var(--reader-muted)]">{book.chapters.length} chapter</span>
            <span className="text-xs text-[var(--reader-muted)]">{book.viewCount.toLocaleString('id-ID')}x dibaca</span>
            {config.enableLike && (
              <span className="flex items-center gap-1 text-xs text-[var(--reader-muted)]">
                <Heart className="h-3.5 w-3.5" />
                {(book.likeCount ?? 0).toLocaleString('id-ID')}
              </span>
            )}
            {config.enableComment && (
              <span className="flex items-center gap-1 text-xs text-[var(--reader-muted)]">
                <MessageCircle className="h-3.5 w-3.5" />
                {(book.commentCount ?? 0).toLocaleString('id-ID')}
              </span>
            )}
          </div>

          {config.enableRating && (
            <div className="flex items-center gap-3">
              <StarRatingDisplay average={book.ratingAverage} count={book.ratingCount} size="md" />
              {config.ratingMode === 'book' && <BookRatingWidget bookId={book.id} />}
            </div>
          )}

          {book.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {book.tags.map((tag) => (
                <Link
                  key={tag.id}
                  href={`/?tag=${encodeURIComponent(tag.slug)}`}
                  className="rounded-full border border-[var(--reader-border)] px-2.5 py-0.5 text-xs text-[var(--reader-muted)] hover:border-[var(--reader-terracotta)] hover:text-[var(--reader-terracotta)]"
                >
                  #{tag.nama}
                </Link>
              ))}
            </div>
          )}

          {similarHref && (
            <Link
              href={similarHref}
              className="inline-flex w-fit items-center gap-1.5 rounded-full border border-[var(--reader-border)] px-3 py-1 text-xs text-[var(--reader-muted)] hover:border-[var(--reader-terracotta)] hover:text-[var(--reader-terracotta)]"
            >
              <ListFilter className="h-3.5 w-3.5" />
              Cari Cerita Serupa
            </Link>
          )}

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
                    {config.enableRating && config.ratingMode === 'chapter' && chapter.ratingCount > 0 && (
                      <StarRatingDisplay average={chapter.ratingAverage} count={chapter.ratingCount} />
                    )}
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
