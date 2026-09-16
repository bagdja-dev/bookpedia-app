import { BookCard } from '@/components/reader/book-card';
import type { BookCatalogDto } from '@/lib/public-types';

interface BookMasonryGridProps {
  books: BookCatalogDto[];
  showStatus?: boolean;
  showRating?: boolean;
  showLike?: boolean;
  showComment?: boolean;
}

/**
 * Grid Book gaya masonry/Pinterest (susulan 17 Sep 2026) — CSS multi-column
 * (`columns-*` + `break-inside-avoid` per item), BUKAN library JS masonry
 * terpisah: tinggi tiap `BookCard` sudah wajar bervariasi (judul 1-2 baris,
 * jumlah chip category/genre/tag beda-beda per Book) walau cover selalu
 * rasio 3:4 tetap — cukup buat efek waterfall tanpa dependency baru.
 * Dipakai di katalog utama, profil Library, profil User — SENGAJA TIDAK di
 * `/my/continue-reading` (tetap grid seragam, kebutuhannya beda: daftar
 * lanjut baca, bukan discovery/browsing).
 */
export function BookMasonryGrid({ books, showStatus, showRating, showLike, showComment }: BookMasonryGridProps) {
  return (
    <div className="columns-2 gap-4 sm:columns-3 lg:columns-4 xl:columns-5">
      {books.map((book) => (
        <div key={book.id} className="mb-4 break-inside-avoid">
          <BookCard book={book} showStatus={showStatus} showRating={showRating} showLike={showLike} showComment={showComment} />
        </div>
      ))}
    </div>
  );
}
