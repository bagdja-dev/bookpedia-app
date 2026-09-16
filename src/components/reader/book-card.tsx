import Link from 'next/link';
import { Eye, Heart, ListFilter, MessageCircle } from 'lucide-react';

import { BOOK_STATUS_LABEL } from '@/lib/status';
import { BOOK_TYPE_BADGE_LABEL, formatBookByline } from '@/lib/book-byline';
import { buildSimilarBooksHref } from '@/lib/book-filter-href';
import { formatCompactCount } from '@/lib/format';
import { SafeImage } from '@/components/safe-image';
import { StarRatingDisplay } from '@/components/reader/star-rating-display';
import type { BookCatalogDto } from '@/lib/public-types';

const STATUS_DOT: Record<BookCatalogDto['status'], string> = {
  draft: 'bg-[var(--reader-muted)]',
  ongoing: 'bg-[var(--reader-olive)]',
  completed: 'bg-[var(--reader-terracotta)]',
};

/**
 * Card Book dipakai di katalog pusat & grid profil Library.
 *
 * Fase 6 (16 Sep 2026): Category (sebelumnya cuma tampil di detail Book,
 * bukan di card) dan Tag (baru sama sekali) ditambahkan sebagai chip yang
 * bisa diklik — arahkan ke katalog pusat dengan filter `?category=`/`?genre=`
 * /`?tag=`. Karena chip-chip itu perlu link SENDIRI (bukan ikut link Book),
 * card TIDAK LAGI satu `<Link>` besar membungkus semuanya (nested `<a>`
 * tidak valid) — cover+judul+byline dibungkus satu `<Link>`, baris chip jadi
 * elemen terpisah di luar Link itu.
 */
export function BookCard({
  book,
  showStatus = true,
  showRating = true,
  showLike = true,
  showComment = true,
}: {
  book: BookCatalogDto;
  showStatus?: boolean;
  /** Fase 7 (susulan) — kalau true DAN book.ratingCount > 0, tampilkan agregat rating di card. */
  showRating?: boolean;
  /** Fase 8 (susulan) — ikut `platform.enableLike`, sembunyikan statistik Like kalau Platform mematikannya. */
  showLike?: boolean;
  /** Fase 8 (susulan) — ikut `platform.enableComment`. */
  showComment?: boolean;
}) {
  const similarHref = buildSimilarBooksHref(book);

  return (
    <div className="group flex flex-col overflow-hidden rounded-lg border border-[var(--reader-border)] bg-[var(--reader-surface)] transition-shadow hover:shadow-md">
      <Link href={`/book/${book.slug}`} className="flex flex-1 flex-col">
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-[var(--reader-bg)]">
          {book.coverUrl ? (
            <SafeImage
              src={book.coverUrl}
              alt={book.judul}
              fill
              sizes="(min-width: 1024px) 200px, (min-width: 640px) 33vw, 50vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-3xl font-semibold text-[var(--reader-muted)]" style={{ fontFamily: 'var(--font-source-serif)' }}>
              {book.judul.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1 p-3 pb-0">
          <h3
            className="line-clamp-2 text-sm font-semibold text-[var(--reader-foreground)]"
            style={{ fontFamily: 'var(--font-source-serif)' }}
          >
            {book.judul}
          </h3>
          <p className="text-xs text-[var(--reader-muted)]">{formatBookByline(book)}</p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 text-xs text-[var(--reader-muted)]">
              <Eye className="h-3 w-3" />
              {formatCompactCount(book.viewCount)}
            </span>
            {showLike && (
              <span className="flex items-center gap-1 text-xs text-[var(--reader-muted)]">
                <Heart className="h-3 w-3" />
                {formatCompactCount(book.likeCount)}
              </span>
            )}
            {showComment && (
              <span className="flex items-center gap-1 text-xs text-[var(--reader-muted)]">
                <MessageCircle className="h-3 w-3" />
                {formatCompactCount(book.commentCount ?? 0)}
              </span>
            )}
            {showRating && book.ratingCount > 0 && (
              <StarRatingDisplay average={book.ratingAverage} count={book.ratingCount} />
            )}
          </div>
        </div>
      </Link>

      <div className="mt-auto flex flex-wrap items-center gap-1.5 px-3 pb-3 pt-1">
        {book.bookType !== 'original' && (
          <span className="rounded-full bg-[var(--reader-terracotta)]/10 px-2 py-0.5 text-[11px] font-medium text-[var(--reader-terracotta)]">
            {BOOK_TYPE_BADGE_LABEL[book.bookType]}
          </span>
        )}
        {book.category && (
          <Link
            href={`/?category=${encodeURIComponent(book.category.slug)}`}
            className="rounded-full bg-[var(--reader-bg)] px-2 py-0.5 text-[11px] text-[var(--reader-muted)] hover:text-[var(--reader-terracotta)]"
          >
            {book.category.nama}
          </Link>
        )}
        {book.genre && (
          <Link
            href={`/?genre=${encodeURIComponent(book.genre.slug)}`}
            className="rounded-full bg-[var(--reader-bg)] px-2 py-0.5 text-[11px] text-[var(--reader-muted)] hover:text-[var(--reader-terracotta)]"
          >
            {book.genre.nama}
          </Link>
        )}
        {book.tags.slice(0, 3).map((tag) => (
          <Link
            key={tag.id}
            href={`/?tag=${encodeURIComponent(tag.slug)}`}
            className="rounded-full border border-[var(--reader-border)] px-2 py-0.5 text-[11px] text-[var(--reader-muted)] hover:border-[var(--reader-terracotta)] hover:text-[var(--reader-terracotta)]"
          >
            #{tag.nama}
          </Link>
        ))}
        {showStatus && (
          <span className="flex items-center gap-1 text-[11px] text-[var(--reader-muted)]">
            <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[book.status]}`} />
            {BOOK_STATUS_LABEL[book.status]}
          </span>
        )}
        {similarHref && (
          <Link
            href={similarHref}
            title="Cari cerita serupa (Category, Genre & Tag yang sama)"
            aria-label="Cari cerita serupa"
            className="ml-auto shrink-0 rounded-full p-1 text-[var(--reader-muted)] hover:bg-[var(--reader-bg)] hover:text-[var(--reader-terracotta)]"
          >
            <ListFilter className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
    </div>
  );
}
