import type { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen, History } from 'lucide-react';

import { BookMasonryGrid } from '@/components/reader/book-masonry-grid';
import { SafeImage } from '@/components/safe-image';
import { StartMessageButton } from '@/components/reader/start-message-button';
import { getPlatformSlug } from '@/lib/platform';
import { getPlatformConfig, publicFetch } from '@/lib/public-api';
import type { UserProfileStatsDto } from '@/lib/public-types';

interface UserProfilePageProps {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ name?: string; avatar?: string }>;
}

/**
 * Halaman Profile User (susulan Inbox/DM, 16 Sep 2026) — MURNI display
 * statistik (Karya + Reading List), BUKAN halaman edit profil. TIDAK ADA
 * Followers/Following (tidak ada konsepnya di Bookpedia sama sekali).
 *
 * Nama & avatar dibawa dari KONTEKS KLIK (query param `name`/`avatar`) —
 * `bookpedia-api` sengaja tidak punya tabel `users` lokal, jadi tidak bisa
 * resolve nama/avatar user lain sendiri (lihat bookpedia/overview.md §15.3).
 * Konsekuensi jujur: buka link ini LANGSUNG tanpa konteks (share link, tab
 * baru) → nama/avatar fallback generik, bukan bug.
 */
export async function generateMetadata({ searchParams }: UserProfilePageProps): Promise<Metadata> {
  const { name } = await searchParams;
  return { title: name ? `${name} — Profil Pengguna` : 'Profil Pengguna' };
}

export default async function UserProfilePage({ params, searchParams }: UserProfilePageProps) {
  const { userId } = await params;
  const { name, avatar } = await searchParams;
  const platformSlug = await getPlatformSlug();

  const [config, stats] = await Promise.all([
    getPlatformConfig(platformSlug),
    publicFetch<UserProfileStatsDto>(`/public/platforms/${platformSlug}/users/${userId}`),
  ]);

  const displayName = name || 'Pengguna';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="flex items-start gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--reader-border)] bg-[var(--reader-bg)]">
          {avatar ? (
            <SafeImage src={avatar} alt={displayName} width={80} height={80} priority className="h-full w-full object-cover" />
          ) : (
            <span className="text-2xl font-semibold text-[var(--reader-muted)]" style={{ fontFamily: 'var(--font-source-serif)' }}>
              {initial}
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2 pt-1">
          <h1
            className="text-xl font-semibold text-[var(--reader-foreground)] sm:text-2xl"
            style={{ fontFamily: 'var(--font-source-serif)' }}
          >
            {displayName}
          </h1>
          <div className="flex items-center gap-4 text-sm text-[var(--reader-muted)]">
            <span>
              <strong className="text-[var(--reader-foreground)]">{stats?.worksCount ?? 0}</strong> Karya
            </span>
            <span>
              <strong className="text-[var(--reader-foreground)]">{stats?.readingList.length ?? 0}</strong> Reading List
            </span>
          </div>
          {stats?.librarySlug && (
            <Link
              href={`/library/${stats.librarySlug}`}
              className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-[var(--reader-terracotta)] hover:underline"
            >
              <BookOpen className="h-3.5 w-3.5" />
              Lihat karya di Library
            </Link>
          )}
          <div className="mt-1">
            <StartMessageButton targetUserId={userId} targetDisplayName={name ?? null} />
          </div>
        </div>
      </div>

      <div className="mt-10">
        <h2
          className="mb-3 flex items-center gap-1.5 text-lg font-semibold text-[var(--reader-foreground)]"
          style={{ fontFamily: 'var(--font-source-serif)' }}
        >
          <History className="h-4 w-4" />
          Reading List
        </h2>
        {!stats || stats.readingList.length === 0 ? (
          <p className="rounded-lg border border-[var(--reader-border)] bg-[var(--reader-surface)] px-4 py-6 text-center text-sm text-[var(--reader-muted)]">
            Belum ada buku yang pernah dibuka.
          </p>
        ) : (
          <BookMasonryGrid
            books={stats.readingList}
            platformSlug={platformSlug}
            showStatus={config.showBookStatus}
            showRating={config.enableRating}
            showLike={config.enableLike}
            showComment={config.enableComment}
          />
        )}
      </div>
    </div>
  );
}
