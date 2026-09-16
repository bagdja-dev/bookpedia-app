'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import { SafeImage } from '@/components/safe-image';
import type { ReadingProgressListItemDto } from '@/lib/reader-types';

/**
 * Halaman "Lanjutkan Baca" — menu khusus di header (`reader-auth-nav.tsx`),
 * menggantikan section inline yang sebelumnya nempel di katalog pusat
 * (`(reader)/page.tsx`). Sengaja BUKAN di bawah `/dashboard` (lihat alasan
 * sama seperti `/my/highlights`: pembaca murni belum tentu punya Library).
 */
export default function ContinueReadingPage() {
  const { isLoggedIn, loading: authLoading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<ReadingProgressListItemDto[] | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) {
      router.replace('/auth/login?next=/my/continue-reading');
      return;
    }
    let cancelled = false;
    apiClient<ReadingProgressListItemDto[]>('/reading-progress')
      .then((data) => {
        if (!cancelled) setItems(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error('[ContinueReadingPage] gagal memuat reading progress:', err);
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, isLoggedIn, router]);

  if (authLoading || !isLoggedIn) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 text-sm text-[var(--reader-muted)] sm:px-6">Memuat…</div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1
        className="mb-6 text-2xl font-semibold text-[var(--reader-foreground)] sm:text-3xl"
        style={{ fontFamily: 'var(--font-source-serif)' }}
      >
        Lanjutkan Baca
      </h1>

      {items === null ? (
        <p className="text-sm text-[var(--reader-muted)]">Memuat…</p>
      ) : items.length === 0 ? (
        <p className="rounded-lg border border-[var(--reader-border)] bg-[var(--reader-surface)] px-4 py-8 text-center text-sm text-[var(--reader-muted)]">
          Belum ada Book yang sedang kamu baca.{' '}
          <Link href="/" className="text-[var(--reader-terracotta)] hover:underline">
            Jelajahi katalog
          </Link>
          .
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {items.map((item) => (
            <Link
              key={item.bookId}
              href={`/book/${item.bookSlug}/chapter/${item.lastChapterOrderIndex}`}
              className="group flex flex-col overflow-hidden rounded-lg border border-[var(--reader-border)] bg-[var(--reader-surface)] transition-shadow hover:shadow-md"
            >
              <div className="relative aspect-[3/4] w-full overflow-hidden bg-[var(--reader-bg)]">
                {item.bookCoverUrl ? (
                  <SafeImage
                    src={item.bookCoverUrl}
                    alt={item.bookJudul}
                    fill
                    sizes="(min-width: 1024px) 200px, (min-width: 640px) 33vw, 50vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center text-3xl font-semibold text-[var(--reader-muted)]"
                    style={{ fontFamily: 'var(--font-source-serif)' }}
                  >
                    {item.bookJudul.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-0.5 p-3">
                <span className="line-clamp-2 text-sm font-semibold text-[var(--reader-foreground)]">
                  {item.bookJudul}
                </span>
                <span className="text-xs text-[var(--reader-muted)]">
                  Bab {item.lastChapterOrderIndex}. {item.lastChapterJudul}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
