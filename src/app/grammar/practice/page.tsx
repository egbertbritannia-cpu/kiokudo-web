'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { GrammarExercise } from '@/core/grammar/grammar.types';
import { parseClozeSegments } from '@/lib/cloze';
import { JapaneseSpeakerButton } from '@/components/japanese/JapaneseSpeakerButton';
import Link from 'next/link';

interface AnswerRecord {
  exerciseId: string;
  selectedOption: string;
  correctOption: string;
  isCorrect: boolean;
  questionSentence: string;
  explanationVi: string;
  explanationJa?: string;
  selectedText: string;
  correctText: string;
}

function PracticeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const lessonId = searchParams.get('lessonId') || 'all';

  const [exercises, setExercises] = useState<GrammarExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [records, setRecords] = useState<AnswerRecord[]>([]);
  const [showMistakesView, setShowMistakesView] = useState(false);

  useEffect(() => {
    async function fetchQueue() {
      try {
        setLoading(true);
        const res = await fetch(`/api/backend/api/v1/grammar/practice?lessonId=${encodeURIComponent(lessonId)}&limit=15`, { cache: 'no-store' });
        if(!res.ok)throw new Error('Grammar staging API unavailable');
        const data = await res.json();
        const loadedExercises: GrammarExercise[] = data.exercises || [];
        setExercises(loadedExercises);

        // Khôi phục bản nháp phiên luyện tập từ sessionStorage (DEF-UI-PRAC-003)
        try {
          const saved = sessionStorage.getItem(`bunbou_drill_${lessonId}`);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.currentIndex !== undefined && parsed.currentIndex < loadedExercises.length) {
              setCurrentIndex(parsed.currentIndex);
            }
            if (parsed.correctCount !== undefined) {
              setCorrectCount(parsed.correctCount);
            }
            if (Array.isArray(parsed.records)) {
              setRecords(parsed.records);
            }
          }
        } catch {}
      } catch (err) {
        console.error('Failed to load grammar exercises:', err);
        setLoadError('Không tải được bài tập từ staging.');
      } finally {
        setLoading(false);
      }
    }
    fetchQueue();
  }, [lessonId]);

  // Tự động lưu tiến trình phiên vào sessionStorage
  useEffect(() => {
    if (exercises.length > 0 && !isComplete) {
      try {
        sessionStorage.setItem(
          `bunbou_drill_${lessonId}`,
          JSON.stringify({
            currentIndex,
            correctCount,
            records,
          })
        );
      } catch {}
    } else if (isComplete) {
      try {
        sessionStorage.removeItem(`bunbou_drill_${lessonId}`);
      } catch {}
    }
  }, [currentIndex, correctCount, records, isComplete, exercises.length, lessonId]);

  const current = exercises[currentIndex];
  const total = exercises.length;
  const progressPercent = total > 0 ? Math.round(((currentIndex) / total) * 100) : 0;

  const handleSelectOption = async (optionKey: 'A' | 'B' | 'C' | 'D') => {
    if (isAnswered || !current) return;

    setSelectedOption(optionKey);
    setIsAnswered(true);

    const isCorrect = optionKey === current.correctOption;
    if (isCorrect) {
      setCorrectCount(prev => prev + 1);
    }

    const optMap: Record<string, string> = {
      A: current.optionA || '',
      B: current.optionB || '',
      C: current.optionC || '',
      D: current.optionD || '',
    };

    const correctOpt = current.correctOption || 'A';
    const sentenceText = current.sentenceWithCloze || current.question || current.promptText || '';

    const newRecord: AnswerRecord = {
      exerciseId: current.id,
      selectedOption: optionKey,
      correctOption: correctOpt,
      isCorrect,
      questionSentence: sentenceText,
      explanationVi: current.explanationVi || '',
      explanationJa: current.explanationJa || '',
      selectedText: optMap[optionKey] || optionKey,
      correctText: optMap[correctOpt] || correctOpt,
    };
    setRecords(prev => [...prev.filter(r => r.exerciseId !== current.id), newRecord]);

    // Local practice only. No server FSRS or synthetic-card writes in Phase 4B.
  };

  const handleNext = () => {
    if (currentIndex + 1 < total) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      setIsComplete(true);
    }
  };

  // Keyboard shortcut listener (VIS-PRAC-01)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (!isAnswered && !isComplete && current) {
        if (e.key === '1' || e.key === 'a' || e.key === 'A') {
          e.preventDefault();
          handleSelectOption('A');
        } else if (e.key === '2' || e.key === 'b' || e.key === 'B') {
          e.preventDefault();
          handleSelectOption('B');
        } else if (e.key === '3' || e.key === 'c' || e.key === 'C') {
          e.preventDefault();
          handleSelectOption('C');
        } else if (e.key === '4' || e.key === 'd' || e.key === 'D') {
          e.preventDefault();
          handleSelectOption('D');
        }
      } else if (isAnswered && !isComplete) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') {
          e.preventDefault();
          handleNext();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAnswered, isComplete, current, currentIndex, total]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#8B7B6D' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '1rem', animation: 'pulse 1.5s infinite' }}>🎋</div>
        <div style={{ fontSize: '1.15rem', fontWeight: 700, fontFamily: 'var(--font-mincho, serif)' }}>
          Đang chuẩn bị bộ câu hỏi ngữ pháp...
        </div>
      </div>
    );
  }

  if (exercises.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem', maxWidth: '500px', margin: '0 auto' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🌸</div>
        <h2 style={{ fontSize: '1.4rem', color: '#1F2421', marginBottom: '0.5rem', fontFamily: 'var(--font-mincho, serif)' }}>
          Chưa có câu hỏi nào
        </h2>
        <p style={{ color: '#666', marginBottom: '1.5rem', fontSize: '0.92rem' }}>
          {loadError || 'Hiện chưa có bài tập nào khả dụng cho mục đã chọn.'}
        </p>
        <Link
          href="/grammar"
          style={{
            padding: '0.75rem 1.5rem',
            background: '#1B4268',
            color: '#FFFFFF',
            borderRadius: '10px',
            textDecoration: 'none',
            fontWeight: 700,
            boxShadow: '0 3px 10px rgba(27,66,104,0.2)',
          }}
        >
          Quay lại danh sách bài học
        </Link>
      </div>
    );
  }

  // Completion Screen (VIS-PRAC-04)
  if (isComplete) {
    const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    const isMastered = accuracy >= 80;
    const mistakes = records.filter(r => !r.isCorrect);

    const handleRedrillMistakes = () => {
      const missedIds = new Set(mistakes.map(m => m.exerciseId));
      const filtered = exercises.filter(ex => missedIds.has(ex.id));
      if (filtered.length > 0) {
        setExercises(filtered);
        setCurrentIndex(0);
        setSelectedOption(null);
        setIsAnswered(false);
        setCorrectCount(0);
        setIsComplete(false);
        setRecords([]);
      }
    };

    return (
      <div
        style={{
          maxWidth: '580px',
          margin: '2rem auto',
          background: '#FFFFFF',
          borderRadius: '24px',
          padding: 'clamp(2rem, 5vw, 3rem) clamp(1.5rem, 4vw, 2.5rem)',
          textAlign: 'center',
          boxShadow: '0 12px 40px rgba(18, 36, 56, 0.1)',
          border: '1.5px solid var(--washi-border, #E6E1DA)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Hanko Celebration Stamp */}
        <div
          style={{
            position: 'absolute',
            top: '1.5rem',
            right: '1.5rem',
            width: '64px',
            height: '64px',
            border: '2.5px solid #C83824',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#C83824',
            fontWeight: 900,
            fontSize: '1rem',
            fontFamily: 'var(--font-mincho, serif)',
            transform: 'rotate(-12deg)',
            opacity: 0.85,
            boxShadow: 'inset 0 0 6px rgba(200, 56, 36, 0.2)',
          }}
        >
          {isMastered ? '大当り' : '精進'}
        </div>

        <div style={{ fontSize: '3.5rem', marginBottom: '0.75rem' }}>
          {isMastered ? '🌸' : '🎋'}
        </div>
        <h2
          style={{
            fontSize: 'clamp(1.5rem, 3.5vw, 1.85rem)',
            fontWeight: 900,
            color: '#1B4268',
            fontFamily: 'var(--font-mincho, "Shippori Mincho", serif)',
            margin: '0 0 0.5rem',
          }}
        >
          HOÀN THÀNH PHIÊN LUYỆN TẬP!
        </h2>
        <p style={{ color: '#666', fontSize: '0.95rem', margin: '0 0 1.75rem', fontFamily: 'var(--font-maru, sans-serif)' }}>
          Bạn đã hoàn thành toàn bộ bài tập ngữ pháp trong phiên này.
        </p>

        {/* Score Badge */}
        <div
          style={{
            background: isMastered ? 'rgba(42, 107, 61, 0.06)' : 'rgba(27, 66, 104, 0.05)',
            border: `2px solid ${isMastered ? '#2A6B3D' : '#1B4268'}`,
            borderRadius: '18px',
            padding: '1.5rem',
            marginBottom: '1.5rem',
            boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ fontSize: '0.82rem', color: '#888', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            TỶ LỆ CHÍNH XÁC (ACCURACY)
          </div>
          <div
            style={{
              fontSize: '3rem',
              fontWeight: 900,
              color: isMastered ? '#2A6B3D' : '#1B4268',
              margin: '0.35rem 0',
              fontFamily: 'var(--font-mono, monospace)',
            }}
          >
            {accuracy}%
          </div>
          <div style={{ fontSize: '0.95rem', color: isMastered ? '#2A6B3D' : '#1B4268', fontWeight: 700 }}>
            {correctCount} / {total} câu trả lời đúng
          </div>
        </div>

        {/* Mistakes Review Drawer / Accordion (DEF-UI-PRAC-009) */}
        {mistakes.length > 0 && (
          <div style={{ marginBottom: '1.75rem', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setShowMistakesView(!showMistakesView)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#C83824',
                  fontWeight: 800,
                  fontSize: '0.92rem',
                  fontFamily: 'var(--font-maru)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: 0,
                }}
              >
                <span>{showMistakesView ? '▼ Đóng rà soát' : '▶ Rà soát'} {mistakes.length} câu làm sai</span>
              </button>

              <button
                type="button"
                onClick={handleRedrillMistakes}
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: '8px',
                  background: '#FFF2F0',
                  border: '1.2px solid #FCA5A5',
                  color: '#991B1B',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-maru)',
                  transition: 'all 0.2s',
                }}
              >
                ⚡ Luyện lại các câu sai ({mistakes.length})
              </button>
            </div>

            {showMistakesView && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem',
                maxHeight: '340px',
                overflowY: 'auto',
                padding: '0.75rem',
                background: '#FAF8F5',
                borderRadius: '14px',
                border: '1.5px solid #E6E1DA',
              }}>
                {mistakes.map((m, idx) => (
                  <div
                    key={m.exerciseId}
                    style={{
                      background: '#FFFFFF',
                      borderRadius: '10px',
                      padding: '0.85rem 1rem',
                      border: '1px solid #E6DDCF',
                      fontSize: '0.88rem',
                    }}
                  >
                    <div style={{ fontFamily: 'var(--font-mincho)', fontSize: '1rem', fontWeight: 700, color: '#122438', marginBottom: '0.45rem' }}>
                      {idx + 1}. {m.questionSentence}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.45rem' }}>
                      <span style={{ color: '#991B1B', background: '#FEE2E2', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 600 }}>
                        Đã chọn: [{m.selectedOption}] {m.selectedText} ✕
                      </span>
                      <span style={{ color: '#166534', background: '#DCFCE7', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 700 }}>
                        Đúng: [{m.correctOption}] {m.correctText} ✓
                      </span>
                    </div>
                    {m.explanationVi && (
                      <div style={{ fontSize: '0.82rem', color: '#4B5563', lineHeight: 1.45 }}>
                        💡 <strong>Giải thích:</strong> {m.explanationVi}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            href="/grammar"
            style={{
              flex: 1,
              minWidth: '160px',
              padding: '0.85rem 1.25rem',
              borderRadius: '12px',
              border: '1.5px solid #1B4268',
              color: '#1B4268',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: '0.92rem',
              textAlign: 'center',
            }}
          >
            ← Danh sách bài học
          </Link>
          <button
            onClick={() => {
              setCurrentIndex(0);
              setSelectedOption(null);
              setIsAnswered(false);
              setCorrectCount(0);
              setIsComplete(false);
              setRecords([]);
            }}
            style={{
              flex: 1,
              minWidth: '160px',
              padding: '0.85rem 1.25rem',
              borderRadius: '12px',
              background: '#1B4268',
              color: '#FFFFFF',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.92rem',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(27, 66, 104, 0.25)',
              transition: 'all 0.2s ease',
            }}
          >
            Luyện tập lại ➔
          </button>
        </div>
      </div>
    );
  }

  const options: Array<{ key: 'A' | 'B' | 'C' | 'D'; text: string; num: number }> = [
    { key: 'A' as const, text: current.optionA || '', num: 1 },
    { key: 'B' as const, text: current.optionB || '', num: 2 },
    { key: 'C' as const, text: current.optionC || '', num: 3 },
    { key: 'D' as const, text: current.optionD || '', num: 4 },
  ].filter((opt): opt is { key: 'A' | 'B' | 'C' | 'D'; text: string; num: number } => !!opt.text);

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', paddingBottom: '5rem' }}>
      {/* VIS-PRAC-03: Top Header & Progress with Daruma */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
          <Link
            href="/grammar"
            style={{
              color: '#8B7B6D',
              textDecoration: 'none',
              fontSize: '0.85rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            ✕ Thoát
          </Link>

          {/* Daruma Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.25rem 0.75rem',
              borderRadius: '999px',
              background: '#FFF2F0',
              border: '1.2px solid #F5C6CB',
              color: '#C83824',
              fontSize: '0.82rem',
              fontWeight: 800,
              fontFamily: 'var(--font-maru, sans-serif)',
            }}
          >
            <span>🏮</span>
            <span>Câu {currentIndex + 1}/{total} ({progressPercent}%)</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{ height: '8px', background: '#E6E1DA', borderRadius: '4px', overflow: 'hidden', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)' }}>
          <div
            style={{
              height: '100%',
              width: `${Math.max(progressPercent, 5)}%`,
              background: 'linear-gradient(90deg, #88A752, #1B4268)',
              borderRadius: '4px',
              transition: 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          />
        </div>
      </div>

      {/* Main Question Card (VIS-PRAC-05: Wabi-Sabi Active Blank Box) */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '20px',
          border: '1.5px solid var(--washi-border, #E6E1DA)',
          padding: 'clamp(1.5rem, 4vw, 2.25rem)',
          boxShadow: '0 6px 24px rgba(18, 36, 56, 0.06)',
          marginBottom: '1.5rem',
        }}
      >
        <div
          style={{
            display: 'inline-block',
            padding: '0.25rem 0.65rem',
            background: 'rgba(27, 66, 104, 0.08)',
            color: '#1B4268',
            borderRadius: '6px',
            fontSize: '0.76rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            marginBottom: '1.15rem',
            letterSpacing: '0.05em',
          }}
        >
          {current.exerciseType === 'cloze' ? 'ĐIỀN VÀO CHỖ TRỐNG' : 'TRẮC NGHIỆM NGỮ PHÁP'}
        </div>

        {/* Sentence with Wabi-Sabi Active Recall Blank Box */}
        <div
          style={{
            fontSize: 'clamp(1.25rem, 3.2vw, 1.5rem)',
            lineHeight: 1.85,
            color: '#1F2421',
            fontWeight: 700,
            fontFamily: 'var(--font-mincho, "Shippori Mincho", serif)',
            marginBottom: '1.25rem',
          }}
        >
          {current.sentenceWithCloze ? (
            parseClozeSegments(current.sentenceWithCloze).map((seg, idx) => (
              <span
                key={idx}
                style={
                  seg.isCloze
                    ? {
                        padding: '0.2rem 0.65rem',
                        margin: '0 0.2rem',
                        border: isAnswered ? '1.5px solid #2B6B3D' : '1.5px dashed #C89B58',
                        color: isAnswered ? '#2B6B3D' : '#B8853C',
                        background: isAnswered ? 'rgba(43, 107, 61, 0.08)' : 'rgba(200, 155, 88, 0.12)',
                        borderRadius: '8px',
                        display: 'inline-block',
                        fontWeight: 800,
                        boxShadow: isAnswered ? 'none' : '0 0 8px rgba(200, 155, 88, 0.2)',
                      }
                    : {}
                }
              >
                {seg.isCloze ? (isAnswered ? (current.answerText || seg.text) : ' ( ❓ ) ') : seg.text}
              </span>
            ))
          ) : (
            current.question || current.promptText
          )}
        </div>

        {/* Vietnamese Hint / Prompt */}
        {current.promptText && (
          <div
            style={{
              fontSize: '0.95rem',
              color: '#555',
              borderTop: '1px dashed #ECE8E1',
              paddingTop: '0.95rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontFamily: 'var(--font-maru, sans-serif)',
            }}
          >
            <span>💬 Dịch: <strong style={{ color: '#1B4268' }}>{current.promptText}</strong></span>
            <JapaneseSpeakerButton text={current.answerText || current.sentenceWithCloze || ''} size={18} />
          </div>
        )}
      </div>

      {/* 4 Options (VIS-PRAC-01: Keyboard Shortcuts [1..4] & Optical Lift) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.5rem' }}>
        {options.map((opt) => {
          const isSelected = selectedOption === opt.key;
          const isCorrect = opt.key === current.correctOption;

          let btnBg = '#FFFFFF';
          let borderColor = '#E2D7C5';
          let textColor = '#122438';
          let keyBg = '#F0EBE0';
          let keyColor = '#122438';

          if (isAnswered) {
            if (isCorrect) {
              btnBg = '#F0F9F2';
              borderColor = '#2A6B3D';
              textColor = '#2A6B3D';
              keyBg = '#2A6B3D';
              keyColor = '#FFFFFF';
            } else if (isSelected) {
              btnBg = '#FFF2F0';
              borderColor = '#C83824';
              textColor = '#C83824';
              keyBg = '#C83824';
              keyColor = '#FFFFFF';
            } else {
              btnBg = '#FAFAF9';
              borderColor = '#E6E1DA';
              textColor = '#888';
              keyBg = '#F0EDE8';
              keyColor = '#888';
            }
          }

          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => handleSelectOption(opt.key)}
              disabled={isAnswered}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
                padding: '1rem 1.25rem',
                borderRadius: '16px',
                border: `1.5px solid ${borderColor}`,
                background: btnBg,
                color: textColor,
                cursor: isAnswered ? 'default' : 'pointer',
                boxShadow: isSelected
                  ? isCorrect
                    ? '0 4px 16px rgba(42, 107, 61, 0.15)'
                    : '0 4px 16px rgba(200, 56, 36, 0.15)'
                  : '0 2px 8px rgba(18, 36, 56, 0.04)',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                textAlign: 'left',
                width: '100%',
              }}
            >
              {/* Keyboard badge [1..4] / [A..D] */}
              <span
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  background: keyBg,
                  color: keyColor,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-mono, monospace)',
                  fontWeight: 800,
                  fontSize: '0.88rem',
                  flexShrink: 0,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                }}
              >
                [{opt.num}]
              </span>

              <span
                style={{
                  fontFamily: 'var(--font-mincho, "Shippori Mincho", serif)',
                  fontSize: '1.15rem',
                  fontWeight: 600,
                  lineHeight: 1.4,
                  flex: 1,
                }}
              >
                {opt.text}
              </span>

              <span
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  color: isAnswered && isCorrect ? '#2A6B3D' : '#8B7B6D',
                  fontFamily: 'var(--font-maru, sans-serif)',
                }}
              >
                {opt.key}
              </span>
            </button>
          );
        })}
      </div>

      {/* VIS-PRAC-02: Zero-CLS Pedagogical Explanation Box */}
      <div
        style={{
          display: 'grid',
          gridTemplateRows: isAnswered ? '1fr' : '0fr',
          transition: 'grid-template-rows 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease',
          opacity: isAnswered ? 1 : 0,
          overflow: 'hidden',
        }}
      >
        <div style={{ minHeight: 0 }}>
          <div
            style={{
              background: selectedOption === current.correctOption ? 'rgba(240, 249, 242, 0.95)' : 'rgba(255, 242, 240, 0.95)',
              border: `1.5px solid ${selectedOption === current.correctOption ? '#2A6B3D' : '#C83824'}`,
              borderRadius: '16px',
              padding: '1.25rem 1.4rem',
              marginBottom: '1.5rem',
              boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
            }}
          >
            <div
              style={{
                fontWeight: 800,
                fontSize: '1rem',
                color: selectedOption === current.correctOption ? '#2A6B3D' : '#C83824',
                marginBottom: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
              }}
            >
              <span>{selectedOption === current.correctOption ? '✨ 正解 (Chính xác)!' : '❌ Chưa chính xác'}</span>
            </div>

            <div style={{ fontSize: '0.92rem', color: '#122438', lineHeight: 1.6, marginBottom: '0.65rem' }}>
              <strong>🏮 Giải thích: </strong>
              {current.explanationVi || 'Đáp án chính xác theo quy tắc ngữ pháp của bài học.'}
            </div>

            {current.explanationJa && (
              <div style={{ fontSize: '0.84rem', color: '#666', fontStyle: 'italic', fontFamily: 'var(--font-mincho, serif)' }}>
                {current.explanationJa}
              </div>
            )}

            <div style={{ marginTop: '1.15rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={handleNext}
                style={{
                  padding: '0.8rem 1.6rem',
                  background: '#1B4268',
                  color: '#FFFFFF',
                  borderRadius: '12px',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 14px rgba(27, 66, 104, 0.25)',
                  transition: 'all 0.2s ease',
                }}
              >
                <span>{currentIndex + 1 < total ? 'Câu tiếp theo (Enter) ➔' : 'Xem kết quả ➔'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PracticePage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        padding: '1.5rem 1rem 5.5rem',
        background: 'var(--washi-base, #FAF8F5)',
      }}
    >
      <Suspense fallback={<div style={{ textAlign: 'center', padding: '3rem' }}>Đang nạp bài tập...</div>}>
        <PracticeContent />
      </Suspense>
    </main>
  );
}
