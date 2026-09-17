'use client';

import { MessageCircle } from 'lucide-react';

import { CommentSheet } from './comment-sheet';
import { useState } from 'react';

export function ChapterCommentsButton({
  chapterId,
  platformSlug,
  bookSlug,
  orderIndex,
  commentCount,
  iconOnly = false,
}: {
  chapterId: string;
  platformSlug: string;
  bookSlug: string;
  orderIndex: number;
  commentCount: number;
  iconOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen(true);
        }}
        className="flex items-center gap-1 text-xs text-[var(--reader-muted)] hover:text-[var(--reader-terracotta)]"
        aria-label={`Lihat ${commentCount} komentar Chapter`}
        title="Lihat komentar Chapter"
      >
        <MessageCircle className="h-3.5 w-3.5" />
        <span>{commentCount.toLocaleString('id-ID')}</span>
        {!iconOnly && <span>komentar</span>}
      </button>
      <CommentSheet
        chapterId={chapterId}
        platformSlug={platformSlug}
        bookSlug={bookSlug}
        orderIndex={orderIndex}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
