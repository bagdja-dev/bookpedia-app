'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Eye, Plus } from 'lucide-react';

import { LoadingSpinner } from '@/components/loading-spinner';
import { StarRatingDisplay } from '@/components/reader/star-rating-display';
import { BookCommentsButton } from '@/components/reader/book-comments-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { apiClient, ApiError } from '@/lib/api-client';
import { BOOK_STATUS_LABEL, BOOK_STATUS_VARIANT } from '@/lib/status';
import { usePlatformContext } from '@/context/platform-context';
import type { Book } from '@/lib/types';

function BookCover({ book }: { book: Book }) {
  if (book.coverUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- coverUrl bebas domain apapun, belum ada storage service terpusat (lihat plan/bookpedia/overview.md §8.2).
      <img
        src={book.coverUrl}
        alt={book.judul}
        className="aspect-[3/4] w-full rounded-t-xl object-cover"
      />
    );
  }
  return (
    <div className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-2 rounded-t-xl bg-muted text-muted-foreground">
      <BookOpen className="h-8 w-8" />
      <span className="text-xs">Belum ada cover</span>
    </div>
  );
}

function BookGrid({ books }: { books: Book[] }) {
  const { config, slug: platformSlug } = usePlatformContext();

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {books.map((book) => (
        <div
          key={book.id}
          className="group overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md"
        >
          <Link href={`/dashboard/books/${book.id}`}>
            <BookCover book={book} />
            <div className="flex flex-col gap-1.5 p-3">
            <span className="line-clamp-2 text-sm font-semibold leading-snug group-hover:underline">
              {book.judul}
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant={BOOK_STATUS_VARIANT[book.status]}>
                {BOOK_STATUS_LABEL[book.status]}
              </Badge>
              <Badge variant={book.publishedAt ? 'default' : 'secondary'}>
                {book.publishedAt ? 'Published' : 'Belum Dipublish'}
              </Badge>
              {book.genre && (
                <Badge variant="outline" className="text-muted-foreground">
                  {book.genre.nama}
                </Badge>
              )}
            </div>
            </div>
          </Link>
          <div className="flex items-center gap-3 px-3 pb-3 text-xs text-muted-foreground">
            <span
              className="flex items-center gap-1"
              title={`${book.viewCount.toLocaleString('id-ID')}x dibaca`}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>{book.viewCount.toLocaleString('id-ID')}</span>
            </span>
            <BookCommentsButton
              platformSlug={platformSlug}
              bookSlug={book.slug}
              commentCount={book.commentCount}
              iconOnly
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
            />
            {config.enableRating && book.ratingCount > 0 && (
              <StarRatingDisplay average={book.ratingAverage} count={book.ratingCount} />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 rounded-xl border border-dashed text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <BookOpen className="h-6 w-6" />
      </div>
      <h2 className="text-base font-semibold">Belum ada Book</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        Mulai karya pertamamu — buat Book baru untuk mulai menambahkan Chapter.
      </p>
      <Button asChild className="mt-1">
        <Link href="/dashboard/books/new">
          <Plus className="h-4 w-4" />
          Book Baru
        </Link>
      </Button>
    </div>
  );
}

export default function BooksPage() {
  const [books, setBooks] = useState<Book[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiClient<Book[]>('/books');
        if (!cancelled) setBooks(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Gagal memuat daftar Book');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Book</h1>
          <p className="text-sm text-muted-foreground">Kelola semua karya di Library kamu.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/books/new">
            <Plus className="h-4 w-4" />
            Book Baru
          </Link>
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">Gagal memuat daftar Book: {error}</p>}

      {!books && !error && <LoadingSpinner label="Memuat daftar Book…" />}

      {books && (books.length === 0 ? <EmptyState /> : <BookGrid books={books} />)}
    </div>
  );
}
