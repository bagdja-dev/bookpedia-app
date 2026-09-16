import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build image Docker untuk Coolify butuh output `.next/standalone` (server
  // Node minimal tanpa node_modules penuh) — lihat Dockerfile di root repo ini.
  output: "standalone",
  // Migrasi next/image (susulan 17 Sep 2026, seo-plan.md §3.7/§6 poin 4) —
  // whitelist SENGAJA sempit (bukan wildcard) demi keamanan (`next/image`
  // fetch URL server-side, allowlist longgar = celah SSRF). Host ini HARUS
  // sinkron dengan `ALLOWED_IMAGE_HOSTS` di `src/lib/image-hosts.ts` (dipakai
  // `SafeImage` buat fallback ke `<img>` polos kalau ada coverUrl/logoUrl di
  // luar daftar ini — backend TIDAK memvalidasi domainnya, lihat komentar di
  // file itu).
  images: {
    remotePatterns: [
      // bagdja-storage-service (Cloudflare R2 custom domain) — cover Book/Library, logo/favicon Platform.
      { protocol: "https", hostname: "cdn.bagdja.com" },
      // Avatar Google OAuth (klaim `picture` dari bagdja-auth) — subdomain bisa beda-beda (lh3/lh4/...).
      { protocol: "https", hostname: "*.googleusercontent.com" },
    ],
  },
};

export default nextConfig;
