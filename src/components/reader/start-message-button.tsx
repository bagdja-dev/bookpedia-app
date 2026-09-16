'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle } from 'lucide-react';

import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';

/** Tombol "Kirim Pesan" di halaman Profile User (`/u/[userId]`) — peer DM, POST /messages/direct/users/:targetUserId. */
export function StartMessageButton({ targetUserId, targetDisplayName }: { targetUserId: string; targetDisplayName: string | null }) {
  const { isLoggedIn, user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (user?.userId === targetUserId) {
    return null;
  }

  async function handleClick() {
    if (!isLoggedIn) {
      router.push(`/auth/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }

    setLoading(true);
    try {
      const { topicId } = await apiClient<{ topicId: string }>(`/messages/direct/users/${encodeURIComponent(targetUserId)}`, {
        method: 'POST',
        body: JSON.stringify({ targetDisplayName }),
      });
      router.push(`/inbox?topic=${encodeURIComponent(topicId)}`);
    } catch (error) {
      console.error('[StartMessageButton] gagal mulai percakapan:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[var(--reader-terracotta)] px-4 py-1.5 text-sm font-medium text-[var(--reader-terracotta-foreground)] transition-opacity hover:opacity-90 disabled:opacity-60"
    >
      <MessageCircle className="h-4 w-4" />
      Kirim Pesan
    </button>
  );
}
