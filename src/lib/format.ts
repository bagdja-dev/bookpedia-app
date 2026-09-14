/**
 * Format angka ringkas ala media sosial — dipakai statistik baca (Fase 7)
 * di card katalog: 12.000 -> "12K", 12.500 -> "12.5K", 12.000.000 -> "12M".
 * Angka < 1000 ditampilkan apa adanya (tidak ada "0.5K").
 */
export function formatCompactCount(n: number): string {
  // Fase 8 (susulan) — jaga-jaga field baru (mis. likeCount) belum ada di
  // response hasil ISR cache lama (revalidate: 60) sesaat setelah deploy —
  // tanpa guard ini, `undefined`/NaN akan lolos ke cabang terakhir dan
  // tampil sebagai "NaNM" di UI.
  if (!Number.isFinite(n)) return '0';
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${trimTrailingZero(n / 1000)}K`;
  return `${trimTrailingZero(n / 1_000_000)}M`;
}

function trimTrailingZero(value: number): string {
  return (Math.round(value * 10) / 10).toString();
}
