'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';

import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import type { HighlightDto } from '@/lib/reader-types';

interface HighlightableChapterProps {
  chapterId: string;
  konten: string;
  className?: string;
  style?: CSSProperties;
}

interface PendingSelection {
  top: number;
  left: number;
  startOffset: number;
  endOffset: number;
}

/**
 * Membungkus render konten Chapter (HTML dari TipTap) dan menambahkan
 * highlight interaktif — lihat plan/bookpedia/execution-plan.md Fase 3 §3 untuk
 * algoritma lengkap yang diikuti di sini:
 *
 * - `startOffset`/`endOffset` = index karakter di PLAIN TEXT hasil
 *   `container.textContent` (bukan posisi di raw HTML), interval half-open.
 * - Selection -> offset pakai teknik `Range.toString().length` (bukan
 *   TreeWalker manual) karena otomatis flatten ke plain text.
 * - Overlay highlight tersimpan pakai `TreeWalker` + `Text.splitText()` +
 *   bungkus `<mark>`, RESET ke HTML original sebelum tiap re-apply supaya
 *   idempotent-safe (hindari `<mark>` menumpuk).
 *
 * Konten awal tetap dirender lewat `dangerouslySetInnerHTML` (bukan
 * dikosongkan lalu diisi via JS) supaya HTML hasil SSR dari page.tsx (server
 * component) utuh sampai ke client sebelum hydration — highlight overlay
 * baru menyusul lewat `useEffect` setelah mount.
 */
export function HighlightableChapter({ chapterId, konten, className, style }: HighlightableChapterProps) {
  const { isLoggedIn } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const [highlights, setHighlights] = useState<HighlightDto[]>([]);
  const [pending, setPending] = useState<PendingSelection | null>(null);
  const [saving, setSaving] = useState(false);

  const loadHighlights = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      const data = await apiClient<HighlightDto[]>(`/chapters/${chapterId}/highlights`);
      setHighlights(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('[HighlightableChapter] gagal memuat highlight:', err);
    }
  }, [chapterId, isLoggedIn]);

  useEffect(() => {
    loadHighlights();
  }, [loadHighlights]);

  // Render ulang overlay highlight setiap kali daftar highlight berubah.
  // Reset dulu ke `konten` original (prop, BUKAN baca ulang dari DOM yang
  // sudah termodifikasi) sebelum apply ulang semua highlight dari nol.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = konten;
    if (highlights.length === 0) return;

    const sorted = [...highlights].sort((a, b) => a.startOffset - b.startOffset);
    for (const hl of sorted) {
      applyHighlightMark(container, hl.startOffset, hl.endOffset);
    }
  }, [konten, highlights]);

  // Selection -> tampilkan popup mini "Highlight". Hanya untuk user login
  // (endpoint pembuatan highlight butuh auth).
  useEffect(() => {
    if (!isLoggedIn) return;
    const container = containerRef.current;
    if (!container) return;

    // Ambil ulang & narrow `container` di dalam handler itu sendiri (bukan
    // pakai `!` non-null assertion ke closure di atas) supaya TS bisa
    // menyempitkan tipenya di scope yang sama dengan pemakaiannya.
    function handleSelectionEnd() {
      const el = containerRef.current;
      if (!el) return;

      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        setPending(null);
        return;
      }

      const selectionRange = selection.getRangeAt(0);
      if (!el.contains(selectionRange.commonAncestorContainer)) {
        setPending(null);
        return;
      }

      const preRangeStart = document.createRange();
      preRangeStart.selectNodeContents(el);
      preRangeStart.setEnd(selectionRange.startContainer, selectionRange.startOffset);
      const startOffset = preRangeStart.toString().length;

      const preRangeEnd = document.createRange();
      preRangeEnd.selectNodeContents(el);
      preRangeEnd.setEnd(selectionRange.endContainer, selectionRange.endOffset);
      const endOffset = preRangeEnd.toString().length;

      if (endOffset <= startOffset) {
        setPending(null);
        return;
      }

      const rect = selectionRange.getBoundingClientRect();
      setPending({
        top: rect.top,
        left: rect.left + rect.width / 2,
        startOffset,
        endOffset,
      });
    }

    const events = ['mouseup', 'touchend', 'pointerup'] as const;
    for (const eventName of events) {
      container.addEventListener(eventName, handleSelectionEnd);
    }
    document.addEventListener('selectionchange', handleSelectionEnd);

    return () => {
      for (const eventName of events) {
        container.removeEventListener(eventName, handleSelectionEnd);
      }
      document.removeEventListener('selectionchange', handleSelectionEnd);
    };
  }, [isLoggedIn]);

  async function handleSaveHighlight() {
    if (!pending) return;
    setSaving(true);
    try {
      await apiClient(`/chapters/${chapterId}/highlights`, {
        method: 'POST',
        body: JSON.stringify({ startOffset: pending.startOffset, endOffset: pending.endOffset }),
      });
      window.getSelection()?.removeAllRanges();
      setPending(null);
      await loadHighlights();
    } catch (err) {
      console.error('[HighlightableChapter] gagal simpan highlight:', err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div
        ref={containerRef}
        className={className}
        style={style}
        // Konten awal dari SSR — di-reset & di-overlay ulang lewat effect di
        // atas, string ini tidak berubah antar render (React tidak akan
        // menimpa manipulasi DOM manual kita selama nilainya sama).
        dangerouslySetInnerHTML={{ __html: konten }}
      />

      {pending && (
        <div
          className="fixed z-20 -translate-x-1/2 -translate-y-full rounded-md bg-[var(--reader-foreground)] px-3 py-1.5 text-xs font-medium text-[var(--reader-surface)] shadow-lg"
          style={{ top: pending.top - 8, left: pending.left }}
        >
          <button type="button" onClick={handleSaveHighlight} disabled={saving} className="disabled:opacity-60">
            {saving ? 'Menyimpan…' : 'Highlight'}
          </button>
        </div>
      )}
    </>
  );
}

/**
 * Bungkus rentang karakter `[start, end)` di plain-text `container` dengan
 * `<mark>`. Jalan ulang TreeWalker per pemanggilan (bukan sekali di luar)
 * supaya offset tetap benar setelah DOM berubah akibat highlight
 * sebelumnya — `splitText`/wrap tidak mengubah total `textContent`, jadi
 * running offset tetap konsisten antar pemanggilan.
 */
function applyHighlightMark(container: HTMLElement, start: number, end: number) {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  let node: Node | null;
  while ((node = walker.nextNode())) {
    textNodes.push(node as Text);
  }

  let runningOffset = 0;
  for (const textNode of textNodes) {
    const length = textNode.textContent?.length ?? 0;
    const nodeStart = runningOffset;
    const nodeEnd = runningOffset + length;
    runningOffset = nodeEnd;

    if (nodeStart < end && nodeEnd > start) {
      const localStart = Math.max(0, start - nodeStart);
      const localEnd = Math.min(length, end - nodeStart);
      if (localStart >= localEnd) continue;

      let target = textNode;
      if (localEnd < length) {
        target.splitText(localEnd);
      }
      if (localStart > 0) {
        target = target.splitText(localStart);
      }

      const mark = document.createElement('mark');
      // Styling inline (bukan class Tailwind) — mark dibuat lewat DOM API
      // langsung, class Tailwind yang belum pernah dipakai di markup lain
      // bisa tidak ter-generate saat build.
      mark.style.background = '#f6d383';
      mark.style.color = 'inherit';
      mark.style.borderRadius = '2px';
      mark.style.padding = '0 1px';
      target.parentNode?.insertBefore(mark, target);
      mark.appendChild(target);
    }
  }
}
