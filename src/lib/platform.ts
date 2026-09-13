/**
 * Resolusi `platformSlug` sisi Server Component/Route Handler/`generateMetadata()`
 * — baca header internal yang di-set `middleware.ts` (lihat
 * `platform-slug-header.ts`). Dibungkus `cache()` (React) supaya beberapa
 * pemanggil dalam satu request (root layout + reader layout + page) dedupe
 * jadi satu pembacaan header, bukan berulang.
 *
 * Fallback ke `NEXT_PUBLIC_DEFAULT_PLATFORM_SLUG` kalau header tidak ada
 * sama sekali (mis. matcher middleware tidak match, atau Route Handler yang
 * di luar `matcher`) — jangan pernah throw di sini, biar app tetap render
 * dengan Platform default daripada 500.
 */
import { cache } from 'react';
import { headers } from 'next/headers';

import { PLATFORM_SLUG_HEADER } from './platform-slug-header';

export const getPlatformSlug = cache(async (): Promise<string> => {
  const h = await headers();
  return h.get(PLATFORM_SLUG_HEADER) ?? process.env.NEXT_PUBLIC_DEFAULT_PLATFORM_SLUG ?? 'bookpedia';
});
