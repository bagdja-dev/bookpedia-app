/** Nomor telepon → `tel:` (hanya angka dan + di depan). */
export function toTelHref(phone: string): string {
  const trimmed = phone.trim();
  return `tel:${trimmed.startsWith('+') ? '+' : ''}${trimmed.replace(/\D/g, '')}`;
}

/**
 * Nomor WhatsApp → tautan `https://wa.me/<nomor internasional>`: hanya angka, awalan 0
 * (format lokal Indonesia) diganti 62. Null bila tidak ada angka sama sekali.
 */
export function toWhatsAppHref(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  return `https://wa.me/${digits.startsWith('0') ? `62${digits.slice(1)}` : digits}`;
}
