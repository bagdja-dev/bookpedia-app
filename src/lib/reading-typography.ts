import type { CSSProperties } from 'react';

import { readingFontStack } from '@/lib/reading-fonts';
import type { ReadingTypography } from '@/lib/public-types';

/** Sama dengan tampilan reader sebelum tipografi bisa diatur per Platform. */
export const DEFAULT_READING_TYPOGRAPHY: ReadingTypography = {
  fontFamily: 'source-serif-4',
  fontSize: 17,
  lineHeight: 1.9,
  paragraphSpacing: 1.25,
  firstLineIndent: 0,
};

/**
 * CSS variable tipografi bacaan — dipasang di layout reader & Studio, dipakai class
 * `.reading-text` (globals.css) pada isi Chapter, sinopsis, preview share, dan editor Studio.
 */
export function readingTypographyStyle(typography: ReadingTypography | null | undefined): CSSProperties {
  const value = { ...DEFAULT_READING_TYPOGRAPHY, ...(typography ?? {}) };
  return {
    '--reading-font': readingFontStack(value.fontFamily),
    '--reading-font-size': `${value.fontSize}px`,
    '--reading-line-height': String(value.lineHeight),
    '--reading-paragraph-spacing': `${value.paragraphSpacing}em`,
    '--reading-first-line-indent': `${value.firstLineIndent}em`,
  } as CSSProperties;
}
