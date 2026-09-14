'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, X } from 'lucide-react';

interface CommentSheetMockProps {
  open: boolean;
  onClose: () => void;
}

interface MockComment {
  id: string;
  nama: string;
  isi: string;
  replies: MockComment[];
}

const FIRST_NAMES = [
  'Dinda', 'Rangga', 'Sari', 'Budi', 'Wulan', 'Fajar', 'Ayu', 'Reza', 'Nadia', 'Bagas',
  'Putri', 'Yoga', 'Citra', 'Dimas', 'Intan', 'Arief', 'Lestari', 'Bayu', 'Melati', 'Hendra',
];
const LAST_INITIALS = ['A.', 'P.', 'S.', 'K.', 'M.', 'R.', 'W.', 'N.', 'D.', 'T.'];

const TOP_LEVEL_TEMPLATES = [
  'Suka banget sama plot twist di bab ini!',
  'Kapan lanjutannya terbit, kak?',
  'Karakter utamanya makin berkembang, seru banget diikutin.',
  'Aku nangis baca bagian ini, kak penulisnya jahat banget bikin baper.',
  'Alurnya makin seru, gak nyangka bakal begini.',
  'Deskripsi settingnya detail banget, kebayang suasananya.',
  'Ini novel terbaik yang pernah aku baca tahun ini.',
  'Endingnya bikin penasaran sama season selanjutnya.',
  'Dialognya natural banget, gak kaku sama sekali.',
  'Twist di akhir bab beneran gak kepikiran sebelumnya.',
  'Pacing ceritanya pas, gak kecepetan gak juga lambat.',
  'Baru nemu novel ini tapi udah baca sampe tengah malam.',
];
const REPLY_TEMPLATES = [
  'Setuju banget!',
  'Sama, aku juga mikir gitu.',
  'Wah baru sadar, makasih infonya.',
  'Betul, ini yang aku tunggu-tunggu.',
  'Hahaha relate banget sih.',
  'Iya kak, aku juga penasaran lanjutannya.',
  'Wkwk sama, aku sampe re-read bagian ini.',
  'Bener banget, chapter ini emang paling seru.',
  'Nah ini dia yang bikin aku susah move on.',
  'Aku malah baru ngeh pas baca komenmu.',
];

/** PRNG seeded (mulberry32) — data mock stabil antar render, bukan acak ulang tiap buka sheet. */
function mulberry32(seed: number) {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(arr: readonly T[], random: () => number): T {
  return arr[Math.floor(random() * arr.length)];
}

/**
 * Bangun ~1000 comment nestable (top-level + reply berlapis, kedalaman
 * bebas) via "preferential attachment": tiap comment baru nempel ke node
 * yang sudah ada — mayoritas ke top-level supaya kebanyakan thread tetap
 * dangkal & wajar, sebagian ke reply yang sudah ada supaya beberapa thread
 * beneran nge-deep (persis tombol "Balas" YouTube yang bisa dipakai di
 * reply mana pun, bukan cuma di top-level). Depth indentasi dibatasi biar
 * tidak lari dari layar meski tree-nya lebih dalam dari itu.
 */
function generateMockComments(total: number, seed = 1234): MockComment[] {
  const random = mulberry32(seed);
  const roots: MockComment[] = [];
  const pool: Array<{ node: MockComment; depth: number }> = [];

  const rootCount = Math.max(1, Math.round(total * 0.12));
  for (let i = 0; i < rootCount; i++) {
    const node: MockComment = {
      id: `c${i}`,
      nama: `${pick(FIRST_NAMES, random)} ${pick(LAST_INITIALS, random)}`,
      isi: pick(TOP_LEVEL_TEMPLATES, random),
      replies: [],
    };
    roots.push(node);
    pool.push({ node, depth: 0 });
  }

  const MAX_DEPTH = 6;
  let nextId = rootCount;
  while (nextId < total) {
    const attachToRoot = random() < 0.65 || pool.length === 0;
    const parentEntry = attachToRoot ? { node: pick(roots, random), depth: 0 } : pick(pool, random);
    const depth = Math.min(parentEntry.depth + 1, MAX_DEPTH);

    const node: MockComment = {
      id: `c${nextId}`,
      nama: `${pick(FIRST_NAMES, random)} ${pick(LAST_INITIALS, random)}`,
      isi: pick(REPLY_TEMPLATES, random),
      replies: [],
    };
    parentEntry.node.replies.push(node);
    pool.push({ node, depth });
    nextId += 1;
  }

  return roots;
}

/**
 * Balasan disembunyikan default (pola YouTube) — tombol "Lihat N balasan"
 * baru merender subtree-nya saat diklik. Tombol "Balas" (juga pola
 * YouTube) ada di SETIAP comment (top-level maupun nested) — membuka
 * kotak input inline mock (disabled, belum terhubung backend apa pun),
 * TIDAK membuat level nesting baru secara struktural (balasan sungguhan
 * baru jalan setelah bagdja-chat-service siap).
 */
function CommentNode({ comment, depth }: { comment: MockComment; depth: number }) {
  const [expanded, setExpanded] = useState(false);
  const [replying, setReplying] = useState(false);
  const indent = Math.min(depth, 5) * 16;
  const replyCount = comment.replies.length;

  return (
    <div style={{ marginLeft: indent }} className={depth > 0 ? 'border-l border-[var(--reader-border)] pl-3' : ''}>
      <div className="py-1.5">
        <p className="text-sm font-medium text-[var(--reader-foreground)]">{comment.nama}</p>
        <p className="text-sm text-[var(--reader-muted)]">{comment.isi}</p>

        <div className="mt-1 flex items-center gap-3 text-xs font-medium">
          <button
            type="button"
            onClick={() => setReplying((prev) => !prev)}
            className="text-[var(--reader-muted)] hover:text-[var(--reader-terracotta)]"
          >
            Balas
          </button>

          {replyCount > 0 && (
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              className="flex items-center gap-1 text-[var(--reader-terracotta)] hover:underline"
            >
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {expanded ? 'Sembunyikan balasan' : `Lihat ${replyCount} balasan`}
            </button>
          )}
        </div>

        {replying && (
          <input
            type="text"
            disabled
            placeholder={`Balas ke ${comment.nama} — segera hadir`}
            className="mt-2 w-full rounded-full border border-[var(--reader-border)] bg-transparent px-3 py-1.5 text-sm text-[var(--reader-muted)] disabled:cursor-not-allowed disabled:opacity-60"
          />
        )}
      </div>

      {expanded && (
        <div className="mt-2 space-y-2">
          {comment.replies.map((reply) => (
            <CommentNode key={reply.id} comment={reply} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function countAll(comments: MockComment[]): number {
  return comments.reduce((sum, c) => sum + 1 + countAll(c.replies), 0);
}

/**
 * Fase 8 (14 Sep 2026, revisi) — bottom sheet MOCK, tinggi 80% viewport,
 * area komentar scrollable, sample 1.000 komentar nestable (kedalaman
 * bebas, lihat `generateMockComments`) + tombol "Balas" ala YouTube di
 * tiap comment, untuk uji visual/skala UI SEBELUM `bagdja-chat-service`
 * siap. TIDAK terhubung backend apa pun — data digenerate sekali di
 * client (`useMemo`, seeded supaya stabil), input (utama maupun "Balas")
 * tetap dinonaktifkan. Real implementasi menunggu `bagdja-chat-service`
 * (Topic type=comment per Chapter) — lihat plan/chat-service/overview.md
 * dan plan/bookpedia/overview.md §14.
 */
export function CommentSheetMock({ open, onClose }: CommentSheetMockProps) {
  const comments = useMemo(() => generateMockComments(1000), []);
  const total = useMemo(() => countAll(comments), [comments]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />

      <div className="relative flex h-[80vh] w-full max-w-[680px] flex-col overflow-hidden rounded-t-2xl border-x border-t border-[var(--reader-border)] bg-[var(--reader-surface)] shadow-xl">
        <div className="flex shrink-0 justify-center pb-1 pt-2.5" aria-hidden="true">
          <div className="h-1 w-10 rounded-full bg-[var(--reader-border)]" />
        </div>

        <div className="flex shrink-0 items-center justify-between border-b border-[var(--reader-border)] px-4 pb-3">
          <h2 className="text-sm font-semibold text-[var(--reader-foreground)]">
            Komentar ({total.toLocaleString('id-ID')})
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup komentar"
            className="rounded-full p-1.5 text-[var(--reader-muted)] hover:bg-[var(--reader-border)]/40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {comments.map((comment) => (
            <CommentNode key={comment.id} comment={comment} depth={0} />
          ))}
        </div>

        <div className="shrink-0 border-t border-[var(--reader-border)] p-4">
          <input
            type="text"
            disabled
            placeholder="Segera hadir"
            className="w-full rounded-full border border-[var(--reader-border)] bg-transparent px-4 py-2 text-sm text-[var(--reader-muted)] disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>
      </div>
    </div>
  );
}
