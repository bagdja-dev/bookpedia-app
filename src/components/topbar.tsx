'use client';

import Link from 'next/link';
import { BookOpen, LogOut, Menu } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import type { Library } from '@/lib/types';

interface TopbarProps {
  library: Library;
  title: string;
  icon: string | null;
  onMenuToggle: () => void;
}

export function Topbar({ library, title, icon, onMenuToggle }: TopbarProps) {
  const { user } = useAuth();

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onMenuToggle}
          aria-label="Buka menu"
          title="Buka menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        {/* Sidebar (md+) sudah tampilkan ikon platform — di sini cuma untuk
            layar kecil, di mana Sidebar disembunyikan total (lihat
            `hidden ... md:flex` di sidebar.tsx) sehingga tidak ada cara lain
            kembali ke situs utama dari Studio. Klik -> balik ke domain dasar
            (katalog publik), BUKAN Library profile penulis ini. */}
        <Link href="/" className="shrink-0 md:hidden">
          {icon ? (
            // eslint-disable-next-line @next/next/no-img-element -- ikon dari URL config bebas domain, bukan aset lokal
            <img src={icon} alt={title} className="h-8 w-8 rounded-lg object-cover" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <BookOpen className="h-4 w-4" />
            </div>
          )}
        </Link>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold">{library.nama}</span>
          <span className="text-xs text-muted-foreground">/{library.slug}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {user?.email && (
          <span className="hidden text-sm text-muted-foreground sm:inline">{user.email}</span>
        )}
        <Button variant="outline" size="sm" asChild>
          <a href="/auth/logout">
            <LogOut className="h-4 w-4" />
            Keluar
          </a>
        </Button>
      </div>
    </header>
  );
}
