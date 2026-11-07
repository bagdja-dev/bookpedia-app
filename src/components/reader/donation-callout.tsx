'use client';

import Link from 'next/link';
import { Heart } from 'lucide-react';

import { DonationCheckout } from '@/components/reader/donation-checkout';
import type { PublicDonationSettings } from '@/lib/public-types';

export function DonationCallout({
  settings,
  location,
  platformSlug,
}: {
  settings: PublicDonationSettings;
  location: 'home' | 'book_detail' | 'chapter_end';
  platformSlug?: string;
}) {
  if (!settings.locations.includes(location)) return null;

  const calloutContent = (
    <div className="flex gap-3">
      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--reader-terracotta)]/10 text-[var(--reader-terracotta)]">
        <Heart className="h-5 w-5" />
      </span>
      <div>
        <h2 className="text-lg font-semibold text-[var(--reader-foreground)]" style={{ fontFamily: 'var(--font-source-serif)' }}>
          {settings.title}
        </h2>
        <p className="mt-1 whitespace-pre-line text-sm text-[var(--reader-muted)]">{settings.description}</p>
        <p className="mt-2 text-xs text-[var(--reader-muted)]">Donasi sukarela untuk operasional platform, bukan untuk penulis atau buku tertentu.</p>
      </div>
    </div>
  );
  const actionClassName = 'inline-flex shrink-0 items-center justify-center rounded-full bg-[var(--reader-button-bg,var(--reader-terracotta))] px-5 py-2.5 text-sm font-medium text-[var(--reader-button-text,var(--reader-terracotta-foreground))] transition-opacity hover:opacity-90';

  return (
    <section className="my-8 w-full rounded-2xl border border-[var(--reader-border)] bg-[var(--reader-surface)] p-5 sm:p-6">
      {location === 'book_detail' && platformSlug ? (
        <>
          {calloutContent}
          <div id="book-detail-donation-form" className="mt-5 border-t border-[var(--reader-border)] pt-5">
            <DonationCheckout
              platformSlug={platformSlug}
              settings={settings}
              presentation="embedded"
            />
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {calloutContent}
          <Link href="/donate" className={actionClassName}>
            {settings.buttonLabel}
          </Link>
        </div>
      )}
    </section>
  );
}

export function DonationLink({
  settings,
  location,
}: {
  settings: PublicDonationSettings;
  location: 'footer' | 'reader_menu';
}) {
  if (!settings.locations.includes(location)) return null;
  return (
    <Link href="/donate" className="underline underline-offset-2 hover:opacity-80">
      {settings.buttonLabel}
    </Link>
  );
}
