'use client';

import { useEffect, useState } from 'react';

/**
 * Tinggi header+footer `(reader)/layout.tsx` yang SEBENARNYA dirender —
 * header sengaja `flex-wrap` (bisa jadi 2 baris di layar sempit: logo+avatar
 * satu baris, search bar baris lain), jadi tidak bisa ditebak pakai angka
 * rem tetap (bug yang sempat kejadian di halaman Kotak Masuk, 17 Sep 2026).
 *
 * Dipakai halaman yang perlu "isi sisa tinggi layar setelah header+footer"
 * (mis. `/inbox`) TANPA mengubah struktur `(reader)/layout.tsx` itu sendiri
 * (yang sengaja `min-h-screen`, bukan `h-dvh overflow-hidden` — kalau
 * layout-nya diubah jadi itu, footer bakal permanen kepotong di layar buat
 * SEMUA halaman reader lain, bukan cuma Kotak Masuk).
 */
export function useReaderChromeHeight(): number | null {
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    const header = document.querySelector<HTMLElement>('.bookpedia-reader > header');
    const footer = document.querySelector<HTMLElement>('.bookpedia-reader > footer');
    if (!header || !footer) return;

    const update = () => {
      setHeight(header.getBoundingClientRect().height + footer.getBoundingClientRect().height);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(header);
    observer.observe(footer);
    window.addEventListener('resize', update);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  return height;
}
