'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ToriiIcon, SensuFanIcon } from '@/components/japanese/Icons';
import { JapaneseSpeakerButton } from '@/components/japanese/JapaneseSpeakerButton';
import { japaneseAudio } from '@/components/japanese/AudioEffects';
import { JapaneseArtBackdrop } from '@/components/art/JapaneseArtBackdrop';
import {
  getAllVerbs,
  evaluateConjugation,
  romajiToHiragana,
  VerbItem,
  EvaluationResult,
} from '@/lib/conjugation-engine';

export default function ConjugationPage() {
  const allVerbs = getAllVerbs();

  // Tab chế độ: drill (Luyện điền từ), speed (Lướt nhanh), theory (Cẩm nang Bento)
  const [mode, setMode] = useState<'drill' | 'theory' | 'speed'>('drill');

  // Lọc theo nhóm động từ
  const [selectedGroup, setSelectedGroup] = useState<1 | 2 | 3 | 'exceptions' | 'all'>('all');

  // Thể cần luyện tập: 'te' (Thể Te) hoặc 'ru' (Thể Ru/Từ điển)
  const [targetForm, setTargetForm] = useState<'te' | 'ru'>('te');

  // Trạng thái mở Sổ tay lý thuyết xem bất cứ lúc nào (Modal/Cheatsheet)
  const [isCheatsheetOpen, setIsCheatsheetOpen] = useState(false);
  const [cheatsheetTab, setCheatsheetTab] = useState<'groups' | 'te' | 'ru' | 'exceptions'>('groups');

  // Từ khóa tìm kiếm trong bảng tra cứu (Chế độ lý thuyết)
  const [searchQuery, setSearchQuery] = useState('');

  // Chế độ Điền từ (Input Drill State)
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [showAnswerHint, setShowAnswerHint] = useState(false);
  const [showGroupHint, setShowGroupHint] = useState(false); // Ban đầu che nhóm động từ để người học tự tư duy
  const [showKeypad, setShowKeypad] = useState(false); // Bàn phím ảo Kana thu gọn theo nhu cầu
  const inputRef = useRef<HTMLInputElement>(null);

  const handleInsertKana = (char: string) => {
    setUserInput((prev) => prev + char);
    inputRef.current?.focus();
  };

  // Chế độ Lướt nhanh (Speed Drill State)
  const [speedIdx, setSpeedIdx] = useState(0);
  const [isSpeedFlipped, setIsSpeedFlipped] = useState(false);

  // Bộ lọc danh sách động từ hiện tại
  const filteredVerbs = allVerbs.filter((v) => {
    if (selectedGroup === 'all') return true;
    if (selectedGroup === 'exceptions') return v.isException;
    return v.group === selectedGroup;
  });

  // Bộ lọc danh sách tra cứu lý thuyết kết hợp tìm kiếm realtime
  const searchedVerbs = filteredVerbs.filter((v) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      v.kanji.toLowerCase().includes(q) ||
      v.hiragana.toLowerCase().includes(q) ||
      v.romaji.toLowerCase().includes(q) ||
      v.meaning_vi.toLowerCase().includes(q) ||
      v.te_form.hiragana.toLowerCase().includes(q) ||
      v.ru_form.hiragana.toLowerCase().includes(q)
    );
  });

  const currentVerb = filteredVerbs[currentIdx % filteredVerbs.length] || allVerbs[0];
  const speedVerb = filteredVerbs[speedIdx % filteredVerbs.length] || allVerbs[0];

  // Tự động focus vào input khi đổi câu hoặc đổi thể
  useEffect(() => {
    if (mode === 'drill') {
      inputRef.current?.focus();
    }
  }, [currentIdx, mode, targetForm]);

  // Phím tắt Esc để đóng sổ tay lý thuyết
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isCheatsheetOpen) {
        setIsCheatsheetOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCheatsheetOpen]);

  // Xử lý nộp câu trả lời điền từ
  const handleSubmitAnswer = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!userInput.trim()) return;

    const result = evaluateConjugation(userInput, currentVerb, targetForm);
    setEvaluation(result);
    setShowGroupHint(true); // Tự động mở nhóm sau khi nộp đáp án để người học đối chiếu

    setScore((prev) => ({
      correct: prev.correct + (result.isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));

    if (result.isCorrect) {
      japaneseAudio.playSuzuBell();
    }
  };

  const handleNextQuestion = () => {
    setUserInput('');
    setEvaluation(null);
    setShowAnswerHint(false);
    setShowGroupHint(false);
    setCurrentIdx((prev) => (prev + 1) % filteredVerbs.length);
  };

  // Chuyển sang luyện thể còn lại của cùng một từ
  const handleSwitchFormForCurrentVerb = (newForm: 'te' | 'ru') => {
    setTargetForm(newForm);
    setUserInput('');
    setEvaluation(null);
    setShowAnswerHint(false);
  };

  return (
    <main
      style={{
        position: 'relative',
        minHeight: '100vh',
        padding: '1.5rem 1rem 5rem',
      }}
    >
      {/* HÌNH NỀN ĐỒ HỌA MỸ THUẬT NHẬT BẢN TOÀN TRANG TỪ THƯ MỤC JAPANESE GRAPHIC DESIGN */}
      <JapaneseArtBackdrop
        src="/assets/art/japanese-graphic-contemporary.webp"
        alt="Nghệ thuật đồ họa Nhật Bản đương đại"
        opacity={0.05}
        blendMode="multiply"
      />

      <div style={{ maxWidth: '960px', margin: '0 auto', position: 'relative', zIndex: 10 }}>
        {/* 1. HERO BANNER MỘC BẢN PHÚ SĨ (Awwwards-Tier Editorial Hero) */}
      <div
        className="bento-card-artisan"
        style={{
          padding: '2.5rem 2.25rem',
          marginBottom: '1.75rem',
          border: '1.5px solid rgba(200, 155, 88, 0.45)',
          background: 'linear-gradient(135deg, #0A1C33 0%, #153255 60%, #0E243E 100%)',
          color: '#FFFFFF',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.5rem',
        }}
      >
        <div style={{ position: 'absolute', inset: 0, opacity: 0.32, pointerEvents: 'none', zIndex: 0 }}>
          <Image
            src="/assets/art/hokusai-suwa-lake.jpg"
            alt="Tranh mộc bản Hokusai Hồ Suwa"
            fill
            sizes="100vw"
            priority
            style={{ objectFit: 'cover', objectPosition: 'center 38%' }}
          />
        </div>

        <div style={{ position: 'relative', zIndex: 2, maxWidth: '600px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.65rem' }}>
            <span
              style={{
                fontFamily: 'var(--font-mincho)',
                background: '#C83824',
                color: '#FFFFFF',
                fontWeight: 800,
                fontSize: '0.74rem',
                padding: '0.22rem 0.7rem',
                borderRadius: '4px',
                letterSpacing: '0.1em',
                boxShadow: '0 2px 8px rgba(200, 56, 36, 0.4)',
              }}
            >
              動詞の道 · ĐỘNG TỪ
            </span>
            <span style={{ fontSize: '0.82rem', color: '#E8D9BD', fontFamily: 'var(--font-maru)', letterSpacing: '0.02em' }}>
              Thể nguyên bản → Thể Te (て) &amp; Thể Ru (る)
            </span>
          </div>

          <h1
            className="editorial-hero-title"
            style={{
              fontSize: 'clamp(1.8rem, 4vw, 2.3rem)',
              margin: '0 0 0.5rem 0',
              textShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
              color: '#FAF8F5',
            }}
          >
            Luyện chia động từ tiếng Nhật
          </h1>

          <p style={{ color: 'rgba(250, 248, 245, 0.9)', fontSize: '0.92rem', lineHeight: 1.55, margin: '0 0 1.25rem 0' }}>
            Bắt đầu từ thể nguyên bản, phân loại và điền thể Te hoặc Ru tương ứng. Tra cứu lý thuyết mọi lúc.
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <Link
              href="/"
              className="btn-washi"
              style={{
                padding: '0.55rem 1.15rem',
                fontSize: '0.86rem',
                background: 'rgba(255, 255, 255, 0.12)',
                color: '#FFFFFF',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
              }}
            >
              ← Trang chủ
            </Link>
            <Link
              href="/cards"
              className="btn-washi"
              style={{
                padding: '0.55rem 1.15rem',
                fontSize: '0.86rem',
                background: 'rgba(255, 255, 255, 0.12)',
                color: '#FFFFFF',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
              }}
            >
              Bộ thẻ
            </Link>

            {/* NÚT MỞ SỔ TAY LÝ THUYẾT BẤT CỨ LÚC NÀO TRÊN HEADER */}
            <button
              onClick={() => setIsCheatsheetOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.55rem 1.15rem',
                borderRadius: '8px',
                border: '1px solid #D4AF37',
                background: 'rgba(212, 175, 55, 0.25)',
                color: '#FBF8F1',
                fontSize: '0.86rem',
                fontWeight: 700,
                fontFamily: 'var(--font-maru)',
                cursor: 'pointer',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                transition: 'all 0.2s ease',
              }}
            >
              📜 Sổ tay lý thuyết
            </button>
          </div>
        </div>

        {/* Khung số liệu thành tích kiểu Kifuda sang trọng */}
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            border: '1.2px solid rgba(200, 155, 88, 0.5)',
            borderRadius: '16px',
            padding: '1.25rem 1.6rem',
            background: 'rgba(10, 28, 51, 0.8)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            textAlign: 'center',
            minWidth: '140px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
          }}
        >
          <div style={{ fontFamily: 'var(--font-mincho)', fontSize: '2.2rem', fontWeight: 900, color: '#D4AF37' }}>
            {score.total > 0 ? `${Math.round((score.correct / score.total) * 100)}%` : '50'}
          </div>
          <div style={{ fontFamily: 'var(--font-maru)', fontSize: '0.78rem', color: '#E8D9BD', marginTop: '0.2rem' }}>
            {score.total > 0 ? `Đúng ${score.correct}/${score.total} câu` : 'Động từ thông dụng'}
          </div>
        </div>
      </div>

      {/* 2. CHUYỂN ĐỔI CHẾ ĐỘ & BỘ LỌC TỐI GIẢN */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
          marginBottom: '1.5rem',
          borderBottom: '1.2px solid var(--washi-border)',
          paddingBottom: '0.85rem',
        }}
      >
        {/* 3 Tabs chế độ học */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setMode('drill')}
            style={{
              padding: '0.6rem 1.25rem',
              borderRadius: '10px',
              border: mode === 'drill' ? '1px solid #1E4B75' : '1px solid var(--washi-border)',
              background: mode === 'drill' ? '#1E4B75' : '#FFFFFF',
              color: mode === 'drill' ? '#FFFFFF' : '#122438',
              fontFamily: 'var(--font-maru)',
              fontWeight: mode === 'drill' ? 800 : 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              boxShadow: mode === 'drill' ? '0 2px 8px rgba(30, 75, 117, 0.3)' : 'var(--shadow-washi-sm)',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            ✍️ Luyện điền từ
          </button>
          <button
            onClick={() => setMode('speed')}
            style={{
              padding: '0.6rem 1.25rem',
              borderRadius: '10px',
              border: mode === 'speed' ? '1px solid #1E4B75' : '1px solid var(--washi-border)',
              background: mode === 'speed' ? '#1E4B75' : '#FFFFFF',
              color: mode === 'speed' ? '#FFFFFF' : '#122438',
              fontFamily: 'var(--font-maru)',
              fontWeight: mode === 'speed' ? 800 : 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              boxShadow: mode === 'speed' ? '0 2px 8px rgba(30, 75, 117, 0.3)' : 'var(--shadow-washi-sm)',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            ⚡ Lướt nhanh
          </button>
          <button
            onClick={() => setMode('theory')}
            style={{
              padding: '0.6rem 1.25rem',
              borderRadius: '10px',
              border: mode === 'theory' ? '1px solid #1E4B75' : '1px solid var(--washi-border)',
              background: mode === 'theory' ? '#1E4B75' : '#FFFFFF',
              color: mode === 'theory' ? '#FFFFFF' : '#122438',
              fontFamily: 'var(--font-maru)',
              fontWeight: mode === 'theory' ? 800 : 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              boxShadow: mode === 'theory' ? '0 2px 8px rgba(30, 75, 117, 0.3)' : 'var(--shadow-washi-sm)',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            📖 Cẩm nang Bento
          </button>
        </div>

        {/* NÚT MỞ SỔ TAY LÝ THUYẾT TRÊN THANH CÔNG CỤ */}
        <button
          onClick={() => setIsCheatsheetOpen(true)}
          className="btn-washi"
          style={{
            padding: '0.55rem 1.1rem',
            fontSize: '0.85rem',
            gap: '0.35rem',
            color: '#B8853C',
            borderColor: '#D4AF37',
            background: '#FFFDF9',
          }}
        >
          <span>📜</span> Quy tắc chia &amp; Nhóm
        </button>
      </div>

      {/* BỘ LỌC THEO NHÓM ĐỘNG TỪ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.75rem' }}>
        <span style={{ fontSize: '0.8rem', color: '#786A5E', fontWeight: 700 }}>
          Nhóm:
        </span>
        {[
          { id: 'all', label: `Tất cả (${allVerbs.length})` },
          { id: 1, label: 'Nhóm 1 (34)' },
          { id: 2, label: 'Nhóm 2 (13)' },
          { id: 3, label: 'Nhóm 3 (3)' },
          { id: 'exceptions', label: '★ Ngoại lệ (6)' },
        ].map((item) => {
          const isActive = selectedGroup === item.id;
          return (
            <button
              key={String(item.id)}
              onClick={() => {
                setSelectedGroup(item.id as any);
                setCurrentIdx(0);
                setSpeedIdx(0);
                setEvaluation(null);
                setUserInput('');
                setShowGroupHint(false);
              }}
              style={{
                padding: '0.35rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid',
                borderColor: isActive ? '#1E4B75' : 'var(--washi-border)',
                background: isActive ? '#1E4B75' : '#FFFFFF',
                color: isActive ? '#FFFFFF' : '#122438',
                fontSize: '0.8rem',
                fontWeight: isActive ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* =========================================================================
          CHẾ ĐỘ 1: LUYỆN ĐIỀN TỪ (INPUT DRILL)
          Quy trình: Ban đầu chỉ đưa thể nguyên bản -> sau đó mới phân ra điền Te hoặc Ru
          ========================================================================= */}
      {mode === 'drill' && (
        <div style={{ maxWidth: '660px', margin: '0 auto' }}>
          <div
            className="bento-card-artisan"
            style={{
              padding: '2.5rem 2.25rem',
              background: '#FFFFFF',
            }}
          >
            <JapaneseArtBackdrop
              src="/assets/art/gold-sakura-washi.jpg"
              alt="Họa tiết Washi"
              opacity={0.06}
              blendMode="multiply"
            />

            {/* HEADER CARD: Thứ tự câu và Nút tra cứu lý thuyết nhanh */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="micro-badge-label" style={{ background: '#FAF7F0', color: '#122438', border: '1px solid var(--washi-border)' }}>
                  ĐỘNG TỪ NGUYÊN BẢN
                </span>

                {/* Nhóm động từ: Ban đầu ẩn để người học tự động não, chỉ hiện khi click hoặc khi đã nộp bài */}
                {showGroupHint ? (
                  <span
                    className="micro-badge-label"
                    style={{
                      background: currentVerb.group === 1 ? '#EDF4FA' : currentVerb.group === 2 ? '#EBF5EE' : '#FDF2F0',
                      color: currentVerb.group === 1 ? '#1E4B75' : currentVerb.group === 2 ? '#2A6B3D' : '#C83824',
                      border: `1px solid ${currentVerb.group === 1 ? '#B8D5E5' : currentVerb.group === 2 ? '#C2E5CC' : '#F5C6CB'}`,
                    }}
                  >
                    Nhóm {currentVerb.group} {currentVerb.isException ? '★ Ngoại lệ' : ''}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowGroupHint(true)}
                    title="Bấm để xem nhóm động từ nếu bạn quên"
                    style={{
                      background: 'none',
                      border: '1px dashed #D6C8B5',
                      borderRadius: '999px',
                      padding: '0.2rem 0.6rem',
                      fontSize: '0.72rem',
                      color: '#786A5E',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-maru)',
                    }}
                  >
                    ❓ Xem nhóm
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <button
                  type="button"
                  onClick={() => setIsCheatsheetOpen(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#B8853C',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.2rem',
                    padding: '0.2rem 0.4rem',
                  }}
                >
                  📜 Sổ tay
                </button>
                <span style={{ fontFamily: 'var(--font-mincho)', fontWeight: 800, fontSize: '0.92rem', color: '#786A5E' }}>
                  {currentIdx + 1} / {filteredVerbs.length}
                </span>
              </div>
            </div>

            {/* BƯỚC 1: HIỂN THỊ THỂ NGUYÊN BẢN (Imperial Wabi-Sabi Verb Plaque) */}
            <div
              style={{
                textAlign: 'center',
                padding: '1.5rem 1.75rem',
                background: 'linear-gradient(180deg, rgba(250, 248, 245, 0.95) 0%, rgba(255, 255, 255, 0.98) 100%)',
                borderRadius: '20px',
                border: '1.2px solid rgba(200, 155, 88, 0.3)',
                margin: '0 0 1.5rem 0',
                boxShadow: '0 2px 10px rgba(18, 36, 56, 0.04), 0 1px 3px rgba(18, 36, 56, 0.02)',
                position: 'relative',
              }}
            >
              <div style={{ fontSize: '0.74rem', color: '#786A5E', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem', fontFamily: 'var(--font-maru)' }}>
                Từ nguyên mẫu · 辞書形
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem' }}>
                <span
                  style={{
                    fontFamily: 'var(--font-mincho)',
                    fontSize: 'clamp(2.8rem, 6vw, 3.6rem)',
                    fontWeight: 900,
                    color: '#122438',
                    letterSpacing: '-0.02em',
                    textShadow: '0 1px 2px rgba(18, 36, 56, 0.08)',
                  }}
                >
                  {currentVerb.kanji}
                </span>
                <JapaneseSpeakerButton text={currentVerb.kanji} size={28} />
              </div>

              <div style={{ fontFamily: 'var(--font-maru)', fontSize: '1.3rem', color: '#B87B28', fontWeight: 700, marginTop: '0.2rem' }}>
                {currentVerb.hiragana} <span style={{ fontSize: '1rem', color: '#786A5E', fontWeight: 500 }}>({currentVerb.romaji})</span>
              </div>

              <div style={{ fontSize: '1.1rem', color: '#122438', fontWeight: 600, marginTop: '0.5rem' }}>
                Ý nghĩa: <strong>{currentVerb.meaning_vi}</strong>
              </div>

              <div style={{ fontSize: '0.84rem', color: '#786A5E', marginTop: '0.35rem', fontStyle: 'italic' }}>
                Thể lịch sự: <strong>{currentVerb.masu_form.kanji}</strong> ({currentVerb.masu_form.hiragana})
              </div>
            </div>

            {/* BƯỚC 2: PHÂN RA THỂ CẦN ĐIỀN (CHỌN THỂ TE HOẶC THỂ RU) */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.82rem', color: '#786A5E', fontWeight: 700, marginBottom: '0.5rem', textAlign: 'center' }}>
                👇 Chọn thể bạn muốn thực hành cho từ này:
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => handleSwitchFormForCurrentVerb('te')}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '12px',
                    border: '1.5px solid',
                    borderColor: targetForm === 'te' ? '#C83824' : 'var(--washi-border)',
                    background: targetForm === 'te' ? '#FFF5F4' : '#FFFFFF',
                    color: targetForm === 'te' ? '#C83824' : '#122438',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.2rem',
                    boxShadow: targetForm === 'te' ? '0 4px 12px rgba(200, 56, 36, 0.15)' : 'none',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span style={{ fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase' }}>
                    {targetForm === 'te' ? '● ĐANG LUYỆN' : 'CHỌN'}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mincho)', fontSize: '1.15rem', fontWeight: 800 }}>
                    Thể Te (て形)
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#786A5E' }}>Nối câu, yêu cầu, tiếp diễn</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSwitchFormForCurrentVerb('ru')}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '12px',
                    border: '1.5px solid',
                    borderColor: targetForm === 'ru' ? '#1E4B75' : 'var(--washi-border)',
                    background: targetForm === 'ru' ? '#F0F6FC' : '#FFFFFF',
                    color: targetForm === 'ru' ? '#1E4B75' : '#122438',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.2rem',
                    boxShadow: targetForm === 'ru' ? '0 4px 12px rgba(30, 75, 117, 0.15)' : 'none',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span style={{ fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase' }}>
                    {targetForm === 'ru' ? '● ĐANG LUYỆN' : 'CHỌN'}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mincho)', fontSize: '1.15rem', fontWeight: 800 }}>
                    Thể Ru (辞書形)
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#786A5E' }}>Thể nguyên mẫu từ điển</span>
                </button>
              </div>
            </div>

            {/* KHUNG NHẬP LIỆU CÂU TRẢ LỜI & BÀN PHÍM ẢO THU GỌN */}
            <form onSubmit={handleSubmitAnswer} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div
                style={{
                  padding: '0.65rem',
                  background: targetForm === 'te' ? 'rgba(200, 56, 36, 0.06)' : 'rgba(30, 75, 117, 0.06)',
                  border: `1.2px solid ${targetForm === 'te' ? 'rgba(200, 56, 36, 0.2)' : 'rgba(30, 75, 117, 0.2)'}`,
                  borderRadius: '10px',
                  color: targetForm === 'te' ? '#A32415' : '#1E4B75',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  fontFamily: 'var(--font-maru)',
                  textAlign: 'center',
                }}
              >
                👉 Hãy điền <strong>{targetForm === 'te' ? 'Thể Te (て形)' : 'Thể Ru (辞書形)'}</strong> của từ &ldquo;{currentVerb.kanji}&rdquo;:
              </div>

              <div style={{ position: 'relative' }}>
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Gõ Hiragana hoặc Romaji (vd: tabete, nonde)..."
                  value={userInput}
                  onChange={(e) => {
                    setUserInput(e.target.value);
                    if (evaluation) setEvaluation(null);
                  }}
                  style={{
                    width: '100%',
                    padding: '0.95rem 1.25rem',
                    borderRadius: '12px',
                    border: '1.5px solid',
                    borderColor: evaluation
                      ? evaluation.isCorrect
                        ? '#2A6B3D'
                        : '#C83824'
                      : '#D4AF37',
                    fontSize: '1.2rem',
                    color: '#122438',
                    fontFamily: 'var(--font-sans)',
                    outline: 'none',
                    background: '#FFFFFF',
                    textAlign: 'center',
                    fontWeight: 700,
                    boxShadow: 'var(--shadow-washi-sm)',
                  }}
                />

                {/* Nhận diện Hiragana tức thời khi người học gõ Romaji */}
                {userInput.trim() && (
                  <div style={{ marginTop: '0.4rem', textAlign: 'center', fontSize: '0.85rem', color: '#786A5E', fontFamily: 'var(--font-maru)' }}>
                    Nhận diện: <strong>{romajiToHiragana(userInput)}</strong>
                  </div>
                )}
              </div>

              {/* Mẹo gõ Romaji & Nút mở phím ảo */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.78rem', color: '#786A5E', fontFamily: 'var(--font-maru)' }}>
                <span>
                  💡 Mẹo: Gõ Romaji tự chuyển thành Hiragana (vd: <code style={{ color: '#C83824', fontWeight: 700 }}>yonnde</code> → <code style={{ color: '#2A6B3D', fontWeight: 700 }}>よんで</code>)
                </span>
                <button
                  type="button"
                  onClick={() => setShowKeypad(!showKeypad)}
                  style={{
                    background: 'none',
                    border: '1px solid #D8CDB8',
                    borderRadius: '6px',
                    padding: '0.2rem 0.55rem',
                    fontSize: '0.76rem',
                    color: '#1E4B75',
                    cursor: 'pointer',
                    fontWeight: 700,
                  }}
                >
                  {showKeypad ? '▲ Ẩn phím ảo' : '⌨️ Mở phím ảo Kana'}
                </button>
              </div>

              {/* Bàn phím ảo Kana tinh gọn (Collapsible Drawer) */}
              {showKeypad && (
                <div
                  style={{
                    background: 'rgba(250, 247, 240, 0.96)',
                    border: '1.2px solid #E2D7C5',
                    borderRadius: '12px',
                    padding: '0.75rem',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.35rem',
                    justifyContent: 'center',
                    maxHeight: '180px',
                    overflowY: 'auto',
                    boxShadow: 'inset 0 1px 3px rgba(18, 36, 56, 0.04)',
                  }}
                >
                  {[
                    'あ', 'い', 'う', 'え', 'お',
                    'か', 'き', 'く', 'け', 'こ',
                    'さ', 'し', 'す', 'せ', 'そ',
                    'た', 'ち', 'つ', 'て', 'と',
                    'な', 'に', 'ぬ', 'ね', 'の',
                    'は', 'ひ', 'ふ', 'へ', 'ほ',
                    'ま', 'み', 'む', 'め', 'も',
                    'や', 'ゆ', 'よ',
                    'ら', 'り', 'る', 'れ', 'ろ',
                    'わ', 'を', 'ん', 'っ',
                    'が', 'ぎ', 'ぐ', 'げ', 'ご',
                    'ざ', 'じ', 'ず', 'ぜ', 'ぞ',
                    'だ', 'ぢ', 'づ', 'で', 'ど',
                    'ば', 'び', 'ぶ', 'べ', 'ぼ',
                    'ぱ', 'ぴ', 'ぷ', 'ぺ', 'ぽ',
                  ].map((char) => (
                    <button
                      key={char}
                      type="button"
                      onClick={() => handleInsertKana(char)}
                      style={{
                        padding: '0.35rem 0.55rem',
                        background: '#FFFFFF',
                        border: '1px solid #E6DDCF',
                        borderRadius: '6px',
                        fontFamily: 'var(--font-maru)',
                        fontSize: '0.88rem',
                        fontWeight: 700,
                        color: '#122438',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {char}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setUserInput((prev) => prev.slice(0, -1))}
                    style={{
                      padding: '0.35rem 0.65rem',
                      background: '#FFF2F0',
                      border: '1px solid #F5C6CB',
                      borderRadius: '6px',
                      fontFamily: 'var(--font-maru)',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: '#C83824',
                      cursor: 'pointer',
                    }}
                  >
                    ⌫ Xóa
                  </button>
                </div>
              )}

              {/* Nút hành động ngắn gọn */}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.4rem' }}>
                <button
                  type="submit"
                  className="btn-torii"
                  style={{ flex: 1, padding: '0.85rem', fontSize: '0.95rem' }}
                >
                  <ToriiIcon size={16} color="#FFFFFF" />
                  Kiểm tra
                </button>
                <button
                  type="button"
                  onClick={() => setShowAnswerHint(!showAnswerHint)}
                  className="btn-washi"
                  style={{ padding: '0.85rem 1.15rem', fontSize: '0.9rem' }}
                >
                  Gợi ý
                </button>
                <button
                  type="button"
                  onClick={handleNextQuestion}
                  className="btn-washi"
                  style={{ padding: '0.85rem 1.15rem', fontSize: '0.9rem' }}
                >
                  Bỏ qua →
                </button>
              </div>
            </form>

            {/* Phản hồi sau khi chấm điểm (Kintsugi Aesthetics) */}
            {evaluation && (
              <div
                style={{
                  marginTop: '1.25rem',
                  padding: '1.15rem 1.35rem',
                  borderRadius: '16px',
                  background: evaluation.isCorrect ? 'rgba(42, 107, 61, 0.06)' : 'rgba(200, 56, 36, 0.06)',
                  border: `1.5px solid ${evaluation.isCorrect ? '#C89B58' : 'rgba(200, 56, 36, 0.28)'}`,
                  color: evaluation.isCorrect ? '#1B522A' : '#9E2413',
                  boxShadow: evaluation.isCorrect
                    ? '0 4px 16px rgba(200, 155, 88, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.8)'
                    : '0 4px 16px rgba(200, 56, 36, 0.08)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 800, fontSize: '1.05rem', fontFamily: 'var(--font-maru)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {evaluation.isCorrect ? '✨ 正解 · Hoàn toàn chính xác!' : '⚠️ Chưa chính xác · Hãy chú ý quy tắc biến âm!'}
                  </span>
                  <JapaneseSpeakerButton text={evaluation.expectedKanji} size={20} />
                </div>

                <div style={{ marginTop: '0.45rem', fontSize: '0.96rem' }}>
                  Đáp án chuẩn: <strong style={{ color: '#122438' }}>{evaluation.expectedKanji}</strong> ({evaluation.expectedHiragana} / {evaluation.expectedRomaji})
                </div>

                {evaluation.ruleExplanation && (
                  <div style={{ marginTop: '0.55rem', fontSize: '0.86rem', lineHeight: 1.55, borderTop: '1px dashed rgba(0,0,0,0.15)', paddingTop: '0.5rem' }}>
                    💡 {evaluation.ruleExplanation}
                  </div>
                )}

                {/* Nút gợi ý: Luyện tiếp thể còn lại của từ này trước khi qua từ mới */}
                <div style={{ display: 'flex', gap: '0.65rem', marginTop: '0.85rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => handleSwitchFormForCurrentVerb(targetForm === 'te' ? 'ru' : 'te')}
                    className="btn-washi"
                    style={{
                      flex: 1,
                      padding: '0.6rem 0.9rem',
                      fontSize: '0.84rem',
                      color: targetForm === 'te' ? '#1E4B75' : '#C83824',
                      borderColor: targetForm === 'te' ? '#1E4B75' : '#C83824',
                      background: '#FFFFFF',
                    }}
                  >
                    ↻ Luyện tiếp {targetForm === 'te' ? 'Thể Ru (る)' : 'Thể Te (て)'} của từ này
                  </button>
                  <button
                    type="button"
                    onClick={handleNextQuestion}
                    className="btn-torii"
                    style={{
                      padding: '0.6rem 1.15rem',
                      fontSize: '0.84rem',
                    }}
                  >
                    Từ tiếp theo →
                  </button>
                </div>
              </div>
            )}

            {/* Khung gợi ý đáp án */}
            {showAnswerHint && !evaluation && (
              <div style={{ marginTop: '1rem', padding: '0.9rem', background: '#FFF9E6', border: '1px solid #FFEAA7', borderRadius: '10px', fontSize: '0.88rem', color: '#8A6D1C' }}>
                💡 Gợi ý: {currentVerb.kanji} thuộc <strong>Nhóm {currentVerb.group}</strong> {currentVerb.isException ? '(★ Ngoại lệ)' : ''}.
                Đuôi nguyên thể là <strong>{currentVerb.hiragana.slice(-1)}</strong>.
                {targetForm === 'te' ? ' Hãy áp dụng quy tắc biến âm thể Te!' : ' Hãy xem lại dạng nguyên mẫu thể Ru!'}
              </div>
            )}

            {/* Câu ví dụ ứng dụng */}
            <div style={{ marginTop: '1.5rem', paddingTop: '1.1rem', borderTop: '1px solid var(--washi-border)' }}>
              <div className="micro-badge-label" style={{ color: '#786A5E', padding: 0, marginBottom: '0.35rem' }}>
                CÂU VÍ DỤ ỨNG DỤNG
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--font-mincho)', fontSize: '1rem', color: '#122438', fontWeight: 700 }}>
                  {currentVerb.example.sentence}
                </span>
                <JapaneseSpeakerButton text={currentVerb.example.sentence} size={20} />
              </div>
              <p style={{ fontSize: '0.85rem', color: '#786A5E', margin: '0.25rem 0 0' }}>
                {currentVerb.example.meaning}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          CHẾ ĐỘ 2: HỌC LƯỚT NHANH (SPEED DRILL - 3D Tactile Card GPU Accelerated)
          ========================================================================= */}
      {mode === 'speed' && (
        <div style={{ maxWidth: '620px', margin: '0 auto', perspective: '1200px' }}>
          <div
            onClick={() => setIsSpeedFlipped(!isSpeedFlipped)}
            style={{
              position: 'relative',
              width: '100%',
              minHeight: '380px',
              cursor: 'pointer',
              transformStyle: 'preserve-3d',
              WebkitTransformStyle: 'preserve-3d',
              transition: 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)',
              transform: isSpeedFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
              willChange: 'transform',
            }}
          >
            {/* MẶT TRƯỚC: THỂ NGUYÊN BẢN (GPU Hardware Accelerated) */}
            <div
              className="bento-card-artisan"
              style={{
                position: 'absolute',
                inset: 0,
                padding: '3rem 2rem',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                background: '#FFFFFF',
                border: '1.5px solid rgba(200, 155, 88, 0.45)',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'translate3d(0, 0, 0)',
                WebkitTransform: 'translate3d(0, 0, 0)',
              }}
            >
              <JapaneseArtBackdrop
                src="/assets/art/gold-sakura-washi.webp"
                alt="Họa tiết"
                opacity={0.06}
                blendMode="multiply"
              />

              <span
                className="micro-badge-label"
                style={{
                  position: 'absolute',
                  top: '1.25rem',
                  left: '1.25rem',
                  background: speedVerb.group === 1 ? '#EDF4FA' : '#EBF5EE',
                  color: speedVerb.group === 1 ? '#1E4B75' : '#2A6B3D',
                  border: `1px solid ${speedVerb.group === 1 ? '#B8D5E5' : '#C2E5CC'}`,
                }}
              >
                Nhóm {speedVerb.group} {speedVerb.isException ? '★ Ngoại lệ' : ''}
              </span>

              <span style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', fontSize: '0.88rem', color: '#786A5E', fontWeight: 700 }}>
                {speedIdx + 1} / {filteredVerbs.length}
              </span>

              <div>
                <div style={{ fontSize: '0.78rem', color: '#786A5E', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.4rem', letterSpacing: '0.05em' }}>
                  Thể nguyên mẫu · 辞書形
                </div>
                <div style={{ fontFamily: 'var(--font-mincho)', fontSize: 'clamp(3rem, 7vw, 4.2rem)', fontWeight: 900, color: '#122438', textShadow: '0 2px 8px rgba(18, 36, 56, 0.08)' }}>
                  {speedVerb.kanji}
                </div>
                <div style={{ fontFamily: 'var(--font-maru)', fontSize: '1.35rem', color: '#B87B28', fontWeight: 700, marginTop: '0.4rem' }}>
                  {speedVerb.hiragana} ({speedVerb.romaji})
                </div>
                <div style={{ fontSize: '1.25rem', color: '#122438', fontWeight: 700, marginTop: '0.65rem' }}>
                  {speedVerb.meaning_vi}
                </div>
                <p style={{ color: '#786A5E', fontSize: '0.84rem', marginTop: '1.5rem', fontFamily: 'var(--font-maru)' }}>
                  👆 Nhấp để lật xem Thể Te &amp; Thể Masu
                </p>
              </div>
            </div>

            {/* MẶT SAU: CÁC THỂ ĐÃ CHIA (GPU Hardware Accelerated) */}
            <div
              className="bento-card-artisan"
              style={{
                position: 'absolute',
                inset: 0,
                padding: '2.5rem 1.75rem',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                background: '#FAF8F5',
                border: '1.5px solid #C89B58',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(180deg) translate3d(0, 0, 0)',
                WebkitTransform: 'rotateY(180deg) translate3d(0, 0, 0)',
              }}
            >
              <div style={{ width: '100%' }}>
                <span
                  className="micro-badge-label"
                  style={{
                    position: 'absolute',
                    top: '1.25rem',
                    left: '1.25rem',
                    background: '#FAF7F0',
                    color: '#C83824',
                    border: '1px solid rgba(200, 56, 36, 0.25)',
                  }}
                >
                  Đáp án chia thể
                </span>

                <span style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', fontSize: '0.88rem', color: '#786A5E', fontWeight: 700 }}>
                  {speedIdx + 1} / {filteredVerbs.length}
                </span>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1.25rem', marginTop: '1.5rem' }}>
                  <div style={{ background: '#FFFFFF', padding: '1.1rem', borderRadius: '14px', border: '1px solid rgba(200, 56, 36, 0.2)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                    <div className="micro-badge-label" style={{ color: '#C83824', padding: 0 }}>THỂ TE (て形)</div>
                    <div style={{ fontFamily: 'var(--font-mincho)', fontSize: '1.65rem', fontWeight: 800, color: '#122438', marginTop: '0.25rem' }}>
                      {speedVerb.te_form.kanji}
                    </div>
                    <div style={{ fontSize: '0.88rem', color: '#1E4B75', fontWeight: 600, marginTop: '0.2rem' }}>
                      {speedVerb.te_form.hiragana} ({speedVerb.te_form.romaji})
                    </div>
                  </div>

                  <div style={{ background: '#FFFFFF', padding: '1.1rem', borderRadius: '14px', border: '1px solid rgba(30, 75, 117, 0.2)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                    <div className="micro-badge-label" style={{ color: '#1E4B75', padding: 0 }}>THỂ MASU (ます)</div>
                    <div style={{ fontFamily: 'var(--font-mincho)', fontSize: '1.65rem', fontWeight: 800, color: '#122438', marginTop: '0.25rem' }}>
                      {speedVerb.masu_form.kanji}
                    </div>
                    <div style={{ fontSize: '0.88rem', color: '#1E4B75', fontWeight: 600, marginTop: '0.2rem' }}>
                      {speedVerb.masu_form.hiragana} ({speedVerb.masu_form.romaji})
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: '0.95rem', color: '#122438', fontWeight: 600, fontStyle: 'italic', background: '#FFFFFF', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid var(--washi-border)' }}>
                  &ldquo;{speedVerb.example.sentence}&rdquo;
                  <div style={{ fontSize: '0.82rem', color: '#786A5E', marginTop: '0.25rem', fontStyle: 'normal' }}>
                    {speedVerb.example.meaning}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Nút lướt câu tiếp theo */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
            <button
              onClick={() => {
                setIsSpeedFlipped(false);
                setSpeedIdx((prev) => (prev - 1 + filteredVerbs.length) % filteredVerbs.length);
              }}
              className="btn-washi"
              style={{ flex: 1, padding: '0.85rem' }}
            >
              ← Lùi
            </button>
            <button
              onClick={() => setIsSpeedFlipped(!isSpeedFlipped)}
              className="btn-washi"
              style={{ flex: 1, padding: '0.85rem', borderColor: '#C89B58', color: '#122438', fontWeight: 700 }}
            >
              {isSpeedFlipped ? 'Mặt trước' : 'Lật xem'}
            </button>
            <button
              onClick={() => {
                setIsSpeedFlipped(false);
                setSpeedIdx((prev) => (prev + 1) % filteredVerbs.length);
              }}
              className="btn-torii"
              style={{ flex: 1, padding: '0.85rem' }}
            >
              Tiếp →
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          CHẾ ĐỘ 3: CẨM NANG BENTO GRID (Awwwards-Tier Asymmetric Bento Layout)
          ========================================================================= */}
      {mode === 'theory' && (
        <div className="bento-grid-container">
          {/* BENTO CARD 1: HERO ANCHOR (span 8) - MA TRẬN BIẾN ÂM THỂ TE */}
          <div className="bento-col-8 bento-card-artisan" style={{ padding: '1.75rem 2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span className="micro-badge-label" style={{ background: '#FCEEEA', color: '#C83824' }}>
                QUY TẮC CỐT LÕI
              </span>
              <span style={{ fontSize: '0.8rem', color: '#786A5E' }}>て形の音便法則</span>
            </div>

            <h2 style={{ fontFamily: 'var(--font-mincho)', fontSize: '1.45rem', color: '#122438', fontWeight: 800, margin: '0 0 0.85rem 0' }}>
              Ma trận biến âm thể Te (Ngũ đoạn động từ)
            </h2>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ background: '#FAF7F0', borderBottom: '1.5px solid var(--washi-border)' }}>
                    <th style={{ padding: '0.65rem 0.75rem', color: '#122438' }}>Đuôi nguyên thể</th>
                    <th style={{ padding: '0.65rem 0.75rem', color: '#122438' }}>Biến âm thể Te</th>
                    <th style={{ padding: '0.65rem 0.75rem', color: '#122438' }}>Ví dụ minh họa</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid var(--washi-border)' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 700, color: '#C83824' }}>う, つ, る</td>
                    <td style={{ padding: '0.75rem', fontWeight: 800, color: '#1E4B75' }}>〜 って (âm ngắt)</td>
                    <td style={{ padding: '0.75rem', color: '#122438' }}>買う → <strong style={{ color: '#C83824' }}>買って</strong>, 待つ → <strong style={{ color: '#C83824' }}>待って</strong>, 取る → <strong style={{ color: '#C83824' }}>取って</strong></td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--washi-border)', background: 'rgba(250,248,245,0.5)' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 700, color: '#C83824' }}>む, ぶ, ぬ</td>
                    <td style={{ padding: '0.75rem', fontWeight: 800, color: '#1E4B75' }}>〜 んで (âm mũi đục)</td>
                    <td style={{ padding: '0.75rem', color: '#122438' }}>飲む → <strong style={{ color: '#1E4B75' }}>飲んで</strong>, 遊ぶ → <strong style={{ color: '#1E4B75' }}>遊んで</strong>, 死ぬ → <strong style={{ color: '#1E4B75' }}>死んで</strong></td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--washi-border)' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 700, color: '#C83824' }}>く (ku)</td>
                    <td style={{ padding: '0.75rem', fontWeight: 800, color: '#1E4B75' }}>〜 いて (âm i)</td>
                    <td style={{ padding: '0.75rem', color: '#122438' }}>書く → <strong style={{ color: '#1E4B75' }}>書いて</strong>, 聞く → <strong style={{ color: '#1E4B75' }}>聞いて</strong></td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--washi-border)', background: 'rgba(250,248,245,0.5)' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 700, color: '#C83824' }}>ぐ (gu)</td>
                    <td style={{ padding: '0.75rem', fontWeight: 800, color: '#1E4B75' }}>〜 いで (âm i đục)</td>
                    <td style={{ padding: '0.75rem', color: '#122438' }}>泳ぐ → <strong style={{ color: '#1E4B75' }}>泳いで</strong>, 急ぐ → <strong style={{ color: '#1E4B75' }}>急いで</strong></td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--washi-border)' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 700, color: '#C83824' }}>す (su)</td>
                    <td style={{ padding: '0.75rem', fontWeight: 800, color: '#1E4B75' }}>〜 して</td>
                    <td style={{ padding: '0.75rem', color: '#122438' }}>話す → <strong style={{ color: '#1E4B75' }}>話して</strong>, 貸す → <strong style={{ color: '#1E4B75' }}>貸して</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* BENTO CARD 2: SATELLITE (span 4) - 3 BƯỚC PHÂN BIỆT NHÓM */}
          <div className="bento-col-4 bento-card-artisan" style={{ padding: '1.75rem' }}>
            <div className="micro-badge-label" style={{ background: '#EBF5EE', color: '#2A6B3D', marginBottom: '0.5rem' }}>
              PHƯƠNG PHÁP NHẬN DIỆN
            </div>
            <h3 style={{ fontFamily: 'var(--font-mincho)', fontSize: '1.2rem', color: '#122438', fontWeight: 800, margin: '0 0 0.85rem 0' }}>
              3 Nhóm Động Từ
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.84rem', lineHeight: 1.5 }}>
              <div style={{ padding: '0.65rem 0.8rem', background: '#F0F7F2', borderRadius: '10px', borderLeft: '4px solid #2A6B3D' }}>
                <strong style={{ color: '#144020' }}>Nhóm 2 (Ichidan):</strong> Đuôi trước Masu là cột <em>I</em> hoặc <em>E</em> + <em>RU</em>.
                <div style={{ color: '#2A6B3D', fontWeight: 700, marginTop: '0.2rem' }}>Quy tắc: Bỏ る + て/ます</div>
              </div>

              <div style={{ padding: '0.65rem 0.8rem', background: '#EDF4FA', borderRadius: '10px', borderLeft: '4px solid #1E4B75' }}>
                <strong style={{ color: '#0F2C47' }}>Nhóm 1 (Godan):</strong> Đa số động từ đuôi cột <em>U</em>.
                <div style={{ color: '#1E4B75', fontWeight: 700, marginTop: '0.2rem' }}>Quy tắc: Biến âm theo đuôi</div>
              </div>

              <div style={{ padding: '0.65rem 0.8rem', background: '#FFF9E6', borderRadius: '10px', borderLeft: '4px solid #B8853C' }}>
                <strong style={{ color: '#664B16' }}>Nhóm 3 (Bất quy tắc):</strong>
                <div style={{ color: '#B8853C', fontWeight: 700, marginTop: '0.2rem' }}>する → して | 来る → 来て (きて)</div>
              </div>
            </div>
          </div>

          {/* BENTO CARD 3: SATELLITE (span 6) - 6 NGOẠI LỆ BẪY KINH ĐIỂN */}
          <div className="bento-col-6 bento-card-artisan" style={{ padding: '1.75rem' }}>
            <div className="micro-badge-label" style={{ background: '#FFF2F0', color: '#C83824', marginBottom: '0.5rem' }}>
              CỰC KỲ DỄ NHẦM
            </div>
            <h3 style={{ fontFamily: 'var(--font-mincho)', fontSize: '1.2rem', color: '#122438', fontWeight: 800, margin: '0 0 0.75rem 0' }}>
              6 Động Từ Ngoại Lệ
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#786A5E', margin: '0 0 0.85rem 0' }}>
              Các từ đuôi nhìn giống Nhóm 2 nhưng thực tế thuộc <strong style={{ color: '#122438' }}>Nhóm 1</strong>, hoặc biến âm khác biệt:
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.65rem', fontSize: '0.84rem' }}>
              <div style={{ padding: '0.5rem 0.7rem', background: '#FAF8F5', borderRadius: '8px', border: '1px solid var(--washi-border)', color: '#122438' }}>
                <strong>1. 行く (iku):</strong> Đi<br />
                <span style={{ color: '#C83824', fontWeight: 800 }}>→ 行って (itte)</span> (không chia iite!)
              </div>
              <div style={{ padding: '0.5rem 0.7rem', background: '#FAF8F5', borderRadius: '8px', border: '1px solid var(--washi-border)', color: '#122438' }}>
                <strong>2. 帰る (kaeru):</strong> Về<br />
                <span style={{ color: '#1E4B75', fontWeight: 800 }}>→ 帰って (Nhóm 1)</span>
              </div>
              <div style={{ padding: '0.5rem 0.7rem', background: '#FAF8F5', borderRadius: '8px', border: '1px solid var(--washi-border)', color: '#122438' }}>
                <strong>3. 切る (kiru):</strong> Cắt<br />
                <span style={{ color: '#1E4B75', fontWeight: 800 }}>→ 切って (Nhóm 1)</span>
              </div>
              <div style={{ padding: '0.5rem 0.7rem', background: '#FAF8F5', borderRadius: '8px', border: '1px solid var(--washi-border)', color: '#122438' }}>
                <strong>4. 知る (shiru):</strong> Biết<br />
                <span style={{ color: '#1E4B75', fontWeight: 800 }}>→ 知って (Nhóm 1)</span>
              </div>
              <div style={{ padding: '0.5rem 0.7rem', background: '#FAF8F5', borderRadius: '8px', border: '1px solid var(--washi-border)', color: '#122438' }}>
                <strong>5. 入る (hairu):</strong> Vào<br />
                <span style={{ color: '#1E4B75', fontWeight: 800 }}>→ 入って (Nhóm 1)</span>
              </div>
              <div style={{ padding: '0.5rem 0.7rem', background: '#FAF8F5', borderRadius: '8px', border: '1px solid var(--washi-border)', color: '#122438' }}>
                <strong>6. 走る (hashiru):</strong> Chạy<br />
                <span style={{ color: '#1E4B75', fontWeight: 800 }}>→ 走って (Nhóm 1)</span>
              </div>
            </div>
          </div>

          {/* BENTO CARD 4: SATELLITE (span 6) - BÀI CA VẦN BIẾN ÂM THỂ TE */}
          <div className="bento-col-6 bento-card-artisan" style={{ padding: '1.75rem', background: 'linear-gradient(135deg, #FAF7F0 0%, #F5EFE3 100%)' }}>
            <div className="micro-badge-label" style={{ background: '#FFF9E6', color: '#B8853C', marginBottom: '0.5rem' }}>
              MẸO NHỚ THẦN TỐC
            </div>
            <h3 style={{ fontFamily: 'var(--font-mincho)', fontSize: '1.2rem', color: '#122438', fontWeight: 800, margin: '0 0 0.5rem 0' }}>
              Bài Ca Vần Biến Âm Thể Te
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#786A5E', margin: '0 0 0.85rem 0' }}>
              Học thuộc 4 câu thơ dân gian để nhớ trọn vẹn quy tắc biến âm chỉ sau 30 giây:
            </p>

            <div
              style={{
                fontFamily: 'var(--font-maru)',
                fontSize: '0.92rem',
                lineHeight: 1.8,
                color: '#122438',
                background: '#FFFFFF',
                padding: '1rem 1.25rem',
                borderRadius: '12px',
                border: '1px solid var(--washi-border)',
                boxShadow: 'var(--shadow-washi-sm)',
              }}
            >
              🎵 <strong>I - Chi - Ri</strong> biến thành <strong style={{ color: '#C83824' }}>TTE</strong> (って)<br />
              🎵 <strong>Mi - Bi - Ni</strong> biến thành <strong style={{ color: '#1E4B75' }}>NDE</strong> (んで)<br />
              🎵 <strong>Ki</strong> thành <strong style={{ color: '#1E4B75' }}>ITE</strong>, <strong>Gi</strong> thành <strong style={{ color: '#1E4B75' }}>IDE</strong><br />
              🎵 <strong>Shi</strong> giữ nguyên <strong style={{ color: '#1E4B75' }}>SHITE</strong>, <strong>Iku</strong> là <strong style={{ color: '#C83824' }}>ITTE</strong>!
            </div>
          </div>

          {/* BENTO CARD 5: FULL-WIDTH ANCHOR (span 12) - BẢNG TRA CỨU 50 ĐỘNG TỪ CỐT LÕI */}
          <div className="bento-col-12 bento-card-artisan" style={{ padding: '1.75rem 2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-mincho)', fontSize: '1.45rem', color: '#122438', fontWeight: 800, margin: 0 }}>
                  📚 Tra Cứu 50 Động Từ Cốt Lõi
                </h2>
                <div style={{ fontSize: '0.82rem', color: '#786A5E', marginTop: '0.2rem' }}>
                  Hiển thị {searchedVerbs.length} / {allVerbs.length} động từ
                </div>
              </div>

              {/* Ô TÌM KIẾM NHANH (LIVE SEARCH) */}
              <div style={{ minWidth: '260px' }}>
                <input
                  type="text"
                  placeholder="🔍 Tìm chữ Hán, Hiragana, nghĩa..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.95rem',
                    borderRadius: '8px',
                    border: '1.2px solid var(--washi-border)',
                    fontSize: '0.86rem',
                    color: '#122438',
                    outline: 'none',
                    background: '#FFFFFF',
                  }}
                />
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ background: '#FAF7F0', borderBottom: '1.5px solid var(--washi-border)' }}>
                    <th style={{ padding: '0.65rem 0.75rem', color: '#122438' }}>STT</th>
                    <th style={{ padding: '0.65rem 0.75rem', color: '#122438' }}>Hán tự</th>
                    <th style={{ padding: '0.65rem 0.75rem', color: '#122438' }}>Hiragana</th>
                    <th style={{ padding: '0.65rem 0.75rem', color: '#122438' }}>Nghĩa</th>
                    <th style={{ padding: '0.65rem 0.75rem', color: '#122438' }}>Nhóm</th>
                    <th style={{ padding: '0.65rem 0.75rem', color: '#122438' }}>Thể Te (て)</th>
                    <th style={{ padding: '0.65rem 0.75rem', color: '#122438' }}>Thể Ru (る)</th>
                    <th style={{ padding: '0.65rem 0.75rem', color: '#122438' }}>Phát âm</th>
                  </tr>
                </thead>
                <tbody>
                  {searchedVerbs.map((v, idx) => (
                    <tr
                      key={v.id}
                      style={{
                        borderBottom: '1px solid var(--washi-border)',
                        background: idx % 2 === 0 ? '#FFFFFF' : 'rgba(250, 248, 245, 0.6)',
                      }}
                    >
                      <td style={{ padding: '0.65rem 0.75rem', color: '#786A5E' }}>{idx + 1}</td>
                      <td style={{ padding: '0.65rem 0.75rem', fontFamily: 'var(--font-mincho)', fontWeight: 800, fontSize: '1.15rem', color: '#122438' }}>
                        {v.kanji}
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem', color: '#1E4B75', fontWeight: 600 }}>{v.hiragana}</td>
                      <td style={{ padding: '0.65rem 0.75rem', fontWeight: 600, color: '#122438' }}>{v.meaning_vi}</td>
                      <td style={{ padding: '0.65rem 0.75rem' }}>
                        <span
                          className="micro-badge-label"
                          style={{
                            background: v.group === 1 ? '#EDF4FA' : v.group === 2 ? '#EBF5EE' : '#FDF2F0',
                            color: v.group === 1 ? '#1E4B75' : v.group === 2 ? '#2A6B3D' : '#C83824',
                            border: `1px solid ${v.group === 1 ? '#B8D5E5' : v.group === 2 ? '#C2E5CC' : '#F5C6CB'}`,
                          }}
                        >
                          N{v.group} {v.isException ? '★' : ''}
                        </span>
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem', color: '#C83824', fontWeight: 700 }}>
                        {v.te_form.hiragana}
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem', color: '#1E4B75', fontWeight: 700 }}>
                        {v.ru_form.hiragana}
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem' }}>
                        <JapaneseSpeakerButton text={v.kanji} size={18} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SỔ TAY LÝ THUYẾT POPOVER MODAL (MỞ RA XEM BẤT CỨ LÚC NÀO KHI ĐANG LUYỆN TẬP)
          Đáp ứng 100% yêu cầu người dùng: "chuẩn bị sẵn lý thuyết cách chia, phân nhóm có sẵn để mình mở ra xem bất cứ lúc nào"
          ========================================================================= */}
      {isCheatsheetOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 150,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.25rem',
          }}
        >
          {/* Backdrop mờ che phủ toàn màn hình với high blur */}
          <div
            onClick={() => setIsCheatsheetOpen(false)}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(10, 28, 51, 0.65)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
            }}
          />

          {/* Khung Makimono Sổ tay lý thuyết */}
          <div
            className="bento-card-artisan"
            style={{
              position: 'relative',
              zIndex: 2,
              width: '100%',
              maxWidth: '740px',
              maxHeight: '90vh',
              background: '#FAF8F5',
              border: '2px solid #C89B58',
              boxShadow: '0 20px 50px rgba(10, 28, 51, 0.45)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Header Sổ tay (Sticky Header) */}
            <div
              style={{
                position: 'sticky',
                top: 0,
                zIndex: 10,
                padding: '1.1rem 1.5rem',
                background: 'linear-gradient(135deg, #10253F 0%, #1D436C 100%)',
                color: '#FFFFFF',
                borderBottom: '1.5px solid #D4AF37',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontFamily: 'var(--font-mincho)', fontSize: '1.25rem', fontWeight: 800, color: '#FAF8F5' }}>
                  📜 Sổ Tay Bí Kíp Chia Động Từ · 動詞活用便覧
                </div>
                <div style={{ fontSize: '0.76rem', color: '#E8D9BD', marginTop: '0.2rem', fontFamily: 'var(--font-maru)' }}>
                  Tra cứu tức thì quy tắc 3 nhóm, biến âm thể Te và thể Ru
                </div>
              </div>

              <button
                onClick={() => setIsCheatsheetOpen(false)}
                title="Đóng (phím Esc)"
                style={{
                  background: 'rgba(255, 255, 255, 0.12)',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  borderRadius: '8px',
                  color: '#FAF8F5',
                  fontSize: '1.1rem',
                  cursor: 'pointer',
                  padding: '0.35rem 0.75rem',
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>

            {/* 4 Tabs tra cứu con (Sticky Anchor Navigation Pill Container) */}
            <div
              style={{
                position: 'sticky',
                top: '58px',
                zIndex: 9,
                display: 'flex',
                gap: '0.45rem',
                padding: '0.75rem 1.25rem',
                background: 'rgba(240, 235, 224, 0.95)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                borderBottom: '1px solid var(--washi-border)',
                overflowX: 'auto',
                whiteSpace: 'nowrap',
              }}
            >
              {[
                { id: 'groups', label: '1. Phân 3 nhóm' },
                { id: 'te', label: '2. Biến âm Thể Te' },
                { id: 'ru', label: '3. Quy tắc Thể Ru' },
                { id: 'exceptions', label: '4. Ngoại lệ & Ca vần' },
              ].map((tab) => {
                const isActive = cheatsheetTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setCheatsheetTab(tab.id as any)}
                    style={{
                      padding: '0.45rem 0.95rem',
                      borderRadius: '8px',
                      border: '1px solid',
                      borderColor: isActive ? '#1E4B75' : 'transparent',
                      background: isActive ? '#1E4B75' : '#FFFFFF',
                      color: isActive ? '#FFFFFF' : '#122438',
                      fontSize: '0.84rem',
                      fontWeight: isActive ? 800 : 600,
                      cursor: 'pointer',
                      fontFamily: 'var(--font-maru)',
                      boxShadow: isActive ? '0 2px 6px rgba(30, 75, 117, 0.2)' : 'none',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Nội dung chi tiết từng Tab trong Sổ tay */}
            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, fontSize: '0.9rem', lineHeight: 1.6 }}>
              {/* TAB 1: PHÂN 3 NHÓM ĐỘNG TỪ */}
              {cheatsheetTab === 'groups' && (
                <div>
                  <h3 style={{ fontFamily: 'var(--font-mincho)', fontSize: '1.2rem', color: '#122438', marginBottom: '0.75rem' }}>
                    Cách nhận diện 3 Nhóm Động từ tiếng Nhật
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <div style={{ padding: '0.85rem', background: '#FFFFFF', borderRadius: '12px', borderLeft: '4px solid #B8853C', color: '#122438' }}>
                      <strong style={{ color: '#B8853C' }}>Nhóm 3 (Bất quy tắc):</strong> Chỉ có đúng 2 động từ:
                      <ul style={{ paddingLeft: '1.25rem', marginTop: '0.35rem' }}>
                        <li><strong style={{ color: '#122438' }}>する (suru):</strong> Làm → thể Masu: <em>します</em>, thể Te: <em>して</em>.</li>
                        <li><strong style={{ color: '#122438' }}>来る (くる - kuru):</strong> Đến → thể Masu: <em>来ます (きます)</em>, thể Te: <em>来て (きて)</em>.</li>
                      </ul>
                    </div>

                    <div style={{ padding: '0.85rem', background: '#FFFFFF', borderRadius: '12px', borderLeft: '4px solid #2A6B3D', color: '#122438' }}>
                      <strong style={{ color: '#2A6B3D' }}>Nhóm 2 (Ichidan - 一段):</strong>
                      <p style={{ margin: '0.3rem 0' }}>
                        Tận cùng là <strong>る (ru)</strong> và âm đứng trước <strong>る</strong> thuộc cột <strong>I</strong> hoặc cột <strong>E</strong>.
                      </p>
                      <div style={{ background: '#F0F7F2', padding: '0.5rem 0.75rem', borderRadius: '8px', fontSize: '0.85rem', color: '#144020' }}>
                        ✓ Ví dụ: 食べる (tab<strong>e</strong>-ru) - cột E; 見る (m<strong>i</strong>-ru) - cột I; 起きる (ok<strong>i</strong>-ru) - cột I.<br />
                        ✓ Quy tắc chia: <strong>Bỏ る + て / ます</strong> (食べる → 食べて / 食べます).
                      </div>
                    </div>

                    <div style={{ padding: '0.85rem', background: '#FFFFFF', borderRadius: '12px', borderLeft: '4px solid #1E4B75', color: '#122438' }}>
                      <strong style={{ color: '#1E4B75' }}>Nhóm 1 (Godan - 五段):</strong>
                      <p style={{ margin: '0.3rem 0' }}>
                        Tất cả các động từ còn lại tận cùng là cột <strong>U</strong>: <em>う, つ, る, む, ぶ, ぬ, く, ぐ, す</em> (kể cả từ có đuôi -iru/-eru nhưng thuộc nhóm 1 ngoại lệ).
                      </p>
                      <div style={{ background: '#EDF4FA', padding: '0.5rem 0.75rem', borderRadius: '8px', fontSize: '0.85rem', color: '#0F2C47' }}>
                        ✓ Quy tắc chia thể Te: Biến âm theo nhóm phụ âm (xem Tab 2).
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: BIẾN ÂM THỂ TE */}
              {cheatsheetTab === 'te' && (
                <div>
                  <h3 style={{ fontFamily: 'var(--font-mincho)', fontSize: '1.2rem', color: '#122438', marginBottom: '0.5rem' }}>
                    Quy tắc Biến âm Thể Te (て形の音便)
                  </h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                    <thead>
                      <tr style={{ background: '#FAF7F0', borderBottom: '1.5px solid var(--washi-border)' }}>
                        <th style={{ padding: '0.6rem 0.75rem', color: '#122438' }}>Đuôi từ điển</th>
                        <th style={{ padding: '0.6rem 0.75rem', color: '#122438' }}>Chuyển sang thể Te</th>
                        <th style={{ padding: '0.6rem 0.75rem', color: '#122438' }}>Ví dụ</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid var(--washi-border)' }}>
                        <td style={{ padding: '0.65rem', fontWeight: 700, color: '#C83824' }}>う, つ, る</td>
                        <td style={{ padding: '0.65rem', fontWeight: 800, color: '#1E4B75' }}>〜 って (âm ngắt)</td>
                        <td style={{ padding: '0.65rem', color: '#122438' }}>買う → <strong style={{ color: '#C83824' }}>買って</strong>, 待つ → <strong style={{ color: '#C83824' }}>待って</strong>, 取る → <strong style={{ color: '#C83824' }}>取って</strong></td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid var(--washi-border)', background: 'rgba(250,248,245,0.6)' }}>
                        <td style={{ padding: '0.65rem', fontWeight: 700, color: '#C83824' }}>む, ぶ, ぬ</td>
                        <td style={{ padding: '0.65rem', fontWeight: 800, color: '#1E4B75' }}>〜 んで (âm mũi)</td>
                        <td style={{ padding: '0.65rem', color: '#122438' }}>飲む → <strong style={{ color: '#1E4B75' }}>飲んで</strong>, 遊ぶ → <strong style={{ color: '#1E4B75' }}>遊んで</strong>, 死ぬ → <strong style={{ color: '#1E4B75' }}>死んで</strong></td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid var(--washi-border)' }}>
                        <td style={{ padding: '0.65rem', fontWeight: 700, color: '#C83824' }}>く (ku)</td>
                        <td style={{ padding: '0.65rem', fontWeight: 800, color: '#1E4B75' }}>〜 いて (âm i)</td>
                        <td style={{ padding: '0.65rem', color: '#122438' }}>書く → <strong style={{ color: '#1E4B75' }}>書いて</strong>, 聞く → <strong style={{ color: '#1E4B75' }}>聞いて</strong></td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid var(--washi-border)', background: 'rgba(250,248,245,0.6)' }}>
                        <td style={{ padding: '0.65rem', fontWeight: 700, color: '#C83824' }}>ぐ (gu)</td>
                        <td style={{ padding: '0.65rem', fontWeight: 800, color: '#1E4B75' }}>〜 いで (âm i đục)</td>
                        <td style={{ padding: '0.65rem', color: '#122438' }}>泳ぐ → <strong style={{ color: '#1E4B75' }}>泳いで</strong>, 急ぐ → <strong style={{ color: '#1E4B75' }}>急いで</strong></td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid var(--washi-border)' }}>
                        <td style={{ padding: '0.65rem', fontWeight: 700, color: '#C83824' }}>す (su)</td>
                        <td style={{ padding: '0.65rem', fontWeight: 800, color: '#1E4B75' }}>〜 して</td>
                        <td style={{ padding: '0.65rem', color: '#122438' }}>話す → <strong style={{ color: '#1E4B75' }}>話して</strong>, 貸す → <strong style={{ color: '#1E4B75' }}>貸して</strong></td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid var(--washi-border)', background: '#FFF2F0' }}>
                        <td style={{ padding: '0.65rem', fontWeight: 800, color: '#C83824' }}>★ 行く (iku)</td>
                        <td style={{ padding: '0.65rem', fontWeight: 800, color: '#C83824' }}>行って (itte)</td>
                        <td style={{ padding: '0.65rem', color: '#9E2413' }}><strong>Bắt buộc biến âm ngắt</strong> (không chia 行いて!)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* TAB 3: QUY TẮC THỂ RU (TỪ ĐIỂN) */}
              {cheatsheetTab === 'ru' && (
                <div>
                  <h3 style={{ fontFamily: 'var(--font-mincho)', fontSize: '1.2rem', color: '#122438', marginBottom: '0.75rem' }}>
                    Quy tắc Thể Ru (Thể Từ Điển - 辞書形)
                  </h3>
                  <p style={{ color: '#786A5E', fontSize: '0.85rem', marginBottom: '0.85rem' }}>
                    Thể nguyên mẫu (Dictionary Form) dùng khi tra từ điển, nói chuyện thân mật, hoặc đi trước các ngữ pháp `ことができる`, `まえに`, `つもり`...
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ padding: '0.85rem', background: '#FFFFFF', borderRadius: '10px', border: '1px solid var(--washi-border)', color: '#122438' }}>
                      <strong>1. Từ Thể Masu sang Thể Ru (Nhóm 1):</strong>
                      <p style={{ margin: '0.25rem 0', fontSize: '0.85rem' }}>
                        Đổi âm trước <strong>ます</strong> từ cột <strong>I</strong> sang cột <strong>U</strong> tương ứng:
                      </p>
                      <div style={{ background: '#FAF8F5', padding: '0.45rem 0.75rem', borderRadius: '6px', fontSize: '0.84rem', color: '#122438' }}>
                        ・か<strong style={{ color: '#C83824' }}>き</strong>ます → か<strong style={{ color: '#1E4B75' }}>く</strong> (kaku)<br />
                        ・の<strong style={{ color: '#C83824' }}>み</strong>ます → の<strong style={{ color: '#1E4B75' }}>む</strong> (nomu)<br />
                        ・い<strong style={{ color: '#C83824' }}>き</strong>ます → い<strong style={{ color: '#1E4B75' }}>く</strong> (iku)<br />
                        ・はな<strong style={{ color: '#C83824' }}>し</strong>ます → はな<strong style={{ color: '#1E4B75' }}>す</strong> (hanasu)
                      </div>
                    </div>

                    <div style={{ padding: '0.85rem', background: '#FFFFFF', borderRadius: '10px', border: '1px solid var(--washi-border)', color: '#122438' }}>
                      <strong>2. Từ Thể Masu sang Thể Ru (Nhóm 2):</strong>
                      <p style={{ margin: '0.25rem 0', fontSize: '0.85rem' }}>
                        Chỉ cần bỏ <strong>ます</strong> và thêm <strong>る</strong>:
                      </p>
                      <div style={{ background: '#FAF8F5', padding: '0.45rem 0.75rem', borderRadius: '6px', fontSize: '0.84rem', color: '#122438' }}>
                        ・たべます → たべ<strong style={{ color: '#2A6B3D' }}>る</strong> (taberu)<br />
                        ・みます → み<strong style={{ color: '#2A6B3D' }}>る</strong> (miru)<br />
                        ・ねます → ね<strong style={{ color: '#2A6B3D' }}>る</strong> (neru)
                      </div>
                    </div>

                    <div style={{ padding: '0.85rem', background: '#FFFFFF', borderRadius: '10px', border: '1px solid var(--washi-border)', color: '#122438' }}>
                      <strong>3. Nhóm 3 (Bất quy tắc):</strong>
                      <div style={{ background: '#FAF8F5', padding: '0.45rem 0.75rem', borderRadius: '6px', fontSize: '0.84rem', color: '#122438' }}>
                        ・します → <strong style={{ color: '#B8853C' }}>する</strong> (suru)<br />
                        ・きます → <strong style={{ color: '#B8853C' }}>くる</strong> (kuru)
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: NGOẠI LỆ & BÀI CA VẦN */}
              {cheatsheetTab === 'exceptions' && (
                <div>
                  <h3 style={{ fontFamily: 'var(--font-mincho)', fontSize: '1.2rem', color: '#122438', marginBottom: '0.5rem' }}>
                    Top 6 Ngoại Lệ Bẫy &amp; Bài Ca Vần Nhớ Thần Tốc
                  </h3>

                  <div style={{ marginBottom: '1rem', padding: '0.85rem', background: '#FFF7F6', borderRadius: '12px', border: '1px solid #F5C6CB' }}>
                    <div style={{ fontWeight: 800, color: '#C83824', marginBottom: '0.4rem' }}>
                      ⚠️ 6 Động từ kết thúc bằng -iru / -eru nhưng là NHÓM 1:
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.45rem', fontSize: '0.82rem', color: '#122438' }}>
                      <div>1. <strong>帰る (kaeru):</strong> Về → <strong style={{ color: '#1E4B75' }}>帰って</strong></div>
                      <div>2. <strong>切る (kiru):</strong> Cắt → <strong style={{ color: '#1E4B75' }}>切って</strong></div>
                      <div>3. <strong>知る (shiru):</strong> Biết → <strong style={{ color: '#1E4B75' }}>知って</strong></div>
                      <div>4. <strong>入る (hairu):</strong> Vào → <strong style={{ color: '#1E4B75' }}>入って</strong></div>
                      <div>5. <strong>走る (hashiru):</strong> Chạy → <strong style={{ color: '#1E4B75' }}>走って</strong></div>
                      <div>6. <strong>行く (iku):</strong> Đi → <strong style={{ color: '#C83824' }}>行って</strong> (Ngoại lệ ku)</div>
                    </div>
                  </div>

                  <div style={{ padding: '1rem', background: '#FFFFFF', borderRadius: '12px', border: '1px solid #D4AF37' }}>
                    <div style={{ fontWeight: 800, color: '#B8853C', marginBottom: '0.4rem', fontFamily: 'var(--font-maru)' }}>
                      🎵 Bài ca vần biến âm thể Te truyền miệng:
                    </div>
                    <div style={{ fontFamily: 'var(--font-maru)', fontSize: '0.92rem', lineHeight: 1.8, color: '#122438' }}>
                      🎵 <strong>I - Chi - Ri</strong> biến thành <strong style={{ color: '#C83824' }}>TTE</strong> (って)<br />
                      🎵 <strong>Mi - Bi - Ni</strong> biến thành <strong style={{ color: '#1E4B75' }}>NDE</strong> (んで)<br />
                      🎵 <strong>Ki</strong> thành <strong style={{ color: '#1E4B75' }}>ITE</strong>, <strong>Gi</strong> thành <strong style={{ color: '#1E4B75' }}>IDE</strong><br />
                      🎵 <strong>Shi</strong> giữ nguyên <strong style={{ color: '#1E4B75' }}>SHITE</strong>, <strong>Iku</strong> là <strong style={{ color: '#C83824' }}>ITTE</strong>!
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Sổ tay */}
            <div
              style={{
                padding: '0.75rem 1.5rem',
                background: '#FAF8F5',
                borderTop: '1px solid var(--washi-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: '0.78rem', color: '#786A5E' }}>
                💡 Bấm <strong>Esc</strong> hoặc nút Đóng để quay lại bài tập
              </span>
              <button
                type="button"
                onClick={() => setIsCheatsheetOpen(false)}
                className="btn-washi"
                style={{ padding: '0.45rem 1.25rem', fontSize: '0.85rem' }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </main>
  );
}
