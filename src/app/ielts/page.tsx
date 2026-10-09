'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface DashboardData {
  targetBand: number;
  currentBand: number;
  totalMistakes: number;
  totalVocab: number;
  skillBands: Array<{ skill: string; current: number; target: number; color: string }>;
  recentSessions: Array<{ id: string; title: string; section: string; type: string; score: string; band: number; date: string }>;
  mistakeBreakdown: Array<{ category: string; count: number; percent: number; desc: string }>;
}

export default function IeltsDashboard() {
  // No legacy demo scores/history in the new data-connected staging view.
  const [data, setData] = useState<DashboardData>({
    targetBand:8,currentBand:0,totalMistakes:0,totalVocab:0,
    skillBands:[
      {skill:'Listening',current:0,target:8.5,color:'#002147'},
      {skill:'Reading',current:0,target:8.5,color:'#1B4268'},
      {skill:'Writing',current:0,target:7.5,color:'#D97706'},
      {skill:'Speaking',current:0,target:7.5,color:'#059669'},
    ],recentSessions:[],mistakeBreakdown:[],
  });
  const [readError,setReadError] = useState('');

  const [loading, setLoading] = useState(true);
  const [dbConnected, setDbConnected] = useState(false);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/backend/api/v1/ielts/dashboard', { cache:'no-store' });
        if (!res.ok) throw new Error('IELTS staging API unavailable');
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setData(json.data);
            setDbConnected(true);
          }
        }
      } catch (err) {
        console.warn('IELTS staging read failed:', err);
        setReadError('IELTS staging chưa kết nối; không hiển thị dữ liệu mẫu như tiến độ thật.');
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  const { targetBand, currentBand, totalMistakes, totalVocab, skillBands, recentSessions, mistakeBreakdown } = data;

  return (
    <div className="english-mode" style={{ minHeight: '100vh', padding: '2rem' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        {readError && <p role="alert" style={{color:'#9B3434',padding:'1rem',border:'1px solid #9B3434'}}>{readError}</p>}
        {/* Header Hero */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <h1 style={{ fontSize: '2.6rem', margin: 0, fontFamily: 'var(--font-serif)', color: 'var(--primary-color)' }}>
                The Study · IELTS Master Suite
              </h1>
              {dbConnected && (
                <span style={{
                  fontSize: '0.75rem',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '12px',
                  backgroundColor: '#E6F4EA',
                  color: '#137333',
                  fontWeight: 'bold',
                  letterSpacing: '0.3px',
                }}>
                  ● Staging API Connected
                </span>
              )}
            </div>
            <p style={{ fontSize: '1.1rem', margin: '0.35rem 0 0', color: 'var(--text-color)' }}>
              Môi trường theo dõi học tập học thuật chuẩn Oxford &amp; Cambridge.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <Link
              href="/ielts/session"
              style={{
                backgroundColor: 'var(--primary-color)',
                color: '#FFFFFF',
                padding: '0.8rem 1.6rem',
                borderRadius: '6px',
                textDecoration: 'none',
                fontWeight: 'bold',
                fontFamily: 'var(--font-sans)',
                boxShadow: '0 3px 8px rgba(0,33,71,0.25)',
              }}
            >
              ▶ Bắt đầu Session mới
            </Link>
          </div>
        </div>

        {/* Top KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
          <div className="british-border" style={{ backgroundColor: '#FFFFFF', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.85rem', color: '#666', textTransform: 'uppercase', fontWeight: 600 }}>
              Overall Target Band
            </div>
            <div style={{ fontSize: '3rem', color: 'var(--primary-color)', fontWeight: 'bold', fontFamily: 'var(--font-serif)', lineHeight: 1.1, margin: '0.25rem 0' }}>
              {targetBand.toFixed(1)}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#059669', fontWeight: 600 }}>
              Mục tiêu xét duyệt học bổng / hồ sơ
            </div>
          </div>

          <div className="british-border" style={{ backgroundColor: '#FFFFFF', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.85rem', color: '#666', textTransform: 'uppercase', fontWeight: 600 }}>
              Current Estimated Band
            </div>
            <div style={{ fontSize: '3rem', color: '#1B4268', fontWeight: 'bold', fontFamily: 'var(--font-serif)', lineHeight: 1.1, margin: '0.25rem 0' }}>
              {currentBand.toFixed(1)}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#666' }}>
              Trung bình cộng 3 session gần nhất
            </div>
          </div>

          <div className="british-border" style={{ backgroundColor: '#FFFFFF', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.85rem', color: '#666', textTransform: 'uppercase', fontWeight: 600 }}>
              Lỗi Sai Đã Phân Tích
            </div>
            <div style={{ fontSize: '3rem', color: 'var(--error-color)', fontWeight: 'bold', fontFamily: 'var(--font-serif)', lineHeight: 1.1, margin: '0.25rem 0' }}>
              {totalMistakes}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#666' }}>
              Cần khắc phục bẫy Distraction
            </div>
          </div>

          <div className="british-border" style={{ backgroundColor: '#FFFFFF', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.85rem', color: '#666', textTransform: 'uppercase', fontWeight: 600 }}>
              FSRS Vocab Vault
            </div>
            <div style={{ fontSize: '3rem', color: '#047857', fontWeight: 'bold', fontFamily: 'var(--font-serif)', lineHeight: 1.1, margin: '0.25rem 0' }}>
              {totalVocab}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#059669', fontWeight: 600 }}>
              Đã sẵn sàng đồng bộ sang Cards
            </div>
          </div>
        </div>

        {/* 4 Skills Breakdown */}
        <div className="british-border" style={{ backgroundColor: '#FFFFFF', padding: '1.75rem', borderRadius: '8px', marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.4rem', margin: '0 0 1.25rem 0' }}>
            Trình Độ Chi Tiết Theo 4 Kỹ Năng (Band 0.0 - 9.0)
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
            {skillBands.map((sk) => (
              <div key={sk.skill} style={{ padding: '1rem', background: '#F9FAFB', borderRadius: '6px', border: '1px solid #E5E7EB' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>{sk.skill}</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: sk.color }}>{sk.current.toFixed(1)} / 9.0</span>
                </div>
                <div style={{ height: '8px', background: '#E5E7EB', borderRadius: '4px', overflow: 'hidden', marginBottom: '0.5rem' }}>
                  <div style={{ height: '100%', width: `${(sk.current / 9) * 100}%`, background: sk.color, borderRadius: '4px' }} />
                </div>
                <div style={{ fontSize: '0.78rem', color: '#6B7280', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Hiện tại: {sk.current}</span>
                  <span>Mục tiêu: {sk.target}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 2-Column: Recent Sessions & Mistake Taxonomy */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem', flexWrap: 'wrap' }}>
          {/* Recent Sessions */}
          <div className="british-border" style={{ backgroundColor: '#FFFFFF', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.3rem', margin: 0 }}>Recent Test Sessions</h2>
              <Link href="/ielts/session" style={{ fontSize: '0.85rem', color: 'var(--primary-color)', fontWeight: 600, textDecoration: 'none' }}>
                + Làm bài mới
              </Link>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {recentSessions.map((s) => (
                <div
                  key={s.id}
                  style={{
                    padding: '0.85rem 1rem',
                    border: '1px solid #E5E7EB',
                    borderRadius: '6px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#FAFAFA'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 'bold', color: 'var(--primary-color)', fontSize: '0.95rem' }}>
                      {s.title}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#6B7280', marginTop: '0.2rem' }}>
                      {s.section} ({s.type}) · {s.score} · {s.date}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{
                      padding: '0.25rem 0.65rem',
                      borderRadius: '4px',
                      background: 'rgba(0,33,71,0.08)',
                      color: 'var(--primary-color)',
                      fontWeight: 'bold',
                      fontSize: '1rem'
                    }}>
                      Band {s.band.toFixed(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mistake Taxonomy */}
          <div className="british-border" style={{ backgroundColor: '#FFFFFF', borderRadius: '8px' }}>
            <h2 style={{ fontSize: '1.3rem', marginBottom: '1rem' }}>
              Mistake Taxonomy Analysis
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {mistakeBreakdown.map((m) => (
                <div key={m.category} style={{ padding: '0.65rem', borderBottom: '1px solid #F3F4F6' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--primary-color)' }}>
                      {m.category}
                    </span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--error-color)' }}>
                      {m.count} lỗi ({m.percent}%)
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#6B7280' }}>
                    {m.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
