import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { getPlatformSlug } from "@/lib/platform";
import { getPlatformConfig } from "@/lib/public-api";
import { resolveOriginFromHeaders } from "@/lib/resolve-origin";
import { PlatformProvider } from "@/context/platform-context";

// nama/favicon dari GET /public/platforms/:platformSlug (Fase 4, §4.2 —
// menggantikan GET /public/config global lama) — favicon null berarti pakai
// favicon default Next.js (belum ada custom favicon). generateMetadata
// dipakai (bukan `export const metadata` statis) supaya bisa async fetch
// config setelah resolusi Platform dari middleware.ts.
//
// `metadataBase` (SEO Fase 1, 16 Sep 2026 — plan/bookpedia/seo-plan.md §6.1):
// WAJIB dinamis ikut host request (`resolveOriginFromHeaders()`), BUKAN satu
// env var statis — supaya URL Open Graph/Twitter (og:image cover Book dkk,
// lihat lib/seo.ts) resolve ke domain yang BENAR-BENAR diakses pengunjung
// (subdomain Platform atau custom domain), bukan domain default hardcode.
// Di-set di root layout supaya diwarisi SEMUA halaman anak (Next.js metadata
// merging), tidak perlu diulang tiap `generateMetadata`.
export async function generateMetadata(): Promise<Metadata> {
  const [slug, origin] = await Promise.all([getPlatformSlug(), resolveOriginFromHeaders()]);
  const config = await getPlatformConfig(slug);

  return {
    metadataBase: new URL(origin),
    title: `${config.nama} — Baca & Tulis Cerita`,
    description: `${config.nama}, platform Bagdja untuk membaca dan menulis novel/cerita berseri — jelajahi katalog cerita dari berbagai penulis, buat akun gratis untuk mulai membaca.`,
    icons: config.faviconUrl ? { icon: config.faviconUrl } : undefined,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const slug = await getPlatformSlug();
  const config = await getPlatformConfig(slug);

  return (
    <html lang="id">
      <body className="antialiased">
        <PlatformProvider slug={slug} config={config}>
          {children}
        </PlatformProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
