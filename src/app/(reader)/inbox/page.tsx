'use client';

import { FormEvent, Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2, Send } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import type { ChatMessageDto, ChatMessageListResponse, ConversationSummaryDto } from '@/lib/inbox-types';
import { useRealtime } from '@/components/reader/realtime-provider';
import { useReaderChromeHeight } from '@/hooks/use-reader-chrome-height';

/**
 * Kotak Masuk — layout dua panel ala WhatsApp (kiri daftar kontak, kanan
 * jendela pesan). Di layar sempit, cuma satu panel yang tampil sekaligus
 * (list ATAU thread, tergantung ada tidaknya `selectedTopicId`) — TIDAK ada
 * route terpisah `/inbox/[topicId]` (lihat bookpedia/execution-plan.md Fase
 * 3.3), murni state lokal + query param `?topic=` buat deep-link dari luar
 * (comment/card Author "Kirim Pesan").
 *
 * `useSearchParams()` wajib dibungkus `<Suspense>` (Next.js App Router).
 */
function InboxPageInner() {
  const { isLoggedIn, loading: authLoading, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { subscribe, refreshUnreadCount } = useRealtime();
  const chromeHeight = useReaderChromeHeight();

  const [conversations, setConversations] = useState<ConversationSummaryDto[] | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageDto[] | null>(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const loadConversations = useCallback(async () => {
    try {
      const data = await apiClient<ConversationSummaryDto[]>('/inbox');
      setConversations(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('[InboxPage] gagal memuat kotak masuk:', error);
      setConversations([]);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) {
      router.replace('/auth/login?next=/inbox');
      return;
    }
    void loadConversations();
  }, [authLoading, isLoggedIn, router, loadConversations]);

  // Fase 3.5 (Status Baca) — tandai percakapan sudah dibaca sampai sekarang.
  // Optimistic: nolkan badge lokal DULU (biar hilang seketika di UI), baru
  // panggil API di belakang layar; gagal pun tidak perlu di-rollback (paling
  // parah badge nongol lagi pas refetch `GET /inbox` berikutnya).
  const markConversationRead = useCallback(async (topicId: string) => {
    setConversations((current) =>
      current?.map((c) => (c.topicId === topicId ? { ...c, unreadCount: 0 } : c)) ?? current,
    );
    try {
      await apiClient(`/inbox/${encodeURIComponent(topicId)}/read`, { method: 'POST' });
      void refreshUnreadCount().catch(() => undefined);
    } catch (error) {
      console.error('[InboxPage] gagal menandai percakapan sudah dibaca:', error);
    }
  }, [refreshUnreadCount]);

  const selectConversation = useCallback(
    (topicId: string) => {
      setSelectedTopicId(topicId);
      void markConversationRead(topicId);
    },
    [markConversationRead],
  );

  // Deep-link dari luar (comment/card Author "Kirim Pesan") — dibaca sekali
  // saat halaman dibuka, TIDAK dipaksa terus mengikuti perubahan URL supaya
  // klik kontak lain di list tidak "ditarik balik" oleh query param lama.
  useEffect(() => {
    const topic = searchParams.get('topic');
    if (topic) selectConversation(topic);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const loadMessages = useCallback(async (topicId: string, silent = false) => {
    if (!silent) setLoadingMessages(true);
    try {
      const data = await apiClient<ChatMessageListResponse>(`/inbox/${encodeURIComponent(topicId)}/messages?limit=50`);
      // Backend urutkan DESC (terbaru dulu, sama pola CommentSheet) — chat
      // bubble butuh ASC (lama ke baru, pesan terbaru di bawah).
      setMessages(data.items.slice().reverse());
    } catch (error) {
      console.error('[InboxPage] gagal memuat pesan:', error);
      if (!silent) setMessages([]);
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  }, []);

  // Realtime — event `bagdja.chat.message.created` disiarkan buat SEMUA
  // type Topic (comment/public/private, sama persis pola CommentSheet), jadi
  // cukup filter di sini pakai `topicId`. Topic yang SEDANG dibuka: REFETCH
  // penuh (bukan append kayak CommentSheet — thread DM jauh lebih pendek dari
  // comment chapter, jadi tidak perlu endpoint "ambil 1 pesan" terpisah;
  // `silent: true` biar tidak ada kedip loading spinner) + langsung mark-read
  // (sedang dibuka). Topic LAIN — badge `unreadCount`-nya harus tetap update
  // walau percakapannya tidak sedang dibuka/tidak ada yang dipilih sama
  // sekali (makanya effect ini TIDAK digerbang `if (!selectedTopicId)` lagi):
  // increment lokal kalau sudah ada di daftar (instan, tanpa round-trip),
  // atau refetch `GET /inbox` kalau ini percakapan baru yang belum pernah
  // muncul di state (mis. reader baru pertama kali klik "Kirim Pesan").
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

  useEffect(() => {
    if (selectedTopicId) void loadMessages(selectedTopicId);
  }, [selectedTopicId, loadMessages]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = body.trim();
    if (!content || sending || !selectedTopicId) return;

    setSending(true);
    try {
      const created = await apiClient<ChatMessageDto>(`/inbox/${encodeURIComponent(selectedTopicId)}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body: content }),
      });
      setMessages((current) => [...(current ?? []), created]);
      setBody('');
    } catch (error) {
      console.error('[InboxPage] gagal mengirim pesan:', error);
    } finally {
      setSending(false);
    }
  }

  const selectedConversation = conversations?.find((c) => c.topicId === selectedTopicId) ?? null;

  if (authLoading || !isLoggedIn) {
    return <div className="mx-auto max-w-5xl px-4 py-8 text-sm text-[var(--reader-muted)] sm:px-6">Memuat…</div>;
  }

  return (
    <div
      className="mx-auto flex h-[calc(100dvh-8rem)] max-w-5xl flex-col overflow-hidden px-0 py-0 sm:px-6 sm:py-6"
      style={chromeHeight !== null ? { height: `calc(100dvh - ${chromeHeight}px)` } : undefined}
    >
      <h1
        className="hidden px-4 pt-4 text-2xl font-semibold text-[var(--reader-foreground)] sm:mb-4 sm:block sm:px-0 sm:pt-0"
        style={{ fontFamily: 'var(--font-source-serif)' }}
      >
        Kotak Masuk
      </h1>

      <div className="flex min-h-0 flex-1 overflow-hidden sm:rounded-lg sm:border sm:border-[var(--reader-border)] sm:bg-[var(--reader-surface)]">
        {/* Panel kiri — daftar percakapan */}
        <div
          className={cn(
            'w-full shrink-0 overflow-y-auto border-[var(--reader-border)] sm:block sm:w-80 sm:border-r',
            selectedTopicId ? 'hidden' : 'block',
          )}
        >
          {conversations === null ? (
            <p className="p-4 text-sm text-[var(--reader-muted)]">Memuat…</p>
          ) : conversations.length === 0 ? (
            <p className="p-4 text-sm text-[var(--reader-muted)]">
              Belum ada percakapan. Mulai dari komentar seseorang atau halaman penulis.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--reader-border)]">
              {conversations.map((conversation) => (
                <li key={conversation.topicId}>
                  <button
                    type="button"
                    onClick={() => selectConversation(conversation.topicId)}
                    className={cn(
                      'flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[var(--reader-bg)]',
                      selectedTopicId === conversation.topicId && 'bg-[var(--reader-bg)]',
                    )}
                  >
                    <Avatar className="h-10 w-10 shrink-0">
                      {conversation.contactAvatarUrl && (
                        <AvatarImage src={conversation.contactAvatarUrl} alt={conversation.contactDisplayName} />
                      )}
                      <AvatarFallback
                        className="bg-[var(--reader-bg)] text-sm font-semibold text-[var(--reader-muted)]"
                        style={{ fontFamily: 'var(--font-source-serif)' }}
                      >
                        {conversation.contactDisplayName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--reader-foreground)]">
                        {conversation.contactDisplayName}
                      </p>
                      {conversation.contextType === 'library' && (
                        <p className="text-xs text-[var(--reader-muted)]">Library</p>
                      )}
                    </div>
                    {conversation.unreadCount > 0 && (
                      <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[var(--reader-terracotta)] px-1.5 text-[11px] font-semibold text-[var(--reader-terracotta-foreground)]">
                        {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Panel kanan — jendela pesan */}
        <div className={cn('flex min-h-0 min-w-0 flex-1 flex-col', selectedTopicId ? 'flex' : 'hidden sm:flex')}>
          {!selectedConversation ? (
            <div className="flex flex-1 items-center justify-center px-4 text-center text-sm text-[var(--reader-muted)]">
              Pilih percakapan di sebelah kiri.
            </div>
          ) : (
            <>
              <div className="flex shrink-0 items-center gap-2 border-b border-[var(--reader-border)] px-4 py-3">
                <button
                  type="button"
                  onClick={() => setSelectedTopicId(null)}
                  aria-label="Kembali ke daftar percakapan"
                  className="rounded-full p-1 text-[var(--reader-muted)] hover:bg-[var(--reader-bg)] sm:hidden"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                {selectedConversation.contextType === 'library' && selectedConversation.librarySlug ? (
                  <Link
                    href={`/library/${selectedConversation.librarySlug}`}
                    className="text-sm font-semibold text-[var(--reader-foreground)] hover:text-[var(--reader-terracotta)]"
                  >
                    {selectedConversation.contactDisplayName}
                  </Link>
                ) : (
                  <span className="text-sm font-semibold text-[var(--reader-foreground)]">
                    {selectedConversation.contactDisplayName}
                  </span>
                )}
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {loadingMessages ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-[var(--reader-muted)]" />
                  </div>
                ) : messages && messages.length === 0 ? (
                  <p className="py-8 text-center text-sm text-[var(--reader-muted)]">Belum ada pesan. Mulai percakapan!</p>
                ) : (
                  messages?.map((message) => {
                    const isMine = message.senderUserId === user?.userId;
                    return (
                      <div key={message.id} className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
                        <div
                          className={cn(
                            'max-w-[75%] rounded-2xl px-3 py-2 text-sm',
                            isMine
                              ? 'bg-[var(--reader-terracotta)] text-[var(--reader-terracotta-foreground)]'
                              : 'bg-[var(--reader-bg)] text-[var(--reader-foreground)]',
                          )}
                        >
                          {message.body}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <form onSubmit={sendMessage} className="flex shrink-0 items-center gap-2 border-t border-[var(--reader-border)] p-4">
                <input
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  disabled={sending}
                  placeholder="Tulis pesan..."
                  className="min-w-0 flex-1 rounded-full border border-[var(--reader-border)] bg-transparent px-4 py-2 text-sm text-[var(--reader-foreground)] outline-none focus:border-[var(--reader-terracotta)] disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={sending || !body.trim()}
                  aria-label="Kirim pesan"
                  className="rounded-full bg-[var(--reader-terracotta)] p-2 text-[var(--reader-terracotta-foreground)] disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function InboxPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-5xl px-4 py-8 text-sm text-[var(--reader-muted)] sm:px-6">Memuat…</div>}>
      <InboxPageInner />
    </Suspense>
  );
}
