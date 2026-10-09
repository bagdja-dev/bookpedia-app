import type { Metadata } from 'next';
import { Mail, MessageCircle, Phone } from 'lucide-react';

import { toTelHref, toWhatsAppHref } from '@/lib/contact-links';
import { getPlatformSlug } from '@/lib/platform';
import { getPlatformConfig } from '@/lib/public-api';

export async function generateMetadata(): Promise<Metadata> {
  const config = await getPlatformConfig(await getPlatformSlug());
  return {
    title: `Kontak — ${config.nama}`,
    description: `Hubungi ${config.nama} lewat telepon, WhatsApp, atau email.`,
    alternates: { canonical: '/contact' },
  };
}

/** Halaman Kontak publik — isi diatur di Platform Settings admin (telepon, WhatsApp, email). */
export default async function ContactPage() {
  const config = await getPlatformConfig(await getPlatformSlug());
  const whatsappHref = config.contactWhatsapp ? toWhatsAppHref(config.contactWhatsapp) : null;

  const items = [
    config.contactPhone && {
      key: 'phone',
      label: 'Telepon',
      value: config.contactPhone,
      href: toTelHref(config.contactPhone),
      icon: Phone,
      external: false,
    },
    config.contactWhatsapp && whatsappHref && {
      key: 'whatsapp',
      label: 'WhatsApp',
      value: config.contactWhatsapp,
      href: whatsappHref,
      icon: MessageCircle,
      external: true,
    },
    config.contactEmail && {
      key: 'email',
      label: 'Email',
      value: config.contactEmail,
      href: `mailto:${config.contactEmail}`,
      icon: Mail,
      external: false,
    },
  ].filter((item): item is Exclude<typeof item, null | '' | undefined | false> => Boolean(item));

  return (
    <article className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <h1
        className="mb-3 text-3xl font-semibold text-[var(--reader-foreground)] sm:text-4xl"
        style={{ fontFamily: 'var(--font-source-serif)' }}
      >
        Kontak
      </h1>
      <p className="mb-8 text-sm text-[var(--reader-muted)]">
        Ada pertanyaan, masukan, atau ingin bekerja sama dengan {config.nama}? Hubungi kami lewat kontak berikut.
      </p>

      {items.length > 0 ? (
        <ul className="space-y-3">
          {items.map(({ key, label, value, href, icon: Icon, external }) => (
            <li key={key}>
              <a
                href={href}
                {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                className="flex items-center gap-4 rounded-xl border border-[var(--reader-border)] bg-[var(--reader-surface)] px-4 py-4 transition-colors hover:border-[var(--reader-terracotta)]"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--reader-bg)] text-[var(--reader-terracotta)]">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs text-[var(--reader-muted)]">{label}</span>
                  <span className="block break-all text-base font-medium text-[var(--reader-foreground)]">{value}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-[var(--reader-muted)]">Informasi kontak belum tersedia.</p>
      )}
    </article>
  );
}
