'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, BookOpen, Plus, Search, Trash2, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { apiClient, ApiError } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import type { BookCatalogDto } from '@/lib/public-types';
import type { Book, SeriesDetail, SeriesSummary, SeriesBookSummary, CreateSeriesPayload, UpdateSeriesPayload } from '@/lib/types';

const MAX_SERIES_BOOKS = 50;

function toSeriesBook(book: BookCatalogDto): SeriesBookSummary {
  return {
    id: book.id,
    judul: book.judul,
    slug: book.slug,
    coverUrl: book.coverUrl,
    libraryNama: book.library.nama,
    publishedAt: null,
    status: book.status,
  };
}

function CoverThumb({ coverUrl, judul, className }: { coverUrl: string | null; judul: string; className?: string }) {
  return (
    <div className={`relative aspect-[3/4] overflow-hidden rounded-md bg-muted ${className ?? 'w-full'}`}>
      {coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- coverUrl dari storage eksternal yang sudah valid.
        <img src={coverUrl} alt={judul} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">Tanpa cover</div>
      )}
    </div>
  );
}

function toCatalogBook(book: Book): BookCatalogDto {
  return {
    id: book.id,
    judul: book.judul,
    slug: book.slug,
    sinopsis: book.sinopsis,
    genre: book.genre,
    category: book.category,
    tags: book.tags,
    series: null,
    coverUrl: book.coverUrl,
    status: book.status,
    latestChapterTitle: null,
    bookType: book.bookType,
    originalAuthor: book.originalAuthor,
    library: {
      nama: 'Studio',
      slug: '',
    },
    viewCount: book.viewCount,
    ratingAverage: book.ratingAverage,
    ratingCount: book.ratingCount,
    likeCount: 0,
    commentCount: book.commentCount,
  };
}

export default function SeriesPage() {
  const [seriesList, setSeriesList] = useState<SeriesSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState('');
  const [items, setItems] = useState<SeriesBookSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searching, setSearching] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState<BookCatalogDto[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [draftSeriesId, setDraftSeriesId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    apiClient<SeriesSummary[]>('/series')
      .then((data) => {
        if (cancelled) return;
        setSeriesList(data);
        const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches;
        const isDraftSelection = !!selectedId && selectedId.startsWith('draft-');

        if (data.length > 0 && !selectedId) {
          if (!isMobile) {
            setSelectedId(data[0].id);
          }
          return;
        }

        if (selectedId && !isDraftSelection && !data.some((item) => item.id === selectedId)) {
          setSelectedId(data[0]?.id ?? null);
        }
      })
      .catch(() => {
        if (!cancelled) setSeriesList([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId || selectedId.startsWith('draft-')) {
      if (selectedId && selectedId.startsWith('draft-')) {
        setDraftSeriesId(selectedId);
      }
      return;
    }
    let cancelled = false;

    apiClient<SeriesDetail>(`/series/${selectedId}`)
      .then((data) => {
        if (cancelled) return;
        setSelectedName(data.nama);
        setItems(data.books);
        setDraftSeriesId(null);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error(error);
        setItems([]);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  useEffect(() => {
    if (!dialogOpen) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = searchInput.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    debounceRef.current = setTimeout(() => {
      apiClient<Book[]>('/books')
        .then((data) => {
          const normalized = data
            .filter((book) => book.judul.toLowerCase().includes(trimmed.toLowerCase()))
            .filter((book) => !items.some((item) => item.id === book.id))
            .map((book) => toCatalogBook(book));

          setSearchResults(normalized);
        })
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [dialogOpen, searchInput, items]);

  async function createNewSeries() {
    const draftId = `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const draftName = `Series ${seriesList.length + 1}`;

    setSelectedId(draftId);
    setSelectedName(draftName);
    setItems([]);
    setDraftSeriesId(draftId);
  }

  async function saveSeries() {
    if (!selectedId) return;
    setSaving(true);
    try {
      const payload = {
        nama: selectedName.trim(),
        bookIds: items.map((item) => item.id),
      } satisfies UpdateSeriesPayload;

      if (selectedId.startsWith('draft-')) {
        const created = await apiClient<SeriesDetail>('/series', {
          method: 'POST',
          body: JSON.stringify({ nama: payload.nama, bookIds: payload.bookIds } satisfies CreateSeriesPayload),
        });

        setSeriesList((current) =>
          current.map((series) =>
            series.id === selectedId ? { id: created.id, nama: created.nama, bookCount: created.books.length, createdAt: created.createdAt, updatedAt: created.updatedAt } : series,
          ),
        );
        setSelectedId(created.id);
        setSelectedName(created.nama);
        setItems(created.books);
        setDraftSeriesId(null);
        return;
      }

      const updated = await apiClient<SeriesDetail>(`/series/${selectedId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      setSelectedName(updated.nama);
      setItems(updated.books);
      setSeriesList((current) =>
        current.map((series) =>
          series.id === updated.id ? { ...series, nama: updated.nama, bookCount: updated.books.length, updatedAt: updated.updatedAt } : series,
        ),
      );
    } catch (err) {
      console.error(err);
      alert(err instanceof ApiError ? err.message : 'Gagal menyimpan series.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteSeries() {
    if (!selectedId || selectedId.startsWith('draft-')) return;
    setDeleting(true);
    try {
      await apiClient(`/series/${selectedId}`, { method: 'DELETE' });
      const nextList = seriesList.filter((item) => item.id !== selectedId);
      setSeriesList(nextList);
      if (nextList.length > 0) {
        setSelectedId(nextList[0].id);
      } else {
        setSelectedId(null);
        setSelectedName('');
        setItems([]);
      }
    } catch (err) {
      console.error(err);
      alert(err instanceof ApiError ? err.message : 'Gagal menghapus series.');
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  }

  function addBook(book: BookCatalogDto) {
    if (items.some((item) => item.id === book.id)) return;
    if (items.length >= MAX_SERIES_BOOKS) {
      toast.error(`Maksimal ${MAX_SERIES_BOOKS} buku per series.`);
      return;
    }
    setItems((current) => [...current, toSeriesBook(book)]);
    setDialogOpen(false);
    setSearchInput('');
    setSearchResults([]);
  }

  function removeBook(id: string) {
    setItems((current) => current.filter((item) => item.id !== id));
  }

  function moveItem(index: number, direction: -1 | 1) {
    setItems((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  const visibleSeriesList = draftSeriesId
    ? [
        {
          id: draftSeriesId,
          nama: selectedName.trim() || 'Series baru',
          bookCount: items.length,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        ...seriesList.filter((item) => item.id !== draftSeriesId),
      ]
    : seriesList;

  const selectedSeries = visibleSeriesList.find((item) => item.id === selectedId) ?? null;
  const isDraftSeries = !!selectedId && selectedId.startsWith('draft-');

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Series</h1>
          <p className="text-sm text-muted-foreground">Kelola kelompok buku yang masuk ke satu seri.</p>
        </div>
        <Button onClick={createNewSeries} className="gap-2">
          <Plus className="h-4 w-4" />
          Series Baru
        </Button>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Hapus series?</DialogTitle>
            <DialogDescription>
              Tindakan ini akan menghapus series <span className="font-semibold text-foreground">{selectedSeries?.nama ?? selectedName}</span> secara permanen.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={deleteSeries} disabled={deleting}>
              {deleting ? 'Menghapus…' : 'Hapus'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {loading ? (
        <p className="text-sm text-muted-foreground">Memuat series…</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[190px_1fr]">
          <div className={cn('rounded-lg border bg-card p-2', selectedId && 'hidden lg:block')}>
            <div className="mb-1.5 flex items-center justify-between">
              <h2 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Series</h2>
              <span className="text-[9px] text-muted-foreground">{seriesList.length}</span>
            </div>
            <div className="space-y-1">
              {visibleSeriesList.length === 0 ? (
                <p className="rounded border border-dashed p-2 text-[11px] text-muted-foreground">Belum ada series.</p>
              ) : (
                visibleSeriesList.map((series) => (
                  <button
                    key={series.id}
                    type="button"
                    onClick={() => setSelectedId(series.id)}
                    className={`flex w-full items-center justify-between gap-1.5 rounded border px-2 py-1.5 text-left transition ${selectedId === series.id ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-muted/70'}`}
                  >
                    <span className="min-w-0 flex-1 truncate text-xs font-medium">{series.nama}</span>
                    <span className="shrink-0 rounded-full bg-muted px-1 py-0.5 text-[9px] text-muted-foreground">{series.bookCount}</span>
                  </button>
                ))
              )}
            </div>
          </div>

          {selectedId ? (
            <div className={cn('rounded-xl border bg-card p-4', selectedId ? 'block' : 'hidden', 'lg:block')}>
              <div className="mb-4 flex items-center justify-between gap-3 border-b pb-3 lg:hidden">
                <button type="button" onClick={() => setSelectedId(null)} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ArrowLeft className="h-4 w-4" />
                  Kembali
                </button>
                <div className="flex min-w-0 flex-col items-end">
                  <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Detail</span>
                  <span className="max-w-[12rem] truncate text-xs font-medium text-foreground">{selectedSeries?.nama ?? selectedName}</span>
                </div>
              </div>

              <div className="mb-4 flex flex-col gap-3 border-b pb-4 md:flex-row md:items-center md:justify-between">
                <div className="flex-1">
                  <label htmlFor="series-name" className="mb-1 block text-xs font-medium text-muted-foreground">Nama Series</label>
                  <Input
                    id="series-name"
                    value={selectedName}
                    onChange={(event) => setSelectedName(event.target.value)}
                    placeholder="Masukkan nama series"
                  />
                </div>
                <div className="flex gap-2">
                  {!isDraftSeries && (
                    <Button variant="outline" onClick={() => setDeleteDialogOpen(true)} disabled={deleting} className="gap-2">
                      <Trash2 className="h-4 w-4" />
                      {deleting ? 'Menghapus…' : 'Hapus'}
                    </Button>
                  )}
                  <Button onClick={saveSeries} disabled={saving} className="gap-2">
                    {saving ? 'Menyimpan…' : 'Simpan'}
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold">Buku di Series</h2>
                    <p className="text-xs text-muted-foreground">
                      Pilih buku dari Studio yang sama. Maksimal {MAX_SERIES_BOOKS} buku per series.
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">{items.length}/{MAX_SERIES_BOOKS}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
                  {items.map((item, index) => (
                    <div key={item.id} className="flex flex-col gap-1.5">
                      <div className="relative">
                        <CoverThumb coverUrl={item.coverUrl} judul={item.judul} className="w-full" />
                        <button
                          type="button"
                          onClick={() => removeBook(item.id)}
                          className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-destructive"
                          title="Hapus"
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
                          onClick={() => moveItem(index, -1)}
                          title="Pindah ke kiri"
                        >
                          <ArrowLeft className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon-sm"
                          disabled={index === items.length - 1}
                          onClick={() => moveItem(index, 1)}
                          title="Pindah ke kanan"
                        >
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {items.length < MAX_SERIES_BOOKS && (
                    <button
                      type="button"
                      onClick={() => setDialogOpen(true)}
                      className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed text-muted-foreground hover:border-primary hover:text-primary"
                    >
                      <BookOpen className="h-6 w-6" />
                      <span className="text-xs">Tambah buku</span>
                    </button>
                  )}
                </div>
              </div>

              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-xl">
                  <DialogHeader>
                    <DialogTitle>Cari Buku untuk Series</DialogTitle>
                    <DialogDescription>Pilih buku dari Studio yang sama. Hanya buku dalam Platform ini yang bisa ditambahkan.</DialogDescription>
                  </DialogHeader>

                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <Input
                      autoFocus
                      placeholder="Cari judul buku dari Studio ini…"
                      value={searchInput}
                      onChange={(event) => setSearchInput(event.target.value)}
                    />
                  </div>

                  {searchInput.trim().length < 2 ? (
                    <p className="py-6 text-center text-xs text-muted-foreground">Ketik minimal 2 huruf untuk mencari buku dalam Studio ini.</p>
                  ) : searching ? (
                    <p className="py-6 text-center text-xs text-muted-foreground">Mencari…</p>
                  ) : searchResults.length === 0 ? (
                    <p className="py-6 text-center text-xs text-muted-foreground">Tidak ada buku ditemukan.</p>
                  ) : (
                    <div className="grid gap-2">
                      {searchResults.map((book) => (
                        <button
                          key={book.id}
                          type="button"
                          onClick={() => addBook(book)}
                          className="flex items-center gap-3 rounded-lg border bg-background p-2 text-left hover:bg-muted"
                        >
                          <CoverThumb coverUrl={book.coverUrl} judul={book.judul} className="w-14" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{book.judul}</p>
                            <p className="truncate text-xs text-muted-foreground">{book.library.nama}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </div>
          ) : (
            <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-dashed bg-card text-center text-sm text-muted-foreground">
              <div>
                <BookOpen className="mx-auto mb-3 h-8 w-8" />
                <p>Pilih atau buat series untuk mulai menata buku.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {seriesList.length > 0 && selectedSeries && (
        <p className="text-xs text-muted-foreground">
          Series yang dipilih: <span className="font-medium text-foreground">{selectedSeries.nama}</span>
        </p>
      )}
    </div>
  );
}
