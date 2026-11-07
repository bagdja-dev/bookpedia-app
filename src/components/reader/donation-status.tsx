'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CheckCircle2, Clock3, XCircle } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_BOOKPEDIA_API_URL ?? 'http://localhost:5020';
type DonationStatusValue = 'INITIALIZING' | 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED' | 'CANCELLED';

export function DonationStatus({
  platformSlug,
  statusToken,
}: {
  platformSlug: string;
  statusToken: string;
}) {
  const [status, setStatus] = useState<DonationStatusValue | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let attempts = 0;

    async function checkStatus() {
      try {
        const response = await fetch(
          `${API_BASE}/public/platforms/${encodeURIComponent(platformSlug)}/donations/status/${encodeURIComponent(statusToken)}`,
          { cache: 'no-store' },
        );
        const payload = await response.json().catch(() => null) as
          | { status?: DonationStatusValue; message?: string; error?: string }
          | null;
        if (!response.ok || !payload?.status) {
          throw new Error(payload?.message ?? payload?.error ?? 'Status donasi belum dapat diperiksa.');
        }
        if (cancelled) return;
        setStatus(payload.status);
        setError(null);
        if (payload.status === 'PENDING' && attempts < 40) {
          attempts += 1;
          timer = setTimeout(() => void checkStatus(), 3000);
        } else if (payload.status === 'PENDING') {
          setTimedOut(true);
        }
      } catch (cause) {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : 'Status donasi belum dapat diperiksa.');
      }
    }

    void checkStatus();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [platformSlug, statusToken]);

  const paid = status === 'PAID';
  const terminalFailure = status === 'FAILED' || status === 'EXPIRED' || status === 'CANCELLED';

  return (
    <section className="mx-auto max-w-xl rounded-2xl border border-[var(--reader-border)] bg-[var(--reader-surface)] p-6 text-center sm:p-8">
      {paid ? (
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
      ) : terminalFailure ? (
        <XCircle className="mx-auto h-12 w-12 text-red-600" />
      ) : (
        <Clock3 className="mx-auto h-12 w-12 text-[var(--reader-mustard)]" />
      )}
      <h1 className="mt-4 text-2xl font-semibold text-[var(--reader-foreground)]" style={{ fontFamily: 'var(--font-source-serif)' }}>
        {paid ? 'Donasi berhasil diterima' : terminalFailure ? 'Donasi belum berhasil' : 'Memeriksa status donasi'}
      </h1>
      <p className="mt-2 text-sm text-[var(--reader-muted)]">
        {paid
          ? 'Terima kasih telah mendukung operasional platform ini.'
          : terminalFailure
            ? 'Pembayaran tidak tercatat sebagai berhasil. Anda dapat mencoba kembali.'
            : timedOut
              ? 'Pembayaran masih menunggu konfirmasi. Muat ulang halaman ini untuk memeriksa lagi.'
              : 'Status pembayaran sedang dikonfirmasi oleh layanan pembayaran. Halaman ini tidak menganggap redirect sebagai bukti pembayaran.'}
      </p>
      {error && <p role="alert" className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={() => window.location.reload()} className="rounded-full border border-[var(--reader-border)] px-4 py-2 text-sm text-[var(--reader-foreground)] hover:border-[var(--reader-terracotta)]">
          Periksa lagi
        </button>
        <Link href="/donate" className="rounded-full bg-[var(--reader-terracotta)] px-4 py-2 text-sm font-medium text-[var(--reader-terracotta-foreground)]">
          Kembali ke donasi
        </Link>
      </div>
    </section>
  );
}
