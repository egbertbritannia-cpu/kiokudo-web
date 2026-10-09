'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

export default function CulturePortalPage() {
  const gardenRef = useRef<SVGSVGElement | null>(null);
  const bowlRef = useRef<SVGSVGElement | null>(null);
  const veinRef = useRef<SVGPathElement | null>(null);
  const [isHealed, setIsHealed] = useState(false);

const GARDEN_ROCKS = [
  { x: 190, y: 300, r: 50 },
  { x: 380, y: 470, r: 32 },
  { x: 240, y: 600, r: 20 },
];

const GARDEN_LINES: number[] = [];
for (let y = 20; y < 720; y += 11) {
  GARDEN_LINES.push(y);
}

  // 2. Sinh Chiếc Bát Kintsugi 3 mảnh vỡ hàn gắn vàng
  useEffect(() => {
    const b = bowlRef.current;
    if (!b) return;
    b.innerHTML = '';

    const NS = "http://www.w3.org/2000/svg";
    const el = (t: string, a: Record<string, string | number>, p?: SVGElement) => {
      const e = document.createElementNS(NS, t);
      for (const k in a) e.setAttribute(k, String(a[k]));
      if (p) p.appendChild(e);
      return e;
    };

    const R = 130;
    const A = [-90, 30, 150];
    const rnd = (i: number, k: number) => (Math.sin(i * 91.7 + k * 47.3) * 43758.5) % 1;
    const seams: [number, number][][] = [];

    A.forEach((a, i) => {
      const pts: [number, number][] = [];
      for (let k = 0; k <= 8; k++) {
        const t = k / 8;
        const ang = (a + (k && k < 8 ? rnd(i, k) * 9 : 0)) * Math.PI / 180;
        pts.push([Math.cos(ang) * R * t, Math.sin(ang) * R * t]);
      }
      seams.push(pts);
    });

    const P = (p: [number, number][]) => p.map(q => q[0].toFixed(1) + " " + q[1].toFixed(1)).join("L");

    A.forEach((a, i) => {
      const s1 = seams[i];
      const s2 = seams[(i + 1) % 3];
      const end = s2[8];
      const d = `M${P(s1)}A${R} ${R} 0 0 1 ${end[0].toFixed(1)} ${end[1].toFixed(1)}L${P([...s2].reverse())}Z`;
      const mid = (a + 60) * Math.PI / 180;
      const sh = el("path", { class: "sh", d }, b);
      const transformVal = `translate(${Math.cos(mid) * 26}px,${Math.sin(mid) * 26}px) rotate(${(i - 1) * 6}deg)`;
      sh.style.transform = transformVal;
      sh.dataset.t = transformVal;
    });

    seams.forEach(s => el("path", { class: "sm", pathLength: 1, d: "M" + P(s) }, b));
    el("circle", { r: R + 1, fill: "none", stroke: "#D4AE5E", "stroke-width": 1.5, opacity: 0.5 }, b);

    // Kích hoạt hàn gắn vàng
    const timer = setTimeout(() => {
      setIsHealed(true);
    }, 600);

    return () => clearTimeout(timer);
  }, []);

  // Xử lý click để làm vỡ lại bát Kintsugi rồi hàn gắn
  const handleBowlClick = () => {
    setIsHealed(false);
    const b = bowlRef.current;
    if (b) {
      b.querySelectorAll<SVGPathElement>(".sh").forEach(s => {
        if (s.dataset.t) s.style.transform = s.dataset.t;
      });
    }
    setTimeout(() => {
      setIsHealed(true);
    }, 500);
  };

  // 3. Đường mạch vàng Vein chạy dọc theo cuộn trang
  useEffect(() => {
    const p = veinRef.current;
    if (!p) return;

    let d = "M10 0";
    let y = 0;
    let i = 0;
    while (y < 1000) {
      y += 22 + ((i * 37) % 28);
      d += `L${i % 2 ? 4 : 15 + ((i * 13) % 4)} ${y}`;
      i++;
    }
    p.setAttribute("d", d);

    const onScroll = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      if (p) p.style.strokeDashoffset = String(1 - (h > 0 ? window.scrollY / h : 0));
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="portal-view">
      {/* VỆT VÀNG MẠCH NGUỒN CHẠY DỌC MÀN HÌNH */}
      <svg className="vein" viewBox="0 0 20 1000" preserveAspectRatio="none" aria-hidden="true">
        <path
          ref={veinRef}
          fill="none"
          stroke="#B8923F"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          pathLength={1}
          strokeDasharray="1"
          strokeDashoffset="1"
          style={{ filter: "drop-shadow(0 0 3px rgba(184,146,63,.7))" }}
        />
      </svg>

      {/* 1. SECTION KHÔNG GIAN TĨNH LẶNG (HAIKU & KARESANSUI) */}
      <section className="hero-sec" id="top">
        <div className="hero" style={{ maxWidth: 1120, margin: '0 auto', padding: '0 22px' }}>
          <div>
            <div className="cap">
              <b>侘寂</b> · 静寂の間 · KHÔNG GIAN TĨNH LẶNG
            </div>
            <div className="frame">
              <div className="haiku" lang="ja">
                <p>閑さや</p>
                <p>岩に染み入る</p>
                <p>蝉の声</p>
              </div>
              <p className="tr">
                Tiếng ve ngân ngấm sâu vào khe đá cổ,<br />
                vạn vật chìm vào tĩnh lặng tuyệt đối.
              </p>
              <div className="by">松尾芭蕉 · MATSUO BASHŌ · 1689</div>
            </div>
          </div>
          <svg
            className="garden"
            viewBox="0 0 600 720"
            role="img"
            aria-label="Vườn đá thiền Karesansui với vầng trăng mực"
          >
            {GARDEN_LINES.map(y => (
              <path key={y} className="l" d={`M0 ${y}H600`} />
            ))}
            {GARDEN_ROCKS.map((k, idx) => (
              <React.Fragment key={idx}>
                <circle className="m" cx={k.x} cy={k.y} r={k.r + 44} />
                <circle className="rg" cx={k.x} cy={k.y} r={k.r + 14} />
                <circle className="rg" cx={k.x} cy={k.y} r={k.r + 26} />
                <circle className="rg" cx={k.x} cy={k.y} r={k.r + 38} />
                <ellipse className="r" cx={k.x} cy={k.y} rx={k.r} ry={k.r * 0.78} />
                <ellipse
                  cx={k.x - k.r * 0.25}
                  cy={k.y - k.r * 0.3}
                  rx={k.r * 0.3}
                  ry={k.r * 0.12}
                  fill="#fff"
                  opacity={0.14}
                />
              </React.Fragment>
            ))}
            <circle
              cx={440}
              cy={130}
              r={66}
              fill="none"
              stroke="var(--ink)"
              strokeWidth={11}
              strokeLinecap="round"
              strokeDasharray="330 90"
              opacity={0.9}
              transform="rotate(-70 440 130)"
            />
            <circle cx={440} cy={130} r={30} fill="var(--shu)" />
          </svg>
        </div>
        <div className="scrollhint">
          CUỘN XUỐNG<br />↓
        </div>
      </section>

      {/* 2. SECTION TRIẾT LÝ NHẬN THỨC KINTSUGI (BÁT VỠ VÀ HÀN GẮN ĐƯỜNG VÀNG) */}
      <section className="dark-section" id="triet-ly">
        <div className="phil" style={{ maxWidth: 1120, margin: '0 auto', padding: '0 22px' }}>
          <div>
            <svg
              ref={bowlRef}
              className={`bowl ${isHealed ? 'healed' : ''}`}
              viewBox="-170 -170 340 340"
              role="img"
              aria-label="Chiếc bát vỡ được hàn gắn bằng vàng, Kintsugi"
              onClick={handleBowlClick}
            />
            <div className="hint">
              Chạm vào chiếc bát để nó vỡ lại và được hàn gắn lần nữa
            </div>
          </div>
          <div className="rv-item on">
            <div className="eyebrow">Triết lý nhận thức</div>
            <h2 style={{ color: '#EDE5D2', fontFamily: 'var(--font-mincho), serif' }}>
              Mỗi lần quên, là một <em>đường vàng</em>
            </h2>
            <div className="pt">
              <h3>
                金継ぎ<small>KINTSUGI</small>
              </h3>
              <p>
                Hàn gắn khuyết điểm bằng vàng. Mỗi lần quên rồi nhớ lại là một vết gãy được bọc vàng rực rỡ trong trí nhớ.
              </p>
            </div>
            <div className="pt">
              <h3>
                一期一会<small>ICHI-GO ICHI-E</small>
              </h3>
              <p>
                Trân quý từng khoảnh khắc. Mỗi chữ Hán học hôm nay là một nhân duyên sâu sắc trong hành trình tri thức của đời người.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. SECTION BẢN DOANH HONMARU DASHBOARD */}
      <section id="dashboard" style={{ maxWidth: 1120, margin: '0 auto', padding: '0 22px' }}>
        <div className="eyebrow rv-item on">本丸 · Honmaru Dashboard</div>
        <h2 className="rv-item on" style={{ fontFamily: 'var(--font-mincho), serif' }}>
          Bản doanh <em>trí nhớ</em> của bạn
        </h2>

        {/* BANNER DARUMA */}
        <div className="banner rv-item on">
          <svg width="112" height="112" viewBox="0 0 120 120" aria-label="Daruma">
            <circle cx="60" cy="64" r="50" fill="var(--shu)" />
            <ellipse cx="60" cy="56" rx="34" ry="26" fill="#F7F1E3" />
            <path d="M30 38q12-14 26-6M90 38q-12-14-26-6" stroke="#17130E" strokeWidth="5" fill="none" strokeLinecap="round" />
            <circle cx="46" cy="56" r="8" fill="#17130E" />
            <circle cx="74" cy="56" r="8" fill="none" stroke="#17130E" strokeWidth="2" strokeDasharray="3 3" />
            <path d="M42 82q18 10 36 0" stroke="#17130E" strokeWidth="4" fill="none" strokeLinecap="round" />
            <text x="60" y="104" textAnchor="middle" fontSize="14" fill="#F7F1E3" fontFamily="Yuji Boku, var(--font-mincho), serif">
              福
            </text>
          </svg>
          <div>
            <h3>Chào buổi sáng, Cassius!</h3>
            <p>
              Phiên củng cố trí nhớ dài hạn đã sẵn sàng. Daruma đã được điểm một mắt, hoàn thành 12 thẻ để điểm nốt mắt còn lại.
            </p>
          </div>
          <Link className="go" href="/review/dobai">
            <i>稽</i>DRILL NOW
          </Link>
        </div>

        {/* CỤM CHỈ SỐ THỐNG KÊ */}
        <div className="stats rv-item on">
          <div className="stat">
            <small>TỔNG THẺ</small>
            <b>676</b>
            <span>thẻ · ổn định</span>
            <div className="k">札</div>
          </div>
          <div className="stat">
            <small>ĐẾN HẠN HÔM NAY</small>
            <b style={{ color: 'var(--shu)' }}>12</b>
            <span>thẻ · ưu tiên</span>
            <div className="k">急</div>
          </div>
          <div className="stat">
            <small>MỤC TIÊU GHI NHỚ</small>
            <b>94%</b>
            <span>retention · FSRS v4.5</span>
            <div className="k">憶</div>
          </div>
          <div className="stat">
            <small>ĐỘ TRỄ BJORK</small>
            <b>1.4s</b>
            <span>phản xạ trung bình</span>
            <div className="k">速</div>
          </div>
        </div>

        {/* 2 CỘT: HÀNG ĐỢI ƯU TIÊN & DANH MỤC BỘ THẺ */}
        <div className="cols">
          <div className="panel rv-item on">
            <h3>HÀNG ĐỢI ÔN TẬP ƯU TIÊN</h3>
            <div className="q">
              <span className="n">壱</span>
              <div>
                <div className="w">曖昧<small>あいまい</small></div>
                <div className="e">Mơ hồ, không rõ ràng · Atamadaka [1]</div>
                <div className="s">S 4.2d · REPS 5</div>
              </div>
              <Link href="/review/dobai">Ôn thẻ</Link>
            </div>
            <div className="q">
              <span className="n">弐</span>
              <div>
                <div className="w">躊躇<small>ちゅうちょ</small></div>
                <div className="e">Do dự, chần chừ · Heiban [0]</div>
                <div className="s">S 6.8d · REPS 7</div>
              </div>
              <Link href="/review/dobai">Ôn thẻ</Link>
            </div>
            <div className="q">
              <span className="n">参</span>
              <div>
                <div className="w">木漏れ日<small>こもれび</small></div>
                <div className="e">Ánh nắng xuyên qua kẽ lá · Nakadaka [3]</div>
                <div className="s">S 12.1d · REPS 9</div>
              </div>
              <Link href="/review/dobai">Ôn thẻ</Link>
            </div>
            <div className="q">
              <span className="n">四</span>
              <div>
                <div className="w">一期一会<small>いちごいちえ</small></div>
                <div className="e">Đời người gặp một lần, quý trọng duyên</div>
                <div className="s">S 18.5d · REPS 11</div>
              </div>
              <Link href="/review/dobai">Ôn thẻ</Link>
            </div>
            <div className="q">
              <span className="n">五</span>
              <div>
                <div className="w">切磋琢磨<small>せっさたくま</small></div>
                <div className="e">Cùng nhau rèn giũa nâng cao thực lực</div>
                <div className="s">S 24.0d · REPS 14</div>
              </div>
              <Link href="/review/dobai">Ôn thẻ</Link>
            </div>
          </div>

          <div className="panel rv-item on">
            <h3>短冊帳 · DANH MỤC BỘ THẺ</h3>
            <div className="decks">
              <div className="tan">
                <i>語</i>
                <div>
                  JPD133 · Từ vựng Kotoba
                  <small>252 thẻ · 250 mới · 2 đã học</small>
                </div>
                <Link href="/cards">Bắt đầu</Link>
              </div>
              <div className="tan">
                <i>漢</i>
                <div>
                  JPD133 · Chữ Kanji
                  <small>232 thẻ · 232 đã học</small>
                </div>
                <Link href="/review">Ôn tập</Link>
              </div>
              <div className="tan">
                <i>五</i>
                <div>
                  JLPT N5 · Từ vựng cốt lõi
                  <small>78 thẻ · 78 mới</small>
                </div>
                <Link href="/review/dobai">Bắt đầu</Link>
              </div>
              <div className="tan">
                <i>文</i>
                <div>
                  JPD133 · Ngữ pháp Bunbou
                  <small>96 thẻ · 32 quy tắc · Unit 8 hoàn thành 8/8</small>
                </div>
                <Link href="/grammar">Luyện tập</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer>
        <div className="f">記憶道</div>
        Bản Doanh Nghệ Thuật Văn Hóa · Chọn các phân hệ phía trên để bắt đầu việc học
      </footer>
    </div>
  );
}
