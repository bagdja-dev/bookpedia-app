import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BookOpenText, Eye, User } from 'lucide-react';
import { ContinueReadingButton } from '@/components/reader/continue-reading-button';
import { BookRatingWidget } from '@/components/reader/book-rating-widget';
import { SafeImage } from '@/components/safe-image';
import { SendMessageToLibraryButton } from '@/components/reader/send-message-to-library-button';
import { StarRatingDisplay } from '@/components/reader/star-rating-display';
import { BookCommentsButton } from '@/components/reader/book-comments-button';
import { ChapterCommentsButton } from '@/components/reader/chapter-comments-button';
import { BookSlider } from '@/components/reader/book-slider';
import { AdSlot } from '@/components/reader/ad-slot';
import { BookCollectionAction } from '@/components/reader/book-collection-action';
import { BookShareButton } from '@/components/reader/book-share-button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
      <div className="flex flex-col gap-6 sm:flex-row items-start">
        {/* Cover */}
        <div className="relative w-44 shrink-0">
          <div className="aspect-[3/4] w-full overflow-hidden rounded-xl border border-[var(--reader-border)] bg-gradient-to-br from-pink-50 to-blue-50 shadow-sm relative group">
            {book.coverUrl ? (
              <SafeImage
                src={book.coverUrl}
                alt={`Sampul novel ${book.judul}${bookTypeLabel ? ` ${bookTypeLabel}` : ''}`}
                fill
                priority
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
            {/* Status badge */}
            {config.showBookStatus && (
              <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/90 backdrop-blur-sm px-2.5 py-1 text-xs font-semibold text-[var(--reader-terracotta)] shadow-sm ring-1 ring-[var(--reader-border)]/30">
                <span className="relative flex h-2 w-2 rounded-full bg-[var(--reader-terracotta)]">
                  <span className="absolute inset-0 rounded-full animate-ping opacity-40 bg-[var(--reader-terracotta)]" />
                </span>
                {BOOK_STATUS_LABEL[book.status]}
              </span>
            )}
            {/* Book type badge */}
            {book.bookType !== 'original' && (
              <span className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/90 backdrop-blur-sm px-2.5 py-1 text-xs font-semibold text-[var(--reader-terracotta)] shadow-sm ring-1 ring-[var(--reader-border)]/30">
                <span className="relative flex h-2 w-2 rounded-full bg-[var(--reader-terracotta)]">
                  <span className="absolute inset-0 rounded-full animate-ping opacity-40 bg-[var(--reader-terracotta)]" />
                </span>
                {BOOK_TYPE_BADGE_LABEL[book.bookType]}
              </span>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="flex flex-1 flex-col gap-3">
          <h1
            className="text-3xl font-bold text-[var(--reader-foreground)] sm:text-4xl leading-tight"
            style={{ fontFamily: 'var(--font-source-serif)' }}
          >
            {pageSeo.h1}
          </h1>

          <p className="text-base font-medium text-[var(--reader-foreground)] leading-relaxed">
            {formatBookBylinePrefix(book)}{' '}
            <Link
              href={`/library/${book.library.slug}`}
              className="underline-offset-2 hover:text-[var(--reader-terracotta)] hover:underline"
            >
              {book.library.nama}
            </Link>
          </p>

          {book.bookType !== 'original' && book.originalAuthor && (
            <p className="text-sm text-[var(--reader-muted)] leading-relaxed">
              Penulis asli:{' '}
              <Link
                href={`/author/${encodeURIComponent(book.originalAuthor)}`}
                className="font-medium underline-offset-2 hover:text-[var(--reader-terracotta)] hover:underline"
              >
                {book.originalAuthor}
              </Link>
            </p>
          )}

          {/* Info asli — hanya muncul kalau terisi DAN tipe bukan original */}
          {book.bookType !== 'original' && (
            <div className="grid grid-cols-2 gap-3 w-full">
              {book.originalTitle && (
                <Card className="rounded-xl border border-[var(--reader-border)] bg-[var(--reader-surface)] p-4">
                  <CardHeader>
                    <CardTitle className="text-xs font-semibold text-[var(--reader-muted)] uppercase tracking-wider leading-none">
                      Judul Asli
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-[var(--reader-foreground)] leading-tight truncate">
                      {book.originalTitle}
                    </p>
                  </CardContent>
                </Card>
              )}
              {book.originalAuthor && (
                <Card className="rounded-xl border border-[var(--reader-border)] bg-[var(--reader-surface)] p-4">
                  <CardHeader>
                    <CardTitle className="text-xs font-semibold text-[var(--reader-muted)] uppercase tracking-wider leading-none">
                      Penulis Asli
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="mt-1 flex items-center gap-2 text-sm text-[var(--reader-foreground)]">
                      <Link
                        href={`/author/${encodeURIComponent(book.originalAuthor)}`}
                        className="font-medium underline-offset-2 hover:text-[var(--reader-terracotta)] hover:underline"
                      >
                        {book.originalAuthor}
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )}
              {book.originalLink && (
                <Card className="rounded-xl border border-[var(--reader-border)] bg-[var(--reader-surface)] p-4">
                  <CardHeader>
                    <CardTitle className="text-xs font-semibold text-[var(--reader-muted)] uppercase tracking-wider leading-none">
                      Tautan Raw
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="mt-1">
                      <Link
                        href={book.originalLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-[var(--reader-terracotta)] underline-offset-2 hover:underline"
                      >
                        Buka karya asli ↗
                      </Link>
                      <p className="text-[10px] text-[var(--reader-muted)] mt-0.5 leading-tight">
                        Dukung karya asli jika mampu
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Stats — selalu ditampilkan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full mt-3">
            <Card className="rounded-xl border border-[var(--reader-border)] bg-[var(--reader-surface)] p-4">
              <CardHeader>
                <CardTitle className="text-xs font-semibold text-[var(--reader-muted)] uppercase tracking-wider leading-none">
                  Status
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant={BOOK_STATUS_VARIANT[book.status]}>
                    {BOOK_STATUS_LABEL[book.status]}
                  </Badge>
                  <span className="text-xs text-[var(--reader-muted)]">{book.chapters.length} Bab</span>
                </div>
              </CardContent>
            </Card>
            {book.series && (
              <Card className="rounded-xl border border-[var(--reader-border)] bg-[var(--reader-surface)] p-4">
                <CardHeader>
                  <CardTitle className="text-xs font-semibold text-[var(--reader-muted)] uppercase tracking-wider leading-none">
                    Series
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="mt-1 flex items-center gap-2 text-sm text-[var(--reader-foreground)]">
                    <BookOpenText className="h-3.5 w-3.5 shrink-0" />
                    <Link
                      href={`/series/${book.series.id}`}
                      className="font-medium underline-offset-2 hover:text-[var(--reader-terracotta)] hover:underline"
                    >
                      {book.series.nama}
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}
            <Card className="rounded-xl border border-[var(--reader-border)] bg-[var(--reader-surface)] p-4">
              <CardHeader>
                <CardTitle className="text-xs font-semibold text-[var(--reader-muted)] uppercase tracking-wider leading-none">
                  Total Dibaca
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="mt-1 flex flex-col gap-0.5">
                  <p className="text-sm font-semibold text-[var(--reader-foreground)]">
                    {book.viewCount.toLocaleString('id-ID')}
                  </p>
                  <p className="text-[10px] text-[var(--reader-muted)] leading-none">
                    view
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-xl border border-[var(--reader-border)] bg-[var(--reader-surface)] p-4">
              <CardHeader>
                <CardTitle className="text-xs font-semibold text-[var(--reader-muted)] uppercase tracking-wider leading-none">
                  Pembaca
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="mt-1 flex flex-col gap-0.5">
                  <p className="text-sm font-semibold text-[var(--reader-foreground)]">
                    {book.uniqueReaderCount.toLocaleString('id-ID')}
                  </p>
                  <p className="text-[10px] text-[var(--reader-muted)] leading-none">
                    reader
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-xl border border-[var(--reader-border)] bg-[var(--reader-surface)] p-4">
              <CardHeader>
                <CardTitle className="text-xs font-semibold text-[var(--reader-muted)] uppercase tracking-wider leading-none">
                  Total Like
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="mt-1 flex flex-col gap-0.5">
                  <p className="text-sm font-semibold text-[var(--reader-foreground)]">
                    {book.likeCount.toLocaleString('id-ID')}
                  </p>
                  <p className="text-[10px] text-[var(--reader-muted)] leading-none">
                    like
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tags */}
          {book.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mt-3">
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
        </div>
      </div>

      {book.sinopsis && (
        <div className="reading-text text-[var(--reader-foreground)]/90">
          {book.sinopsis.split(/\n\s*\n/).map((paragraph, index) => (
            <p key={`${index}-${paragraph.slice(0, 20)}`} className="whitespace-pre-line">
              {paragraph}
            </p>
          ))}
        </div>
      )}

      {book.disclaimerTemplate && (
        <div className="mt-6 rounded-lg border border-[var(--reader-border)] bg-[var(--reader-bg)] p-4">
          <p className="mb-2 text-xs font-semibold text-[var(--reader-terracotta)] uppercase tracking-wider">
            Disclaimer
          </p>
          <div className="reading-text text-[var(--reader-foreground)]/90 whitespace-pre-line">
            {book.disclaimerTemplate.content}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mt-8">
        <BookCollectionAction bookId={book.id} bookTitle={book.judul} />
        {config.enableShare && <BookShareButton bookSlug={book.slug} bookTitle={book.judul} />}
        {firstChapter && (
          <ContinueReadingButton
            bookId={book.id}
            slug={book.slug}
            firstChapterOrderIndex={firstChapter.orderIndex}
          />
        )}
      </div>

      <AdSlot slot={config.adSlots.bookDetail} borderColor={config.adSlots.borderColor} className="mt-8" />

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
