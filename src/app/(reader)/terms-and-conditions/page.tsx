import type { Metadata } from 'next';

import { LegalDocument } from '@/components/reader/legal-document';
import { getPlatformSlug } from '@/lib/platform';
import { getPlatformConfig } from '@/lib/public-api';

export async function generateMetadata(): Promise<Metadata> {
  const slug = await getPlatformSlug();
  const config = await getPlatformConfig(slug);
  return { title: `Terms & Conditions — ${config.nama}` };
}

export default async function TermsAndConditionsPage() {
  const slug = await getPlatformSlug();
  const config = await getPlatformConfig(slug);

  return (
    <LegalDocument
      title="Terms & Conditions"
      html={config.termsAndConditions}
      emptyText="Syarat dan ketentuan belum tersedia."
    />
  );
}
