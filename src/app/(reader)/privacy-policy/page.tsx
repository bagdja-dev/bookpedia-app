import type { Metadata } from 'next';

import { LegalDocument } from '@/components/reader/legal-document';
import { getPlatformSlug } from '@/lib/platform';
import { getPlatformConfig } from '@/lib/public-api';

/**
 * URL halaman ini yang didaftarkan di Google Play Console (App content →
 * Privacy policy) untuk aplikasi Android Platform. Konten diedit lewat
 * bookpedia-admin → Pengaturan Platform → Kebijakan Privasi.
 */
export async function generateMetadata(): Promise<Metadata> {
  const slug = await getPlatformSlug();
  const config = await getPlatformConfig(slug);
  return { title: `Kebijakan Privasi — ${config.nama}` };
}

export default async function PrivacyPolicyPage() {
  const slug = await getPlatformSlug();
  const config = await getPlatformConfig(slug);

  return (
    <LegalDocument
      title="Kebijakan Privasi"
      html={config.privacyPolicy}
      emptyText="Kebijakan privasi belum tersedia."
    />
  );
}
