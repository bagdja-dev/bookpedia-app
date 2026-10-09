'use client';

import { Share2 } from 'lucide-react';

import { shareLink } from '@/lib/share-link';

/**
 * Tombol Share di halaman sinopsis Book — membagikan URL halaman Book itu sendiri
 * (publik, sudah ber-meta SEO & kartu sosmed dari cover + sinopsis).
 */
export function BookShareButton({ bookSlug, bookTitle }: { bookSlug: string; bookTitle: string }) {
  return (
    <button
      type="button"
      onClick={() => void shareLink(`${window.location.origin}/book/${encodeURIComponent(bookSlug)}`, bookTitle)}
      className="mt-2 flex w-fit items-center gap-2 rounded-full border border-[var(--reader-border)] bg-[var(--reader-surface)] px-5 py-2 text-sm font-medium text-[var(--reader-foreground)] transition-colors hover:border-[var(--reader-terracotta)] hover:text-[var(--reader-terracotta)]"
      aria-label={`Bagikan ${bookTitle}`}
    >
      <Share2 className="h-4 w-4" />
      Bagikan
    </button>
  );
}
