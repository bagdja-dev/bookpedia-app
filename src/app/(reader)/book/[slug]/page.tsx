import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BookOpen, BookOpenText, Eye, Heart, ListFilter, MessageCircle, User } from 'lucide-react';
import { ContinueReadingButton } from '@/components/reader/continue-reading-button';
import { BookRatingWidget } from '@/components/reader/book-rating-widget';
import { SafeImage } from '@/components/safe-image';
import { SendMessageToLibraryButton } from '@/components/reader/send-message-to-library-button';
import { StarRatingDisplay } from '@/components/reader/star-rating-display';
import { BookCommentsButton } from '@/components/reader/book-comments-button';
import { ChapterCommentsButton } from '@/components/reader/chapter-comments-button';
import { BookSlider } from '@/components/reader/book-slider';
import { Badge } from '@/components/ui/badge';
import { BOOK_STATUS_LABEL, BOOK_STATUS_VARIANT } from '@/lib/status';
import { BOOK_TYPE_BADGE_LABEL, formatBookByline, formatBookBylinePrefix } from '@/lib/book-byline';
import { buildSimilarBooksHref } from '@/lib/book-filter-href';
import { getPlatformSlug } from '@/lib/platform';
import { getPlatformConfig, publicFetch } from '@/lib/public-api';
import { resolveOriginFromHeaders } from '@/lib/resolve-origin';
import { buildSocialMetadata, resolveSeoTemplates, toAbsoluteUrl, toJsonLdScript } from '@/lib/seo';
import type { BookDetailDto, SimilarBooksResponse } from '@/lib/public-types';

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
  const bookTypeLabel = book.bookType === 'original' ? 'Original' : BOOK_TYPE_BADGE_LABEL[book.bookType];
  const fallbackTitle = `${book.judul}${bookTypeLabel ? ` (${bookTypeLabel})` : ''} — ${config.nama}`;
  const fallbackDescription = book.sinopsis
    ? bookTypeLabel
      ? `${bookTypeLabel} — ${book.sinopsis}`
      : book.sinopsis
    : `Baca ${book.judul} (${formatBookByline(book)}) di ${config.nama}.`;
  const explicitBookSeo = {
    h1: book.seoH1 || book.judul,
    title: book.seoTitle || book.judul,
    description: book.seoDescription || fallbackDescription,
    ogTitle: book.seoOgTitle || book.judul,
    ogDescription: book.seoOgDescription || fallbackDescription,
    ogType: book.seoOgType || 'book',
    prefix: book.seoPrefix,
    suffix: book.seoSuffix,
  };

  const seo = resolveSeoTemplates(
    [
      explicitBookSeo,
      { h1: book.library.nama, title: `${book.judul} — ${book.library.nama}`, description: fallbackDescription, ogType: 'book', prefix: book.seoPrefix, suffix: book.seoSuffix },
      { h1: config.seoDefaultH1, title: config.seoDefaultTitle, description: config.seoDefaultDescription, ogTitle: config.seoDefaultOgTitle, ogDescription: config.seoDefaultOgDescription, ogType: config.seoDefaultOgType, prefix: config.seoPrefix, suffix: config.seoSuffix },
    ],
    { title: book.judul, platform: config.nama, library: book.library.nama, author: book.library.nama, bookType: bookTypeLabel },
    { title: fallbackTitle, description: fallbackDescription, h1: book.judul, ogType: 'book' },
  );
  return {
    title: seo.title,
    description: seo.description,
    alternates: { canonical: `/book/${book.slug}` },
    ...buildSocialMetadata({
      title: seo.ogTitle,
      description: seo.ogDescription,
      imageUrl: book.coverUrl,
      imageAlt: `Sampul novel ${book.judul}${bookTypeLabel ? ` ${bookTypeLabel}` : ''}`,
      type: seo.ogType,
    }),
  };
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default async function BookDetailPage({ params }: BookPageProps) {
  const { slug: bookSlug } = await params;
  const platformSlug = await getPlatformSlug();
  const [config, book, similarBooks] = await Promise.all([
    getPlatformConfig(platformSlug),
    publicFetch<BookDetailDto>(`/public/platforms/${platformSlug}/books/${bookSlug}`),
    publicFetch<SimilarBooksResponse>(`/public/platforms/${platformSlug}/books/${bookSlug}/similar`),
  ]);

  if (!book) {
    notFound();
  }

  const bookTypeLabel = book.bookType === 'original' ? 'Original' : BOOK_TYPE_BADGE_LABEL[book.bookType];
  const explicitBookSeo = {
    h1: book.seoH1 || book.judul,
    title: book.seoTitle || book.judul,
    description: book.seoDescription || book.sinopsis || '',
    ogTitle: book.seoOgTitle || book.judul,
    ogDescription: book.seoOgDescription || book.sinopsis || '',
    ogType: book.seoOgType || 'book',
    prefix: book.seoPrefix,
    suffix: book.seoSuffix,
  };

  const pageSeo = resolveSeoTemplates(
    [
      explicitBookSeo,
      { h1: book.library.nama, title: `${book.judul} — ${book.library.nama}`, description: book.sinopsis ?? '', ogType: 'book', prefix: book.seoPrefix, suffix: book.seoSuffix },
      { h1: config.seoDefaultH1, title: config.seoDefaultTitle, description: config.seoDefaultDescription, ogType: config.seoDefaultOgType, prefix: config.seoPrefix, suffix: config.seoSuffix },
    ],
    { title: book.judul, platform: config.nama, library: book.library.nama, author: book.library.nama, bookType: bookTypeLabel },
    { title: book.judul, description: book.sinopsis ?? '', h1: book.judul, ogType: 'book' },
  );

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
    ...(toAbsoluteUrl(book.coverUrl, origin) ? { image: toAbsoluteUrl(book.coverUrl, origin) } : {}),
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
          <div className="relative aspect-[3/4] w-full bg-[var(--reader-bg)]">
            {book.coverUrl ? (
              <SafeImage
                src={book.coverUrl}
                alt={`Sampul novel ${book.judul}${bookTypeLabel ? ` ${bookTypeLabel}` : ''}`}
                fill
                priority
                sizes="(min-width: 640px) 224px, 160px"
                className="object-cover"
              />
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
            {pageSeo.h1}
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
                <SafeImage
                  src={book.library.coverUrl}
                  alt={book.library.nama}
                  width={40}
                  height={40}
                  className="h-full w-full object-cover"
                />
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
            <SendMessageToLibraryButton libraryId={book.library.id} />
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
              <BookCommentsButton
                platformSlug={platformSlug}
                bookSlug={book.slug}
                commentCount={book.commentCount ?? 0}
                className="flex items-center gap-1 text-xs text-[var(--reader-muted)] hover:text-[var(--reader-terracotta)]"
              />
            )}
          </div>

          {config.enableRating && (
            <div className="flex items-center gap-3">
              <StarRatingDisplay average={book.ratingAverage} count={book.ratingCount} size="md" />
              {config.ratingMode === 'book' && <BookRatingWidget bookId={book.id} />}
            </div>
          )}

          {book.series && (
            <div className="flex flex-wrap items-center gap-1.5">
              <Link
                href={`/series/${book.series.id}`}
                className="inline-flex max-w-full items-center gap-1 overflow-hidden rounded-full border border-[var(--reader-border)] bg-[var(--reader-bg)] px-2 py-0.5 text-xs text-[var(--reader-muted)] hover:border-[var(--reader-terracotta)] hover:text-[var(--reader-terracotta)]"
              >
                <BookOpenText className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{book.series.nama}</span>
              </Link>
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
            <div className="space-y-3 text-sm leading-relaxed text-[var(--reader-foreground)]/90">
              {book.sinopsis.split(/\n\s*\n/).map((paragraph, index) => (
                <p key={`${index}-${paragraph.slice(0, 20)}`} className="whitespace-pre-line">
                  {paragraph}
                </p>
              ))}
            </div>
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
              <li key={chapter.id} className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--reader-bg)]">
                <Link
                  href={`/book/${book.slug}/chapter/${chapter.orderIndex}`}
                  className="flex min-w-0 flex-1 flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                >
                  <span className="truncate text-[var(--reader-foreground)] sm:min-w-0 sm:flex-1">
                    {chapter.orderIndex}. {chapter.judul}
                  </span>
                  <span className="flex flex-wrap items-center gap-2 sm:shrink-0">
                    <span className="flex items-center gap-1 text-xs text-[var(--reader-muted)]">
                      <Eye className="h-3.5 w-3.5" />
                      {(chapter.viewCount ?? 0).toLocaleString('id-ID')}
                    </span>
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
                {config.enableComment && (
                  <ChapterCommentsButton
                    chapterId={chapter.id}
                    platformSlug={platformSlug}
                    bookSlug={book.slug}
                    orderIndex={chapter.orderIndex}
                    commentCount={chapter.commentCount ?? 0}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {similarBooks && similarBooks.promoted.length > 0 && (
        <div className="mt-10">
          <h2
            className="mb-3 text-lg font-semibold text-[var(--reader-foreground)]"
            style={{ fontFamily: 'var(--font-source-serif)' }}
          >
            Rekomendasi Penulis
          </h2>
          <BookSlider books={similarBooks.promoted} platformSlug={platformSlug} />
        </div>
      )}

      {similarBooks && similarBooks.related.length > 0 && (
        <div className="mt-10">
          <h2
            className="mb-3 text-lg font-semibold text-[var(--reader-foreground)]"
            style={{ fontFamily: 'var(--font-source-serif)' }}
          >
            Cerita Serupa
          </h2>
          <BookSlider books={similarBooks.related} platformSlug={platformSlug} />
        </div>
      )}

      {similarBooks && similarBooks.others.length > 0 && (
        <div className="mt-10">
          <h2
            className="mb-3 text-lg font-semibold text-[var(--reader-foreground)]"
            style={{ fontFamily: 'var(--font-source-serif)' }}
          >
            Cerita Lainnya
          </h2>
          <BookSlider books={similarBooks.others} platformSlug={platformSlug} />
        </div>
      )}
    </div>
  );
}
