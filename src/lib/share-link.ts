import { toast } from 'sonner';

/**
 * Bagikan URL lewat share sheet native (HP/TWA) bila tersedia, kalau tidak salin ke
 * clipboard. Dipakai tombol Share halaman baca Chapter (URL preview) dan halaman
 * sinopsis Book.
 */
export async function shareLink(url: string, title?: string): Promise<void> {
  if (navigator.share) {
    try {
      await navigator.share(title ? { url, title } : { url });
    } catch {
      // Pembaca membatalkan share sheet native — bukan error.
    }
    return;
  }

  try {
    await navigator.clipboard.writeText(url);
    toast.success('Link disalin');
  } catch (err) {
    console.error('[shareLink] gagal menyalin link:', err);
    toast.error('Gagal menyalin link');
  }
}
