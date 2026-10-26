import type { ReadingFontFamily } from '@/lib/public-types';

// Font kurasi teks bacaan — font family string polos (tanpa next/font/google)
// supaya build Docker tidak tergantung koneksi internet ke Google Fonts API.
// Font di-resolve browser dari sistem atau @font-face global.css jika tersedia.
// Nama font sama dengan yang dihasilkan next/font/google agar referensi CSS
// yang sudah ada tetap valid.
const READING_FONT_STACKS: Record<ReadingFontFamily, string> = {
  'source-serif-4': '"Source Serif 4", serif',
  merriweather: '"Merriweather", serif',
  lora: '"Lora", serif',
  literata: '"Literata", serif',
  'noto-serif': '"Noto Serif", serif',
  georgia: '"Gelasio", serif',
  'pt-serif': '"PT Serif", serif',
  'crimson-pro': '"Crimson Pro", serif',
  'eb-garamond': '"EB Garamond", serif',
  'libre-baskerville': '"Libre Baskerville", serif',
  inter: '"Inter", sans-serif',
  nunito: '"Nunito", sans-serif',
  'noto-sans': '"Noto Sans", sans-serif',
  roboto: '"Roboto", sans-serif',
  'open-sans': '"Open Sans", sans-serif',
  'plus-jakarta-sans': '"Plus Jakarta Sans", sans-serif',
  'atkinson-hyperlegible': '"Atkinson Hyperlegible", sans-serif',
};

export function readingFontStack(fontFamily: ReadingFontFamily): string {
  return READING_FONT_STACKS[fontFamily] ?? READING_FONT_STACKS['source-serif-4'];
}
