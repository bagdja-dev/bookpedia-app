'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp, Loader2, Send, X } from 'lucide-react';

import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRealtime } from './realtime-provider';

interface CommentSheetProps {
  open: boolean;
  onClose: () => void;
  chapterId: string;
  platformSlug: string;
  bookSlug: string;
  orderIndex: number;
}

interface CommentMessage {
  id: string;
  senderUserId: string;
  senderDisplayName: string | null;
  /** Susulan Inbox/DM, 16 Sep 2026 — snapshot avatar pengirim, bisa null (user non-Google atau baris lama). */
  senderAvatarUrl: string | null;
  body: string;
  parentMessageId: string | null;
  threadRootMessageId: string;
  replyCount: number;
  createdAt: string;
}

/** `/u/[userId]` butuh nama/avatar dibawa dari konteks klik (bookpedia-api sengaja tanpa tabel users lokal, lihat bookpedia/overview.md §15.3). */
function profileHref(comment: CommentMessage): string {
  const params = new URLSearchParams();
  if (comment.senderDisplayName) params.set('name', comment.senderDisplayName);
  if (comment.senderAvatarUrl) params.set('avatar', comment.senderAvatarUrl);
  const query = params.toString();
  return `/u/${encodeURIComponent(comment.senderUserId)}${query ? `?${query}` : ''}`;
}

interface CommentListResponse {
  items: CommentMessage[];
  total: number;
}

const API_BASE = process.env.NEXT_PUBLIC_BOOKPEDIA_API_URL ?? 'http://localhost:5020';

/**
 * Prioritas: "Anda" (comment sendiri) > snapshot nama pengirim (username/
 * email SAAT comment dibuat, lihat `senderDisplayName` di
 * plan/architecture/overview.md) > fallback `@` + 8 karakter awal userId
 * untuk baris lama yang dibuat sebelum kolom snapshot ini ada.
 */
function commentLabel(comment: CommentMessage, userId?: string): string {
  if (comment.senderUserId === userId) return 'Anda';
  if (comment.senderDisplayName) return comment.senderDisplayName;
  return `@${comment.senderUserId.slice(0, 8)}`;
}

export function CommentSheet({ open, onClose, chapterId, platformSlug, bookSlug, orderIndex }: CommentSheetProps) {
  const { user, isLoggedIn } = useAuth();
  const { subscribe } = useRealtime();
  const [comments, setComments] = useState<CommentMessage[]>([]);
  const [replies, setReplies] = useState<Record<string, CommentMessage[]>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [loadingReplies, setLoadingReplies] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [body, setBody] = useState('');
  // Balas: HANYA satu kotak input inline yang boleh terbuka sekaligus (satu
  // state, bukan map per-comment) — terpisah dari `body`/`submitting` milik
  // form komentar baru di bawah, supaya keduanya tidak saling ganggu.
  const [replyingTo, setReplyingTo] = useState<CommentMessage | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);
  // Dedupe lintas sumber (submit sendiri, submitReply, event socket) — satu
  // pesan yang sama bisa "datang" dari lebih dari satu jalur (mis. hasil
  // POST milik sendiri ditambahkan optimistic, LALU event socket untuk
  // pesan yang sama juga masuk) — tanpa ini list akan tampil dobel.
  const seenMessageIds = useRef<Set<string>>(new Set());

  function addTopLevelComment(message: CommentMessage) {
    if (seenMessageIds.current.has(message.id)) return;
    seenMessageIds.current.add(message.id);
    setComments((current) => [message, ...current]);
  }

  function addReply(message: CommentMessage) {
    if (seenMessageIds.current.has(message.id)) return;
    seenMessageIds.current.add(message.id);
    setReplies((current) => ({
      ...current,
      [message.threadRootMessageId]: [...(current[message.threadRootMessageId] ?? []), message],
    }));
    setComments((current) =>
      current.map((comment) =>
        comment.id === message.threadRootMessageId ? { ...comment, replyCount: comment.replyCount + 1 } : comment,
      ),
    );
  }

  async function loadComments() {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE}/public/platforms/${encodeURIComponent(platformSlug)}/books/${encodeURIComponent(bookSlug)}/chapters/${orderIndex}/comments`,
        { cache: 'no-store' },
      );
      if (!response.ok) throw new Error(`Comments request failed: ${response.status}`);
      const data = (await response.json()) as CommentListResponse;
      data.items.forEach((item) => seenMessageIds.current.add(item.id));
      setComments(data.items);
    } catch (error) {
      console.error('[CommentSheet] gagal memuat komentar:', error);
      setComments([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    void loadComments();
  }, [open, platformSlug, bookSlug, orderIndex]);

  useEffect(() => {
    if (!open) return;
    // Append-only: payload event sengaja minim (topicId/messageId/dst.,
    // TANPA isi pesan) — ambil detail SATU pesan itu via REST, lalu
    // sisipkan ke state yang sudah ada. TIDAK refetch seluruh daftar
    // (`loadComments()`) supaya list tidak "berkedip" (re-render total,
    // scroll/posisi expand ikut ke-reset) tiap ada aktivitas baru.
    return subscribe('bagdja.chat.message.created', (data) => {
      const messageId = data.messageId as string | undefined;
      const parentMessageId = data.parentMessageId as string | null | undefined;
      if (!messageId || seenMessageIds.current.has(messageId)) return;

      void (async () => {
        try {
          const response = await fetch(
            `${API_BASE}/public/platforms/${encodeURIComponent(platformSlug)}/books/${encodeURIComponent(bookSlug)}/chapters/${orderIndex}/comments/${messageId}`,
            { cache: 'no-store' },
          );
          if (!response.ok) throw new Error(`Get message failed: ${response.status}`);
          const message = (await response.json()) as CommentMessage;
          if (parentMessageId) {
            addReply(message);
          } else {
            addTopLevelComment(message);
          }
        } catch (error) {
          console.error('[CommentSheet] gagal ambil pesan baru dari event realtime:', error);
        }
      })();
    });
  }, [open, subscribe, platformSlug, bookSlug, orderIndex]);

  async function toggleReplies(comment: CommentMessage) {
    if (expanded[comment.id]) {
      setExpanded((current) => ({ ...current, [comment.id]: false }));
      return;
    }

    if (!replies[comment.id]) {
      setLoadingReplies(comment.id);
      try {
        const response = await fetch(
          `${API_BASE}/public/platforms/${encodeURIComponent(platformSlug)}/books/${encodeURIComponent(bookSlug)}/chapters/${orderIndex}/comments/${comment.id}/replies`,
          { cache: 'no-store' },
        );
        if (!response.ok) throw new Error(`Replies request failed: ${response.status}`);
        const data = (await response.json()) as CommentMessage[];
        data.forEach((item) => seenMessageIds.current.add(item.id));
        setReplies((current) => ({ ...current, [comment.id]: data }));
      } catch (error) {
        console.error('[CommentSheet] gagal memuat replies:', error);
        return;
      } finally {
        setLoadingReplies(null);
      }
    }
    setExpanded((current) => ({ ...current, [comment.id]: true }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = body.trim();
    if (!content || submitting) return;
    if (!isLoggedIn) {
      window.location.href = `/auth/login?next=${encodeURIComponent(window.location.pathname)}`;
      return;
    }

    setSubmitting(true);
    try {
      const created = await apiClient<CommentMessage>(`/chapters/${encodeURIComponent(chapterId)}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body: content, parentMessageId: null }),
      });
      addTopLevelComment(created);
      setBody('');
    } catch (error) {
      console.error('[CommentSheet] gagal mengirim komentar:', error);
    } finally {
      setSubmitting(false);
    }
  }

  function startReply(comment: CommentMessage) {
    setReplyingTo(comment);
    setReplyBody('');
  }

  function cancelReply() {
    setReplyingTo(null);
    setReplyBody('');
  }

  async function submitReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = replyBody.trim();
    if (!content || replySubmitting || !replyingTo) return;
    if (!isLoggedIn) {
      window.location.href = `/auth/login?next=${encodeURIComponent(window.location.pathname)}`;
      return;
    }

    setReplySubmitting(true);
    try {
      const created = await apiClient<CommentMessage>(`/chapters/${encodeURIComponent(chapterId)}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body: content, parentMessageId: replyingTo.id }),
      });
      // Bucket balasan dikelompokkan per TOP-LEVEL (threadRootMessageId) —
      // berlaku sama baik membalas comment top-level maupun membalas reply
      // lain (nested), keduanya tetap masuk daftar flat top-level yang sama.
      addReply(created);
      setExpanded((current) => ({ ...current, [created.threadRootMessageId]: true }));
      cancelReply();
    } catch (error) {
      console.error('[CommentSheet] gagal mengirim balasan:', error);
    } finally {
      setReplySubmitting(false);
    }
  }

  async function deleteComment(comment: CommentMessage) {
    if (!user || !window.confirm('Hapus komentar ini?')) return;
    try {
      const deleted = await apiClient<CommentMessage>(`/chapters/${encodeURIComponent(chapterId)}/comments/${encodeURIComponent(comment.id)}`, { method: 'DELETE' });
      const replace = (items: CommentMessage[]) => items.map((item) => item.id === deleted.id ? deleted : item);
      setComments(replace);
      setReplies((current) => Object.fromEntries(Object.entries(current).map(([id, items]) => [id, replace(items)])));
    } catch (error) {
      console.error('[CommentSheet] gagal menghapus komentar:', error);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className="relative flex h-[80vh] w-full max-w-[680px] flex-col overflow-hidden rounded-t-2xl border-x border-t border-slate-200 bg-white shadow-xl">
        <div className="flex shrink-0 justify-center pb-1 pt-2.5" aria-hidden="true"><div className="h-1 w-10 rounded-full bg-[var(--reader-border)]" /></div>
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--reader-border)] px-4 pb-3">
          <h2 className="text-sm font-semibold text-[var(--reader-foreground)]">Komentar ({comments.length})</h2>
          <button type="button" onClick={onClose} aria-label="Tutup komentar" className="rounded-full p-1.5 text-[var(--reader-muted)] hover:bg-[var(--reader-border)]/40"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {loading ? <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-[var(--reader-muted)]" /></div> : comments.length === 0 ? <p className="py-8 text-center text-sm text-[var(--reader-muted)]">Belum ada komentar.</p> : comments.map((comment) => (
            <CommentNode
              key={comment.id}
              comment={comment}
              userId={user?.userId}
              isLoggedIn={isLoggedIn}
              replies={replies[comment.id] ?? []}
              expanded={!!expanded[comment.id]}
              loadingReplies={loadingReplies === comment.id}
              replyingTo={replyingTo?.id ?? null}
              replyBody={replyBody}
              replySubmitting={replySubmitting}
              onToggleReplies={() => void toggleReplies(comment)}
              onStartReply={startReply}
              onCancelReply={cancelReply}
              onChangeReplyBody={setReplyBody}
              onSubmitReply={(event) => void submitReply(event)}
              onDelete={(message) => void deleteComment(message)}
            />
          ))}
        </div>
        {isLoggedIn ? (
          <form onSubmit={submit} className="flex shrink-0 items-center gap-2 border-t border-[var(--reader-border)] p-4">
            <input value={body} onChange={(event) => setBody(event.target.value)} disabled={submitting} placeholder="Tulis komentar..." className="min-w-0 flex-1 rounded-full border border-[var(--reader-border)] bg-transparent px-4 py-2 text-sm text-[var(--reader-foreground)] outline-none focus:border-[var(--reader-terracotta)] disabled:opacity-60" />
            <button type="submit" disabled={submitting || !body.trim()} aria-label="Kirim komentar" className="rounded-full bg-[var(--reader-terracotta)] p-2 text-[var(--reader-terracotta-foreground)] disabled:opacity-50"><Send className="h-4 w-4" /></button>
          </form>
        ) : (
          <div className="flex shrink-0 justify-center border-t border-[var(--reader-border)] p-4">
            <button
              type="button"
              onClick={() => { window.location.href = `/auth/login?next=${encodeURIComponent(window.location.pathname)}`; }}
              className="text-sm font-medium text-[var(--reader-terracotta)] hover:underline"
            >
              Login untuk berkomentar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

interface CommentNodeProps {
  comment: CommentMessage;
  userId?: string;
  isLoggedIn: boolean;
  replies: CommentMessage[];
  expanded: boolean;
  loadingReplies: boolean;
  /** id comment/reply yang SEDANG jadi target Balas (satu-satunya di seluruh sheet) — bukan boolean per-node, supaya cuma satu kotak inline yang bisa terbuka. */
  replyingTo: string | null;
  replyBody: string;
  replySubmitting: boolean;
  onToggleReplies: () => void;
  onStartReply: (comment: CommentMessage) => void;
  onCancelReply: () => void;
  onChangeReplyBody: (value: string) => void;
  onSubmitReply: (event: FormEvent<HTMLFormElement>) => void;
  onDelete: (message: CommentMessage) => void;
}

/**
 * Kotak input Balas muncul INLINE tepat di bawah comment/reply yang jadi
 * target (bukan di form bawah sheet) — dan karena `replyingTo` cuma SATU
 * state di level `CommentSheet` (diteruskan apa adanya ke setiap level
 * nesting), tidak mungkin ada dua kotak Balas terbuka bersamaan: begitu
 * comment lain diklik Balas, kotak yang lama otomatis tertutup.
 */
function CommentNode({
  comment,
  userId,
  isLoggedIn,
  replies,
  expanded,
  loadingReplies,
  replyingTo,
  replyBody,
  replySubmitting,
  onToggleReplies,
  onStartReply,
  onCancelReply,
  onChangeReplyBody,
  onSubmitReply,
  onDelete,
}: CommentNodeProps) {
  const isReplyTarget = replyingTo === comment.id;

  return (
    <div className="py-1.5">
      <Link href={profileHref(comment)} className="flex w-fit min-w-0 items-center gap-1.5">
        <Avatar className="h-5 w-5 shrink-0">
          {comment.senderAvatarUrl && <AvatarImage src={comment.senderAvatarUrl} alt="" />}
          <AvatarFallback className="bg-[var(--reader-bg)] text-[10px] font-semibold text-[var(--reader-muted)]">
            {(comment.senderDisplayName || comment.senderUserId).charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="truncate text-sm font-medium text-[var(--reader-foreground)]">{commentLabel(comment, userId)}</span>
      </Link>
      <p className="text-sm text-[var(--reader-muted)]">{comment.body}</p>
      <div className="mt-1 flex items-center gap-3 text-xs font-medium">
        {isLoggedIn && (
          <button
            type="button"
            onClick={() => (isReplyTarget ? onCancelReply() : onStartReply(comment))}
            className={isReplyTarget ? 'text-[var(--reader-terracotta)]' : 'text-[var(--reader-muted)] hover:text-[var(--reader-terracotta)]'}
          >
            Balas
          </button>
        )}
        {comment.senderUserId === userId && comment.body !== '[Pesan dihapus]' && (
          <button type="button" onClick={() => onDelete(comment)} className="text-[var(--reader-muted)] hover:text-red-600">
            Hapus
          </button>
        )}
        {comment.replyCount > 0 && (
          <button type="button" onClick={onToggleReplies} className="flex items-center gap-1 text-[var(--reader-terracotta)] hover:underline">
            {loadingReplies ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {expanded ? 'Sembunyikan balasan' : `Lihat ${comment.replyCount} balasan`}
          </button>
        )}
      </div>

      {isReplyTarget && (
        <form onSubmit={onSubmitReply} className="mt-2 flex items-center gap-2">
          <input
            autoFocus
            value={replyBody}
            onChange={(event) => onChangeReplyBody(event.target.value)}
            disabled={replySubmitting}
            placeholder={`Balas ke ${commentLabel(comment, userId)}...`}
            className="min-w-0 flex-1 rounded-full border border-[var(--reader-border)] bg-transparent px-3 py-1.5 text-sm text-[var(--reader-foreground)] outline-none focus:border-[var(--reader-terracotta)] disabled:opacity-60"
          />
          <button type="button" onClick={onCancelReply} aria-label="Batalkan balasan" className="text-xs text-[var(--reader-muted)] hover:text-[var(--reader-foreground)]">
            Batal
          </button>
          <button
            type="submit"
            disabled={replySubmitting || !replyBody.trim()}
            aria-label="Kirim balasan"
            className="rounded-full bg-[var(--reader-terracotta)] p-1.5 text-[var(--reader-terracotta-foreground)] disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </form>
      )}

      {expanded && (
        <div className="mt-2 space-y-2 border-l border-[var(--reader-border)] pl-3">
          {replies.map((reply) => (
            <CommentNode
              key={reply.id}
              comment={reply}
              userId={userId}
              isLoggedIn={isLoggedIn}
              replies={[]}
              expanded={false}
              loadingReplies={false}
              replyingTo={replyingTo}
              replyBody={replyBody}
              replySubmitting={replySubmitting}
              onToggleReplies={() => undefined}
              onStartReply={onStartReply}
              onCancelReply={onCancelReply}
              onChangeReplyBody={onChangeReplyBody}
              onSubmitReply={onSubmitReply}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}