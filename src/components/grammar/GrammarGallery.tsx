'use client';

import React, { useState, useMemo } from 'react';
import { LessonCard } from './LessonCard';
import Link from 'next/link';

interface GrammarPatternSummary {
  id: string;
  lessonId: string;
  patternNumber: number;
  titleJa: string;
  titleVi: string;
  romaji?: string;
  jlptLevel?: string;
  meaning: string;
}

interface GrammarGalleryProps {
  lessons: any[];
  stats: {
    totalLessons: number;
    totalPatterns: number;
    totalCards: number;
    dueCards: number;
    newCards: number;
    reviewCards: number;
  };
  allPatterns?: GrammarPatternSummary[];
}

export function GrammarGallery({ lessons, stats, allPatterns = [] }: GrammarGalleryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLessonFilter, setSelectedLessonFilter] = useState<'all' | string>('all');

  const filteredPatterns = useMemo(() => {
    return allPatterns.filter((p) => {
      if (selectedLessonFilter !== 'all' && p.lessonId !== selectedLessonFilter) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        p.titleJa?.toLowerCase().includes(q) ||
        p.titleVi?.toLowerCase().includes(q) ||
        p.romaji?.toLowerCase().includes(q) ||
        p.meaning?.toLowerCase().includes(q)
      );
    });
  }, [allPatterns, searchQuery, selectedLessonFilter]);

  const displayedLessons = useMemo(() => {
    if (selectedLessonFilter === 'all') return lessons;
    return lessons.filter((l) => l.id === selectedLessonFilter);
  }, [lessons, selectedLessonFilter]);

  const isSearching = searchQuery.trim().length > 0;
  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', paddingBottom: '4rem' }}>
      {/* Hero Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1B4268 0%, #20507B 60%, #15324D 100%)',
          borderRadius: '20px',
          color: '#FFFFFF',
          padding: '2.5rem 2rem',
          position: 'relative',
          overflow: 'hidden',
          marginBottom: '2rem',
          boxShadow: '0 8px 30px rgba(27, 66, 104, 0.25)',
        }}
      >
        {/* Subtle Japanese Watermark in background (VIS-GRAM-02: Safe Viewport Coordinate & Contain) */}
        <div
          style={{
            position: 'absolute',
            right: '1rem',
            bottom: '0',
            fontSize: 'clamp(5rem, 14vw, 7.5rem)',
            fontWeight: 900,
            color: 'rgba(255, 255, 255, 0.06)',
            fontFamily: 'var(--font-mincho, "Shippori Mincho", serif)',
            pointerEvents: 'none',
            userSelect: 'none',
            contain: 'paint',
            maxWidth: '100%',
            lineHeight: 0.9,
          }}
        >
          文法
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.28rem 0.85rem',
              background: 'rgba(255, 255, 255, 0.15)',
              borderRadius: '20px',
              fontSize: '0.78rem',
              fontWeight: 800,
              letterSpacing: '0.12em',
              marginBottom: '0.85rem',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <span>🏮 JPD133 · BUNBOU MASTER ENGINE</span>
          </div>

          {/* VIS-GRAM-01: Authentic Wabi-Sabi Editorial Typography */}
          <h1
            style={{
              fontSize: 'clamp(1.85rem, 4vw, 2.4rem)',
              margin: '0 0 0.5rem',
              fontWeight: 900,
              fontFamily: 'var(--font-mincho, "Shippori Mincho", serif)',
              letterSpacing: '0.02em',
              textShadow: '0 2px 10px rgba(0, 0, 0, 0.35)',
              color: '#FAF8F5',
            }}
          >
            Ngữ Pháp Tiếng Nhật
          </h1>

          <p
            style={{
              fontSize: '0.95rem',
              color: 'rgba(255, 255, 255, 0.9)',
              maxWidth: '620px',
              margin: '0 0 1.75rem',
              lineHeight: 1.6,
            }}
          >
            32 mẫu câu ngữ pháp cốt lõi Bài 8 - 11 Minna no Nihongo kèm 204 bài tập thực hành SBT và thuật toán lặp lại ngắt quãng FSRS.
          </p>

          {/* Quick Metrics Bar (VIS-GRAM-03: Woodblock Stream Progress & Metrics) */}
          <div
            style={{
              display: 'flex',
              gap: '1rem',
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.12)',
                backdropFilter: 'blur(8px)',
                padding: '0.65rem 1.25rem',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                border: '1px solid rgba(255, 255, 255, 0.15)',
              }}
            >
              <span style={{ fontSize: '1.5rem' }}>📚</span>
              <div>
                <div style={{ fontSize: '0.7rem', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cấu trúc</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{stats.totalPatterns} Patterns</div>
              </div>
            </div>

            <div
              style={{
                background: 'rgba(255, 255, 255, 0.12)',
                backdropFilter: 'blur(8px)',
                padding: '0.65rem 1.25rem',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                border: '1px solid rgba(255, 255, 255, 0.15)',
              }}
            >
              <span style={{ fontSize: '1.5rem' }}>✍️</span>
              <div>
                <div style={{ fontSize: '0.7rem', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bài tập SBT</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>204 Bài</div>
              </div>
            </div>

            <div
              style={{
                background: 'rgba(255, 255, 255, 0.12)',
                backdropFilter: 'blur(8px)',
                padding: '0.65rem 1.25rem',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                border: '1px solid rgba(255, 255, 255, 0.15)',
              }}
            >
              <span style={{ fontSize: '1.5rem' }}>⏱️</span>
              <div>
                <div style={{ fontSize: '0.7rem', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>FSRS Cần ôn</div>
                <div
                  style={{
                    fontSize: '1.2rem',
                    fontWeight: 800,
                    color: stats.dueCards > 0 ? '#FFCDD2' : '#C8E6C9',
                  }}
                >
                  {stats.dueCards} Thẻ
                </div>
              </div>
            </div>

            {/* Quick Practice All Button */}
            <Link
              href="/grammar/practice?lessonId=all"
              style={{
                marginLeft: 'auto',
                padding: '0.85rem 1.5rem',
                background: '#FFFFFF',
                color: '#1B4268',
                borderRadius: '12px',
                fontWeight: 800,
                fontSize: '0.95rem',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.15)',
                transition: 'all 0.2s ease',
              }}
            >
              <span>⚡ Luyện tập ngẫu nhiên</span>
            </Link>
          </div>
        </div>
      </div>

      {/* BUNBOU OMNISEARCH & FILTER CONTROL */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          border: '1.5px solid var(--washi-border, #E6E1DA)',
          padding: '1.25rem 1.5rem',
          marginBottom: '2rem',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
        }}
      >
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 280px' }}>
            <span style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1.1rem', color: '#888' }}>
              🔍
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tra cứu 32 mẫu câu ngữ pháp (tiếng Nhật, Romaji, tiếng Việt)..."
              style={{
                width: '100%',
                padding: '0.75rem 2.2rem 0.75rem 2.5rem',
                borderRadius: '10px',
                border: '1.5px solid #D5CFC7',
                background: '#FAF8F5',
                fontSize: '0.95rem',
                color: '#122438',
                fontFamily: 'var(--font-sans)',
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '0.85rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#888',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: 'bold',
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Clear Filter */}
          {(searchQuery || selectedLessonFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedLessonFilter('all');
              }}
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                border: '1px solid #E2E8F0',
                background: '#F1F5F9',
                color: '#475569',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Đặt lại bộ lọc
            </button>
          )}
        </div>

        {/* Lesson Filter Badges */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: '#786A5E', fontWeight: 700, marginRight: '0.25rem' }}>
            LỌC THEO BÀI:
          </span>
          {[
            { id: 'all', label: 'Tất cả bài (32 mẫu)' },
            { id: 'lesson-08', label: 'Bài 8 (Tính từ い/な)' },
            { id: 'lesson-09', label: 'Bài 9 (Sở thích/Hiểu biết)' },
            { id: 'lesson-10', label: 'Bài 10 (Sự tồn tại あります/います)' },
            { id: 'lesson-11', label: 'Bài 11 (Lượng từ/Thời gian)' },
          ].map((chip) => {
            const isSelected = selectedLessonFilter === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => setSelectedLessonFilter(chip.id)}
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: '999px',
                  border: `1.5px solid ${isSelected ? '#1B4268' : '#E6E1DA'}`,
                  background: isSelected ? '#1B4268' : '#FFFFFF',
                  color: isSelected ? '#FFFFFF' : '#4A5568',
                  fontSize: '0.82rem',
                  fontWeight: isSelected ? 800 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  fontFamily: 'var(--font-maru)',
                }}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* IS SEARCHING: INSTANT MATCHING PATTERNS GRID */}
      {isSearching && (
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontFamily: 'var(--font-mincho)', fontSize: '1.25rem', color: '#122438' }}>
              🔍 Kết quả tìm kiếm mẫu câu ({filteredPatterns.length})
            </h3>
            <span style={{ fontSize: '0.85rem', color: '#786A5E' }}>
              Từ khóa: &quot;{searchQuery}&quot;
            </span>
          </div>

          {filteredPatterns.length === 0 ? (
            <div style={{
              background: '#FFFFFF',
              borderRadius: '12px',
              padding: '2.5rem',
              textAlign: 'center',
              border: '1.5px dashed #E6E1DA',
              color: '#786A5E',
            }}>
              <p style={{ margin: 0, fontSize: '1rem' }}>
                Không tìm thấy mẫu câu phù hợp với &quot;<strong>{searchQuery}</strong>&quot;.
              </p>
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: '#9CA3AF' }}>
                Thử tìm theo từ khóa như: &quot;tính từ&quot;, &quot;thích&quot;, &quot;có&quot;, &quot;tồn tại&quot;, hoặc &quot;desu&quot;
              </p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
              gap: '1rem',
            }}>
              {filteredPatterns.map((p) => (
                <div
                  key={p.id}
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '14px',
                    border: '1.5px solid #E6E1DA',
                    padding: '1.25rem',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{
                        fontSize: '0.75rem',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '6px',
                        background: '#EDF4FA',
                        color: '#1B4268',
                        fontWeight: 700,
                        fontFamily: 'var(--font-maru)',
                      }}>
                        {p.lessonId.replace('lesson-', 'Bài ')} · Mẫu {p.patternNumber}
                      </span>
                      <span style={{
                        fontSize: '0.72rem',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '999px',
                        background: '#FEF3C7',
                        color: '#92400E',
                        fontWeight: 800,
                      }}>
                        {p.jlptLevel || 'JLPT N5'}
                      </span>
                    </div>

                    <h4 style={{
                      margin: '0.25rem 0 0.4rem',
                      fontFamily: 'var(--font-mincho)',
                      fontSize: '1.3rem',
                      color: '#122438',
                      fontWeight: 800,
                      lineHeight: 1.25,
                    }}>
                      {p.titleJa}
                    </h4>

                    {p.romaji && (
                      <div style={{ fontSize: '0.8rem', color: '#1B4268', fontFamily: 'var(--font-maru)', marginBottom: '0.35rem' }}>
                        {p.romaji}
                      </div>
                    )}

                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#4A5568', lineHeight: 1.45 }}>
                      {p.meaning || p.titleVi}
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #F1F5F9' }}>
                    <Link
                      href={`/grammar/lesson/${p.lessonId}`}
                      style={{
                        flex: 1,
                        textAlign: 'center',
                        padding: '0.5rem',
                        borderRadius: '8px',
                        background: '#FAF8F5',
                        border: '1px solid #E2E8F0',
                        color: '#1B4268',
                        textDecoration: 'none',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                      }}
                    >
                      Chi tiết bài
                    </Link>
                    <Link
                      href={`/grammar/practice?lessonId=${p.lessonId}&patternId=${p.id}`}
                      style={{
                        flex: 1,
                        textAlign: 'center',
                        padding: '0.5rem',
                        borderRadius: '8px',
                        background: '#1B4268',
                        color: '#FFFFFF',
                        textDecoration: 'none',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                      }}
                    >
                      Luyện tập ⚡
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Lessons Grid Heading */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.25rem',
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: '1.4rem',
            color: '#1F2421',
            fontFamily: 'var(--font-mincho, "Shippori Mincho", serif)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span>🌸 DANH SÁCH BÀI HỌC (JPD133)</span>
        </h2>
        <span style={{ fontSize: '0.85rem', color: '#888' }}>
          {displayedLessons.length} / {lessons.length} Bài hiển thị
        </span>
      </div>

      {/* Grid of Lessons */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.5rem',
        }}
      >
        {displayedLessons.map((lesson) => (
          <LessonCard key={lesson.id} lesson={lesson} />
        ))}
      </div>
    </div>
  );
}
