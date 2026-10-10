'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface MistakeRecord {
  qNum: number;
  id?: string;
  category: string;
  rootCause: string;
  actionPlan: string;
}

interface VocabItem {
  id: string;
  word: string;
  partOfSpeech: string;
  phonetic: string;
  meaning: string;
  contextSentence: string;
}

function calculateBand(rawScore: number, section: 'Reading' | 'Listening', testType: 'academic' | 'general'): number {
  if (section === 'Listening') {
    if (rawScore >= 39) return 9.0;
    if (rawScore >= 37) return 8.5;
    if (rawScore >= 35) return 8.0;
    if (rawScore >= 32) return 7.5;
    if (rawScore >= 30) return 7.0;
    if (rawScore >= 26) return 6.5;
    if (rawScore >= 23) return 6.0;
    if (rawScore >= 18) return 5.5;
    if (rawScore >= 16) return 5.0;
    if (rawScore >= 13) return 4.5;
    if (rawScore >= 10) return 4.0;
    return 3.5;
  }

  // Reading Academic
  if (testType === 'academic') {
    if (rawScore >= 39) return 9.0;
    if (rawScore >= 37) return 8.5;
    if (rawScore >= 35) return 8.0;
    if (rawScore >= 33) return 7.5;
    if (rawScore >= 30) return 7.0;
    if (rawScore >= 27) return 6.5;
    if (rawScore >= 23) return 6.0;
    if (rawScore >= 19) return 5.5;
    if (rawScore >= 15) return 5.0;
    if (rawScore >= 13) return 4.5;
    if (rawScore >= 10) return 4.0;
    return 3.5;
  }

  // Reading General Training
  if (rawScore >= 40) return 9.0;
  if (rawScore >= 39) return 8.5;
  if (rawScore >= 37) return 8.0;
  if (rawScore >= 36) return 7.5;
  if (rawScore >= 34) return 7.0;
  if (rawScore >= 32) return 6.5;
  if (rawScore >= 30) return 6.0;
  if (rawScore >= 27) return 5.5;
  if (rawScore >= 23) return 5.0;
  if (rawScore >= 19) return 4.5;
  if (rawScore >= 15) return 4.0;
  return 3.5;
}

// No sample questions may be displayed as real review history.

export default function IeltsReviewDesk() {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [materialTitle, setMaterialTitle] = useState('Chưa chọn tài liệu');
  const [section, setSection] = useState<'Reading' | 'Listening'>('Reading');
  const [testType, setTestType] = useState<'academic' | 'general'>('academic');
  const [rawScore, setRawScore] = useState<number>(0);
  const [hasRecordedScore,setHasRecordedScore] = useState(false);
  const [revision,setRevision] = useState<number|null>(null);
  const [scoreDirty,setScoreDirty] = useState(false);
  const [analyzingQuestion, setAnalyzingQuestion] = useState<number | null>(null);
  const [questionList, setQuestionList] = useState<Array<{ qNum: number; logId?: string; yourAnswer: string; correctAnswer: string; isCorrect: boolean }>>([]);
  const [isSynced, setIsSynced] = useState(false);

  // Mistakes
  const [mistakes, setMistakes] = useState<Record<number, MistakeRecord>>({});

  const [activeCategory, setActiveCategory] = useState<string>('Distraction');
  const [activeRootCause, setActiveRootCause] = useState<string>('');
  const [activeActionPlan, setActiveActionPlan] = useState<string>('');

  // Vocab Bank
  const [vocabList, setVocabList] = useState<VocabItem[]>([]);

  const [showVocabModal, setShowVocabModal] = useState(false);
  const [newWord, setNewWord] = useState('');
  const [newPos, setNewPos] = useState('noun');
  const [newPhonetic, setNewPhonetic] = useState('');
  const [newMeaning, setNewMeaning] = useState('');
  const [newSentence, setNewSentence] = useState('');

  // Load Session & Vocab from Turso API on Mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const sid = urlParams.get('session');
    const sec = urlParams.get('section');
    if (sid) setCurrentSessionId(sid);
    if (sec && (sec === 'Reading' || sec === 'Listening')) setSection(sec);

    // Fetch session details from API
    if (sid) {
      fetch(`/api/backend/api/v1/ielts/sessions/${encodeURIComponent(sid)}`, {cache:'no-store'})
        .then((res) => (res.ok ? res.json() : null))
        .then((json) => {
          if (json?.success && json?.data) {
            const s = json.data;
            if (s.rawScore !== null && s.rawScore !== undefined) {
              setRawScore(s.rawScore);
              setHasRecordedScore(true);
              setScoreDirty(false);
            }
            if (typeof s.revision === 'number') setRevision(s.revision);
            if (s.section === 'Reading' || s.section === 'Listening') setSection(s.section);
            if (s.testType === 'academic' || s.testType === 'general') setTestType(s.testType);
            if (s.testNumber) setMaterialTitle(s.testNumber);
            setIsSynced(true);

            // Populate question logs if available
            if (s.logs && Array.isArray(s.logs) && s.logs.length > 0) {
              const mapped = s.logs.slice(0, 10).map((l: any) => ({
                qNum: l.questionNumber,
                logId: l.id,
                yourAnswer: l.userAnswer || '—',
                correctAnswer: l.correctAnswer || '—',
                isCorrect: l.isCorrect ?? false,
              }));
              setQuestionList(mapped);
            }

            // Populate mistakes if available
            if (s.mistakes && Array.isArray(s.mistakes) && s.mistakes.length > 0) {
              const loadedMistakes: Record<number, MistakeRecord> = {};
              s.mistakes.forEach((m: any, idx: number) => {
                const qNum = m.logId ? parseInt(m.logId.split('_q')[1] || `${idx + 1}`, 10) : idx + 2;
                loadedMistakes[qNum] = {
                  qNum,
                  id:m.id,
                  category: m.mistakeCategory || 'Distraction',
                  rootCause: m.rootCauseAnalysis || '',
                  actionPlan: m.actionPlanForImprovement || '',
                };
              });
              setMistakes((prev) => ({ ...prev, ...loadedMistakes }));
            }
          }
        })
        .catch((err) => console.warn('Could not load session from database:', err));
    }

    // Fetch vocab from API
    fetch('/api/backend/api/v1/ielts/vocab', {cache:'no-store'})
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.success && Array.isArray(json?.data) && json.data.length > 0) {
          const mappedVocab: VocabItem[] = json.data.map((v: any) => ({
            id: v.id,
            word: v.word,
            partOfSpeech: v.partOfSpeech || 'noun',
            phonetic: v.phonetic || '',
            meaning: v.primaryMeaning || '',
            contextSentence: v.contextSentence || '',
          }));
          setVocabList(mappedVocab);
        }
      })
      .catch((err) => console.warn('Could not load vocab from database:', err));
  }, []);

  const currentBand = hasRecordedScore || scoreDirty ? calculateBand(rawScore,section,testType) : null;

  const handleScoreChange = (newScore:number) => {
    setRawScore(newScore);
    setScoreDirty(true);
  };

  const handleSaveScore = async () => {
    if(!currentSessionId||revision===null||!scoreDirty){
      window.alert('Chưa có phiên hoặc dữ liệu phiên chưa hỗ trợ ghi điểm.');
      return;
    }
    const key=`kiokudo_score_req_${currentSessionId}`;
    const requestId=localStorage.getItem(key)??crypto.randomUUID();
    localStorage.setItem(key,requestId);
    try{
      const res=await fetch(`/api/backend/api/v1/ielts/sessions/${encodeURIComponent(currentSessionId)}/score`,{
        method:'PUT',credentials:'same-origin',cache:'no-store',
        headers:{'content-type':'application/json'},
        body:JSON.stringify({requestId,expectedRevision:revision,rawScore,band:calculateBand(rawScore,section,testType),source:'manual'}),
      });
      const payload:unknown=await res.json().catch(()=>null);
      if(!res.ok||!payload||typeof payload!=='object'||(payload as {success?:boolean}).success!==true)
        throw new Error('Core score write unconfirmed');
      const data=(payload as {data?:{revision?:number}}).data;
      if(typeof data?.revision!=='number')throw new Error('Revision acknowledgement missing');
      setRevision(data.revision);setHasRecordedScore(true);setScoreDirty(false);
      localStorage.removeItem(key);
      window.alert('Đã lưu điểm do bạn nhập trên Core staging.');
    }catch{window.alert('Chưa nhận xác nhận từ Core; điểm mới chưa được ghi nhận.')}
  };

  const openMistakeModal = (qNum: number) => {
    setAnalyzingQuestion(qNum);
    const existing = mistakes[qNum];
    if (existing) {
      setActiveCategory(existing.category);
      setActiveRootCause(existing.rootCause);
      setActiveActionPlan(existing.actionPlan);
    } else {
      setActiveCategory('Vocabulary');
      setActiveRootCause('');
      setActiveActionPlan('');
    }
  };

  const saveMistake = async () => {
    if(!currentSessionId||analyzingQuestion===null)return;
    const matchingLog=questionList.find(x=>x.qNum===analyzingQuestion)?.logId;
    if(!matchingLog){window.alert('Câu hỏi chưa có bản ghi trên Core.');return}
    const key=`kiokudo_mistake_${currentSessionId}_${analyzingQuestion}`;
    const existing=mistakes[analyzingQuestion];
    const eventId=existing?.id??localStorage.getItem(key)??crypto.randomUUID();
    localStorage.setItem(key,eventId);
    const body={id:eventId,sessionId:currentSessionId,logId:matchingLog,
      category:activeCategory,rootCause:activeRootCause,actionPlan:activeActionPlan};
    const url=existing?.id
      ?`/api/backend/api/v1/ielts/mistakes/${encodeURIComponent(eventId)}`
      :'/api/backend/api/v1/ielts/mistakes';
    try{
      const res=await fetch(url,{
        method:existing?.id?'PUT':'POST',credentials:'same-origin',cache:'no-store',
        headers:{'content-type':'application/json'},body:JSON.stringify(body),
      });
      const payload:unknown=await res.json().catch(()=>null);
      if(!res.ok||!payload||typeof payload!=='object'||(payload as {success?:boolean}).success!==true)
        throw new Error('Missing mistake acknowledgement');
      setMistakes(prev=>({...prev,[analyzingQuestion]:{
        id:eventId,qNum:analyzingQuestion,category:activeCategory,
        rootCause:activeRootCause,actionPlan:activeActionPlan,
      }}));
      localStorage.removeItem(key);
      setAnalyzingQuestion(null);
    }catch{window.alert('Chưa lưu được phân tích lỗi trên Core; hãy thử lại.')}
  };

  const handleAddVocab = async () => {
    if(!newWord.trim())return;
    const key=`kiokudo_vocab_req_${newWord.trim().normalize('NFC')}`;
    const eventId=localStorage.getItem(key)??crypto.randomUUID();
    localStorage.setItem(key,eventId);
    try{
      const response=await fetch('/api/backend/api/v1/ielts/vocab',{
        method:'POST',credentials:'same-origin',cache:'no-store',
        headers:{'content-type':'application/json'},
        body:JSON.stringify({id:eventId,sessionId:currentSessionId,word:newWord.trim(),
          meaning:newMeaning,partOfSpeech:newPos,phonetic:newPhonetic,contextSentence:newSentence}),
      });
      const payload:unknown=await response.json().catch(()=>null);
      if(!response.ok||!payload||typeof payload!=='object'||(payload as {success?:boolean}).success!==true)
        throw new Error('Vocab not persisted');
      setVocabList(prev=>[...prev,{id:eventId,word:newWord.trim(),partOfSpeech:newPos,
        phonetic:newPhonetic,meaning:newMeaning,contextSentence:newSentence}]);
      localStorage.removeItem(key);
      setShowVocabModal(false);
      setNewWord('');setNewMeaning('');setNewSentence('');setNewPhonetic('');
    }catch{window.alert('Chưa được Core xác nhận thêm từ vựng.')}
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1050px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2.4rem', margin: 0, color: 'var(--primary-color)', fontFamily: 'var(--font-serif)' }}>
            The Tutor's Desk &amp; Review
          </h1>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--text-color)', fontSize: '1rem' }}>
            Phân tích lỗi sai sâu sắc (Root Cause Analysis) và xây dựng kho từ vựng học thuật.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <select
            value={section}
            onChange={(e) => setSection(e.target.value as any)}
            style={{
              padding: '0.45rem 0.8rem',
              borderRadius: '6px',
              border: '1.5px solid var(--primary-color)',
              background: '#FFFFFF',
              color: 'var(--primary-color)',
              fontWeight: 'bold',
            }}
          >
            <option value="Reading">Reading</option>
            <option value="Listening">Listening</option>
          </select>

          <select
            value={testType}
            onChange={(e) => setTestType(e.target.value as any)}
            style={{
              padding: '0.45rem 0.8rem',
              borderRadius: '6px',
              border: '1.5px solid var(--primary-color)',
              background: '#FFFFFF',
              color: 'var(--primary-color)',
              fontWeight: 'bold',
            }}
          >
            <option value="academic">Academic</option>
            <option value="general">General Training</option>
          </select>

          <button
            onClick={() => setShowVocabModal(true)}
            style={{
              padding: '0.45rem 1rem',
              borderRadius: '6px',
              border: 'none',
              background: 'var(--secondary-color)',
              color: 'var(--primary-color)',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            + Trích xuất từ vựng
          </button>
        </div>
      </div>

      {/* Score Header */}
      <div className="british-border" style={{ backgroundColor: '#FFFFFF', padding: '1.75rem', marginBottom: '2rem', borderRadius: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h2 style={{ fontSize: '1.4rem', margin: 0 }}>
            Test Results: {materialTitle} ({section} · {testType.toUpperCase()})
          </h2>
          {isSynced && (
            <span style={{
              fontSize: '0.75rem',
              padding: '0.2rem 0.55rem',
              borderRadius: '12px',
              backgroundColor: '#E6F4EA',
              color: '#137333',
              fontWeight: 'bold',
            }}>
              ● Đã đọc từ Core staging
            </span>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem', alignItems: 'center' }}>
          <div style={{ padding: '1rem', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <div style={{ color: 'var(--text-color)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
              Raw Score
            </div>
            <div style={{ fontSize: '2.4rem', color: 'var(--primary-color)', fontWeight: 'bold', fontVariantNumeric: 'tabular-nums' }}>
              {rawScore} / 40
            </div>
            <input
              type="range"
              min="0"
              max="40"
              value={rawScore}
              onChange={(e) => handleScoreChange(Number(e.target.value))}
              style={{ width: '100%', marginTop: '0.5rem', accentColor: 'var(--primary-color)' }}
            />
            <button type="button" onClick={handleSaveScore}
              disabled={!currentSessionId || !scoreDirty || revision===null}
              style={{ marginTop: '0.65rem',padding: '0.45rem 0.75rem' }}>
              Lưu điểm do tôi nhập
            </button>
          </div>

          <div style={{ padding: '1rem', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <div style={{ color: 'var(--text-color)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
              Estimated Band
            </div>
            <div style={{ fontSize: '2.4rem', color: '#059669', fontWeight: 'bold', fontVariantNumeric: 'tabular-nums' }}>
              {currentBand === null ? '—' : currentBand.toFixed(1)}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#666' }}>
              Điểm ước tính theo đáp án do bạn nhập
            </div>
          </div>

          <div style={{ padding: '1rem', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <div style={{ color: 'var(--text-color)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
              Lỗi cần phân tích
            </div>
            <div style={{ fontSize: '2.4rem', color: 'var(--error-color)', fontWeight: 'bold' }}>
              {hasRecordedScore ? 40 - rawScore : '—'} câu
            </div>
            <div style={{ fontSize: '0.8rem', color: '#666' }}>
              Đã phân tích: {Object.keys(mistakes).length} lỗi
            </div>
          </div>
        </div>
      </div>

      {/* Answer Audit Table */}
      <div className="british-border" style={{ backgroundColor: '#FFFFFF', padding: '1.75rem', marginBottom: '2rem', borderRadius: '8px' }}>
        <h2 style={{ fontSize: '1.3rem', marginBottom: '1rem' }}>
          Itemized Answer Analysis (Mẫu 10 câu đầu)
        </h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--primary-color)', color: 'var(--primary-color)' }}>
                <th style={{ padding: '0.65rem' }}>Q#</th>
                <th style={{ padding: '0.65rem' }}>Your Answer</th>
                <th style={{ padding: '0.65rem' }}>Correct Answer</th>
                <th style={{ padding: '0.65rem' }}>Status</th>
                <th style={{ padding: '0.65rem' }}>Mistake Category</th>
                <th style={{ padding: '0.65rem' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {questionList.map((q) => {
                const mistake = mistakes[q.qNum];
                return (
                  <tr
                    key={q.qNum}
                    style={{
                      borderBottom: '1px solid #eee',
                      backgroundColor: q.isCorrect ? '#FFFFFF' : '#FFF9F9'
                    }}
                  >
                    <td style={{ padding: '0.65rem', fontWeight: 'bold' }}>{q.qNum}</td>
                    <td style={{ padding: '0.65rem' }}>{q.yourAnswer}</td>
                    <td style={{ padding: '0.65rem', fontWeight: 600 }}>{q.correctAnswer}</td>
                    <td style={{ padding: '0.65rem' }}>
                      {q.isCorrect ? (
                        <span style={{ color: '#059669', fontWeight: 'bold' }}>✓ Correct</span>
                      ) : (
                        <span style={{ color: 'var(--error-color)', fontWeight: 'bold' }}>✗ Incorrect</span>
                      )}
                    </td>
                    <td style={{ padding: '0.65rem' }}>
                      {!q.isCorrect && mistake ? (
                        <span style={{
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          background: '#FEE2E2',
                          color: '#991B1B',
                          fontSize: '0.8rem',
                          fontWeight: 'bold'
                        }}>
                          {mistake.category}
                        </span>
                      ) : !q.isCorrect ? (
                        <span style={{ color: '#9CA3AF', fontSize: '0.85rem' }}>Chưa phân loại</span>
                      ) : (
                        <span style={{ color: '#9CA3AF' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '0.65rem' }}>
                      {!q.isCorrect && (
                        <button
                          type="button"
                          onClick={() => openMistakeModal(q.qNum)}
                          style={{
                            backgroundColor: mistake ? 'var(--secondary-color)' : '#FFFFFF',
                            border: '1.5px solid var(--primary-color)',
                            color: 'var(--primary-color)',
                            padding: '0.3rem 0.75rem',
                            borderRadius: '4px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontSize: '0.82rem'
                          }}
                        >
                          {mistake ? 'Xem / Sửa lỗi' : 'Analyze Mistake'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vocabulary Vault (Extracted Words) */}
      <div className="british-border" style={{ backgroundColor: '#FFFFFF', padding: '1.75rem', borderRadius: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.3rem', margin: 0 }}>
            Extracted Vocabulary Vault ({vocabList.length} words)
          </h2>
          <span style={{ fontSize: '0.85rem', color: '#666' }}>
            Sẵn sàng đồng bộ sang FSRS Spaced Repetition Engine
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {vocabList.map((v) => (
            <div
              key={v.id}
              style={{
                padding: '1rem',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                background: '#FAF9F6'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary-color)', fontFamily: 'var(--font-serif)' }}>
                  {v.word}
                </span>
                <span style={{ fontSize: '0.85rem', color: '#D97706', fontStyle: 'italic' }}>
                  ({v.partOfSpeech})
                </span>
                {v.phonetic && (
                  <span style={{ fontSize: '0.85rem', color: '#6B7280' }}>
                    {v.phonetic}
                  </span>
                )}
              </div>
              <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', color: '#1F2937' }}>
                {v.meaning}
              </p>
              {v.contextSentence && (
                <div style={{
                  fontSize: '0.85rem',
                  color: '#4B5563',
                  fontStyle: 'italic',
                  paddingLeft: '0.65rem',
                  borderLeft: '2px solid var(--secondary-color)',
                  background: 'rgba(163,193,173,0.1)',
                  paddingTop: '0.2rem',
                  paddingBottom: '0.2rem'
                }}>
                  "{v.contextSentence}"
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Modal: Analyze Mistake */}
      {analyzingQuestion !== null && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1rem'
        }}>
          <div style={{
            background: '#FFFFFF',
            padding: '2rem',
            borderRadius: '10px',
            maxWidth: '560px',
            width: '100%',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            border: '2px solid var(--primary-color)'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', color: 'var(--primary-color)', fontFamily: 'var(--font-serif)', fontSize: '1.4rem' }}>
              Phân tích lỗi sai: Câu số {analyzingQuestion}
            </h3>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.35rem', fontSize: '0.9rem' }}>
                Phân loại nguyên nhân (Mistake Taxonomy):
              </label>
              <select
                value={activeCategory}
                onChange={(e) => setActiveCategory(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  border: '1px solid #D1D5DB',
                  fontSize: '0.95rem'
                }}
              >
                <option value="Comprehension">Comprehension (Đọc không hiểu ý / Nghe không ra)</option>
                <option value="Vocabulary">Vocabulary (Không nắm từ khóa then chốt / Paraphrase)</option>
                <option value="Grammar">Grammar (Sai cấu trúc thì, đại từ, mệnh đề quan hệ)</option>
                <option value="Distraction">Distraction (Sập bẫy đề thi, thông tin đối lập)</option>
                <option value="Time Management">Time Management (Thiếu thời gian, làm ẩu)</option>
                <option value="Careless">Careless (Sai chính tả, vượt quá giới hạn số từ quy định)</option>
              </select>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.35rem', fontSize: '0.9rem' }}>
                Nguyên nhân gốc rễ (Root Cause Analysis):
              </label>
              <textarea
                rows={3}
                value={activeRootCause}
                onChange={(e) => setActiveRootCause(e.target.value)}
                placeholder="Tại sao bạn lại chọn đáp án sai này? Bẫy nằm ở đâu trong bài đọc/nghe?"
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '0.9rem' }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.35rem', fontSize: '0.9rem' }}>
                Kế hoạch khắc phục (Action Plan for Improvement):
              </label>
              <textarea
                rows={3}
                value={activeActionPlan}
                onChange={(e) => setActiveActionPlan(e.target.value)}
                placeholder="Làm sao để lần sau gặp dạng bài này không bao giờ phạm lại lỗi cũ?"
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '0.9rem' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setAnalyzingQuestion(null)}
                style={{
                  padding: '0.5rem 1.25rem',
                  border: '1px solid #D1D5DB',
                  background: '#F3F4F6',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={saveMistake}
                style={{
                  padding: '0.5rem 1.5rem',
                  border: 'none',
                  background: 'var(--primary-color)',
                  color: '#FFFFFF',
                  fontWeight: 'bold',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Lưu phân tích lỗi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Vocab */}
      {showVocabModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1rem'
        }}>
          <div style={{
            background: '#FFFFFF',
            padding: '2rem',
            borderRadius: '10px',
            maxWidth: '520px',
            width: '100%',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            border: '2px solid var(--primary-color)'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', color: 'var(--primary-color)', fontFamily: 'var(--font-serif)', fontSize: '1.4rem' }}>
              Thêm Từ Vựng Vào Kho Học Thuật
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem', fontSize: '0.85rem' }}>Từ vựng (Word):</label>
                <input
                  type="text"
                  value={newWord}
                  onChange={(e) => setNewWord(e.target.value)}
                  placeholder="e.g. Inevitable"
                  style={{ width: '100%', padding: '0.45rem', borderRadius: '4px', border: '1px solid #D1D5DB' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem', fontSize: '0.85rem' }}>Từ loại (POS):</label>
                <select
                  value={newPos}
                  onChange={(e) => setNewPos(e.target.value)}
                  style={{ width: '100%', padding: '0.45rem', borderRadius: '4px', border: '1px solid #D1D5DB' }}
                >
                  <option value="noun">noun</option>
                  <option value="verb">verb</option>
                  <option value="adj">adjective</option>
                  <option value="adv">adverb</option>
                  <option value="idiom">idiom/collocation</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem', fontSize: '0.85rem' }}>Phiên âm (Phonetic):</label>
              <input
                type="text"
                value={newPhonetic}
                onChange={(e) => setNewPhonetic(e.target.value)}
                placeholder="e.g. /ɪˈnev.ɪ.tə.bəl/"
                style={{ width: '100%', padding: '0.45rem', borderRadius: '4px', border: '1px solid #D1D5DB' }}
              />
            </div>

            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem', fontSize: '0.85rem' }}>Ý nghĩa (Definition):</label>
              <textarea
                rows={2}
                value={newMeaning}
                onChange={(e) => setNewMeaning(e.target.value)}
                placeholder="Nghĩa tiếng Việt hoặc giải nghĩa Academic..."
                style={{ width: '100%', padding: '0.45rem', borderRadius: '4px', border: '1px solid #D1D5DB' }}
              />
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem', fontSize: '0.85rem' }}>Câu ngữ cảnh trong bài thi (Context Sentence):</label>
              <textarea
                rows={2}
                value={newSentence}
                onChange={(e) => setNewSentence(e.target.value)}
                placeholder="Câu chứa từ trích từ đề thi Cambridge..."
                style={{ width: '100%', padding: '0.45rem', borderRadius: '4px', border: '1px solid #D1D5DB' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setShowVocabModal(false)}
                style={{ padding: '0.5rem 1.25rem', border: '1px solid #D1D5DB', background: '#F3F4F6', borderRadius: '6px', cursor: 'pointer' }}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleAddVocab}
                style={{ padding: '0.5rem 1.5rem', border: 'none', background: 'var(--primary-color)', color: '#FFFFFF', fontWeight: 'bold', borderRadius: '6px', cursor: 'pointer' }}
              >
                Lưu vào Vocab Vault
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
