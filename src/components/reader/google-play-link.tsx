'use client';

import { useSyncExternalStore, type ReactNode } from 'react';

interface GooglePlayLinkProps {
  href: string;
  className?: string;
  ariaLabel?: string;
  children: ReactNode;
}

function isStandaloneApp(): boolean {
  if (typeof window === 'undefined') return false;
  return window.document.referrer.startsWith('android-app://')
    || window.matchMedia('(display-mode: standalone)').matches
    || window.matchMedia('(display-mode: fullscreen)').matches;
}

function subscribeToDisplayMode(onChange: () => void): () => void {
  const standalone = window.matchMedia('(display-mode: standalone)');
  const fullscreen = window.matchMedia('(display-mode: fullscreen)');
  standalone.addEventListener('change', onChange);
  fullscreen.addEventListener('change', onChange);
  return () => {
    standalone.removeEventListener('change', onChange);
    fullscreen.removeEventListener('change', onChange);
  };
}

export function GooglePlayLink({ href, className, ariaLabel, children }: GooglePlayLinkProps) {
  const isInstalledApp = useSyncExternalStore(subscribeToDisplayMode, isStandaloneApp, () => false);
  if (isInstalledApp) return null;

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className} aria-label={ariaLabel}>
      {children}
    </a>
  );
}
