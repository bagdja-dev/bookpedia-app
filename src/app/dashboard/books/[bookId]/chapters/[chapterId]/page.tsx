'use client';

import { use, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  FileText,
  Loader2,
  Maximize2,
  Minimize2,
  Pencil,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';

import { LoadingSpinner } from '@/components/loading-spinner';
import { RichTextEditor } from '@/components/rich-text-editor';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { apiClient, ApiError } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { CHAPTER_STATUS_LABEL, CHAPTER_STATUS_VARIANT } from '@/lib/status';
import type { Chapter } from '@/lib/types';
import { usePlatformContext } from '@/context/platform-context';

const AUTOSAVE_DELAY_MS = 2000;

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === 'saving') {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Menyimpan draft…
      </span>
    );
  }
  if (status === 'saved') {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Check className="h-3.5 w-3.5" />
        Draft tersimpan
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span className="flex items-center gap-1 text-xs text-destructive">
        <AlertCircle className="h-3.5 w-3.5" />
        Gagal menyimpan draft
      </span>
    );
  }
  return null;
}

export default function ChapterEditorPage({
  params,
}: {
  params: Promise<{ bookId: string; chapterId: string }>;
}) {
  const { bookId, chapterId } = use(params);
  const router = useRouter();
  const { config } = usePlatformContext();
  const isManualMode = config.studioEditMode === 'manual';

  const [chapters, setChapters] = useState<Chapter[] | null>(null);
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [judul, setJudul] = useState('');
  const [konten, setKonten] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [isEditing, setIsEditing] = useState(!isManualMode);
  const [publishing, setPublishing] = useState(false);
  const [distractionFree, setDistractionFree] = useState(false);
  const [creatingChapter, setCreatingChapter] = useState(false);
  const [deletingChapterId, setDeletingChapterId] = useState<string | null>(null);

  const skipAutosaveRef = useRef(true);

  // Daftar Chapter untuk sidebar mini-navigasi — cukup dimuat sekali per Book.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiClient<Chapter[]>(`/books/${bookId}/chapters`);
        if (!cancelled) setChapters(data);
      } catch {
        // Sidebar navigasi bersifat pelengkap — error di sini tidak
        // memblokir editor utama (error utama ditangani load chapter di bawah).
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bookId]);

  // Muat Chapter aktif — dijalankan ulang tiap pindah chapter lewat sidebar.
  useEffect(() => {
    let cancelled = false;
    skipAutosaveRef.current = true;
    setError(null);
    setSaveStatus('idle');
    setIsEditing(!isManualMode);
    (async () => {
      try {
        const data = await apiClient<Chapter>(`/books/${bookId}/chapters/${chapterId}`);
        if (cancelled) return;
        setChapter(data);
        setJudul(data.judul);
        setKonten(data.konten ?? '');
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Gagal memuat Chapter');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bookId, chapterId, isManualMode]);

  // Autosave draft — debounce ~2 detik setelah user berhenti mengetik.
  // TIDAK mengirim `status` (tetap draft), lihat plan/bookpedia/execution-plan.md
  // Fase 1 & overview.md §8.1 (autosave draft + tombol Publish terpisah).
  useEffect(() => {
    if (isManualMode) return;
    if (skipAutosaveRef.current) {
      skipAutosaveRef.current = false;
      return;
    }
    if (!chapter) return;

    const timer = setTimeout(() => {
      (async () => {
        setSaveStatus('saving');
        try {
          const updated = await apiClient<Chapter>(`/books/${bookId}/chapters/${chapterId}`, {
            method: 'PATCH',
            body: JSON.stringify({ judul, konten }),
          });
          setChapter(updated);
          setChapters((prev) => prev?.map((c) => (c.id === updated.id ? updated : c)) ?? prev);
          setSaveStatus('saved');
        } catch (err) {
          setSaveStatus('error');
          toast.error(err instanceof ApiError ? err.message : 'Gagal menyimpan draft.');
        }
      })();
    }, AUTOSAVE_DELAY_MS);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [judul, konten]);

  async function handleManualSave() {
    if (!chapter) return;
    setSaveStatus('saving');
    try {
      const updated = await apiClient<Chapter>(`/books/${bookId}/chapters/${chapterId}`, {
        method: 'PATCH',
        body: JSON.stringify({ judul, konten }),
      });
      setChapter(updated);
      setChapters((prev) => prev?.map((c) => (c.id === updated.id ? updated : c)) ?? prev);
      setSaveStatus('saved');
      setIsEditing(false);
      toast.success('Draft berhasil disimpan.');
    } catch (err) {
      setSaveStatus('error');
      toast.error(err instanceof ApiError ? err.message : 'Gagal menyimpan draft.');
    }
  }

  async function handlePublishToggle() {
    if (!chapter) return;
    const nextStatus = chapter.status === 'published' ? 'draft' : 'published';
    setPublishing(true);
    try {
      const updated = await apiClient<Chapter>(`/books/${bookId}/chapters/${chapterId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      setChapter(updated);
      setChapters((prev) => prev?.map((c) => (c.id === updated.id ? updated : c)) ?? prev);
      toast.success(
        nextStatus === 'published'
          ? 'Chapter berhasil dipublish.'
          : 'Publish dibatalkan, Chapter kembali ke draft.',
      );
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal mengubah status Chapter.');
    } finally {
      setPublishing(false);
    }
  }

  async function handleNewChapterFromSidebar() {
    setCreatingChapter(true);
    try {
      const created = await apiClient<Chapter>(`/books/${bookId}/chapters`, {
        method: 'POST',
        body: JSON.stringify({ judul: 'Chapter Baru' }),
      });
      setChapters((prev) => (prev ? [...prev, created] : [created]));
      router.push(`/dashboard/books/${bookId}/chapters/${created.id}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal membuat Chapter baru.');
    } finally {
      setCreatingChapter(false);
    }
  }

  async function handleDeleteChapter(target: Chapter) {
    const confirmed = window.confirm(
      `Hapus Chapter "${target.judul}"? Tindakan ini tidak bisa dibatalkan.`,
    );
    if (!confirmed) return;

    setDeletingChapterId(target.id);
    try {
      await apiClient(`/books/${bookId}/chapters/${target.id}`, { method: 'DELETE' });
      const remaining = (chapters ?? []).filter((c) => c.id !== target.id);
      setChapters(remaining);
      toast.success('Chapter dihapus.');

      // Chapter yang sedang dibuka ikut terhapus — pindah ke Chapter lain
      // yang tersisa, atau balik ke daftar Book kalau tidak ada lagi.
      if (target.id === chapterId) {
        if (remaining.length > 0) {
          router.replace(`/dashboard/books/${bookId}/chapters/${remaining[0].id}`);
        } else {
          router.replace(`/dashboard/books/${bookId}`);
        }
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal menghapus Chapter.');
    } finally {
      setDeletingChapterId(null);
    }
  }

  if (error) {
    return <p className="text-sm text-destructive">Gagal memuat Chapter: {error}</p>;
  }

  if (!chapter) {
    return <LoadingSpinner label="Memuat Chapter…" />;
  }

  const isPublished = chapter.status === 'published';

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-card px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        {!distractionFree && (
          <Link
            href={`/dashboard/books/${bookId}`}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            title="Kembali ke daftar Chapter"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
        )}
        <Badge variant={CHAPTER_STATUS_VARIANT[chapter.status]}>
          {CHAPTER_STATUS_LABEL[chapter.status]}
        </Badge>
        <SaveIndicator status={saveStatus} />
      </div>

      <div className="flex items-center gap-2">
        {isManualMode && (
          <Button
            variant={isEditing ? 'default' : 'outline'}
            size="sm"
            disabled={saveStatus === 'saving'}
            onClick={isEditing ? handleManualSave : () => setIsEditing(true)}
          >
            {isEditing ? (
              <>
                <Save className="mr-1.5 h-3.5 w-3.5" />
                {saveStatus === 'saving' ? 'Menyimpan…' : 'Simpan'}
              </>
            ) : (
              <>
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Edit
              </>
            )}
          </Button>
        )}
        <Button
          variant={isPublished ? 'outline' : 'default'}
          size="sm"
          disabled={publishing}
          onClick={handlePublishToggle}
        >
          {publishing ? 'Memproses…' : isPublished ? 'Batalkan Publish' : 'Publish'}
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          title={distractionFree ? 'Keluar dari mode fokus' : 'Mode fokus (sembunyikan panel)'}
          onClick={() => setDistractionFree((v) => !v)}
        >
          {distractionFree ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );

  const titleInput = (
    <input
      value={judul}
      disabled={!isEditing}
      onChange={(e) => setJudul(e.target.value)}
      placeholder="Judul Chapter"
      className="w-full border-0 bg-transparent px-4 pt-4 text-xl font-semibold outline-none placeholder:text-muted-foreground sm:px-8"
    />
  );

  const editorArea = (
    <div className="flex flex-1 flex-col gap-3 overflow-hidden px-4 pb-4 sm:px-8 sm:pb-8">
      <RichTextEditor value={konten} onChange={setKonten} disabled={!isEditing} className="flex-1" />
    </div>
  );

  const chapterSidebar = chapters && (
    <aside className="hidden w-44 shrink-0 flex-col overflow-y-auto border-r bg-card md:flex">
      <div className="flex items-center justify-between border-b px-3 py-3">
        <span className="text-xs font-semibold text-muted-foreground">Chapter di Book ini</span>
        <Button
          variant="ghost"
          size="icon-sm"
          title="Chapter baru"
          disabled={creatingChapter}
          onClick={handleNewChapterFromSidebar}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <nav className="flex flex-col gap-0.5 p-2">
        {chapters.map((c, i) => (
          <div
            key={c.id}
            className={cn(
              'group flex items-center gap-1 rounded-md pl-2.5 pr-1 text-sm',
              c.id === chapterId
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )}
          >
            <Link
              href={`/dashboard/books/${bookId}/chapters/${c.id}`}
              className="flex min-w-0 flex-1 items-center gap-2 py-2"
            >
              <FileText className="h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0 flex-1 truncate">
                {i + 1}. {c.judul}
              </span>
              {c.status === 'published' && (
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              )}
            </Link>
            <Button
              variant="ghost"
              size="icon-sm"
              title="Hapus Chapter"
              disabled={deletingChapterId === c.id}
              onClick={() => handleDeleteChapter(c)}
              className="shrink-0 opacity-0 group-hover:opacity-100 hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </nav>
    </aside>
  );

  if (distractionFree) {
    return (
      <div className="fixed inset-0 z-60 flex flex-col bg-background">
        {header}
        <div className="flex flex-1 flex-col overflow-y-auto">
          {titleInput}
          {editorArea}
        </div>
      </div>
    );
  }

  return (
    <div className="-m-4 flex h-[calc(100vh-4rem)] overflow-hidden sm:-m-6 lg:-m-8">
      {chapterSidebar}
      <div className="flex flex-1 flex-col overflow-hidden">
        {header}
        <div className="flex flex-1 flex-col overflow-y-auto">
          {titleInput}
          {editorArea}
        </div>
      </div>
    </div>
  );
}
