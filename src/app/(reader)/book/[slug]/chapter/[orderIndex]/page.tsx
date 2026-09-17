import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';

import { getPlatformSlug } from '@/lib/platform';
import { getPlatformConfig, publicFetch } from '@/lib/public-api';
import { getSession } from '@/lib/session';
import { buildSocialMetadata } from '@/lib/seo';
import type { ChapterReadDto } from '@/lib/public-types';
import { HighlightableChapter } from '@/components/highlightable-chapter';
import { ReadingProgressTracker } from '@/components/reading-progress-tracker';
import { ChapterViewTracker } from '@/components/reader/chapter-view-tracker';
import { ChapterRatingWidget } from '@/components/reader/chapter-rating-widget';
import { StarRatingDisplay } from '@/components/reader/star-rating-display';
import { ChapterEngagementBar } from '@/components/reader/chapter-engagement-bar';

interface ChapterPageProps {
  params: Promise<{ slug: string; orderIndex: string }>;
}

export async function generateMetadata({ params }: ChapterPageProps): Promise<Metadata> {
  const { slug, orderIndex } = await params;
  const platformSlug = await getPlatformSlug();
  const [config, chapter] = await Promise.all([
    getPlatformConfig(platformSlug),
    publicFetch<ChapterReadDto>(`/public/platforms/${platformSlug}/books/${slug}/chapters/${orderIndex}`),
  ]);
  if (!chapter) {
    return { title: `Chapter tidak ditemukan — ${config.nama}` };
  }
  // Chapter yang butuh login diredirect di komponen halaman (bukan di sini)
  // — respons redirect tidak pernah membawa tag metadata ini ke browser,
  // jadi tidak perlu cabang isFree khusus di sini (lihat seo-execution-plan.md §1.2).
  const title = `${chapter.judul} — ${chapter.book.judul} — ${config.nama}`;
  const description = `Baca ${chapter.judul} dari ${chapter.book.judul} di ${config.nama}.`;
  return {
    title,
    description,
    alternates: { canonical: `/book/${chapter.book.slug}/chapter/${chapter.orderIndex}` },
    ...buildSocialMetadata({ title, description, imageUrl: chapter.book.coverUrl }),
  };
}

// Kolom teks baca — max-width dibatasi (~680px, ekuivalen 65-75
// karakter/baris pada font serif ukuran ini), font serif jadi hero, line-
// height lega. TIDAK ada toolbar tema/ukuran font/highlight — itu Fase 3.
//
// Guard login (disepakati 9 Sep 2026, direvisi Fase 5/14 Sep 2026 — SEO):
// katalog/detail Book/Library tetap publik (discovery & SEO). KONTEN chapter
// (halaman ini) wajib login KECUALI Chapter ini termasuk "Maximum Free
// Chapter" efektif Platform/Book (`chapter.isFree`, dihitung backend — lihat
// plan/bookpedia/overview.md §11). Chapter gratis dirender penuh TANPA cek
// session sama sekali, termasuk untuk crawler (tidak dibedakan bot/manusia,
// sengaja, supaya tidak dianggap cloaking oleh search engine). Chapter
// dicek server-side via cookie `ns_token` (httpOnly, lihat lib/session.ts)
// SEBELUM fetch konten kalau memang perlu, supaya tidak ada flash konten ke
// pengunjung yang belum login (beda dari pola client-side redirect di
// reader-auth-nav.tsx).
export default async function ChapterPage({ params }: ChapterPageProps) {
  const { slug, orderIndex } = await params;

  const platformSlug = await getPlatformSlug();
  const [config, chapter] = await Promise.all([
    getPlatformConfig(platformSlug),
    publicFetch<ChapterReadDto>(`/public/platforms/${platformSlug}/books/${slug}/chapters/${orderIndex}`),
  ]);

  if (!chapter) {
    notFound();
  }

  if (!chapter.isFree) {
    const { token } = await getSession();
    if (!token) {
      redirect(`/auth/login?next=${encodeURIComponent(`/book/${slug}/chapter/${orderIndex}`)}`);
    }
  }

  return (
    <div className="mx-auto max-w-[680px] px-4 py-8 pb-28 sm:px-6">
      <ReadingProgressTracker bookId={chapter.book.id} chapterId={chapter.id} />
      <ChapterViewTracker platformSlug={platformSlug} bookSlug={slug} orderIndex={chapter.orderIndex} />
      <ChapterEngagementBar
        chapterId={chapter.id}
        platformSlug={platformSlug}
        bookSlug={slug}
        orderIndex={chapter.orderIndex}
        initialLikeCount={chapter.likeCount ?? 0}
        initialCommentCount={chapter.commentCount ?? 0}
        enableLike={config.enableLike}
        enableComment={config.enableComment}
        enableShare={config.enableShare}
      />

      <Link
        href={`/book/${slug}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-[var(--reader-muted)] hover:text-[var(--reader-terracotta)]"
      >
        <ArrowLeft className="h-4 w-4" />
        {chapter.book.judul}
      </Link>

      <h1
        className="mb-8 text-2xl font-semibold text-[var(--reader-foreground)] sm:text-3xl"
        style={{ fontFamily: 'var(--font-source-serif)' }}
      >
        {chapter.orderIndex}. {chapter.judul}
      </h1>

      <HighlightableChapter
        key={chapter.id}
        chapterId={chapter.id}
        konten={chapter.konten}
        className="chapter-content text-[1.0625rem] leading-[1.9] text-[var(--reader-foreground)]"
        style={{ fontFamily: 'var(--font-source-serif)' }}
      />

      {config.enableRating && config.ratingMode === 'chapter' && (
        <div className="mt-10 flex flex-col items-start gap-2 border-t border-[var(--reader-border)] pt-6">
          <p className="text-sm font-medium text-[var(--reader-foreground)]">Rating Chapter ini</p>
          <StarRatingDisplay average={chapter.ratingAverage} count={chapter.ratingCount} size="md" />
          <ChapterRatingWidget chapterId={chapter.id} />
        </div>
      )}

      <nav className="mt-12 flex items-center justify-between gap-4 border-t border-[var(--reader-border)] pt-6">
        {chapter.prevOrderIndex !== null ? (
          <Link
            href={`/book/${slug}/chapter/${chapter.prevOrderIndex}`}
            className="flex items-center gap-1.5 rounded-full border border-[var(--reader-border)] bg-[var(--reader-surface)] px-4 py-2 text-sm text-[var(--reader-foreground)] transition-colors hover:border-[var(--reader-terracotta)] hover:text-[var(--reader-terracotta)]"
          >
            <ChevronLeft className="h-4 w-4" />
            Sebelumnya
          </Link>
        ) : (
          <span />
        )}

        {chapter.nextOrderIndex !== null && (
          <Link
            href={`/book/${slug}/chapter/${chapter.nextOrderIndex}`}
            className="flex items-center gap-1.5 rounded-full bg-[var(--reader-terracotta)] px-4 py-2 text-sm font-medium text-[var(--reader-terracotta-foreground)] transition-opacity hover:opacity-90"
          >
            Berikutnya
            <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </nav>
    </div>
  );
}
