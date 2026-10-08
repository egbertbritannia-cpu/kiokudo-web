import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '記憶道 · Kiokudo Web',
  description: 'Frontend redesign and migration preview for Kiokudo learning system',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
