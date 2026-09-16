/**
 * Whitelist host gambar remote yang boleh dioptimasi `next/image` — HARUS
 * sinkron manual dengan `images.remotePatterns` di `next.config.ts`
 * (next.config.ts tidak bisa import dari sini karena dievaluasi sebelum
 * TypeScript path alias siap; daftarnya cuma 2 entry jadi risiko drift
 * kecil). Dipakai `SafeImage` (`components/safe-image.tsx`) buat fallback
 * ke `<img>` polos kalau host `src` TIDAK ada di sini — backend
 * `bookpedia-api` TIDAK memvalidasi domain `coverUrl`/`logoUrl` (cuma
 * `@IsString()`, lihat plan/bookpedia/seo-plan.md §3.7), jadi data
 * legacy/API-bypass bisa saja berisi URL di luar `cdn.bagdja.com`.
 * `next/image` THROW (bukan cuma gambar rusak) kalau host tidak terdaftar
 * — tanpa fallback ini, satu cover lama bisa bikin seluruh halaman 500.
 */
const ALLOWED_IMAGE_HOSTS: (string | RegExp)[] = [
  'cdn.bagdja.com',
  /(^|\.)googleusercontent\.com$/,
];

export function isAllowedImageHost(src: string): boolean {
  let hostname: string;
  try {
    hostname = new URL(src).hostname;
  } catch {
    return false;
  }
  return ALLOWED_IMAGE_HOSTS.some((pattern) =>
    typeof pattern === 'string' ? hostname === pattern : pattern.test(hostname),
  );
}
