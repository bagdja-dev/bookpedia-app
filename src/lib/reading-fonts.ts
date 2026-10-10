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
const common = { subsets: ['latin' as const], display: 'swap' as const, preload: false };
const withItalic = { ...common, style: ['normal' as const, 'italic' as const] };

// Serif
const sourceSerif = Source_Serif_4(common);
const merriweather = Merriweather({ ...withItalic, weight: ['400', '700'] });
const lora = Lora(withItalic);
const literata = Literata(withItalic);
const notoSerif = Noto_Serif(withItalic);
/** Ditampilkan sebagai "Georgia" — Gelasio setara metrik Georgia dan tersedia di Android. */
const gelasio = Gelasio(withItalic);
const ptSerif = PT_Serif({ ...withItalic, weight: ['400', '700'] });
const crimsonPro = Crimson_Pro(withItalic);
const ebGaramond = EB_Garamond(withItalic);
const libreBaskerville = Libre_Baskerville({ ...withItalic, weight: ['400', '700'] });
// Sans
const inter = Inter(common);
const nunito = Nunito(withItalic);
const notoSans = Noto_Sans(withItalic);
const roboto = Roboto(withItalic);
const openSans = Open_Sans(withItalic);
const plusJakartaSans = Plus_Jakarta_Sans(withItalic);
const atkinsonHyperlegible = Atkinson_Hyperlegible({ ...withItalic, weight: ['400', '700'] });

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
