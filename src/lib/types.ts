/**
 * Kontrak `bookpedia-api` — lihat plan/bookpedia/execution-plan.md Fase 0.
 * JANGAN diubah sepihak dari sisi Studio; kontrak ini disepakati bersama
 * backend (dikerjakan paralel).
 */
import type { CategorySummaryDto, GenreDto, TagDto } from './public-types';

export interface Library {
  id: string;
  platformId: string | null;
  ownerUserId: string;
  nama: string;
  slug: string;
  deskripsi: string | null;
  coverUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  seoH1: string | null;
  seoOgTitle: string | null;
  seoOgDescription: string | null;
  seoOgType: 'website' | 'book' | 'profile' | null;
  seoPrefix: string | null;
  seoSuffix: string | null;
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
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoH1?: string | null;
  seoOgTitle?: string | null;
  seoOgDescription?: string | null;
  seoOgType?: 'website' | 'book' | 'profile' | null;
  seoPrefix?: string | null;
  seoSuffix?: string | null;
}

export interface LibraryAnalyticsBook {
  bookId: string;
  title: string;
  views: number;
  published: boolean;
}

export interface LibraryAnalyticsDay {
  date: string;
  views: number;
  readers: number;
  readingSessions: number;
  readerGrowth: number;
  readingGrowth: number;
}

export interface LibraryAnalyticsResponse {
  totalBooks: number;
  publishedBooks: number;
  totalReaders: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  averageRating: number;
  topBooks: LibraryAnalyticsBook[];
  daily: LibraryAnalyticsDay[];
  recentActivities: Array<{
    title: string;
    detail: string;
    activityAt: string;
    type: string;
  }>;
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
  /** Fase 6 — Tag bebas milik Book ini. */
  tags: TagDto[];
  coverUrl: string | null;
  status: BookStatus;
  bookType: BookType;
  /** Nama penulis asli — relevan kalau `bookType` bukan 'original'. */
  originalAuthor: string | null;
  /** Saklar publikasi level Book, terpisah dari `status` di atas dan dari status publish per-Chapter. */
  publishedAt: string | null;
  /** Fase 5 (SEO) — override "Maximum Free Chapter" Platform. null = ikut kebijakan Platform. */
  maxFreeChapters: number | null;
  seoTitle: string | null;
  seoDescription: string | null;
  seoH1: string | null;
  seoOgTitle: string | null;
  seoOgDescription: string | null;
  seoOgType: 'website' | 'book' | 'profile' | null;
  seoPrefix: string | null;
  seoSuffix: string | null;
  /** Fase 7 — total dibaca (SUM view_count semua Chapter Book ini), read-only. */
  viewCount: number;
  /** Total komentar pada semua Chapter Book ini, termasuk balasan. */
  commentCount: number;
  /** Fase 7 — agregat rating Book ini (0 kalau belum ada rating). Sumbernya ikut ratingMode Platform. */
  ratingAverage: number;
  ratingCount: number;
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
  maxFreeChapters?: number;
  /** Fase 6 — Tag bebas (nama apa adanya, find-or-create di backend). */
  tags?: string[];
  seoTitle?: string;
  seoDescription?: string;
  seoH1?: string;
  seoOgTitle?: string;
  seoOgDescription?: string;
  seoOgType?: 'website' | 'book' | 'profile';
  seoPrefix?: string;
  seoSuffix?: string;
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
  maxFreeChapters?: number | null;
  /** Fase 6 — ganti SELURUH Tag Book ini. [] menghapus semua. */
  tags?: string[];
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoH1?: string | null;
  seoOgTitle?: string | null;
  seoOgDescription?: string | null;
  seoOgType?: 'website' | 'book' | 'profile' | null;
  seoPrefix?: string | null;
  seoSuffix?: string | null;
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
  /** Fase 7 — total dibaca Chapter ini, read-only. */
  viewCount: number;
  /** Total komentar Chapter ini, termasuk balasan. */
  commentCount: number;
  /** Fase 7 — rating Chapter ini (0 kalau belum ada rating). Cuma relevan kalau Platform pemiliknya ratingMode="chapter". */
  ratingAverage: number;
  ratingCount: number;
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

/**
 * "Rekomendasi Penulis" — kurasi manual Book yang tampil di halaman publik
 * Book milik sendiri, BEBAS dipilih dari Library manapun di Platform yang
 * sama (bukan cuma Library sendiri). Lihat `PromotionsService` bookpedia-api.
 */
export interface PromotedBookSummary {
  id: string;
  judul: string;
  slug: string;
  coverUrl: string | null;
  libraryNama: string;
}

export interface ReplacePromotionsPayload {
  promotedBookIds: string[];
}
