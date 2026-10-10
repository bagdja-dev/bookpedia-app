import type { PlatformColors } from '@/lib/public-types';

const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

/** Warna spesifik Platform → nama CSS variable. Dipakai `var(--spesifik, var(--umum))`. */
const SPECIFIC_COLOR_VARS: Array<[keyof PlatformColors, string]> = [
  ['headerBg', '--reader-header-bg'],
  ['headerText', '--reader-header-text'],
  ['headerBorder', '--reader-header-border'],
  ['cardBg', '--reader-card-bg'],
  ['cardBorder', '--reader-card-border'],
  ['cardTitle', '--reader-card-title'],
  ['cardText', '--reader-card-text'],
  ['cardChipBg', '--reader-card-chip-bg'],
  ['footerBg', '--reader-footer-bg'],
  ['footerText', '--reader-footer-text'],
  ['buttonBg', '--reader-button-bg'],
  ['buttonText', '--reader-button-text'],
  ['statusOngoing', '--reader-status-ongoing'],
  ['statusCompleted', '--reader-status-completed'],
  ['statusDraft', '--reader-status-draft'],
  ['ratingStar', '--reader-rating-star'],
  ['readingBg', '--reader-reading-bg'],
  ['readingText', '--reader-reading-text'],
];

export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && HEX_COLOR.test(value.trim());
}

/**
 * Deklarasi CSS untuk warna spesifik yang DIISI saja (nilai hex valid) — yang kosong tidak
 * didefinisikan sehingga fallback `var(--spesifik, var(--umum))` jatuh ke palet umum.
 * Divalidasi ulang di sini karena nilainya disisipkan ke `<style>`.
 */
export function specificColorDeclarations(colors: PlatformColors): string {
  return SPECIFIC_COLOR_VARS
    .filter(([key]) => isHexColor(colors[key]))
    .map(([key, cssVar]) => `${cssVar}: ${(colors[key] as string).trim()};`)
    .join('\n          ');
}
