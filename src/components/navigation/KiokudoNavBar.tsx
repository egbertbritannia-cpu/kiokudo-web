'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { isIeltsPath } from '@/lib/system-routes';
import { SystemSwitcher } from './SystemSwitcher';

export const NAV_ITEMS = [
  { href: '/#/', tab: '', kanji: '家', label: 'Home' },
  { href: '/#/portal', tab: 'portal', kanji: '門', label: 'Cổng Văn Hóa' },
  { href: '/#/dobai', tab: 'dobai', kanji: '復', label: 'Dò bài' },
  { href: '/#/dojo', tab: 'dojo', kanji: '道', label: 'Dojo' },
  { href: '/#/grammar', tab: 'grammar', kanji: '文', label: 'Grammar' },
  { href: '/#/kura', tab: 'kura', kanji: '蔵', label: 'Kura' },
];

/**
 * KiokudoNavBar - Copy y chang 100% từ doc/kiokudo-studio.html
 */
export function KiokudoNavBar() {
  const pathname = usePathname();
  const [currentHash, setCurrentHash] = React.useState('');

  React.useEffect(() => {
    const update = () => {
      const h = window.location.hash.replace(/^#\/?/, '');
      const [n] = h.split('/');
      setCurrentHash(n || '');
    };
    update();
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);

  // IELTS has its own existing navbar; never display both navbars together.
  if (isIeltsPath(pathname)) return null;

  const isCurrent = (tab: string) => {
    if (tab === '' && currentHash === '') return true;
    if (tab === 'grammar' && (currentHash === 'lesson' || currentHash === 'practice')) return true;
    return currentHash === tab;
  };

  return (
    <>
      {/* 1. TOP NAV (COPY Y CHANG KIOKUDO-STUDIO.HTML) */}
      <nav className="top">
        <a className="logo" href="/#/">
          <span className="seal">記</span>
          KIOKUDO
        </a>
        <ul id="nv">
          {NAV_ITEMS.map((item) => {
            const on = isCurrent(item.tab);
            return (
              <li key={item.href}>
                <a href={item.href} className={on ? 'on' : ''}>
                  {item.label}
                </a>
              </li>
            );
          })}
        </ul>
        <a className="cta" href="/#/dobai">
          <b>復</b> Dò bài
        </a>
        <SystemSwitcher />
      </nav>

      {/* 2. MOBILE PILL NAV (COPY Y CHANG KIOKUDO-STUDIO.HTML) */}
      <nav className="pill" id="pl" aria-label="Điều hướng">
        {NAV_ITEMS.map((item) => {
          const on = isCurrent(item.tab);
          return (
            <a key={item.href} href={item.href} className={on ? 'on' : ''}>
              <i>{item.kanji}</i>
              {item.label}
            </a>
          );
        })}
      </nav>
    </>
  );
}

export default KiokudoNavBar;
