/**
 * Kontrak `bookpedia-api` — lihat plan/bookpedia/execution-plan.md Fase 0.
 * JANGAN diubah sepihak dari sisi Studio; kontrak ini disepakati bersama
 * backend (dikerjakan paralel).
 */
import type { CategorySummaryDto, GenreDto } from './public-types';

export interface Library {
  id: string;
  platformId: string | null;
  ownerUserId: string;
  nama: string;
  slug: string;
  deskripsi: string | null;
  coverUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLibraryPayload {
  /** Slug Platform tempat Library ini dibuat (Fase 4, §4.2) — dari usePlatformContext(). */
  platformSlug: string;
  nama: string;
  slug: string;
  deskripsi?: string;
  coverUrl?: string;
}

// Catatan: `PATCH /libraries/me` TIDAK menerima `slug` (kontrak backend) —
// slug dipakai di URL publik /library/{slug}, hanya ditentukan saat create.
export interface UpdateLibraryPayload {
  nama?: string;
  deskripsi?: string;
  coverUrl?: string;
}

export type BookStatus = 'draft' | 'ongoing' | 'completed';
export type ChapterStatus = 'draft' | 'published';
/** original (default) / translation / adaptation — Book terjemahan/adaptasi karya orang lain. */
export type BookType = 'original' | 'translation' | 'adaptation';

export interface Book {
  id: string;
  libraryId: string;
  judul: string;
  slug: string;
  sinopsis: string | null;
  genre: GenreDto | null;
  category: CategorySummaryDto | null;
  coverUrl: string | null;
  status: BookStatus;
  bookType: BookType;
  /** Nama penulis asli — relevan kalau `bookType` bukan 'original'. */
  originalAuthor: string | null;
  /** Saklar publikasi level Book, terpisah dari `status` di atas dan dari status publish per-Chapter. */
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBookPayload {
  judul: string;
  slug: string;
  sinopsis?: string;
  genreId?: string;
  /** Dipilih terpisah dari genreId (§4.5) — tidak divalidasi harus "cocok" dengan genre. */
  categoryId?: string;
  coverUrl?: string;
  bookType?: BookType;
  originalAuthor?: string;
}

// Catatan: `PATCH /books/:id` TIDAK menerima `slug` (kontrak backend) — slug
// hanya ditentukan saat create, jadi tidak masuk payload update.
export interface UpdateBookPayload {
  judul?: string;
  sinopsis?: string;
  genreId?: string;
  categoryId?: string | null;
  coverUrl?: string;
  status?: BookStatus;
  published?: boolean;
  bookType?: BookType;
  originalAuthor?: string | null;
}

export interface Chapter {
  id: string;
  bookId: string;
  judul: string;
  konten: string | null;
  orderIndex: number;
  status: ChapterStatus;
  contentVersion: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateChapterPayload {
  judul: string;
  konten?: string;
}

export interface UpdateChapterPayload {
  judul?: string;
  konten?: string;
  status?: ChapterStatus;
}

export interface ReorderChapterItem {
  id: string;
  orderIndex: number;
}

export interface ReorderChapterPayload {
  items: ReorderChapterItem[];
}
