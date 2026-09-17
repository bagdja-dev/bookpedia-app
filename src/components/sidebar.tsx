'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Library, MessageCircle, Settings } from 'lucide-react';

import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/dashboard/books', label: 'Book & Chapter', icon: Library },
  { href: '/dashboard/inbox', label: 'Inbox', icon: MessageCircle },
];

const SETTINGS_ITEM = { href: '/dashboard/settings', label: 'Pengaturan', icon: Settings };

interface SidebarProps {
  title: string;
  icon: string | null;
}

export function Sidebar({ title, icon }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-48 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex h-16 items-center gap-2 px-4">
        {/* Klik ikon -> balik ke domain dasar (katalog publik), sama seperti
            ikon di Topbar untuk layar kecil (lihat topbar.tsx). */}
        <Link href="/" className="shrink-0">
          {icon ? (
            // eslint-disable-next-line @next/next/no-img-element -- ikon dari URL config bebas domain, bukan aset lokal
            <img src={icon} alt={title} className="h-8 w-8 rounded-lg object-cover" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <BookOpen className="h-4 w-4" />
            </div>
          )}
        </Link>
        <span className="font-semibold">{title} Studio</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3">
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                active
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <Link
          href={SETTINGS_ITEM.href}
          className={cn(
            'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
            pathname.startsWith(SETTINGS_ITEM.href)
              ? 'bg-sidebar-accent text-sidebar-accent-foreground'
              : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
          )}
        >
          <SETTINGS_ITEM.icon className="h-4 w-4" />
          {SETTINGS_ITEM.label}
        </Link>
      </div>
    </aside>
  );
}
