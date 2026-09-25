'use client';

import { useEffect, useState } from 'react';
import { BookmarkPlus, Check, Plus } from 'lucide-react';
import { toast } from 'sonner';

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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Collection {
  id: string;
  name: string;
  description?: string | null;
  is_public?: boolean;
  created_at?: string;
}

interface BookCollectionActionProps {
  bookId: string;
  bookTitle: string;
  variant?: 'default' | 'icon';
  className?: string;
}

export function BookCollectionAction({ bookId, bookTitle, variant = 'default', className }: BookCollectionActionProps) {
  const { isLoggedIn, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loadingCollections, setLoadingCollections] = useState(false);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionDescription, setNewCollectionDescription] = useState('');
  const [notifyOnAuthorUpdate, setNotifyOnAuthorUpdate] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || loading || !isLoggedIn) return;

    const loadCollections = async () => {
      setLoadingCollections(true);
      try {
        const data = await apiClient<Collection[]>('/collections');
        setCollections(data);
      } catch (error) {
        console.error('[BookCollectionAction] failed to load collections:', error);
        toast.error('Gagal memuat koleksi Anda');
      } finally {
        setLoadingCollections(false);
      }
    };

    void loadCollections();
  }, [open, loading, isLoggedIn]);

  const handleLoginRedirect = () => {
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/auth/login?next=${next}`;
  };

  const addBookToCollection = async (collectionId: string) => {
    setSaving(true);
    try {
      await apiClient(`/collections/${collectionId}/books`, {
        method: 'POST',
        body: JSON.stringify({
          bookId,
          notifyOnAuthorUpdate,
          status: 'saved',
        }),
      });
      toast.success('Buku ditambahkan ke koleksi');
      setOpen(false);
      setSelectedCollectionId(null);
      setNewCollectionName('');
      setNewCollectionDescription('');
      setNotifyOnAuthorUpdate(true);
    } catch (error) {
      console.error('[BookCollectionAction] add book failed:', error);
      const msg = error instanceof Error ? error.message : 'Gagal menambahkan buku';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateAndAdd = async () => {
    const name = newCollectionName.trim();
    if (!name) {
      toast.error('Nama koleksi tidak boleh kosong');
      return;
    }

    setSaving(true);
    try {
      const createdCollection = await apiClient<Collection>('/collections', {
        method: 'POST',
        body: JSON.stringify({
          name,
          description: newCollectionDescription.trim() || undefined,
          isPublic: false,
        }),
      });
      await apiClient(`/collections/${createdCollection.id}/books`, {
        method: 'POST',
        body: JSON.stringify({
          bookId,
          notifyOnAuthorUpdate,
          status: 'saved',
        }),
      });
      toast.success(`Buku ditambahkan ke koleksi “${name}”`);
      setOpen(false);
      setIsCreatingCollection(false);
      setNewCollectionName('');
      setNewCollectionDescription('');
      setNotifyOnAuthorUpdate(true);
    } catch (error) {
      console.error('[BookCollectionAction] create collection failed:', error);
      const msg = error instanceof Error ? error.message : 'Gagal membuat koleksi';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {variant === 'icon' ? (
          <button
            type="button"
            className={className ?? 'inline-flex items-center gap-1 rounded-full bg-[var(--reader-bg)] px-2 py-0.5 text-[11px] text-[var(--reader-muted)] hover:text-[var(--reader-terracotta)]'}
            disabled={loading || saving}
            onClick={() => {
              if (!isLoggedIn) {
                handleLoginRedirect();
                return;
              }
              setOpen(true);
            }}
            aria-label={`Tambah ${bookTitle} ke koleksi`}
            title={`Tambah ${bookTitle} ke koleksi`}
          >
            <BookmarkPlus className="h-3.5 w-3.5" />
            <span>Tambah</span>
          </button>
        ) : (
          <button
            type="button"
            className={className ?? 'mt-2 flex w-fit items-center gap-2 rounded-full bg-[var(--reader-terracotta)] px-5 py-2 text-sm font-medium text-[var(--reader-terracotta-foreground)] transition-opacity hover:opacity-90 disabled:opacity-60'}
            disabled={loading || saving}
            onClick={() => {
              if (!isLoggedIn) {
                handleLoginRedirect();
                return;
              }
              setOpen(true);
            }}
          >
            <BookmarkPlus className="h-4 w-4" />
            Tambahkan Ke Koleksi
          </button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Tambah {bookTitle} ke koleksi</DialogTitle>
          <DialogDescription>
            Pilih koleksi yang sudah ada atau buat koleksi baru untuk buku ini.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Koleksi Anda</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={() => setIsCreatingCollection((prev) => !prev)}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                {isCreatingCollection ? 'Batal' : 'Buat baru'}
              </Button>
            </div>

            {loadingCollections ? (
              <p className="rounded-md border border-dashed border-[var(--reader-border)] px-3 py-4 text-sm text-[var(--reader-muted)]">
                Memuat koleksi...
              </p>
            ) : collections.length === 0 ? (
              <p className="rounded-md border border-dashed border-[var(--reader-border)] px-3 py-4 text-sm text-[var(--reader-muted)]">
                Anda belum punya koleksi. Buat koleksi baru di bawah.
              </p>
            ) : (
              <div className="space-y-2">
                {collections.map((collection) => {
                  const active = selectedCollectionId === collection.id;
                  return (
                    <button
                      key={collection.id}
                      type="button"
                      className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left transition-colors ${
                        active
                          ? 'border-[var(--reader-terracotta)] bg-[var(--reader-terracotta)]/5'
                          : 'border-[var(--reader-border)] bg-[var(--reader-surface)] hover:border-[var(--reader-terracotta)]/60'
                      }`}
                      onClick={() => {
                        setSelectedCollectionId(collection.id);
                        void addBookToCollection(collection.id);
                      }}
                      disabled={saving}
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium text-[var(--reader-foreground)]">{collection.name}</div>
                        {collection.description ? (
                          <div className="truncate text-xs text-[var(--reader-muted)]">{collection.description}</div>
                        ) : null}
                      </div>
                      {active ? <Check className="h-4 w-4 text-[var(--reader-terracotta)]" /> : null}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {isCreatingCollection && (
            <div className="space-y-3 rounded-md border border-[var(--reader-border)] bg-[var(--reader-surface)] p-3">
              <div className="space-y-1">
                <Label htmlFor="new-collection-name">Nama koleksi</Label>
                <Input
                  id="new-collection-name"
                  value={newCollectionName}
                  onChange={(event) => setNewCollectionName(event.target.value)}
                  placeholder="Contoh: Buku favorit"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="new-collection-description">Deskripsi (opsional)</Label>
                <Input
                  id="new-collection-description"
                  value={newCollectionDescription}
                  onChange={(event) => setNewCollectionDescription(event.target.value)}
                  placeholder="Tambahkan catatan singkat"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-[var(--reader-foreground)]">
                <input
                  type="checkbox"
                  checked={notifyOnAuthorUpdate}
                  onChange={(event) => setNotifyOnAuthorUpdate(event.target.checked)}
                  className="h-4 w-4 rounded border-[var(--reader-border)]"
                />
                Notify me when author updates this book
              </label>
            </div>
          )}

          {!isCreatingCollection && (
            <label className="flex items-center gap-2 text-sm text-[var(--reader-foreground)]">
              <input
                type="checkbox"
                checked={notifyOnAuthorUpdate}
                onChange={(event) => setNotifyOnAuthorUpdate(event.target.checked)}
                className="h-4 w-4 rounded border-[var(--reader-border)]"
              />
              Notify me when author updates this book
            </label>
          )}
        </div>

        <DialogFooter className="sm:justify-between">
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Tutup
          </Button>
          {isCreatingCollection ? (
            <Button type="button" onClick={() => void handleCreateAndAdd()} disabled={saving}>
              {saving ? 'Menyimpan...' : 'Simpan koleksi'}
            </Button>
          ) : (
            <Button type="button" onClick={() => setIsCreatingCollection(true)} disabled={saving}>
              Buat koleksi baru
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
