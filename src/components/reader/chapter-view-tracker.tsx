'use client';

import { useEffect, useRef } from 'react';

import { recordChapterView } from '@/lib/public-api';

interface ChapterViewTrackerProps {
  platformSlug: string;
  bookSlug: string;
  orderIndex: number;
}

/**
 * Komponen tak-render — statistik baca (Fase 7). Pola PERSIS
 * `ReadingProgressTracker` (fire-and-forget, gagal-senyap, guard anti-
 * double-fire) TAPI TIDAK menyaratkan login — dihitung untuk SEMUA pembaca
 * (termasuk anonim yang baca Chapter gratis). Mount di halaman baca Chapter
 * SETELAH guard `isFree` lolos (chapter berbayar tidak pernah sampai render
 * ini kalau belum login).
 */
export function ChapterViewTracker({ platformSlug, bookSlug, orderIndex }: ChapterViewTrackerProps) {
  const savedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const key = `${platformSlug}:${bookSlug}:${orderIndex}`;
    if (savedKeyRef.current === key) return;
    savedKeyRef.current = key;

    void recordChapterView(platformSlug, bookSlug, orderIndex);
  }, [platformSlug, bookSlug, orderIndex]);

  return null;
}
