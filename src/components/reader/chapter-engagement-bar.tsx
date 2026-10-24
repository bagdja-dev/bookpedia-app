'use client';

import { useEffect, useState } from 'react';
import { Heart, Layers, ListOrdered, MessageCircle, Share2 } from 'lucide-react';
import { shareLink } from '@/lib/share-link';

import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import type { BookCatalogDto, BookChapterSummary } from '@/lib/public-types';
import { CommentSheet } from './comment-sheet';
import { ChapterNavigationSheet } from './chapter-navigation-sheet';
import { SameCollectionSheet } from './same-collection-sheet';

interface ToggleLikeResponse {
  liked: boolean;
  likeCount: number;
}

interface ChapterEngagementBarProps {
  chapterId: string;
  platformSlug: string;
  bookSlug: string;
  bookTitle?: string;
  orderIndex: number;
  initialLikeCount: number;
  initialCommentCount: number;
  enableLike: boolean;
  enableComment: boolean;
  enableShare: boolean;
  chapters?: BookChapterSummary[];
  collectionTitle?: string;
  collectionBooks?: BookCatalogDto[];
  isSeries?: boolean;
}

/**
 * Bottom Bar Reader — mengelompokkan navigasi baca (Daftar Chapter & Koleksi yang Sama)
 * serta kontrol engagement (Like/Comment/Share) dalam satu pill group terpusat di bawah viewport.
 */
export function ChapterEngagementBar({
  chapterId,
  platformSlug,
  bookSlug,
  bookTitle = 'Buku',
  orderIndex,
  initialLikeCount,
  initialCommentCount,
  enableLike,
  enableComment,
  enableShare,
  chapters,
  collectionTitle,
  collectionBooks,
  isSeries,
}: ChapterEngagementBarProps) {
  const { isLoggedIn, loading } = useAuth();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [submitting, setSubmitting] = useState(false);
  const [commentOpen, setCommentOpen] = useState(false);
  const [chapterNavOpen, setChapterNavOpen] = useState(false);
  const [collectionOpen, setCollectionOpen] = useState(false);

  useEffect(() => {
    if (!enableLike || loading || !isLoggedIn) return;
    apiClient<ToggleLikeResponse>(`/likes/chapter/${chapterId}`)
      .then((res) => {
        setLiked(res.liked);
        setLikeCount(res.likeCount);
      })
      .catch(() => {
        // Gagal-senyap — status like awal tidak fatal untuk pengalaman baca.
      });
  }, [enableLike, loading, isLoggedIn, chapterId]);

  async function toggleLike() {
    if (loading) return;
    if (!isLoggedIn) {
      window.location.href = `/auth/login?next=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    if (submitting) return;

    const prevLiked = liked;
    const prevCount = likeCount;
    setSubmitting(true);
    setLiked(!prevLiked);
    setLikeCount(prevLiked ? prevCount - 1 : prevCount + 1);

    try {
      const res = await apiClient<ToggleLikeResponse>(`/likes/chapter/${chapterId}/toggle`, { method: 'POST' });
      setLiked(res.liked);
      setLikeCount(res.likeCount);
    } catch (err) {
      console.error('[ChapterEngagementBar] gagal toggle like:', err);
      setLiked(prevLiked);
      setLikeCount(prevCount);
    } finally {
      setSubmitting(false);
    }
  }

  async function share() {
    // Yang dibagikan halaman preview (paragraf pertama + ajakan login) — terbaca crawler
    // SEO & kartu sosmed, termasuk untuk Chapter yang perlu login.
    await shareLink(`${window.location.origin}/book/${encodeURIComponent(bookSlug)}/chapter/${orderIndex}/preview`);
  }

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 sm:px-4 pointer-events-none">
        <div className="mb-4 flex items-center gap-0.5 sm:gap-1 rounded-full border border-[var(--reader-border)] bg-[var(--reader-surface)]/95 p-1.5 sm:px-3 sm:py-2 shadow-xl backdrop-blur pointer-events-auto">
          {/* Tombol 1: Navigasi Chapter */}
          <button
            type="button"
            onClick={() => setChapterNavOpen(true)}
            title="Daftar & Navigasi Chapter"
            aria-label="Buka navigasi chapter"
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs sm:text-sm text-[var(--reader-foreground)] transition-colors hover:bg-[var(--reader-border)]/40 active:scale-95"
          >
            <ListOrdered className="h-4 w-4 sm:h-5 sm:w-5 text-[var(--reader-muted)]" />
            <span className="font-medium">Bab {orderIndex}</span>
          </button>

          {/* Tombol 2: Koleksi Buku yang Sama */}
          <button
            type="button"
            onClick={() => setCollectionOpen(true)}
            title="Koleksi / Seri Buku yang Sama"
            aria-label="Buka daftar buku koleksi yang sama"
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs sm:text-sm text-[var(--reader-foreground)] transition-colors hover:bg-[var(--reader-border)]/40 active:scale-95"
          >
            <Layers className="h-4 w-4 sm:h-5 sm:w-5 text-[var(--reader-muted)]" />
            <span className="hidden sm:inline font-medium">Koleksi</span>
          </button>

          {/* Divider pemisah antara navigasi dan engagement sosial */}
          {(enableLike || enableComment || enableShare) && (
            <div className="mx-0.5 sm:mx-1 h-4 w-px bg-[var(--reader-border)] shrink-0" aria-hidden="true" />
          )}

          {/* Tombol 3: Like */}
          {enableLike && (
            <button
              type="button"
              onClick={toggleLike}
              disabled={submitting}
              title={liked ? 'Batalkan Like Chapter ini' : 'Like Chapter ini'}
              aria-label={liked ? 'Batalkan Like Chapter ini' : 'Like Chapter ini'}
              className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs sm:text-sm text-[var(--reader-foreground)] transition-colors hover:bg-[var(--reader-border)]/40 active:scale-95 disabled:opacity-50"
            >
              <Heart
                className={`h-4 w-4 sm:h-5 sm:w-5 ${
                  liked ? 'fill-[var(--reader-terracotta)] text-[var(--reader-terracotta)]' : 'text-[var(--reader-muted)]'
                }`}
              />
              <span>{likeCount}</span>
            </button>
          )}

          {/* Tombol 4: Komentar */}
          {enableComment && (
            <button
              type="button"
              onClick={() => setCommentOpen(true)}
              title="Lihat Komentar"
              aria-label="Lihat komentar"
              className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs sm:text-sm text-[var(--reader-muted)] transition-colors hover:bg-[var(--reader-border)]/40 active:scale-95"
            >
              <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>{initialCommentCount}</span>
            </button>
          )}

          {/* Tombol 5: Share */}
          {enableShare && (
            <button
              type="button"
              onClick={share}
              title="Bagikan Chapter ini"
              aria-label="Bagikan Chapter ini"
              className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs sm:text-sm text-[var(--reader-muted)] transition-colors hover:bg-[var(--reader-border)]/40 active:scale-95"
            >
              <Share2 className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Popups / Sheets */}
      <ChapterNavigationSheet
        open={chapterNavOpen}
        onClose={() => setChapterNavOpen(false)}
        bookSlug={bookSlug}
        bookTitle={bookTitle}
        currentOrderIndex={orderIndex}
        chapters={chapters}
        platformSlug={platformSlug}
      />

      <SameCollectionSheet
        open={collectionOpen}
        onClose={() => setCollectionOpen(false)}
        platformSlug={platformSlug}
        bookSlug={bookSlug}
        bookTitle={bookTitle}
        collectionTitle={collectionTitle}
        collectionBooks={collectionBooks}
        isSeries={isSeries}
      />

      {enableComment && (
        <CommentSheet
          chapterId={chapterId}
          platformSlug={platformSlug}
          bookSlug={bookSlug}
          orderIndex={orderIndex}
          open={commentOpen}
          onClose={() => setCommentOpen(false)}
        />
      )}
    </>
  );
}

