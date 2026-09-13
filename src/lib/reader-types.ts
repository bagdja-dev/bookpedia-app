/**
 * Kontrak endpoint AUTHENTICATED khusus personalisasi reader (reading
 * progress & highlight) — lihat plan/bookpedia/execution-plan.md Fase 3.
 * Dipanggil dari CLIENT COMPONENT lewat BFF proxy (`apiClient`, prefix
 * `/api/proxy/...`), JANGAN diubah sepihak dari sisi reader — kontrak ini
 * disepakati bersama backend (dikerjakan paralel).
 */

export interface ReadingProgressDto {
  bookId: string;
  lastChapterId: string;
  lastChapterOrderIndex: number;
  lastChapterJudul: string;
  updatedAt: string;
}

export interface ReadingProgressListItemDto {
  bookId: string;
  bookJudul: string;
  bookSlug: string;
  bookCoverUrl: string | null;
  lastChapterId: string;
  lastChapterOrderIndex: number;
  lastChapterJudul: string;
  updatedAt: string;
}

export interface HighlightDto {
  id: string;
  chapterId: string;
  startOffset: number;
  endOffset: number;
  contentVersion: number;
  createdAt: string;
}

export interface MyHighlightDto {
  id: string;
  chapterId: string;
  startOffset: number;
  endOffset: number;
  contentVersion: number;
  isStale: boolean;
  createdAt: string;
  chapter: { judul: string; orderIndex: number };
  book: { judul: string; slug: string };
}
