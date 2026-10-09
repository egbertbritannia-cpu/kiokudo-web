'use client';

import React, { useState } from 'react';
import { GrammarPattern } from '@/core/grammar/grammar.types';
import { StructureDiagram } from './StructureDiagram';
import { JapaneseSpeakerButton } from '@/components/japanese/JapaneseSpeakerButton';
import { parseClozeSegments } from '@/lib/cloze';
import Link from 'next/link';

interface PatternCardProps {
  pattern: GrammarPattern;
  accentColor?: string;
  defaultExpanded?: boolean;
}

export function PatternCard({ pattern, accentColor = '#1B4268', defaultExpanded = false }: PatternCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Helper render furigana text if bracket format is present: 漢字[かんじ]
  const renderFurigana = (furiText: string) => {
    if (!furiText) return null;
    const parts = furiText.split(/([^\s]+?\[[^\]]+?\])/g);
    return parts.map((part, idx) => {
      const match = part.match(/^(.+?)\[(.+?)\]$/);
      if (match) {
        return (
          <ruby key={idx} style={{ rubyPosition: 'over' }}>
            {match[1]}
            <rt style={{ fontSize: '0.65em', color: '#88A752', fontWeight: 600 }}>{match[2]}</rt>
          </ruby>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  return (
    <div
      style={{
        background: '#FFFFFF',
        border: `1.5px solid var(--washi-border, #E6E1DA)`,
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 4px 16px rgba(18, 36, 56, 0.05)',
        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        marginBottom: 'clamp(1rem, 2.5vw, 1.5rem)',
      }}
    >
      {/* Pattern Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          padding: 'clamp(1rem, 2.5vw, 1.5rem)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          background: isExpanded ? 'rgba(27, 66, 104, 0.03)' : '#FFFFFF',
          borderBottom: isExpanded ? '1px solid var(--washi-border, #E6E1DA)' : 'none',
          transition: 'background 0.2s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(0.65rem, 2vw, 1rem)' }}>
          <div
            style={{
              background: accentColor,
              color: '#FFFFFF',
              padding: '0.35rem 0.75rem',
              borderRadius: '8px',
              fontWeight: 800,
              fontSize: '0.85rem',
              letterSpacing: '0.05em',
              fontFamily: 'var(--font-mono, monospace)',
              boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
            }}
          >
            P.{pattern.patternNumber}
          </div>
          <div>
            <div
              style={{
                fontSize: 'clamp(1.1rem, 2.8vw, 1.35rem)',
                fontWeight: 800,
                color: '#1F2421',
                fontFamily: 'var(--font-mincho, "Shippori Mincho", serif)',
              }}
            >
              {pattern.patternTemplate}
            </div>
            <div
              style={{
                fontSize: '0.88rem',
                color: '#666',
                marginTop: '0.2rem',
                fontFamily: 'var(--font-maru, sans-serif)',
              }}
            >
              {pattern.meaningVi}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span
            style={{
              padding: '0.25rem 0.65rem',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 800,
              background: '#E8F4E8',
              color: '#2B6B3D',
              border: '1px solid #C8E6C9',
            }}
          >
            {pattern.jlptLevel}
          </span>
          <span
            style={{
              color: '#8B7B6D',
              fontSize: '0.95rem',
              transform: isExpanded ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            ▼
          </span>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div style={{ padding: 'clamp(1.2rem, 3.5vw, 2rem)', background: '#FAFAF9' }}>
          {/* Structure Diagram */}
          <div style={{ marginBottom: '1.5rem' }}>
            <StructureDiagram template={pattern.patternTemplate} slots={pattern.structureSlots} />
          </div>

          {/* Usage Note */}
          {pattern.usageNote && (
            <div
              style={{
                padding: '1rem 1.25rem',
                background: '#FFFFFF',
                borderRadius: '12px',
                borderLeft: `4px solid ${accentColor}`,
                borderTop: '1px solid #ECE8E1',
                borderRight: '1px solid #ECE8E1',
                borderBottom: '1px solid #ECE8E1',
                fontSize: '0.92rem',
                lineHeight: 1.65,
                color: '#2C3E50',
                marginBottom: '1.5rem',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
              }}
            >
              <div style={{ fontWeight: 800, color: accentColor, marginBottom: '0.4rem', fontSize: '0.82rem', letterSpacing: '0.04em' }}>
                💡 GIẢI THÍCH SƯ PHẠM & CÁCH DÙNG
              </div>
              {pattern.usageNote}
            </div>
          )}

          {/* Canonical & Application Examples */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div
              style={{
                fontSize: '0.82rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                color: '#8B7B6D',
                marginBottom: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                letterSpacing: '0.05em',
              }}
            >
              <span>🎋 CÂU VÍ DỤ MINH HỌA (EXAMPLES)</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {(pattern.examples || []).map((ex, idx) => {
                const isCanonical = idx === 0;
                return (
                  <div
                    key={idx}
                    style={{
                      background: '#FFFFFF',
                      border: `1.2px solid ${isCanonical ? '#F0D5D2' : '#D8E8DC'}`,
                      borderRadius: '12px',
                      padding: '1rem 1.25rem',
                      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)',
                      position: 'relative',
                    }}
                  >
                    {/* VIS-GRAM-06: Dual Wabi-Sabi Badge */}
                    <div style={{ marginBottom: '0.65rem' }}>
                      {isCanonical ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '6px',
                            background: '#FFF2F0',
                            color: '#C83824',
                            border: '1px solid #F5C6CB',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            fontFamily: 'var(--font-maru, sans-serif)',
                          }}
                        >
                          🏮 Mẫu chuẩn giáo trình JPD133
                        </span>
                      ) : (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '6px',
                            background: '#F0F9F2',
                            color: '#2A6B3D',
                            border: '1px solid #C3E6CB',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            fontFamily: 'var(--font-maru, sans-serif)',
                          }}
                        >
                          🌿 Câu mở rộng giao tiếp
                        </span>
                      )}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: '0.75rem',
                      }}
                    >
                      <div
                        style={{
                          fontSize: 'clamp(1.05rem, 2.5vw, 1.2rem)',
                          lineHeight: 1.8,
                          color: '#1F2421',
                          fontFamily: 'var(--font-mincho, "Shippori Mincho", serif)',
                        }}
                      >
                        {renderFurigana(ex.furigana) || ex.ja}
                      </div>
                      <JapaneseSpeakerButton text={ex.ja} size={18} />
                    </div>

                    {ex.romaji && (
                      <div style={{ fontSize: '0.82rem', color: '#888', fontStyle: 'italic', marginTop: '0.25rem', fontFamily: 'var(--font-mono, monospace)' }}>
                        {ex.romaji}
                      </div>
                    )}

                    <div style={{ fontSize: '0.92rem', color: '#2B6B3D', fontWeight: 600, marginTop: '0.35rem' }}>
                      {ex.vi}
                    </div>

                    {ex.contextNote && (
                      <div style={{ fontSize: '0.78rem', color: '#777', marginTop: '0.35rem', background: '#F9F8F6', padding: '0.35rem 0.65rem', borderRadius: '6px' }}>
                        📌 {ex.contextNote}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Practice Link */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
            <Link
              href={`/grammar/practice?lessonId=${pattern.lessonId}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1.25rem',
                background: accentColor,
                color: '#FFFFFF',
                borderRadius: '10px',
                fontSize: '0.88rem',
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 3px 10px rgba(0,0,0,0.12)',
                transition: 'all 0.2s ease',
              }}
            >
              <span>Luyện tập mẫu câu này ➔</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
