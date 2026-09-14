/**
 * Kontrak endpoint PUBLIK `bookpedia-api` (prefix `/public/`) — lihat
 * plan/bookpedia/execution-plan.md Fase 2. JANGAN diubah sepihak dari sisi
 * reader; kontrak ini disepakati bersama backend (dikerjakan paralel).
 *
 * Dipisah dari `lib/types.ts` (kontrak authenticated Studio) karena bentuk
 * DTO publik beda — sudah termasuk relasi `library`/`chapters` yang di-embed,
 * bukan foreign key mentah.
 */
import type { BookStatus, BookType } from './types';

/** Fase 7 — grain rating: "book" = satu rating per Book, "chapter" = rating terpisah tiap Chapter (diagregasi ke Book saat ditampilkan). */
export type RatingMode = 'book' | 'chapter';

/** Kontrak `GET /public/genres` — daftar genre resmi dari database (bukan lagi hardcode frontend). */
export interface GenreDto {
  id: string;
  nama: string;
  slug: string;
}

/**
 * Kontrak `GET /public/platforms/:platformSlug/categories` (§4.5, 11 Sep
 * 2026) — satu level di atas Genre, many-to-many (`genres` adalah anggota
 * Category ini). Dipakai Studio (kelompokkan dropdown Genre) & Reader
 * (filter katalog tambahan di atas filter Genre).
 */
export interface CategoryDto {
  id: string;
  nama: string;
  slug: string;
  genres: GenreDto[];
}

/** Bentuk ringkas Category yang di-embed di Book (§4.5) — tanpa nested `genres`. */
export interface CategorySummaryDto {
  id: string;
  platformId: string;
  nama: string;
  slug: string;
}

/**
 * Fase 6 — Tag bebas (folksonomi), beda dari Genre/Category yang kurasi.
 * Dipakai sebagai item autocomplete (`GET /public/platforms/:slug/tags`)
 * DAN sebagai field nested `tags` di response Book.
 */
export interface TagDto {
  id: string;
  platformId: string;
  nama: string;
  slug: string;
}

export interface PlatformColors {
  bg: string;
  surface: string;
  foreground: string;
  muted: string;
  border: string;
  terracotta: string;
  terracottaForeground: string;
  mustard: string;
  olive: string;
}

/**
 * Kontrak `GET /public/platforms/:platformSlug` (Fase 4, §4.1/§4.2, 11 Sep
 * 2026 — menggantikan `GET /public/config` global lama yang sudah dihapus
 * backend). Semua field PUNYA fallback di sisi frontend (lihat
 * `getPlatformConfig()`) — jangan anggap request ini selalu sukses.
 *
 * Rename dari kontrak lama: `title`->`nama`, `logo`->`logoUrl`,
 * `favicon`->`faviconUrl`. Field baru `rendererKey` — belum dipakai
 * (hardwire selalu render `(reader)/` untuk sekarang), tapi dibaca supaya
 * titik keputusan renderer per-Platform (overview.md §9.2) sudah ada tanpa
 * re-arsitektur nanti.
 */
/** SEO Fase 2 — kontrak `GET /public/platforms/:slug/sitemap-entries`, dipakai `src/app/sitemap.ts`. */
export interface SitemapEntriesDto {
  books: { slug: string; updatedAt: string }[];
  libraries: { slug: string; updatedAt: string }[];
}

export interface PlatformProfileDto {
  nama: string;
  slug: string;
  logoUrl: string | null;
  /** URL favicon browser tab — terpisah dari `logoUrl` (dipakai di header). */
  faviconUrl: string | null;
  colors: PlatformColors;
  lockStudio: boolean;
  rendererKey: string;
  /** Fase 5 (SEO) — jumlah Chapter pertama tiap Book yang bisa dibaca tanpa login. 0 = SEMUA Chapter gratis (bukan "nol Chapter gratis"). */
  maxFreeChapters: number;
  /** Tampilkan badge status cerita (draft/ongoing/completed) di halaman publik. */
  showBookStatus: boolean;
  /** Fase 6 — batas jumlah Tag yang boleh dilekatkan ke satu Book. */
  maxTagsPerBook: number;
  /** Verifikasi Google Search Console ("HTML file" method), dibalas dinamis oleh middleware.ts. */
  searchConsoleVerificationFilename: string | null;
  searchConsoleVerificationContent: string | null;
  /** Fase 7 — nyala/mati fitur rating Book/Chapter. false = sembunyikan seluruh UI rating. */
  enableRating: boolean;
  /** Fase 7 — grain rating saat ini: "book" = widget di detail Book, "chapter" = widget di halaman baca Chapter. */
  ratingMode: RatingMode;
  /** Fase 8 — nyala/mati tombol Like di ChapterEngagementBar. */
  enableLike: boolean;
  /** Fase 8 — nyala/mati tombol Comment (mock) di ChapterEngagementBar. */
  enableComment: boolean;
  /** Fase 8 — nyala/mati tombol Share di ChapterEngagementBar. Kalau enableLike, enableComment, DAN enableShare ketiganya false, seluruh bar disembunyikan. */
  enableShare: boolean;
}

export interface BookCatalogDto {
  id: string;
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
  library: {
    nama: string;
    slug: string;
  };
  /** Fase 7 — total dibaca (SUM view_count semua Chapter Book ini). */
  viewCount: number;
  /** Fase 7 — agregat rating Book ini (0 kalau belum ada rating). Sumbernya ikut ratingMode Platform. */
  ratingAverage: number;
  /** Fase 7 — jumlah rating yang membentuk ratingAverage di atas. */
  ratingCount: number;
  /** Fase 8 (susulan) — total Like (SUM like_count semua Chapter Book ini). */
  likeCount: number;
}

export interface CatalogResponse {
  items: BookCatalogDto[];
  total: number;
  page: number;
  limit: number;
}

export interface LibraryProfileDto {
  id: string;
  nama: string;
  slug: string;
  deskripsi: string | null;
  coverUrl: string | null;
  createdAt: string;
  books: BookCatalogDto[];
}

export interface BookChapterSummary {
  id: string;
  judul: string;
  orderIndex: number;
  publishedAt: string | null;
  /** Fase 5 (SEO) — true kalau Chapter ini bisa dibaca tanpa login. */
  isFree: boolean;
  /** Fase 7 — rating Chapter ini (0 kalau belum ada rating). Cuma relevan/ditampilkan kalau platform.ratingMode="chapter". */
  ratingAverage: number;
  ratingCount: number;
}

export interface BookDetailDto {
  id: string;
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
  library: {
    nama: string;
    slug: string;
  };
  chapters: BookChapterSummary[];
  /** Fase 7 — total dibaca (SUM view_count semua Chapter Book ini). */
  viewCount: number;
  /** Fase 7 — agregat rating Book ini (0 kalau belum ada rating). Sumbernya ikut ratingMode Platform. */
  ratingAverage: number;
  ratingCount: number;
  /** Fase 8 — total Like (SUM like_count semua Chapter Book ini). */
  likeCount: number;
}

export interface ChapterReadDto {
  id: string;
  judul: string;
  konten: string;
  orderIndex: number;
  publishedAt: string | null;
  book: {
    // `id` ditambahkan backend di Fase 3 — dibutuhkan reader untuk memanggil
    // `PUT /reading-progress` (butuh `bookId`). Backend mungkin belum kirim
    // field ini saat kode ini ditulis; tetap dideklarasikan sesuai kontrak.
    id: string;
    judul: string;
    slug: string;
    /** SEO Fase 1 — dipakai og:image halaman Chapter. */
    coverUrl: string | null;
  };
  prevOrderIndex: number | null;
  nextOrderIndex: number | null;
  /** Fase 5 (SEO) — true kalau Chapter ini bisa dibaca tanpa login. */
  isFree: boolean;
  /** Fase 7 — rating Chapter ini (0 kalau belum ada rating). Cuma relevan/ditampilkan kalau platform.ratingMode="chapter". */
  ratingAverage: number;
  ratingCount: number;
  /** Fase 8 — total Like Chapter ini. Status like user login sendiri diambil terpisah dari GET /likes/chapter/:chapterId. */
  likeCount: number;
}
