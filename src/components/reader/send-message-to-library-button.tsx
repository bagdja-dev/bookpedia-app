'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle } from 'lucide-react';

import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';

/**
 * "Kirim Pesan ke Penulis" di card Author/Library halaman detail Book —
 * get-or-create Inbox Library (POST /messages/direct/libraries/:libraryId,
 * chat-service/overview.md §4.3.1), lalu pindah ke Kotak Masuk. Kalau
 * pengklik adalah owner Library-nya sendiri, backend menolak (400) — sengaja
 * dibiarkan gagal-senyap di sini (kasus langka: penulis lihat halaman Book
 * miliknya sendiri) daripada nambah pengecekan ownership di frontend.
 */
export function SendMessageToLibraryButton({ libraryId }: { libraryId: string }) {
  const { isLoggedIn } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (!isLoggedIn) {
      router.push(`/auth/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    setLoading(true);
    try {
      const { topicId } = await apiClient<{ topicId: string }>(
        `/messages/direct/libraries/${encodeURIComponent(libraryId)}`,
        { method: 'POST' },
      );
      router.push(`/inbox?topic=${encodeURIComponent(topicId)}`);
    } catch (error) {
      console.error('[SendMessageToLibraryButton] gagal mulai percakapan:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--reader-border)] px-3 py-1.5 text-xs font-medium text-[var(--reader-muted)] transition-colors hover:border-[var(--reader-terracotta)] hover:text-[var(--reader-terracotta)] disabled:opacity-60"
    >
      <MessageCircle className="h-3.5 w-3.5" />
      Kirim Pesan
    </button>
  );
}
