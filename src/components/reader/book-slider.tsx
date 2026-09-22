'use client';

import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { BookCard } from '@/components/reader/book-card';
import type { BookCatalogDto } from '@/lib/public-types';

export function BookSlider({
  books,
  platformSlug,
  showStatus,
  showRating,
  showLike,
  showComment,
  layout = 'slider',
}: {
  books: BookCatalogDto[];
  platformSlug: string;
  showStatus?: boolean;
  showRating?: boolean;
  showLike?: boolean;
  showComment?: boolean;
  layout?: 'grid' | 'slider';
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  function scroll(direction: 'left' | 'right') {
    scrollerRef.current?.scrollBy({ left: direction === 'left' ? -320 : 320, behavior: 'smooth' });
  }

  return (
    <div className="relative">
      {layout === 'grid' ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {books.map((book) => (
            <BookCard key={book.id} book={book} platformSlug={platformSlug} showStatus={showStatus} showRating={showRating} showLike={showLike} showComment={showComment} />
          ))}
        </div>
      ) : (
      <div
        ref={scrollerRef}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Daftar buku"
      >
        {books.map((book) => (
          <div key={book.id} className="w-[min(68vw,210px)] shrink-0 snap-start sm:w-[210px]">
            <BookCard
              book={book}
              platformSlug={platformSlug}
              showStatus={showStatus}
              showRating={showRating}
              showLike={showLike}
              showComment={showComment}
            />
          </div>
        ))}
      </div>
      )}
      {layout === 'grid' ? null : (
      <div className="pointer-events-none absolute inset-y-0 left-0 right-0 flex items-center justify-between">
        <button
          type="button"
          aria-label="Geser buku ke kiri"
          onClick={() => scroll('left')}
          className="pointer-events-auto ml-1 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--reader-border)] bg-[var(--reader-surface)]/95 text-[var(--reader-foreground)] shadow-sm transition-colors hover:text-[var(--reader-terracotta)]"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Geser buku ke kanan"
          onClick={() => scroll('right')}
          className="pointer-events-auto mr-1 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--reader-border)] bg-[var(--reader-surface)]/95 text-[var(--reader-foreground)] shadow-sm transition-colors hover:text-[var(--reader-terracotta)]"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      )}
    </div>
  );
}