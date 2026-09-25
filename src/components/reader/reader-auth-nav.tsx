'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Bookmark, Highlighter, LayoutDashboard, LogOut, MessageCircle, User } from 'lucide-react';

import { useAuth } from '@/hooks/use-auth';
import { apiClient } from '@/lib/api-client';
import type { Library } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { NotificationBell } from '@/components/reader/notification-bell';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/**
 * Bagian header reader yang bergantung status login — sengaja dipisah jadi
 * client component kecil supaya `app/(reader)/layout.tsx` sendiri tetap
 * Server Component murni (SSR penuh untuk SEO). `useAuth` baca cookie
 * `ns_user` di browser, sama seperti dipakai Topbar Studio.
 */
interface ReaderAuthNavProps {
  /**
   * `platform_config.lockStudio` (di-SSR dari `(reader)/layout.tsx`, sudah
   * fetch config sekali di server — diteruskan sebagai prop di sini supaya
   * tidak fetch ulang di client & tidak ada flash tombol "Untuk Penulis"
   * sebelum config kebaca).
   */
  lockStudio: boolean;
}

export function ReaderAuthNav({ lockStudio }: ReaderAuthNavProps) {
  const { user, isLoggedIn, loading } = useAuth();
  const pathname = usePathname();

  // lockStudio hanya menutup PENDAFTARAN Library baru — user yang SUDAH
  // punya Library tetap boleh akses Studio-nya. Jadi "Studio Saya" perlu
  // status Library user login saat lockStudio true. Sengaja HANYA fetch
  // `/libraries/me` kalau lockStudio true DAN user login (apiClient redirect
  // otomatis ke /auth/login kalau sesi 401 — jangan pernah dipanggil untuk
  // guest yang belum login sama sekali, dan jangan nambah roundtrip kalau
  // platform sedang tidak dikunci).
  const [hasLibrary, setHasLibrary] = useState(false);
  const [libraryChecking, setLibraryChecking] = useState(lockStudio);

  useEffect(() => {
    // Early-return TANPA setLibraryChecking(false) di sini secara sengaja —
    // gate render di bawah sudah men-short-circuit lewat `isLoggedIn &&
    // lockStudio &&`, jadi nilai `libraryChecking` tidak relevan saat salah
    // satu kondisi ini false.
    if (!lockStudio || !isLoggedIn) {
      return;
    }

    let cancelled = false;
    setLibraryChecking(true);
    apiClient<Library | null>('/libraries/me')
      .then((data) => {
        if (!cancelled) setHasLibrary(!!data);
      })
      .catch(() => {
        if (!cancelled) setHasLibrary(false);
      })
      .finally(() => {
        if (!cancelled) setLibraryChecking(false);
      });

    return () => {
      cancelled = true;
    };
  }, [lockStudio, isLoggedIn]);

  if (loading || (isLoggedIn && lockStudio && libraryChecking)) {
    return <div className="h-9 w-9" aria-hidden />;
  }

  if (isLoggedIn) {
    const showStudioLink = !lockStudio || hasLibrary;
    const displayName = user?.username || user?.email || 'Pembaca';
    const initial = displayName.charAt(0).toUpperCase();

    // Profil Saya — halaman `/u/[userId]` yang SAMA dipakai buat profil
    // publik orang lain (klik komentator dsb, lihat comment-sheet.tsx),
    // cuma bedanya query param nama/avatar diisi dari sesi sendiri di sini
    // (bukan dari payload komentar). Halaman itu sendiri TETAP publik/tanpa
    // guard — siapa pun bisa buka linknya, "privat" di sini maksudnya cuma
    // jalur AKSES-nya (lewat dropdown, perlu login buat lihat menu ini).
    const ownProfileParams = new URLSearchParams();
    if (user?.username || user?.email) ownProfileParams.set('name', displayName);
    if (user?.avatar) ownProfileParams.set('avatar', user.avatar);
    const ownProfileQuery = ownProfileParams.toString();
    const ownProfileHref = `/u/${encodeURIComponent(user?.userId ?? '')}${ownProfileQuery ? `?${ownProfileQuery}` : ''}`;

    return (
      <div className="flex items-center gap-2">
        <NotificationBell />
        <DropdownMenu>
        <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[var(--reader-terracotta)]">
          <Avatar className="h-9 w-9 border border-[var(--reader-border)]">
            {user?.avatar && <AvatarImage src={user.avatar} alt={displayName} />}
            <AvatarFallback
              className="bg-[var(--reader-bg)] text-sm font-semibold text-[var(--reader-muted)]"
              style={{ fontFamily: 'var(--font-source-serif)' }}
            >
              {initial}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        {/*
          Radix mem-portal-kan Content ke document.body — DI LUAR
          <div class="bookpedia-reader"> tempat var(--reader-*) didefinisikan
          ((reader)/layout.tsx). Di luar scope itu var(--reader-*) undefined,
          jadi warna di sini WAJIB hex literal (bukan var()), atau background
          jatuh transparan. Kalau reader-auth-nav butuh warna reader lain di
          masa depan, ikut pola hex literal ini, jangan var().
        */}
        <DropdownMenuContent align="end" className="border-[#e6d9c3] bg-[#fffdf8] text-[#2c2114]">
          <DropdownMenuLabel className="truncate font-normal text-[#7a6c57]">{displayName}</DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-[#e6d9c3]" />
          <DropdownMenuItem asChild className="focus:bg-[#fbf6ee] focus:text-[#c1502e]">
            <Link href={ownProfileHref}>
              <User />
              Profil Saya
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="focus:bg-[#fbf6ee] focus:text-[#c1502e]">
            <Link href="/my/continue-reading">
              <BookOpen />
              Lanjutkan Baca
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="focus:bg-[#fbf6ee] focus:text-[#c1502e]">
            <Link href="/my/collections">
              <Bookmark />
              Koleksi Saya
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="focus:bg-[#fbf6ee] focus:text-[#c1502e]">
            <Link href="/my/highlights">
              <Highlighter />
              Highlight Saya
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="focus:bg-[#fbf6ee] focus:text-[#c1502e]">
            <Link href="/inbox">
              <MessageCircle />
              Kotak Masuk
            </Link>
          </DropdownMenuItem>
          {showStudioLink && (
            <DropdownMenuItem asChild className="focus:bg-[#fbf6ee] focus:text-[#c1502e]">
              <Link href="/dashboard">
                <LayoutDashboard />
                Studio Saya
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator className="bg-[#e6d9c3]" />
          <DropdownMenuItem asChild variant="destructive">
            <a href="/auth/logout">
              <LogOut />
              Keluar
            </a>
          </DropdownMenuItem>
        </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  // "Masuk" -> balik ke halaman reader yang sedang dibuka setelah login,
  // TIDAK lewat /dashboard sama sekali — supaya pembaca murni yang belum
  // punya Library tidak ke-paksa proses onboarding (LibraryGuard cuma
  // dipasang di /dashboard, jadi menghindarinya = tetap di reader).
  // "Untuk Penulis" -> eksplisit ke /dashboard, yang sudah otomatis benar:
  // LibraryGuard arahkan ke /onboarding (belum punya Library) atau
  // langsung tampilkan dashboard (sudah punya).
  const readerLoginHref = `/auth/login?next=${encodeURIComponent(pathname || '/')}`;

  return (
    <nav className="flex items-center gap-3 text-sm">
      <a
        href={readerLoginHref}
        className="text-[var(--reader-muted)] transition-colors hover:text-[var(--reader-terracotta)]"
      >
        Masuk
      </a>
      {!lockStudio && (
        <a
          href="/auth/login?next=/dashboard"
          className="rounded-full bg-[var(--reader-terracotta)] px-4 py-1.5 font-medium text-[var(--reader-terracotta-foreground)] transition-opacity hover:opacity-90"
        >
          Untuk Penulis
        </a>
      )}
    </nav>
  );
}
