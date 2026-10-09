'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

interface CardItem {
  k: string;
  r: string;
  v: string;
  e: string;
  ev: string;
  s: number;
  t: string;
}

const CARDS: CardItem[] = [
  { k: "父", r: "ちち", v: "bố (của mình)", e: "父は医者です。", ev: "Bố tôi là bác sĩ.", s: 1, t: "Gia đình" },
  { k: "母", r: "はは", v: "mẹ (của mình)", e: "母は先生です。", ev: "Mẹ tôi là giáo viên.", s: 1, t: "Gia đình" },
  { k: "兄", r: "あに", v: "anh trai (của mình)", e: "兄は会社員です。", ev: "Anh trai tôi là nhân viên công ty.", s: 1, t: "Gia đình" },
  { k: "貸す", r: "かす", v: "cho mượn", e: "友達に本を貸します。", ev: "Tôi cho bạn mượn sách.", s: 3, t: "Cho / Nhận" },
  { k: "趣味", r: "しゅみ", v: "sở thích", e: "趣味は音楽です。", ev: "Sở thích của tôi là âm nhạc.", s: 4, t: "Sở thích" },
  { k: "食べる", r: "たべる", v: "ăn", e: "朝ごはんを食べます。", ev: "Tôi ăn sáng.", s: 5, t: "Thể từ điển" },
  { k: "道", r: "みち", v: "con đường", e: "この道をまっすぐ行きます。", ev: "Đi thẳng con đường này.", s: 10, t: "Chỉ đường" },
];

const SL: Record<number, string> = { 0: "全", 1: "一", 3: "三", 4: "四", 5: "五", 10: "十" };

export default function DoBaiStandalonePage() {
  const [slot, setSlot] = useState<number>(0);
  const [mode, setMode] = useState<'fw' | 'rv'>('fw');
  const [st, setSt] = useState<{ q: CardItem[]; done: CardItem[]; debt: string[]; total: number }>({
    q: [],
    done: [],
    debt: [],
    total: 0,
  });
  const [rev, setRev] = useState(false);
  const [tEnd, setTEnd] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [hist, setHist] = useState<string[]>([]);
  const [stamp, setStamp] = useState<{ ok: boolean } | null>(null);
  const [timerText, setTimerText] = useState<string>('');
  const [timerPct, setTimerPct] = useState<number>(100);

  const t0Ref = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  const pool = useCallback(() => {
    return CARDS.filter(c => !slot || c.s === slot);
  }, [slot]);

  const grade = (s: number) => {
    return s < 1.5 ? "phản xạ tức thì (Easy)" : s <= 6 ? "nỗ lực vừa đủ (Good)" : "nhớ chậm (Hard)";
  };

  const start = useCallback(() => {
    const p = pool();
    setSt({
      q: [...p].sort(() => Math.random() - 0.5),
      done: [],
      debt: [],
      total: p.length,
    });
    setHist([]);
    setRev(false);
    setTEnd(null);
    setBusy(false);
    setStamp(null);
    t0Ref.current = performance.now();
  }, [pool]);

  useEffect(() => {
    start();
  }, [start]);

  // Bộ đếm thời gian phản xạ Bjork
  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (!st.q.length) return;

    if (tEnd !== null) {
      setTimerPct(Math.max(0, 1 - tEnd / 6) * 100);
      setTimerText(`Phản xạ ${tEnd.toFixed(1)}s, ${grade(tEnd)}`);
      return;
    }

    const loop = () => {
      const s = (performance.now() - t0Ref.current) / 1000;
      setTimerPct(Math.max(0, 1 - s / 6) * 100);
      setTimerText(`Đang đo độ trễ: ${s.toFixed(1)}s`);
      rafRef.current = requestAnimationFrame(loop);
    };

    loop();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [tEnd, rev, st.q]);

  const reveal = () => {
    if (rev || busy || !st.q.length) return;
    setRev(true);
    const elapsed = (performance.now() - t0Ref.current) / 1000;
    setTEnd(elapsed);
  };

  const speak = () => {
    const c = st.q[0];
    if (!c) return;
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance(c.r);
        u.lang = "ja-JP";
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
      }
    } catch {}
  };

  const answer = (ok: boolean) => {
    if (busy || !rev || !st.q.length) return;
    setBusy(true);
    setHist(prev => [...prev, JSON.stringify(st)]);
    setStamp({ ok });

    setTimeout(() => {
      setStamp(null);
      setSt(prev => {
        const nextQ = [...prev.q];
        const c = nextQ.shift();
        if (!c) return prev;

        let nextDebt = [...prev.debt];
        const nextDone = [...prev.done];

        if (ok) {
          nextDebt = nextDebt.filter(x => x !== c.k);
          nextDone.push(c);
        } else {
          if (!nextDebt.includes(c.k)) nextDebt.push(c.k);
          nextQ.splice(Math.min(2, nextQ.length), 0, c);
        }

        return { ...prev, q: nextQ, done: nextDone, debt: nextDebt };
      });

      setRev(false);
      setTEnd(null);
      setBusy(false);
      t0Ref.current = performance.now();
    }, ok ? 460 : 340);
  };

  const undo = () => {
    if (busy || !hist.length) return;
    const prev = JSON.parse(hist[hist.length - 1]);
    setHist(h => h.slice(0, -1));
    setSt(prev);
    setRev(false);
    setTEnd(null);
    setBusy(false);
    t0Ref.current = performance.now();
  };

  // Lắng nghe phím tắt bàn phím
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key;
      if (k === " ") {
        e.preventDefault();
        reveal();
      } else if (k === "Enter" || k === "1") {
        answer(true);
      } else if (k === "Backspace" || k === "2") {
        e.preventDefault();
        answer(false);
      } else if (k === "z" || k === "Z") {
        undo();
      } else if (k === "p" || k === "P") {
        speak();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const c = st.q[0];
  const n = st.done.length;
  const p = st.total ? n / st.total : 0;
  const fw = mode === "fw";

  return (
    <div className="dobai-standalone-wrap">
      <style jsx global>{`
        .dobai-standalone-wrap {
          min-height: 100vh;
          color: var(--ink);
          font-family: var(--font-maru), sans-serif;
          background-color: var(--ai, #16263A);
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='20'%3E%3Cg fill='none' stroke='%23fff' stroke-opacity='.06'%3E%3Ccircle cx='20' cy='20' r='18'/%3E%3Ccircle cx='20' cy='20' r='12'/%3E%3Ccircle cx='20' cy='20' r='6'/%3E%3Ccircle cx='0' cy='10' r='18'/%3E%3Ccircle cx='0' cy='10' r='12'/%3E%3Ccircle cx='0' cy='10' r='6'/%3E%3Ccircle cx='40' cy='10' r='18'/%3E%3Ccircle cx='40' cy='10' r='12'/%3E%3Ccircle cx='40' cy='10' r='6'/%3E%3C/g%3E%3C/svg%3E");
          padding-top: calc(74px + env(safe-area-inset-top, 0px));
          padding-bottom: 40px;
        }
        .dobai-standalone-wrap .wrap {
          max-width: 1100px;
          margin: 0 auto;
          padding: 18px 18px 40px;
        }
        .dobai-standalone-wrap .top {
          display: flex;
          flex-wrap: wrap;
          gap: 12px 20px;
          align-items: center;
          justify-content: space-between;
          color: #EDE5D2;
        }
        .dobai-standalone-wrap .brand {
          font: 400 1.7rem var(--brush), var(--font-mincho), serif;
          letter-spacing: .12em;
        }
        .dobai-standalone-wrap .brand small {
          font: 400 .8rem var(--font-maru), sans-serif;
          letter-spacing: 0;
          opacity: .7;
          margin-left: 8px;
        }
        .dobai-standalone-wrap .slots, .dobai-standalone-wrap .mode {
          display: flex;
          gap: 8px;
        }
        .dobai-standalone-wrap .slots {
          overflow-x: auto;
          padding: 2px;
        }
        .dobai-standalone-wrap .top button {
          flex: none;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: 1.5px solid rgba(237, 229, 210, .35);
          background: none;
          color: #EDE5D2;
          font: 400 1.35rem var(--brush), var(--font-mincho), serif;
          cursor: pointer;
        }
        .dobai-standalone-wrap .top button[aria-pressed=true] {
          background: var(--shu);
          border-color: var(--shu);
          color: #fff;
        }
        .dobai-standalone-wrap .board {
          display: grid;
          grid-template-columns: minmax(0, 72fr) minmax(0, 28fr);
          gap: 22px;
          margin-top: 22px;
        }
        @media (max-width: 980px) {
          .dobai-standalone-wrap .board { grid-template-columns: 1fr; }
        }
        .dobai-standalone-wrap .scroll {
          position: relative;
          background: var(--paper);
          background-image: repeating-linear-gradient(90deg, transparent 0 3px, rgba(120, 90, 50, .035) 3px 4px);
          padding: 42px 28px 34px;
          box-shadow: 0 18px 40px rgba(0, 0, 0, .35);
        }
        .dobai-standalone-wrap .roll {
          position: absolute;
          left: -10px;
          right: -10px;
          height: 18px;
          border-radius: 9px;
          background: linear-gradient(#7A5632, #4C331B 55%, #6A4A28);
          box-shadow: 0 3px 6px rgba(0, 0, 0, .35);
        }
        .dobai-standalone-wrap .roll.t { top: -9px; }
        .dobai-standalone-wrap .roll.b { bottom: -9px; }
        .dobai-standalone-wrap .meta {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          color: var(--sub);
          font-size: .85rem;
          margin-bottom: 6px;
        }
        .dobai-standalone-wrap .stage {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 22px;
          min-height: 340px;
        }
        @media (max-width: 640px) {
          .dobai-standalone-wrap .stage { grid-template-columns: 1fr; }
          .dobai-standalone-wrap .front { order: -1; }
          .dobai-standalone-wrap .scroll { padding: 36px 16px 28px; }
        }
        .dobai-standalone-wrap .front {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 300px;
        }
        .dobai-standalone-wrap .enso {
          position: absolute;
          width: min(300px, 90%);
          aspect-ratio: 1;
          transform: rotate(-100deg);
        }
        .dobai-standalone-wrap .enso circle {
          fill: none;
          stroke-linecap: round;
        }
        .dobai-standalone-wrap .enso .tr {
          stroke: var(--line);
          stroke-width: 3;
          opacity: .6;
        }
        .dobai-standalone-wrap .enso .pg {
          stroke: var(--ink);
          stroke-width: 7;
          stroke-dasharray: 289;
          transition: stroke-dashoffset .6s;
        }
        .dobai-standalone-wrap .kanji {
          writing-mode: vertical-rl;
          font: 700 4.4rem/1.15 var(--font-mincho), serif;
          position: relative;
        }
        .dobai-standalone-wrap .kanji rt {
          font: 500 1.05rem var(--font-maru), sans-serif;
          color: var(--sub);
        }
        .dobai-standalone-wrap .prompt {
          position: relative;
          text-align: center;
          font: 700 1.9rem/1.35 var(--font-maru), sans-serif;
          padding: 0 10px;
        }
        .dobai-standalone-wrap .prompt small {
          display: block;
          font: 400 .85rem var(--font-maru), sans-serif;
          color: var(--sub);
          margin-top: 8px;
        }
        .dobai-standalone-wrap .spk {
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          border: 1.5px solid var(--line);
          background: var(--paper);
          color: var(--ink);
          border-radius: 20px;
          padding: 5px 14px;
          font: 500 .8rem var(--font-maru), sans-serif;
          cursor: pointer;
        }
        .dobai-standalone-wrap .ans {
          position: relative;
          overflow: hidden;
          border: 1.5px solid var(--line);
          background: var(--paper2);
          padding: 22px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 8px;
          min-height: 300px;
        }
        .dobai-standalone-wrap .ans b { font: 700 1.3rem var(--font-maru), sans-serif; }
        .dobai-standalone-wrap .ans .jp { font: 500 1.1rem/1.6 var(--font-mincho), serif; }
        .dobai-standalone-wrap .ans p { margin: 0; color: var(--sub); font-size: .92rem; }
        .dobai-standalone-wrap .ans .big { font: 700 2.6rem var(--font-mincho), serif; text-align: center; }
        .dobai-standalone-wrap .ans .kn { text-align: center; font-size: 1.2rem; color: var(--sub); }
        .dobai-standalone-wrap .shoji {
          position: absolute;
          inset: 0;
          background-color: var(--paper);
          background-image: linear-gradient(var(--wood) 2px, transparent 2px), linear-gradient(90deg, var(--wood) 2px, transparent 2px);
          background-size: 100% 25%, 33.34% 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform .55s cubic-bezier(.7, 0, .2, 1);
        }
        .dobai-standalone-wrap .shoji span {
          background: var(--paper);
          border: 1px solid var(--line);
          padding: 10px 14px;
          margin: 0 22px;
          font-size: .88rem;
          text-align: center;
          color: var(--sub);
        }
        .dobai-standalone-wrap .ans.open .shoji { transform: translateX(-101%); }
        .dobai-standalone-wrap .inc {
          height: 4px;
          border-radius: 4px;
          background: var(--line);
          overflow: hidden;
          margin-top: 18px;
        }
        .dobai-standalone-wrap .inc i {
          display: block;
          height: 100%;
          background: var(--shu);
          transition: width .1s linear;
        }
        .dobai-standalone-wrap .tm {
          min-height: 1.5em;
          margin-top: 6px;
          font-size: .88rem;
          color: var(--sub);
        }
        .dobai-standalone-wrap .tm b { color: var(--ink); }
        .dobai-standalone-wrap .rv {
          width: 100%;
          margin-top: 6px;
          padding: 14px;
          border: 1.5px solid var(--ink);
          background: none;
          color: var(--ink);
          font: 700 1rem var(--font-maru), sans-serif;
          cursor: pointer;
        }
        .dobai-standalone-wrap .rv:hover {
          background: var(--ink);
          color: var(--paper);
        }
        .dobai-standalone-wrap .acts {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-top: 12px;
        }
        .dobai-standalone-wrap .acts button {
          min-height: 64px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          cursor: pointer;
          font: 700 1rem var(--font-maru), sans-serif;
          text-align: left;
          line-height: 1.25;
        }
        .dobai-standalone-wrap .acts i {
          font: 400 2rem var(--brush), var(--font-mincho), serif;
          font-style: normal;
        }
        .dobai-standalone-wrap .acts small {
          display: block;
          font: 400 .72rem var(--font-maru), sans-serif;
          opacity: .8;
        }
        .dobai-standalone-wrap .no {
          background: none;
          border: 1.5px solid var(--ink);
          color: var(--ink);
        }
        .dobai-standalone-wrap .ok {
          background: var(--shu);
          border: 1.5px solid var(--shu);
          color: #fff;
          border-radius: 3px;
          box-shadow: inset 0 0 0 3px var(--shu), inset 0 0 0 4px rgba(255, 255, 255, .55);
        }
        .dobai-standalone-wrap .acts button:disabled {
          opacity: .3;
          cursor: not-allowed;
        }
        .dobai-standalone-wrap .un {
          display: block;
          margin: 12px auto 0;
          border: 0;
          background: none;
          color: var(--sub);
          font: 500 .85rem var(--font-maru), sans-serif;
          text-decoration: underline;
          cursor: pointer;
        }
        .dobai-standalone-wrap .keys {
          margin-top: 10px;
          text-align: center;
          color: var(--sub);
          font-size: .78rem;
        }
        .dobai-standalone-wrap kbd {
          border: 1px solid var(--line);
          border-bottom-width: 2px;
          border-radius: 4px;
          padding: 0 5px;
          font: inherit;
        }
        .dobai-standalone-wrap .stamp {
          position: absolute;
          right: 14%;
          top: 26%;
          z-index: 5;
          width: 150px;
          height: 150px;
          border: 7px solid var(--shu);
          color: var(--shu);
          display: flex;
          align-items: center;
          justify-content: center;
          font: 400 6rem var(--brush), var(--font-mincho), serif;
          mix-blend-mode: multiply;
          animation: db_page_st .42s cubic-bezier(.2, 1.6, .4, 1) both;
          pointer-events: none;
        }
        .dobai-standalone-wrap .stamp.no {
          color: var(--sub);
          border-color: var(--sub);
          border-radius: 50%;
          background: none;
        }
        @keyframes db_page_st {
          from { transform: scale(2.3) rotate(0); opacity: 0; }
          to { transform: scale(1) rotate(-8deg); opacity: .92; }
        }
        .dobai-standalone-wrap .rail h2 {
          margin: 0 0 4px;
          color: #EDE5D2;
          font: 400 1.4rem var(--brush), var(--font-mincho), serif;
          letter-spacing: .1em;
        }
        .dobai-standalone-wrap .rail .sm {
          color: #EDE5D2;
          opacity: .65;
          font-size: .8rem;
        }
        .dobai-standalone-wrap .bar {
          height: 14px;
          border-radius: 7px;
          margin-top: 14px;
          background: linear-gradient(#93A25F, #56672F);
          box-shadow: 0 3px 6px rgba(0, 0, 0, .35);
        }
        .dobai-standalone-wrap .strips {
          display: flex;
          flex-wrap: wrap;
          gap: 10px 12px;
          padding: 0 6px;
        }
        .dobai-standalone-wrap .tan {
          position: relative;
          margin-top: 28px;
          width: 62px;
          min-height: 156px;
          background: #FBF6EA;
          border: 1px solid #D8CDB0;
          border-top: 7px solid var(--ai, #16263A);
          padding: 10px 4px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          color: #17140F;
          animation: db_page_sw .8s ease-out both;
          transform-origin: 50% -28px;
        }
        .dobai-standalone-wrap .tan::before {
          content: "";
          position: absolute;
          left: 50%;
          top: -29px;
          height: 22px;
          border-left: 1.5px solid #8a7447;
        }
        .dobai-standalone-wrap .tan .t {
          writing-mode: vertical-rl;
          font: 700 1.25rem/1.2 var(--font-mincho), serif;
        }
        .dobai-standalone-wrap .tan .n {
          font-size: .68rem;
          color: var(--shu);
          text-align: center;
          line-height: 1.2;
        }
        .dobai-standalone-wrap .tan .v {
          font-size: .68rem;
          color: #6E6454;
          text-align: center;
          line-height: 1.2;
        }
        @keyframes db_page_sw {
          0% { transform: rotate(-14deg); }
          50% { transform: rotate(7deg); }
          100% { transform: rotate(0); }
        }
        .dobai-standalone-wrap .emp {
          color: #EDE5D2;
          opacity: .6;
          font-size: .85rem;
          padding: 24px 4px 0;
        }
        .dobai-standalone-wrap .done {
          text-align: center;
          padding: 50px 10px;
          color: var(--ink);
        }
        .dobai-standalone-wrap .done .e {
          font: 400 6rem var(--brush), var(--font-mincho), serif;
          color: var(--shu);
        }
        .dobai-standalone-wrap .done h2 {
          font: 700 1.5rem var(--font-mincho), serif;
          margin: 6px 0;
        }
        .dobai-standalone-wrap .done button {
          margin-top: 14px;
          padding: 12px 24px;
          border: 1.5px solid var(--ink);
          background: none;
          color: var(--ink);
          font: 700 1rem var(--font-maru), sans-serif;
          cursor: pointer;
        }
      `}</style>

      <div className="wrap">
        <div className="top">
          <div className="brand">
            復習<small>Dò bài · JPD133</small>
          </div>
          <div className="slots" aria-label="Lọc theo Slot">
            {Object.keys(SL).map(k => (
              <button
                key={k}
                aria-pressed={Number(k) === slot}
                title={Number(k) ? `Slot ${k}` : "Tất cả Slot"}
                onClick={() => setSlot(Number(k))}
              >
                {SL[Number(k)]}
              </button>
            ))}
          </div>
          <div className="mode">
            <button
              title="Dò thuận: Nhật → Việt"
              aria-pressed={fw}
              onClick={() => setMode('fw')}
            >
              順
            </button>
            <button
              title="Dò nghịch: Việt → Nhật"
              aria-pressed={!fw}
              onClick={() => setMode('rv')}
            >
              逆
            </button>
          </div>
        </div>

        <div className="board">
          <main className="scroll">
            <div className="roll t" />
            <div className="roll b" />

            {stamp && (
              <div className={`stamp ${stamp.ok ? '' : 'no'}`}>
                {stamp.ok ? '覚' : '未'}
              </div>
            )}

            {!c ? (
              <div className="done">
                <div className="e">完</div>
                <h2>Hoàn thành phiên dò bài</h2>
                <p style={{ color: "var(--sub)", margin: 0 }}>
                  Bạn đã thuộc {st.total} từ.
                </p>
                <button onClick={start}>Dò lại từ đầu</button>
              </div>
            ) : (
              <>
                <div className="meta">
                  <span>Slot {c.s} · {c.t}</span>
                  <span>{n + 1} / {st.total}</span>
                </div>

                <div className="stage">
                  <div className={`ans ${rev ? 'open' : ''}`}>
                    {fw ? (
                      <>
                        <b>{c.v}</b>
                        <p>Ví dụ</p>
                        <div className="jp">{c.e}</div>
                        <p>{c.ev}</p>
                      </>
                    ) : (
                      <>
                        <div className="big">{c.k}</div>
                        <div className="kn">{c.r}</div>
                        <div className="jp" style={{ textAlign: "center" }}>{c.e}</div>
                      </>
                    )}
                    <div className="shoji">
                      <span>
                        {fw ? "Nhẩm nghĩa trong đầu, rồi bấm Space để mở cửa" : "Tự nhẩm Kanji và cách đọc, rồi bấm Space"}
                      </span>
                    </div>
                  </div>

                  <div className="front">
                    <svg className="enso" viewBox="0 0 120 120">
                      <circle className="tr" cx="60" cy="60" r="46" />
                      <circle
                        className="pg"
                        cx="60"
                        cy="60"
                        r="46"
                        style={{ strokeDashoffset: 289 * (1 - p) }}
                      />
                    </svg>

                    {fw ? (
                      <>
                        <ruby className="kanji">
                          {c.k}
                          <rt>{c.r}</rt>
                        </ruby>
                        <button className="spk" onClick={speak}>
                          🔊 Nghe (P)
                        </button>
                      </>
                    ) : (
                      <div className="prompt">
                        {c.v}
                        <small>Gợi ý: {c.t}</small>
                      </div>
                    )}
                  </div>
                </div>

                <div className="inc">
                  <i style={{ width: `${timerPct}%` }} />
                </div>
                <div className="tm" dangerouslySetInnerHTML={{ __html: timerText }} />

                {!rev ? (
                  <button className="rv" onClick={reveal}>
                    開く · {fw ? "Hiện nghĩa" : "Hiện đáp án"} (Space)
                  </button>
                ) : null}

                <div className="acts">
                  <button className="no" disabled={!rev} onClick={() => answer(false)}>
                    <i>未</i>
                    <span>
                      Chưa thuộc
                      <small>Backspace / 2 · bốc lại sau 2 từ</small>
                    </span>
                  </button>
                  <button className="ok" disabled={!rev} onClick={() => answer(true)}>
                    <i>覚</i>
                    <span>
                      Đã thuộc
                      <small>Enter / 1 · tăng stability</small>
                    </span>
                  </button>
                </div>

                <button className="un" disabled={!hist.length} onClick={undo}>
                  ↩ Hoàn tác (Z)
                </button>

                <div className="keys">
                  <kbd>Space</kbd> hiện · <kbd>Enter</kbd> thuộc · <kbd>Backspace</kbd> chưa thuộc · <kbd>Z</kbd> hoàn tác · <kbd>P</kbd> phát âm
                </div>
              </>
            )}
          </main>

          <aside className="rail">
            <h2>短冊</h2>
            <div className="sm">
              {st.debt.length
                ? `Còn nợ ${st.debt.length} từ. Thuộc hết mới hoàn thành.`
                : "Từ đang nợ, sẽ quay lại trong phiên"}
            </div>
            <div className="bar" />
            <div className="strips">
              {st.debt.length ? (
                st.debt.map(k => {
                  const x = CARDS.find(z => z.k === k);
                  if (!x) return null;
                  const idx = st.q.findIndex(z => z.k === k);
                  return (
                    <div key={k} className="tan">
                      <div className="t">{x.k}</div>
                      <div className="v">{x.v}</div>
                      <div className="n">{idx > 0 ? `sau ${idx} từ` : "đang dò"}</div>
                    </div>
                  );
                })
              ) : (
                <div className="emp">
                  Chưa có từ nợ. Bấm “Chưa thuộc”, tờ giấy sẽ treo ở đây.
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
