import Link from 'next/link';
import { getAllJPD133Slots } from '@/core/curriculum/jpd133-manifest';

export default function JPD133CurriculumPage() {
  const slots = getAllJPD133Slots();

  return (
    <main style={{ maxWidth: '1000px', margin: '2rem auto', padding: '0 1.25rem 5rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <p style={{ color: 'var(--kincha-gold)', fontWeight: 800, fontFamily: 'var(--font-mincho)' }}>
          JPD133 · CURRICULUM RECOVERY
        </p>
        <h1 style={{ fontFamily: 'var(--font-mincho)', color: 'var(--sumi-ink)', marginTop: '0.35rem' }}>
          Giáo trình JPD133
        </h1>
        <p style={{ color: 'var(--sumi-charcoal)', marginTop: '0.6rem', lineHeight: 1.6 }}>
          Bản phục hồi để review các Slot Dò bài Minna trước khi quyết định giữ, redesign hoặc loại bỏ.
          Mapping hiện tại dùng trường page trong data/jpd133_vocab.json và được cô lập trong manifest.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '1rem' }}>
        {slots.map((slot) => (
          <article
            key={slot.slotId}
            style={{
              padding: '1.15rem',
              border: '1px solid var(--washi-border)',
              borderRadius: '14px',
              background: 'var(--washi-surface)',
              boxShadow: 'var(--shadow-washi-sm)',
            }}
          >
            <div style={{ color: 'var(--bengara-red)', fontWeight: 800, fontSize: '0.8rem' }}>
              SLOT {slot.slotNumber}
            </div>
            <h2 style={{ fontFamily: 'var(--font-mincho)', fontSize: '1.15rem', marginTop: '0.35rem' }}>
              {slot.titleJa}
            </h2>
            <p style={{ color: 'var(--sumi-charcoal)', marginTop: '0.35rem' }}>{slot.titleVn}</p>
            <p style={{ color: 'var(--sumi-faded)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
              {slot.vocabularyList.length} mục · source page {slot.sourcePage}
            </p>
            <Link
              href={`/curriculum/jpd133/${slot.slotNumber}`}
              className="btn-washi"
              style={{ display: 'inline-flex', marginTop: '0.85rem', textDecoration: 'none' }}
            >
              Xem Slot
            </Link>
          </article>
        ))}
      </div>
    </main>
  );
}
