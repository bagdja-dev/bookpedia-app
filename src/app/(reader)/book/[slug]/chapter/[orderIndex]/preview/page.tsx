import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, BookOpen, LogIn } from 'lucide-react';

import { SafeImage } from '@/components/safe-image';
import { getPlatformSlug } from '@/lib/platform';
import { getPlatformConfig, publicFetch } from '@/lib/public-api';
import { getSession } from '@/lib/session';
import { resolveOriginFromHeaders } from '@/lib/resolve-origin';
import { buildSocialMetadata, toAbsoluteUrl, toJsonLdScript } from '@/lib/seo';
import type { ChapterPreviewDto } from '@/lib/public-types';

interface ChapterPreviewPageProps {
  params: Promise<{ slug: string; orderIndex: string }>;
}

async function loadPreview(slug: string, orderIndex: string) {
  const platformSlug = await getPlatformSlug();
  const [config, chapter] = await Promise.all([
    getPlatformConfig(platformSlug),
    publicFetch<ChapterPreviewDto>(`/public/platforms/${platformSlug}/books/${slug}/chapters/${orderIndex}/preview`),
  ]);
  return { config, chapter };
}

export async function generateMetadata({ params }: ChapterPreviewPageProps): Promise<Metadata> {
  const { slug, orderIndex } = await params;
  const { config, chapter } = await loadPreview(slug, orderIndex);
  if (!chapter) {
    return { title: `Chapter tidak ditemukan — ${config.nama}` };
  }
  const title = `${chapter.judul} — ${chapter.book.judul} — ${config.nama}`;
  const description = chapter.excerpt || `Baca ${chapter.judul} dari ${chapter.book.judul} di ${config.nama}.`;
  const chapterPath = `/book/${chapter.book.slug}/chapter/${chapter.orderIndex}`;
  return {
    title,
    description,
    // Chapter gratis: halaman baca penuh sudah bisa diindeks → preview menunjuk ke sana
    // (hindari konten ganda). Chapter terkunci: preview inilah halaman yang diindeks.
    alternates: { canonical: chapter.isFree ? chapterPath : `${chapterPath}/preview` },
    robots: { index: true, follow: true },
    ...buildSocialMetadata({
      title,
      description,
      imageUrl: chapter.book.coverUrl,
      imageAlt: `Sampul ${chapter.book.judul}`,
      type: 'book',
    }),
  };
}

/**
 * Halaman preview share Chapter — URL inilah yang dibagikan tombol Share. Publik tanpa
 * login (crawler SEO & kartu WhatsApp/Facebook/X): hanya paragraf pertama Chapter
 * (panjang diatur Platform), lalu ajakan login untuk lanjut membaca. Isi Chapter utuh
 * tidak pernah dimuat di sini.
 */
export default async function ChapterPreviewPage({ params }: ChapterPreviewPageProps) {
  const { slug, orderIndex } = await params;
  const { config, chapter } = await loadPreview(slug, orderIndex);
  if (!chapter) {
    notFound();
  }

  const { token } = await getSession();
  const chapterPath = `/book/${chapter.book.slug}/chapter/${chapter.orderIndex}`;
  const canContinue = chapter.isFree || Boolean(token);
  const continueHref = canContinue ? chapterPath : `/auth/login?next=${encodeURIComponent(chapterPath)}`;

  const origin = await resolveOriginFromHeaders();
  const coverUrl = toAbsoluteUrl(chapter.book.coverUrl, origin);
  const jsonLd = toJsonLdScript({
    '@context': 'https://schema.org',
    '@type': 'Chapter',
    name: chapter.judul,
    url: `${origin}${chapterPath}/preview`,
    position: chapter.orderIndex,
    description: chapter.excerpt,
    ...(chapter.publishedAt ? { datePublished: chapter.publishedAt } : {}),
    isAccessibleForFree: chapter.isFree,
    isPartOf: {
      '@type': 'Book',
      name: chapter.book.judul,
      url: `${origin}/book/${chapter.book.slug}`,
      ...(coverUrl ? { image: coverUrl } : {}),
    },
    publisher: { '@type': 'Organization', name: config.nama },
  });

  return (
    <div className="mx-auto max-w-[680px] px-4 py-8 pb-28 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />

      <Link
        href={`/book/${chapter.book.slug}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-[var(--reader-muted)] hover:text-[var(--reader-terracotta)]"
      >
        <ArrowLeft className="h-4 w-4" />
        {chapter.book.judul}
      </Link>

      <div className="mb-8 flex items-start gap-4">
        {chapter.book.coverUrl && (
          <div className="relative aspect-[3/4] w-20 shrink-0 overflow-hidden rounded-md border border-[var(--reader-border)] bg-[var(--reader-surface)] sm:w-24">
            <SafeImage src={chapter.book.coverUrl} alt={`Sampul ${chapter.book.judul}`} fill sizes="96px" className="object-cover" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-[var(--reader-muted)]">{chapter.book.judul}</p>
          <h1
            className="mt-1 text-2xl font-semibold text-[var(--reader-foreground)] sm:text-3xl"
            style={{ fontFamily: 'var(--font-source-serif)' }}
          >
            {chapter.orderIndex}. {chapter.judul}
          </h1>
        </div>
      </div>

      {chapter.excerpt && (
        <div className="relative">
          <p
            className="text-[1.0625rem] leading-[1.9] text-[var(--reader-foreground)]"
            style={{ fontFamily: 'var(--font-source-serif)' }}
          >
            {chapter.excerpt}
          </p>
          {/* Fade di bawah paragraf: tanda bahwa cerita berlanjut. */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[var(--reader-bg)] to-transparent" />
        </div>
      )}

      <div className="mt-8 flex flex-col items-center gap-3 rounded-xl border border-[var(--reader-border)] bg-[var(--reader-surface)] px-6 py-8 text-center">
        <p className="text-sm text-[var(--reader-muted)]">
          {canContinue
            ? `Lanjutkan membaca chapter ini di ${config.nama}.`
            : `Masuk untuk membaca chapter ini selengkapnya di ${config.nama}.`}
        </p>
        <Link
          href={continueHref}
          className="inline-flex items-center gap-2 rounded-full bg-[var(--reader-terracotta)] px-6 py-2.5 text-sm font-medium text-[var(--reader-terracotta-foreground)] transition-opacity hover:opacity-90"
        >
          {canContinue ? <BookOpen className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
          {canContinue ? 'Lanjut membaca' : 'Masuk untuk lanjut membaca'}
        </Link>
        <Link href={`/book/${chapter.book.slug}`} className="text-xs text-[var(--reader-muted)] hover:text-[var(--reader-terracotta)]">
          Lihat detail buku
        </Link>
      </div>
    </div>
  );
}
