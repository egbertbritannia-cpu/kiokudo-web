import React, { Suspense } from 'react';
import { grammarRepository } from '@/lib/grammar-readonly';
import { PatternCard } from '@/components/grammar/PatternCard';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ lessonId: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { lessonId } = await params;
  let lesson;
  try { lesson=await grammarRepository.getLessonById(lessonId); }
  catch { return {title:'Bài học ngữ pháp | Kiokudo Staging'}; }
  if (!lesson) return { title: 'Bài học ngữ pháp | Japanese SRS' };

  return {
    title: `${lesson.titleJa} · ${lesson.titleVi} | Ngữ pháp Nhật Bản`,
    description: lesson.description,
  };
}

async function LessonContent({ lessonId }: { lessonId: string }) {
  let lesson;
  try { lesson=await grammarRepository.getLessonById(lessonId); }
  catch {
    return <p role="alert" style={{color:'#9B3434'}}>
      Không thể tải bài ngữ pháp từ staging; không có dữ liệu demo thay thế.
    </p>;
  }
  if (!lesson) notFound();

  const accent = lesson.accentColor || '#1B4268';

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', paddingBottom: '5rem' }}>
      {/* Breadcrumb */}
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.85rem',
          color: '#8B7B6D',
          marginBottom: '1.25rem',
        }}
      >
        <Link href="/" style={{ color: '#8B7B6D', textDecoration: 'none' }}>
          Trang chủ
        </Link>
        <span>/</span>
        <Link href="/grammar" style={{ color: '#8B7B6D', textDecoration: 'none' }}>
          Ngữ pháp
        </Link>
        <span>/</span>
        <span style={{ color: accent, fontWeight: 700 }}>Bài {lesson.lessonNumber}</span>
      </nav>

      {/* Lesson Banner Header */}
      <div
        style={{
          background: accent,
          borderRadius: '18px',
          color: '#FFFFFF',
          padding: '2rem 1.75rem',
          marginBottom: '2rem',
          boxShadow: '0 6px 24px rgba(0, 0, 0, 0.12)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '1rem',
        }}
      >
        <div>
          <span
            style={{
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              opacity: 0.85,
              fontWeight: 700,
            }}
          >
            GIÁO TRÌNH JPD133 · MẪU {lesson.patternRange}
          </span>
          <h1
            style={{
              margin: '0.4rem 0 0.25rem',
              fontSize: '2rem',
              fontWeight: 900,
              fontFamily: 'var(--font-mincho, "Shippori Mincho", serif)',
            }}
          >
            {lesson.titleJa}
          </h1>
          <div style={{ fontSize: '1.1rem', fontWeight: 600, opacity: 0.95, marginBottom: '0.75rem' }}>
            {lesson.titleVi}
          </div>
          <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.85, lineHeight: 1.5, maxWidth: '640px' }}>
            {lesson.description}
          </p>

          <div style={{ marginTop: '1.5rem' }}>
            <Link
              href={`/grammar/practice?lessonId=${lesson.id}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1.25rem',
                background: '#FFFFFF',
                color: accent,
                borderRadius: '10px',
                fontWeight: 800,
                fontSize: '0.9rem',
                textDecoration: 'none',
                boxShadow: '0 3px 10px rgba(0,0,0,0.15)',
              }}
            >
              <span>✍️ Luyện tập {lesson.patternCount * 6}+ bài tập của bài này</span>
            </Link>
          </div>
        </div>

        {/* Big Hanko Inkan */}
        <div
          style={{
            width: '56px',
            height: '56px',
            border: '3px solid #FFCDD2',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            fontWeight: 900,
            fontSize: '1.75rem',
            fontFamily: 'var(--font-mincho, serif)',
            background: 'rgba(217, 56, 30, 0.7)',
            boxShadow: 'inset 0 0 8px rgba(0,0,0,0.25)',
            transform: 'rotate(-5deg)',
            flexShrink: 0,
          }}
        >
          {lesson.inkanChar || lesson.lessonNumber}
        </div>
      </div>

      {/* Patterns Section Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: '1.25rem',
            color: '#1F2421',
            fontFamily: 'var(--font-mincho, "Shippori Mincho", serif)',
          }}
        >
          🎋 CÁC MẪU CẤU TRÚC ({lesson.patterns?.length || 0} PATTERNS)
        </h2>
        <span style={{ fontSize: '0.8rem', color: '#888' }}>
          Nhấn vào mẫu câu để mở rộng chi tiết
        </span>
      </div>

      {/* List of Patterns */}
      <div>
        {lesson.patterns?.map((pattern: any, idx: number) => (
          <PatternCard
            key={pattern.id}
            pattern={pattern}
            accentColor={accent}
            defaultExpanded={idx === 0}
          />
        ))}
      </div>
    </div>
  );
}

export default async function LessonDetailPage({ params }: PageProps) {
  const { lessonId } = await params;

  return (
    <main
      style={{
        minHeight: '100vh',
        padding: '1.5rem 1rem 5.5rem',
        background: 'var(--washi-base, #FAF8F5)',
      }}
    >
      <Suspense
        fallback={
          <div style={{ textAlign: 'center', padding: '3rem', color: '#8B7B6D' }}>
            Đang tải dữ liệu bài học... 🌸
          </div>
        }
      >
        <LessonContent lessonId={lessonId} />
      </Suspense>
    </main>
  );
}
