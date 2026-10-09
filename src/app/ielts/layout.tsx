'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

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
      <nav style={{
        backgroundColor: 'var(--primary-color)',
        color: '#FDFBF7',
        padding: '1rem 2rem',
        display: 'flex',
        alignItems: 'center',
        gap: '2rem',
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

        <div style={{ display: 'flex', gap: '0.75rem', flex: 1, alignItems: 'center' }}>
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

        <div>
          <Link
            href="/"
            style={{
              color: '#FFFFFF',
              background: '#9E3223',
              padding: '0.4rem 0.85rem',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '0.82rem',
              fontWeight: 'bold',
              fontFamily: 'var(--font-maru), sans-serif',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}
          >
            <span>🇯🇵</span>
            <span>Trở về Kiokudō</span>
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <main style={{ flex: 1, backgroundColor: 'var(--bg-color)' }}>
        {children}
      </main>
    </div>
  );
}
