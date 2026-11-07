'use client';

import { useMemo, useState } from 'react';
import { Heart, LockKeyhole } from 'lucide-react';

import { useAuth } from '@/hooks/use-auth';
import { apiClient } from '@/lib/api-client';
import type { PublicDonationSettings } from '@/lib/public-types';

const MAX_AMOUNT = 100_000_000;

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function DonationCheckout({
  platformSlug,
  settings,
  initialOptionId,
  initialAmount,
  presentation = 'page',
}: {
  platformSlug: string;
  settings: PublicDonationSettings;
  initialOptionId?: string;
  initialAmount?: string;
  presentation?: 'page' | 'embedded';
}) {
  const { isLoggedIn, loading: authLoading } = useAuth();
  const [selectedId, setSelectedId] = useState(initialOptionId ?? settings.options[0]?.id ?? '');
  const [customAmount, setCustomAmount] = useState(initialAmount ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selected = settings.options.find((option) => option.id === selectedId);
  const parsedAmount = Number(customAmount);
  const customAmountValid = Boolean(
    selected?.type !== 'custom' ||
      (Number.isInteger(parsedAmount) &&
        parsedAmount >= (selected.multiple ?? 1) &&
        parsedAmount <= MAX_AMOUNT &&
        parsedAmount % (selected.multiple ?? 1) === 0),
  );
  const amountLabel = useMemo(() => {
    if (!selected) return '';
    if (selected.type === 'fixed') return formatRupiah(selected.amount ?? 0);
    return `Mulai ${formatRupiah(selected.multiple ?? 0)}`;
  }, [selected]);

  async function beginCheckout() {
    if (!selected) return;
    if (!isLoggedIn) {
      const returnUrl = new URL('/donate', window.location.origin);
      returnUrl.searchParams.set('optionId', selected.id);
      if (selected.type === 'custom' && customAmount) {
        returnUrl.searchParams.set('amount', customAmount);
      }
      window.location.assign(
        `/auth/login?force_login=1&next=${encodeURIComponent(`${returnUrl.pathname}${returnUrl.search}`)}`,
      );
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const payload = await apiClient<{ checkoutUrl?: string }>(
        `/public/platforms/${encodeURIComponent(platformSlug)}/donations`,
        {
          method: 'POST',
          body: JSON.stringify({
            optionId: selected.id,
            ...(selected.type === 'custom' ? { amount: parsedAmount } : {}),
          }),
        },
      );
      if (!payload.checkoutUrl) {
        throw new Error('Checkout donasi gagal dibuat.');
      }
      window.location.assign(payload.checkoutUrl);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Checkout donasi gagal dibuat.');
      setSubmitting(false);
    }
  }

  const isEmbedded = presentation === 'embedded';
  const Container = isEmbedded ? 'div' : 'section';
  const Heading = isEmbedded ? 'h3' : 'h1';

  return (
    <Container className={isEmbedded ? 'w-full' : 'mx-auto w-full max-w-3xl rounded-2xl border border-[var(--reader-border)] bg-[var(--reader-surface)] p-5 shadow-sm sm:p-8'}>
      {!isEmbedded && (
        <div className="mb-6 flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--reader-terracotta)]/10 text-[var(--reader-terracotta)]">
            <Heart className="h-5 w-5" />
          </span>
          <div>
            <Heading className="text-2xl font-semibold text-[var(--reader-foreground)]" style={{ fontFamily: 'var(--font-source-serif)' }}>
              {settings.title}
            </Heading>
            <p className="mt-2 whitespace-pre-line text-sm text-[var(--reader-muted)]">{settings.description}</p>
          </div>
        </div>
      )}

      <fieldset className="space-y-3">
        <legend className="mb-3 text-sm font-semibold text-[var(--reader-foreground)]">Pilih nominal dukungan</legend>
        {settings.options.map((option) => (
          <label
            key={option.id}
            className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
              selectedId === option.id
                ? 'border-[var(--reader-terracotta)] bg-[var(--reader-terracotta)]/5'
                : 'border-[var(--reader-border)] hover:border-[var(--reader-terracotta)]/60'
            }`}
          >
            <input
              type="radio"
              name="donation-option"
              value={option.id}
              checked={selectedId === option.id}
              onChange={() => setSelectedId(option.id)}
              className="mt-1 accent-[var(--reader-terracotta)]"
            />
            {option.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={option.imageUrl}
                alt=""
                className="mt-0.5 h-9 w-9 shrink-0 rounded-full border border-[var(--reader-border)] object-cover"
              />
            ) : (
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--reader-terracotta)]/10 text-[var(--reader-terracotta)]">
                <Heart className="h-4 w-4" aria-hidden="true" />
                </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2 font-medium text-[var(--reader-foreground)]">
                {option.title}
                {option.isPopular && <span className="rounded-full bg-[var(--reader-mustard)]/20 px-2 py-0.5 text-[10px] font-semibold text-[var(--reader-foreground)]">Populer</span>}
                <span className="ml-auto text-sm text-[var(--reader-terracotta)]">{option.type === 'fixed' ? formatRupiah(option.amount ?? 0) : `Kelipatan ${formatRupiah(option.multiple ?? 0)}`}</span>
              </span>
              {option.description && <span className="mt-1 block text-sm text-[var(--reader-muted)]">{option.description}</span>}
            </span>
          </label>
        ))}
      </fieldset>

      {!authLoading && !isLoggedIn && (
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-[var(--reader-terracotta)]/25 bg-[var(--reader-terracotta)]/5 p-4">
          <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-[var(--reader-terracotta)]" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-[var(--reader-foreground)]">Masuk untuk melanjutkan</p>
            <p className="mt-1 text-sm text-[var(--reader-muted)]">
              Login dengan akun Bagdja diperlukan sebelum pembayaran. Pilihan donasi Anda akan tetap tersimpan.
            </p>
          </div>
        </div>
      )}

      {selected?.type === 'custom' && (
        <label className="mt-4 block space-y-1.5">
          <span className="text-sm font-medium text-[var(--reader-foreground)]">Nominal donasi (Rp)</span>
          <input
            type="number"
            inputMode="numeric"
            min={selected.multiple ?? 1}
            max={MAX_AMOUNT}
            step={selected.multiple ?? 1}
            value={customAmount}
            onChange={(event) => setCustomAmount(event.target.value)}
            className="w-full rounded-lg border border-[var(--reader-border)] bg-[var(--reader-bg)] px-3 py-2 text-[var(--reader-foreground)]"
            aria-describedby="donation-custom-help"
          />
          <span id="donation-custom-help" className="block text-xs text-[var(--reader-muted)]">
            Minimal {formatRupiah(selected.multiple ?? 0)} dan harus kelipatan {formatRupiah(selected.multiple ?? 0)}; maksimal Rp100.000.000.
          </span>
        </label>
      )}

      {error && <p role="alert" className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <button
        type="button"
        disabled={!selected || !customAmountValid || submitting || authLoading}
        onClick={() => void beginCheckout()}
        className="mt-6 w-full rounded-full bg-[var(--reader-button-bg,var(--reader-terracotta))] px-5 py-3 text-sm font-semibold text-[var(--reader-button-text,var(--reader-terracotta-foreground))] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        {authLoading
          ? 'Memeriksa sesi…'
          : submitting
            ? 'Membuka checkout…'
            : `${isLoggedIn ? settings.buttonLabel : 'Masuk untuk berdonasi'}${selected ? ` · ${selected.type === 'fixed' ? amountLabel : customAmount ? formatRupiah(parsedAmount) : amountLabel}` : ''}`}
      </button>
    </Container>
  );
}
