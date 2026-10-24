'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen, ChevronRight, Layers, Library, Sparkles, Star, X } from 'lucide-react';

import { SafeImage } from '@/components/safe-image';
import { BOOK_STATUS_LABEL } from '@/lib/status';
import type { BookCatalogDto, SimilarBooksResponse } from '@/lib/public-types';

interface SameCollectionSheetProps {
  open: boolean;
  onClose: () => void;
  platformSlug: string;
  bookSlug: string;
  bookTitle: string;
  collectionTitle?: string;
  collectionBooks?: BookCatalogDto[];
  isSeries?: boolean;
}

export function SameCollectionSheet({
  open,
  onClose,
  platformSlug,
  bookSlug,
  bookTitle,
  collectionTitle: initialCollectionTitle,
  collectionBooks: initialBooks,
  isSeries = false,
}: SameCollectionSheetProps) {
  const [fetchedBooks, setFetchedBooks] = useState<BookCatalogDto[]>([]);
  const [fetchedTitle, setFetchedTitle] = useState('');
  const [loading, setLoading] = useState(false);

  const books = initialBooks && initialBooks.length > 0 ? initialBooks : fetchedBooks;
  const title = initialCollectionTitle || fetchedTitle || (isSeries ? 'Serial Buku' : 'Koleksi yang Sama');

  // Fetch books if not provided via props
  useEffect(() => {
    if (initialBooks && initialBooks.length > 0) return;
    if (!open) return;

    let cancelled = false;
    const loadBooks = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BOOKPEDIA_API_URL ?? 'http://localhost:5020'}/public/platforms/${encodeURIComponent(
            platformSlug
          )}/books/${encodeURIComponent(bookSlug)}/similar`
        );
        const data: SimilarBooksResponse | null = res.ok ? await res.json() : null;
        if (!cancelled && data) {
          const combined = [...(data.related ?? []), ...(data.others ?? [])];
          setFetchedBooks(combined);
          setFetchedTitle(isSeries ? 'Buku Dalam Seri' : 'Koleksi Rekomendasi Terkait');
        }
      } catch (err) {
        console.error('[SameCollectionSheet] Gagal memuat koleksi buku:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadBooks();

    return () => {
      cancelled = true;
    };
  }, [open, initialBooks, platformSlug, bookSlug, isSeries]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal / Bottom Sheet Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Koleksi Buku yang Sama"
        className="relative flex h-[82vh] max-h-[720px] w-full max-w-[620px] flex-col overflow-hidden rounded-t-2xl sm:rounded-2xl border-x border-t sm:border border-[var(--reader-border)] bg-[var(--reader-surface)] text-[var(--reader-foreground)] shadow-2xl"
      >
        {/* Grab handle for mobile */}
        <div className="flex shrink-0 justify-center pb-1 pt-2.5 sm:hidden" aria-hidden="true">
          <div className="h-1 w-10 rounded-full bg-[var(--reader-border)]" />
        </div>

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--reader-border)] px-4 sm:px-6 py-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--reader-mustard)]/15 text-[var(--reader-mustard)]">
              {isSeries ? <Layers className="h-4 w-4" /> : <Library className="h-4 w-4" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="text-base font-semibold leading-tight text-[var(--reader-foreground)] truncate">
                  {title || (isSeries ? 'Serial Buku' : 'Koleksi yang Sama')}
                </h2>
                {isSeries && (
                  <span className="rounded-full bg-[var(--reader-terracotta)]/15 px-2 py-0.5 text-[10px] font-semibold text-[var(--reader-terracotta)]">
                    Serial
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--reader-muted)] truncate max-w-[280px] sm:max-w-[420px]">
                {isSeries ? `Buku dalam seri yang sama dengan "${bookTitle}"` : `Daftar buku dari koleksi terkait`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup daftar koleksi"
            className="rounded-full p-1.5 text-[var(--reader-muted)] transition-colors hover:bg-[var(--reader-border)]/40 hover:text-[var(--reader-foreground)]"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>

        {/* Info Banner */}
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--reader-border)] bg-[var(--reader-bg)]/40 px-4 sm:px-6 py-2 text-xs text-[var(--reader-muted)]">
          <span>{books.length} buku dalam koleksi ini</span>
          <Link
            href="/my/collections"
            onClick={onClose}
            className="font-medium text-[var(--reader-terracotta)] hover:underline flex items-center gap-0.5"
          >
            <span>Koleksi Saya</span>
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Books List */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3 space-y-2.5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-sm text-[var(--reader-muted)]">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--reader-terracotta)] border-t-transparent mb-2" />
              <span>Memuat daftar buku koleksi...</span>
            </div>
          ) : books.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-sm text-[var(--reader-muted)]">
              <Sparkles className="h-8 w-8 text-[var(--reader-muted)]/40 mb-2" />
              <p>Belum ada buku lain dalam koleksi ini.</p>
              <Link
                href="/"
                onClick={onClose}
                className="mt-3 rounded-full bg-[var(--reader-button-bg,var(--reader-terracotta))] px-4 py-1.5 text-xs font-medium text-[var(--reader-button-text,var(--reader-terracotta-foreground))]"
              >
                Jelajahi Katalog Buku
              </Link>
            </div>
          ) : (
            books.map((book) => {
              const isCurrent = book.slug === bookSlug;
              return (
                <div
                  key={book.id}
                  className={`group relative flex items-start gap-3.5 rounded-xl border p-3 transition-all ${
                    isCurrent
                      ? 'border-[var(--reader-terracotta)]/50 bg-[var(--reader-terracotta)]/8 shadow-xs'
                      : 'border-[var(--reader-border)] bg-[var(--reader-surface)] hover:border-[var(--reader-terracotta)]/40 hover:bg-[var(--reader-border)]/20'
                  }`}
                >
                  {/* Cover */}
                  <Link
                    href={`/book/${encodeURIComponent(book.slug)}`}
                    onClick={onClose}
                    className="relative h-20 w-14 sm:h-24 sm:w-16 shrink-0 overflow-hidden rounded-md border border-[var(--reader-border)] bg-[var(--reader-border)]/20 shadow-xs"
                  >
                    {book.coverUrl ? (
                      <SafeImage
                        src={book.coverUrl}
                        alt={book.judul}
                        fill
                        sizes="(max-width: 640px) 56px, 64px"
                        className="object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] text-[var(--reader-muted)] text-center p-1">
                        Sampul
                      </div>
                    )}
                  </Link>

                  {/* Details */}
                  <div className="flex flex-1 flex-col min-w-0 justify-between self-stretch">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {isCurrent && (
                          <span className="rounded-full bg-[var(--reader-terracotta)]/20 px-2 py-0.5 text-[10px] font-semibold text-[var(--reader-terracotta)]">
                            Sedang Dibaca
                          </span>
                        )}
                        {book.status && (
                          <span className="rounded-md border border-[var(--reader-border)] bg-[var(--reader-bg)] px-1.5 py-0.5 text-[10px] text-[var(--reader-muted)]">
                            {BOOK_STATUS_LABEL[book.status] ?? book.status}
                          </span>
                        )}
                        {book.ratingAverage > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-[var(--reader-mustard)]">
                            <Star className="h-3 w-3 fill-[var(--reader-mustard)] text-[var(--reader-mustard)]" />
                            {book.ratingAverage.toFixed(1)}
                          </span>
                        )}
                      </div>

                      <Link
                        href={`/book/${encodeURIComponent(book.slug)}`}
                        onClick={onClose}
                        className="mt-1 block font-semibold text-sm sm:text-base leading-snug text-[var(--reader-foreground)] hover:text-[var(--reader-terracotta)] line-clamp-2"
                      >
                        {book.judul}
                      </Link>

                      <p className="mt-0.5 text-xs text-[var(--reader-muted)] truncate">
                        {book.originalAuthor || book.library?.nama || 'Penulis'}
                      </p>
                    </div>

                    <div className="mt-2 flex items-center justify-between gap-2 pt-1 border-t border-[var(--reader-border)]/50">
                      <span className="text-[11px] text-[var(--reader-muted)] truncate">
                        {book.latestChapterTitle ? `${book.latestChapterTitle}` : 'Daftar bab tersedia'}
                      </span>

                      {isCurrent ? (
                        <span className="text-xs font-medium text-[var(--reader-terracotta)]">
                          Buku Aktif
                        </span>
                      ) : (
                        <Link
                          href={`/book/${encodeURIComponent(book.slug)}`}
                          onClick={onClose}
                          className="inline-flex items-center gap-1 rounded-full bg-[var(--reader-button-bg,var(--reader-terracotta))] px-3 py-1 text-xs font-medium text-[var(--reader-button-text,var(--reader-terracotta-foreground))] transition-opacity hover:opacity-90"
                        >
                          <BookOpen className="h-3 w-3" />
                          <span>Baca</span>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
