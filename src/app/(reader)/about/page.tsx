import type { Metadata } from 'next';

import { LegalDocument } from '@/components/reader/legal-document';
import { getPlatformSlug } from '@/lib/platform';
import { getPlatformConfig } from '@/lib/public-api';

export async function generateMetadata(): Promise<Metadata> {
  const config = await getPlatformConfig(await getPlatformSlug());
  return {
    title: `Tentang ${config.nama}`,
    alternates: { canonical: '/about' },
  };
}

export default async function AboutPage() {
  const config = await getPlatformConfig(await getPlatformSlug());

  return <LegalDocument title={`Tentang ${config.nama}`} html={config.aboutContent} emptyText="Konten Tentang belum tersedia." />;
}
