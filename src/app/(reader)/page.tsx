import type { Metadata } from 'next';
import Link from 'next/link';
import { X } from 'lucide-react';

import { BookCard } from '@/components/reader/book-card';
import { getPlatformSlug } from '@/lib/platform';
import { getPlatformConfig, publicFetch } from '@/lib/public-api';
import type { CategoryDto, CatalogResponse, GenreDto } from '@/lib/public-types';
import { cn } from '@/lib/utils';

export async function generateMetadata(): Promise<Metadata> {
  const slug = await getPlatformSlug();
  const config = await getPlatformConfig(slug);
  return {
    title: `${config.nama} — Baca & Tulis Cerita`,
    description: `Jelajahi katalog novel & cerita berseri dari berbagai penulis di ${config.nama}.`,
  };
}

const PAGE_LIMIT = 24;

type CatalogSearchBy = 'judul' | 'library' | 'originalAuthor';
const VALID_SEARCH_BY: CatalogSearchBy[] = ['judul', 'library', 'originalAuthor'];
const SEARCH_BY_DESCRIPTION: Record<CatalogSearchBy, string> = {
  judul: 'judul',
  library: 'penulis',
  originalAuthor: 'penulis asli',
};

interface CatalogSearchParams {
  search?: string;
  searchBy?: string;
  genre?: string;
  category?: string;
  tag?: string;
  page?: string;
}

// Katalog pusat = root `/` (route group `(reader)` tidak menambah segmen
// path). Search & filter genre lewat query param, submit via GET form biasa
// (lihat form di header layout & chip genre di bawah) supaya halaman ini
// tetap SSR-friendly — tidak wajib fetch di client.
export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<CatalogSearchParams>;
}) {
  const {
    search = '',
    searchBy: searchByParam = '',
    genre = '',
    category = '',
    tag = '',
    page: pageParam = '1',
  } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageParam, 10) || 1);
  const searchBy: CatalogSearchBy = VALID_SEARCH_BY.includes(searchByParam as CatalogSearchBy)
    ? (searchByParam as CatalogSearchBy)
    : 'judul';

  const query = new URLSearchParams();
  if (search) query.set('search', search);
  if (search && searchBy !== 'judul') query.set('searchBy', searchBy);
  if (genre) query.set('genre', genre);
  if (category) query.set('category', category);
  if (tag) query.set('tag', tag);
  query.set('page', String(page));
  query.set('limit', String(PAGE_LIMIT));

  const slug = await getPlatformSlug();
  const [config, catalog, genres, categories] = await Promise.all([
    getPlatformConfig(slug),
    publicFetch<CatalogResponse>(`/public/platforms/${slug}/catalog?${query.toString()}`),
    publicFetch<GenreDto[]>(`/public/platforms/${slug}/genres`),
    publicFetch<CategoryDto[]>(`/public/platforms/${slug}/categories`),
  ]);
  const items = catalog?.items ?? [];
  const genreList = genres ?? [];
  const categoryList = categories ?? [];
  const total = catalog?.total ?? 0;
  const totalPages = catalog ? Math.max(1, Math.ceil(total / (catalog.limit || PAGE_LIMIT))) : 1;

  function pageHref(targetPage: number) {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (search && searchBy !== 'judul') params.set('searchBy', searchBy);
    if (genre) params.set('genre', genre);
    if (category) params.set('category', category);
    if (tag) params.set('tag', tag);
    if (targetPage > 1) params.set('page', String(targetPage));
    const qs = params.toString();
    return qs ? `/?${qs}` : '/';
  }

  function genreHref(targetGenre: string) {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (search && searchBy !== 'judul') params.set('searchBy', searchBy);
    if (targetGenre) params.set('genre', targetGenre);
    if (category) params.set('category', category);
    if (tag) params.set('tag', tag);
    const qs = params.toString();
    return qs ? `/?${qs}` : '/';
  }

  function categoryHref(targetCategory: string) {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (search && searchBy !== 'judul') params.set('searchBy', searchBy);
    if (genre) params.set('genre', genre);
    if (targetCategory) params.set('category', targetCategory);
    if (tag) params.set('tag', tag);
    const qs = params.toString();
    return qs ? `/?${qs}` : '/';
  }

  /** Fase 6 — hapus filter Tag saja, pertahankan search/genre/category yang aktif. */
  function tagClearHref() {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (search && searchBy !== 'judul') params.set('searchBy', searchBy);
    if (genre) params.set('genre', genre);
    if (category) params.set('category', category);
    const qs = params.toString();
    return qs ? `/?${qs}` : '/';
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1
          className="text-3xl font-semibold text-[var(--reader-foreground)] sm:text-4xl"
          style={{ fontFamily: 'var(--font-source-serif)' }}
        >
          Jelajahi Cerita
        </h1>
        <p className="mt-2 text-sm text-[var(--reader-muted)]">
          {total > 0
            ? `${total} cerita dari para penulis ${config.nama}${search ? ` untuk ${SEARCH_BY_DESCRIPTION[searchBy]} "${search}"` : ''}.`
            : 'Temukan cerita baru untuk dibaca.'}
        </p>
      </div>

      {categoryList.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Link
            href={categoryHref('')}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              !category
                ? 'border-[var(--reader-terracotta)] bg-[var(--reader-terracotta)] text-[var(--reader-terracotta-foreground)]'
                : 'border-[var(--reader-border)] bg-[var(--reader-surface)] text-[var(--reader-muted)] hover:border-[var(--reader-terracotta)] hover:text-[var(--reader-terracotta)]',
            )}
          >
            Semua Category
          </Link>
          {categoryList.map((c) => (
            <Link
              key={c.id}
              href={categoryHref(c.slug)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                category === c.slug
                  ? 'border-[var(--reader-terracotta)] bg-[var(--reader-terracotta)] text-[var(--reader-terracotta-foreground)]'
                  : 'border-[var(--reader-border)] bg-[var(--reader-surface)] text-[var(--reader-muted)] hover:border-[var(--reader-terracotta)] hover:text-[var(--reader-terracotta)]',
              )}
            >
              {c.nama}
            </Link>
          ))}
        </div>
      )}

      <div className="mb-8 flex flex-wrap items-center gap-2">
        <Link
          href={genreHref('')}
          className={cn(
            'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
            !genre
              ? 'border-[var(--reader-terracotta)] bg-[var(--reader-terracotta)] text-[var(--reader-terracotta-foreground)]'
              : 'border-[var(--reader-border)] bg-[var(--reader-surface)] text-[var(--reader-muted)] hover:border-[var(--reader-terracotta)] hover:text-[var(--reader-terracotta)]',
          )}
        >
          Semua Genre
        </Link>
        {genreList.map((g) => (
          <Link
            key={g.id}
            href={genreHref(g.slug)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              genre === g.slug
                ? 'border-[var(--reader-terracotta)] bg-[var(--reader-terracotta)] text-[var(--reader-terracotta-foreground)]'
                : 'border-[var(--reader-border)] bg-[var(--reader-surface)] text-[var(--reader-muted)] hover:border-[var(--reader-terracotta)] hover:text-[var(--reader-terracotta)]',
            )}
          >
            {g.nama}
          </Link>
        ))}
      </div>

      {tag && (
        <div className="mb-6">
          <Link
            href={tagClearHref()}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--reader-border)] bg-[var(--reader-surface)] px-3 py-1 text-xs text-[var(--reader-muted)] hover:border-[var(--reader-terracotta)] hover:text-[var(--reader-terracotta)]"
          >
            Filter Tag: #{tag}
            <X className="h-3 w-3" />
          </Link>
        </div>
      )}

      {catalog === null ? (
        <p className="rounded-lg border border-[var(--reader-border)] bg-[var(--reader-surface)] px-4 py-8 text-center text-sm text-[var(--reader-muted)]">
          Katalog belum bisa dimuat saat ini. Coba muat ulang halaman sebentar lagi.
        </p>
      ) : items.length === 0 ? (
        <p className="rounded-lg border border-[var(--reader-border)] bg-[var(--reader-surface)] px-4 py-8 text-center text-sm text-[var(--reader-muted)]">
          Belum ada cerita yang cocok{search || genre || category ? ' dengan pencarian/filter ini' : ''}.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {items.map((book) => (
            <BookCard key={book.id} book={book} showStatus={config.showBookStatus} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-3 text-sm">
          <Link
            href={pageHref(page - 1)}
            aria-disabled={page <= 1}
            className={cn(
              'rounded-full border border-[var(--reader-border)] px-3 py-1',
              page <= 1
                ? 'pointer-events-none opacity-40'
                : 'text-[var(--reader-foreground)] hover:border-[var(--reader-terracotta)] hover:text-[var(--reader-terracotta)]',
            )}
          >
            Sebelumnya
          </Link>
          <span className="text-[var(--reader-muted)]">
            Halaman {page} / {totalPages}
          </span>
          <Link
            href={pageHref(page + 1)}
            aria-disabled={page >= totalPages}
            className={cn(
              'rounded-full border border-[var(--reader-border)] px-3 py-1',
              page >= totalPages
                ? 'pointer-events-none opacity-40'
                : 'text-[var(--reader-foreground)] hover:border-[var(--reader-terracotta)] hover:text-[var(--reader-terracotta)]',
            )}
          >
            Berikutnya
          </Link>
        </div>
      )}
    </div>
  );
}
