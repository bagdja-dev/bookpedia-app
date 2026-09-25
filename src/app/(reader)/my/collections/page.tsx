'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, BellOff, Loader2, Pencil, Trash2 } from 'lucide-react';

import { BookSlider } from '@/components/reader/book-slider';
import { useAuth } from '@/hooks/use-auth';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { BookCatalogDto, MyCollectionDto, MyCollectionItemDto } from '@/lib/public-types';

interface CollectionWithBooks extends MyCollectionDto {
  books: MyCollectionItemDto[];
}

export default function MyCollectionsPage() {
  const { isLoggedIn, loading: authLoading } = useAuth();
  const router = useRouter();
  const [collections, setCollections] = useState<CollectionWithBooks[] | null>(null);
  const [pendingOps, setPendingOps] = useState<Record<string, 'toggle' | 'remove'>>({});
  const [collectionAction, setCollectionAction] = useState<{ id: string | null; name: string; description: string }>({
    id: null,
    name: '',
    description: '',
  });

  const load = useCallback(async () => {
    try {
      const data = await apiClient<MyCollectionDto[]>('/collections');
      const collectionList = Array.isArray(data) ? data : [];

      const withBooks = await Promise.all(
        collectionList.map(async (collection) => {
          const items = await apiClient<MyCollectionItemDto[]>(`/collections/${collection.id}/books`);
          return {
            ...collection,
            books: Array.isArray(items) ? items : [],
          };
        }),
      );

      setCollections(withBooks);
    } catch (error) {
      console.error('[MyCollectionsPage] gagal memuat koleksi:', error);
      setCollections([]);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) {
      router.replace('/auth/login?next=/my/collections');
      return;
    }
    void load();
  }, [authLoading, isLoggedIn, load, router]);

  const updateCollectionItem = useCallback(
    (collectionId: string, bookId: string, updater: (item: MyCollectionItemDto) => MyCollectionItemDto) => {
      setCollections((current) =>
        current?.map((collection) =>
          collection.id !== collectionId
            ? collection
            : {
                ...collection,
                books: collection.books.map((item) => (item.bookId === bookId ? updater(item) : item)),
              },
        ) ?? current,
      );
    },
    [],
  );

  const handleToggleNotify = useCallback(
    async (collectionId: string, item: MyCollectionItemDto) => {
      const key = `${collectionId}:${item.bookId}`;
      setPendingOps((current) => ({ ...current, [key]: 'toggle' }));
      try {
        const updated = await apiClient<{ notify_on_author_update?: boolean; notifyOnAuthorUpdate?: boolean }>(
          `/collections/${collectionId}/books/${item.bookId}`,
          {
            method: 'PATCH',
            body: JSON.stringify({ notifyOnAuthorUpdate: !item.notifyOnAuthorUpdate }),
          },
        );
        const nextValue =
          updated.notifyOnAuthorUpdate ?? updated.notify_on_author_update ?? !item.notifyOnAuthorUpdate;
        updateCollectionItem(collectionId, item.bookId, (entry) => ({ ...entry, notifyOnAuthorUpdate: nextValue }));
      } catch (error) {
        console.error('[MyCollectionsPage] gagal update notify:', error);
      } finally {
        setPendingOps((current) => {
          const next = { ...current };
          delete next[key];
          return next;
        });
      }
    },
    [updateCollectionItem],
  );

  const handleRemoveBook = useCallback(
    async (collectionId: string, item: MyCollectionItemDto) => {
      const key = `${collectionId}:${item.bookId}`;
      setPendingOps((current) => ({ ...current, [key]: 'remove' }));
      try {
        await apiClient(`/collections/${collectionId}/books/${item.bookId}`, { method: 'DELETE' });
        setCollections((current) =>
          current?.map((collection) =>
            collection.id !== collectionId
              ? collection
              : {
                  ...collection,
                  books: collection.books.filter((entry) => entry.bookId !== item.bookId),
                },
          ) ?? current,
        );
      } catch (error) {
        console.error('[MyCollectionsPage] gagal hapus buku dari koleksi:', error);
      } finally {
        setPendingOps((current) => {
          const next = { ...current };
          delete next[key];
          return next;
        });
      }
    },
    [],
  );

  const handleEditCollection = useCallback(async () => {
    if (!collectionAction.id) return;
    const trimmedName = collectionAction.name.trim();
    if (!trimmedName) return;

    setPendingOps((current) => ({ ...current, [collectionAction.id!]: 'toggle' }));
    try {
      const updated = await apiClient<MyCollectionDto>(`/collections/${collectionAction.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: trimmedName,
          description: collectionAction.description.trim() || null,
        }),
      });
      setCollections((current) =>
        current?.map((collection) =>
          collection.id === collectionAction.id
            ? { ...collection, name: updated.name, description: updated.description ?? null }
            : collection,
        ) ?? current,
      );
      setCollectionAction({ id: null, name: '', description: '' });
    } catch (error) {
      console.error('[MyCollectionsPage] gagal update koleksi:', error);
    } finally {
      setPendingOps((current) => {
        const next = { ...current };
        delete next[collectionAction.id!];
        return next;
      });
    }
  }, [collectionAction]);

  const handleDeleteCollection = useCallback(async (collectionId: string) => {
    setPendingOps((current) => ({ ...current, [collectionId]: 'remove' }));
    try {
      await apiClient(`/collections/${collectionId}`, { method: 'DELETE' });
      setCollections((current) => current?.filter((collection) => collection.id !== collectionId) ?? current);
    } catch (error) {
      console.error('[MyCollectionsPage] gagal hapus koleksi:', error);
    } finally {
      setPendingOps((current) => {
        const next = { ...current };
        delete next[collectionId];
        return next;
      });
    }
  }, []);

  const handleToggleCollectionNotify = useCallback(async (collection: CollectionWithBooks) => {
    const nextValue = collection.books.length > 0 ? !collection.books.every((item) => item.notifyOnAuthorUpdate) : false;
    setPendingOps((current) => ({ ...current, [collection.id]: 'toggle' }));
    try {
      await Promise.all(
        collection.books.map((item) =>
          apiClient(`/collections/${collection.id}/books/${item.bookId}`, {
            method: 'PATCH',
            body: JSON.stringify({ notifyOnAuthorUpdate: nextValue }),
          }),
        ),
      );
      setCollections((current) =>
        current?.map((entry) =>
          entry.id !== collection.id
            ? entry
            : {
                ...entry,
                books: entry.books.map((item) => ({ ...item, notifyOnAuthorUpdate: nextValue })),
              },
        ) ?? current,
      );
    } catch (error) {
      console.error('[MyCollectionsPage] gagal update notifikasi koleksi:', error);
    } finally {
      setPendingOps((current) => {
        const next = { ...current };
        delete next[collection.id];
        return next;
      });
    }
  }, []);

  const platformSlug = process.env.NEXT_PUBLIC_DEFAULT_PLATFORM_SLUG ?? 'bookpedia';

  if (authLoading || !isLoggedIn) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-[var(--reader-muted)] sm:px-6">Memuat…</div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1
          className="text-2xl font-semibold text-[var(--reader-foreground)] sm:text-3xl"
          style={{ fontFamily: 'var(--font-source-serif)' }}
        >
          Koleksi Saya
        </h1>
      </div>

      {collections === null ? (
        <p className="text-sm text-[var(--reader-muted)]">Memuat koleksi…</p>
      ) : collections.length === 0 ? (
        <div className="rounded-lg border border-[var(--reader-border)] bg-[var(--reader-surface)] px-4 py-8 text-center text-sm text-[var(--reader-muted)]">
          Belum ada koleksi. Tambahkan buku dari halaman detail cerita untuk menyiapkan koleksi favoritmu.
        </div>
      ) : (
        <>
          <Dialog
            open={!!collectionAction.id}
            onOpenChange={(open) => {
              if (!open) setCollectionAction({ id: null, name: '', description: '' });
            }}
          >
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Edit nama koleksi</DialogTitle>
                <DialogDescription>Ubah judul dan deskripsi koleksi Anda.</DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="collection-name">Nama koleksi</Label>
                  <Input
                    id="collection-name"
                    value={collectionAction.name}
                    onChange={(event) => setCollectionAction((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Masukkan nama koleksi"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="collection-description">Deskripsi</Label>
                  <Input
                    id="collection-description"
                    value={collectionAction.description}
                    onChange={(event) => setCollectionAction((current) => ({ ...current, description: event.target.value }))}
                    placeholder="Opsional"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCollectionAction({ id: null, name: '', description: '' })}>
                  Batal
                </Button>
                <Button type="button" onClick={() => void handleEditCollection()} disabled={!collectionAction.name.trim()}>
                  Simpan
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div className="space-y-10">
          {collections.map((collection) => {
            const books = collection.books
              .filter((item) => item.book)
              .map((item) => item.book as BookCatalogDto);

            return (
              <section key={collection.id} className="space-y-3">
                <div className="flex items-end justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2
                        className="truncate text-2xl font-semibold text-[var(--reader-foreground)]"
                        style={{ fontFamily: 'var(--font-source-serif)' }}
                      >
                        {collection.name}
                      </h2>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          aria-label="Edit nama koleksi"
                          title="Edit nama koleksi"
                          onClick={() => {
                            setCollectionAction({
                              id: collection.id,
                              name: collection.name,
                              description: collection.description ?? '',
                            });
                          }}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--reader-border)] bg-[var(--reader-surface)] text-[var(--reader-muted)] hover:border-[var(--reader-terracotta)] hover:text-[var(--reader-terracotta)]"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label="Hapus koleksi"
                          title="Hapus koleksi"
                          onClick={() => void handleDeleteCollection(collection.id)}
                          disabled={pendingOps[collection.id] === 'remove' || pendingOps[collection.id] === 'toggle'}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--reader-border)] bg-[var(--reader-surface)] text-[var(--reader-muted)] hover:border-[var(--reader-terracotta)] hover:text-[var(--reader-terracotta)] disabled:opacity-50"
                        >
                          {pendingOps[collection.id] === 'remove' ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          aria-label={collection.books.length > 0 && collection.books.every((item) => item.notifyOnAuthorUpdate) ? 'Nonaktifkan notifikasi koleksi' : 'Aktifkan notifikasi koleksi'}
                          title={collection.books.length > 0 && collection.books.every((item) => item.notifyOnAuthorUpdate) ? 'Nonaktifkan notifikasi koleksi' : 'Aktifkan notifikasi koleksi'}
                          onClick={() => void handleToggleCollectionNotify(collection)}
                          disabled={pendingOps[collection.id] === 'remove' || pendingOps[collection.id] === 'toggle' || collection.books.length === 0}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--reader-border)] bg-[var(--reader-surface)] text-[var(--reader-muted)] hover:border-[var(--reader-terracotta)] hover:text-[var(--reader-terracotta)] disabled:opacity-50"
                        >
                          {pendingOps[collection.id] === 'toggle' ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : collection.books.length > 0 && collection.books.every((item) => item.notifyOnAuthorUpdate) ? (
                            <Bell className="h-3.5 w-3.5" />
                          ) : (
                            <BellOff className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                    {collection.description ? (
                      <p className="mt-1 text-sm text-[var(--reader-muted)]">{collection.description}</p>
                    ) : null}
                  </div>
                  <span className="shrink-0 text-xs font-medium text-[var(--reader-muted)]">
                    {books.length} buku
                  </span>
                </div>

                {books.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-[var(--reader-border)] bg-[var(--reader-surface)] px-4 py-6 text-sm text-[var(--reader-muted)]">
                    Koleksi ini masih kosong.
                  </div>
                ) : (
                  <BookSlider
                    books={books}
                    platformSlug={platformSlug}
                    showStatus={true}
                    showRating={true}
                    showLike={true}
                    showComment={true}
                    showCollectionActions={false}
                    renderBookActions={(book) => {
                      const item = collection.books.find((entry) => entry.bookId === book.id);
                      if (!item) return null;
                      const actionKey = `${collection.id}:${book.id}`;
                      const isBusy = pendingOps[actionKey];

                      return (
                        <div className="flex items-center gap-1 rounded-full border border-[var(--reader-border)] bg-[var(--reader-surface)]/95 p-1 shadow-sm">
                          <button
                            type="button"
                            onClick={() => void handleToggleNotify(collection.id, item)}
                            disabled={isBusy === 'toggle' || isBusy === 'remove'}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[var(--reader-muted)] hover:bg-[var(--reader-bg)] hover:text-[var(--reader-terracotta)] disabled:opacity-50"
                            aria-label={item.notifyOnAuthorUpdate ? 'Nonaktifkan notifikasi update penulis' : 'Aktifkan notifikasi update penulis'}
                            title={item.notifyOnAuthorUpdate ? 'Nonaktifkan notifikasi update penulis' : 'Aktifkan notifikasi update penulis'}
                          >
                            {isBusy === 'toggle' ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : item.notifyOnAuthorUpdate ? (
                              <Bell className="h-3.5 w-3.5" />
                            ) : (
                              <BellOff className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleRemoveBook(collection.id, item)}
                            disabled={isBusy === 'toggle' || isBusy === 'remove'}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[var(--reader-muted)] hover:bg-[var(--reader-bg)] hover:text-[var(--reader-terracotta)] disabled:opacity-50"
                            aria-label="Hapus dari koleksi"
                            title="Hapus dari koleksi"
                          >
                            {isBusy === 'remove' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      );
                    }}
                  />
                )}
              </section>
            );
          })}
        </div>
        </>
      )}
    </div>
  );
}
