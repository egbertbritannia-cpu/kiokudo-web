import type { Metadata } from 'next';
import { Zen_Maru_Gothic, Shippori_Mincho, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { KiokudoNavBar } from '@/components/navigation/KiokudoNavBar';

const zenMaru = Zen_Maru_Gothic({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-maru',
  preload: true,
  fallback: ['system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
});

const shipporiMincho = Shippori_Mincho({
  weight: ['500', '700', '800'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mincho',
  preload: false,
  fallback: ['Hiragino Mincho ProN', 'Yu Mincho', 'Georgia', 'serif'],
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
  preload: true,
});

export const metadata: Metadata = {
  title: '記憶道 Kiokudo Studio',
  description: 'Hệ thống học tiếng Nhật qua giáo trình JPD133, Dò bài, ngữ pháp và nghệ thuật văn hóa Wabi-Sabi',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="vi"
      className={`${zenMaru.variable} ${shipporiMincho.variable} ${plusJakarta.variable}`}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* The user-provided Albion reference uses these exact English fonts. */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@300;400;500;600&family=Cormorant+Garamond:ital,wght@0,500;0,700;1,500&display=swap" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#17130E" />
      </head>
      <body>
        {/* Phase 4: service worker and telemetry remain unmounted until backend endpoint parity. */}

        {/* THANH ĐIỀU HƯỚNG KIOKUDO STUDIO (COPY Y CHANG KIOKUDO-STUDIO.HTML) */}
        <KiokudoNavBar />

        {/* NỘI DUNG CHÍNH (MAIN APP VIEWPORT) */}
        <main id="app">
          {children}
        </main>
      </body>
    </html>
  );
}
