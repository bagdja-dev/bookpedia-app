/**
 * Susulan Fase 6 (16 Sep 2026) — tombol "Cari Serupa" di card & detail Book:
 * satu klik terapkan filter Category + Genre + SEMUA Tag Book ini sekaligus
 * ke katalog pusat (`?genre=&category=&tag=`, tag boleh banyak dipisah
 * koma — lihat `PublicService.getCatalog()` backend). Beda dari klik chip
 * Category/Genre/Tag satuan yang cuma set SATU filter itu saja.
 */
export function buildSimilarBooksHref(book: {
  genre: { slug: string } | null;
  category: { slug: string } | null;
  tags: { slug: string }[];
}): string | null {
  const params = new URLSearchParams();
  if (book.genre) params.set('genre', book.genre.slug);
  if (book.category) params.set('category', book.category.slug);
  if (book.tags.length > 0) params.set('tag', book.tags.map((t) => t.slug).join(','));

  const qs = params.toString();
  return qs ? `/?${qs}` : null;
}
