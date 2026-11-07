import { notFound } from 'next/navigation';

import { DonationCheckout } from '@/components/reader/donation-checkout';
import { getPlatformSlug } from '@/lib/platform';
import { getPlatformConfig } from '@/lib/public-api';

export default async function DonationPage({
  searchParams,
}: {
  searchParams: Promise<{ optionId?: string; amount?: string }>;
}) {
  const [{ optionId, amount }, platformSlug] = await Promise.all([searchParams, getPlatformSlug()]);
  const config = await getPlatformConfig(platformSlug);
  if (!config.donation) notFound();
  const selectedOption = config.donation.options.find((option) => option.id === optionId);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <DonationCheckout
        platformSlug={platformSlug}
        settings={config.donation}
        initialOptionId={selectedOption?.id}
        initialAmount={selectedOption?.type === 'custom' ? amount : undefined}
      />
    </div>
  );
}
