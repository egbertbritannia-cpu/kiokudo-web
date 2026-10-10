'use client';

import { useEffect, useState } from 'react';

const PLAN = [
  'Reading · 1 passage (20 min)',
  'Vocabulary · 15 academic words',
  'Writing · Task 2 outline',
  'Speaking · Part 2 cue card',
] as const;

/**
 * English home is a direct JSX port of E[""] from the supplied Albion HTML.
 * Layout, wording, palette, box proportions and heading are unchanged.
 */
export default function AlbionHome() {
  const [plan, setPlan] = useState<boolean[]>([false, false, false, false]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const cached = localStorage.getItem('albion_study_plan_v1');
      if (cached) {
        const parsed: unknown = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length === PLAN.length)
          setPlan(parsed.map(Boolean));
      }
    } catch { /* Private browsing: plan remains in memory. */ }
    setReady(true);
  }, []);

  function toggle(index: number, checked: boolean) {
    const next = plan.map((x, i) => i === index ? checked : x);
    setPlan(next);
    try { localStorage.setItem('albion_study_plan_v1', JSON.stringify(next)); } catch {}
  }

  const complete = plan.filter(Boolean).length;

  return (
    <>
      <div className="en" style={{ marginBottom: 26 }}>
        <small>ALBION IELTS · THE READING ROOM</small>
        <div className="q">“Reading maketh a full man; conference a ready man; and writing an exact man.”</div>
        <p style={{ margin: '20px 0 4px', color: '#D9CFB5', fontSize: '.9rem' }}>
          Đọc làm người đầy đặn, đàm đạo làm người nhanh nhạy, viết làm người chính xác.
        </p>
        <div style={{ letterSpacing: '.2em', fontSize: '.72rem', color: '#C9A24B' }}>
          FRANCIS BACON · OF STUDIES · 1625
        </div>
      </div>
      <div className="row r2">
        <div className="box">
          <div className="meta" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>TODAY’S STUDY PLAN</span><span>{complete}/4</span>
          </div>
          <div className="bar" style={{ margin: '10px 0 6px' }}>
            <i style={{ width: `${complete * 25}%` }} />
          </div>
          {PLAN.map((item, i) => (
            <label className="li" key={item} style={{ cursor: 'pointer', justifyContent: 'flex-start', gap: 12 }}>
              <input type="checkbox" checked={ready && plan[i]} onChange={event => toggle(i, event.target.checked)} />
              <span style={plan[i] ? { textDecoration: 'line-through', color: 'var(--sub)' } : undefined}>
                {item}
              </span>
            </label>
          ))}
        </div>
        <div className="box fr">
          <div className="meta">WORD OF THE DAY</div>
          <div className="jp" style={{ font: '700 2.6rem var(--mincho)', marginTop: 8 }}>ameliorate</div>
          <div className="sub">/əˈmiːliəreɪt/ · verb</div>
          <p style={{ margin: '10px 0 4px' }}>
            To make a bad situation better. <span className="sub">(cải thiện, làm dịu bớt)</span>
          </p>
          <div className="ctx">Subsidies may ameliorate the effects of rising food prices.</div>
        </div>
      </div>
    </>
  );
}
