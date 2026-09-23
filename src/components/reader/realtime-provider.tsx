'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { io, type Socket } from 'socket.io-client';
import { toast } from 'sonner';

import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import { usePlatformContext } from '@/context/platform-context';

type EventHandler = (data: Record<string, unknown>) => void;

interface NotificationEvent {
  notificationId: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  severity: 'info' | 'success' | 'warning' | 'error';
  actionLabel?: string;
  actionUrl: string;
}

interface RealtimeContextValue {
  subscribe: (eventName: string, handler: EventHandler) => () => void;
  unreadCount: number;
  markNotificationRead: (notificationId: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  refreshUnreadCount: () => Promise<void>;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

export function useRealtime(): RealtimeContextValue {
  const context = useContext(RealtimeContext);
  if (!context) throw new Error('useRealtime must be used within RealtimeProvider');
  return context;
}

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user } = useAuth();
  const { config } = usePlatformContext();
  const socketRef = useRef<Socket | null>(null);
  const listenersRef = useRef<Map<string, Set<EventHandler>>>(new Map());
  const seenNotificationsRef = useRef<Set<string>>(new Set());
  const originalTitleRef = useRef<string | null>(null);
  const originalFaviconHrefRef = useRef<string | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioUnlockedRef = useRef(false);
  const [token, setToken] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Browser memblokir audio otomatis sebelum ada interaksi user sama sekali
  // di halaman (autoplay policy) — "buka kunci" satu kali di interaksi
  // PERTAMA (klik/tap/keydown apa pun, tidak harus terkait notifikasi),
  // supaya pemutaran suara berikutnya yang dipicu event WebSocket (tanpa
  // gesture user langsung) tidak diblokir diam-diam.
  useEffect(() => {
    function unlock() {
      if (audioUnlockedRef.current) return;
      audioUnlockedRef.current = true;
      try {
        const AudioContextCtor =
          window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AudioContextCtor && !audioCtxRef.current) {
          audioCtxRef.current = new AudioContextCtor();
        }
        void audioCtxRef.current?.resume().catch(() => undefined);
      } catch {
        // Web Audio tidak didukung — diamkan, badge title/favicon tetap jadi indikator.
      }
    }
    document.addEventListener('pointerdown', unlock, { once: true });
    document.addEventListener('keydown', unlock, { once: true });
    return () => {
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
    };
  }, []);

  // Suara notifikasi — kalau Platform sudah upload suara custom
  // (`config.notificationSoundUrl`, lihat Platform Settings admin), putar
  // filenya langsung. Kalau belum (null), sintesis nada pendek lewat Web
  // Audio API supaya tidak perlu bundling file audio default di repo.
  const playNotificationSound = useCallback(() => {
    if (config.notificationSoundUrl) {
      try {
        const audio = new Audio(config.notificationSoundUrl);
        audio.volume = 0.6;
        void audio.play().catch(() => undefined);
      } catch {
        // ignore
      }
      return;
    }

    const ctx = audioCtxRef.current;
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.2, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.32);
    } catch {
      // ignore
    }
  }, [config.notificationSoundUrl]);

  // Badge unread di tab browser — title + favicon. `/_next/image` (built-in
  // Next.js image proxy, sudah dipakai buat logo/cover lewat `next/image`)
  // dipilih SENGAJA sebagai sumber gambar canvas: request-nya di-fetch oleh
  // server Next (bukan browser), jadi selalu same-origin dari sudut pandang
  // browser — tidak bergantung sama sekali apakah bucket R2 di belakang
  // `cdn.bagdja.com` mengirim header CORS atau tidak (kalau langsung dipakai
  // di sini, canvas bisa "tainted" dan `toDataURL()` gagal).
  useEffect(() => {
    if (originalTitleRef.current === null) {
      originalTitleRef.current = document.title;
    }
    const base = originalTitleRef.current;
    document.title = unreadCount > 0 ? `(${unreadCount > 99 ? '99+' : unreadCount}) ${base}` : base;
  }, [unreadCount]);

  useEffect(() => {
    let linkEl = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    if (!linkEl && config.faviconUrl) {
      linkEl = document.createElement('link');
      linkEl.rel = 'icon';
      document.head.appendChild(linkEl);
    }
    if (!linkEl) return;

    if (originalFaviconHrefRef.current === null) {
      originalFaviconHrefRef.current = linkEl.href;
    }

    if (unreadCount <= 0 || !config.faviconUrl) {
      linkEl.href = originalFaviconHrefRef.current;
      return;
    }

    const size = 64;
    const proxiedUrl = `/_next/image?url=${encodeURIComponent(config.faviconUrl)}&w=${size}&q=75`;
    const img = new window.Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx || !linkEl) return;
        ctx.drawImage(img, 0, 0, size, size);

        const radius = size * 0.3;
        const cx = size - radius * 0.85;
        const cy = radius * 0.85;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#dc2626';
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.round(radius * 1.1)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(unreadCount > 9 ? '9+' : String(unreadCount), cx, cy + 1);

        linkEl.href = canvas.toDataURL('image/png');
      } catch {
        // Canvas tainted (mis. R2 belum kasih header CORS suatu saat nanti
        // dipakai lewat jalur lain) — diamkan, title tab tetap jadi indikator.
      }
    };
    img.onerror = () => undefined;
    img.src = proxiedUrl;
  }, [unreadCount, config.faviconUrl]);

  useEffect(() => {
    if (!user?.userId) {
      setUnreadCount(0);
      return;
    }

    let cancelled = false;
    void apiClient<{ count: number }>('/notifications/unread-count')
      .then((response) => {
        if (!cancelled) setUnreadCount(response.count);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [user?.userId]);

  const markNotificationRead = useCallback(async (notificationId: string) => {
    await apiClient(`/notifications/${encodeURIComponent(notificationId)}/read`, { method: 'PATCH' }).catch(() => undefined);
    setUnreadCount((count) => Math.max(0, count - 1));
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    await apiClient('/notifications/read-all', { method: 'PATCH' }).catch(() => undefined);
    setUnreadCount(0);
  }, []);

  const refreshUnreadCount = useCallback(async () => {
    const response = await apiClient<{ count: number }>('/notifications/unread-count');
    setUnreadCount(response.count);
  }, []);

  const showNotificationToast = useCallback(
    (rawData: Record<string, unknown>) => {
      const notification = rawData as Partial<NotificationEvent>;
      if (
        !notification.notificationId ||
        !notification.userId ||
        !notification.title ||
        !notification.message ||
        !notification.actionUrl ||
        !notification.severity ||
        !notification.actionUrl.startsWith('/')
      ) {
        return;
      }
      if (user?.userId && notification.userId !== user.userId) return;
      if (seenNotificationsRef.current.has(notification.notificationId)) return;
      seenNotificationsRef.current.add(notification.notificationId);
      void refreshUnreadCount().catch(() => undefined);
      playNotificationSound();

      const handleAction = (toastId: string | number) => {
        toast.dismiss(toastId);
        void markNotificationRead(notification.notificationId!).finally(() => router.push(notification.actionUrl!));
      };

      // Tanpa tombol action terpisah — seluruh badan toast jadi area klik
      // (lebih gampang di-tap, terutama di layar sempit). `toast.custom()`
      // dipakai (bukan `toast[severity](...)`) karena option bawaan sonner
      // tidak punya `onClick` di level toast, cuma di level tombol action.
      // Warna direplikasi dari palet `richColors` bawaan sonner (var CSS
      // `--{severity}-bg/border/text`, sudah global lewat stylesheet sonner)
      // supaya tampilannya tetap konsisten dengan toast lain di app.
      toast.custom((toastId) => (
        <div
          role="button"
          tabIndex={0}
          onClick={() => handleAction(toastId)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') handleAction(toastId);
          }}
          className="flex w-full cursor-pointer flex-col gap-1 rounded-lg border p-4 text-sm shadow-lg"
          style={{
            background: `var(--${notification.severity}-bg)`,
            borderColor: `var(--${notification.severity}-border)`,
            color: `var(--${notification.severity}-text)`,
          }}
        >
          <p className="font-medium">{notification.title}</p>
          <p className="whitespace-pre-line opacity-90">{notification.message}</p>
        </div>
      ));
    },
    [markNotificationRead, playNotificationSound, refreshUnreadCount, router, user?.userId],
  );

  useEffect(() => {
    let cancelled = false;

    fetch('/api/realtime/ws-token', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error(`ws-token ${response.status}`);
        const data = (await response.json()) as { access_token: string; channels?: string[] };
        console.debug('[BookpediaRealtime] token channels:', data.channels ?? []);
        if (!cancelled) setToken(data.access_token);
      })
      .catch((error) => console.error('[BookpediaRealtime] gagal mengambil token:', error));

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!token) return;

    const eventServiceUrl = process.env.NEXT_PUBLIC_EVENT_API ?? 'http://localhost:4085';
    const socket = io(`${eventServiceUrl.replace(/\/$/, '')}/events`, {
      auth: { token },
      transports: ['websocket'],
    });

    socket.on('event', (event) => {
      const eventName = event?.data?.eventName;
      const eventData = event?.data?.data;
      if (!eventName || !eventData) return;
      if (eventName === 'bookpedia.notification.created') {
        showNotificationToast(eventData);
      }
      listenersRef.current.get(eventName)?.forEach((handler) => handler(eventData));
    });

    socket.on('connect', () => console.debug('[BookpediaRealtime] connected'));

    socket.on('connect_error', (error) => console.error('[BookpediaRealtime] koneksi gagal:', error.message));
    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [showNotificationToast, token]);

  const subscribe = useCallback((eventName: string, handler: EventHandler) => {
    let handlers = listenersRef.current.get(eventName);
    if (!handlers) {
      handlers = new Set();
      listenersRef.current.set(eventName, handlers);
    }
    handlers.add(handler);
    return () => handlers?.delete(handler);
  }, []);

  return (
    <RealtimeContext.Provider
      value={{ unreadCount, markNotificationRead, markAllNotificationsRead, subscribe, refreshUnreadCount }}
    >
      {children}
    </RealtimeContext.Provider>
  );
}
