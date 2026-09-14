import type { Metadata } from 'next';

/**
 * Bangun `openGraph`+`twitter` metadata konsisten dari satu set field —
 * dipakai semua `generateMetadata` halaman reader (Fase 1 SEO, lihat
 * plan/bookpedia/seo-execution-plan.md §1.2). Satu tempat supaya bentuknya
 * konsisten di semua halaman, bukan disalin-tempel manual tiap file.
 *
 * `imageUrl` boleh URL relatif ATAU absolut — Next.js resolve otomatis
 * terhadap `metadataBase` (di-set root layout, lihat `resolveOriginFromHeaders()`).
 */
export function buildSocialMetadata({
  title,
  description,
  imageUrl,
}: {
  title: string;
  description?: string;
  imageUrl?: string | null;
}): Pick<Metadata, 'openGraph' | 'twitter'> {
  const images = imageUrl ? [{ url: imageUrl }] : undefined;

  return {
    openGraph: {
      title,
      description,
      images,
      type: 'website',
    },
    twitter: {
      card: images ? 'summary_large_image' : 'summary',
      title,
      description,
      images,
    },
  };
}

/**
 * Serialisasi aman untuk `<script type="application/ld+json">` (Fase 3 SEO)
 * — escape `<` supaya string penulis (judul/sinopsis bebas) tidak bisa
 * menutup tag `<script>` lebih awal (mis. sinopsis berisi literal
 * "</script>"). `dangerouslySetInnerHTML` di pemanggil AMAN dipakai dengan
 * output fungsi ini karena escaping sudah dilakukan di sini, bukan
 * mempercayai input apa adanya.
 */
export function toJsonLdScript(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
