import type { Metadata } from 'next';

/**
 * Bangun `openGraph`+`twitter` metadata konsisten dari satu set field —
 * dipakai semua `generateMetadata` halaman reader (Fase 1 SEO, lihat
 * plan/bookpedia/seo-execution-plan.md §1.2). Satu tempat supaya bentuknya
 * konsisten di semua halaman, bukan disalin-tempel manual tiap file.
 *
 * `imageUrl` boleh URL relatif ATAU absolut — Next.js resolve otomatis
 * terhadap `metadataBase` (di-set root layout, lihat `resolveOriginFromHeaders()`).
 */
export function buildSocialMetadata({
  title,
  description,
  imageUrl,
  imageAlt,
  type = 'website',
}: {
  title: string;
  description?: string;
  imageUrl?: string | null;
  imageAlt?: string;
  type?: 'website' | 'book' | 'profile';
}): Pick<Metadata, 'openGraph' | 'twitter'> {
  const images = imageUrl ? [{ url: imageUrl, ...(imageAlt ? { alt: imageAlt } : {}) }] : undefined;

  return {
    openGraph: {
      title,
      description,
      images,
      type,
    },
    twitter: {
      card: images ? 'summary_large_image' : 'summary',
      title,
      description,
      images,
    },
  };
}

export function toAbsoluteUrl(url: string | null | undefined, origin: string): string | null {
  if (!url) return null;
  try {
    return new URL(url, origin).toString();
  } catch {
    return null;
  }
}

export type SeoTemplateValues = Record<string, string | null | undefined>;

export interface SeoTemplateSet {
  h1?: string | null;
  title?: string | null;
  description?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogType?: 'website' | 'book' | 'profile' | null;
  prefix?: string | null;
  suffix?: string | null;
}

/** Apply one SEO template set. The caller supplies sets in highest precedence first. */
export function resolveSeoTemplates(
  sets: SeoTemplateSet[],
  values: SeoTemplateValues,
  fallback: { title: string; description: string; h1?: string; ogType?: 'website' | 'book' | 'profile' } = {
    title: values.title || '',
    description: '',
  },
): { h1: string; title: string; description: string; ogTitle: string; ogDescription: string; ogType: 'website' | 'book' | 'profile' } {
  const first = (key: keyof SeoTemplateSet) => sets.map((set) => set[key]).find((value) => typeof value === 'string' && value.trim()) as string | undefined;
  const mergedValues: SeoTemplateValues = {
    ...values,
    prefix: values.prefix ?? first('prefix') ?? '',
    suffix: values.suffix ?? first('suffix') ?? '',
  };
  const render = (template: string | undefined, defaultValue: string) =>
    (template || defaultValue).replace(/\{\{\s*([a-zA-Z]+)\s*\}\}/g, (_, token: string) => mergedValues[token] ?? '');
  const title = render(first('title'), fallback.title);
  const description = render(first('description'), fallback.description);
  return {
    h1: render(first('h1'), fallback.h1 || title),
    title,
    description,
    ogTitle: render(first('ogTitle'), title),
    ogDescription: render(first('ogDescription'), description),
    ogType: (sets.map((set) => set.ogType).find(Boolean) ?? fallback.ogType ?? 'website') as 'website' | 'book' | 'profile',
  };
}

/**
 * Serialisasi aman untuk `<script type="application/ld+json">` (Fase 3 SEO)
 * — escape `<` supaya string penulis (judul/sinopsis bebas) tidak bisa
 * menutup tag `<script>` lebih awal (mis. sinopsis berisi literal
 * "</script>"). `dangerouslySetInnerHTML` di pemanggil AMAN dipakai dengan
 * output fungsi ini karena escaping sudah dilakukan di sini, bukan
 * mempercayai input apa adanya.
 */
export function toJsonLdScript(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
