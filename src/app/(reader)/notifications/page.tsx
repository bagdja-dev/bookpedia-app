'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import type { NotificationItem } from '@/components/reader/notification-bell';
import { useRealtime } from '@/components/reader/realtime-provider';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';

type NotificationListResponse = {
  items: NotificationItem[];
  total: number;
  limit: number;
  offset: number;
};

export default function NotificationsPage() {
  const router = useRouter();
  const { isLoggedIn, loading } = useAuth();
  const { markNotificationRead, markAllNotificationsRead } = useRealtime();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!isLoggedIn) {
      router.replace('/auth/login?next=/notifications');
      return;
    }

    apiClient<NotificationListResponse>('/notifications?limit=100')
      .then((response) => setItems(response.items))
      .catch(() => undefined)
      .finally(() => setLoadingItems(false));
  }, [isLoggedIn, loading, router]);

  async function markRead(item: NotificationItem) {
    if (!item.readAt) {
      await markNotificationRead(item.id);
      setItems((current) => current.map((entry) => (entry.id === item.id ? { ...entry, readAt: new Date().toISOString() } : entry)));
    }
    router.push(item.actionUrl);
  }

  async function markAllRead() {
    await markAllNotificationsRead();
    setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })));
  }

  if (loading || !isLoggedIn) return null;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Notifikasi</h1>
          <p className="mt-1 text-sm text-muted-foreground">Aktivitas terbaru yang berkaitan dengan akun Anda.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => void markAllRead()} className="text-sm text-muted-foreground hover:text-foreground">
            Tandai semua dibaca
          </button>
        </div>
      </div>

      {loadingItems ? (
        <p className="text-sm text-muted-foreground">Memuat notifikasi...</p>
      ) : items.length === 0 ? (
        <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">Belum ada notifikasi.</div>
      ) : (
        <div className="divide-y rounded-lg border">
          {items.map((item) => (
            <button key={item.id} type="button" onClick={() => void markRead(item)} className="flex w-full items-start gap-3 p-4 text-left hover:bg-muted/50">
              <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${item.readAt ? 'bg-muted' : 'bg-primary'}`} />
              <span className="min-w-0">
                <span className="block font-medium">{item.title}</span>
                <span className="mt-1 block whitespace-pre-line text-sm text-muted-foreground">{item.message}</span>
                <span className="mt-2 block text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString('id-ID')}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </main>
  );
}