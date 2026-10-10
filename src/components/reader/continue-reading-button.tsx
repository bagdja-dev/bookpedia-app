'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen } from 'lucide-react';

import { apiClient, ApiError } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import type { ReadingProgressDto } from '@/lib/reader-types';

interface ContinueReadingButtonProps {
  bookId: string;
  slug: string;
  firstChapterOrderIndex: number;
}

/**
 * Tombol CTA di halaman detail Book — default "Mulai Baca" (ke chapter 1,
 * sama seperti sebelum Fase 3). Kalau user login DAN sudah punya reading
 * progress untuk Book ini, berganti jadi "Lanjutkan Baca · Bab {n}" ke
 * chapter terakhir dibaca. Render awal SELALU "Mulai Baca" (sama dengan
 * kondisi belum-tahu/404) supaya tidak ada hydration mismatch dengan SSR.
 */
export function ContinueReadingButton({ bookId, slug, firstChapterOrderIndex }: ContinueReadingButtonProps) {
  const { isLoggedIn, loading: authLoading } = useAuth();
  const [progress, setProgress] = useState<ReadingProgressDto | null>(null);

  useEffect(() => {
    if (authLoading || !isLoggedIn) return;
    let cancelled = false;

    apiClient<ReadingProgressDto>(`/reading-progress/${bookId}`)
      .then((data) => {
        if (!cancelled) setProgress(data);
      })
      .catch((err) => {
        if (cancelled) return;
        if (!(err instanceof ApiError && err.status === 404)) {
          console.error('[ContinueReadingButton] gagal cek reading progress:', err);
        }
        setProgress(null);
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, isLoggedIn, bookId]);

  const orderIndex = progress ? progress.lastChapterOrderIndex : firstChapterOrderIndex;
  const label = progress ? `Lanjutkan Baca · Bab ${progress.lastChapterOrderIndex}` : 'Mulai Baca';

  return (
    <Link
      href={`/book/${slug}/chapter/${orderIndex}`}
      className="mt-2 flex w-fit items-center gap-2 rounded-full bg-[var(--reader-button-bg,var(--reader-terracotta))] px-5 py-2 text-sm font-medium text-[var(--reader-button-text,var(--reader-terracotta-foreground))] transition-opacity hover:opacity-90"
    >
      <BookOpen className="h-4 w-4" />
      {label}
    </Link>
  );
}
