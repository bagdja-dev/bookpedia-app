'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Fase 8 — deteksi arah scroll untuk auto-hide `ChapterEngagementBar` supaya
 * tidak mengganggu baca teks panjang. Return `true` = sembunyikan bar (sedang
 * scroll ke bawah aktif), `false` = tampilkan (scroll ke atas ATAU berhenti
 * scroll selama `idleMs`). Threshold kecil mencegah flicker dari scroll
 * jitter halus (mis. momentum scroll iOS). Lihat plan/bookpedia/overview.md §14.
 */
export function useScrollDirection(threshold = 8, idleMs = 300): boolean {
  const [hidden, setHidden] = useState(false);
  const lastYRef = useRef(0);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    lastYRef.current = window.scrollY;

    function handleScroll() {
      const y = window.scrollY;
      const delta = y - lastYRef.current;

      if (Math.abs(delta) > threshold) {
        // Jangan sembunyikan selagi masih dekat atas halaman (y > 80) —
        // hindari bar hilang begitu halaman baru dimuat.
        setHidden(delta > 0 && y > 80);
        lastYRef.current = y;
      }

      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => setHidden(false), idleMs);
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [threshold, idleMs]);

  return hidden;
}
