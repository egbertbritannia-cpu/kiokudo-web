'use client';

import React, { useState } from 'react';
import { japaneseAudio } from './AudioEffects';
import { JapaneseAudioPool } from '@/lib/audio-pool';
import { stripCloze } from '@/lib/cloze';

interface SpeakerButtonProps {
  text: string;
  size?: number;
  label?: string;
  audioUrl?: string;
}

export function JapaneseSpeakerButton({ text, size = 18, label, audioUrl }: SpeakerButtonProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPlaying(true);
    const cleanText = stripCloze(text).replace(/\s*\((On|Kun):[^)]*\)/gi, '').trim();

    if (audioUrl) {
      JapaneseAudioPool.play(audioUrl);
      setTimeout(() => setIsPlaying(false), 1200);
    } else {
      japaneseAudio.speak(cleanText, () => setIsPlaying(false));
      // Fallback timer dựa trên độ dài văn bản
      setTimeout(() => setIsPlaying(false), Math.max(1200, cleanText.length * 200));
    }
  };

  return (
    <button
      type="button"
      className="btn-karuta-action"
      onClick={handleClick}
      title={`Nghe phát âm: ${text}`}
      style={{
        touchAction: 'manipulation',
        border: '1.2px solid var(--washi-border, #E8E2D8)',
        borderRadius: '8px',
        padding: label ? '0.35rem 0.65rem' : '0.35rem',
        minWidth: label ? undefined : `${size + 14}px`,
        height: `${size + 14}px`,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.35rem',
        color: isPlaying ? '#C83824' : '#2A6B3D',
        backgroundColor: isPlaying ? 'rgba(200, 56, 36, 0.08)' : 'rgba(255, 255, 255, 0.92)',
        boxShadow: isPlaying ? '0 0 0 3px rgba(200, 155, 88, 0.2)' : '0 1px 2px rgba(18, 36, 56, 0.04)',
        flexShrink: 0,
        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          transform: isPlaying ? 'scale(1.1)' : 'scale(1)',
          transition: 'transform 0.2s ease',
          flexShrink: 0,
        }}
      >
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill={isPlaying ? 'currentColor' : 'none'} />
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
      </svg>
      {label && (
        <span style={{ fontSize: '0.78rem', fontFamily: 'var(--font-maru)', fontWeight: 600 }}>
          {label}
        </span>
      )}
    </button>
  );
}
