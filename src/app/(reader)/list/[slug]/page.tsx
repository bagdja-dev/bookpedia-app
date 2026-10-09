import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { BookSlider } from '@/components/reader/book-slider';
import { getPlatformSlug } from '@/lib/platform';
import { getPlatformConfig, publicFetch } from '@/lib/public-api';
import type { ListPageDto, PlatformProfileDto } from '@/lib/public-types';
import { resolveOriginFromHeaders } from '@/lib/resolve-origin';
import { buildSocialMetadata, resolveSeoTemplates, toAbsoluteUrl, toJsonLdScript } from '@/lib/seo';

const PAGE_SIZE = 24;

interface ListPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

function parsePage(value: string | undefined): number {
  const page = Number(value);
  return Number.isInteger(page) && page > 1 ? page : 1;
}

async function loadList(slug: string, page: number) {
  const platformSlug = await getPlatformSlug();
  const [config, list] = await Promise.all([
    getPlatformConfig(platformSlug),
    publicFetch<ListPageDto>(
      `/public/platforms/${platformSlug}/lists/${encodeURIComponent(slug)}?page=${page}&pageSize=${PAGE_SIZE}`,
    ),
  ]);
  return { platformSlug, config, list };
}

/**
 * SEO halaman list — pola sama halaman Book: template SEO milik list → default list
 * ({judul} — {platform}, deskripsi list) → Default SEO Platform. Token: {{title}} = judul
 * list, {{platform}}, {{prefix}}, {{suffix}}. Mis. judul tampil "China" dengan SEO title
 * "Novel Terjemahan {{title}}" → <title> "Novel Terjemahan China".
 */
function resolveListSeo(list: ListPageDto, config: PlatformProfileDto) {
  const { section } = list;
  const defaultDescription = section.description || `Daftar cerita ${section.title} di ${config.nama}.`;
  return resolveSeoTemplates(
    [
      {
        h1: section.seoH1,
        title: section.seoTitle,
        description: section.seoDescription,
        ogTitle: section.seoOgTitle,
        ogDescription: section.seoOgDescription,
        ogType: section.seoOgType,
        prefix: section.seoPrefix,
        suffix: section.seoSuffix,
      },
      { h1: section.title, title: `${section.title} — ${config.nama}`, description: defaultDescription, ogType: 'website' },
      {
        h1: config.seoDefaultH1,
        title: config.seoDefaultTitle,
        description: config.seoDefaultDescription,
        ogType: config.seoDefaultOgType,
        prefix: config.seoPrefix,
        suffix: config.seoSuffix,
      },
    ],
    { title: section.title, platform: config.nama },
    { title: section.title, description: defaultDescription, h1: section.title, ogType: 'website' },
  );
}

function pageHref(slug: string, page: number) {
  return page > 1 ? `/list/${slug}?page=${page}` : `/list/${slug}`;
}

export async function generateMetadata({ params, searchParams }: ListPageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = parsePage((await searchParams).page);
  const { config, list } = await loadList(slug, page);
  if (!list) {
    return { title: `List tidak ditemukan — ${config.nama}` };
  }
  const seo = resolveListSeo(list, config);
  const pageSuffix = page > 1 ? ` — Halaman ${page}` : '';
  const imageUrl = list.section.seoOgImageUrl || list.items[0]?.coverUrl || null;
  return {
    title: `${seo.title}${pageSuffix}`,
    description: seo.description,
    alternates: { canonical: pageHref(list.section.slug, page) },
    ...buildSocialMetadata({
      title: seo.ogTitle,
      description: seo.ogDescription,
      imageUrl,
      imageAlt: seo.ogTitle,
      type: seo.ogType,
    }),
  };
}

/**
 * Halaman "Lihat semua" satu section homepage — /list/{slug}. Judul tampil = judul
 * section; H1/title/OG mengikuti SEO list (bisa berbeda, mis. "Novel Terjemahan China").
 * Slug lama diarahkan permanen ke slug sekarang.
 */
export default async function ListPage({ params, searchParams }: ListPageProps) {
  const { slug } = await params;
  const page = parsePage((await searchParams).page);
  const { platformSlug, config, list } = await loadList(slug, page);
  if (!list) {
    notFound();
  }
  if (list.section.slug !== slug) {
    permanentRedirect(pageHref(list.section.slug, page));
  }
  if (page > list.totalPages) {
    notFound();
  }

  const seo = resolveListSeo(list, config);
  const origin = await resolveOriginFromHeaders();
  const listUrl = `${origin}/list/${list.section.slug}`;
  const firstIndex = (list.page - 1) * list.pageSize;
  const jsonLd = toJsonLdScript({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: seo.title,
    description: seo.description,
    url: page > 1 ? `${listUrl}?page=${page}` : listUrl,
    isPartOf: { '@type': 'WebSite', name: config.nama, url: origin },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: list.total,
      itemListElement: list.items.map((book, index) => ({
        '@type': 'ListItem',
        position: firstIndex + index + 1,
        url: `${origin}/book/${book.slug}`,
        name: book.judul,
        ...(toAbsoluteUrl(book.coverUrl, origin) ? { image: toAbsoluteUrl(book.coverUrl, origin) } : {}),
      })),
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />

      <nav aria-label="Breadcrumb" className="mb-4 text-xs text-[var(--reader-muted)]">
        <Link href="/" className="hover:text-[var(--reader-terracotta)]">Beranda</Link>
        <span className="mx-1.5">›</span>
        <span>{list.section.title}</span>
      </nav>

      <div className="mb-8">
        <h1
          className="text-3xl font-semibold text-[var(--reader-foreground)] sm:text-4xl"
          style={{ fontFamily: 'var(--font-source-serif)' }}
        >
          {seo.h1}
        </h1>
        {list.section.description && (
          <p className="mt-2 max-w-3xl text-sm text-[var(--reader-muted)]">{list.section.description}</p>
        )}
        <p className="mt-2 text-xs text-[var(--reader-muted)]">{list.total} cerita</p>
      </div>

      {list.items.length > 0 ? (
        <BookSlider
          books={list.items}
          platformSlug={platformSlug}
          layout="grid"
          showStatus={config.showBookStatus}
          showRating={config.enableRating}
          showLike={config.enableLike}
          showComment={config.enableComment}
        />
      ) : (
        <p className="rounded-lg border border-[var(--reader-border)] bg-[var(--reader-surface)] px-4 py-6 text-sm text-[var(--reader-muted)]">
          Belum ada cerita di list ini.
        </p>
      )}

      {list.totalPages > 1 && (
        <nav aria-label="Halaman" className="mt-10 flex flex-wrap items-center justify-center gap-2">
          {page > 1 && (
            <Link
              href={pageHref(list.section.slug, page - 1)}
              rel="prev"
              className="flex items-center gap-1 rounded-full border border-[var(--reader-border)] bg-[var(--reader-surface)] px-4 py-2 text-sm text-[var(--reader-foreground)] hover:border-[var(--reader-terracotta)] hover:text-[var(--reader-terracotta)]"
            >
              <ChevronLeft className="h-4 w-4" />
              Sebelumnya
            </Link>
          )}
          {Array.from({ length: list.totalPages }, (_, index) => index + 1).map((number) => (
            <Link
              key={number}
              href={pageHref(list.section.slug, number)}
              aria-current={number === page ? 'page' : undefined}
              className={number === page
                ? 'rounded-full bg-[var(--reader-terracotta)] px-3.5 py-2 text-sm font-medium text-[var(--reader-terracotta-foreground)]'
                : 'rounded-full border border-[var(--reader-border)] bg-[var(--reader-surface)] px-3.5 py-2 text-sm text-[var(--reader-foreground)] hover:border-[var(--reader-terracotta)] hover:text-[var(--reader-terracotta)]'}
            >
              {number}
            </Link>
          ))}
          {page < list.totalPages && (
            <Link
              href={pageHref(list.section.slug, page + 1)}
              rel="next"
              className="flex items-center gap-1 rounded-full bg-[var(--reader-terracotta)] px-4 py-2 text-sm font-medium text-[var(--reader-terracotta-foreground)] hover:opacity-90"
            >
              Berikutnya
              <ChevronRight className="h-4 w-4" />
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
