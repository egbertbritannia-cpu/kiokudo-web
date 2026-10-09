import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getJPD133Slot } from '@/core/curriculum/jpd133-manifest';

export default async function JPD133SlotPage({
  params,
}: {
  params: Promise<{ slot: string }>;
}) {
  const { slot: slotParam } = await params;
  const slot = getJPD133Slot(slotParam);
  if (!slot) notFound();

  return (
    <main style={{ maxWidth: '1000px', margin: '2rem auto', padding: '0 1.25rem 5rem' }}>
      <Link href="/curriculum/jpd133" style={{ color: 'var(--sumi-faded)', textDecoration: 'none' }}>
        ← Tất cả Slot
      </Link>

      <header style={{ margin: '1rem 0 1.5rem' }}>
        <div style={{ color: 'var(--bengara-red)', fontWeight: 800 }}>JPD133 · SLOT {slot.slotNumber}</div>
        <h1 style={{ fontFamily: 'var(--font-mincho)', marginTop: '0.35rem' }}>{slot.titleJa}</h1>
        <p style={{ color: 'var(--sumi-charcoal)', marginTop: '0.35rem' }}>{slot.titleVn}</p>
        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', marginTop: '1rem' }}>
          <Link
            href={`/review/dobai?curriculum=jpd133&slot=${slot.slotNumber}&mode=dobai`}
            className="btn-torii"
            style={{ textDecoration: 'none' }}
          >
            Dò bài Slot này
          </Link>
          <Link
            href={`/review/dobai?curriculum=jpd133&slot=${slot.slotNumber}&mode=karuta`}
            className="btn-washi"
            style={{ textDecoration: 'none' }}
          >
            Ôn bằng Karuta
          </Link>
        </div>
      </header>

      <div style={{ overflowX: 'auto', border: '1px solid var(--washi-border)', borderRadius: '14px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--washi-surface)' }}>
          <thead>
            <tr style={{ background: 'var(--washi-deep)', textAlign: 'left' }}>
              <th style={{ padding: '0.75rem' }}>Từ</th>
              <th style={{ padding: '0.75rem' }}>Cách đọc</th>
              <th style={{ padding: '0.75rem' }}>Nghĩa</th>
              <th style={{ padding: '0.75rem' }}>Topic</th>
            </tr>
          </thead>
          <tbody>
            {slot.vocabularyList.map((item) => (
              <tr key={item.id} style={{ borderTop: '1px solid var(--washi-border-soft)' }}>
                <td style={{ padding: '0.75rem', fontFamily: 'var(--font-mincho)', fontWeight: 800 }}>{item.kanji}</td>
                <td style={{ padding: '0.75rem', color: 'var(--bengara-red)' }}>{item.reading || '—'}</td>
                <td style={{ padding: '0.75rem' }}>{item.vietnameseMeaning}</td>
                <td style={{ padding: '0.75rem', color: 'var(--sumi-faded)' }}>{item.topic || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
