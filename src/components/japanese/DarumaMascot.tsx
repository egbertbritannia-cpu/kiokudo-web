'use client';

import React from 'react';

interface DarumaProps {
  progressPercentage: number; // 0 đến 100
  size?: number;
}

export function DarumaMascot({ progressPercentage, size = 64 }: DarumaProps) {
  const isLeftEyeDrawn = progressPercentage >= 50;
  const isRightEyeDrawn = progressPercentage >= 100;

  return (
    <div
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        filter: isRightEyeDrawn ? 'drop-shadow(0 0 12px rgba(245, 158, 11, 0.6))' : 'none',
        transition: 'filter 0.5s ease',
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Thân búp bê màu đỏ Torii */}
        <circle cx="50" cy="54" r="42" fill="#D9381E" />
        <ellipse cx="50" cy="90" rx="30" ry="8" fill="#B82C15" opacity="0.6" />

        {/* Khung mặt bằng giấy Washi */}
        <ellipse cx="50" cy="46" rx="30" ry="24" fill="#FAF8F5" stroke="#E8E2D8" strokeWidth="2" />

        {/* Lông mày hình chim hạc (Tsuru) */}
        <path d="M 28 35 C 34 32, 40 33, 44 37" stroke="#1F2421" strokeWidth="3" strokeLinecap="round" />
        <path d="M 72 35 C 66 32, 60 33, 56 37" stroke="#1F2421" strokeWidth="3" strokeLinecap="round" />

        {/* Hốc mắt trái */}
        <circle cx="36" cy="45" r="7" fill="#FFFFFF" stroke="#1F2421" strokeWidth="2" />
        {/* Lòng đen mắt trái (Đạt 50%) */}
        {isLeftEyeDrawn && (
          <circle cx="36" cy="45" r="4.5" fill="#1F2421" />
        )}

        {/* Hốc mắt phải */}
        <circle cx="64" cy="45" r="7" fill="#FFFFFF" stroke="#1F2421" strokeWidth="2" />
        {/* Lòng đen mắt phải (Đạt 100%) */}
        {isRightEyeDrawn && (
          <circle cx="64" cy="45" r="4.5" fill="#1F2421" />
        )}

        {/* Ria mép hình rùa (Kame) */}
        <path d="M 40 56 Q 50 62 60 56" stroke="#1F2421" strokeWidth="3.5" strokeLinecap="round" fill="none" />

        {/* Chữ Hán 'Phúc' (福) mạ vàng trước bụng */}
        <text
          x="50"
          y="82"
          textAnchor="middle"
          fill="#F59E0B"
          fontSize="14"
          fontWeight="bold"
          fontFamily="serif"
        >
          福
        </text>
      </svg>
    </div>
  );
}
