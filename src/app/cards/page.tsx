'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ToriiIcon, SensuFanIcon } from '@/components/japanese/Icons';
import { JapaneseArtBackdrop } from '@/components/art/JapaneseArtBackdrop';
import { parseClozeSegments, stripCloze } from '@/lib/cloze';

interface CardItem {
  id: string;
  kanji: string;
  reading: string;
  meaning: string;
  pitch?: string;
  type: string;
  deckId: string;
  deck?: string;
  deckName?: string;
  state: string;
  stability: number;
}

interface DeckItem {
  id: string;
  name: string;
  description?: string;
}

/**
 * Quản lý thư viện thẻ học (短冊帳 - Tanzakucho)
 * Thiết kế mang đậm phong cách Mộc bản & Cuộn tranh Washi truyền thống
 */
export default function CardsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedDeck, setSelectedDeck] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [cardsList, setCardsList] = useState<CardItem[]>([]);
  const [decksList, setDecksList] = useState<DeckItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Debounce tìm kiếm 200ms để tránh lag nhập liệu khi có 676+ thẻ
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    async function fetchCards() {
      try {
        setLoading(true);
        setLoadError('');
        const res = await fetch('/api/backend/api/v1/cards?limit=1000', { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Kiokudo Core staging chưa sẵn sàng');
        if (data.success) {
          setCardsList(data.data || []);
          setDecksList(data.decks || []);
        }
      } catch (err) {
        console.error('Lỗi khi tải danh sách thẻ:', err);
        setLoadError('Không thể tải thư viện staging. Chưa có dữ liệu sản xuất; kiểm tra kết nối Kiokudo Core.');
      } finally {
        setLoading(false);
      }
    }
    fetchCards();
  }, []);

  const filteredCards = useMemo(() => {
    const searchLower = debouncedSearch.toLowerCase().trim();
    return cardsList.filter((card) => {
      const kanjiStr = (card.kanji || '').toLowerCase();
      const readingStr = (card.reading || '').toLowerCase();
      const meaningStr = (card.meaning || '').toLowerCase();
      const deckStr = (card.deckName || card.deck || '').toLowerCase();

      const matchesSearch =
        !searchLower ||
        kanjiStr.includes(searchLower) ||
        readingStr.includes(searchLower) ||
        meaningStr.includes(searchLower);

      const matchesDeck =
        selectedDeck === 'all' ||
        card.deckId === selectedDeck ||
        deckStr.includes(selectedDeck.toLowerCase());

      return matchesSearch && matchesDeck;
    });
  }, [cardsList, debouncedSearch, selectedDeck]);

  const totalPages = Math.max(1, Math.ceil(filteredCards.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedCards = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredCards.slice(start, start + pageSize);
  }, [filteredCards, safePage, pageSize]);

  return (
    <main
      style={{
        position: 'relative',
        minHeight: '100vh',
        padding: '1.5rem 1rem 5rem',
      }}
    >
      {/* HÌNH NỀN MỘC BẢN TOÀN TRANG TỪ BỘ SƯU TẬP ĐỒ HỌA NHẬT BẢN */}
      <JapaneseArtBackdrop
        src="/assets/art/vintage-woodblock-border.webp"
        alt="Họa tiết mộc bản Phù Tang"
        opacity={0.06}
        blendMode="multiply"
      />

      <div style={{ maxWidth: '980px', margin: '0 auto', position: 'relative', zIndex: 10 }}>
        {loadError && (
          <p role="alert" style={{ color: '#A53528', background: '#FFF5E8', border: '1px solid #C89B58', padding: '1rem', borderRadius: '10px', fontFamily: 'var(--font-maru)' }}>
            {loadError}
          </p>
        )}
        {/* 1. HEADER CUỘN TRANH TOÀN CẢNH MỘC BẢN HOKUSAI HỒ SUWA */}
      <div
        style={{
          position: 'relative',
          borderRadius: '20px',
          overflow: 'hidden',
          padding: '2.5rem 2.25rem',
          marginBottom: '1.75rem',
          border: '1.5px solid #C89B58',
          boxShadow: '0 12px 32px rgba(18, 36, 56, 0.1)',
          background: 'linear-gradient(135deg, #0D233A 0%, #173859 60%, #10263E 100%)',
          color: '#FFFFFF',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.5rem',
        }}
      >
        {/* Lớp nền tranh mộc bản toàn cảnh Hồ Suwa của Hokusai */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.28, pointerEvents: 'none', zIndex: 0 }}>
          <Image
            src="/assets/art/hokusai-suwa-lake.jpg"
            alt="Tranh mộc bản Hokusai Hồ Suwa tỉnh Shinano"
            fill
            sizes="100vw"
            style={{ objectFit: 'cover', objectPosition: 'center 35%' }}
          />
        </div>

        <div style={{ position: 'relative', zIndex: 2, maxWidth: '580px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
            <span
              style={{
                fontFamily: 'var(--font-mincho)',
                background: '#C83824',
                color: '#FFFFFF',
                fontWeight: 800,
                fontSize: '0.78rem',
                padding: '0.2rem 0.65rem',
                borderRadius: '4px',
                letterSpacing: '0.08em',
                boxShadow: '0 2px 6px rgba(200, 56, 36, 0.35)',
              }}
            >
              短冊帳 · MỤC LỤC
            </span>
            <span style={{ fontFamily: 'var(--font-maru)', fontSize: '0.82rem', color: '#E8D9BD' }}>
              Kho tàng từ vựng &amp; Hán tự FSRS
            </span>
          </div>

          <h1
            style={{
              fontFamily: 'var(--font-mincho)',
              fontSize: '2.3rem',
              fontWeight: 800,
              lineHeight: 1.25,
              margin: '0 0 0.5rem 0',
              textShadow: '0 2px 6px rgba(0, 0, 0, 0.3)',
            }}
          >
            Quản lý thẻ học tiếng Nhật
          </h1>

          <p style={{ color: 'rgba(250, 248, 245, 0.9)', fontSize: '0.92rem', lineHeight: 1.5, margin: '0 0 1.5rem 0' }}>
            Tổng cộng: <strong>{cardsList.length} thẻ</strong> đã sẵn sàng ôn tập. Lọc theo chuyên đề, tìm kiếm Hán tự và theo dõi chu kỳ củng cố trí nhớ FSRS.
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link
              href="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.65rem 1.25rem',
                background: 'rgba(255, 255, 255, 0.12)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                borderRadius: '10px',
                color: '#FFFFFF',
                fontSize: '0.9rem',
                fontWeight: 600,
                textDecoration: 'none',
                fontFamily: 'var(--font-maru)',
              }}
            >
              ← Trang chủ
            </Link>
            <Link
              href="/review"
              className="btn-torii"
              style={{
                boxShadow: '0 4px 16px rgba(200, 56, 36, 0.35)',
                padding: '0.65rem 1.35rem',
                fontSize: '0.9rem',
              }}
            >
              <ToriiIcon size={16} color="#FFFFFF" />
              Ôn tập ngay →
            </Link>
          </div>
        </div>

        {/* Khung họa tiết dấu ấn mộc bản */}
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            border: '1.5px solid rgba(200, 155, 88, 0.6)',
            borderRadius: '12px',
            padding: '1rem 1.25rem',
            background: 'rgba(13, 35, 58, 0.65)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontFamily: 'var(--font-mincho)', fontSize: '1.8rem', fontWeight: 900, color: '#C89B58' }}>
            {cardsList.length}
          </div>
          <div style={{ fontFamily: 'var(--font-maru)', fontSize: '0.75rem', color: '#E8D9BD', marginTop: '0.2rem' }}>
            Thẻ trong hệ thống
          </div>
        </div>
      </div>

      {/* 2. THANH TÌM KIẾM BÚT LÔNG & BỘ LỌC BỘ THẺ */}
      <div
        style={{
          background: '#FAF7F0',
          padding: '1.25rem 1.5rem',
          borderRadius: '16px',
          border: '1.2px solid #E6DDCF',
          boxShadow: '0 4px 14px rgba(18, 36, 56, 0.04)',
          marginBottom: '1.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        {/* Input Tìm kiếm Sumi-e */}
        <div style={{ position: 'relative', width: '100%' }}>
          <span
            style={{
              position: 'absolute',
              left: '1rem',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '1.1rem',
              pointerEvents: 'none',
              opacity: 0.65,
              zIndex: 2,
            }}
          >
            🖌️
          </span>
          <input
            type="text"
            placeholder="Tìm kiếm từ vựng, chữ Kanji, cách đọc Furigana hoặc ngữ nghĩa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.85rem 2.5rem 0.85rem 2.85rem',
              background: '#FFFFFF',
              border: '1.5px solid #E2D7C5',
              borderRadius: '12px',
              color: '#122438',
              fontSize: '0.95rem',
              outline: 'none',
              fontFamily: 'var(--font-sans)',
              boxShadow: '0 2px 6px rgba(18, 36, 56, 0.03)',
              transition: 'border-color 0.2s, box-shadow 0.2s',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#C89B58';
              e.target.style.boxShadow = '0 0 0 3px rgba(200, 155, 88, 0.18)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#E2D7C5';
              e.target.style.boxShadow = '0 2px 6px rgba(18, 36, 56, 0.03)';
            }}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              aria-label="Xóa tìm kiếm"
              style={{
                position: 'absolute',
                right: '0.85rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'rgba(18, 36, 56, 0.06)',
                border: 'none',
                borderRadius: '50%',
                width: '24px',
                height: '24px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#786A5E',
                cursor: 'pointer',
                fontSize: '0.8rem',
                padding: 0,
                transition: 'background 0.15s',
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Nút lọc thẻ thanh lịch */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.84rem', color: '#786A5E', fontWeight: 600, marginRight: '0.25rem', fontFamily: 'var(--font-maru)' }}>
            Chủ đề:
          </span>
          <button
            onClick={() => setSelectedDeck('all')}
            style={{
              padding: '0.45rem 1rem',
              borderRadius: '999px',
              border: '1.2px solid',
              borderColor: selectedDeck === 'all' ? '#1E4B75' : '#E6DDCF',
              background: selectedDeck === 'all' ? 'linear-gradient(135deg, #1E4B75 0%, #15385B 100%)' : '#FFFFFF',
              color: selectedDeck === 'all' ? '#FFFFFF' : '#122438',
              fontWeight: selectedDeck === 'all' ? 700 : 500,
              fontSize: '0.84rem',
              fontFamily: 'var(--font-maru)',
              cursor: 'pointer',
              boxShadow: selectedDeck === 'all' ? '0 2px 8px rgba(30, 75, 117, 0.25)' : '0 1px 3px rgba(18, 36, 56, 0.02)',
              transition: 'all 0.2s',
            }}
          >
            Tất cả ({cardsList.length})
          </button>

          {decksList.map((d) => {
            const count = cardsList.filter((c) => c.deckId === d.id).length;
            const isSelected = selectedDeck === d.id;
            return (
              <button
                key={d.id}
                onClick={() => setSelectedDeck(d.id)}
                style={{
                  padding: '0.45rem 1rem',
                  borderRadius: '999px',
                  border: '1.2px solid',
                  borderColor: isSelected ? '#1E4B75' : '#E6DDCF',
                  background: isSelected ? 'linear-gradient(135deg, #1E4B75 0%, #15385B 100%)' : '#FFFFFF',
                  color: isSelected ? '#FFFFFF' : '#122438',
                  fontWeight: isSelected ? 700 : 500,
                  fontSize: '0.84rem',
                  fontFamily: 'var(--font-maru)',
                  cursor: 'pointer',
                  boxShadow: isSelected ? '0 2px 8px rgba(30, 75, 117, 0.25)' : '0 1px 3px rgba(18, 36, 56, 0.02)',
                  transition: 'all 0.2s',
                }}
              >
                {d.name} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* BANNER HÀNH ĐỘNG NHANH KHI ĐANG LỌC BỘ THẺ */}
      {selectedDeck !== 'all' && (
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            background: '#FAF7F0',
            border: '1.5px solid #C89B58',
            borderRadius: '14px',
            padding: '1.15rem 1.5rem',
            marginBottom: '1.5rem',
            boxShadow: '0 4px 14px rgba(18, 36, 56, 0.04)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <JapaneseArtBackdrop
            src="/assets/art/ryusui-indigo-stream.jpg"
            alt="Dòng sông Ryusui chàm"
            opacity={0.14}
            blendMode="multiply"
            objectPosition="right center"
          />

          <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                background: selectedDeck.includes('kanji') ? '#C83824' : selectedDeck.includes('n5') ? '#2A6B3D' : '#1E4B75',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.1rem',
                fontFamily: 'var(--font-mincho)',
                fontWeight: 800,
              }}
            >
              {selectedDeck.includes('kanji') ? '漢' : selectedDeck.includes('n5') ? 'N5' : '語'}
            </div>
            <div>
              <h3 style={{ fontFamily: 'var(--font-mincho)', fontSize: '1.1rem', color: '#122438', fontWeight: 700, margin: 0 }}>
                Đang xem: {decksList.find((d) => d.id === selectedDeck)?.name || 'Bộ thẻ'}
              </h3>
              <p style={{ fontSize: '0.82rem', color: '#786A5E', margin: '0.2rem 0 0' }}>
                Bao gồm <strong>{filteredCards.length}</strong> thẻ sẵn sàng cho phiên ôn tập Karuta
              </p>
            </div>
          </div>

          <Link
            href={`/review?deck=${selectedDeck}`}
            className="btn-torii"
            style={{
              position: 'relative',
              zIndex: 2,
              padding: '0.65rem 1.35rem',
              fontSize: '0.9rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              boxShadow: '0 4px 12px rgba(200, 56, 36, 0.3)',
            }}
          >
            <ToriiIcon size={16} color="#FFFFFF" />
            Ôn tập →
          </Link>
        </div>
      )}

      {/* 3. BẢNG MỤC LỤC THẺ BÀI KARUTA CÓ HOA VĂN WASHI ANH ĐÀO */}
      <div
        style={{
          position: 'relative',
          background: '#FAF7F0',
          borderRadius: '16px',
          border: '1.2px solid #E6DDCF',
          boxShadow: '0 8px 24px rgba(18, 36, 56, 0.05)',
          overflow: 'hidden',
        }}
      >
        <JapaneseArtBackdrop
          src="/assets/art/gold-sakura-washi.jpg"
          alt="Hoa anh đào mạ kim trên giấy Washi"
          opacity={0.09}
          blendMode="multiply"
          objectPosition="top right"
        />

        <div style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch', position: 'relative', zIndex: 1 }}>
          <table style={{ width: '100%', minWidth: '700px', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr
                style={{
                  background: '#F0EBE0',
                  borderBottom: '1.5px solid #E2D7C5',
                  color: '#122438',
                  fontSize: '0.85rem',
                  fontFamily: 'var(--font-maru)',
                  fontWeight: 700,
                }}
              >
                <th style={{ padding: '1rem 1.25rem' }}>Chữ Hán &amp; Hiragana mặt trước</th>
                <th style={{ padding: '1rem 1.25rem' }}>Cách đọc &amp; Cao độ</th>
                <th style={{ padding: '1rem 1.25rem' }}>Ý nghĩa tiếng Việt</th>
                <th style={{ padding: '1rem 1.25rem' }}>Trạng thái FSRS</th>
                <th style={{ padding: '1rem 1.25rem' }}>Phân loại</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: '#786A5E' }}>
                    Đang tải dữ liệu thư viện thẻ học...
                  </td>
                </tr>
              ) : filteredCards.length > 0 ? (
                paginatedCards.map((card, idx) => {
                  const kanjiText = card.kanji || '';
                  const deckText = (card.deckName || card.deck || '').toLowerCase();
                  const isGrammar =
                    card.type === 'GrammarPattern' ||
                    card.deckId === 'grammar_jpd133' ||
                    deckText.includes('ngữ pháp') ||
                    deckText.includes('bunbou') ||
                    kanjiText.startsWith('【文法') ||
                    kanjiText.includes('Pattern') ||
                    kanjiText.includes('{{c');

                  const isKanji = !isGrammar && (card.type === 'Kanji' || deckText.includes('hán tự') || deckText.includes('kanji'));

                  const patternMatch = kanjiText.match(/^【文法\s*([^】]+)】\s*\n?([\s\S]*)$/);

                  return (
                    <tr
                      key={card.id}
                      style={{
                        borderBottom: '1px solid #ECE4D6',
                        background: idx % 2 === 0 ? 'rgba(255, 255, 255, 0.7)' : 'rgba(250, 247, 240, 0.7)',
                        transition: 'background 0.2s',
                      }}
                    >
                      {/* Mặt trước Kanji & Hiragana nổi bật */}
                      <td style={{ padding: '1.15rem 1.25rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          {patternMatch ? (
                            <>
                              <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                                <span
                                  style={{
                                    fontFamily: 'var(--font-maru)',
                                    fontSize: '0.74rem',
                                    fontWeight: 800,
                                    color: '#1E4B75',
                                    background: '#EDF4FA',
                                    border: '1.2px solid #B8D5E5',
                                    borderRadius: '5px',
                                    padding: '0.12rem 0.5rem',
                                    letterSpacing: '0.04em',
                                  }}
                                >
                                  文法 {patternMatch[1]}
                                </span>
                              </div>
                              <span
                                style={{
                                  fontFamily: 'var(--font-mincho)',
                                  fontSize: '1.25rem',
                                  fontWeight: 700,
                                  color: '#122438',
                                  lineHeight: 1.35,
                                }}
                              >
                                {patternMatch[2]}
                              </span>
                            </>
                          ) : (
                            <span
                              style={{
                                fontFamily: 'var(--font-mincho)',
                                fontSize: kanjiText.length > 25 ? '1.05rem' : kanjiText.length > 15 ? '1.2rem' : '1.65rem',
                                fontWeight: 700,
                                color: '#122438',
                                lineHeight: 1.35,
                              }}
                            >
                              {parseClozeSegments(kanjiText).map((seg, i) =>
                                seg.isCloze ? (
                                  <span
                                    key={i}
                                    style={{
                                      color: '#153E20',
                                      background: '#EAF5EA',
                                      borderBottom: '2px solid #43894C',
                                      borderRadius: '3px',
                                      padding: '0.05rem 0.35rem',
                                      margin: '0 0.15rem',
                                    }}
                                  >
                                    {seg.text}
                                  </span>
                                ) : (
                                  <span key={i}>{seg.text}</span>
                                )
                              )}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Furigana & Cao độ */}
                      <td style={{ padding: '1.15rem 1.25rem' }}>
                        <div style={{ fontFamily: 'var(--font-maru)', fontSize: '0.96rem', color: '#1E4B75', fontWeight: 600 }}>
                          {stripCloze(card.reading) || '—'}
                        </div>
                        {card.pitch && (
                          <span style={{ fontSize: '0.74rem', color: '#786A5E', display: 'inline-block', marginTop: '0.2rem' }}>
                            Cao độ: {card.pitch}
                          </span>
                        )}
                      </td>

                      {/* Ý nghĩa */}
                      <td style={{ padding: '1.15rem 1.25rem', color: '#2B2B2B', fontSize: '0.92rem', whiteSpace: 'pre-line', lineHeight: 1.5 }}>
                        {card.meaning}
                      </td>

                      {/* Trạng thái nhận thức FSRS */}
                      <td style={{ padding: '1.15rem 1.25rem' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.25rem 0.65rem',
                            background: card.state === 'Review' ? 'rgba(42, 107, 61, 0.08)' : 'rgba(200, 155, 88, 0.08)',
                            color: card.state === 'Review' ? '#1E522C' : '#8A5818',
                            border: `1.2px solid ${card.state === 'Review' ? 'rgba(42, 107, 61, 0.25)' : 'rgba(200, 155, 88, 0.25)'}`,
                            borderRadius: '999px',
                            fontSize: '0.76rem',
                            fontFamily: 'var(--font-maru)',
                            fontWeight: 700,
                          }}
                        >
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: card.state === 'Review' ? '#2A6B3D' : '#C89B58',
                              boxShadow: card.state === 'Review' ? '0 0 6px rgba(42, 107, 61, 0.35)' : '0 0 6px rgba(200, 155, 88, 0.35)',
                            }}
                          />
                          {card.state === 'Review' ? 'Đã củng cố' : 'Mới tiếp nhận'}
                        </span>
                      </td>

                      {/* Con dấu & Nhãn Phân loại */}
                      <td style={{ padding: '1.15rem 1.25rem' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '26px',
                              height: '26px',
                              border: `1.5px solid ${isGrammar ? '#1E4B75' : isKanji ? '#C83824' : '#2A6B3D'}`,
                              borderRadius: '5px',
                              color: isGrammar ? '#1E4B75' : isKanji ? '#C83824' : '#2A6B3D',
                              fontFamily: 'var(--font-mincho)',
                              fontWeight: 800,
                              fontSize: '0.85rem',
                              background: isGrammar ? '#EDF4FA' : isKanji ? '#FFF2F0' : '#F0F9F2',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                            }}
                          >
                            {isGrammar ? '文' : isKanji ? '漢' : '語'}
                          </span>
                          <span
                            style={{
                              fontFamily: 'var(--font-maru)',
                              fontSize: '0.82rem',
                              fontWeight: 700,
                              color: isGrammar ? '#1E4B75' : isKanji ? '#C83824' : '#2A6B3D',
                            }}
                          >
                            {isGrammar ? 'Ngữ pháp' : isKanji ? 'Hán tự' : 'Từ vựng'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: '#786A5E' }}>
                    <SensuFanIcon size={32} color="#C89B58" />
                    <p style={{ marginTop: '0.75rem', fontSize: '0.95rem', fontFamily: 'var(--font-mincho)' }}>
                      Không tìm thấy thẻ học nào phù hợp với bộ lọc
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* THANH PHÂN TRANG (PAGINATION BAR) */}
      {!loading && filteredCards.length > 0 && (
        <div
          style={{
            marginTop: '1.25rem',
            padding: '1rem 1.25rem',
            background: '#FFFFFF',
            borderRadius: '12px',
            border: '1.2px solid #E6DDCF',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            boxShadow: '0 2px 8px rgba(18, 36, 56, 0.04)',
          }}
        >
          {/* Thông tin số lượng */}
          <div style={{ fontSize: '0.85rem', color: '#786A5E', fontFamily: 'var(--font-maru)' }}>
            Hiển thị <strong>{Math.min(filteredCards.length, (safePage - 1) * pageSize + 1)}</strong> -{' '}
            <strong>{Math.min(filteredCards.length, safePage * pageSize)}</strong> trong tổng số{' '}
            <strong>{filteredCards.length}</strong> thẻ
          </div>

          {/* Điều hướng trang */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              style={{
                padding: '0.4rem 0.8rem',
                borderRadius: '6px',
                border: '1.2px solid #D5CFC7',
                background: safePage <= 1 ? '#F5F2EC' : '#FFFFFF',
                color: safePage <= 1 ? '#A89F91' : '#122438',
                cursor: safePage <= 1 ? 'not-allowed' : 'pointer',
                fontSize: '0.84rem',
                fontWeight: 600,
                fontFamily: 'var(--font-maru)',
              }}
            >
              ◀ Trước
            </button>

            <span style={{ padding: '0 0.5rem', fontSize: '0.85rem', fontWeight: 700, color: '#1E4B75' }}>
              Trang {safePage} / {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              style={{
                padding: '0.4rem 0.8rem',
                borderRadius: '6px',
                border: '1.2px solid #D5CFC7',
                background: safePage >= totalPages ? '#F5F2EC' : '#FFFFFF',
                color: safePage >= totalPages ? '#A89F91' : '#122438',
                cursor: safePage >= totalPages ? 'not-allowed' : 'pointer',
                fontSize: '0.84rem',
                fontWeight: 600,
                fontFamily: 'var(--font-maru)',
              }}
            >
              Sau ▶
            </button>

            {/* Bộ chọn số lượng hiển thị */}
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              style={{
                marginLeft: '0.5rem',
                padding: '0.4rem 0.6rem',
                borderRadius: '6px',
                border: '1.2px solid #D5CFC7',
                background: '#FFFFFF',
                color: '#122438',
                fontSize: '0.82rem',
                fontWeight: 600,
                fontFamily: 'var(--font-maru)',
              }}
            >
              <option value={25}>25 thẻ / trang</option>
              <option value={50}>50 thẻ / trang</option>
              <option value={100}>100 thẻ / trang</option>
            </select>
          </div>
        </div>
      )}
      </div>
    </main>
  );
}
