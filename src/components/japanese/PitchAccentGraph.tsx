'use client';

import React from 'react';

interface PitchAccentGraphProps {
  reading: string;
  pattern: number; // 0: Heiban, 1: Atamadaka, 2: Nakadaka, 3: Odaka
}

/**
 * Trực quan hóa cao độ ngữ âm Tokyo Pitch Accent (東京式アクセント)
 * Giúp người học ghi nhớ trực quan âm vực cao/thấp của từng âm tiết (Mora)
 */
export function PitchAccentGraph({ reading, pattern }: PitchAccentGraphProps) {
  // Chỉ vẽ đồ thị cao độ nếu chuỗi là từ đơn thuần Kana (Hiragana / Katakana), không chứa ký tự đặc biệt, dấu phẩy, ngoặc đơn
  const trimmed = reading ? reading.trim() : '';
  const isPureKanaWord = /^[\u3040-\u309F\u30A0-\u30FF\u30FC]+$/.test(trimmed);
  if (!trimmed || !isPureKanaWord) return null;

  // Tách các mora cơ bản (xử lý âm ghép ゃ, ゅ, ょ, ゎ)
  const moras: string[] = [];
  const chars = Array.from(trimmed);
  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    const next = chars[i + 1];
    if (next && ['ゃ', 'ゅ', 'ょ', 'ぁ', 'ぃ', 'ぅ', 'ぇ', 'ぉ', 'ゎ', 'ャ', 'ュ', 'ョ'].includes(next)) {
      moras.push(char + next);
      i++;
    } else {
      moras.push(char);
    }
  }

  if (moras.length === 0) return null;

  // Tính toán mức cao độ (High = 1, Low = 0) cho từng mora theo quy tắc Tokyo:
  // - Pattern 0 (Heiban): Mora 1 Low, các Mora tiếp theo High.
  // - Pattern 1 (Atamadaka): Mora 1 High, các Mora tiếp theo Low.
  // - Pattern 2 (Nakadaka): Mora 1 Low, Mora 2 High, Mora 3+ Low.
  // - Pattern 3 (Odaka): Mora 1 Low, Mora 2..N High (hạ ở trợ từ).
  const pitchLevels: number[] = moras.map((_, idx) => {
    if (pattern === 1) {
      return idx === 0 ? 1 : 0;
    }
    if (pattern === 0) {
      return idx === 0 ? 0 : 1;
    }
    if (pattern === 2) {
      return idx === 1 ? 1 : 0;
    }
    // Pattern 3 (Odaka) hoặc lớn hơn
    return idx === 0 ? 0 : 1;
  });

  const patternName =
    pattern === 0
      ? 'Heiban (平板 - Bằng phẳng)'
      : pattern === 1
      ? 'Atamadaka (頭高 - Cao đầu)'
      : pattern === 2
      ? 'Nakadaka (中高 - Cao giữa)'
      : 'Odaka (尾高 - Cao đuôi)';

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '0.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
        {moras.map((mora, idx) => {
          const isHigh = pitchLevels[idx] === 1;
          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                minWidth: '22px',
              }}
            >
              {/* Điểm nút cao độ (Pitch dot) */}
              <div
                style={{
                  height: '18px',
                  display: 'flex',
                  alignItems: isHigh ? 'flex-start' : 'flex-end',
                }}
              >
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: isHigh ? '#D9381E' : '#88A752',
                    boxShadow: isHigh
                      ? '0 0 4px rgba(217, 56, 30, 0.4)'
                      : '0 0 4px rgba(136, 167, 82, 0.4)',
                    transition: 'all 0.3s ease',
                  }}
                  title={isHigh ? 'Cao độ: Cao (High)' : 'Cao độ: Thấp (Low)'}
                />
              </div>

              {/* Ký tự Mora */}
              <span
                style={{
                  fontFamily: 'var(--font-maru)',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  color: isHigh ? 'var(--torii-red)' : 'var(--sumi-charcoal)',
                  marginTop: '0.15rem',
                }}
              >
                {mora}
              </span>
            </div>
          );
        })}
      </div>

      <span style={{ fontSize: '0.72rem', color: 'var(--sumi-faded)' }}>
        📍 Mẫu [{pattern}]: {patternName}
      </span>
    </div>
  );
}
