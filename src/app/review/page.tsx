'use client';

import { useState, useEffect, useCallback, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ToriiIcon, SensuFanIcon } from '@/components/japanese/Icons';
import { PitchAccentGraph } from '@/components/japanese/PitchAccentGraph';
import { JapaneseSpeakerButton } from '@/components/japanese/JapaneseSpeakerButton';
import { japaneseAudio } from '@/components/japanese/AudioEffects';
import { parseClozeSegments, stripCloze } from '@/lib/cloze';
import { parseCardDetails } from '@/lib/reading-parser';
import { DarumaMascot } from '@/components/japanese/DarumaMascot';
import { JapaneseArtBackdrop } from '@/components/art/JapaneseArtBackdrop';
import { useFsrsScheduler } from '@/hooks/useFsrsScheduler';
import { createEmptyCard, Rating, type Card, type RecordLog } from 'ts-fsrs';
import {
  cacheCardsLocally,
  getOfflineCards,
  recordPendingReview,
  getUnsyncedReviewCount,
  syncPendingReviewsToServer,
} from '@/lib/offline-db';
import { JapaneseAudioPool } from '@/lib/audio-pool';
import { KanjiStrokePlayer } from '@/components/showcase/KanjiStrokePlayer';

interface CardItem {
  id: string;
  kanji: string;
  reading?: string;
  meaning: string;
  pitch?: string;
  type: string;
  deckId: string;
  deckName?: string;
  sentence?: string;
  state?: string;
  due?: string | number | Date;
  stability?: number;
  difficulty?: number;
  reps?: number;
  lapses?: number;
}

interface DeckItem {
  id: string;
  name: string;
  description?: string;
}

/**
 * Loading Skeleton phong cách giấy Washi truyền thống
 */
function ReviewLoadingSkeleton() {
  return (
    <div style={{ maxWidth: '640px', margin: '3rem auto', padding: '0 1.25rem', textAlign: 'center' }}>
      <div
        className="card-karuta"
        style={{
          padding: '3rem 2rem',
          background: '#FAF7F2',
          border: '1.5px solid #E4DAC9',
          borderRadius: '18px',
          boxShadow: '0 8px 24px rgba(18, 36, 56, 0.06)',
        }}
      >
        <DarumaMascot progressPercentage={25} size={72} />
        <h3
          style={{
            fontFamily: 'var(--font-mincho)',
            fontSize: '1.35rem',
            color: '#122438',
            marginTop: '1.5rem',
          }}
        >
          Đang chuẩn bị bộ thẻ Karuta...
        </h3>
        <p style={{ color: '#786A5E', fontSize: '0.9rem', marginTop: '0.5rem' }}>
          Đang tải dữ liệu và tối ưu hóa hàng đợi FSRS
        </p>
      </div>
    </div>
  );
}

/**
 * Nội dung Phiên Ôn tập Karuta (Được bọc trong Suspense để đọc searchParams an toàn)
 */
function ReviewSessionContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const targetDeckId = searchParams.get('deck') || 'all';
  const initialMode = searchParams.get('mode') || 'fsrs_due';

  const { calculateNextReview, isReady: isWorkerReady } = useFsrsScheduler();
  const [fsrsNextStates, setFsrsNextStates] = useState<RecordLog | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [unsyncedCount, setUnsyncedCount] = useState(0);

  const cardStartTimeRef = useRef<number>(Date.now());
  const deckMenuRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [deckList, setDeckList] = useState<DeckItem[]>([]);
  const [queue, setQueue] = useState<CardItem[]>([]);
  const [currentIdx, setCurrentIdx] = useState(1);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showStrokeOrder, setShowStrokeOrder] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [cramMode, setCramMode] = useState(initialMode === 'cram_all');
  const [showDeckMenu, setShowDeckMenu] = useState(false);

  // Thống kê phiên học
  const [gradesCount, setGradesCount] = useState({
    Again: 0,
    Hard: 0,
    Good: 0,
    Easy: 0,
  });

  // Lịch sử chấm điểm phục vụ tính năng Hoàn tác FSRS Undo (DEF-UI-KARUTA-003)
  const [reviewHistory, setReviewHistory] = useState<Array<{
    cardIdx: number;
    grade: 'Again' | 'Hard' | 'Good' | 'Easy';
  }>>([]);
  const [undoToast, setUndoToast] = useState<string | null>(null);

  // Tải dữ liệu thẻ từ API /api/cards theo Deck đã chọn với cơ chế Offline Fallback
  useEffect(() => {
    async function loadCards() {
      try {
        setLoading(true);
        const url = targetDeckId && targetDeckId !== 'all' ? `/api/backend/api/v1/cards?deck=${encodeURIComponent(targetDeckId)}&limit=1000` : '/api/backend/api/v1/cards?limit=1000';
        let rawCards: CardItem[] = [];
        let fetchedDecks: DeckItem[] = [];

        try {
          const res = await fetch(url);
          const data = await res.json();

          if (data.success) {
            rawCards = data.data || [];
            fetchedDecks = data.decks || [];
            setIsOffline(false);

            // Nạp thẻ vào bộ nhớ ngoại tuyến IndexedDB (Dexie.js)
            if (rawCards.length > 0) {
              cacheCardsLocally(
                rawCards.map((c) => ({
                  id: c.id,
                  front: c.kanji,
                  reading: c.reading,
                  meaning: c.meaning,
                  deckId: c.deckId,
                  deckName: c.deckName,
                  type: c.type,
                  sentence: c.sentence,
                  pitch: c.pitch,
                  state: c.state,
                  due: c.due,
                  stability: c.stability,
                  difficulty: c.difficulty,
                }))
              );
            }
          }
        } catch (fetchErr) {
          console.warn('[Review] API không phản hồi hoặc mất mạng, tự động nạp từ IndexedDB ngoại tuyến:', fetchErr);
          setIsOffline(true);
          const localCards = await getOfflineCards(targetDeckId);
          rawCards = localCards.map((c) => ({
            id: c.id,
            kanji: c.front,
            reading: c.reading,
            meaning: c.meaning,
            pitch: c.pitch,
            type: c.type || 'vocab',
            deckId: c.deckId,
            deckName: c.deckName,
            sentence: c.sentence,
            state: c.state,
            due: c.due ? new Date(c.due) : undefined,
            stability: c.stability,
            difficulty: c.difficulty,
          }));
        }

        setDeckList(fetchedDecks);

        let studyCards: CardItem[] = [];
        if (cramMode) {
          studyCards = rawCards;
        } else {
          const now = new Date();
          const dueCards = rawCards.filter((c) => {
            if (!c.due) return true;
            return new Date(c.due) <= now;
          });
          studyCards = dueCards.length > 0 ? dueCards : rawCards;
        }

        setQueue(studyCards);
        setCurrentIdx(1);
        setShowAnswer(false);
        setShowStrokeOrder(false);
        setIsCompleted(false);
        setGradesCount({ Again: 0, Hard: 0, Good: 0, Easy: 0 });

        // Cập nhật số bản ghi chưa đồng bộ
        const count = await getUnsyncedReviewCount();
        setUnsyncedCount(count);
      } catch (err) {
        console.error('Lỗi khi tải hàng đợi ôn tập:', err);
      } finally {
        setLoading(false);
      }
    }
    loadCards();
  }, [targetDeckId, cramMode]);

  // Đánh dấu component đã mounted để loại bỏ Hydration Mismatch (BUG-UI-01)
  useEffect(() => {
    setIsMounted(true);
    if (typeof window === 'undefined') return;

    const handleNetworkChange = async () => {
      const offline = !navigator.onLine;
      setIsOffline(offline);
      if (!offline) {
        // Phase 4 preview: never replay unsynced grades to a read-only BFF.
        const syncRes = { synced: 0 };
        if (syncRes.synced > 0) {
          const count = await getUnsyncedReviewCount();
          setUnsyncedCount(count);
        }
      }
    };

    setIsOffline(!navigator.onLine);
    window.addEventListener('online', handleNetworkChange);
    window.addEventListener('offline', handleNetworkChange);

    return () => {
      window.removeEventListener('online', handleNetworkChange);
      window.removeEventListener('offline', handleNetworkChange);
    };
  }, []);

  // Đóng dropdown bộ thẻ khi bấm Escape hoặc nhấp chuột ra ngoài (BUG-UI-05)
  useEffect(() => {
    if (!showDeckMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (deckMenuRef.current && !deckMenuRef.current.contains(e.target as Node)) {
        setShowDeckMenu(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowDeckMenu(false);
      }
    };
    document.addEventListener('pointerdown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showDeckMenu]);

  // Cập nhật mốc thời gian bắt đầu xem thẻ để đo chính xác responseTimeMs (BUG-FSRS-06)
  useEffect(() => {
    cardStartTimeRef.current = Date.now();
  }, [currentIdx]);

  const currentCard = queue && queue.length > 0 && currentIdx <= queue.length ? queue[currentIdx - 1] : null;
  const totalCards = queue ? queue.length : 0;
  const deckTitle =
    targetDeckId === 'all'
      ? 'Toàn bộ thẻ học'
      : deckList.find((d) => d.id === targetDeckId)?.name || 'Bộ thẻ chọn lọc';

  // Tính toán trước trạng thái FSRS qua Dedicated Web Worker chạy ngầm khi đổi thẻ
  useEffect(() => {
    if (!currentCard) {
      setFsrsNextStates(null);
      return;
    }

    const empty = createEmptyCard();
    const fsrsCard: Card = {
      ...empty,
      due: currentCard.due ? new Date(currentCard.due) : empty.due,
      stability: currentCard.stability ?? empty.stability,
      difficulty: currentCard.difficulty ?? empty.difficulty,
      reps: currentCard.reps ?? 0,
      lapses: currentCard.lapses ?? 0,
      state: currentCard.state ? (currentCard.state as any) : empty.state,
    };

    calculateNextReview(fsrsCard)
      .then((recordLog) => {
        setFsrsNextStates(recordLog);
      })
      .catch((err) => {
        console.warn('[Review FSRS Worker Error]', err);
      });
  }, [currentCard, calculateNextReview]);

  // Chuyển đổi khoảng cách thời gian FSRS sang chuỗi hiển thị trực quan
  const formatInterval = (rating: Rating.Again | Rating.Hard | Rating.Good | Rating.Easy): string => {
    const item = fsrsNextStates ? fsrsNextStates[rating] : null;
    if (!item) {
      if (rating === Rating.Again) return '< 1 phút';
      if (rating === Rating.Hard) return '~ 1.2 ngày';
      if (rating === Rating.Good) return '~ 3.5 ngày';
      return '~ 7.0 ngày';
    }

    const days = item.card.scheduled_days;
    if (days < 1) {
      const minutes = Math.max(1, Math.round(days * 24 * 60));
      return `< ${minutes} phút`;
    }
    if (days === 1) return '1 ngày';
    if (days < 30) return `${Math.round(days * 10) / 10} ngày`;
    const months = Math.round(days / 30);
    return `${months} tháng`;
  };

  // Chuyển đổi định dạng Pitch Accent
  const getPitchPattern = (pitchStr?: string): number => {
    if (!pitchStr) return 0;
    const match = pitchStr.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  };

  // Hành động Lật thẻ để xem đáp án
  const handleReveal = useCallback(() => {
    setShowAnswer(true);
    japaneseAudio.playHyoshigi();
  }, []);

  // Hành động Chấm điểm theo thuật toán FSRS (Bất đồng bộ không chặn luồng giao diện)
  // Phase 4: UI remains unchanged; mutation stays locked until
  // authenticated BFF and offline replay parity are verified.
  // No optimistic count, fake success or IndexedDB event is written.
  const handleGrade = useCallback(
    async (_grade: 'Again' | 'Hard' | 'Good' | 'Easy') => {
      if (!currentCard) return;
      setUndoToast('Bản xem trước: chấm điểm FSRS chưa được kích hoạt trên frontend mới.');
      setTimeout(() => setUndoToast(null), 3500);
    },
    [currentCard]
  );

  // Hành động Hoàn tác kết quả chấm điểm (Undo Grade - DEF-UI-KARUTA-003)
  const handleUndo = useCallback(() => {
    if (reviewHistory.length === 0) return;
    const lastItem = reviewHistory[reviewHistory.length - 1];
    setReviewHistory((prev) => prev.slice(0, -1));
    setCurrentIdx(lastItem.cardIdx);
    setShowAnswer(true);
    setIsCompleted(false);

    setGradesCount((prev) => ({
      ...prev,
      [lastItem.grade]: Math.max(0, prev[lastItem.grade] - 1),
    }));

    japaneseAudio.playWashiPaper();
    setUndoToast('Đã hoàn tác kết quả chấm điểm (Phím Z)');
    setTimeout(() => setUndoToast(null), 2500);
  }, [reviewHistory]);

  // Phím tắt thông minh: Space để lật, 1-4 để chấm điểm, Z để hoàn tác
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.key === 'z' || e.key === 'Z') && !e.ctrlKey && !e.metaKey) {
        if (reviewHistory.length > 0) {
          e.preventDefault();
          handleUndo();
          return;
        }
      }
      if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
        if (reviewHistory.length > 0) {
          e.preventDefault();
          handleUndo();
          return;
        }
      }

      if (e.code === 'Space' && !showAnswer) {
        e.preventDefault();
        handleReveal();
      } else if (showAnswer) {
        if (e.key === '1') handleGrade('Again');
        if (e.key === '2') handleGrade('Hard');
        if (e.key === '3') handleGrade('Good');
        if (e.key === '4') handleGrade('Easy');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAnswer, handleReveal, handleGrade, reviewHistory, handleUndo]);

  const progressPercent = totalCards > 0 ? Math.round((currentIdx / totalCards) * 100) : 0;

  if (loading) {
    return <ReviewLoadingSkeleton />;
  }

  // 1. TRƯỜNG HỢP DECK RỖNG HOÀN TOÀN (0 THẺ)
  if (!queue || queue.length === 0) {
    return (
      <div style={{ maxWidth: '640px', margin: '3rem auto', padding: '0 1.25rem', textAlign: 'center' }}>
        <div
          className="card-karuta"
          style={{
            padding: '3rem 2rem',
            background: '#FAF7F2',
            border: '1.5px solid #E4DAC9',
            borderRadius: '18px',
            boxShadow: '0 8px 24px rgba(18, 36, 56, 0.06)',
          }}
        >
          <DarumaMascot progressPercentage={0} size={84} />
          <h2
            style={{
              fontFamily: 'var(--font-mincho)',
              fontSize: '1.6rem',
              fontWeight: 800,
              color: '#122438',
              marginTop: '1.5rem',
              marginBottom: '0.5rem',
            }}
          >
            Chưa có thẻ trong bộ này
          </h2>
          <p style={{ color: '#786A5E', fontSize: '0.95rem', marginBottom: '2rem' }}>
            Bộ thẻ <strong>{deckTitle}</strong> hiện tại chưa có dữ liệu thẻ học đến hạn.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <Link href="/cards" className="btn-torii">
              Thư viện thẻ
            </Link>
            <Link href="/" className="btn-washi">
              Trang chủ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. MÀN HÌNH HOÀN THÀNH PHIÊN ÔN TẬP
  if (isCompleted) {
    const totalAnswered = gradesCount.Again + gradesCount.Hard + gradesCount.Good + gradesCount.Easy;
    const masteryPercent =
      totalAnswered > 0 ? Math.round(((gradesCount.Good + gradesCount.Easy) / totalAnswered) * 100) : 100;

    return (
      <div style={{ maxWidth: '640px', margin: '3rem auto', padding: '0 1.25rem', textAlign: 'center' }}>
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            padding: '3.5rem 2.25rem',
            background: '#FAF7F0',
            border: '2px solid #C89B58',
            borderRadius: '20px',
            boxShadow: '0 16px 36px rgba(18, 36, 56, 0.12)',
          }}
        >
          {/* Lớp nền mộc bản sóng vàng Rinpa nghệ thuật */}
          <JapaneseArtBackdrop
            src="/assets/art/rinpa-gold-waves-clouds.jpg"
            alt="Mây và sóng vàng Rinpa khải hoàn"
            opacity={0.16}
            blendMode="multiply"
            objectPosition="center"
          />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'inline-flex', marginBottom: '0.75rem' }}>
              <span
                style={{
                  padding: '0.35rem 1.1rem',
                  background: '#C83824',
                  color: '#FFFFFF',
                  borderRadius: '999px',
                  fontFamily: 'var(--font-mincho)',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  letterSpacing: '0.08em',
                  boxShadow: '0 4px 12px rgba(200, 56, 36, 0.3)',
                }}
              >
                満願成就 · KHẢI HOÀN TOÀN THẮNG
              </span>
            </div>

            <DarumaMascot progressPercentage={100} size={100} />

            <h2
              style={{
                fontFamily: 'var(--font-mincho)',
                fontSize: '2.2rem',
                fontWeight: 800,
                color: '#122438',
                marginTop: '1.25rem',
                marginBottom: '0.4rem',
              }}
            >
              お疲れ様でした！
            </h2>
            <p style={{ fontFamily: 'var(--font-maru)', fontSize: '1.1rem', color: '#3E6F48', fontWeight: 700 }}>
              Bạn đã hoàn thành xuất sắc {totalCards} thẻ của bộ {deckTitle}!
            </p>

            {/* Bảng tổng kết đánh giá tinh tế */}
            <div
              style={{
                margin: '1.75rem auto',
                padding: '1.1rem',
                background: 'rgba(255, 255, 255, 0.92)',
                borderRadius: '14px',
                border: '1.2px solid #E6DDCF',
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '0.5rem',
              }}
            >
              <div>
                <span style={{ fontSize: '0.78rem', color: '#9E3324', fontWeight: 700, fontFamily: 'var(--font-mincho)' }}>再 Again</span>
                <p style={{ fontFamily: 'var(--font-mincho)', fontSize: '1.4rem', fontWeight: 800, margin: '0.2rem 0 0' }}>{gradesCount.Again}</p>
              </div>
              <div>
                <span style={{ fontSize: '0.78rem', color: '#B87B28', fontWeight: 700, fontFamily: 'var(--font-mincho)' }}>難 Hard</span>
                <p style={{ fontFamily: 'var(--font-mincho)', fontSize: '1.4rem', fontWeight: 800, margin: '0.2rem 0 0' }}>{gradesCount.Hard}</p>
              </div>
              <div>
                <span style={{ fontSize: '0.78rem', color: '#3E734E', fontWeight: 700, fontFamily: 'var(--font-mincho)' }}>良 Good</span>
                <p style={{ fontFamily: 'var(--font-mincho)', fontSize: '1.4rem', fontWeight: 800, margin: '0.2rem 0 0' }}>{gradesCount.Good}</p>
              </div>
              <div>
                <span style={{ fontSize: '0.78rem', color: '#234B73', fontWeight: 700, fontFamily: 'var(--font-mincho)' }}>易 Easy</span>
                <p style={{ fontFamily: 'var(--font-mincho)', fontSize: '1.4rem', fontWeight: 800, margin: '0.2rem 0 0' }}>{gradesCount.Easy}</p>
              </div>
            </div>

            <p style={{ color: '#786A5E', fontSize: '0.88rem', marginBottom: '2rem' }}>
              Tỉ lệ ghi nhớ tối ưu: <strong>{masteryPercent}%</strong> · Lịch FSRS đã được ghi nhận.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
              <Link href="/" className="btn-torii">
                Trang chủ
              </Link>
              <button
                onClick={() => {
                  setCurrentIdx(1);
                  setIsCompleted(false);
                  setShowAnswer(false);
                  setShowStrokeOrder(false);
                  setGradesCount({ Again: 0, Hard: 0, Good: 0, Easy: 0 });
                }}
                className="btn-washi"
              >
                Ôn lại
              </button>
              <Link href="/cards" className="btn-washi">
                Bộ thẻ
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. GIAO DIỆN PHIÊN ÔN TẬP KARUTA ACTIVE RECALL
  const isGrammar = currentCard
    ? currentCard.type === 'GrammarPattern' ||
      currentCard.deckId === 'grammar_jpd133' ||
      Boolean(
        currentCard.deckName &&
          (currentCard.deckName.toLowerCase().includes('ngữ pháp') ||
            currentCard.deckName.toLowerCase().includes('bunbou'))
      ) ||
      Boolean(
        currentCard.kanji &&
          (currentCard.kanji.startsWith('【文法') ||
            currentCard.kanji.includes('Pattern') ||
            currentCard.kanji.includes('{{c'))
      )
    : false;

  const isKanji = currentCard && !isGrammar
    ? currentCard.type === 'Kanji' ||
      Boolean(currentCard.deckName && currentCard.deckName.includes('Hán Tự')) ||
      currentCard.deckId === 'deck_jpd133_kanji' ||
      /^[\u4e00-\u9faf]$/.test(currentCard.kanji.trim())
    : false;

  return (
    <main
      style={{
        position: 'relative',
        minHeight: '100vh',
        padding: '1.5rem 1rem 5rem',
      }}
    >
      {/* HÌNH NỀN TRANH CẮT GIẤY KIRIE SÓNG BIỂN TẦNG 3D TOÀN TRANG ÔN TẬP */}
      <JapaneseArtBackdrop
        src="/assets/art/kirie-layered-waves.jpg"
        alt="Nghệ thuật Kirie sóng biển Nhật Bản"
        opacity={0.065}
        blendMode="multiply"
      />

      <div style={{ maxWidth: '640px', margin: '0 auto', position: 'relative', zIndex: 10 }}>
        {/* THANH ĐIỀU HƯỚNG & TIẾN ĐỘ THÂN TRÚC */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Link
              href="/"
              style={{
                color: '#786A5E',
                textDecoration: 'none',
                fontSize: '0.88rem',
                fontFamily: 'var(--font-maru)',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              ← Trang chủ
            </Link>

            {isMounted && isOffline && (
              <span
                style={{
                  fontSize: '0.72rem',
                  fontFamily: 'var(--font-maru)',
                  fontWeight: 700,
                  backgroundColor: '#FFF2F0',
                  color: '#C83824',
                  border: '1px solid #F5C6CB',
                  borderRadius: '6px',
                  padding: '0.15rem 0.45rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                }}
              >
                ⚡ Ngoại tuyến (IndexedDB)
              </span>
            )}

            {isMounted && unsyncedCount > 0 && (
              <span
                title="Lượt ôn tập đã ghi nhận cục bộ và sẽ tự động đồng bộ khi có mạng"
                style={{
                  fontSize: '0.72rem',
                  fontFamily: 'var(--font-maru)',
                  fontWeight: 700,
                  backgroundColor: '#FFF9E6',
                  color: '#B87B28',
                  border: '1px solid #FFEAA7',
                  borderRadius: '6px',
                  padding: '0.15rem 0.45rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                }}
              >
                🔄 Chờ đồng bộ: {unsyncedCount}
              </span>
            )}
          </div>

          {/* Quick Deck Switcher Button */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowDeckMenu(!showDeckMenu)}
              style={{
                background: '#FAF7F0',
                border: '1.2px solid #E6DDCF',
                borderRadius: '8px',
                padding: '0.35rem 0.85rem',
                fontSize: '0.85rem',
                fontFamily: 'var(--font-maru)',
                fontWeight: 700,
                color: '#122438',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '20px',
                  height: '20px',
                  borderRadius: '4px',
                  background: targetDeckId === 'grammar_jpd133' || isGrammar
                    ? '#1E4B75'
                    : isKanji
                    ? '#C83824'
                    : targetDeckId === 'deck_n5'
                    ? '#2A6B3D'
                    : '#234B73',
                  color: '#FFFFFF',
                  fontSize: '0.72rem',
                  fontFamily: 'var(--font-mincho)',
                  fontWeight: 800,
                }}
              >
                {targetDeckId === 'grammar_jpd133' || isGrammar ? '文' : isKanji ? '漢' : targetDeckId === 'deck_n5' ? 'N5' : '語'}
              </span>
              <span>{deckTitle}</span>
              <span style={{ fontSize: '0.75rem', color: '#786A5E' }}>▾</span>
            </button>

            {/* Dropdown Menu đổi bộ thẻ (VIS-REV-06: z-index & glassmorphism backdrop) */}
            {showDeckMenu && (
              <div
                ref={deckMenuRef}
                style={{
                  position: 'absolute',
                  top: '115%',
                  right: 0,
                  background: 'rgba(252, 249, 244, 0.97)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(200, 155, 88, 0.28)',
                  borderRadius: '14px',
                  boxShadow: '0 2px 4px rgba(18,36,56,0.04), 0 12px 32px -4px rgba(18,36,56,0.14), 0 28px 56px -16px rgba(18,36,56,0.10)',
                  minWidth: '240px',
                  zIndex: 200,
                  padding: '0.5rem',
                  animation: 'washi-slide-down 0.22s cubic-bezier(0.16, 1, 0.3, 1) both',
                }}
              >
                <div style={{ fontSize: '0.75rem', color: '#786A5E', padding: '0.4rem 0.6rem', fontWeight: 600 }}>
                  CHỌN BỘ THẺ:
                </div>
                <button
                  onClick={() => {
                    setShowDeckMenu(false);
                    router.push('/review?deck=all');
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.5rem 0.6rem',
                    borderRadius: '6px',
                    border: 'none',
                    background: targetDeckId === 'all' ? '#FAF6EE' : 'transparent',
                    color: targetDeckId === 'all' ? '#122438' : '#786A5E',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-maru)',
                    fontWeight: targetDeckId === 'all' ? 700 : 500,
                  }}
                >
                  Toàn bộ thẻ học
                </button>
                {deckList.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => {
                      setShowDeckMenu(false);
                      router.push(`/review?deck=${d.id}`);
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '0.5rem 0.6rem',
                      borderRadius: '6px',
                      border: 'none',
                      background: targetDeckId === d.id ? '#FAF6EE' : 'transparent',
                      color: targetDeckId === d.id ? '#122438' : '#786A5E',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-maru)',
                      fontWeight: targetDeckId === d.id ? 700 : 500,
                    }}
                  >
                    {d.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tiến độ và số câu hỏi */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
          <span style={{ fontSize: '0.82rem', color: '#786A5E', fontFamily: 'var(--font-maru)' }}>
            Hàng đợi ôn tập: {deckTitle}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mincho)',
              fontWeight: 700,
              fontSize: '0.92rem',
              color: '#122438',
            }}
          >
            第 {currentIdx} 問 / 全 {totalCards} 問
          </span>
        </div>

        {/* Thanh tiến độ phiên học phong cách lụa vàng */}
        <div
          style={{
            height: '6px',
            background: '#E7E0D2',
            borderRadius: '999px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progressPercent}%`,
              background: 'linear-gradient(90deg, #AF7E36 0%, #16253B 100%)',
              borderRadius: '999px',
              transition: 'width 0.4s ease',
            }}
          />
        </div>
      </div>

      {/* THẺ BÀI TRUYỀN THỐNG HYAKUNIN ISSHU KARUTA 3D (DEF-UI-KARUTA-001) */}
      {currentCard && (
        <div
          className={`karuta-3d-scene ${showAnswer ? 'flipped' : ''}`}
          style={{
            minHeight: '440px',
            padding: '2.5rem 2rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            marginBottom: '1.5rem',
            background: showAnswer ? 'linear-gradient(180deg, #FAF8F2 0%, #F7F4EB 100%)' : '#FAF8F2',
            border: showAnswer ? '2px solid #485642' : '2px solid #AF7E36',
            borderRadius: '18px',
            boxShadow: '0 12px 32px rgba(22, 37, 59, 0.08)',
            position: 'relative',
            overflow: 'hidden',
            transition: 'border-color 0.4s ease, background 0.4s ease',
          }}
        >
          <JapaneseArtBackdrop
            src="/assets/art/rinpa-gold-waves-clouds.jpg"
            alt="Mây và sóng vàng Rinpa nghệ thuật"
            opacity={0.15}
            blendMode="multiply"
            objectPosition="center"
          />

          {/* Dấu son Hanko truyền thống ở góc trên */}
          <div
            style={{
              position: 'absolute',
              top: '1.25rem',
              right: '1.25rem',
              fontFamily: 'var(--font-mincho)',
              fontSize: '0.82rem',
              color: '#FFFFFF',
              background: showAnswer ? '#485642' : '#9E3223',
              padding: '0.25rem 0.65rem',
              borderRadius: '4px',
              fontWeight: 800,
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
              zIndex: 3,
            }}
          >
            {showAnswer ? '解答' : '出題'}
          </div>

          {/* PARSED CARD DETAILS HELPER */}
          {(() => {
            const parsedCard = currentCard
              ? parseCardDetails({
                  type: currentCard.type,
                  reading: currentCard.reading,
                  meaning: currentCard.meaning,
                  kanji: currentCard.kanji,
                  deckName: currentCard.deckName,
                  sentence: currentCard.sentence,
                })
              : null;

            return (
              <>
                {/* MẶT TRƯỚC: CHỮ KANJI VÀ CÁCH ĐỌC */}
                <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.45rem', marginBottom: '0.75rem', width: '100%' }}>
                  {/* DEF-UI-KARUTA-002: BẢO VỆ ACTIVE RECALL — TUYỆT ĐỐI KHÔNG HIỂN THỊ CÁCH ĐỌC Ở MẶT TRƯỚC */}
                  {/* 2. Chữ Hán Thư pháp Lớn (Hỗ trợ câu Cloze đục lỗ Active Recall) */}
                  {/* VIS-REV-01: Fluid kanji font via computeOptimalKanjiFontSize — prevents mobile overflow */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.85rem', width: '100%' }}>
                    <div
                      style={{
                        fontFamily: 'var(--font-mincho)',
                        fontSize: (() => {
                          const len = currentCard.kanji.replace(/\{\{c\d+::|\}\}/g, '').length;
                          if (len > 25) return 'clamp(1.1rem, 2.8vw, 1.55rem)';
                          if (len > 18) return 'clamp(1.35rem, 3.5vw, 1.9rem)';
                          if (len > 12) return 'clamp(1.65rem, 4.2vw, 2.4rem)';
                          if (len > 6)  return 'clamp(2.2rem, 5.5vw, 3.2rem)';
                          return 'clamp(3.2rem, 8vw, 4.8rem)';
                        })(),
                        fontWeight: 900,
                        color: '#1A1918',
                        letterSpacing: '0.04em',
                        textShadow: '0 2px 8px rgba(22, 37, 59, 0.08)',
                        lineHeight: 1.35,
                        textAlign: 'center',
                        wordBreak: 'break-word',
                        maxWidth: '100%',
                        overflowWrap: 'anywhere',
                      }}
                    >
                      {currentCard.kanji.includes('{{c') ? (
                        parseClozeSegments(currentCard.kanji).map((seg, i) =>
                          seg.isCloze ? (
                            showAnswer ? (
                              <span
                                key={i}
                                style={{
                                  color: '#485642',
                                  background: '#EFF4EE',
                                  borderBottom: '3px solid #697858',
                                  borderRadius: '6px',
                                  padding: '0.1rem 0.5rem',
                                  margin: '0 0.2rem',
                                  display: 'inline-block',
                                }}
                              >
                                {seg.text}
                              </span>
                            ) : (
                              <span
                                key={i}
                                style={{
                                  color: '#AF7E36',
                                  background: '#FBF5E8',
                                  border: '2px dashed #AF7E36',
                                  borderRadius: '8px',
                                  padding: '0.1rem 0.85rem',
                                  margin: '0 0.25rem',
                                  display: 'inline-block',
                                  letterSpacing: '0.08em',
                                }}
                              >
                                [ ... ? ... ]
                              </span>
                            )
                          ) : (
                            <span key={i}>{seg.text}</span>
                          )
                        )
                      ) : currentCard.kanji.startsWith('【文法') ? (
                        (() => {
                          const pm = currentCard.kanji.match(/^【文法\s*([^】]+)】\s*\n?([\s\S]*)$/);
                          if (!pm) return currentCard.kanji;
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.45rem' }}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  fontSize: '0.9rem',
                                  fontWeight: 800,
                                  fontFamily: 'var(--font-maru)',
                                  color: '#16253B',
                                  background: '#EDF2F7',
                                  border: '1.2px solid #BDCCDC',
                                  borderRadius: '6px',
                                  padding: '0.15rem 0.75rem',
                                  letterSpacing: '0.04em',
                                }}
                              >
                                文法 {pm[1]}
                              </span>
                              <span style={{ fontSize: '1.85rem', fontWeight: 800, lineHeight: 1.35 }}>
                                {pm[2]}
                              </span>
                            </div>
                          );
                        })()
                      ) : (
                        currentCard.kanji
                      )}
                    </div>
                    <JapaneseSpeakerButton text={stripCloze(currentCard.kanji)} size={26} />
                  </div>

                  {/* 3. Huy hiệu phân loại & Âm Hán Việt */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '0.25rem' }}>
                    {/* Âm Hán Việt khi đã mở đáp án */}
                    {showAnswer && parsedCard?.hanViet && (
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          background: '#FDF2F0',
                          border: '1.5px solid #E8A99F',
                          color: '#9E3223',
                          padding: '0.25rem 0.95rem',
                          borderRadius: '999px',
                          fontSize: '0.88rem',
                          fontFamily: 'var(--font-mincho)',
                          fontWeight: 800,
                          letterSpacing: '0.06em',
                          boxShadow: '0 2px 6px rgba(158, 50, 35, 0.08)',
                        }}
                      >
                        漢 Âm Hán: {parsedCard.hanViet}
                      </div>
                    )}

                    {/* Huy hiệu thể loại thẻ */}
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.25rem 0.85rem',
                        borderRadius: '999px',
                        fontSize: '0.78rem',
                        fontFamily: 'var(--font-maru)',
                        fontWeight: 700,
                        background: isGrammar
                          ? '#EDF2F7'
                          : isKanji
                          ? '#FDF2F0'
                          : targetDeckId === 'deck_n5'
                          ? '#EFF4EE'
                          : '#EDF2F7',
                        color: isGrammar
                          ? '#16253B'
                          : isKanji
                          ? '#9E3223'
                          : targetDeckId === 'deck_n5'
                          ? '#485642'
                          : '#16253B',
                        border: `1.2px solid ${
                          isGrammar
                            ? '#BDCCDC'
                            : isKanji
                            ? '#E8A99F'
                            : targetDeckId === 'deck_n5'
                            ? '#C6D8C4'
                            : '#BDCCDC'
                        }`,
                      }}
                    >
                      {isGrammar
                        ? '📜 Ngữ pháp (Bunbou)'
                        : isKanji
                        ? '🈳 Hán Tự (Kanji)'
                        : targetDeckId === 'deck_n5'
                        ? '🔰 Từ vựng JLPT N5'
                        : '📖 Từ vựng Kotoba'}
                    </div>
                  </div>
                </div>

                {/* MẶT SAU: LẬT MỞ NỘI DUNG CÁCH ĐỌC & Ý NGHĨA KHI BẤM XEM */}
                {showAnswer ? (
                  <div
                    style={{
                      position: 'relative',
                      zIndex: 2,
                      width: '100%',
                      marginTop: '1.15rem',
                      paddingTop: '1.25rem',
                      borderTop: '1.5px solid #DFD9CB',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.95rem',
                      alignItems: 'center',
                      animation: 'fadeIn 0.3s ease forwards',
                    }}
                  >
                    {/* 1. KHỐI CÁCH ĐỌC KUN-YOMI & ON-YOMI (DÀNH CHO KANJI HOẶC THẺ CÓ ĐỌC ĐA NĂNG) */}
                    {parsedCard?.hasDetailedReadings ? (
                      <div
                        style={{
                          width: '100%',
                          display: 'grid',
                          /* VIS-REV-04: Fluid grid — clamp prevents single-column collapse on mobile */
                          gridTemplateColumns:
                            parsedCard.kunYomi.length > 0 && parsedCard.onYomi.length > 0
                              ? 'repeat(auto-fit, minmax(clamp(140px, 38vw, 230px), 1fr))'
                              : '1fr',
                          gap: 'clamp(0.5rem, 2vw, 0.85rem)',
                        }}
                      >
                        {/* Khối KUN-YOMI (Âm thuần Nhật) */}
                        {parsedCard.kunYomi.length > 0 && (
                          <div
                            style={{
                              background: '#FAF8F2',
                              border: '1.5px solid #C6D8C4',
                              borderRadius: '16px',
                              padding: '1rem 1.15rem',
                              boxShadow: '0 4px 16px rgba(72, 86, 66, 0.06)',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: '0.45rem',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                              <span
                                style={{
                                  background: '#485642',
                                  color: '#FFFFFF',
                                  fontSize: '0.78rem',
                                  fontWeight: 800,
                                  padding: '0.2rem 0.65rem',
                                  borderRadius: '6px',
                                  fontFamily: 'var(--font-maru)',
                                  letterSpacing: '0.04em',
                                }}
                              >
                                訓 KUN-YOMI
                              </span>
                              <span style={{ fontSize: '0.78rem', color: '#485642', fontWeight: 600 }}>
                                Âm thuần Nhật
                              </span>
                            </div>

                            <div
                              style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                justifyContent: 'center',
                                alignItems: 'center',
                                gap: '0.65rem',
                                width: '100%',
                                marginTop: '0.25rem',
                              }}
                            >
                              {parsedCard.kunYomi.map((kun, idx) => (
                                <div
                                  key={idx}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.45rem',
                                    background: '#EFF4EE',
                                    padding: '0.35rem 0.85rem',
                                    borderRadius: '10px',
                                    border: '1.2px solid #C6D8C4',
                                  }}
                                >
                                  <span
                                    style={{
                                      fontFamily: 'var(--font-maru)',
                                      fontSize: '1.75rem',
                                      fontWeight: 800,
                                      color: '#485642',
                                      letterSpacing: '0.04em',
                                    }}
                                  >
                                    {kun}
                                  </span>
                                  <JapaneseSpeakerButton text={kun.replace(/\..*$/, '')} size={20} />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Khối ON-YOMI (Âm Hán Nhật) */}
                        {parsedCard.onYomi.length > 0 && (
                          <div
                            style={{
                              background: '#FAF8F2',
                              border: '1.5px solid #E8A99F',
                              borderRadius: '16px',
                              padding: '1rem 1.15rem',
                              boxShadow: '0 4px 16px rgba(158, 50, 35, 0.06)',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: '0.45rem',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                              <span
                                style={{
                                  background: '#9E3223',
                                  color: '#FFFFFF',
                                  fontSize: '0.78rem',
                                  fontWeight: 800,
                                  padding: '0.2rem 0.65rem',
                                  borderRadius: '6px',
                                  fontFamily: 'var(--font-maru)',
                                  letterSpacing: '0.04em',
                                }}
                              >
                                音 ON-YOMI
                              </span>
                              <span style={{ fontSize: '0.78rem', color: '#9E3223', fontWeight: 600 }}>
                                Âm Hán Nhật
                              </span>
                            </div>

                            <div
                              style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                justifyContent: 'center',
                                alignItems: 'center',
                                gap: '0.65rem',
                                width: '100%',
                                marginTop: '0.25rem',
                              }}
                            >
                              {parsedCard.onYomi.map((on, idx) => (
                                <div
                                  key={idx}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.45rem',
                                    background: '#FDF2F0',
                                    padding: '0.35rem 0.85rem',
                                    borderRadius: '10px',
                                    border: '1.2px solid #E8A99F',
                                  }}
                                >
                                  <span
                                    style={{
                                      fontFamily: 'var(--font-maru)',
                                      fontSize: '1.75rem',
                                      fontWeight: 800,
                                      color: '#9E3223',
                                      letterSpacing: '0.04em',
                                    }}
                                  >
                                    {on}
                                  </span>
                                  <JapaneseSpeakerButton text={on} size={20} />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : currentCard.reading ? (
                      /* KHỐI TỪ VỰNG THƯỜNG (KOTOBA / N5): HIRAGANA TO NỔI BẬT + PITCH ACCENT */
                      <div
                        style={{
                          background: '#FAF8F2',
                          padding: '0.9rem 1.6rem',
                          borderRadius: '14px',
                          border: '1.5px solid #DFD9CB',
                          boxShadow: '0 4px 16px rgba(22, 37, 59, 0.05)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '0.5rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span
                            style={{
                              fontFamily: 'var(--font-maru)',
                              fontSize: '2.1rem',
                              fontWeight: 800,
                              color: '#1A1918',
                              letterSpacing: '0.04em',
                            }}
                          >
                            {parsedCard?.pureReading || currentCard.reading}
                          </span>
                          <JapaneseSpeakerButton text={parsedCard?.pureReading || currentCard.reading || ''} size={22} />
                        </div>

                        {/* Đồ thị cao độ ngữ âm Tokyo Pitch Accent (chỉ hiển thị khi có mẫu Pitch và chuỗi thuần kana) */}
                        <PitchAccentGraph
                          reading={parsedCard?.pureReading || currentCard.reading}
                          pattern={getPitchPattern(currentCard.pitch)}
                        />
                      </div>
                    ) : null}

                    {/* 1.5 KHỐI HOẠT HỌA NÉT VIẾT CHỮ HÁN (KANJI STROKE ORDER ANIMATION) */}
                    {isKanji && (() => {
                      const kanjiCharMatch = currentCard.kanji.replace(/\{\{c\d+::|\}\}/g, '').trim().match(/[\u4e00-\u9faf]/);
                      const targetChar = kanjiCharMatch ? kanjiCharMatch[0] : (currentCard.kanji.trim().length === 1 ? currentCard.kanji.trim() : null);
                      if (!targetChar) return null;

                      return (
                        <div style={{ width: '100%', maxWidth: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem', margin: '0.2rem 0' }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowStrokeOrder((prev) => !prev);
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.45rem',
                              background: showStrokeOrder ? '#9E3223' : '#FDF2F0',
                              color: showStrokeOrder ? '#FFFFFF' : '#9E3223',
                              border: '1.2px solid #E8A99F',
                              borderRadius: '8px',
                              padding: '0.38rem 0.95rem',
                              fontSize: '0.8rem',
                              fontFamily: 'var(--font-maru)',
                              fontWeight: 700,
                              cursor: 'pointer',
                              boxShadow: '0 2px 6px rgba(158, 50, 35, 0.08)',
                              transition: 'all 0.18s ease',
                            }}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                              <path d="M12 19l7-7 3 3-7 7-3-3z" />
                              <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
                            </svg>
                            {showStrokeOrder ? 'Ẩn nét viết 筆順' : 'Xem nét viết 筆順 (Stroke Order)'}
                          </button>

                          {showStrokeOrder && (
                            <div style={{ width: '100%', animation: 'fadeIn 0.25s ease forwards' }}>
                              <KanjiStrokePlayer
                                kanji={targetChar}
                                compact={true}
                                meaning={parsedCard?.cleanMeaning || currentCard.meaning}
                                onReading={parsedCard?.onYomi}
                                kunReading={parsedCard?.kunYomi}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* 2. KHỐI Ý NGHĨA TIẾNG VIỆT — VIS-REV-03: constrained height + scroll prevents FSRS button overflow */}
                    <div
                      style={{
                        width: '100%',
                        background: 'linear-gradient(135deg, #FAF8F2 0%, #F7F4EB 100%)',
                        border: '1.5px solid #DFD9CB',
                        borderRadius: '16px',
                        padding: '1.1rem 1.4rem',
                        boxShadow: '0 8px 24px -4px rgba(22, 37, 59, 0.08), 0 2px 6px rgba(0, 0, 0, 0.02)',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.35rem',
                        maxHeight: 'clamp(8rem, 28vh, 14rem)',
                        overflowY: 'auto',
                        WebkitOverflowScrolling: 'touch',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '0.76rem',
                          fontFamily: 'var(--font-maru)',
                          fontWeight: 800,
                          color: '#878278',
                          letterSpacing: '0.12em',
                          textTransform: 'uppercase',
                          position: 'sticky',
                          top: 0,
                          background: 'rgba(250, 248, 242, 0.92)',
                          width: '100%',
                          paddingBottom: '0.3rem',
                        }}
                      >
                        Ý Nghĩa Tiếng Việt
                      </span>

                      <div
                        style={{
                          fontSize:
                            (parsedCard?.cleanMeaning || currentCard.meaning).length > 80
                              ? '1.08rem'
                              : (parsedCard?.cleanMeaning || currentCard.meaning).length > 40
                              ? '1.35rem'
                              : 'clamp(1.55rem, 4vw, 2.1rem)',
                          fontWeight: 800,
                          color: '#1A1918',
                          fontFamily: 'var(--font-maru)',
                          lineHeight: 1.45,
                          letterSpacing: '0.01em',
                          whiteSpace: 'pre-line',
                          textAlign: (parsedCard?.cleanMeaning || currentCard.meaning).length > 60 ? 'left' : 'center',
                          width: '100%',
                        }}
                      >
                        {parsedCard?.cleanMeaning || currentCard.meaning}
                      </div>
                    </div>

                    {/* 3. CÂU VÍ DỤ NGỮ CẢNH (i+1) — CHỈ HIỆN KHI CÂU CÓ THỰC NỘI DUNG */}
                    {parsedCard?.hasRealSentence && currentCard.sentence && (
                      <div
                        style={{
                          width: '100%',
                          background: '#FAF8F2',
                          padding: '1rem 1.25rem',
                          borderRadius: '14px',
                          border: '1.5px solid #DFD9CB',
                          boxShadow: '0 4px 16px rgba(22, 37, 59, 0.05)',
                          textAlign: 'left',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.45rem',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '0.75rem',
                            color: '#878278',
                            fontWeight: 800,
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                          }}
                        >
                          Câu ví dụ ngữ cảnh (i+1)
                        </span>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ fontSize: '1.25rem', color: '#1A1918', fontFamily: 'var(--font-mincho)', fontWeight: 600, lineHeight: 1.45 }}>
                            {parseClozeSegments(currentCard.sentence).map((seg, i) =>
                              seg.isCloze ? (
                                <span
                                  key={i}
                                  style={{
                                    fontWeight: 800,
                                    color: '#485642',
                                    background: '#EFF4EE',
                                    borderBottom: '2.5px solid #697858',
                                    borderRadius: '3px',
                                    padding: '0.1rem 0.35rem',
                                  }}
                                >
                                  {seg.text}
                                </span>
                              ) : (
                                <span key={i}>{seg.text}</span>
                              )
                            )}
                          </span>
                          <JapaneseSpeakerButton text={stripCloze(currentCard.sentence)} size={22} />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ marginTop: '1.5rem', color: '#878278', fontSize: '0.9rem', fontFamily: 'var(--font-maru)', fontWeight: 600 }}>
                    Nhấn Space hoặc nút bên dưới để xem đáp án
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* KHU VỰC NÚT TƯƠNG TÁC ACTIVE RECALL */}
      {/* Nút Hoàn Tác Chấm Điểm Thẻ Trước (DEF-UI-KARUTA-003) */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.65rem' }}>
        {reviewHistory.length > 0 && (
          <button
            type="button"
            onClick={handleUndo}
            title="Hoàn tác thẻ trước đó (Phím tắt: Z)"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.35rem 0.85rem',
              backgroundColor: '#FAF8F2',
              border: '1.5px solid #AF7E36',
              borderRadius: '8px',
              color: '#AF7E36',
              fontFamily: 'var(--font-maru)',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(175, 126, 54, 0.12)',
              transition: 'all 0.2s ease',
            }}
          >
            <span style={{ fontSize: '1rem', lineHeight: 1 }}>↩</span> Hoàn tác (Z)
          </button>
        )}
      </div>

      {/* Thông báo Toast Hoàn Tác */}
      {undoToast && (
        <div
          role="status"
          style={{
            position: 'fixed',
            bottom: '5.5rem',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#1B4268',
            color: '#FFFFFF',
            padding: '0.65rem 1.4rem',
            borderRadius: '999px',
            fontSize: '0.9rem',
            fontWeight: 700,
            fontFamily: 'var(--font-maru)',
            boxShadow: '0 8px 24px rgba(27, 66, 104, 0.25)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            animation: 'fadeIn 0.2s ease forwards',
          }}
        >
          <span>↩</span> {undoToast}
        </div>
      )}

      {!showAnswer ? (
        <button
          onClick={handleReveal}
          className="btn-torii"
          style={{
            width: '100%',
            padding: '1.05rem',
            fontSize: '1.1rem',
            boxShadow: '0 6px 20px rgba(158, 50, 35, 0.35)',
            letterSpacing: '0.02em',
          }}
        >
          <SensuFanIcon size={20} color="#FFFFFF" />
          Xem nghĩa (Space)
        </button>
      ) : (
        <div>
          {/* VIS-REV-05: 4 FSRS Sơn Mài Buttons — Phân cấp thị giác + Tactile press feedback */}
          {/* Layout: Again/Hard (ghost/secondary) | Good (primary CTA, visually dominant) | Easy (calm blue) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'clamp(0.4rem, 1.5vw, 0.65rem)', marginBottom: '0.5rem' }}>
            {/* NÚT 1: AGAIN (再/破 - Bengara) — Ghost/soft style */}
            <button
              className="btn-srs-rating btn-srs-again"
              onClick={() => handleGrade('Again')}
              style={{
                touchAction: 'manipulation',
                minHeight: '60px',
                minWidth: '44px',
                width: '100%',
                padding: '0.85rem 0.35rem',
                backgroundColor: '#FDF2F0',
                border: '1.5px solid #E8A99F',
                borderRadius: '14px',
                color: '#9E3223',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.25rem',
                transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: '0 1px 3px rgba(158, 50, 35, 0.08)',
              }}
            >
              <span style={{ fontFamily: 'var(--font-mincho)', fontWeight: 900, fontSize: 'clamp(1rem, 3vw, 1.28rem)', lineHeight: 1 }}>破</span>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, opacity: 0.9 }}>{formatInterval(Rating.Again)}</span>
              <span style={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.04em', opacity: 0.75 }}>① Quên</span>
            </button>

            {/* NÚT 2: HARD (磨/難 - Kincha) — Warm gold/amber outline */}
            <button
              className="btn-srs-rating btn-srs-hard"
              onClick={() => handleGrade('Hard')}
              style={{
                touchAction: 'manipulation',
                minHeight: '60px',
                minWidth: '44px',
                width: '100%',
                padding: '0.85rem 0.35rem',
                backgroundColor: '#FBF5E8',
                border: '1.5px solid #E5CCA0',
                borderRadius: '14px',
                color: '#8C601E',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.25rem',
                transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: '0 1px 3px rgba(175, 126, 54, 0.08)',
              }}
            >
              <span style={{ fontFamily: 'var(--font-mincho)', fontWeight: 900, fontSize: 'clamp(1rem, 3vw, 1.28rem)', lineHeight: 1 }}>磨</span>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, opacity: 0.9 }}>{formatInterval(Rating.Hard)}</span>
              <span style={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.04em', opacity: 0.75 }}>② Khó</span>
            </button>

            {/* NÚT 3: GOOD (継/良 - Aizome) — PRIMARY CTA: Samurai indigo, elevated, scale on hover */}
            <button
              className="btn-srs-rating btn-srs-good"
              onClick={() => handleGrade('Good')}
              style={{
                touchAction: 'manipulation',
                minHeight: '60px',
                minWidth: '44px',
                width: '100%',
                padding: '0.85rem 0.35rem',
                background: 'linear-gradient(160deg, #203450 0%, #16253B 100%)',
                border: '1.5px solid #BDCCDC',
                borderRadius: '14px',
                color: '#FFFFFF',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.25rem',
                transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: '0 2px 4px rgba(22, 37, 59, 0.08), 0 6px 16px -2px rgba(22, 37, 59, 0.32), 0 12px 28px -8px rgba(22, 37, 59, 0.20)',
                transform: 'translateY(-1px)',
              }}
            >
              <span style={{ fontFamily: 'var(--font-mincho)', fontWeight: 900, fontSize: 'clamp(1rem, 3vw, 1.28rem)', lineHeight: 1 }}>継</span>
              <span style={{ fontSize: '0.68rem', color: '#EDF2F7', fontWeight: 700 }}>{formatInterval(Rating.Good)}</span>
              <span style={{ fontSize: '0.6rem', color: '#BDCCDC', fontWeight: 600, letterSpacing: '0.04em' }}>③ Tốt</span>
            </button>

            {/* NÚT 4: EASY (悟/易 - Koke/Matcha) — Zen moss green, calm & clear */}
            <button
              className="btn-srs-rating btn-srs-easy"
              onClick={() => handleGrade('Easy')}
              style={{
                touchAction: 'manipulation',
                minHeight: '60px',
                minWidth: '44px',
                width: '100%',
                padding: '0.85rem 0.35rem',
                background: 'linear-gradient(160deg, #697858 0%, #485642 100%)',
                border: '1.5px solid #C6D8C4',
                borderRadius: '14px',
                color: '#FFFFFF',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.25rem',
                transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: '0 2px 4px rgba(72, 86, 66, 0.08), 0 6px 16px -2px rgba(72, 86, 66, 0.28)',
              }}
            >
              <span style={{ fontFamily: 'var(--font-mincho)', fontWeight: 900, fontSize: 'clamp(1rem, 3vw, 1.28rem)', lineHeight: 1 }}>悟</span>
              <span style={{ fontSize: '0.68rem', color: '#EFF4EE', fontWeight: 700 }}>{formatInterval(Rating.Easy)}</span>
              <span style={{ fontSize: '0.6rem', color: '#C6D8C4', fontWeight: 600, letterSpacing: '0.04em' }}>④ Dễ</span>
            </button>
          </div>
        </div>
      )}
      </div>
    </main>
  );
}

/**
 * Trang Ôn tập Karuta chính thức (bọc trong Suspense)
 */
export default function ReviewPage() {
  return (
    <Suspense fallback={<ReviewLoadingSkeleton />}>
      <ReviewSessionContent />
    </Suspense>
  );
}
