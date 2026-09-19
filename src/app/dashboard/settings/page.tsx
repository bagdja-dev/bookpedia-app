'use client';

import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';

import { CoverImageUpload } from '@/components/cover-image-upload';
import { AccordionSection } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SeoTemplateField } from '@/components/seo-template-field';
import { useLibraryContext } from '@/context/library-context';
import { apiClient, ApiError } from '@/lib/api-client';
import type { Library, UpdateLibraryPayload } from '@/lib/types';

export default function SettingsPage() {
  const library = useLibraryContext();

  const [nama, setNama] = useState(library.nama);
  const [deskripsi, setDeskripsi] = useState(library.deskripsi ?? '');
  const [coverUrl, setCoverUrl] = useState(library.coverUrl ?? '');
  const [seoTitle, setSeoTitle] = useState(library.seoTitle ?? '');
  const [seoDescription, setSeoDescription] = useState(library.seoDescription ?? '');
  const [seoH1, setSeoH1] = useState(library.seoH1 ?? '');
  const [seoOgTitle, setSeoOgTitle] = useState(library.seoOgTitle ?? '');
  const [seoOgDescription, setSeoOgDescription] = useState(library.seoOgDescription ?? '');
  const [seoOgType, setSeoOgType] = useState<NonNullable<Library['seoOgType']>>(library.seoOgType ?? 'profile');
  const [seoPrefix, setSeoPrefix] = useState(library.seoPrefix ?? '');
  const [seoSuffix, setSeoSuffix] = useState(library.seoSuffix ?? '');
  const [coverUploading, setCoverUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!nama.trim()) {
      toast.error('Nama Library wajib diisi.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: UpdateLibraryPayload = {
        nama: nama.trim(),
        deskripsi: deskripsi.trim(),
        coverUrl: coverUrl.trim(),
        seoTitle: seoTitle.trim() || null,
        seoDescription: seoDescription.trim() || null,
        seoH1: seoH1.trim() || null,
        seoOgTitle: seoOgTitle.trim() || null,
        seoOgDescription: seoOgDescription.trim() || null,
        seoOgType,
        seoPrefix: seoPrefix.trim() || null,
        seoSuffix: seoSuffix.trim() || null,
      };
      await apiClient<Library>('/libraries/me', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      toast.success('Pengaturan Library berhasil disimpan.');
      // Full reload (bukan router.refresh — dashboard/layout.tsx full client
      // component) supaya LibraryProvider/Topbar/Sidebar ikut baca data baru,
      // bukan cuma state lokal halaman ini.
      window.location.reload();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Gagal menyimpan pengaturan. Coba lagi.';
      toast.error(message);
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Pengaturan Library</CardTitle>
          <CardDescription>Kelola identitas Library kamu yang tampil di halaman publik.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="nama">Nama Library</Label>
              <Input
                id="nama"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                required
                disabled={submitting}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Slug</Label>
              <Input value={library.slug} disabled />
              <p className="text-xs text-muted-foreground">
                Slug tidak bisa diubah — dipakai di URL publik Library kamu (/library/{library.slug}).
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="deskripsi">Deskripsi</Label>
              <Textarea
                id="deskripsi"
                value={deskripsi}
                onChange={(e) => setDeskripsi(e.target.value)}
                placeholder="Ceritakan sedikit tentang Library kamu…"
                disabled={submitting}
              />
            </div>

            <CoverImageUpload
              id="cover"
              label="Cover Library"
              folder="libraries"
              value={coverUrl}
              onChange={setCoverUrl}
              disabled={submitting}
              onUploadingChange={setCoverUploading}
              previewWidth={144}
              previewHeight={96}
            />

            <AccordionSection title="SEO Override" className="mt-2">
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">Kosongkan field untuk memakai default Platform. Token: {'{{title}}'}, {'{{platform}}'}, {'{{library}}'}, {'{{author}}'}, {'{{bookType}}'}, {'{{prefix}}'}, {'{{suffix}}'}.</p>
                <SeoTemplateField id="library-seo-h1" label="H1" value={seoH1} onChange={setSeoH1} placeholder="H1, mis. {{library}}" disabled={submitting} />
                <SeoTemplateField id="library-seo-title" label="Title" value={seoTitle} onChange={setSeoTitle} placeholder="Title, mis. {{library}} — {{platform}}" disabled={submitting} />
                <SeoTemplateField id="library-seo-description" label="Description" value={seoDescription} onChange={setSeoDescription} placeholder="Description" multiline disabled={submitting} />
                <SeoTemplateField id="library-seo-og-title" label="OG title" value={seoOgTitle} onChange={setSeoOgTitle} placeholder="OG title (opsional)" disabled={submitting} />
                <SeoTemplateField id="library-seo-og-description" label="OG description" value={seoOgDescription} onChange={setSeoOgDescription} placeholder="OG description (opsional)" multiline disabled={submitting} />
                <select value={seoOgType} onChange={(e) => setSeoOgType(e.target.value as NonNullable<Library['seoOgType']>)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" aria-label="SEO OG type">
                  <option value="profile">profile</option>
                  <option value="website">website</option>
                  <option value="book">book</option>
                </select>
                <div className="grid gap-4 sm:grid-cols-2">
                  <SeoTemplateField id="library-seo-prefix" label="Prefix" value={seoPrefix} onChange={setSeoPrefix} placeholder="Prefix" disabled={submitting} />
                  <SeoTemplateField id="library-seo-suffix" label="Suffix" value={seoSuffix} onChange={setSeoSuffix} placeholder="Suffix" disabled={submitting} />
                </div>
              </div>
            </AccordionSection>

            <Button type="submit" disabled={submitting || coverUploading} className="mt-2 w-fit">
              {submitting ? 'Menyimpan…' : coverUploading ? 'Menunggu upload cover…' : 'Simpan Perubahan'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
