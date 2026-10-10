'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SystemSwitcher } from '@/components/navigation/SystemSwitcher';
import './albion.css';

/**
 * Source of truth for the English UI:
 * "Kiokudo Studio · 日本語 _ Albion IELTS(1).html", ENAV and [data-sys=en].
 * Preserve its crest, six navigation labels, mobile pill and classic theme.
 * Only the previously approved round navbar switcher differs from the HTML.
 */
const ENAV = [
  { href: '/ielts', roman: 'Ⅰ', label: 'Home' },
  { href: '/ielts/tracker', roman: 'Ⅱ', label: 'Tracker' },
  { href: '/ielts/writing', roman: 'Ⅲ', label: 'Writing' },
  { href: '/ielts/speaking', roman: 'Ⅳ', label: 'Speaking' },
  { href: '/ielts/vocab', roman: 'Ⅴ', label: 'Vocab' },
  { href: '/ielts/mistakes', roman: 'Ⅵ', label: 'Logbook' },
];

export default function IeltsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const navPath = pathname === '/ielts/review' ? '/ielts/mistakes' :
    pathname === '/ielts/session' ? '/ielts/tracker' : pathname;

  return (
    <div className="english-mode albion-ui">
      <nav className="top" aria-label="Albion IELTS">
        <Link className="logo" href="/ielts">
          <span className="crest">A</span>ALBION
          <span style={{ opacity: .6, fontWeight: 400 }}>· IELTS</span>
        </Link>
        <ul id="nv">
          {ENAV.map(item => (
            <li key={item.href}>
              <Link href={item.href} className={navPath === item.href ? 'on' : ''}
                aria-current={navPath === item.href ? 'page' : undefined}>{item.label}</Link>
            </li>
          ))}
        </ul>
        <Link className="cta" href="/ielts/vocab"><b>✎</b>Study Words</Link>
        <SystemSwitcher />
      </nav>
      <nav className="pill" aria-label="Điều hướng">
        {ENAV.map(item => (
          <Link key={item.href} href={item.href} className={navPath === item.href ? 'on' : ''}
            aria-current={navPath === item.href ? 'page' : undefined}>
            <i>{item.roman}</i>{item.label}
          </Link>
        ))}
      </nav>
      <main className="albion-main">{children}</main>
    </div>
  );
}
