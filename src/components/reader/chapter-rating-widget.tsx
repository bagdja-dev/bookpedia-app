'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Star } from 'lucide-react';

import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';

interface ChapterRatingWidgetProps {
  chapterId: string;
}

/**
 * Fase 7 — widget interaktif kasih-rating 1-5 bintang untuk 1 Chapter, HANYA
 * tampil di halaman baca Chapter kalau `platform.ratingMode === 'chapter'`.
 * Struktur PERSIS `BookRatingWidget`, beda endpoint (`/ratings/chapter`).
 */
export function ChapterRatingWidget({ chapterId }: ChapterRatingWidgetProps) {
  const { isLoggedIn, loading } = useAuth();
  const [myRating, setMyRating] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loading || !isLoggedIn) return;
    apiClient<{ rating: number }>(`/ratings/chapter/${chapterId}`)
      .then((res) => setMyRating(res.rating))
      .catch(() => {
        // 404 = user login belum pernah rating Chapter ini — wajar, bukan error.
      });
  }, [loading, isLoggedIn, chapterId]);

  if (loading) {
    return null;
  }

  if (!isLoggedIn) {
    return (
      <p className="text-xs text-[var(--reader-muted)]">
        <Link href="/auth/login" className="underline underline-offset-2 hover:text-[var(--reader-terracotta)]">
          Login
        </Link>{' '}
        untuk memberi rating Chapter ini.
      </p>
    );
  }

  async function submit(rating: number) {
    setSubmitting(true);
    try {
      await apiClient('/ratings/chapter', { method: 'PUT', body: JSON.stringify({ chapterId, rating }) });
      setMyRating(rating);
    } catch (err) {
      console.error('[ChapterRatingWidget] gagal submit rating:', err);
    } finally {
      setSubmitting(false);
    }
  }

  const active = hover ?? myRating ?? 0;

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={submitting}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(null)}
          onClick={() => submit(star)}
          aria-label={`Beri rating ${star} bintang`}
          className="disabled:opacity-50"
        >
          <Star
            className={`h-5 w-5 ${
              star <= active ? 'fill-[var(--reader-mustard)] text-[var(--reader-mustard)]' : 'text-[var(--reader-border)]'
            }`}
          />
        </button>
      ))}
    </div>
  );
}
