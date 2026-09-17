'use client';

import { useState } from 'react';
import { Loader2, MessageCircle, X } from 'lucide-react';

import type { BookChapterSummary, BookDetailDto } from '@/lib/public-types';
import { CommentSheet } from './comment-sheet';

const API_BASE = process.env.NEXT_PUBLIC_BOOKPEDIA_API_URL ?? 'http://localhost:5020';

type BookCommentsButtonProps = {
  platformSlug: string;
  bookSlug: string;
  commentCount: number;
  iconOnly?: boolean;
  className?: string;
};

export function BookCommentsButton({ platformSlug, bookSlug, commentCount, iconOnly = false, className }: BookCommentsButtonProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [chapters, setChapters] = useState<BookChapterSummary[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<BookChapterSummary | null>(null);

  async function openPicker() {
    setPickerOpen(true);
    if (chapters.length > 0) return;

    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE}/public/platforms/${encodeURIComponent(platformSlug)}/books/${encodeURIComponent(bookSlug)}`,
        { cache: 'no-store' },
      );
      if (!response.ok) throw new Error(`Book request failed: ${response.status}`);
      const book = (await response.json()) as BookDetailDto;
      setChapters(book.chapters);
    } catch (error) {
      console.error('[BookCommentsButton] gagal memuat daftar Chapter:', error);
      setChapters([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void openPicker();
        }}
        className={className ?? 'flex items-center gap-1 text-xs text-[var(--reader-muted)] hover:text-[var(--reader-terracotta)]'}
        aria-label={`Lihat ${commentCount} komentar Book`}
        title="Lihat komentar per Chapter"
      >
        <MessageCircle className="h-3 w-3" />
        <span>{commentCount.toLocaleString('id-ID')}</span>
        {!iconOnly && <span>komentar</span>}
      </button>

      {pickerOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <button type="button" aria-label="Tutup pilihan Chapter" onClick={() => setPickerOpen(false)} className="absolute inset-0 bg-black/40" />
          <div className="relative flex max-h-[80vh] w-full max-w-[520px] flex-col rounded-t-2xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[var(--reader-border)] px-4 py-3">
              <h2 className="text-sm font-semibold text-[var(--reader-foreground)]">Pilih Chapter untuk melihat komentar</h2>
              <button type="button" onClick={() => setPickerOpen(false)} aria-label="Tutup" className="rounded-full p-1.5 text-[var(--reader-muted)] hover:bg-[var(--reader-border)]/40">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-y-auto p-3">
              {loading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-[var(--reader-muted)]" /></div>
              ) : chapters.length === 0 ? (
                <p className="py-8 text-center text-sm text-[var(--reader-muted)]">Belum ada Chapter.</p>
              ) : (
                <div className="space-y-1">
                  {chapters.map((chapter) => (
                    <button
                      key={chapter.id}
                      type="button"
                      onClick={() => {
                        setSelectedChapter(chapter);
                        setPickerOpen(false);
                      }}
                      className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm text-[var(--reader-foreground)] hover:bg-[var(--reader-bg)]"
                    >
                      <span className="min-w-0 truncate">{chapter.orderIndex}. {chapter.judul}</span>
                      <span className="flex shrink-0 items-center gap-1 text-xs text-[var(--reader-muted)]">
                        <MessageCircle className="h-3.5 w-3.5" />
                        {chapter.commentCount ?? 0}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedChapter && (
        <CommentSheet
          chapterId={selectedChapter.id}
          platformSlug={platformSlug}
          bookSlug={bookSlug}
          orderIndex={selectedChapter.orderIndex}
          open
          onClose={() => setSelectedChapter(null)}
        />
      )}
    </>
  );
}
