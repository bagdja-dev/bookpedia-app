'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, ArrowUp, ArrowDown, Eye, EyeOff, FileText, Pencil, Plus, Trash2 } from 'lucide-react';

import { LoadingSpinner } from '@/components/loading-spinner';
import { StarRatingDisplay } from '@/components/reader/star-rating-display';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { apiClient, ApiError } from '@/lib/api-client';
import { BOOK_STATUS_LABEL, BOOK_STATUS_VARIANT, CHAPTER_STATUS_LABEL, CHAPTER_STATUS_VARIANT } from '@/lib/status';
import { BOOK_TYPE_BADGE_LABEL } from '@/lib/book-byline';
import { usePlatformContext } from '@/context/platform-context';
import type { Book, Chapter, ReorderChapterPayload } from '@/lib/types';

function ChapterRow({
  chapter,
  index,
  total,
  bookId,
  onMove,
  moving,
  onTogglePublish,
  publishingId,
  onDelete,
  deletingId,
  showRating,
}: {
  chapter: Chapter;
  index: number;
  total: number;
  bookId: string;
  onMove: (index: number, direction: -1 | 1) => void;
  moving: boolean;
  onTogglePublish: (chapter: Chapter) => void;
  publishingId: string | null;
  onDelete: (chapter: Chapter) => void;
  deletingId: string | null;
  /** Fase 7 — tampilkan rating Chapter ini, cuma relevan kalau Platform ratingMode="chapter". */
  showRating: boolean;
}) {
  const isPublished = chapter.status === 'published';
  const isPublishing = publishingId === chapter.id;
  const isDeleting = deletingId === chapter.id;

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
      <span className="w-6 shrink-0 text-sm text-muted-foreground">{index + 1}</span>

      <Link
        href={`/dashboard/books/${bookId}/chapters/${chapter.id}`}
        className="flex flex-1 items-center gap-2 truncate text-sm font-medium hover:underline"
      >
        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="truncate">{chapter.judul}</span>
      </Link>

      <span className="shrink-0 text-xs text-muted-foreground">{chapter.viewCount.toLocaleString('id-ID')}x dibaca</span>

      {showRating && chapter.ratingCount > 0 && (
        <StarRatingDisplay average={chapter.ratingAverage} count={chapter.ratingCount} />
      )}

      <Badge variant={CHAPTER_STATUS_VARIANT[chapter.status]}>
        {CHAPTER_STATUS_LABEL[chapter.status]}
      </Badge>

      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="outline"
          size="icon-sm"
          disabled={isPublishing}
          title={isPublished ? 'Batalkan Publish' : 'Publish'}
          onClick={() => onTogglePublish(chapter)}
        >
          {isPublished ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          disabled={moving || index === 0}
          title="Pindah ke atas"
          onClick={() => onMove(index, -1)}
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          disabled={moving || index === total - 1}
          title="Pindah ke bawah"
          onClick={() => onMove(index, 1)}
        >
          <ArrowDown className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          disabled={isDeleting}
          title="Hapus Chapter"
          onClick={() => onDelete(chapter)}
          className="hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function BookDetailPage({ params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = use(params);
  const router = useRouter();
  const { config } = usePlatformContext();

  const [book, setBook] = useState<Book | null>(null);
  const [chapters, setChapters] = useState<Chapter[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);
  const [creatingChapter, setCreatingChapter] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [publishingBook, setPublishingBook] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [bookData, chapterData] = await Promise.all([
          apiClient<Book>(`/books/${bookId}`),
          apiClient<Chapter[]>(`/books/${bookId}/chapters`),
        ]);
        if (!cancelled) {
          setBook(bookData);
          setChapters(chapterData);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Gagal memuat Book');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bookId]);

  async function handleMove(index: number, direction: -1 | 1) {
    if (!chapters) return;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= chapters.length) return;

    const reordered = [...chapters];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];

    const previous = chapters;
    setChapters(reordered);
    setReordering(true);
    try {
      const payload: ReorderChapterPayload = {
        items: reordered.map((c, i) => ({ id: c.id, orderIndex: i })),
      };
      const updated = await apiClient<Chapter[]>(`/books/${bookId}/chapters/reorder`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      setChapters(updated);
    } catch (err) {
      setChapters(previous);
      toast.error(err instanceof ApiError ? err.message : 'Gagal mengubah urutan Chapter.');
    } finally {
      setReordering(false);
    }
  }

  async function handleTogglePublish(chapter: Chapter) {
    const nextStatus = chapter.status === 'published' ? 'draft' : 'published';
    setPublishingId(chapter.id);
    try {
      const updated = await apiClient<Chapter>(`/books/${bookId}/chapters/${chapter.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      setChapters((prev) => prev?.map((c) => (c.id === updated.id ? updated : c)) ?? prev);
      toast.success(
        nextStatus === 'published' ? 'Chapter dipublish.' : 'Publish dibatalkan, Chapter kembali ke draft.',
      );
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal mengubah status Chapter.');
    } finally {
      setPublishingId(null);
    }
  }

  async function handleTogglePublishBook() {
    if (!book) return;
    const nextPublished = !book.publishedAt;
    setPublishingBook(true);
    try {
      const updated = await apiClient<Book>(`/books/${bookId}`, {
        method: 'PATCH',
        body: JSON.stringify({ published: nextPublished }),
      });
      setBook(updated);
      toast.success(
        nextPublished
          ? 'Book dipublish — akan muncul di katalog kalau sudah punya Chapter published.'
          : 'Publish Book dibatalkan, Book disembunyikan dari katalog publik.',
      );
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal mengubah status publikasi Book.');
    } finally {
      setPublishingBook(false);
    }
  }

  async function handleDeleteChapter(chapter: Chapter) {
    const confirmed = window.confirm(`Hapus Chapter "${chapter.judul}"? Tindakan ini tidak bisa dibatalkan.`);
    if (!confirmed) return;

    setDeletingId(chapter.id);
    try {
      await apiClient(`/books/${bookId}/chapters/${chapter.id}`, { method: 'DELETE' });
      setChapters((prev) => prev?.filter((c) => c.id !== chapter.id) ?? prev);
      toast.success('Chapter dihapus.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal menghapus Chapter.');
    } finally {
      setDeletingId(null);
    }
  }

  async function handleNewChapter() {
    setCreatingChapter(true);
    try {
      const chapter = await apiClient<Chapter>(`/books/${bookId}/chapters`, {
        method: 'POST',
        body: JSON.stringify({ judul: 'Chapter Baru' }),
      });
      router.push(`/dashboard/books/${bookId}/chapters/${chapter.id}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal membuat Chapter baru.');
    } finally {
      setCreatingChapter(false);
    }
  }

  if (error) {
    return <p className="text-sm text-destructive">Gagal memuat Book: {error}</p>;
  }

  if (!book || !chapters) {
    return <LoadingSpinner label="Memuat Book…" />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/dashboard/books"
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Semua Book
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold">{book.judul}</h1>
              <Badge variant={BOOK_STATUS_VARIANT[book.status]}>{BOOK_STATUS_LABEL[book.status]}</Badge>
              <Badge variant={book.publishedAt ? 'default' : 'secondary'}>
                {book.publishedAt ? 'Published' : 'Belum Dipublish'}
              </Badge>
              {book.bookType !== 'original' && (
                <Badge variant="outline">{BOOK_TYPE_BADGE_LABEL[book.bookType]}</Badge>
              )}
              {book.genre && <Badge variant="outline">{book.genre.nama}</Badge>}
            </div>
            {book.originalAuthor && (
              <p className="text-sm text-muted-foreground">Penulis asli: {book.originalAuthor}</p>
            )}
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>{book.viewCount.toLocaleString('id-ID')}x dibaca</span>
              {config.enableRating && (
                <StarRatingDisplay average={book.ratingAverage} count={book.ratingCount} size="md" />
              )}
            </div>
            {book.sinopsis && (
              <p className="max-w-2xl text-sm text-muted-foreground">{book.sinopsis}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant={book.publishedAt ? 'outline' : 'default'}
              disabled={publishingBook}
              onClick={handleTogglePublishBook}
            >
              {publishingBook
                ? 'Memproses…'
                : book.publishedAt
                  ? 'Batalkan Publish Book'
                  : 'Publish Book'}
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/dashboard/books/${bookId}/edit`}>
                <Pencil className="h-4 w-4" />
                Edit Book
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Chapter ({chapters.length})
          </h2>
          <Button size="sm" disabled={creatingChapter} onClick={handleNewChapter}>
            <Plus className="h-4 w-4" />
            Chapter Baru
          </Button>
        </div>

        {chapters.length === 0 ? (
          <div className="flex min-h-[30vh] flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-center">
            <p className="text-sm text-muted-foreground">Belum ada Chapter. Mulai tulis Chapter pertama.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {chapters.map((chapter, index) => (
              <ChapterRow
                key={chapter.id}
                chapter={chapter}
                index={index}
                total={chapters.length}
                bookId={bookId}
                onMove={handleMove}
                moving={reordering}
                onTogglePublish={handleTogglePublish}
                publishingId={publishingId}
                onDelete={handleDeleteChapter}
                deletingId={deletingId}
                showRating={config.enableRating && config.ratingMode === 'chapter'}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
