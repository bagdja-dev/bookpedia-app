'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Loader2, MessageCircle, Send } from 'lucide-react';

import { LoadingSpinner } from '@/components/loading-spinner';
import { useRealtime } from '@/components/reader/realtime-provider';
import { apiClient, ApiError } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import type { ChatMessageDto, ChatMessageListResponse, LibraryConversationSummaryDto } from '@/lib/inbox-types';

function EmptyState() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 rounded-xl border border-dashed text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <MessageCircle className="h-6 w-6" />
      </div>
      <h2 className="text-base font-semibold">Belum ada pesan masuk</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        Pesan dari pembaca yang mengirim DM ke Library kamu akan muncul di sini.
      </p>
    </div>
  );
}

/**
 * Inbox Studio — daftar reader yang pernah DM ke Library milik user login
 * (`GET /library/inbox`, MVP owner tunggal). Balas dari sini SELALU sebagai
 * identitas Library (`asLibrary: true`, "satu suara Library" —
 * bookpedia/overview.md §15.2), BUKAN identitas pribadi staff. Reader tidak
 * punya sumber avatar (sama seperti reader lain — bookpedia-api sengaja
 * tanpa tabel `users` lokal), jadi cuma inisial huruf, tidak ada foto.
 */
export default function DashboardInboxPage() {
  const { user } = useAuth();
  const { subscribe } = useRealtime();
  const [conversations, setConversations] = useState<LibraryConversationSummaryDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageDto[] | null>(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const loadConversations = useCallback(async () => {
    try {
      const data = await apiClient<LibraryConversationSummaryDto[]>('/library/inbox');
      setConversations(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal memuat Inbox');
      setConversations([]);
    }
  }, []);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  const loadMessages = useCallback(async (topicId: string, silent = false) => {
    if (!silent) setLoadingMessages(true);
    try {
      const data = await apiClient<ChatMessageListResponse>(`/inbox/${encodeURIComponent(topicId)}/messages?limit=50`);
      setMessages(data.items.slice().reverse());
    } catch (err) {
      console.error('[DashboardInboxPage] gagal memuat pesan:', err);
      if (!silent) setMessages([]);
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (selectedTopicId) void loadMessages(selectedTopicId);
  }, [selectedTopicId, loadMessages]);

  // Fase 3.5 (Status Baca) — sama persis pola reader app `/inbox`: nolkan
  // badge lokal dulu (optimistic), baru panggil endpoint Studio di belakang.
  const markConversationRead = useCallback(async (topicId: string) => {
    setConversations((current) =>
      current?.map((c) => (c.topicId === topicId ? { ...c, unreadCount: 0 } : c)) ?? current,
    );
    try {
      await apiClient(`/library/inbox/${encodeURIComponent(topicId)}/read`, { method: 'POST' });
    } catch (err) {
      console.error('[DashboardInboxPage] gagal menandai percakapan sudah dibaca:', err);
    }
  }, []);

  const selectConversation = useCallback(
    (topicId: string) => {
      setSelectedTopicId(topicId);
      void markConversationRead(topicId);
    },
    [markConversationRead],
  );

  // Realtime — sama pola reader app `/inbox`: topic yang SEDANG dibuka
  // di-refetch silent + langsung mark-read. Topic lain: increment badge
  // `unreadCount` lokal SEKETIKA kalau percakapannya sudah ada di daftar
  // (tanpa nunggu round-trip network), atau refetch `GET /library/inbox`
  // kalau ini percakapan baru yang belum pernah muncul di state.
  useEffect(() => {
    return subscribe('bagdja.chat.message.created', (data) => {
      const topicId = data.topicId as string | undefined;
      if (!topicId) return;

      if (topicId === selectedTopicId) {
        void loadMessages(selectedTopicId, true);
        void markConversationRead(selectedTopicId);
        return;
      }

      setConversations((current) => {
        if (!current) return current;
        if (!current.some((c) => c.topicId === topicId)) {
          void loadConversations();
          return current;
        }
        return current.map((c) => (c.topicId === topicId ? { ...c, unreadCount: c.unreadCount + 1 } : c));
      });
    });
  }, [selectedTopicId, subscribe, loadMessages, markConversationRead, loadConversations]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = body.trim();
    if (!content || sending || !selectedTopicId) return;

    setSending(true);
    try {
      const created = await apiClient<ChatMessageDto>(`/inbox/${encodeURIComponent(selectedTopicId)}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body: content, asLibrary: true }),
      });
      setMessages((current) => [...(current ?? []), created]);
      setBody('');
    } catch (err) {
      console.error('[DashboardInboxPage] gagal mengirim pesan:', err);
    } finally {
      setSending(false);
    }
  }

  const selectedConversation = conversations?.find((c) => c.topicId === selectedTopicId) ?? null;

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Inbox</h1>
        <p className="text-sm text-muted-foreground">Pesan masuk dari pembaca ke Library kamu.</p>
      </div>

      {error && <p className="text-sm text-destructive">Gagal memuat Inbox: {error}</p>}

      {!conversations && !error && <LoadingSpinner label="Memuat Inbox…" />}

      {conversations && (conversations.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex min-h-0 flex-1 overflow-hidden rounded-xl border bg-card">
          <div
            className={cn(
              'w-full shrink-0 overflow-y-auto border-r sm:block sm:w-72',
              selectedTopicId ? 'hidden' : 'block',
            )}
          >
            <ul className="divide-y">
              {conversations.map((conversation) => (
                <li key={conversation.topicId}>
                  <button
                    type="button"
                    onClick={() => selectConversation(conversation.topicId)}
                    className={cn(
                      'flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted',
                      selectedTopicId === conversation.topicId && 'bg-muted',
                    )}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
                      {conversation.readerDisplayName.charAt(0).toUpperCase()}
                    </div>
                    <p className="min-w-0 flex-1 truncate text-sm font-medium">{conversation.readerDisplayName}</p>
                    {conversation.unreadCount > 0 && (
                      <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
                        {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className={cn('flex min-w-0 flex-1 flex-col', selectedTopicId ? 'flex' : 'hidden sm:flex')}>
            {!selectedConversation ? (
              <div className="flex flex-1 items-center justify-center px-4 text-center text-sm text-muted-foreground">
                Pilih percakapan di sebelah kiri.
              </div>
            ) : (
              <>
                <div className="flex shrink-0 items-center justify-between gap-2 border-b px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedTopicId(null)}
                      className="text-sm text-muted-foreground hover:text-foreground sm:hidden"
                    >
                      &larr;
                    </button>
                    <span className="text-sm font-semibold">{selectedConversation.readerDisplayName}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Balas sebagai Library</span>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto p-4">
                  {loadingMessages ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : messages && messages.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">Belum ada pesan.</p>
                  ) : (
                    messages?.map((message) => {
                      const isFromLibrary = message.senderUserId === user?.userId;
                      return (
                        <div key={message.id} className={cn('flex', isFromLibrary ? 'justify-end' : 'justify-start')}>
                          <div
                            className={cn(
                              'max-w-[75%] rounded-2xl px-3 py-2 text-sm',
                              isFromLibrary ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
                            )}
                          >
                            {message.body}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <form onSubmit={sendMessage} className="flex shrink-0 items-center gap-2 border-t p-4">
                  <input
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    disabled={sending}
                    placeholder="Balas sebagai Library..."
                    className="min-w-0 flex-1 rounded-full border bg-transparent px-4 py-2 text-sm outline-none focus:border-primary disabled:opacity-60"
                  />
                  <button
                    type="submit"
                    disabled={sending || !body.trim()}
                    aria-label="Kirim pesan"
                    className="rounded-full bg-primary p-2 text-primary-foreground disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
