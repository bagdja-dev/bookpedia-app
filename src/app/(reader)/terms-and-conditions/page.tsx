import type { Metadata } from 'next';
import sanitizeHtml from 'sanitize-html';

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
  const safeTermsAndConditions = config.termsAndConditions?.trim()
    ? sanitizeHtml(config.termsAndConditions, {
        allowedTags: [
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'hr', 'ul', 'ol', 'li',
          'strong', 'b', 'em', 'i', 'u', 's', 'blockquote', 'a', 'table', 'thead',
          'tbody', 'tr', 'th', 'td',
        ],
        allowedAttributes: { a: ['href', 'title'], h2: ['style'], h3: ['style'], p: ['style'] },
        allowedStyles: {
          '*': { 'text-align': [/^(left|center|right|justify)$/] },
        },
        allowedSchemes: ['http', 'https', 'mailto', 'tel'],
        allowProtocolRelative: false,
      })
    : '';

  return (
    <article className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <h1
        className="mb-8 text-3xl font-semibold text-[var(--reader-foreground)] sm:text-4xl"
        style={{ fontFamily: 'var(--font-source-serif)' }}
      >
        Terms &amp; Conditions
      </h1>
      {safeTermsAndConditions ? (
        <div
          className="break-words text-sm leading-7 text-[var(--reader-foreground)] sm:text-base [&_a]:text-[var(--reader-terracotta)] [&_a]:underline [&_blockquote]:my-4 [&_blockquote]:border-l-2 [&_blockquote]:border-[var(--reader-border)] [&_blockquote]:pl-4 [&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:text-lg [&_h3]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_ol_li]:list-decimal [&_p]:mb-4 [&_table]:my-4 [&_table]:w-full [&_td]:border [&_td]:border-[var(--reader-border)] [&_td]:p-2 [&_th]:border [&_th]:border-[var(--reader-border)] [&_th]:bg-[var(--reader-surface)] [&_th]:p-2"
          dangerouslySetInnerHTML={{ __html: safeTermsAndConditions }}
        />
      ) : (
        <p className="text-sm text-[var(--reader-muted)]">Syarat dan ketentuan belum tersedia.</p>
      )}
    </article>
  );
}