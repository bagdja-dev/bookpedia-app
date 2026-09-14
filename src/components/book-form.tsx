'use client';

import { useEffect, useState, type FormEvent, type KeyboardEvent } from 'react';
import { X } from 'lucide-react';

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
import { publicFetch, searchTags } from '@/lib/public-api';
import type { CategoryDto, GenreDto, TagDto } from '@/lib/public-types';
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
  /** Fase 5 (SEO) — string kosong = ikut kebijakan Platform (null di payload). */
  maxFreeChapters: string;
  /** Fase 6 — Tag bebas (nama apa adanya, bukan slug/id). */
  tags: string[];
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
  const { slug: platformSlug, config: platformConfig } = usePlatformContext();
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
  const [maxFreeChapters, setMaxFreeChapters] = useState(initialValues?.maxFreeChapters ?? '');
  const [tags, setTags] = useState<string[]>(initialValues?.tags ?? []);
  const [tagInput, setTagInput] = useState('');
  const [tagSuggestions, setTagSuggestions] = useState<TagDto[]>([]);
  const [tagSuggestionsOpen, setTagSuggestionsOpen] = useState(false);

  const platformMaxFreeChapters = platformConfig.maxFreeChapters;
  const platformMaxTagsPerBook = platformConfig.maxTagsPerBook;
  const tagLimitReached = tags.length >= platformMaxTagsPerBook;

  const [genres, setGenres] = useState<GenreDto[] | null>(null);
  const [categories, setCategories] = useState<CategoryDto[] | null>(null);

  // Autocomplete Tag (debounce ~300ms) — saran diambil dari SEMUA Tag yang
  // pernah dipakai penulis mana pun di Platform ini (folksonomi bersama,
  // lihat overview.md §12), bukan cuma milik Library sendiri.
  useEffect(() => {
    const trimmed = tagInput.trim();
    if (!trimmed) {
      setTagSuggestions([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      searchTags(platformSlug, trimmed).then((data) => {
        if (!cancelled) setTagSuggestions(data.filter((t) => !tags.includes(t.nama)));
      });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [tagInput, platformSlug, tags]);

  function addTag(nama: string) {
    const trimmed = nama.trim();
    if (!trimmed || tagLimitReached || tags.includes(trimmed)) return;
    setTags((prev) => [...prev, trimmed]);
    setTagInput('');
    setTagSuggestions([]);
    setTagSuggestionsOpen(false);
  }

  function removeTag(nama: string) {
    setTags((prev) => prev.filter((t) => t !== nama));
  }

  function handleTagInputKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  }

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
      maxFreeChapters,
      tags,
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

      <div className="flex flex-col gap-2">
        <Label htmlFor="maxFreeChapters">Batas Chapter Gratis (opsional)</Label>
        {platformMaxFreeChapters === 0 ? (
          <p className="text-xs text-muted-foreground">
            Platform ini sudah mengatur semua Chapter gratis (tanpa login) — Book tidak bisa override.
          </p>
        ) : (
          <>
            <Input
              id="maxFreeChapters"
              type="number"
              min={0}
              value={maxFreeChapters}
              onChange={(e) => setMaxFreeChapters(e.target.value)}
              placeholder={`Kosongkan untuk ikut Platform (${platformMaxFreeChapters})`}
              disabled={submitting}
            />
            <p className="text-xs text-muted-foreground">
              Kosongkan untuk ikut kebijakan Platform saat ini ({platformMaxFreeChapters} Chapter pertama
              gratis). Kalau diisi: isi <strong>0</strong> supaya SEMUA Chapter Book ini gratis, atau angka{' '}
              <strong>lebih besar dari {platformMaxFreeChapters}</strong> — tidak boleh diisi angka yang
              lebih kecil/sama dengan kebijakan Platform.
            </p>
          </>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="tagInput">Tag (opsional)</Label>
        <div className="flex flex-wrap gap-1.5 rounded-md border border-input px-2 py-1.5">
          {tags.map((t) => (
            <span
              key={t}
              className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-foreground"
            >
              {t}
              <button
                type="button"
                onClick={() => removeTag(t)}
                disabled={submitting}
                className="text-muted-foreground hover:text-foreground"
                aria-label={`Hapus tag ${t}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <input
            id="tagInput"
            value={tagInput}
            onChange={(e) => {
              setTagInput(e.target.value);
              setTagSuggestionsOpen(true);
            }}
            onKeyDown={handleTagInputKeyDown}
            onFocus={() => setTagSuggestionsOpen(true)}
            onBlur={() => setTimeout(() => setTagSuggestionsOpen(false), 150)}
            placeholder={tagLimitReached ? 'Batas Tag tercapai' : 'Ketik lalu Enter…'}
            disabled={submitting || tagLimitReached}
            className="min-w-[120px] flex-1 bg-transparent text-sm outline-none disabled:cursor-not-allowed"
          />
        </div>
        {tagSuggestionsOpen && tagSuggestions.length > 0 && (
          <div className="rounded-md border bg-popover shadow-sm">
            {tagSuggestions.map((t) => (
              <button
                key={t.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => addTag(t.nama)}
                className="block w-full px-3 py-1.5 text-left text-sm hover:bg-muted"
              >
                {t.nama}
              </button>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Maksimum {platformMaxTagsPerBook} Tag per Book ({tags.length}/{platformMaxTagsPerBook}). Saran diambil dari
          Tag yang sudah pernah dipakai penulis lain di Platform ini — ketik Tag baru kalau belum ada di saran.
        </p>
      </div>

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
