import { Star } from 'lucide-react';

interface StarRatingDisplayProps {
  average: number;
  count: number;
  size?: 'sm' | 'md';
}

/** Tampilan agregat rating read-only (server-safe, TANPA interaksi) — dipakai di card katalog, detail Book, daftar Chapter, dan Studio. */
export function StarRatingDisplay({ average, count, size = 'sm' }: StarRatingDisplayProps) {
  if (count === 0) {
    return <></>
    // return <span className="text-xs text-[var(--reader-muted)]">Belum ada rating</span>;
  }

  const iconSize = size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5';

  return (
    <span className="inline-flex items-center gap-1 text-xs text-[var(--reader-muted)]">
      <Star className={`${iconSize} fill-[var(--reader-mustard)] text-[var(--reader-mustard)]`} />
      <span className="font-medium text-[var(--reader-foreground)]">{average.toFixed(1)}</span>
      <span>({count})</span>
    </span>
  );
}
