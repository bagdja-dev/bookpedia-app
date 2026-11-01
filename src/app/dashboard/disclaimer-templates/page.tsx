'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { apiClient, ApiError } from '@/lib/api-client';
import type { DeletedResponse, DisclaimerTemplate, CreateDisclaimerTemplatePayload, UpdateDisclaimerTemplatePayload } from '@/lib/types';
import { useLibraryContext } from '@/context/library-context';
import { X, Pencil, Trash2 } from 'lucide-react';

export default function DisclaimerTemplatesPage() {
  const { id: libraryId } = useLibraryContext();
  const [templates, setTemplates] = useState<DisclaimerTemplate[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<{ nama: string; content: string; isActive: boolean; isDefault: boolean }>({
    nama: '',
    content: '',
    isActive: true,
    isDefault: false,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiClient<DisclaimerTemplate[]>(`/libraries/${libraryId}/disclaimer-templates`).then((data) => {
      if (!cancelled) setTemplates(data ?? []);
    }).catch(() => {
      // Gagal diam-diam — tidak kritikal
    });
    return () => { cancelled = true; };
  }, [libraryId]);

  async function handleCreate() {
    setSubmitting(true);
    try {
      const payload: CreateDisclaimerTemplatePayload = {
        nama: form.nama.trim(),
        content: form.content.trim(),
        isActive: form.isActive,
        isDefault: form.isDefault,
      };
      await apiClient<DisclaimerTemplate>(`/libraries/${libraryId}/disclaimer-templates`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setForm({ nama: '', content: '', isActive: true, isDefault: false });
      setEditingId(null);
      await refresh();
      toast.success('Template disclaimer berhasil dibuat.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal membuat template disclaimer.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate() {
    if (!editingId) return;
    setSubmitting(true);
    try {
      const payload: UpdateDisclaimerTemplatePayload = {
        nama: form.nama.trim(),
        content: form.content.trim(),
        isActive: form.isActive,
        isDefault: form.isDefault,
      };
      await apiClient<DisclaimerTemplate>(`/libraries/${libraryId}/disclaimer-templates/${editingId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      setForm({ nama: '', content: '', isActive: true, isDefault: false });
      setEditingId(null);
      await refresh();
      toast.success('Template disclaimer berhasil diperbarui.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal memperbarui template disclaimer.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Hapus template disclaimer ini? Book yang memilih template ini akan tidak menampilkan disclaimer.')) return;
    try {
      await apiClient<DeletedResponse>(`/libraries/${libraryId}/disclaimer-templates/${id}`, { method: 'DELETE' });
      await refresh();
      toast.success('Template disclaimer berhasil dihapus.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal menghapus template disclaimer.');
    }
  }

  async function refresh() {
    const data = await apiClient<DisclaimerTemplate[]>(`/libraries/${libraryId}/disclaimer-templates`);
    setTemplates(data ?? []);
  }

  function startEdit(t: DisclaimerTemplate) {
    setEditingId(t.id);
    setForm({ nama: t.nama, content: t.content, isActive: t.isActive, isDefault: t.isDefault ?? false });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm({ nama: '', content: '', isActive: true, isDefault: false });
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Template Disclaimer Studio</CardTitle>
          <CardDescription>
            Kelola template disclaimer level Studio/Library ini. Template hanya tersedia untuk Book di
            Library/Studio Anda. Tampil di halaman detail Book (di bawah sinopsis, di atas tombol aksi).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!editingId && (
            <Button type="button" variant="outline" size="sm" onClick={() => {
              setEditingId('new');
              setForm({ nama: '', content: '', isActive: true, isDefault: false });
            }} disabled={submitting}>
              + Tambah Template
            </Button>
          )}

          {editingId !== null ? (
            <div className="mt-4 space-y-2">
              <div className="space-y-1.5">
                <Label htmlFor="dt-nama">Nama Template</Label>
                <Input
                  id="dt-nama"
                  value={form.nama}
                  onChange={(e) => setForm((prev) => ({ ...prev, nama: e.target.value }))}
                  placeholder="mis. Disclaimer Cerita Dewasa"
                  disabled={submitting}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dt-content">Konten Disclaimer</Label>
                <Textarea
                  id="dt-content"
                  value={form.content}
                  onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
                  placeholder="Konten disclaimer yang akan ditampilkan di halaman detail Book. HTML didukung."
                  rows={4}
                  disabled={submitting}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="dt-is-active"
                    checked={form.isActive}
                    onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                    disabled={submitting}
                    className="mt-1"
                  />
                  <div>
                    <Label htmlFor="dt-is-active">Template aktif</Label>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="dt-is-default"
                    checked={form.isDefault}
                    onChange={(e) => setForm((prev) => ({ ...prev, isDefault: e.target.checked }))}
                    disabled={submitting}
                    className="mt-1"
                  />
                  <div>
                    <Label htmlFor="dt-is-default">Template default Studio</Label>
                    <p className="text-[10px] text-muted-foreground">
                      Hanya satu default per Studio — tampil kalau Book tidak memilih template sendiri.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={cancelEdit} disabled={submitting}>
                  Batal
                </Button>
                {editingId === 'new' ? (
                  <Button type="button" onClick={handleCreate} disabled={submitting || !form.nama || !form.content}>
                    {submitting ? 'Menyimpan…' : 'Buat Template'}
                  </Button>
                ) : (
                  <Button type="button" onClick={handleUpdate} disabled={submitting || !form.nama || !form.content}>
                    {submitting ? 'Menyimpan…' : 'Simpan Perubahan'}
                  </Button>
                )}
              </div>
            </div>
          ) : null}

          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Nama</th>
                  <th className="px-3 py-2 font-medium">Konten (preview)</th>
                  <th className="px-3 py-2 font-medium text-center">Status</th>
                  <th className="px-3 py-2 font-medium text-right" />
                </tr>
              </thead>
              <tbody>
                {templates.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-center text-xs text-muted-foreground">
                      Belum ada template disclaimer. Klik &ldquo;+ Tambah Template&rdquo; untuk membuat yang pertama.
                    </td>
                  </tr>
                ) : (
                  templates.map((t) => (
                    <tr key={t.id} className="border-b">
                      <td className="px-3 py-2">
                        <span className="font-medium text-[var(--reader-foreground)]">{t.nama}</span>
                        {t.isDefault && (
                          <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                            Default
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground truncate max-w-[200px]">
                        {t.content}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${t.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {t.isActive ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right text-xs">
                        {editingId === t.id ? (
                          <Button type="button" variant="outline" size="icon-sm" onClick={cancelEdit} disabled={submitting}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        ) : (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon-sm"
                              onClick={() => startEdit(t)}
                              disabled={submitting}
                              aria-label={`Edit template ${t.nama}`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon-sm"
                              onClick={() => handleDelete(t.id)}
                              disabled={submitting}
                              aria-label={`Hapus template ${t.nama}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
