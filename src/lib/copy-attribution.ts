/**
 * Atribusi saat menyalin isi Chapter: pembaca tetap bisa mengutip, tapi clipboard hanya
 * berisi potongan pendek + tautan sumber — kutipan yang beredar jadi promosi, bukan salinan
 * utuh. Seleksi teks tidak diblokir (fitur highlight bergantung padanya).
 */
/** Default panjang potongan bila Platform tidak mengatur `copyAttributionMaxChars`. */
export const COPY_ATTRIBUTION_MAX_CHARS = 200;

export interface CopyAttribution {
  /** Teks yang ditaruh di clipboard (text/plain). */
  text: string;
  /** Versi HTML (text/html) untuk tempel di editor kaya, mis. Google Docs/WhatsApp Web. */
  html: string;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character] ?? character);
}

export function buildCopyAttribution(
  selected: string,
  sourceLabel: string,
  url: string,
  maxChars = COPY_ATTRIBUTION_MAX_CHARS,
): CopyAttribution {
  const normalized = selected.replace(/\s+\n/g, '\n').trim();
  const limit = Math.max(1, Math.floor(maxChars));
  const excerpt = normalized.length > limit ? `${normalized.slice(0, limit).trimEnd()}…` : normalized;
  const credit = `Baca selengkapnya "${sourceLabel}" di ${url}`;
  return {
    text: `${excerpt}\n\n— ${credit}`,
    html: `<p>${escapeHtml(excerpt).replace(/\n/g, '<br>')}</p>`
      + `<p>— Baca selengkapnya "${escapeHtml(sourceLabel)}" di <a href="${escapeHtml(url)}">${escapeHtml(url)}</a></p>`,
  };
}
