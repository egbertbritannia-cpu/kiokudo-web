import React, { Suspense } from 'react';
import { grammarRepository } from '@/lib/grammar-readonly';
import { GrammarGallery } from '@/components/grammar/GrammarGallery';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '文法 · Ngữ pháp Nhật Bản | Japanese SRS System',
  description: 'Học và ôn luyện 32 cấu trúc ngữ pháp Bài 8 - 11 giáo trình JPD133 kèm các bài tập SBT và luyện phản xạ ngữ pháp.',
};

async function GrammarData() {
  try {
    const [data, patterns] = await Promise.all([
    grammarRepository.getAllLessonsWithStats(),
    grammarRepository.getAllPatternsSummary(),
  ]);
    return <GrammarGallery lessons={data.lessons} stats={data.stats} allPatterns={patterns} />;
  } catch {
    return <p role="alert" style={{maxWidth:1080,margin:'2rem auto',color:'#9B3434'}}>
      Không thể tải Grammar staging. Giao diện được giữ nguyên, chưa dùng dữ liệu production.
    </p>;
  }
}

export default function GrammarPage() {
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
          <div
            style={{
              maxWidth: '1080px',
              margin: '0 auto',
              padding: '3rem 1rem',
              textAlign: 'center',
              color: '#8B7B6D',
              fontSize: '1.1rem',
            }}
          >
            Đang tải dữ liệu ngữ pháp Nhật Bản... 🎋
          </div>
        }
      >
        <GrammarData />
      </Suspense>
    </main>
  );
}
