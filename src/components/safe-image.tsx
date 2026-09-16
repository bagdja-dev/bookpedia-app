import Image, { type ImageProps } from 'next/image';

import { isAllowedImageHost } from '@/lib/image-hosts';
import { cn } from '@/lib/utils';

type SafeImageProps = Omit<ImageProps, 'src'> & { src: string };

/**
 * Wrapper `next/image` (susulan 17 Sep 2026, migrasi next/image — lihat
 * plan/bookpedia/seo-plan.md §3.7/§6 poin 4) dengan fallback otomatis ke
 * `<img>` polos kalau host `src` TIDAK ada di whitelist
 * `images.remotePatterns` (`next.config.ts`)/`ALLOWED_IMAGE_HOSTS`
 * (`lib/image-hosts.ts`). Server Component-safe (TIDAK `'use client'`) —
 * dipakai langsung di halaman reader yang SSR penuh.
 *
 * Kenapa perlu fallback ini: backend `bookpedia-api` TIDAK memvalidasi
 * domain `coverUrl`/`logoUrl`/dst (cuma `@IsString()`) — data lama atau
 * yang di-set lewat API langsung (bukan lewat upload widget Studio) bisa
 * saja punya domain di luar whitelist. `next/image` THROW kalau host tidak
 * terdaftar (bukan sekadar gambar rusak), jadi wajib dicek DULU di sini
 * supaya satu baris data lama tidak bikin seluruh halaman 500.
 */
export function SafeImage({ src, alt, className, fill, ...props }: SafeImageProps) {
  if (!isAllowedImageHost(src)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- fallback sengaja, host src di luar whitelist next/image remotePatterns
      <img src={src} alt={alt} className={cn(fill && 'absolute inset-0 h-full w-full', className)} />
    );
  }

  return <Image src={src} alt={alt} fill={fill} className={className} {...props} />;
}
