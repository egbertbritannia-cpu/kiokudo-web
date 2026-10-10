'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SystemSwitcher } from '@/components/navigation/SystemSwitcher';

export default function IeltsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { label: 'The Study', href: '/ielts' },
    { label: 'Session Tracker', href: '/ielts/session' },
    { label: 'Review & Analysis', href: '/ielts/review' },
  ];

  return (
    <div className="english-mode" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* British IELTS Navbar */}
      <nav className="ielts-system-nav" aria-label="IELTS navigation" style={{
        backgroundColor: 'var(--primary-color)',
        color: '#FDFBF7',
        padding: '1rem 2rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        flexWrap: 'wrap',
        borderBottom: '4px solid var(--secondary-color)'
      }}>
        <div style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '1.5rem',
          fontWeight: 'bold',
          letterSpacing: '1px'
        }}>
          🇬🇧 IELTS Tracker
        </div>

        <div className="ielts-system-nav-links" style={{ display: 'flex', gap: '0.75rem', flex: 1, minWidth: 0, alignItems: 'center', overflowX: 'auto' }}>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  color: isActive ? 'var(--secondary-color)' : '#FDFBF7',
                  textDecoration: 'none',
                  fontWeight: isActive ? 'bold' : 'normal',
                  fontFamily: 'var(--font-sans)',
                  padding: '0.4rem 0.8rem',
                  border: isActive ? '1px solid var(--secondary-color)' : '1px solid transparent',
                  borderRadius: '4px',
                  fontSize: '0.9rem'
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        <SystemSwitcher />
      </nav>

      {/* Main Content */}
      <main style={{ flex: 1, backgroundColor: 'var(--bg-color)' }}>
        {children}
      </main>
    </div>
  );
}
