const previews = [
  { kanji: '門', name: 'Cổng Văn Hóa', desc: 'Landing · dashboard · tư tưởng Kintsugi và hàng đợi thẻ', href: '/ui-demos/kiokudo-cultural-gate.html', type: 'Cultural concept' },
  { kanji: '復', name: 'Bàn Dò Bài', desc: 'JPD133 · luyện thuận/nghịch · thẻ chưa thuộc · retry queue', href: '/ui-demos/ban-do-bai.html', type: 'Drill concept' },
  { kanji: '記', name: 'Kiokudo Studio', desc: 'Concept toàn hệ thống · navigation · Karuta · Grammar · IELTS', href: '/ui-demos/kiokudo-studio.html', type: 'System concept' },
];
export default function Page() {
  return (
    <main className="shell">
      <header className="brand"><span className="seal">記</span><span>KIOKUDO <small>記憶道</small></span><span className="status">FE MIGRATION PREVIEW</span></header>
      <section className="hero">
        <div className="eyebrow">記憶道 · THE WAY OF MEMORY</div>
        <h1>Không gian <em>Kiokudo</em></h1>
        <p>Giao diện thử nghiệm cho repository Frontend mới. Chọn một concept để xem và so sánh trước khi quyết định redesign. Chưa có dữ liệu thật hay thao tác ghi FSRS ở đây.</p>
      </section>
      <section className="gallery" aria-label="UI concepts">
        {previews.map(p=>(
          <a className="preview" href={p.href} key={p.href}>
            <span className="glyph">{p.kanji}</span>
            <span className="kind">{p.type}</span>
            <h2>{p.name}</h2><p>{p.desc}</p>
            <span className="view">Xem demo <span aria-hidden="true">↗</span></span>
          </a>
        ))}
      </section>
      <section className="notice"><strong>Trạng thái migration:</strong> Backend/API production vẫn đang chạy trên repository gốc. Core mới hiện chỉ có health/status API và chưa kết nối DB/ReviewService. Không sử dụng bản preview này để ghi tiến độ học thật.</section>
      <footer>Single-user learning system · Next.js FE / Fastify BE · <a href="https://github.com/egbertbritannia-cpu/japanese-srs-system">Legacy baseline</a></footer>
    </main>
  );
}
