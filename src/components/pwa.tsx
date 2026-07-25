'use client';

import { useEffect } from 'react';

export default function PWA() {
  useEffect(() => {
    const isElectron =
      typeof window !== 'undefined' &&
      (Boolean((window as any).electronAPI?.isElectron) ||
        /Electron/i.test(navigator.userAgent));

    if (isElectron) {
      // In the desktop build we open external links (websites, email) in the
      // user's default OS application instead of navigating inside the app window.
      const handleClick = (event: MouseEvent) => {
        const anchor = (event.target as HTMLElement | null)?.closest('a');
        if (!anchor) return;
        const href = anchor.getAttribute('href') || '';
        if (/^(https?:|mailto:)/i.test(href)) {
          event.preventDefault();
          const api = (window as any).electronAPI;
          if (api?.openExternal) {
            api.openExternal(href);
          } else {
            window.open(href, '_blank');
          }
        }
      };
      document.addEventListener('click', handleClick, true);
      return () => document.removeEventListener('click', handleClick, true);
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('SW registered: ', registration);
        })
        .catch((registrationError) => {
          console.log('SW registration failed: ', registrationError);
        });
    }
  }, []);

  return null;
}
