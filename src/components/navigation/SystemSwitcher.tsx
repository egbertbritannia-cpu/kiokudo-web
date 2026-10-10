'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IELTS_HOME, JAPANESE_HOME, isIeltsPath } from '@/lib/system-routes';

/** Shared, icon-only system switcher mounted within each system's navbar. */
export function SystemSwitcher() {
  const english = isIeltsPath(usePathname());
  const label = english
    ? 'Chuyển sang hệ thống tiếng Nhật · Kiokudo'
    : 'Switch to English · Albion IELTS';

  return (
    <Link
      href={english ? JAPANESE_HOME : IELTS_HOME}
      prefetch={false}
      className={`system-switcher${english ? ' system-switcher--english' : ''}`}
      aria-label={label}
      title={label}
      data-testid="system-switcher"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width="21"
        height="21"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M6.7 9h10.6m-3-3 3 3-3 3M17.3 15H6.7m3-3-3 3 3 3" />
      </svg>
    </Link>
  );
}

export default SystemSwitcher;
