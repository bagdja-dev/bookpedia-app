import {
  Atkinson_Hyperlegible,
  Crimson_Pro,
  EB_Garamond,
  Gelasio,
  Inter,
  Libre_Baskerville,
  Literata,
  Lora,
  Merriweather,
  Noto_Sans,
  Noto_Serif,
  Nunito,
  Open_Sans,
  PT_Serif,
  Plus_Jakarta_Sans,
  Roboto,
  Source_Serif_4,
} from 'next/font/google';

import type { ReadingFontFamily } from '@/lib/public-types';

// Font kurasi teks bacaan (Platform Settings → Tipografi bacaan). Semua dideklarasikan di
// sini supaya bisa dipilih per Platform, tapi `preload: false` — browser hanya mengunduh
// file font yang benar-benar dipakai halaman. Key sama dengan `READING_FONT_FAMILIES` API.
// Serif
const sourceSerif = Source_Serif_4({ subsets: ['latin'], display: 'swap', preload: false });
const merriweather = Merriweather({ subsets: ['latin'], display: 'swap', preload: false, style: ['normal', 'italic'], weight: ['400', '700'] });
const lora = Lora({ subsets: ['latin'], display: 'swap', preload: false, style: ['normal', 'italic'] });
const literata = Literata({ subsets: ['latin'], display: 'swap', preload: false, style: ['normal', 'italic'] });
const notoSerif = Noto_Serif({ subsets: ['latin'], display: 'swap', preload: false, style: ['normal', 'italic'] });
/** Ditampilkan sebagai "Georgia" — Gelasio setara metrik Georgia dan tersedia di Android. */
const gelasio = Gelasio({ subsets: ['latin'], display: 'swap', preload: false, style: ['normal', 'italic'] });
const ptSerif = PT_Serif({ subsets: ['latin'], display: 'swap', preload: false, style: ['normal', 'italic'], weight: ['400', '700'] });
const crimsonPro = Crimson_Pro({ subsets: ['latin'], display: 'swap', preload: false, style: ['normal', 'italic'] });
const ebGaramond = EB_Garamond({ subsets: ['latin'], display: 'swap', preload: false, style: ['normal', 'italic'] });
const libreBaskerville = Libre_Baskerville({ subsets: ['latin'], display: 'swap', preload: false, style: ['normal', 'italic'], weight: ['400', '700'] });
// Sans
const inter = Inter({ subsets: ['latin'], display: 'swap', preload: false });
const nunito = Nunito({ subsets: ['latin'], display: 'swap', preload: false, style: ['normal', 'italic'] });
const notoSans = Noto_Sans({ subsets: ['latin'], display: 'swap', preload: false, style: ['normal', 'italic'] });
const roboto = Roboto({ subsets: ['latin'], display: 'swap', preload: false, style: ['normal', 'italic'] });
const openSans = Open_Sans({ subsets: ['latin'], display: 'swap', preload: false, style: ['normal', 'italic'] });
const plusJakartaSans = Plus_Jakarta_Sans({ subsets: ['latin'], display: 'swap', preload: false, style: ['normal', 'italic'] });
const atkinsonHyperlegible = Atkinson_Hyperlegible({
  subsets: ['latin'],
  display: 'swap',
  preload: false,
  style: ['normal', 'italic'],
  weight: ['400', '700'],
});

const READING_FONT_STACKS: Record<ReadingFontFamily, string> = {
  'source-serif-4': sourceSerif.style.fontFamily,
  merriweather: merriweather.style.fontFamily,
  lora: lora.style.fontFamily,
  literata: literata.style.fontFamily,
  'noto-serif': notoSerif.style.fontFamily,
  georgia: gelasio.style.fontFamily,
  'pt-serif': ptSerif.style.fontFamily,
  'crimson-pro': crimsonPro.style.fontFamily,
  'eb-garamond': ebGaramond.style.fontFamily,
  'libre-baskerville': libreBaskerville.style.fontFamily,
  inter: inter.style.fontFamily,
  nunito: nunito.style.fontFamily,
  'noto-sans': notoSans.style.fontFamily,
  roboto: roboto.style.fontFamily,
  'open-sans': openSans.style.fontFamily,
  'plus-jakarta-sans': plusJakartaSans.style.fontFamily,
  'atkinson-hyperlegible': atkinsonHyperlegible.style.fontFamily,
};

export function readingFontStack(fontFamily: ReadingFontFamily): string {
  return READING_FONT_STACKS[fontFamily] ?? READING_FONT_STACKS['source-serif-4'];
}
