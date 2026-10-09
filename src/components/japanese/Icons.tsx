'use client';

import React from 'react';

// 1. CỔNG TORII (鳥居) - Biểu tượng cổng thiêng
export function ToriiIcon({ size = 24, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Mái cong Kasagi */}
      <path d="M2 5C8 4.2 16 4.2 22 5" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      {/* Xà ngang Shimaki */}
      <path d="M3.5 7.5H20.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      {/* Hai cột trụ Hashira đứng hơi choãi chân */}
      <path d="M6 7.5L5.5 20" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M18 7.5L18.5 20" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      {/* Xà nối giữa Nuki */}
      <path d="M5.7 11H18.3" stroke={color} strokeWidth="1.6" />
      {/* Trụ đỡ trung tâm Gakuzuka */}
      <path d="M12 5V7.5" stroke={color} strokeWidth="2" />
    </svg>
  );
}

// 2. HOA ANH ĐÀO SAKURA (桜)
export function SakuraIcon({ size = 24, color = '#F472B6' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
      <path d="M12 7.5C10.5 4 8 3.5 6.5 5C5 6.5 5.5 9 9 10.5C5.5 12 5 14.5 6.5 16C8 17.5 10.5 17 12 13.5C13.5 17 16 17.5 17.5 16C19 14.5 18.5 12 15 10.5C18.5 9 19 6.5 17.5 5C16 3.5 13.5 4 12 7.5Z" />
      <circle cx="12" cy="10.5" r="1.5" fill="#FFFFFF" />
    </svg>
  );
}

// 3. QUẠT GIẤY SENSU (扇子)
export function SensuFanIcon({ size = 24, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 20L4 10C8 6 16 6 20 10L12 20Z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M12 20L8 8" stroke={color} strokeWidth="1.2" />
      <path d="M12 20V7" stroke={color} strokeWidth="1.2" />
      <path d="M12 20L16 8" stroke={color} strokeWidth="1.2" />
      <circle cx="12" cy="20" r="1.5" fill={color} />
    </svg>
  );
}

// 4. HẠC GIẤY ORIGAMI (折り鶴) - Dùng khi AI Copilot đang phân tích
export function OrizuruIcon({ size = 24, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 3L3 13H10L12 21L14 13H21L12 3Z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M12 3V21" stroke={color} strokeWidth="1.2" strokeDasharray="2 2" />
    </svg>
  );
}

// 5. NÚI PHÚ SĨ (富士山) - Biểu tượng trên Footer
export function FujiMountainIcon({ size = 32, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Mặt trời đỏ Asahi mọc sau núi */}
      <circle cx="16" cy="12" r="6" fill="#D9381E" opacity="0.85" />
      {/* Thân núi Phú Sĩ */}
      <path d="M3 28L11 9H21L29 28H3Z" fill="#3B433E" />
      {/* Tuyết trắng phủ đỉnh núi mấp mô */}
      <path d="M11 9L12.5 13L14 11L16 14L18 11.5L19.5 13L21 9H11Z" fill="#FAF8F5" />
    </svg>
  );
}
