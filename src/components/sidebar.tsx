'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, ChevronLeft, ChevronRight, Library, MessageCircle, Settings } from 'lucide-react';

import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/dashboard/books', label: 'Book & Chapter', icon: Library },
  { href: '/dashboard/inbox', label: 'Inbox', icon: MessageCircle },
];

const SETTINGS_ITEM = { href: '/dashboard/settings', label: 'Pengaturan', icon: Settings };

interface SidebarProps {
  title: string;
  icon: string | null;
  isOpen: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export function Sidebar({ title, icon, isOpen, onClose, collapsed, onToggleCollapsed }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {isOpen && <button type="button" aria-label="Tutup menu" onClick={onClose} className="fixed inset-0 z-40 bg-black/40 md:hidden" />}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-200 md:static md:translate-x-0 md:transition-[width]',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          collapsed ? 'md:w-16' : 'md:w-48',
        )}
      >
        <div className={cn('flex h-16 items-center gap-2 px-4', collapsed && 'md:justify-center md:px-2')}>
          <Link href="/" onClick={onClose} className="shrink-0">
            {icon ? (
              // eslint-disable-next-line @next/next/no-img-element -- ikon dari URL config bebas domain, bukan aset lokal
              <img src={icon} alt={title} className="h-8 w-8 rounded-lg object-cover" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <BookOpen className="h-4 w-4" />
              </div>
            )}
          </Link>
          <span className={cn('truncate font-semibold', collapsed && 'md:hidden')}>{title} Studio</span>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-3">
          {NAV_ITEMS.map((item) => {
            const active = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                  collapsed && 'md:justify-center md:px-2',
                  active
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                )}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="h-4 w-4" />
                <span className={cn(collapsed && 'md:hidden')}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <Link
            href={SETTINGS_ITEM.href}
            onClick={onClose}
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
              collapsed && 'md:justify-center md:px-2',
              pathname.startsWith(SETTINGS_ITEM.href)
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            )}
            title={collapsed ? SETTINGS_ITEM.label : undefined}
          >
            <SETTINGS_ITEM.icon className="h-4 w-4" />
            <span className={cn(collapsed && 'md:hidden')}>{SETTINGS_ITEM.label}</span>
          </Link>
          <button
            type="button"
            onClick={onToggleCollapsed}
            className={cn(
              'mt-1 hidden w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground md:flex',
              collapsed && 'md:justify-center md:px-2',
            )}
            aria-label={collapsed ? 'Perbesar sidebar' : 'Ciutkan sidebar'}
            title={collapsed ? 'Perbesar sidebar' : 'Ciutkan sidebar'}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            <span className={cn(collapsed && 'md:hidden')}>Ciutkan</span>
          </button>
        </div>
      </aside>
    </>
  );
}
