'use client';

import React from 'react';
import { GrammarStructureSlot } from '@/core/grammar/grammar.types';

interface StructureDiagramProps {
  template: string;
  slots: GrammarStructureSlot[];
}

export function StructureDiagram({ template, slots }: StructureDiagramProps) {
  if (!slots || slots.length === 0) {
    return (
      <div
        style={{
          padding: '0.75rem 1rem',
          background: 'rgba(27, 66, 104, 0.05)',
          borderRadius: '8px',
          fontFamily: 'var(--font-mono, monospace)',
          fontSize: '0.95rem',
          color: '#1B4268',
          borderLeft: '4px solid #1B4268',
        }}
      >
        {template}
      </div>
    );
  }

  const roleLabels: Record<string, string> = {
    subject: 'Chủ ngữ',
    target: 'Đối tượng',
    object: 'Tân ngữ',
    particle: 'Trợ từ',
    core_verb: 'Động từ chính',
    auxiliary: 'Trợ động từ',
    adjective: 'Tính từ',
    noun: 'Danh từ',
    clause: 'Mệnh đề',
  };

  return (
    <div
      className="bento-card-artisan"
      style={{
        padding: '1.15rem 1.35rem',
        background: '#FFFFFF',
        border: '1.5px solid var(--washi-border, #E6E1DA)',
        borderRadius: '14px',
        boxShadow: '0 2px 10px rgba(18, 36, 56, 0.04)',
      }}
    >
      <div
        style={{
          fontSize: '0.75rem',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: '#786A5E',
          marginBottom: '0.85rem',
          fontWeight: 800,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontFamily: 'var(--font-maru)',
        }}
      >
        <span>📐 SƠ ĐỒ KHUNG CẤU TRÚC NGỮ PHÁP (STRUCTURE SLOTS)</span>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '0.65rem',
        }}
      >
        {slots.map((slot, idx) => {
          const isParticle = slot.role === 'particle';
          const isVerb = slot.role === 'core_verb' || slot.role === 'auxiliary';
          const isNoun = slot.role === 'noun' || slot.role === 'subject' || slot.role === 'target' || slot.role === 'object';
          const isAdj = slot.role === 'adjective';

          let bg = '#FAF8F5';
          let borderColor = '#D8CDB8';
          let textColor = '#122438';
          let roleColor = '#786A5E';

          if (isParticle) {
            bg = '#FFF2F0';
            borderColor = 'rgba(200, 56, 36, 0.4)';
            textColor = '#C83824';
            roleColor = '#9E2413';
          } else if (isVerb) {
            bg = '#EDF4FA';
            borderColor = 'rgba(30, 75, 117, 0.4)';
            textColor = '#1E4B75';
            roleColor = '#0F2C47';
          } else if (isAdj) {
            bg = '#EBF5EE';
            borderColor = 'rgba(42, 107, 61, 0.4)';
            textColor = '#2A6B3D';
            roleColor = '#144020';
          } else if (isNoun) {
            bg = '#FFF9E6';
            borderColor = 'rgba(184, 133, 60, 0.4)';
            textColor = '#B8853C';
            roleColor = '#664B16';
          }

          return (
            <React.Fragment key={idx}>
              <div
                style={{
                  display: 'inline-flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '0.45rem 0.85rem',
                  background: bg,
                  border: `1.5px solid ${borderColor}`,
                  borderRadius: '10px',
                  minWidth: '60px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                  transition: 'transform 0.15s ease',
                }}
              >
                <span
                  style={{
                    fontSize: '1.05rem',
                    fontWeight: 800,
                    color: textColor,
                    fontFamily: 'var(--font-mincho, serif)',
                  }}
                >
                  {slot.label}
                </span>
                <span
                  style={{
                    fontSize: '0.7rem',
                    color: roleColor,
                    marginTop: '3px',
                    fontWeight: 700,
                    fontFamily: 'var(--font-maru)',
                  }}
                >
                  {roleLabels[slot.role] || slot.role}
                </span>
              </div>

              {idx < slots.length - 1 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#C89B58',
                    fontWeight: 900,
                    fontSize: '1.1rem',
                  }}
                >
                  ➔
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
