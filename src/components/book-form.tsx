'use client';

import { useEffect, useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { CoverImageUpload } from '@/components/cover-image-upload';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { usePlatformContext } from '@/context/platform-context';
import { slugify } from '@/lib/api-client';
import { publicFetch } from '@/lib/public-api';
import type { CategoryDto, GenreDto } from '@/lib/public-types';
import type { BookStatus, BookType } from '@/lib/types';

const UNCATEGORIZED_LABEL = 'Lainnya';

const BOOK_TYPE_LABEL: Record<BookType, string> = {
  original: 'Karya Original',
  translation: 'Terjemahan',
  adaptation: 'Adaptasi',
};

const BOOK_STATUS_SELECT_LABEL: Record<BookStatus, string> = {
  draft: 'Draft',
  ongoing: 'Berlanjut (Ongoing)',
  completed: 'Tamat (Completed)',
};

export interface BookFormValues {
  judul: string;
  slug: string;
  sinopsis: string;
  genreId: string;
  categoryId: string;
  coverUrl: string;
  bookType: BookType;
  originalAuthor: string;
  status: BookStatus;
}

interface BookFormProps {
  mode: 'create' | 'edit';
  initialValues?: Partial<BookFormValues>;
  submitting: boolean;
  submitLabel: string;
  onSubmit: (values: BookFormValues) => void | Promise<void>;
}

/**
 * Form Book — dipakai untuk create & edit (satu komponen dua mode), lihat
 * plan/bookpedia/execution-plan.md Fase 1. Logic slugify persis pola form
 * onboarding Library (src/app/onboarding/page.tsx): slug auto-generate dari
 * judul selama belum disentuh manual.
 *
 * Slug hanya bisa diisi/diedit saat create — kontrak `PATCH /books/:id`
 * TIDAK menerima `slug`, jadi di mode edit field-nya read-only.
 *
 * Genre diambil dari `GET /public/genres` (endpoint publik, tanpa auth) —
 * bukan lagi hardcode di frontend. Value yang dikirim ke backend adalah
 * `genreId` (UUID), bukan nama genre bebas.
 *
 * §4.5 (11 Sep 2026): Category ditambah sebagai field TERPISAH dari Genre
 * (`categoryId`, independen — TIDAK divalidasi harus "cocok" dengan Genre
 * yang dipilih). Dropdown Genre TETAP dikelompokkan per Category (murni
 * bantu UX memilih) — Genre yang belum masuk Category manapun dikelompokkan
 * di bawah label "Lainnya".
 */
export function BookForm({ mode, initialValues, submitting, submitLabel, onSubmit }: BookFormProps) {
  const { slug: platformSlug } = usePlatformContext();
  const [judul, setJudul] = useState(initialValues?.judul ?? '');
  const [slug, setSlug] = useState(initialValues?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(mode === 'edit');
  const [sinopsis, setSinopsis] = useState(initialValues?.sinopsis ?? '');
  const [genreId, setGenreId] = useState(initialValues?.genreId ?? '');
  const [categoryId, setCategoryId] = useState(initialValues?.categoryId ?? '');
  const [coverUrl, setCoverUrl] = useState(initialValues?.coverUrl ?? '');
  const [coverUploading, setCoverUploading] = useState(false);
  const [bookType, setBookType] = useState<BookType>(initialValues?.bookType ?? 'original');
  const [originalAuthor, setOriginalAuthor] = useState(initialValues?.originalAuthor ?? '');
  const [status, setStatus] = useState<BookStatus>(initialValues?.status ?? 'draft');

  const [genres, setGenres] = useState<GenreDto[] | null>(null);
  const [categories, setCategories] = useState<CategoryDto[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    publicFetch<GenreDto[]>(`/public/platforms/${platformSlug}/genres`).then((data) => {
      if (!cancelled) setGenres(data ?? []);
    });
    publicFetch<CategoryDto[]>(`/public/platforms/${platformSlug}/categories`).then((data) => {
      if (!cancelled) setCategories(data ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [platformSlug]);

  // Kelompokkan Genre per Category (murni tampilan dropdown) — Genre yang
  // belum jadi anggota Category manapun masuk grup "Lainnya" di akhir.
  const genreGroups = (() => {
    if (!genres) return null;
    if (!categories || categories.length === 0) {
      return [{ label: UNCATEGORIZED_LABEL, genres }];
    }

    const categorizedGenreIds = new Set<string>();
    const groups = categories
      .map((category) => {
        const members = genres.filter((g) => category.genres.some((cg) => cg.id === g.id));
        members.forEach((g) => categorizedGenreIds.add(g.id));
        return { label: category.nama, genres: members };
      })
      .filter((group) => group.genres.length > 0);

    const uncategorized = genres.filter((g) => !categorizedGenreIds.has(g.id));
    if (uncategorized.length > 0) {
      groups.push({ label: UNCATEGORIZED_LABEL, genres: uncategorized });
    }

    return groups;
  })();

  function handleJudulChange(value: string) {
    setJudul(value);
    if (mode === 'create' && !slugTouched) {
      setSlug(slugify(value));
    }
  }

  function handleSlugChange(value: string) {
    setSlugTouched(true);
    setSlug(slugify(value));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void onSubmit({
      judul: judul.trim(),
      slug: slug.trim(),
      sinopsis: sinopsis.trim(),
      genreId,
      categoryId,
      coverUrl: coverUrl.trim(),
      bookType,
      originalAuthor: originalAuthor.trim(),
      status,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="judul">Judul Book</Label>
        <Input
          id="judul"
          value={judul}
          onChange={(e) => handleJudulChange(e.target.value)}
          placeholder="mis. Bayang di Antara Bintang"
          required
          disabled={submitting}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="slug">Slug</Label>
        <Input
          id="slug"
          value={slug}
          onChange={(e) => handleSlugChange(e.target.value)}
          placeholder="bayang-di-antara-bintang"
          required
          disabled={submitting || mode === 'edit'}
        />
        <p className="text-xs text-muted-foreground">
          {mode === 'create'
            ? 'Otomatis dibuat dari judul, tapi bisa diedit manual. Dipakai di URL Book.'
            : 'Slug tidak bisa diubah setelah Book dibuat.'}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="sinopsis">Sinopsis</Label>
        <Textarea
          id="sinopsis"
          value={sinopsis}
          onChange={(e) => setSinopsis(e.target.value)}
          placeholder="Ceritakan sedikit tentang Book kamu…"
          disabled={submitting}
        />
      </div>

      {mode === 'edit' && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="status">Status Cerita</Label>
          <Select value={status} onValueChange={(value) => setStatus(value as BookStatus)} disabled={submitting}>
            <SelectTrigger id="status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(BOOK_STATUS_SELECT_LABEL) as BookStatus[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {BOOK_STATUS_SELECT_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Progres cerita — beda dari saklar publish. Tampil ke pembaca di katalog & detail Book.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="category">Category</Label>
        <Select
          value={categoryId || undefined}
          onValueChange={(value) => setCategoryId(value)}
          disabled={submitting || !categories}
        >
          <SelectTrigger id="category" className="w-full">
            <SelectValue placeholder={categories ? 'Pilih category (opsional)' : 'Memuat category…'} />
          </SelectTrigger>
          <SelectContent>
            {(categories ?? []).map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.nama}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {categories && categories.length === 0 && (
          <p className="text-xs text-muted-foreground">Belum ada category tersedia.</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="genre">Genre</Label>
        <Select
          value={genreId || undefined}
          onValueChange={(value) => setGenreId(value)}
          disabled={submitting || !genres}
        >
          <SelectTrigger id="genre" className="w-full">
            <SelectValue placeholder={genres ? 'Pilih genre (opsional)' : 'Memuat genre…'} />
          </SelectTrigger>
          <SelectContent>
            {(genreGroups ?? []).map((group) => (
              <SelectGroup key={group.label}>
                <SelectLabel>{group.label}</SelectLabel>
                {group.genres.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.nama}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
        {genres && genres.length === 0 && (
          <p className="text-xs text-muted-foreground">Belum ada genre tersedia.</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="bookType">Jenis Karya</Label>
        <Select value={bookType} onValueChange={(value) => setBookType(value as BookType)} disabled={submitting}>
          <SelectTrigger id="bookType" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(BOOK_TYPE_LABEL) as BookType[]).map((type) => (
              <SelectItem key={type} value={type}>
                {BOOK_TYPE_LABEL[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {bookType !== 'original' && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="originalAuthor">Penulis Asli</Label>
          <Input
            id="originalAuthor"
            value={originalAuthor}
            onChange={(e) => setOriginalAuthor(e.target.value)}
            placeholder="mis. Jane Doe"
            disabled={submitting}
          />
          <p className="text-xs text-muted-foreground">
            Nama penulis karya asli yang kamu {bookType === 'translation' ? 'terjemahkan' : 'adaptasi'} — opsional,
            tapi disarankan diisi.
          </p>
        </div>
      )}

      <CoverImageUpload
        id="coverUrl"
        label="Cover Book (opsional)"
        folder="books"
        value={coverUrl}
        onChange={setCoverUrl}
        disabled={submitting}
        onUploadingChange={setCoverUploading}
        previewWidth={96}
        previewHeight={144}
      />

      <Button type="submit" disabled={submitting || coverUploading} className="mt-2">
        {submitting ? 'Menyimpan…' : coverUploading ? 'Menunggu upload cover…' : submitLabel}
      </Button>
    </form>
  );
}
