/**
 * Nama header internal yang di-set `middleware.ts` setelah resolusi Platform
 * dari Host, dibaca `lib/platform.ts` (`getPlatformSlug()`) di Server
 * Component/Route Handler. Dipisah jadi file konstanta murni (tanpa import
 * `next/headers`) supaya aman diimport `middleware.ts` (edge runtime) TANPA
 * ikut menyeret `next/headers` yang tidak berlaku di sana.
 */
export const PLATFORM_SLUG_HEADER = 'x-bookpedia-platform-slug';
