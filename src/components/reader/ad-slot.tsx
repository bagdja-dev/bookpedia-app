'use client';

import { useEffect, useRef, useState } from 'react';

import type { PlatformAdSlotSettings } from '@/lib/public-types';

interface AdSlotProps {
  slot: PlatformAdSlotSettings;
  borderColor: string;
  className?: string;
}

export function AdSlot({ slot, borderColor, className }: AdSlotProps) {
  const containerRef = useRef<HTMLElement>(null);
  const failureKey = `${slot.enabled}:${slot.script}`;
  const [failedKey, setFailedKey] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !slot.enabled || !slot.script.trim()) return;

    const template = document.createElement('template');
    template.innerHTML = slot.script;
    container.replaceChildren(template.content.cloneNode(true));

    const hideUnfilledSlot = () => {
      if (container.querySelector('[data-ad-status="unfilled"]')) {
        setFailedKey(failureKey);
      }
    };
    const observer = new MutationObserver(hideUnfilledSlot);
    observer.observe(container, { subtree: true, attributes: true, attributeFilter: ['data-ad-status'] });
    hideUnfilledSlot();

    for (const inertScript of container.querySelectorAll('script')) {
      const activeScript = document.createElement('script');
      for (const attribute of inertScript.attributes) {
        activeScript.setAttribute(attribute.name, attribute.value);
      }
      activeScript.textContent = inertScript.textContent;
      activeScript.addEventListener('error', () => setFailedKey(failureKey), { once: true });
      inertScript.replaceWith(activeScript);
    }

    return () => {
      observer.disconnect();
      container.replaceChildren();
    };
  }, [failureKey, slot.enabled, slot.script]);

  if (!slot.enabled || failedKey === failureKey) return null;

  return (
    <aside
      ref={containerRef}
      aria-label="Iklan"
      className={`block min-h-24 w-full rounded-md border-2 px-4 py-3 text-center text-sm font-medium text-orange-700 ${className ?? ''}`}
      style={{ borderColor }}
    >
      {!slot.script.trim() && <span className="flex min-h-16 items-center justify-center">Ad space</span>}
    </aside>
  );
}