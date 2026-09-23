'use client';

import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { useRealtime } from './realtime-provider';
import { useAuth } from '@/hooks/use-auth';
import { apiClient } from '@/lib/api-client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: 'info' | 'success' | 'warning' | 'error';
  actionLabel?: string | null;
  actionUrl: string;
  readAt: string | null;
  createdAt: string;
}

type NotificationListResponse = {
  items: NotificationItem[];
  total: number;
  limit: number;
  offset: number;
};

function formatTime(value: string): string {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

export function NotificationBell() {
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  const { unreadCount, markNotificationRead } = useRealtime();
  const [items, setItems] = useState<NotificationItem[]>([]);

  useEffect(() => {
    if (!isLoggedIn) return;
    let cancelled = false;

    Promise.all([
      apiClient<NotificationListResponse>('/notifications?limit=5'),
      apiClient<{ count: number }>('/notifications/unread-count'),
    ])
      .then(([list]) => {
        if (cancelled) return;
        setItems(list.items);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  async function openNotification(item: NotificationItem) {
    if (!item.readAt) {
      await markNotificationRead(item.id);
      setItems((current) => current.map((entry) => (entry.id === item.id ? { ...entry, readAt: new Date().toISOString() } : entry)));
    }
    router.push(item.actionUrl);
  }

  if (!isLoggedIn) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifikasi" title="Notifikasi">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-destructive px-1 text-center text-[10px] font-semibold leading-4 text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifikasi</span>
          {unreadCount > 0 && <span className="text-xs text-muted-foreground">{unreadCount} belum dibaca</span>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <DropdownMenuItem disabled>Belum ada notifikasi</DropdownMenuItem>
        ) : (
          items.map((item) => (
            <DropdownMenuItem key={item.id} onSelect={() => void openNotification(item)} className="items-start gap-3 py-3">
              <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${item.readAt ? 'bg-muted' : 'bg-primary'}`} />
              <span className="min-w-0">
                <span className="block truncate font-medium">{item.title}</span>
                <span className="line-clamp-2 whitespace-pre-line text-xs text-muted-foreground">{item.message}</span>
                <span className="mt-1 block text-[10px] text-muted-foreground">{formatTime(item.createdAt)}</span>
              </span>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => router.push('/notifications')} className="justify-center font-medium">
          Lihat semua notifikasi
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
