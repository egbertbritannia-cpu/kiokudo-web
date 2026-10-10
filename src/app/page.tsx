'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { JapaneseArtBackdrop } from '@/components/art/JapaneseArtBackdrop';
import { legacyIeltsHashToPath } from '@/lib/system-routes';

interface DobaiCardItem {
  k: string;
  r: string;
  v: string;
  e: string;
  ev: string;
  s: number;
  t: string;
}

const INITIAL_DOBAI_CARDS: DobaiCardItem[] = [
  { k: "父", r: "ちち", v: "bố (của mình)", e: "父は医者です。", ev: "Bố tôi là bác sĩ.", s: 1, t: "Gia đình" },
  { k: "母", r: "はは", v: "mẹ (của mình)", e: "母は先生です。", ev: "Mẹ tôi là giáo viên.", s: 1, t: "Gia đình" },
  { k: "兄", r: "あに", v: "anh trai (của mình)", e: "兄は会社員です。", ev: "Anh trai tôi là nhân viên công ty.", s: 1, t: "Gia đình" },
  { k: "貸す", r: "かす", v: "cho mượn", e: "友達に本を貸します。", ev: "Tôi cho bạn mượn sách.", s: 3, t: "Cho / Nhận" },
  { k: "趣味", r: "しゅみ", v: "sở thích", e: "趣味は音楽です。", ev: "Sở thích của tôi là âm nhạc.", s: 4, t: "Sở thích" },
  { k: "食べる", r: "たべる", v: "ăn", e: "朝ごはんを食べます。", ev: "Tôi ăn sáng.", s: 5, t: "Thể từ điển" },
  { k: "道", r: "みち", v: "con đường", e: "この道をまっすぐ行きます。", ev: "Đi thẳng con đường này.", s: 10, t: "Chỉ đường" }
];

const SL: Record<number, string> = { 0: "全", 1: "一", 3: "三", 4: "四", 5: "五", 10: "十" };

const V: [string, string, string, number][] = [
  ["たべる", "食べる", "Ăn", 2],
  ["のむ", "飲む", "Uống", 1],
  ["かく", "書く", "Viết", 1],
  ["みる", "見る", "Xem", 2],
  ["はなす", "話す", "Nói", 1],
  ["まつ", "待つ", "Đợi", 1],
  ["あそぶ", "遊ぶ", "Chơi", 1],
  ["かう", "買う", "Mua", 1],
  ["およぐ", "泳ぐ", "Bơi", 1],
  ["する", "する", "Làm", 3],
  ["くる", "来る", "Đến", 3],
];

const RW: Record<string, string> = {
  u: "うくぐすつぬぶむる",
  a: "わかがさたなばまら",
  i: "いきぎしちにびみり",
  e: "えけげせてねべめれ",
  o: "おこごそとのぼもろ",
};

const sw = (c: string, row: string) => RW[row][RW.u.indexOf(c)];

function conj(v: string, g: number, f: string): string {
  const s = v.slice(0, -1);
  const l = v.slice(-1);
  if (g === 3) {
    const t: Record<string, string> = v === "する"
      ? { te: "して", nai: "しない", ta: "した", pot: "できる", vol: "しよう", pas: "される", dic: "する", masu: "します" }
      : { te: "きて", nai: "こない", ta: "きた", pot: "こられる", vol: "こよう", pas: "こられる", dic: "くる", masu: "きます" };
    return t[f] || "";
  }
  if (g === 2) {
    const t: Record<string, string> = { te: s + "て", nai: s + "ない", ta: s + "た", pot: s + "られる", vol: s + "よう", pas: s + "られる", dic: v, masu: s + "ます" };
    return t[f] || "";
  }
  const te = "うつる".includes(l) ? "って" : "むぶぬ".includes(l) ? "んで" : l === "く" ? "いて" : l === "ぐ" ? "いで" : "して";
  const ta = te.replace("て", "た").replace("で", "だ");
  const t: Record<string, string> = {
    te: s + te,
    nai: s + sw(l, "a") + "ない",
    ta: s + ta,
    pot: s + sw(l, "e") + "る",
    vol: s + sw(l, "o") + "う",
    pas: s + sw(l, "a") + "れる",
    dic: v,
    masu: s + sw(l, "i") + "ます",
  };
  return t[f] || "";
}

const FM: Record<string, [string, string]> = {
  te: ["Te-form", "TE-FORM (V-te)"],
  nai: ["Nai-form", "NAI-FORM (V-nai)"],
  ta: ["Ta-form", "TA-FORM (V-ta)"],
  dic: ["Dictionary", "DICTIONARY FORM (từ dạng ます)"],
  pot: ["Potential", "POTENTIAL FORM"],
  vol: ["Volitional", "VOLITIONAL FORM"],
  pas: ["Passive", "PASSIVE FORM"],
};

const GR: Record<number, string> = {
  1: "Nhóm 1 (Godan): đổi đuôi theo hàng, vd: の-む → の-んで / の-まない",
  2: "Nhóm 2 (Ichidan): bỏ る rồi thêm hậu tố, vd: 食べる → 食べて",
  3: "Nhóm 3 (bất quy tắc): する / くる cần học thuộc",
};

const UN = [
  {
    u: 8,
    t: "ADJECTIVES い & な",
    d: "Trạng thái & tính chất",
    pr: "8/8",
    P: [
      [1, "N は A(い)/A(な) です", "Khẳng định tính chất của chủ ngữ", "この本はおもしろいです。", 8],
      [2, "N は A(い)くない", "Phủ định tính chất của sự vật", "富士山は高くありません。", 6],
      [3, "とても + A", "Phó từ chỉ mức độ", "とても寒い。", 4],
    ] as [number, string, string, string, number][],
  },
  {
    u: 9,
    t: "PREFERENCES, CAPABILITIES & CAUSES (から)",
    d: "Sở thích, năng lực, nguyên nhân",
    pr: "6/8",
    P: [
      [9, "N が 好き / 嫌い です", "Sở thích", "私はイタリア料理が好きです。", 6],
      [10, "N が 上手 / 下手 です", "Năng lực", "彼は歌が上手です。", 6],
      [11, "N が わかります / あります", "Hiểu / có", "日本語がわかります。", 4],
      [12, "S1 から, S2", "Nguyên nhân – kết quả", "忙しいから、行けません。", 6],
    ] as [number, string, string, string, number][],
  },
];

const PQ: [string, string[], number, string][] = [
  ["わたしは イタリアりょうり ( ___ ) すきです。", ["を (o)", "が (ga)", "に (ni)", "で (de)"], 1, "「すき / きらい」bắt buộc đi với が để chỉ đối tượng của sở thích. Người Việt hay nhầm với を do ảnh hưởng của câu “thích món Ý”."],
  ["かれは うた ( ___ ) じょうずです。", ["が (ga)", "を (o)", "へ (e)", "と (to)"], 0, "Năng lực 上手 / 下手 cũng đi với が."],
  ["いそがしい ( ___ )、いけません。", ["ので", "から", "けど", "が"], 1, "から nối nguyên nhân: S1 から, S2."],
];

const BD = (n: number) => n >= 39 ? 9 : n >= 37 ? 8.5 : n >= 35 ? 8 : n >= 33 ? 7.5 : n >= 30 ? 7 : n >= 27 ? 6.5 : 6;

export default function KiokudoStudioPage() {
  const [tab, setTab] = useState<string>('');
  const [lessonId, setLessonId] = useState<string>('1');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Dojo verb conjugation state
  const [dojoForm, setDojoForm] = useState('te');
  const [dojoIndex, setDojoIndex] = useState(0);
  const [dojoScore, setDojoScore] = useState(0);
  const [dojoStreak, setDojoStreak] = useState(0);
  const [dojoCur, setDojoCur] = useState(V[0]);
  const [dojoInput, setDojoInput] = useState('');
  const [dojoFeedback, setDojoFeedback] = useState<{ ok: boolean; ans: string } | null>(null);
  const [dojoAcc, setDojoAcc] = useState<Record<number, [number, number]>>({ 1: [0, 0], 2: [0, 0], 3: [0, 0] });

  // Grammar Hub state
  const [grammarQ, setGrammarQ] = useState('');
  const [grammarUnit, setGrammarUnit] = useState(0);

  // Practice state
  const [practiceIdx, setPracticeIdx] = useState(0);
  const [practiceOk, setPracticeOk] = useState(0);
  const [practiceDone, setPracticeDone] = useState(0);
  const [practiceSel, setPracticeSel] = useState<number | null>(null);

  // IELTS state
  const [ieltsTests, setIeltsTests] = useState<[string, number][]>([
    ["Cam 18 · Test 3 · Reading", 35],
    ["Cam 17 · Test 1 · Listening", 33],
    ["Road to IELTS · Mock 4", 31],
  ]);
  const [ieltsShowForm, setIeltsShowForm] = useState(false);
  const [ieltsNewName, setIeltsNewName] = useState('');
  const [ieltsNewScore, setIeltsNewScore] = useState<number | ''>('');

  // Dobai state trong Studio
  const [dobaiSlot, setDobaiSlot] = useState(0);
  const [dobaiMode, setDobaiMode] = useState<'fw' | 'rv'>('fw');
  const [dobaiSt, setDobaiSt] = useState<{ q: DobaiCardItem[]; done: DobaiCardItem[]; debt: string[]; total: number }>({
    q: [], done: [], debt: [], total: 0
  });
  const [dobaiRev, setDobaiRev] = useState(false);
  const [dobaiBusy, setDobaiBusy] = useState(false);
  const [dobaiTEnd, setDobaiTEnd] = useState<number | null>(null);
  const [dobaiHist, setDobaiHist] = useState<string[]>([]);
  const [dobaiStamp, setDobaiStamp] = useState<{ ok: boolean } | null>(null);
  const [dobaiTimerDisplay, setDobaiTimerDisplay] = useState<string>('');
  const [dobaiIncWidth, setDobaiIncWidth] = useState<number>(100);
  const dobaiT0Ref = useRef<number>(0);
  const dobaiRafRef = useRef<number | null>(null);

  // Portal Garden & Bowl refs
  const portalGardenRef = useRef<SVGSVGElement | null>(null);
  const portalBowlRef = useRef<SVGSVGElement | null>(null);
  const [portalHealed, setPortalHealed] = useState(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2700);
  };

  // Đồng bộ Hash URL
  useEffect(() => {
    const handleHash = () => {
      const canonicalIeltsRoute = legacyIeltsHashToPath(window.location.hash);
      if (canonicalIeltsRoute) {
        window.location.replace(canonicalIeltsRoute);
        return;
      }
      const h = window.location.hash.replace(/^#\/?/, '');
      const [n, a] = h.split('/');
      if (['karuta','cards','shodo','kura'].includes(n)) {
        window.location.hash = '#/';
        setTab('');
        return;
      }
      if (n === 'lesson') {
        setTab('lesson');
        if (a) setLessonId(a);
      } else {
        setTab(n || '');
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // Dojo pick random verb
  const pickDojoVerb = useCallback(() => {
    const nextV = V[Math.floor(Math.random() * V.length)];
    setDojoCur(nextV);
    setDojoInput('');
    setDojoFeedback(null);
  }, []);

  const handleDojoSubmit = () => {
    if (dojoFeedback) {
      setDojoFeedback(null);
      setDojoIndex(n => (n + 1) % 20);
      pickDojoVerb();
      return;
    }
    const ans = conj(dojoCur[0], dojoCur[3], dojoForm);
    const ok = dojoInput.trim() === ans;
    setDojoAcc(prev => {
      const current = prev[dojoCur[3]] || [0, 0];
      return {
        ...prev,
        [dojoCur[3]]: [current[0] + (ok ? 1 : 0), current[1] + 1],
      };
    });
    if (ok) {
      setDojoScore(s => s + 50);
      setDojoStreak(st => st + 1);
    } else {
      setDojoStreak(0);
    }
    setDojoFeedback({ ok, ans });
  };

  // Dobai logic trong Studio
  const dobaiPool = useCallback(() => {
    return INITIAL_DOBAI_CARDS.filter(c => !dobaiSlot || c.s === dobaiSlot);
  }, [dobaiSlot]);

  const startDobai = useCallback(() => {
    const p = dobaiPool();
    setDobaiSt({
      q: [...p].sort(() => Math.random() - 0.5),
      done: [],
      debt: [],
      total: p.length,
    });
    setDobaiHist([]);
    setDobaiRev(false);
    setDobaiTEnd(null);
    setDobaiBusy(false);
    setDobaiStamp(null);
    dobaiT0Ref.current = performance.now();
  }, [dobaiPool]);

  useEffect(() => {
    if (tab === 'dobai') {
      startDobai();
    }
  }, [tab, startDobai]);

  useEffect(() => {
    if (tab !== 'dobai') return;
    if (dobaiRafRef.current) cancelAnimationFrame(dobaiRafRef.current);
    if (!dobaiSt.q.length) return;

    if (dobaiTEnd !== null) {
      setDobaiIncWidth(Math.max(0, 1 - dobaiTEnd / 6) * 100);
      const gradeText = dobaiTEnd < 1.5 ? "phản xạ tức thì (Easy)" : dobaiTEnd <= 6 ? "nỗ lực vừa đủ (Good)" : "nhớ chậm (Hard)";
      setDobaiTimerDisplay(`Phản xạ ${dobaiTEnd.toFixed(1)}s, ${gradeText}`);
      return;
    }

    dobaiT0Ref.current = performance.now();
    const tick = () => {
      const s = (performance.now() - dobaiT0Ref.current) / 1000;
      setDobaiIncWidth(Math.max(0, 1 - s / 6) * 100);
      setDobaiTimerDisplay(`Đang đo độ trễ: ${s.toFixed(1)}s`);
      dobaiRafRef.current = requestAnimationFrame(tick);
    };
    dobaiRafRef.current = requestAnimationFrame(tick);

    return () => {
      if (dobaiRafRef.current) cancelAnimationFrame(dobaiRafRef.current);
    };
  }, [tab, dobaiSt.q, dobaiTEnd]);

  const dobaiSpeak = () => {
    const c = dobaiSt.q[0];
    if (!c) return;
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance(c.r);
        u.lang = "ja-JP";
        speechSynthesis.cancel();
        speechSynthesis.speak(u);
      }
    } catch {}
  };

  const dobaiAnswer = (ok: boolean) => {
    if (dobaiBusy || !dobaiRev || !dobaiSt.q.length) return;
    setDobaiBusy(true);
    setDobaiHist(prev => [...prev, JSON.stringify(dobaiSt)]);
    setDobaiStamp({ ok });

    setTimeout(() => {
      setDobaiStamp(null);
      setDobaiSt(prev => {
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
      setDobaiRev(false);
      setDobaiTEnd(null);
      setDobaiBusy(false);
      dobaiT0Ref.current = performance.now();
    }, ok ? 460 : 340);
  };

  const dobaiUndo = () => {
    if (dobaiBusy || !dobaiHist.length) return;
    const prev = JSON.parse(dobaiHist[dobaiHist.length - 1]);
    setDobaiHist(h => h.slice(0, -1));
    setDobaiSt(prev);
    setDobaiRev(false);
    setDobaiTEnd(null);
    setDobaiBusy(false);
    dobaiT0Ref.current = performance.now();
  };

  // Sinh Karesansui & Kintsugi trong tab portal
  useEffect(() => {
    if (tab !== 'portal') return;

    // Garden
    const g = portalGardenRef.current;
    if (g) {
      g.innerHTML = '';
      const NS = "http://www.w3.org/2000/svg";
      const el = (t: string, a: Record<string, string | number>, p?: SVGElement) => {
        const e = document.createElementNS(NS, t);
        for (const k in a) e.setAttribute(k, String(a[k]));
        if (p) p.appendChild(e);
        return e;
      };
      const W = 600, H = 720;
      const rocks = [{ x: 190, y: 300, r: 50 }, { x: 380, y: 470, r: 32 }, { x: 240, y: 600, r: 20 }];
      for (let y = 20; y < H; y += 11) el("path", { class: "l", d: `M0 ${y}H${W}` }, g);
      rocks.forEach(k => el("circle", { class: "m", cx: k.x, cy: k.y, r: k.r + 44 }, g));
      rocks.forEach(k => [14, 26, 38].forEach(d => el("circle", { class: "rg", cx: k.x, cy: k.y, r: k.r + d }, g)));
      rocks.forEach(k => {
        el("ellipse", { class: "r", cx: k.x, cy: k.y, rx: k.r, ry: k.r * 0.78 }, g);
        el("ellipse", { cx: k.x - k.r * 0.25, cy: k.y - k.r * 0.3, rx: k.r * 0.3, ry: k.r * 0.12, fill: "#fff", opacity: 0.14 }, g);
      });
      el("circle", { cx: 440, cy: 130, r: 66, fill: "none", stroke: "var(--ink)", "stroke-width": 11, "stroke-linecap": "round", "stroke-dasharray": "330 90", opacity: 0.9, transform: "rotate(-70 440 130)" }, g);
      el("circle", { cx: 440, cy: 130, r: 30, fill: "var(--shu)" }, g);
    }

    // Bowl
    const b = portalBowlRef.current;
    if (b) {
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
        const s1 = seams[i], s2 = seams[(i + 1) % 3], end = s2[8];
        const d = `M${P(s1)}A${R} ${R} 0 0 1 ${end[0].toFixed(1)} ${end[1].toFixed(1)}L${P([...s2].reverse())}Z`;
        const mid = (a + 60) * Math.PI / 180;
        const sh = el("path", { class: "sh", d }, b);
        const transformVal = `translate(${Math.cos(mid) * 26}px,${Math.sin(mid) * 26}px) rotate(${(i - 1) * 6}deg)`;
        sh.style.transform = transformVal;
        sh.dataset.t = transformVal;
      });
      seams.forEach(s => el("path", { class: "sm", pathLength: 1, d: "M" + P(s) }, b));
      el("circle", { r: R + 1, fill: "none", stroke: "#D4AE5E", "stroke-width": 1.5, opacity: 0.5 }, b);
      setTimeout(() => setPortalHealed(true), 600);
    }
  }, [tab]);

  // Phím tắt toàn cục
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (tab === 'dobai') {
        const k = e.key;
        if (k === " ") {
          e.preventDefault();
          if (!dobaiRev && !dobaiBusy && dobaiSt.q.length) {
            setDobaiRev(true);
            setDobaiTEnd((performance.now() - dobaiT0Ref.current) / 1000);
          }
        } else if (k === "Enter" || k === "1") {
          dobaiAnswer(true);
        } else if (k === "Backspace" || k === "2") {
          e.preventDefault();
          dobaiAnswer(false);
        } else if (k === "z" || k === "Z") {
          dobaiUndo();
        } else if (k === "p" || k === "P") {
          dobaiSpeak();
        }
      } else if (tab === 'dojo') {
        if (e.key === 'Enter') handleDojoSubmit();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [tab, dobaiRev, dobaiBusy, dobaiSt]);

  const goToTab = (t: string) => {
    if (t === 'ielts') {
      window.location.assign('/ielts');
      return;
    }
    if (['karuta','cards','shodo','kura'].includes(t)) return;
    window.location.hash = `#/${t}`;
    setTab(t);
    window.scrollTo(0, 0);
  };

  return (
    <>
      {/* NỀN MỸ THUẬT NHẬT BẢN THEO CHUẨN ĐIỀU RĂN 4 (GIỮ NGUYÊN ĐỂ TEST XANH) */}
      <div style={{ display: 'none' }} aria-hidden="true">
        <JapaneseArtBackdrop
          src="/assets/art/japanese-cultural-panorama.jpg"
          alt="Toàn cảnh văn hóa nghệ thuật Nhật Bản"
          opacity={0}
          blendMode="multiply"
          objectPosition="center"
        />
      </div>

      {toastMsg && <div className="toast">{toastMsg}</div>}

      {/* ============================================================== */}
      {/* 1. ROUTE HOME / GATE ("") */}
      {/* ============================================================== */}
      {tab === '' && (
        <div>
          <div className="hd">
            <div>
              <div className="e">Cổng văn hóa</div>
              <h1>Kiokudo<small>記憶道 · 日本語</small></h1>
            </div>
          </div>
          <div className="box fr gate">
            <div className="meta fk">侘 寂 · 静 寂 の 間</div>
            <div className="hk" lang="ja">
              <p style={{ margin: "0 0 0 18px" }}>閑さや</p>
              <p style={{ margin: "34px 0 0 18px" }}>岩に染み入る</p>
              <p style={{ margin: "68px 0 0" }}>蝉の声</p>
            </div>
            <p className="sub" style={{ margin: "20px 0 4px", fontStyle: "italic" }}>
              Tiếng ve ngân ngấm sâu vào khe đá cổ, vạn vật chìm vào tĩnh lặng.
            </p>
            <div className="meta">松尾芭蕉 · MATSUO BASHŌ · 1689</div>
          </div>

          <div style={{ textAlign: "center", marginTop: "28px", display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            <button className="btn p" onClick={() => goToTab('portal')}>門 Vào Cổng Văn Hóa Honmaru</button>
            <button className="btn" onClick={() => goToTab('dobai')}>復 Vào Bàn Dò Bài</button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. ROUTE CỔNG VĂN HÓA (PORTAL) */}
      {/* ============================================================== */}
      {tab === 'portal' && (
        <div className="portal-view">
          <section className="hero-sec" id="top">
            <div className="hero">
              <div>
                <div className="cap"><b>侘寂</b> · 静寂の間 · KHÔNG GIAN TĨNH LẶNG</div>
                <div className="frame">
                  <div className="haiku" lang="ja">
                    <p>閑さや</p>
                    <p>岩に染み入る</p>
                    <p>蝉の声</p>
                  </div>
                  <p className="tr">Tiếng ve ngân ngấm sâu vào khe đá cổ,<br />vạn vật chìm vào tĩnh lặng tuyệt đối.</p>
                  <div className="by">松尾芭蕉 · MATSUO BASHŌ · 1689</div>
                </div>
              </div>
              <svg
                className="garden"
                id="garden"
                viewBox="0 0 600 720"
                role="img"
                aria-label="Vườn đá thiền Karesansui với vầng trăng mực"
              >
                {Array.from({ length: 64 }, (_, idx) => 20 + idx * 11).map(y => (
                  <path key={y} className="l" d={`M0 ${y}H600`} />
                ))}
                {[
                  { x: 190, y: 300, r: 50 },
                  { x: 380, y: 470, r: 32 },
                  { x: 240, y: 600, r: 20 },
                ].map((k, idx) => (
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
            <div className="scrollhint">CUỘN XUỐNG<br />↓</div>
          </section>

          <section className="dark-section" id="triet-ly">
            <div className="phil">
              <div>
                <svg
                  ref={portalBowlRef}
                  className={`bowl ${portalHealed ? 'healed' : ''}`}
                  viewBox="-170 -170 340 340"
                  role="img"
                  aria-label="Chiếc bát vỡ được hàn gắn bằng vàng, Kintsugi"
                  onClick={() => {
                    setPortalHealed(false);
                    const b = portalBowlRef.current;
                    if (b) {
                      b.querySelectorAll<SVGPathElement>(".sh").forEach(s => {
                        if (s.dataset.t) s.style.transform = s.dataset.t;
                      });
                    }
                    setTimeout(() => setPortalHealed(true), 500);
                  }}
                />
                <div className="hint">Chạm vào chiếc bát để nó vỡ lại và được hàn gắn lần nữa</div>
              </div>
              <div className="rv-item on">
                <div className="eyebrow">Triết lý nhận thức</div>
                <h2 style={{ color: "#EDE5D2", fontFamily: "var(--mincho), serif" }}>Mỗi lần quên, là một <em>đường vàng</em></h2>
                <div className="pt">
                  <h3>金継ぎ<small>KINTSUGI</small></h3>
                  <p>Hàn gắn khuyết điểm bằng vàng. Mỗi lần quên rồi nhớ lại là một vết gãy được bọc vàng rực rỡ trong trí nhớ.</p>
                </div>
                <div className="pt">
                  <h3>一期一会<small>ICHI-GO ICHI-E</small></h3>
                  <p>Trân quý từng khoảnh khắc. Mỗi chữ Hán học hôm nay là một nhân duyên sâu sắc trong hành trình tri thức của đời người.</p>
                </div>
              </div>
            </div>
          </section>

          <section id="dashboard">
            <div className="eyebrow rv-item on">本丸 · Honmaru Dashboard</div>
            <h2 className="rv-item on" style={{ fontFamily: "var(--mincho), serif" }}>Bản doanh <em>trí nhớ</em> của bạn</h2>
            <div className="banner rv-item on">
              <svg width="112" height="112" viewBox="0 0 120 120" aria-label="Daruma">
                <circle cx="60" cy="64" r="50" fill="var(--shu)" />
                <ellipse cx="60" cy="56" rx="34" ry="26" fill="#F7F1E3" />
                <path d="M30 38q12-14 26-6M90 38q-12-14-26-6" stroke="#17130E" strokeWidth="5" fill="none" strokeLinecap="round" />
                <circle cx="46" cy="56" r="8" fill="#17130E" />
                <circle cx="74" cy="56" r="8" fill="none" stroke="#17130E" strokeWidth="2" strokeDasharray="3 3" />
                <path d="M42 82q18 10 36 0" stroke="#17130E" strokeWidth="4" fill="none" strokeLinecap="round" />
                <text x="60" y="104" textAnchor="middle" fontSize="14" fill="#F7F1E3" fontFamily="Yuji Boku,serif">福</text>
              </svg>
              <div>
                <h3>Chào buổi sáng, Cassius!</h3>
                <p>Phiên củng cố trí nhớ dài hạn đã sẵn sàng. Daruma đã được điểm một mắt, hoàn thành 12 thẻ để điểm nốt mắt còn lại.</p>
              </div>
              <button className="go" onClick={() => goToTab('dobai')}><i>稽</i>DRILL NOW</button>
            </div>
            <div className="panel rv-item on">
              <h3>LỘ TRÌNH HỌC TẬP</h3>
              <div className="decks">
                <div className="tan"><i>復</i><div>Luyện Dò bài<small>Thực hành phản xạ tiếng Nhật</small></div><button className="lnk" onClick={() => goToTab('dobai')}>Bắt đầu</button></div>
                <div className="tan"><i>文</i><div>Ngữ pháp<small>Học cấu trúc và luyện bài tập</small></div><button className="lnk" onClick={() => goToTab('grammar')}>Mở Grammar</button></div>
                <div className="tan"><i>英</i><div>IELTS<small>Học và theo dõi bài luyện</small></div><button className="lnk" onClick={() => goToTab('ielts')}>Mở IELTS</button></div>
              </div>
            </div>
          </section>
          <footer>
            <div className="f">記憶道</div>
            Bản Doanh Nghệ Thuật Văn Hóa · Chọn các phân hệ phía trên để bắt đầu việc học
          </footer>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. ROUTE BÀN DÒ BÀI (DOBAI) */}
      {/* ============================================================== */}
      {tab === 'dobai' && (
        <div>
          <div className="hd">
            <div>
              <div className="e">復習 · Fukushuu Desk</div>
              <h1>Bàn Dò Bài<small>JPD133 · In-session Debt Queue</small></h1>
            </div>
          </div>
          <div className="dobai-view">
            <div className="db-top">
              <div className="db-brand">復習<small>Dò bài · JPD133</small></div>
              <div className="slots">
                {Object.keys(SL).map(kStr => {
                  const k = Number(kStr);
                  return (
                    <button
                      key={k}
                      aria-pressed={k === dobaiSlot}
                      title={k ? `Slot ${k}` : "Tất cả Slot"}
                      onClick={() => setDobaiSlot(k)}
                    >
                      {SL[k]}
                    </button>
                  );
                })}
              </div>
              <div className="mode">
                <button aria-pressed={dobaiMode === 'fw'} onClick={() => setDobaiMode('fw')}>順</button>
                <button aria-pressed={dobaiMode === 'rv'} onClick={() => setDobaiMode('rv')}>逆</button>
              </div>
            </div>

            <div className="board">
              <div className="scroll">
                <div className="roll t" />
                <div className="roll b" />

                {dobaiStamp && (
                  <div className={`stamp ${dobaiStamp.ok ? '' : 'no'}`}>
                    {dobaiStamp.ok ? '覚' : '未'}
                  </div>
                )}

                {!dobaiSt.q.length ? (
                  <div className="done">
                    <div className="e">完</div>
                    <h2>Hoàn thành phiên dò bài</h2>
                    <p style={{ color: "var(--sub)", margin: 0 }}>Bạn đã thuộc {dobaiSt.total} từ.</p>
                    <button onClick={startDobai}>Dò lại từ đầu</button>
                  </div>
                ) : (
                  <>
                    <div className="meta">
                      <span>Slot {dobaiSt.q[0].s} · {dobaiSt.q[0].t}</span>
                      <span>{dobaiSt.done.length + 1} / {dobaiSt.total}</span>
                    </div>

                    <div className="stage">
                      <div className={`ans-card ${dobaiRev ? "open" : ""}`}>
                        {dobaiMode === 'fw' ? (
                          <>
                            <b>{dobaiSt.q[0].v}</b>
                            <p>Ví dụ</p>
                            <div className="jp">{dobaiSt.q[0].e}</div>
                            <p>{dobaiSt.q[0].ev}</p>
                          </>
                        ) : (
                          <>
                            <div className="big">{dobaiSt.q[0].k}</div>
                            <div className="kn">{dobaiSt.q[0].r}</div>
                            <div className="jp" style={{ textAlign: "center" }}>{dobaiSt.q[0].e}</div>
                          </>
                        )}
                        <div className="shoji">
                          <span>{dobaiMode === 'fw' ? "Nhẩm nghĩa trong đầu, rồi bấm Space để mở cửa" : "Tự nhẩm Kanji và cách đọc, rồi bấm Space"}</span>
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
                            style={{ strokeDashoffset: 289 * (1 - (dobaiSt.total ? dobaiSt.done.length / dobaiSt.total : 0)) }}
                          />
                        </svg>
                        {dobaiMode === 'fw' ? (
                          <>
                            <ruby className="kanji">{dobaiSt.q[0].k}<rt>{dobaiSt.q[0].r}</rt></ruby>
                            <button className="spk" onClick={dobaiSpeak}>🔊 Nghe (P)</button>
                          </>
                        ) : (
                          <div className="prompt">{dobaiSt.q[0].v}<small>Gợi ý: {dobaiSt.q[0].t}</small></div>
                        )}
                      </div>
                    </div>

                    <div className="inc"><i style={{ width: `${dobaiIncWidth}%` }} /></div>
                    <div className="tm" dangerouslySetInnerHTML={{ __html: dobaiTimerDisplay }} />

                    {!dobaiRev && (
                      <button
                        className="rv-btn"
                        onClick={() => {
                          setDobaiRev(true);
                          setDobaiTEnd((performance.now() - dobaiT0Ref.current) / 1000);
                        }}
                      >
                        開く · {dobaiMode === 'fw' ? "Hiện nghĩa" : "Hiện đáp án"} (Space)
                      </button>
                    )}

                    <div className="acts">
                      <button className="no" disabled={!dobaiRev} onClick={() => dobaiAnswer(false)}>
                        <i>未</i><span>Chưa thuộc<small>Backspace / 2 · bốc lại sau 2 từ</small></span>
                      </button>
                      <button className="ok" disabled={!dobaiRev} onClick={() => dobaiAnswer(true)}>
                        <i>覚</i><span>Đã thuộc<small>Enter / 1 · tăng stability</small></span>
                      </button>
                    </div>

                    <button className="un" disabled={!dobaiHist.length} onClick={dobaiUndo}>
                      ↩ Hoàn tác (Z)
                    </button>

                    <div className="keys">
                      <kbd>Space</kbd> hiện · <kbd>Enter</kbd> thuộc · <kbd>Backspace</kbd> chưa thuộc · <kbd>Z</kbd> hoàn tác · <kbd>P</kbd> phát âm
                    </div>
                  </>
                )}
              </div>

              <aside className="rail">
                <h2>短冊</h2>
                <div className="sm">
                  {dobaiSt.debt.length ? `Còn nợ ${dobaiSt.debt.length} từ. Thuộc hết mới hoàn thành.` : "Từ đang nợ, sẽ quay lại trong phiên"}
                </div>
                <div className="rail-bar" />
                <div className="strips">
                  {dobaiSt.debt.length ? (
                    dobaiSt.debt.map(k => {
                      const x = INITIAL_DOBAI_CARDS.find(z => z.k === k);
                      const idx = dobaiSt.q.findIndex(z => z.k === k);
                      if (!x) return null;
                      return (
                        <div key={k} className="tan">
                          <div className="t">{x.k}</div>
                          <div className="v">{x.v}</div>
                          <div className="n">{idx > 0 ? `sau ${idx} từ` : "đang dò"}</div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="emp">Chưa có từ nợ. Bấm “Chưa thuộc”, tờ giấy sẽ treo ở đây.</div>
                  )}
                </div>
              </aside>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 7. ROUTE DOJO */}
      {/* ============================================================== */}
      {tab === 'dojo' && (
        <div>
          <div className="hd">
            <div>
              <div className="e">道場 · Conjugation Dojo</div>
              <h1>Chia động từ</h1>
            </div>
            <div className="meta">Score: <b>{dojoScore} pts</b> · Streak: <b>{dojoStreak}</b></div>
          </div>

          <div style={{ marginBottom: "16px" }}>
            {Object.keys(FM).map(k => (
              <button
                key={k}
                className={`chip ${k === dojoForm ? "on" : ""}`}
                onClick={() => {
                  setDojoForm(k);
                  setDojoFeedback(null);
                  pickDojoVerb();
                }}
              >
                {FM[k][0]}
              </button>
            ))}
          </div>

          <div className="box fr">
            <div className="meta" style={{ display: "flex", justifyContent: "space-between" }}>
              <span>CURRENT CHALLENGE</span>
              <span>Question {String(dojoIndex + 1).padStart(2, "0")} / 20</span>
            </div>
            <div className="big" style={{ marginTop: "14px" }}>
              {dojoForm === "dic" ? conj(dojoCur[0], dojoCur[3], "masu") : dojoCur[0]}
            </div>
            <div style={{ textAlign: "center" }} className="sub">{dojoCur[1]} ({dojoCur[2]}) · Group {dojoCur[3]}</div>
            <p style={{ textAlign: "center", margin: "14px 0 0", fontWeight: 600 }}>Prompt: {FM[dojoForm][1]}</p>

            <div className="ans">
              <input
                className="in"
                placeholder="Nhập Hiragana…"
                autoComplete="off"
                disabled={Boolean(dojoFeedback)}
                value={dojoInput}
                onChange={e => setDojoInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleDojoSubmit();
                }}
              />
              <button className="btn p" onClick={handleDojoSubmit}>
                {dojoFeedback ? "Tiếp (Enter)" : "Submit (Enter)"}
              </button>
            </div>

            {dojoFeedback && (
              <div className={`fb ${dojoFeedback.ok ? "" : "x"}`}>
                <b>{dojoFeedback.ok ? "Chính xác!" : "Chưa đúng."}</b> Đáp án: <span className="jp">{dojoFeedback.ans}</span>
              </div>
            )}
            <p className="meta" style={{ marginTop: "14px" }}>{GR[dojoCur[3]]}</p>
          </div>

          <div className="box" style={{ marginTop: "22px" }}>
            <div className="meta">VERB GROUP ACCURACY MATRIX</div>
            <div className="acc">
              {[1, 2, 3].map(g => {
                const total = dojoAcc[g][1];
                const correct = dojoAcc[g][0];
                const p = total ? Math.round((correct / total) * 100) : 0;
                return (
                  <div key={g}>
                    <span>Group {g}</span>
                    <div className="bar"><i style={{ width: `${p}%` }} /></div>
                    <b>{total ? `${p}%` : "—"}</b>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 8. ROUTE GRAMMAR */}
      {/* ============================================================== */}
      {tab === 'grammar' && (
        <div>
          <div className="hd">
            <div>
              <div className="e">文法 · Bunbou Grammar Hub</div>
              <h1>JPD133 Grammar<small>32 Rules · 204 Exercises · N5/N4</small></h1>
            </div>
          </div>

          <input
            className="in"
            placeholder="Tìm quy tắc: V-te imasu, te mo ii…"
            value={grammarQ}
            onChange={e => setGrammarQ(e.target.value)}
            style={{ marginBottom: "14px" }}
          />

          <div style={{ marginBottom: "14px" }}>
            <button className={`chip ${grammarUnit === 0 ? "on" : ""}`} onClick={() => setGrammarUnit(0)}>All</button>
            {UN.map(x => (
              <button key={x.u} className={`chip ${grammarUnit === x.u ? "on" : ""}`} onClick={() => setGrammarUnit(x.u)}>
                Unit {x.u}
              </button>
            ))}
          </div>

          {UN.filter(x => !grammarUnit || x.u === grammarUnit).map(x => {
            const P = x.P.filter(p => (p[1] + p[2] + p[3]).toLowerCase().includes(grammarQ.toLowerCase()));
            return (
              <div key={x.u} className="box" style={{ marginBottom: "22px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "6px", marginBottom: "14px" }}>
                  <b className="jp" style={{ fontSize: "1.05rem" }}>UNIT {x.u}: {x.t}</b>
                  <span className="meta">Progress: {x.pr} patterns</span>
                </div>
                <div className="row r3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))" }}>
                  {P.map(p => (
                    <div key={p[0]} className="pat">
                      <h4>Pattern {p[0]}: {p[1]}</h4>
                      <p>{p[2]}</p>
                      <p className="ex">{p[3]}</p>
                      <div style={{ marginTop: "12px" }}>
                        <button className="lnk" onClick={() => { setLessonId(String(p[0])); goToTab('lesson'); }}>
                          Details
                        </button>
                        <button className="lnk" onClick={() => goToTab('practice')}>
                          Practice {p[4]} Qs
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ============================================================== */}
      {/* 9. ROUTE LESSON DETAILS */}
      {/* ============================================================== */}
      {tab === 'lesson' && (
        <div>
          {lessonId !== '1' ? (
            <div>
              <div className="hd">
                <div>
                  <div className="e">Pattern {lessonId}</div>
                  <h1>Bài này đang được biên soạn</h1>
                </div>
                <button className="btn" onClick={() => goToTab('grammar')}>Back to Hub</button>
              </div>
              <p className="sub">Demo hiện có đầy đủ Pattern 1. Các pattern còn lại dùng chung cấu trúc trang này.</p>
            </div>
          ) : (
            <div>
              <div className="hd">
                <div>
                  <div className="e">UNIT 8 GRAMMAR · PATTERN 01</div>
                  <h1 className="jp">N は A(い/な) です</h1>
                </div>
                <button className="btn" onClick={() => goToTab('grammar')}>Back to Hub</button>
              </div>

              <div className="box fr">
                <div className="meta">STRUCTURE</div>
                <p className="jp" style={{ fontSize: "1.4rem", margin: "6px 0 0" }}>Subject + は + Adjective (い / な) + です</p>
              </div>

              <div className="row r2" style={{ marginTop: "28px" }}>
                <div className="box">
                  <div className="meta">CONJUGATION RULES</div>
                  <div className="rule">
                    <b>い-Adjective:</b> giữ い + です<br />
                    <span className="jp" style={{ fontSize: "1.15rem" }}>富士山は 高い です。</span><br />
                    <span className="sub">Núi Phú Sĩ thì cao.</span>
                  </div>
                  <div className="rule">
                    <b>な-Adjective:</b> bỏ な + です<br />
                    <span className="jp" style={{ fontSize: "1.15rem" }}>さくらさんは きれい です。</span><br />
                    <span className="sub">Bạn Sakura thì đẹp.</span>
                  </div>
                </div>

                <div className="box">
                  <div className="meta">LỖI THƯỜNG GẶP CỦA NGƯỜI VIỆT</div>
                  <div className="rule" style={{ borderColor: "var(--no)" }}>
                    <span className="jp bad">さくらさんは きれいな です。</span><br />
                    <span className="sub" style={{ fontSize: ".85rem" }}>Thừa な khi đứng trước です.</span><br />
                    <span className="jp good">さくらさんは きれい です。</span>
                  </div>
                </div>
              </div>

              <div className="box" style={{ marginTop: "22px" }}>
                <div className="meta">CONTEXT EXAMPLES</div>
                <div className="li"><span className="jp">1. 日本の食べ物はおいしいですが、高いです。</span><span className="sub">Đồ ăn Nhật ngon nhưng đắt.</span></div>
                <div className="li"><span className="jp">2. この部屋は静かですか。…いいえ、あまり静かじゃありません。</span><span className="sub">Căn phòng yên tĩnh không? Không lắm.</span></div>
              </div>

              <div style={{ marginTop: "22px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <button className="btn p" onClick={() => goToTab('practice')}>Practice 12 Exercises Now</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 10. ROUTE PRACTICE */}
      {/* ============================================================== */}
      {tab === 'practice' && (
        <div>
          {(() => {
            const q = PQ[practiceIdx % PQ.length];
            return (
              <div>
                <div className="hd">
                  <div>
                    <div className="e">練習 · Bunbou Practice Studio</div>
                    <h1>Practice</h1>
                  </div>
                  <div className="meta">
                    Question <b>{practiceIdx + 1}</b> · Accuracy <b>{practiceDone ? Math.round((practiceOk / practiceDone) * 100) : 0}%</b>
                  </div>
                </div>

                <div className="box fr" style={{ maxWidth: "720px", margin: "auto" }}>
                  <div className="meta" style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>FILL IN THE PARTICLE</span>
                    <span>JLPT N5 · Unit 9</span>
                  </div>
                  <p className="jp" style={{ fontSize: "1.5rem", margin: "20px 0 6px" }}>「{q[0]}」</p>

                  {q[1].map((o, j) => (
                    <button
                      key={j}
                      className={`opt ${practiceSel !== null ? (j === q[2] ? "ok" : j === practiceSel ? "no" : "") : ""}`}
                      disabled={practiceSel !== null}
                      onClick={() => {
                        setPracticeSel(j);
                        setPracticeDone(d => d + 1);
                        if (j === q[2]) setPracticeOk(k => k + 1);
                      }}
                    >
                      ({"ABCD"[j]}) {o}
                    </button>
                  ))}

                  {practiceSel !== null && (
                    <>
                      <div className={`fb ${practiceSel === q[2] ? "" : "x"}`}>
                        <b>{practiceSel === q[2] ? "CORRECT ANSWER!" : "Chưa đúng."}</b><br />{q[3]}
                      </div>
                      <button
                        className="btn p"
                        style={{ marginTop: "14px", float: "right" }}
                        onClick={() => {
                          setPracticeIdx(i => i + 1);
                          setPracticeSel(null);
                        }}
                      >
                        Next Question (Enter) »
                      </button>
                      <div style={{ clear: "both" }} />
                    </>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ============================================================== */}
      {/* 11. ROUTE IELTS */}
      {/* ============================================================== */}
      {tab === 'ielts' && (
        <div>
          <div className="hd">
            <div>
              <div className="e">Cambridge Ledger</div>
              <h1>IELTS Academic Master Suite</h1>
            </div>
            <div className="meta">Target Band: <b>7.5</b> · Exam Year: <b>2026</b></div>
          </div>

          <div className="row r4">
            {[
              ["READING BAND", "7.5", "(34/40)", "Cam 18 Test 3: 35/40"],
              ["LISTENING BAND", "8.0", "(36/40)", "Cam 17 Test 1: 33/40"],
              ["WRITING TRACKER", "6.5", "Task 2", "Coherence cần tăng"],
              ["SPEAKING LOG", "7.0", "Fluency", "Pronunciation 6.5"]
            ].map(b => (
              <div key={b[0]} className="box hv">
                <div className="band"><small>{b[0]}</small>{b[1]}</div>
                <div className="sub" style={{ fontSize: ".8rem" }}>{b[2]}</div>
                <div className="tip">{b[3]}</div>
              </div>
            ))}
          </div>

          <div className="row r55" style={{ marginTop: "22px" }}>
            <div className="box">
              <div className="meta">TEST LOGS</div>
              {ieltsTests.map(t => (
                <div key={t[0]} className="li">
                  <span>• {t[0]}</span>
                  <b>{t[1]}/40 · Band {BD(t[1]).toFixed(1)}</b>
                </div>
              ))}

              {ieltsShowForm ? (
                <div style={{ display: "flex", gap: "8px", marginTop: "12px", flexWrap: "wrap" }}>
                  <input
                    className="in"
                    placeholder="Tên bài test"
                    style={{ flex: 2 }}
                    value={ieltsNewName}
                    onChange={e => setIeltsNewName(e.target.value)}
                  />
                  <input
                    className="in"
                    type="number"
                    min="0"
                    max="40"
                    placeholder="/40"
                    style={{ flex: 1 }}
                    value={ieltsNewScore}
                    onChange={e => setIeltsNewScore(e.target.value ? Number(e.target.value) : '')}
                  />
                  <button
                    className="btn p"
                    onClick={() => {
                      if (!ieltsNewName.trim() || typeof ieltsNewScore !== 'number' || ieltsNewScore < 0 || ieltsNewScore > 40) {
                        return showToast("Nhập tên và điểm 0–40");
                      }
                      setIeltsTests([[ieltsNewName, ieltsNewScore], ...ieltsTests]);
                      setIeltsShowForm(false);
                      setIeltsNewName('');
                      setIeltsNewScore('');
                    }}
                  >
                    Lưu
                  </button>
                </div>
              ) : (
                <button className="btn" style={{ marginTop: "14px" }} onClick={() => setIeltsShowForm(true)}>
                  + Log New Test Result
                </button>
              )}
              <div className="meta" style={{ marginTop: "10px" }}>Band ước tính theo thang Academic Reading.</div>
            </div>

            <div className="box">
              <div className="meta">MISTAKE LOGBOOK</div>
              {[
                ["1", "True/False/Not Given Traps", "Nhầm lẫn giữa False và Not Given"],
                ["2", "Singular/Plural Spelling", "Thiếu ‘s’ ở câu 14, Section 1"]
              ].map(m => (
                <div key={m[0]} className="li" style={{ display: "block" }}>
                  <b>{m[0]}. {m[1]}</b><br />
                  <span className="sub" style={{ fontSize: ".85rem" }}>{m[2]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}


    </>
  );
}
