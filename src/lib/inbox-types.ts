/**
 * Kontrak Inbox/Direct Message (susulan 16 Sep 2026) — endpoint authenticated
 * `bookpedia-api` (`/messages/direct/*`, `/inbox/*`, `/library/inbox`), lewat
 * `apiClient`. Lihat plan/bookpedia/execution-plan.md Fase 3.3.
 */

export type ChatConversationContextType = 'peer' | 'library';

export interface ConversationSummaryDto {
  topicId: string;
  contextType: ChatConversationContextType;
  /** null kalau contextType=library (lawan bicaranya Library, bukan 1 user). */
  contactUserId: string | null;
  contactDisplayName: string;
  /** Avatar Library (fresh) kalau contextType=library; null buat peer (belum ada sumber avatar user lain). */
  contactAvatarUrl: string | null;
  librarySlug: string | null;
  /** Fase 3.5 (Status Baca) — jumlah pesan belum dibaca (bukan milik user login sendiri). */
  unreadCount: number;
  createdAt: string;
}

export interface LibraryConversationSummaryDto {
  topicId: string;
  readerUserId: string;
  readerDisplayName: string;
  unreadCount: number;
  createdAt: string;
}

export interface ChatMessageDto {
  id: string;
  topicId: string;
  senderUserId: string;
  senderDisplayName: string | null;
  senderAvatarUrl: string | null;
  body: string;
  parentMessageId: string | null;
  threadRootMessageId: string;
  replyCount: number;
  createdAt: string;
  deletedAt: string | null;
}

export interface ChatMessageListResponse {
  items: ChatMessageDto[];
  total: number;
}
