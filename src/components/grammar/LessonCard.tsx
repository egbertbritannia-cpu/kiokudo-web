'use client';

import React from 'react';
import Link from 'next/link';

interface LessonCardProps {
  lesson: {
    id: string;
    lessonNumber: number;
    titleJa: string;
    titleVi: string;
    themeJa?: string;
    themeVi?: string;
    patternRange: string;
    patternCount: number;
    accentColor: string;
    wagara?: string;
    inkanChar?: string;
    description: string;
    stats?: {
      totalCards: number;
      dueCards: number;
      newCards: number;
      masteryRate: number;
    };
  };
}

export function LessonCard({ lesson }: LessonCardProps) {
  const accent = lesson.accentColor || '#1B4268';
  const dueCount = lesson.stats?.dueCards || 0;
  const newCount = lesson.stats?.newCards || 0;

  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: '16px',
        border: '1.5px solid var(--washi-border, #E6E1DA)',
        overflow: 'hidden',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'all 0.25s ease',
      }}
    >
      {/* Top Accent Strip with Inkan */}
      <div
        style={{
          background: accent,
          color: '#FFFFFF',
          padding: '1.25rem 1.5rem',
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <span
              style={{
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                opacity: 0.85,
                fontWeight: 700,
              }}
            >
              GIÁO TRÌNH JPD133
            </span>
            <h3
              style={{
                margin: '0.35rem 0 0',
                fontSize: '1.35rem',
                fontWeight: 900,
                fontFamily: 'var(--font-mincho, "Shippori Mincho", serif)',
              }}
            >
              {lesson.titleJa}
            </h3>
          </div>

          {/* Hanko Stamp */}
          <div
            style={{
              width: '42px',
              height: '42px',
              border: '2.5px solid #FFCDD2',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontWeight: 900,
              fontSize: '1.25rem',
              fontFamily: 'var(--font-mincho, serif)',
              background: 'rgba(217, 56, 30, 0.65)',
              boxShadow: 'inset 0 0 6px rgba(0,0,0,0.2)',
              transform: 'rotate(-5deg)',
            }}
          >
            {lesson.inkanChar || lesson.lessonNumber}
          </div>
        </div>

        <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              padding: '0.2rem 0.6rem',
              borderRadius: '12px',
              fontSize: '0.75rem',
              fontWeight: 600,
            }}
          >
            Mẫu {lesson.patternRange}
          </span>
          <span
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              padding: '0.2rem 0.6rem',
              borderRadius: '12px',
              fontSize: '0.75rem',
              fontWeight: 600,
            }}
          >
            {lesson.patternCount} Cấu trúc
          </span>
        </div>
      </div>

      {/* Body Content */}
      <div style={{ padding: '1.25rem 1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h4
          style={{
            margin: '0 0 0.5rem',
            fontSize: '1.05rem',
            color: '#1F2421',
            fontWeight: 700,
          }}
        >
          {lesson.titleVi}
        </h4>

        <p
          style={{
            fontSize: '0.875rem',
            color: '#666',
            lineHeight: 1.5,
            flex: 1,
            margin: '0 0 1rem',
          }}
        >
          {lesson.description}
        </p>

        {/* FSRS Stats Pills */}
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            marginBottom: '1.25rem',
            padding: '0.65rem 0.85rem',
            background: '#F9F8F6',
            borderRadius: '8px',
            border: '1px solid #ECE8E1',
          }}
        >
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '0.7rem', color: '#888', fontWeight: 600 }}>CẦN ÔN (DUE)</div>
            <div
              style={{
                fontSize: '1.1rem',
                fontWeight: 800,
                color: dueCount > 0 ? '#D9381E' : '#2B6B3D',
              }}
            >
              {dueCount}
            </div>
          </div>
          <div style={{ width: '1px', background: '#E6E1DA' }} />
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '0.7rem', color: '#888', fontWeight: 600 }}>MỚI (NEW)</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1B4268' }}>
              {newCount}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.65rem' }}>
          <Link
            href={`/grammar/${lesson.id}`}
            style={{
              flex: 1,
              padding: '0.65rem',
              borderRadius: '8px',
              border: `1.5px solid ${accent}`,
              color: accent,
              background: '#FFFFFF',
              fontWeight: 700,
              fontSize: '0.85rem',
              textAlign: 'center',
              textDecoration: 'none',
              transition: 'background 0.15s ease',
            }}
          >
            Học mẫu câu
          </Link>
          <Link
            href={`/grammar/practice?lessonId=${lesson.id}`}
            style={{
              flex: 1,
              padding: '0.65rem',
              borderRadius: '8px',
              background: accent,
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '0.85rem',
              textAlign: 'center',
              textDecoration: 'none',
              boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
            }}
          >
            Luyện bài tập
          </Link>
        </div>
      </div>
    </div>
  );
}
