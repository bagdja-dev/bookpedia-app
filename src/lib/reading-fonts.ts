import { Inter, Literata, Lora, Merriweather, Noto_Sans, Noto_Serif, Nunito, Source_Serif_4 } from 'next/font/google';

import type { ReadingFontFamily } from '@/lib/public-types';

// Font kurasi teks bacaan (Platform Settings → Tipografi bacaan). Semua dideklarasikan di
// sini supaya bisa dipilih per Platform, tapi `preload: false` — browser hanya mengunduh
// file font yang benar-benar dipakai halaman. Key sama dengan `READING_FONT_FAMILIES` API.
const sourceSerif = Source_Serif_4({ subsets: ['latin'], display: 'swap', preload: false });
const merriweather = Merriweather({ subsets: ['latin'], weight: ['400', '700'], style: ['normal', 'italic'], display: 'swap', preload: false });
const lora = Lora({ subsets: ['latin'], style: ['normal', 'italic'], display: 'swap', preload: false });
const literata = Literata({ subsets: ['latin'], style: ['normal', 'italic'], display: 'swap', preload: false });
const notoSerif = Noto_Serif({ subsets: ['latin'], style: ['normal', 'italic'], display: 'swap', preload: false });
const inter = Inter({ subsets: ['latin'], display: 'swap', preload: false });
const nunito = Nunito({ subsets: ['latin'], style: ['normal', 'italic'], display: 'swap', preload: false });
const notoSans = Noto_Sans({ subsets: ['latin'], style: ['normal', 'italic'], display: 'swap', preload: false });

const READING_FONT_STACKS: Record<ReadingFontFamily, string> = {
  'source-serif-4': sourceSerif.style.fontFamily,
  merriweather: merriweather.style.fontFamily,
  lora: lora.style.fontFamily,
  literata: literata.style.fontFamily,
  'noto-serif': notoSerif.style.fontFamily,
  inter: inter.style.fontFamily,
  nunito: nunito.style.fontFamily,
  'noto-sans': notoSans.style.fontFamily,
};

export function readingFontStack(fontFamily: ReadingFontFamily): string {
  return READING_FONT_STACKS[fontFamily] ?? READING_FONT_STACKS['source-serif-4'];
}
