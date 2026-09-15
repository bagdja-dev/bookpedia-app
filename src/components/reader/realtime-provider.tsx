'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';

type EventHandler = (data: Record<string, unknown>) => void;

interface RealtimeContextValue {
  subscribe: (eventName: string, handler: EventHandler) => () => void;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

export function useRealtime(): RealtimeContextValue {
  const context = useContext(RealtimeContext);
  if (!context) throw new Error('useRealtime must be used within RealtimeProvider');
  return context;
}

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const listenersRef = useRef<Map<string, Set<EventHandler>>>(new Map());
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/realtime/ws-token', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error(`ws-token ${response.status}`);
        const data = (await response.json()) as { access_token: string };
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
      listenersRef.current.get(eventName)?.forEach((handler) => handler(eventData));
    });

    socket.on('connect_error', (error) => console.error('[BookpediaRealtime] koneksi gagal:', error.message));
    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  const subscribe = useCallback((eventName: string, handler: EventHandler) => {
    let handlers = listenersRef.current.get(eventName);
    if (!handlers) {
      handlers = new Set();
      listenersRef.current.set(eventName, handlers);
    }
    handlers.add(handler);
    return () => handlers?.delete(handler);
  }, []);

  return <RealtimeContext.Provider value={{ subscribe }}>{children}</RealtimeContext.Provider>;
}
