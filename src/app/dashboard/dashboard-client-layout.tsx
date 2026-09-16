'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';

import { LoadingSpinner } from '@/components/loading-spinner';
import { RealtimeProvider } from '@/components/reader/realtime-provider';
import { Button } from '@/components/ui/button';
import { Sidebar } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';
import { LibraryProvider, useLibraryContext } from '@/context/library-context';
import { usePlatformContext } from '@/context/platform-context';
import { useAuth } from '@/hooks/use-auth';
import { useLibrary } from '@/hooks/use-library';

function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { isLoggedIn, loading } = useAuth();

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.replace('/auth/login?next=/dashboard');
    }
  }, [loading, isLoggedIn, router]);

  if (loading || !isLoggedIn) {
    return <LoadingSpinner label="Memeriksa sesi login…" />;
  }

  return <>{children}</>;
}

/**
 * Kriteria E2E Fase 0 (plan/bookpedia/execution-plan.md): user login tanpa
 * Library harus diarahkan ke onboarding sebelum bisa melihat dashboard.
 * `GET /libraries/me` balas `200` body `null` (bukan 404) kalau belum ada —
 * lihat hooks/use-library.ts.
 */
function LibraryGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { library, loading, error, refetch } = useLibrary();

  useEffect(() => {
    if (!loading && !error && !library) {
      router.replace('/onboarding');
    }
  }, [loading, error, library, router]);

  if (loading) {
    return <LoadingSpinner label="Memuat Library…" />;
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="max-w-sm text-sm text-destructive">Gagal memuat Library: {error}</p>
        <Button variant="outline" onClick={() => refetch()}>
          Coba lagi
        </Button>
      </div>
    );
  }

  if (!library) {
    // Redirect ke /onboarding sedang berjalan (lihat useEffect di atas).
    return <LoadingSpinner label="Mengalihkan ke onboarding…" />;
  }

  return <LibraryProvider library={library}>{children}</LibraryProvider>;
}

// Sidebar & Topbar sama-sama butuh nama/icon Platform — sekarang datang dari
// `PlatformProvider` (root layout, sudah ter-hidrasi server-side, lihat
// context/platform-context.tsx) alih-alih fetch client-side sendiri seperti
// sebelumnya — tidak ada lagi loading-flicker. Sengaja pakai `faviconUrl`
// (bukan `logoUrl`) — dikonfirmasi eksplisit user: badge kecil di
// Sidebar/Topbar pakai ikon persegi (favicon), `logoUrl` (brand mark lebar)
// khusus header reader.
function DashboardShell({ children }: { children: ReactNode }) {
  const { config } = usePlatformContext();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar title={config.nama} icon={config.faviconUrl} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <DashboardTopbar title={config.nama} icon={config.faviconUrl} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

// Dipisah supaya bisa memanggil useLibraryContext() setelah LibraryProvider
// terpasang (Topbar butuh data Library untuk header).
function DashboardTopbar({ title, icon }: { title: string; icon: string | null }) {
  const library = useLibraryContext();
  return <Topbar library={library} title={title} icon={icon} />;
}

// `RealtimeProvider` sebelumnya cuma dipasang di `(reader)/layout.tsx` — Studio
// (`/dashboard/inbox`) jadi tidak punya akses `useRealtime()`, jadi pesan baru
// baru muncul setelah pindah percakapan/refresh manual. Providernya generik
// (endpoint `ws-token` publik, tidak spesifik reader) meski lokasi filenya
// masih di `components/reader/` — cukup dipasang di sini juga.
export function DashboardClientLayout({ children }: { children: ReactNode }) {
  return (
    <RealtimeProvider>
      <AuthGuard>
        <LibraryGuard>
          <DashboardShell>{children}</DashboardShell>
        </LibraryGuard>
      </AuthGuard>
    </RealtimeProvider>
  );
}
