'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { MultimodalAsset } from '@/services/multimodal/types';

export interface KanjiStrokePlayerProps {
  asset?: MultimodalAsset;
  kanji?: string;
  strokes?: number;
  meaning?: string;
  onReading?: string | string[];
  kunReading?: string | string[];
  reading?: string;
  onInspect?: (asset: MultimodalAsset) => void;
  compact?: boolean;
}

/**
 * Thêm hiệu ứng hoạt họa viết nét (Stroke order animation) vào KanjiVG SVG thuần
 */
function prepareAnimatedSvg(rawSvg: string): string {
  const pathMatches = rawSvg.match(/<path[^>]+id="kvg:[^"]+-s(\d+)"[^>]*>/g) || [];
  const strokeCount = pathMatches.length;

  let styledSvg = rawSvg
    .replace(/<svg\s+([^>]*?)width="[^"]*"/, '<svg $1width="100%"')
    .replace(/<svg\s+([^>]*?)height="[^"]*"/, '<svg $1height="100%"')
    .replace(/<path\s+([^>]*?)id="kvg:([^"]+-s(\d+))"/g, (match, prefix, fullId, strokeNum) => {
      return `<path ${prefix}id="kvg:${fullId}" class="kanji-stroke-anim stroke-${strokeNum}"`;
    });

  if (!styledSvg.includes('viewBox')) {
    styledSvg = styledSvg.replace(/<svg\s+/, '<svg viewBox="0 0 109 109" ');
  }

  let css = `
<style>
  @keyframes drawStroke {
    0% { stroke-dashoffset: 400; }
    100% { stroke-dashoffset: 0; }
  }
  .kanji-stroke-anim {
    stroke: #9E3223 !important; /* Đỏ son Bengara truyền thống */
    stroke-width: 3.8 !important;
    stroke-linecap: round !important;
    stroke-linejoin: round !important;
    fill: none !important;
    stroke-dasharray: 400;
    stroke-dashoffset: 400;
    animation: drawStroke 0.65s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  }
`;

  for (let i = 1; i <= Math.max(strokeCount, 30); i++) {
    const strokeDelay = ((i - 1) * 0.38).toFixed(2);
    css += `  .stroke-${i} { animation-delay: ${strokeDelay}s; }\n`;
  }
  css += `</style>\n`;

  const ghostStrokes = pathMatches
    .map((p) => p.replace(/id="[^"]*"/g, '').replace(/class="[^"]*"/g, '').replace(/<path/, '<path stroke="#E2DAC6" stroke-width="3" fill="none" opacity="0.6"'))
    .join('\n    ');
  const ghostGroup = ghostStrokes ? `  <g id="kvg:GhostBackgroundGuide">\n    ${ghostStrokes}\n  </g>\n` : '';

  styledSvg = styledSvg.replace(/<svg\s+([^>]+)>/, `<svg $1>\n${css}${ghostGroup}`);
  return styledSvg;
}

/**
 * Khử bỏ các lỗi CSS cũ (!important trên stroke-dashoffset) và chuẩn hóa kích thước vector SVG
 */
function sanitizeExistingSvg(svgStr: string): string {
  let cleaned = svgStr
    .replace(/stroke-dashoffset:\s*\d+\s*!important\s*;?/g, 'stroke-dashoffset: 400;')
    .replace(/stroke-dasharray:\s*\d+\s*!important\s*;?/g, 'stroke-dasharray: 400;')
    .replace(/stroke:\s*#16253B\s*!important\s*;?/g, 'stroke: #9E3223 !important;')
    .replace(/<svg\s+([^>]*?)width="[^"]*"/, '<svg $1width="100%"')
    .replace(/<svg\s+([^>]*?)height="[^"]*"/, '<svg $1height="100%"');

  if (!cleaned.includes('@keyframes drawStroke')) {
    cleaned = cleaned.replace(/<style>/, `<style>\n  @keyframes drawStroke {\n    0% { stroke-dashoffset: 400; }\n    100% { stroke-dashoffset: 0; }\n  }\n`);
  }
  if (!cleaned.includes('viewBox')) {
    cleaned = cleaned.replace(/<svg\s+/, '<svg viewBox="0 0 109 109" ');
  }
  return cleaned;
}

/**
 * 🌸 KanjiStrokePlayer (漢字筆順プレビュー)
 *
 * Renders animated SVG stroke order vectors inline with zero-latency CSS animation.
 * Features:
 * - Direct inline SVG rendering with instant 0ms keyframe replay
 * - Bengara red (#9E3223) brush strokes with elegant #E2DAC6 ghost guidelines
 * - Dual fallback: Google Drive streaming proxy -> KanjiVG GitHub upstream -> Shippori Mincho typography
 * - Authentic Japanese calligraphy paper aesthetics (washi paper, dashed grid)
 */
export function KanjiStrokePlayer({
  asset,
  kanji,
  strokes: propStrokes,
  meaning: propMeaning,
  onReading: propOnReading,
  kunReading: propKunReading,
  reading: propReading,
  onInspect,
  compact = false,
}: KanjiStrokePlayerProps) {
  const [replayKey, setReplayKey] = useState(0);
  const [svgMarkup, setSvgMarkup] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Extract character from props or asset
  const kanjiChar =
    kanji ||
    asset?.metadata?.kanji ||
    asset?.key?.replace(/^kanji:/, '').trim() ||
    asset?.fileName?.replace(/_animated\.svg$/, '') ||
    '字';

  const strokes = propStrokes ?? asset?.metadata?.strokes;
  const meaning = propMeaning ?? asset?.metadata?.meaning;
  const onReading = propOnReading ?? asset?.metadata?.onReading;
  const kunReading = propKunReading ?? asset?.metadata?.kunReading;
  const reading = propReading ?? asset?.metadata?.reading;

  // Tải nội dung SVG vector (ưu tiên API Media Stream, dự phòng KanjiVG GitHub)
  useEffect(() => {
    let isCancelled = false;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    async function loadSvg() {
      setIsLoading(true);
      setHasError(false);

      try {
        // 1. Thử tải qua API media stream của hệ thống
        const streamUrl = `/api/media/stream?${asset?.fileId ? `fileId=${encodeURIComponent(asset.fileId)}&` : ''}kanji=${encodeURIComponent(kanjiChar)}&mimeType=image/svg%2Bxml`;
        const res = await fetch(streamUrl, {
          signal: controller.signal,
          headers: { Accept: 'image/svg+xml, text/plain, */*' },
        });

        if (res.ok) {
          const text = await res.text();
          if (!isCancelled && text && text.includes('<svg')) {
            const clean = sanitizeExistingSvg(text);
            setSvgMarkup(clean);
            setIsLoading(false);
            return;
          }
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        // Tiếp tục thử dự phòng cấp 2
      }

      // 2. Dự phòng cấp 2: Tải trực tiếp từ KanjiVG GitHub Upstream
      try {
        const hex = kanjiChar.charCodeAt(0).toString(16).padStart(5, '0');
        const kvgUrl = `https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/${hex}.svg`;
        const kvgRes = await fetch(kvgUrl, { signal: controller.signal });

        if (kvgRes.ok) {
          const rawSvg = await kvgRes.text();
          if (!isCancelled && rawSvg && rawSvg.includes('<svg')) {
            const animatedSvg = prepareAnimatedSvg(rawSvg);
            setSvgMarkup(animatedSvg);
            setIsLoading(false);
            return;
          }
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }

      // 3. Nếu tất cả đều thất bại, chuyển sang hiển thị chữ Hán Mincho
      if (!isCancelled) {
        setHasError(true);
        setIsLoading(false);
      }
    }

    loadSvg();

    return () => {
      isCancelled = true;
      controller.abort();
    };
  }, [asset?.fileId, kanjiChar]);

  // Nhấn để phát lại chuyển động nét bút
  const handleReplay = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    // Thay đổi key để React remount phần tử DOM, kích hoạt lại @keyframes tức thì (0ms)
    setReplayKey((prev) => prev + 1);
  }, []);

  const handleInspect = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onInspect && asset) {
        onInspect(asset);
      }
    },
    [asset, onInspect]
  );

  return (
    <div
      className="card-karuta washi-paper-bg"
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: compact ? '10px' : '12px',
        border: '1px solid var(--washi-border)',
        backgroundColor: 'var(--washi-card)',
        boxShadow: compact ? '0 4px 12px rgba(26, 25, 24, 0.05)' : 'var(--shadow-washi-md)',
        overflow: 'hidden',
        transition: 'transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease',
        position: 'relative',
        width: '100%',
      }}
      onMouseEnter={(e) => {
        if (!compact) {
          e.currentTarget.style.transform = 'translateY(-3px)';
          e.currentTarget.style.boxShadow = 'var(--shadow-karuta)';
          e.currentTarget.style.borderColor = 'var(--kincha)';
        }
      }}
      onMouseLeave={(e) => {
        if (!compact) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'var(--shadow-washi-md)';
          e.currentTarget.style.borderColor = 'var(--washi-border)';
        }
      }}
    >
      {/* Header bar: Badge & Stroke count */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: compact ? '0.45rem 0.75rem' : '0.65rem 0.9rem',
          borderBottom: '1px solid var(--washi-border-soft)',
          backgroundColor: 'rgba(247, 244, 235, 0.7)',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: compact ? '0.68rem' : '0.72rem',
            fontWeight: 700,
            fontFamily: 'var(--font-maru)',
            color: 'var(--bengara)',
            backgroundColor: 'var(--bengara-soft)',
            padding: '0.18rem 0.5rem',
            borderRadius: '999px',
            border: '1px solid var(--bengara-border)',
            letterSpacing: '0.04em',
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: 'var(--bengara)',
            }}
          />
          漢字 筆順
        </span>

        {strokes && (
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 600,
              fontFamily: 'var(--font-sans)',
              color: 'var(--sumi-faint)',
            }}
          >
            {strokes} 畫
          </span>
        )}
      </div>

      {/* SVG Canvas Container */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: compact ? '0.85rem 0.5rem' : '1.25rem 0.75rem',
          minHeight: compact ? '150px' : '190px',
          background: 'linear-gradient(180deg, #FFFFFF 0%, var(--washi-card) 100%)',
          cursor: 'pointer',
        }}
        onClick={handleReplay}
        title="Nhấn để phát lại nét vẽ (0ms Replay)"
      >
        {/* Subtle Japanese calligraphy grid guidelines */}
        <div
          style={{
            position: 'absolute',
            width: compact ? '120px' : '150px',
            height: compact ? '120px' : '150px',
            border: '1px dashed var(--washi-border)',
            borderRadius: '6px',
            pointerEvents: 'none',
            opacity: 0.65,
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: 0,
              right: 0,
              height: '1px',
              borderTop: '1px dashed var(--washi-border-soft)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: 0,
              bottom: 0,
              width: '1px',
              borderLeft: '1px dashed var(--washi-border-soft)',
            }}
          />
        </div>

        {/* Loading Spinner */}
        {isLoading && (
          <div
            style={{
              position: 'absolute',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              zIndex: 3,
            }}
          >
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                border: '2px solid rgba(158, 50, 35, 0.2)',
                borderTopColor: 'var(--bengara)',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-maru)', color: 'var(--sumi-faint)' }}>
              Đang chuẩn bị bút mực...
            </span>
          </div>
        )}

        {/* Animated Vector SVG (Rendered directly in DOM for 60fps native execution) */}
        {!hasError && svgMarkup ? (
          <div
            key={replayKey}
            dangerouslySetInnerHTML={{ __html: svgMarkup }}
            style={{
              width: compact ? '125px' : '150px',
              height: compact ? '125px' : '150px',
              position: 'relative',
              zIndex: 2,
              filter: 'drop-shadow(0 2px 4px rgba(26, 25, 24, 0.08))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          />
        ) : !isLoading ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              width: compact ? '120px' : '150px',
              height: compact ? '120px' : '150px',
              fontFamily: 'var(--font-mincho)',
              fontSize: compact ? '3.5rem' : '4.5rem',
              fontWeight: 800,
              color: 'var(--sumi-deep)',
              zIndex: 2,
            }}
          >
            {kanjiChar}
          </div>
        ) : null}
      </div>

      {/* Kanji Metadata & Readings Section */}
      {!compact && (
        <div
          style={{
            padding: '0.8rem 0.9rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem',
            borderTop: '1px solid var(--washi-border-soft)',
            flex: 1,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span
              style={{
                fontFamily: 'var(--font-mincho)',
                fontSize: '1.45rem',
                fontWeight: 800,
                color: 'var(--sumi-deep)',
                lineHeight: 1.1,
              }}
            >
              {kanjiChar}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-maru)',
                fontSize: '0.78rem',
                color: 'var(--sumi-faint)',
                maxWidth: '140px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                textAlign: 'right',
              }}
            >
              {meaning || asset?.fileName?.replace('_animated.svg', '')}
            </span>
          </div>

          {/* Readings: On / Kun if available */}
          {(onReading || kunReading || reading) && (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.3rem',
                fontSize: '0.72rem',
                fontFamily: 'var(--font-sans)',
                color: 'var(--sumi-body)',
                marginTop: '0.2rem',
              }}
            >
              {onReading && (
                <span
                  style={{
                    backgroundColor: 'var(--washi-deep)',
                    padding: '0.1rem 0.4rem',
                    borderRadius: '4px',
                  }}
                >
                  音: {Array.isArray(onReading) ? onReading.join('、') : onReading}
                </span>
              )}
              {kunReading && (
                <span
                  style={{
                    backgroundColor: 'var(--washi-deep)',
                    padding: '0.1rem 0.4rem',
                    borderRadius: '4px',
                  }}
                >
                  訓: {Array.isArray(kunReading) ? kunReading.join('、') : kunReading}
                </span>
              )}
              {!onReading && !kunReading && reading && (
                <span
                  style={{
                    backgroundColor: 'var(--washi-deep)',
                    padding: '0.1rem 0.4rem',
                    borderRadius: '4px',
                  }}
                >
                  読: {reading}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Action Footer: Replay & Inspect */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          padding: compact ? '0.45rem 0.65rem' : '0.65rem 0.9rem',
          backgroundColor: 'rgba(247, 244, 235, 0.4)',
          borderTop: '1px solid var(--washi-border-soft)',
        }}
      >
        <button
          type="button"
          onClick={handleReplay}
          style={{
            flex: 1,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.35rem',
            padding: compact ? '0.35rem 0.5rem' : '0.45rem 0.65rem',
            fontSize: compact ? '0.7rem' : '0.75rem',
            fontWeight: 700,
            fontFamily: 'var(--font-maru)',
            color: 'var(--aizome)',
            backgroundColor: 'var(--aizome-soft)',
            border: '1px solid var(--aizome-border)',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--aizome)';
            e.currentTarget.style.color = '#FFFFFF';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--aizome-soft)';
            e.currentTarget.style.color = 'var(--aizome)';
          }}
          title="Vẽ lại nét viết tức thì (0ms)"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M1 4v6h6" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
          再描画 (Replay)
        </button>

        {onInspect && asset && (
          <button
            type="button"
            onClick={handleInspect}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: compact ? '0.35rem 0.5rem' : '0.45rem 0.65rem',
              fontSize: compact ? '0.7rem' : '0.75rem',
              fontWeight: 600,
              fontFamily: 'var(--font-maru)',
              color: 'var(--sumi-body)',
              backgroundColor: 'var(--washi-deep)',
              border: '1px solid var(--washi-border)',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--kincha)';
              e.currentTarget.style.borderColor = 'var(--kincha)';
              e.currentTarget.style.color = '#FFFFFF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--washi-deep)';
              e.currentTarget.style.borderColor = 'var(--washi-border)';
              e.currentTarget.style.color = 'var(--sumi-body)';
            }}
            title="Xem thông tin chi tiết tài nguyên"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            詳細
          </button>
        )}
      </div>
    </div>
  );
}

export default KanjiStrokePlayer;
