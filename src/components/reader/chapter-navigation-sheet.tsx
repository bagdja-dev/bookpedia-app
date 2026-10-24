'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowDownAZ, ArrowUpAZ, BookOpen, Check, ChevronLeft, ChevronRight, Lock, Search, X } from 'lucide-react';

import type { BookChapterSummary, BookDetailDto } from '@/lib/public-types';

interface ChapterNavigationSheetProps {
  open: boolean;
  onClose: () => void;
  bookSlug: string;
  bookTitle: string;
  currentOrderIndex: number;
  chapters?: BookChapterSummary[];
  platformSlug: string;
}

export function ChapterNavigationSheet({
  open,
  onClose,
  bookSlug,
  bookTitle,
  currentOrderIndex,
  chapters: initialChapters,
  platformSlug,
}: ChapterNavigationSheetProps) {
  const [fetchedChapters, setFetchedChapters] = useState<BookChapterSummary[]>([]);
  const chapters = initialChapters && initialChapters.length > 0 ? initialChapters : fetchedChapters;
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortAsc, setSortAsc] = useState(true);
  const activeItemRef = useRef<HTMLAnchorElement | null>(null);

  // Fetch chapters if not provided via props
  useEffect(() => {
    if (initialChapters && initialChapters.length > 0) return;
    if (!open) return;

    let cancelled = false;
    const loadChapters = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BOOKPEDIA_API_URL ?? 'http://localhost:5020'}/public/platforms/${encodeURIComponent(
            platformSlug
          )}/books/${encodeURIComponent(bookSlug)}`
        );
        const data: BookDetailDto | null = res.ok ? await res.json() : null;
        if (!cancelled && data?.chapters) {
          setFetchedChapters(data.chapters);
        }
      } catch (err) {
        console.error('[ChapterNavigationSheet] Gagal memuat chapter:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadChapters();

    return () => {
      cancelled = true;
    };
  }, [open, initialChapters, platformSlug, bookSlug]);

  // Auto-scroll to active chapter when opened
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      if (activeItemRef.current) {
        activeItemRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    }, 150);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  const filteredChapters = useMemo(() => {
    let list = chapters;
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      list = list.filter(
        (ch) =>
          ch.judul.toLowerCase().includes(query) ||
          ch.orderIndex.toString() === query ||
          `bab ${ch.orderIndex}`.includes(query) ||
          `chapter ${ch.orderIndex}`.includes(query)
      );
    }
    return list.slice().sort((a, b) => (sortAsc ? a.orderIndex - b.orderIndex : b.orderIndex - a.orderIndex));
  }, [chapters, searchQuery, sortAsc]);

  const currentIndexInList = chapters.findIndex((c) => c.orderIndex === currentOrderIndex);
  const prevChapter = currentIndexInList > 0 ? chapters[currentIndexInList - 1] : null;
  const nextChapter = currentIndexInList >= 0 && currentIndexInList < chapters.length - 1 ? chapters[currentIndexInList + 1] : null;

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
        aria-label="Navigasi Chapter"
        className="relative flex h-[82vh] max-h-[720px] w-full max-w-[620px] flex-col overflow-hidden rounded-t-2xl sm:rounded-2xl border-x border-t sm:border border-[var(--reader-border)] bg-[var(--reader-surface)] text-[var(--reader-foreground)] shadow-2xl"
      >
        {/* Grab handle for mobile */}
        <div className="flex shrink-0 justify-center pb-1 pt-2.5 sm:hidden" aria-hidden="true">
          <div className="h-1 w-10 rounded-full bg-[var(--reader-border)]" />
        </div>

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--reader-border)] px-4 sm:px-6 py-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--reader-terracotta)]/10 text-[var(--reader-terracotta)]">
              <BookOpen className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold leading-tight text-[var(--reader-foreground)] truncate">
                Daftar Chapter
              </h2>
              <p className="text-xs text-[var(--reader-muted)] truncate max-w-[280px] sm:max-w-[420px]">
                {bookTitle} {chapters.length > 0 && `• ${chapters.length} Chapter`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup navigasi chapter"
            className="rounded-full p-1.5 text-[var(--reader-muted)] transition-colors hover:bg-[var(--reader-border)]/40 hover:text-[var(--reader-foreground)]"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>

        {/* Quick Prev / Next Bar */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--reader-border)] bg-[var(--reader-bg)]/50 px-4 sm:px-6 py-2.5 text-xs sm:text-sm">
          {prevChapter ? (
            <Link
              href={`/book/${encodeURIComponent(bookSlug)}/chapter/${prevChapter.orderIndex}`}
              onClick={onClose}
              className="flex items-center gap-1 rounded-md px-2.5 py-1 text-[var(--reader-muted)] transition-colors hover:bg-[var(--reader-border)]/40 hover:text-[var(--reader-foreground)]"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Bab {prevChapter.orderIndex}</span>
            </Link>
          ) : (
            <span className="flex items-center gap-1 px-2.5 py-1 text-[var(--reader-muted)]/40">
              <ChevronLeft className="h-4 w-4" />
              <span>Awal Cerita</span>
            </span>
          )}

          <span className="font-medium text-[var(--reader-terracotta)]">
            Bab {currentOrderIndex} {chapters.length > 0 && `dari ${chapters.length}`}
          </span>

          {nextChapter ? (
            <Link
              href={`/book/${encodeURIComponent(bookSlug)}/chapter/${nextChapter.orderIndex}`}
              onClick={onClose}
              className="flex items-center gap-1 rounded-md px-2.5 py-1 text-[var(--reader-muted)] transition-colors hover:bg-[var(--reader-border)]/40 hover:text-[var(--reader-foreground)]"
            >
              <span>Bab {nextChapter.orderIndex}</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          ) : (
            <span className="flex items-center gap-1 px-2.5 py-1 text-[var(--reader-muted)]/40">
              <span>Bab Terakhir</span>
              <ChevronRight className="h-4 w-4" />
            </span>
          )}
        </div>

        {/* Search & Sort toolbar */}
        <div className="flex shrink-0 items-center gap-2 border-b border-[var(--reader-border)] px-4 sm:px-6 py-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--reader-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nomor atau judul bab..."
              className="w-full rounded-full border border-[var(--reader-border)] bg-[var(--reader-surface)] py-1.5 pl-8 pr-3 text-xs sm:text-sm text-[var(--reader-foreground)] outline-none transition-colors placeholder:text-[var(--reader-muted)]/60 focus:border-[var(--reader-terracotta)]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Bersihkan pencarian"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-[var(--reader-muted)] hover:text-[var(--reader-foreground)]"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setSortAsc(!sortAsc)}
            title={sortAsc ? 'Urutan: Bab Awal dulu (1→N)' : 'Urutan: Bab Akhir dulu (N→1)'}
            aria-label="Ganti arah urutan chapter"
            className="flex items-center gap-1 rounded-full border border-[var(--reader-border)] bg-[var(--reader-surface)] px-2.5 py-1.5 text-xs text-[var(--reader-muted)] transition-colors hover:bg-[var(--reader-border)]/30 hover:text-[var(--reader-foreground)]"
          >
            {sortAsc ? <ArrowDownAZ className="h-3.5 w-3.5" /> : <ArrowUpAZ className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{sortAsc ? '1→N' : 'N→1'}</span>
          </button>
        </div>

        {/* Chapter List */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-2 space-y-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-sm text-[var(--reader-muted)]">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--reader-terracotta)] border-t-transparent mb-2" />
              <span>Memuat daftar chapter...</span>
            </div>
          ) : filteredChapters.length === 0 ? (
            <div className="py-12 text-center text-sm text-[var(--reader-muted)]">
              {searchQuery ? `Tidak ada chapter yang cocok dengan "${searchQuery}".` : 'Belum ada chapter tersedia.'}
            </div>
          ) : (
            filteredChapters.map((chapter) => {
              const isActive = chapter.orderIndex === currentOrderIndex;
              return (
                <Link
                  key={chapter.id}
                  ref={isActive ? activeItemRef : undefined}
                  href={`/book/${encodeURIComponent(bookSlug)}/chapter/${chapter.orderIndex}`}
                  onClick={() => {
                    if (isActive) onClose();
                  }}
                  className={`group flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${
                    isActive
                      ? 'border border-[var(--reader-terracotta)]/40 bg-[var(--reader-terracotta)]/10 font-medium text-[var(--reader-foreground)] shadow-xs'
                      : 'border border-transparent hover:border-[var(--reader-border)] hover:bg-[var(--reader-border)]/25 text-[var(--reader-foreground)]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`flex h-6 min-w-6 items-center justify-center rounded-md px-1 text-xs font-semibold ${
                        isActive
                          ? 'bg-[var(--reader-terracotta)] text-[var(--reader-terracotta-foreground)]'
                          : 'bg-[var(--reader-border)]/50 text-[var(--reader-muted)] group-hover:text-[var(--reader-foreground)]'
                      }`}
                    >
                      {chapter.orderIndex}
                    </span>
                    <span className="truncate leading-tight">
                      {chapter.judul}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {isActive ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--reader-terracotta)]/20 px-2 py-0.5 text-[11px] font-medium text-[var(--reader-terracotta)]">
                        <Check className="h-3 w-3" />
                        <span className="hidden sm:inline">Sedang Dibaca</span>
                      </span>
                    ) : !chapter.isFree ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--reader-border)]/60 px-2 py-0.5 text-[11px] text-[var(--reader-muted)]">
                        <Lock className="h-2.5 w-2.5" />
                        <span className="hidden sm:inline">Kunci</span>
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                        Gratis
                      </span>
                    )}
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
