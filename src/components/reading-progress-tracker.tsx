'use client';

import { useEffect, useRef } from 'react';

import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';

interface ReadingProgressTrackerProps {
  bookId: string;
  chapterId: string;
}

/**
 * Komponen tak-render — di-mount di halaman baca Chapter. Kalau user login,
 * catat chapter ini sebagai "posisi terakhir baca" SEKALI saat halaman
 * dibuka (bukan tracking scroll-position, cukup "chapter ini dibuka" = MVP
 * sesuai plan/bookpedia/execution-plan.md Fase 3). Gagal-senyap — ini bukan
 * fitur kritis, tidak boleh mengganggu pengalaman baca kalau backend error.
 */
export function ReadingProgressTracker({ bookId, chapterId }: ReadingProgressTrackerProps) {
  const { isLoggedIn, loading } = useAuth();
  // Guard supaya tidak double-fire kalau effect jalan ulang (mis. React
  // Strict Mode di dev) untuk kombinasi bookId+chapterId yang sama.
  const savedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (loading || !isLoggedIn) return;

    const key = `${bookId}:${chapterId}`;
    if (savedKeyRef.current === key) return;
    savedKeyRef.current = key;

    apiClient('/reading-progress', {
      method: 'PUT',
      body: JSON.stringify({ bookId, chapterId }),
    }).catch((err) => {
      console.error('[ReadingProgressTracker] gagal simpan progress:', err);
    });
  }, [loading, isLoggedIn, bookId, chapterId]);

  return null;
}
