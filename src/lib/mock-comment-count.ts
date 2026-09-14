/**
 * Statistik "jumlah komentar" MOCK (Fase 8 susulan, 15 Sep 2026) — comment
 * sungguhan belum ada, menunggu `bagdja-chat-service` (lihat
 * plan/chat-service/overview.md). Angka ini murni untuk preview visual UI
 * (card katalog & detail Book), deterministik dari `bookId` (stabil antar
 * render/reload, TIDAK tersimpan di database, TIDAK dihitung backend).
 * Ganti pemanggil fungsi ini dengan field asli dari API begitu comment
 * count sungguhan tersedia — lihat plan/bookpedia/overview.md §14.
 */
export function getMockCommentCount(bookId: string): number {
  let hash = 0;
  for (let i = 0; i < bookId.length; i++) {
    hash = (hash * 31 + bookId.charCodeAt(i)) >>> 0;
  }
  return 5 + (hash % 950);
}
