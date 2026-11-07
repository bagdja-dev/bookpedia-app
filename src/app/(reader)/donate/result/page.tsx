import { notFound } from 'next/navigation';

import { DonationStatus } from '@/components/reader/donation-status';
import { getPlatformSlug } from '@/lib/platform';

export default async function DonationResultPage({
  searchParams,
}: {
  searchParams: Promise<{ statusToken?: string }>;
}) {
  const [{ statusToken }, platformSlug] = await Promise.all([searchParams, getPlatformSlug()]);
  if (!statusToken || !/^[a-f0-9]{64}$/i.test(statusToken)) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <DonationStatus platformSlug={platformSlug} statusToken={statusToken} />
    </div>
  );
}
