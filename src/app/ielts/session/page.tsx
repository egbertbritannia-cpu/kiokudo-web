'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

type SectionType = 'Reading' | 'Listening' | 'Writing' | 'Speaking';
type TestType = 'academic' | 'general';

const SECTION_DURATIONS: Record<SectionType, number> = {
  Reading: 60 * 60,
  Writing: 60 * 60,
  Listening: 35 * 60,
  Speaking: 15 * 60,
};

export default function IeltsSessionTracker() {
  const [section, setSection] = useState<SectionType>('Reading');
  const [testType, setTestType] = useState<TestType>('academic');
  const [materialTitle, setMaterialTitle] = useState('Cambridge IELTS 18 - Test 1');
  const [availableMaterials, setAvailableMaterials] = useState<Array<{ id: string; title: string }>>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [writingTask1, setWritingTask1] = useState('');
  const [writingTask2, setWritingTask2] = useState('');

  // Timer states
  const [timeLeft, setTimeLeft] = useState<number>(SECTION_DURATIONS.Reading);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [timeUpNotice, setTimeUpNotice] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [confirmClear, setConfirmClear] = useState<boolean>(false);
  const [savedNotification, setSavedNotification] = useState<string>('');

  // Fetch materials from database
  useEffect(() => {
    async function loadMaterials() {
      try {
        const res = await fetch('/api/backend/api/v1/ielts/materials', { cache:'no-store' });
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            setAvailableMaterials(json.data);
          }
        }
      } catch (err) {
        console.warn('Could not load materials from API:', err);
      }
    }
    loadMaterials();
  }, []);

  // Khôi phục draft từ LocalStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`ielts_draft_${section}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.answers) setAnswers(parsed.answers);
        if (parsed.writingTask1) setWritingTask1(parsed.writingTask1);
        if (parsed.writingTask2) setWritingTask2(parsed.writingTask2);
        if (parsed.timeLeft !== undefined) setTimeLeft(parsed.timeLeft);
        if (parsed.testType) setTestType(parsed.testType);
        if (parsed.materialTitle) setMaterialTitle(parsed.materialTitle);
      } else {
        setTimeLeft(SECTION_DURATIONS[section]);
        setAnswers({});
      }
    } catch {
      // Ignore storage errors
    }
  }, [section]);

  // Tự động lưu draft vào LocalStorage khi answers hoặc writing thay đổi
  useEffect(() => {
    try {
      const draft = {
        section,
        testType,
        materialTitle,
        answers,
        writingTask1,
        writingTask2,
        timeLeft,
        lastUpdated: Date.now(),
      };
      localStorage.setItem(`ielts_draft_${section}`, JSON.stringify(draft));
    } catch {
      // Ignore
    }
  }, [section, testType, materialTitle, answers, writingTask1, writingTask2, timeLeft]);

  // Bộ đếm ngược Timer
  useEffect(() => {
    let timer: any = null;
    if (isRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => Math.max(0, prev - 1));
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      setTimeUpNotice(true);
    }
    return () => clearInterval(timer);
  }, [isRunning, timeLeft, section]);

  // Stage one immutable client session ID; retries never create another session.
  // The Core remains the authority for revision and submission status.
  const handleSubmitSession = async () => {
    if(submitting)return;
    setSubmitting(true);
    const storageId = `kiokudo_ielts_active_session_${section}`;
    const localKey = `ielts_draft_${section}`;
    try {
      let sessionId = localStorage.getItem(storageId);
      if (!sessionId || !/^[A-Za-z0-9_-]{1,128}$/.test(sessionId)) {
        sessionId = crypto.randomUUID();
        localStorage.setItem(storageId,sessionId);
      }
      const materialId = availableMaterials.find(m=>m.title===materialTitle)?.id ?? null;
      async function mutate(path:string,method:'POST'|'PUT',payload:unknown) {
        const res=await fetch(`/api/backend${path}`,{
          method,credentials:'same-origin',cache:'no-store',
          headers:{'content-type':'application/json'},body:JSON.stringify(payload),
        });
        const data:unknown=await res.json().catch(()=>null);
        if(!res.ok||!data||typeof data!=='object'||(data as {success?:boolean}).success!==true)
          throw new Error(`Core did not confirm ${path}: HTTP ${res.status}`);
        return data as {success:true;data:{id?:string;revision:number;sessionStatus:string}};
      }
      const created=await mutate('/api/v1/ielts/sessions','POST',{
        sessionId,section,testType,materialId,
        testNumber:materialTitle.slice(0,120),
      });
      const data=Object.entries(answers).filter(([q])=>Number.isInteger(Number(q))&&Number(q)>0&&Number(q)<=40)
        .map(([q,answer])=>({number:Number(q),answer:String(answer)}));
      if(writingTask1.trim())data.push({number:41,answer:writingTask1});
      if(writingTask2.trim())data.push({number:42,answer:writingTask2});
      // Persisted request ID survives network loss, so retries cannot double-mutate.
      const draftRequestKey=storageId+'_draft_req';
      let draftRequestId=localStorage.getItem(draftRequestKey);
      if(!draftRequestId){
        draftRequestId=crypto.randomUUID();localStorage.setItem(draftRequestKey,draftRequestId);
      }
      const saved=await mutate(`/api/v1/ielts/sessions/${sessionId}/draft`,'PUT',{
        requestId:draftRequestId,expectedRevision:created.data.revision,answers:data,
      });
      localStorage.removeItem(draftRequestKey);
      const submitKey=storageId+'_submit_req';
      let submitRequestId=localStorage.getItem(submitKey);
      if(!submitRequestId){
        submitRequestId=crypto.randomUUID();localStorage.setItem(submitKey,submitRequestId);
      }
      const submitted=await mutate(`/api/v1/ielts/sessions/${sessionId}/submit`,'POST',{
        requestId:submitRequestId,expectedRevision:saved.data.revision,
      });
      if(submitted.data.sessionStatus!=='completed')throw new Error('Unexpected submission status');
      localStorage.removeItem(submitKey);
      localStorage.removeItem(storageId);
      localStorage.removeItem(localKey);
      setSavedNotification('Core đã xác nhận nộp bài. Chưa có band score tự động.');
      window.alert('Đã lưu bài làm lên staging và nộp phiên thành công. Band score cần được xác minh riêng.');
    } catch {
      // Preserve all local draft and retry keys; never claim server success.
      window.alert('Core chưa xác nhận nộp bài. Nháp vẫn được lưu cục bộ để thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSectionChange = (newSection: SectionType) => {
    setIsRunning(false);
    setTimeUpNotice(false);
    setSection(newSection);
    setTimeLeft(SECTION_DURATIONS[newSection]);
  };

  const handleAnswerChange = (qIndex: number, val: string) => {
    setAnswers((prev) => ({ ...prev, [qIndex]: val }));
  };

  const handleQuickAnswer = (qIndex: number, val: string) => {
    setAnswers((prev) => ({ ...prev, [qIndex]: val }));
  };

  const handleResetTimer = () => {
    setIsRunning(false);
    setTimeLeft(SECTION_DURATIONS[section]);
  };

  const handleClearDraft = () => {
    setAnswers({});
    setWritingTask1('');
    setWritingTask2('');
    setTimeLeft(SECTION_DURATIONS[section]);
    setIsRunning(false);
    setConfirmClear(false);
    try {
      localStorage.removeItem(`ielts_draft_${section}`);
    } catch {
      // Ignore
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const wordCount = (text: string) => {
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1050px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2.4rem', margin: 0, color: 'var(--primary-color)', fontFamily: 'var(--font-serif)' }}>
            Examination Room
          </h1>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--text-color)', fontSize: '1rem' }}>
            Thiết kế theo chuẩn kỳ thi Cambridge IELTS với tính năng lưu nháp tức thì.
          </p>
        </div>

        {/* Section & Type Selector */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={testType}
            onChange={(e) => setTestType(e.target.value as TestType)}
            style={{
              padding: '0.45rem 0.8rem',
              borderRadius: '6px',
              border: '1.5px solid var(--primary-color)',
              background: '#FFFFFF',
              color: 'var(--primary-color)',
              fontWeight: 'bold',
              fontFamily: 'var(--font-sans)',
            }}
          >
            <option value="academic">Academic Module</option>
            <option value="general">General Training Module</option>
          </select>

          {/* Material Selector */}
          <select
            value={materialTitle}
            onChange={(e) => setMaterialTitle(e.target.value)}
            style={{
              padding: '0.45rem 0.8rem',
              borderRadius: '6px',
              border: '1.5px solid var(--primary-color)',
              background: '#FFFFFF',
              color: 'var(--primary-color)',
              fontWeight: 'bold',
              fontFamily: 'var(--font-sans)',
            }}
          >
            {availableMaterials.length > 0 ? (
              availableMaterials.map((m) => (
                <option key={m.id} value={`${m.title} - Test 1`}>
                  {m.title} - Test 1
                </option>
              ))
            ) : (
              <>
                <option value="Cambridge IELTS 18 - Test 1">Cambridge IELTS 18 - Test 1</option>
                <option value="Cambridge IELTS 19 - Test 1">Cambridge IELTS 19 - Test 1</option>
                <option value="Cambridge IELTS 17 - Test 1">Cambridge IELTS 17 - Test 1</option>
              </>
            )}
          </select>

          {(['Listening', 'Reading', 'Writing', 'Speaking'] as SectionType[]).map((sec) => (
            <button
              key={sec}
              onClick={() => handleSectionChange(sec)}
              style={{
                padding: '0.45rem 0.9rem',
                borderRadius: '6px',
                border: section === sec ? '2px solid var(--primary-color)' : '1px solid #ccc',
                background: section === sec ? 'var(--primary-color)' : '#FFFFFF',
                color: section === sec ? '#FFFFFF' : 'var(--text-color)',
                fontWeight: section === sec ? 'bold' : 'normal',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                transition: 'all 0.2s ease',
              }}
            >
              {sec} ({Math.round(SECTION_DURATIONS[sec] / 60)}m)
            </button>
          ))}
        </div>
      </div>

      {/* Clock & Control Center */}
      <div className="british-border" style={{ backgroundColor: '#FFFFFF', padding: '1.75rem', textAlign: 'center', marginBottom: '2rem', borderRadius: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '0.85rem', color: '#666', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
              {section} ({testType.toUpperCase()}) · Đồng hồ đếm ngược
            </div>
            <div style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '4.5rem',
              color: timeLeft <= 300 ? 'var(--error-color)' : 'var(--primary-color)',
              lineHeight: 1.1,
              margin: '0.25rem 0',
              fontWeight: 'bold',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {formatTime(timeLeft)}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              onClick={() => setIsRunning(!isRunning)}
              style={{
                backgroundColor: isRunning ? '#D97706' : 'var(--primary-color)',
                color: 'white',
                padding: '0.75rem 1.75rem',
                border: 'none',
                borderRadius: '6px',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                boxShadow: '0 2px 8px rgba(0,33,71,0.2)',
              }}
            >
              {isRunning ? '⏸ Tạm dừng' : '▶ Bắt đầu tính giờ'}
            </button>
            <button
              onClick={handleResetTimer}
              style={{
                backgroundColor: '#F3F4F6',
                color: 'var(--text-color)',
                padding: '0.75rem 1.25rem',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '0.95rem',
                cursor: 'pointer',
              }}
            >
              Đặt lại
            </button>
            {!confirmClear ? (
              <button
                onClick={() => setConfirmClear(true)}
                style={{
                  backgroundColor: '#FEE2E2',
                  color: '#991B1B',
                  padding: '0.75rem 1.25rem',
                  border: '1px solid #FCA5A5',
                  borderRadius: '6px',
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                }}
              >
                Xóa nháp
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                <button
                  onClick={handleClearDraft}
                  style={{
                    backgroundColor: '#DC2626',
                    color: '#FFFFFF',
                    padding: '0.75rem 1rem',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                >
                  Xác nhận xóa
                </button>
                <button
                  onClick={() => setConfirmClear(false)}
                  style={{
                    backgroundColor: '#E5E7EB',
                    color: '#374151',
                    padding: '0.75rem 0.75rem',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  Hủy
                </button>
              </div>
            )}
          </div>
        </div>

        {timeUpNotice && (
          <div style={{
            marginTop: '1.25rem',
            padding: '0.85rem 1.25rem',
            borderRadius: '6px',
            backgroundColor: '#FEF2F2',
            border: '1.5px solid #F87171',
            color: '#991B1B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
              <span>⏰</span>
              <span>Hết giờ làm bài phần {section}! Bạn hãy kiểm tra lại các câu đã làm và nhấn nút Nộp bài bên dưới.</span>
            </div>
            <button
              onClick={() => setTimeUpNotice(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#991B1B',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '1rem'
              }}
            >
              ✕
            </button>
          </div>
        )}

        <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#059669', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
          <span>✓ Đang tự động lưu bài làm vào bộ nhớ cục bộ (Auto-save).</span>
        </div>
      </div>

      {/* Answer Workspace: Reading / Listening (Grid 40 câu) */}
      {(section === 'Reading' || section === 'Listening') && (
        <div className="british-border" style={{ backgroundColor: '#FFFFFF', padding: '2rem', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.4rem', margin: 0 }}>
              Quick Answer Grid (40 Questions)
            </h2>
            <div style={{ fontSize: '0.9rem', color: '#666' }}>
              Đã điền: <strong>{Object.values(answers).filter(v => v?.trim()).length}/40</strong> câu
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '0.85rem'
          }}>
            {Array.from({ length: 40 }).map((_, i) => {
              const qNum = i + 1;
              const val = answers[qNum] || '';
              return (
                <div
                  key={qNum}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem',
                    padding: '0.5rem',
                    background: val ? '#F0FDF4' : '#F9FAFB',
                    border: val ? '1px solid #86EFAC' : '1px solid #E5E7EB',
                    borderRadius: '6px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ minWidth: '28px', fontWeight: 'bold', fontSize: '0.95rem', color: 'var(--primary-color)' }}>
                      {qNum}.
                    </span>
                    <input
                      type="text"
                      value={val}
                      placeholder="Đáp án..."
                      onChange={(e) => handleAnswerChange(qNum, e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.35rem 0.5rem',
                        border: '1px solid #D1D5DB',
                        borderRadius: '4px',
                        fontSize: '0.9rem',
                        fontFamily: 'var(--font-sans)',
                      }}
                    />
                  </div>
                  {/* Nút bấm nhanh T/F/NG hoặc A-D */}
                  <div style={{ display: 'flex', gap: '0.25rem', paddingLeft: '1.75rem' }}>
                    {['T', 'F', 'NG'].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handleQuickAnswer(qNum, opt === 'T' ? 'True' : opt === 'F' ? 'False' : 'Not Given')}
                        style={{
                          fontSize: '0.72rem',
                          padding: '0.15rem 0.35rem',
                          background: '#E5E7EB',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer',
                        }}
                      >
                        {opt}
                      </button>
                    ))}
                    <span style={{ color: '#D1D5DB' }}>|</span>
                    {['A', 'B', 'C', 'D'].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handleQuickAnswer(qNum, opt)}
                        style={{
                          fontSize: '0.72rem',
                          padding: '0.15rem 0.35rem',
                          background: '#E5E7EB',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer',
                        }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <Link
              href="/ielts/review"
              style={{
                backgroundColor: 'var(--primary-color)',
                color: '#FFFFFF',
                padding: '0.85rem 2rem',
                borderRadius: '6px',
                textDecoration: 'none',
                fontWeight: 'bold',
                fontFamily: 'var(--font-sans)',
                display: 'inline-block',
                boxShadow: '0 2px 6px rgba(0,33,71,0.2)'
              }}
            >
              Chấm điểm &amp; Phân tích kết quả →
            </Link>
          </div>
        </div>
      )}

      {/* Answer Workspace: Writing (Task 1 & Task 2) */}
      {section === 'Writing' && (
        <div className="british-border" style={{ backgroundColor: '#FFFFFF', padding: '2rem', borderRadius: '8px' }}>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '1.5rem' }}>
            IELTS Writing Answer Sheet
          </h2>

          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>
                Task 1 ({testType === 'academic' ? 'Report 150 words' : 'Letter 150 words'})
              </label>
              <span style={{ fontSize: '0.85rem', color: wordCount(writingTask1) < 150 ? '#D97706' : '#059669', fontWeight: 600 }}>
                {wordCount(writingTask1)} words (Target: 150+)
              </span>
            </div>
            <textarea
              rows={8}
              value={writingTask1}
              onChange={(e) => setWritingTask1(e.target.value)}
              placeholder="Nhập bài viết Task 1 tại đây..."
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1.5px solid #D1D5DB',
                borderRadius: '6px',
                fontFamily: 'var(--font-serif)',
                fontSize: '1rem',
                lineHeight: 1.6,
              }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>
                Task 2 (Essay 250 words)
              </label>
              <span style={{ fontSize: '0.85rem', color: wordCount(writingTask2) < 250 ? '#D97706' : '#059669', fontWeight: 600 }}>
                {wordCount(writingTask2)} words (Target: 250+)
              </span>
            </div>
            <textarea
              rows={12}
              value={writingTask2}
              onChange={(e) => setWritingTask2(e.target.value)}
              placeholder="Nhập bài luận Task 2 tại đây..."
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1.5px solid #D1D5DB',
                borderRadius: '6px',
                fontFamily: 'var(--font-serif)',
                fontSize: '1rem',
                lineHeight: 1.6,
              }}
            />
          </div>
        </div>
      )}

      {/* Answer Workspace: Speaking (Self-reflection / notes) */}
      {section === 'Speaking' && (
        <div className="british-border" style={{ backgroundColor: '#FFFFFF', padding: '2rem', borderRadius: '8px' }}>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '1rem' }}>
            IELTS Speaking Self-Evaluation &amp; Transcript Notes
          </h2>
          <p style={{ color: 'var(--text-color)', marginBottom: '1.5rem' }}>
            Ghi chép lại các điểm nghẽn ngập ngừng, từ vựng chưa tự nhiên hoặc từ vựng cao cấp cần phát triển cho Part 1, 2, 3.
          </p>
          <textarea
            rows={10}
            placeholder="Ghi chú bài nói hoặc dán bản ghi chép Speaking..."
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1.5px solid #D1D5DB',
              borderRadius: '6px',
              fontFamily: 'var(--font-sans)',
              fontSize: '1rem',
              lineHeight: 1.6,
            }}
          />
        </div>
      )}

      {/* Session Action Footer */}
      <div style={{
        marginTop: '2.5rem',
        padding: '1.5rem',
        backgroundColor: '#FFFFFF',
        borderRadius: '8px',
        border: '1.5px solid #E5E7EB',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
      }}>
        <div>
          <h4 style={{ margin: 0, color: 'var(--primary-color)', fontSize: '1.1rem' }}>
            Hoàn thành phần thi {section} ({testType.toUpperCase()})
          </h4>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#6B7280' }}>
            Toàn bộ câu trả lời và thời gian sẽ được lưu lại cho bước phân tích lỗi &amp; Band Score.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={handleSubmitSession}
            disabled={submitting}
            style={{
              padding: '0.85rem 2rem',
              backgroundColor: '#059669',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 'bold',
              fontSize: '1rem',
              cursor: submitting ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 8px rgba(5,150,105,0.25)',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <span>{submitting ? 'Đang lưu bài...' : '✓ Nộp bài & Phân tích kết quả'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
