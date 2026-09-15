'use client';

import { useEffect, useState } from 'react';
import { Heart, MessageCircle, Share2 } from 'lucide-react';
import { toast } from 'sonner';

import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import { useScrollDirection } from '@/hooks/use-scroll-direction';
import { CommentSheet } from './comment-sheet';

interface ToggleLikeResponse {
  liked: boolean;
  likeCount: number;
}

interface ChapterEngagementBarProps {
  chapterId: string;
  platformSlug: string;
  bookSlug: string;
  orderIndex: number;
  initialLikeCount: number;
  enableLike: boolean;
  enableComment: boolean;
  enableShare: boolean;
}

/**
 * Fase 8 (14 Sep 2026) — bottom bar ala TikTok/Shorts (Like/Comment/Share),
 * auto-hide saat scroll aktif (`useScrollDirection`). SENGAJA tanpa ikon
 * Publisher (dibatalkan, ditunda ke fase berikutnya — overview.md §14.2).
 *
 * Layout CLUSTERED (satu pill di tengah, bukan `justify-between` merentang
 * lebar layar) — supaya tetap proporsional dengan 1, 2, atau 3 tombol aktif
 * (overview.md §14.3). Kalau ketiga toggle Platform mati, komponen ini
 * TIDAK merender apa pun (tidak ada elemen anchor lain yang dipertahankan).
 */
export function ChapterEngagementBar({
  chapterId,
  platformSlug,
  bookSlug,
  orderIndex,
  initialLikeCount,
  enableLike,
  enableComment,
  enableShare,
}: ChapterEngagementBarProps) {
  const { isLoggedIn, loading } = useAuth();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [submitting, setSubmitting] = useState(false);
  const [commentOpen, setCommentOpen] = useState(false);
  const hidden = useScrollDirection();

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

  if (!enableLike && !enableComment && !enableShare) {
    return null;
  }

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
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ url });
      } catch {
        // Pembaca membatalkan share sheet native — bukan error.
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link disalin');
    } catch (err) {
      console.error('[ChapterEngagementBar] gagal menyalin link:', err);
    }
  }

  return (
    <>
      <div
        className={`fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 transition-transform duration-200 ${
          hidden ? 'translate-y-[150%]' : 'translate-y-0'
        }`}
      >
        <div className="mb-4 flex items-center gap-1 rounded-full border border-[var(--reader-border)] bg-[var(--reader-surface)]/95 px-2 py-2 shadow-lg backdrop-blur">
          {enableLike && (
            <button
              type="button"
              onClick={toggleLike}
              disabled={submitting}
              aria-label={liked ? 'Batalkan Like Chapter ini' : 'Like Chapter ini'}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-[var(--reader-foreground)] transition-colors hover:bg-[var(--reader-border)]/40 disabled:opacity-50"
            >
              <Heart
                className={`h-5 w-5 ${
                  liked ? 'fill-[var(--reader-terracotta)] text-[var(--reader-terracotta)]' : 'text-[var(--reader-muted)]'
                }`}
              />
              <span>{likeCount}</span>
            </button>
          )}

          {enableComment && (
            <button
              type="button"
              onClick={() => setCommentOpen(true)}
              aria-label="Lihat komentar"
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-[var(--reader-muted)] transition-colors hover:bg-[var(--reader-border)]/40"
            >
              <MessageCircle className="h-5 w-5" />
            </button>
          )}

          {enableShare && (
            <button
              type="button"
              onClick={share}
              aria-label="Bagikan Chapter ini"
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-[var(--reader-muted)] transition-colors hover:bg-[var(--reader-border)]/40"
            >
              <Share2 className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {enableComment && <CommentSheet chapterId={chapterId} platformSlug={platformSlug} bookSlug={bookSlug} orderIndex={orderIndex} open={commentOpen} onClose={() => setCommentOpen(false)} />}
    </>
  );
}
