'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { JapaneseArtBackdrop } from '@/components/art/JapaneseArtBackdrop';
import { ToriiIcon, OrizuruIcon } from '@/components/japanese/Icons';

/**
 * Trang thông báo: Hệ thống Quản lý Dữ liệu Tập trung
 * Chức năng thêm thẻ thủ công đã được lược bỏ theo yêu cầu quy trình
 * Toàn bộ dữ liệu được bóc tách và đưa trực tiếp vào cơ sở dữ liệu.
 */
export default function NewCardPage() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push('/cards');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  return (
    <div
      style={{
        position: 'relative',
        minHeight: 'calc(100vh - 120px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.25rem',
      }}
    >
      <JapaneseArtBackdrop
        src="/assets/art/vintage-woodblock-border.webp"
        alt="Họa tiết mộc bản Phù Tang"
        opacity={0.06}
        blendMode="multiply"
      />

      <div
        style={{
          position: 'relative',
          zIndex: 10,
          maxWidth: '620px',
          width: '100%',
          background: 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1.5px solid #E8E2D8',
          borderRadius: '20px',
          padding: '2.5rem 2rem',
          boxShadow: '0 20px 48px rgba(31, 36, 33, 0.08)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(32, 80, 123, 0.1) 0%, rgba(200, 155, 88, 0.15) 100%)',
            border: '1.5px solid rgba(32, 80, 123, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
          }}
        >
          <OrizuruIcon size={32} color="#20507B" />
        </div>

        <span
          style={{
            display: 'inline-block',
            fontSize: '0.82rem',
            fontFamily: 'var(--font-mincho)',
            fontWeight: 800,
            color: '#8C6B3E',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            marginBottom: '0.5rem',
          }}
        >
          中央データ管理 · QUẢN LÝ DỮ LIỆU TẬP TRUNG
        </span>

        <h1
          style={{
            fontSize: '1.75rem',
            fontFamily: 'var(--font-mincho)',
            fontWeight: 900,
            color: '#1F2421',
            marginBottom: '1rem',
            lineHeight: 1.3,
          }}
        >
          Dữ liệu Thẻ được Nạp Tự Động
        </h1>

        <p
          style={{
            fontSize: '0.95rem',
            color: '#555F58',
            lineHeight: 1.65,
            marginBottom: '1.75rem',
            fontFamily: 'var(--font-maru)',
          }}
        >
          Toàn bộ tài liệu giáo trình (Minna no Nihongo, JPD133, Hán tự, Ngữ pháp) được xử lý, bóc tách và đồng bộ trực tiếp vào cơ sở dữ liệu qua hệ thống quản lý tập trung. Chức năng tạo thẻ thủ công đã được vô hiệu hóa để tối ưu hóa tính nhất quán.
        </p>

        <div
          style={{
            background: '#FAF8F5',
            border: '1px solid #EAE3D5',
            borderRadius: '12px',
            padding: '0.85rem 1.25rem',
            marginBottom: '2rem',
            fontSize: '0.85rem',
            color: '#717C75',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
          }}
        >
          <span>⏳</span>
          <span>
            Tự động chuyển hướng về Thư viện thẻ sau <strong>{countdown}s</strong>...
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '1rem',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          <Link
            href="/cards"
            className="btn-torii"
            style={{
              padding: '0.75rem 1.75rem',
              fontSize: '0.92rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              textDecoration: 'none',
            }}
          >
            <ToriiIcon size={18} color="#FFFFFF" />
            <span>Đến Thư viện Thẻ ngay</span>
          </Link>

          <Link
            href="/review"
            style={{
              padding: '0.75rem 1.5rem',
              fontSize: '0.92rem',
              background: '#FFFFFF',
              border: '1.5px solid #D8CFC0',
              borderRadius: '10px',
              color: '#1F2421',
              fontWeight: 700,
              fontFamily: 'var(--font-maru)',
              textDecoration: 'none',
              transition: 'all 0.2s',
            }}
          >
            Ôn tập FSRS
          </Link>
        </div>
      </div>
    </div>
  );
}
