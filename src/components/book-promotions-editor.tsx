'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Plus, X } from 'lucide-react';

import { SafeImage } from '@/components/safe-image';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { apiClient, ApiError } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import type { PromotedBookSummary, ReplacePromotionsPayload } from '@/lib/types';
import type { BookCatalogDto } from '@/lib/public-types';

const MAX_PROMOTIONS = 10;

function toSummary(book: BookCatalogDto): PromotedBookSummary {
  return { id: book.id, judul: book.judul, slug: book.slug, coverUrl: book.coverUrl, libraryNama: book.library.nama };
}

/**
 * `cn()` (bukan template literal manual) WAJIB di sini — `className` yang
 * dikirim caller (mis. `w-16` di card hasil search) harus bisa MENIMPA
 * default `w-full`, bukan cuma ditempel jadi dua class `w-full w-16`
 * sekaligus (Tailwind tidak dedupe otomatis, hasilnya undefined behavior
 * tergantung urutan di stylesheet — pernah bikin cover di popup search
 * ikut selebar card, bukan thumbnail kecil).
 */
function CoverThumb({ coverUrl, judul, className }: { coverUrl: string | null; judul: string; className?: string }) {
  return (
    <div className={cn('relative aspect-[3/4] w-full shrink-0 overflow-hidden rounded-md bg-muted', className)}>
      {coverUrl ? (
        <SafeImage src={coverUrl} alt={judul} fill sizes="140px" className="object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">Tanpa cover</div>
      )}
    </div>
  );
}

/**
 * "Rekomendasi Penulis" (Studio) — kurasi manual Book yang muncul di
 * halaman publik Book INI (`bookId`), BEBAS dipilih dari Library manapun di
 * Platform yang sama. Layout grid (bukan list) supaya urutan tampil di
 * halaman publik lebih gampang divisualisasikan; tambah Book lewat popup
 * search terpisah (bukan input inline) supaya grid tidak berebut ruang
 * dengan hasil pencarian.
 */
export function BookPromotionsEditor({ bookId, platformSlug }: { bookId: string; platformSlug: string }) {
  const [items, setItems] = useState<PromotedBookSummary[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BookCatalogDto[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiClient<PromotedBookSummary[]>(`/books/${bookId}/promotions`)
      .then((data) => {
        if (!cancelled) setItems(data);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [bookId]);

  useEffect(() => {
    if (!dialogOpen) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    debounceRef.current = setTimeout(() => {
      apiClient<{ items: BookCatalogDto[] }>(
        `/public/platforms/${encodeURIComponent(platformSlug)}/catalog?search=${encodeURIComponent(trimmed)}&limit=10`,
      )
        .then((data) => setResults(data.items))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, platformSlug, dialogOpen]);

  function addBook(book: BookCatalogDto) {
    if (!items) return;
    if (book.id === bookId) {
      toast.error('Tidak bisa mempromosikan Book ini di halamannya sendiri.');
      return;
    }
    if (items.some((item) => item.id === book.id)) return;
    if (items.length >= MAX_PROMOTIONS) {
      toast.error(`Maksimal ${MAX_PROMOTIONS} Book yang bisa dipromosikan.`);
      return;
    }
    setItems([...items, toSummary(book)]);
  }

  function removeBook(id: string) {
    setItems((current) => current?.filter((item) => item.id !== id) ?? current);
  }

  function moveItem(index: number, direction: -1 | 1) {
    setItems((current) => {
      if (!current) return current;
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  }

  async function handleSave() {
    if (!items) return;
    setSaving(true);
    try {
      const payload: ReplacePromotionsPayload = { promotedBookIds: items.map((item) => item.id) };
      const updated = await apiClient<PromotedBookSummary[]>(`/books/${bookId}/promotions`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      setItems(updated);
      toast.success('Rekomendasi Penulis disimpan.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal menyimpan Rekomendasi Penulis.');
    } finally {
      setSaving(false);
    }
  }

  if (!items) {
    return <p className="text-sm text-muted-foreground">Memuat Rekomendasi Penulis…</p>;
  }

  const atLimit = items.length >= MAX_PROMOTIONS;

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">Rekomendasi Penulis</h2>
          <p className="text-xs text-muted-foreground">
            Book pilihan Anda yang tampil di halaman publik Book ini — bebas dari Library manapun. Maks{' '}
            {MAX_PROMOTIONS} Book. Urutan grid = urutan tampil.
          </p>
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">
          {items.length}/{MAX_PROMOTIONS}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {items.map((item, index) => (
          <div key={item.id} className="flex flex-col gap-1.5">
            <div className="relative">
              <CoverThumb coverUrl={item.coverUrl} judul={item.judul} />
              <button
                type="button"
                onClick={() => removeBook(item.id)}
                title="Hapus"
                className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-destructive"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="truncate text-xs font-medium">{item.judul}</p>
            <p className="truncate text-[11px] text-muted-foreground">{item.libraryNama}</p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon-sm"
                disabled={index === 0}
                title="Pindah ke kiri"
                onClick={() => moveItem(index, -1)}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                disabled={index === items.length - 1}
                title="Pindah ke kanan"
                onClick={() => moveItem(index, 1)}
              >
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}

        {!atLimit && (
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-1.5 rounded-md border border-dashed text-muted-foreground hover:border-primary hover:text-primary"
          >
            <Plus className="h-6 w-6" />
            <span className="text-xs">Tambah Book</span>
          </button>
        )}
      </div>

      <div className="flex justify-end">
        <Button size="sm" disabled={saving} onClick={handleSave}>
          {saving ? 'Menyimpan…' : 'Simpan Rekomendasi'}
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Cari Book untuk Dipromosikan</DialogTitle>
            <DialogDescription>Bebas dari Library manapun di Platform ini, tidak harus milik Anda.</DialogDescription>
          </DialogHeader>

          <Input
            autoFocus
            placeholder="Cari judul Book…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <div className="flex flex-col gap-2">
            {query.trim().length < 2 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">Ketik minimal 2 huruf untuk mencari.</p>
            ) : searching ? (
              <p className="py-6 text-center text-xs text-muted-foreground">Mencari…</p>
            ) : results.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">Tidak ada Book ditemukan.</p>
            ) : (
              results.map((book) => {
                const alreadyAdded = book.id === bookId || items.some((item) => item.id === book.id);
                return (
                  <button
                    key={book.id}
                    type="button"
                    disabled={alreadyAdded || atLimit}
                    onClick={() => addBook(book)}
                    className="flex items-center gap-3 rounded-lg border p-2 text-left hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <CoverThumb coverUrl={book.coverUrl} judul={book.judul} className="w-14" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs text-muted-foreground">oleh {book.library.nama}</p>
                      <p className="truncate text-sm font-medium">{book.judul}</p>
                      {book.genre && <p className="truncate text-[11px] text-muted-foreground">{book.genre.nama}</p>}
                    </div>
                    {alreadyAdded ? (
                      <span className="shrink-0 text-[11px] text-muted-foreground">Sudah ditambah</span>
                    ) : (
                      <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
