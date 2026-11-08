import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { iconFor, uid } from '../engine/arabic'
import { LETTERS } from '../engine/generate'
import type { ChoiceQuestion, Difficulty, GeneratedContent, PairItem, TrueFalseItem } from '../engine/types'
import { useStore } from '../state/store'

type Tab = 'mcq' | 'trueFalse' | 'mistakes' | 'scramble' | 'pairs' | 'sequences'

const TABS: { id: Tab; label: string }[] = [
  { id: 'mcq', label: 'اختيار من متعدد' },
  { id: 'trueFalse', label: 'صح أم خطأ' },
  { id: 'pairs', label: 'أزواج المطابقة والذاكرة' },
  { id: 'sequences', label: 'التسلسلات' },
  { id: 'scramble', label: 'الكلمات المبعثرة' },
  { id: 'mistakes', label: 'اكتشف الخطأ' },
]

const DIFF: Record<Difficulty, string> = { 1: 'سهل', 2: 'متوسط', 3: 'صعب' }

function DiffSelect({ value, onChange }: { value: Difficulty; onChange: (d: Difficulty) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(Number(e.target.value) as Difficulty)} aria-label="مستوى الصعوبة">
      {([1, 2, 3] as Difficulty[]).map((d) => (
        <option key={d} value={d}>
          {DIFF[d]}
        </option>
      ))}
    </select>
  )
}

export function Review() {
  const { bundle, updateContent } = useStore()
  const [tab, setTab] = useState<Tab>('mcq')
  if (!bundle) return <Navigate to="/lesson" replace />
  const c = bundle.content

  function patch<K extends Tab>(key: K, id: string, change: Partial<GeneratedContent[K][number]>) {
    updateContent((cc) => ({ ...cc, [key]: (cc[key] as { id: string }[]).map((x) => (x.id === id ? { ...x, ...change, needsReview: false } : x)) }))
  }
  function remove(key: Tab, id: string) {
    updateContent((cc) => ({ ...cc, [key]: (cc[key] as { id: string }[]).filter((x) => x.id !== id) }))
  }

  const addMcq = () => {
    const q: ChoiceQuestion = {
      kind: 'mcq', id: uid('q'), prompt: 'سؤال جديد؟', options: ['الإجابة الصحيحة', 'اختيار 2', 'اختيار 3', 'اختيار 4'], correctIndex: 0,
      explanation: 'اكتب سبب صحة الإجابة.', hint: 'تلميح', difficulty: 1, concept: bundle.lesson.title, source: '',
      accessible: { simple: 'سؤال جديد؟', icon: '💡', speak: 'سؤال جديد' },
    }
    updateContent((cc) => ({ ...cc, mcq: [q, ...cc.mcq] }))
  }
  const addTf = () => {
    const t: TrueFalseItem = {
      kind: 'tf', id: uid('tf'), statement: 'عبارة جديدة', isTrue: true, correction: '', explanation: 'اكتب الشرح.', hint: '', difficulty: 1,
      concept: bundle.lesson.title, source: '', accessible: { simple: 'عبارة جديدة', icon: '💡', speak: 'عبارة جديدة' },
    }
    updateContent((cc) => ({ ...cc, trueFalse: [t, ...cc.trueFalse] }))
  }
  const addPair = () => {
    const p: PairItem = { id: uid('p'), term: 'مصطلح', match: 'معناه', source: '', icon: '💡' }
    updateContent((cc) => ({ ...cc, pairs: [p, ...cc.pairs] }))
  }

  const count = (t: Tab) => (c[t] as unknown[]).length
  const flagged = [...c.mcq, ...c.trueFalse, ...c.mistakes].filter((x) => x.needsReview).length

  return (
    <div className="page review-page">
      <div className="page-head">
        <div>
          <h1>✏️ مراجعة المحتوى وتعديله</h1>
          <p className="lead">كل ما يظهر في الألعاب موجود هنا. عدّل أي نص، أو احذف ما لا يناسب، قبل تشغيل اللعبة. التغييرات تُحفظ تلقائيًا.</p>
          {flagged > 0 && <p className="badge badge-warn">⚠️ {flagged} عنصرًا يحتاج مراجعة (لم نجد له جملة مطابقة في الدرس)</p>}
        </div>
        <Link to="/games" className="btn btn-primary">
          تم — العودة إلى الألعاب ←
        </Link>
      </div>

      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>
            {t.label} <span className="count">{count(t.id)}</span>
          </button>
        ))}
      </div>

      <div className="review-list" role="tabpanel">
        {tab === 'mcq' && (
          <>
            <button type="button" className="btn btn-soft" onClick={addMcq}>
              ＋ إضافة سؤال
            </button>
            {c.mcq.map((q, n) => (
              <article key={q.id} className={`review-item ${q.needsReview ? 'flag' : ''}`}>
                <header>
                  <span className="num">{n + 1}</span>
                  <DiffSelect value={q.difficulty} onChange={(d) => patch('mcq', q.id, { difficulty: d })} />
                  {q.needsReview && <span className="badge badge-warn">راجِع</span>}
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => remove('mcq', q.id)}>
                    🗑 حذف
                  </button>
                </header>
                <label>
                  السؤال
                  <textarea value={q.prompt} rows={2} onChange={(e) => patch('mcq', q.id, { prompt: e.target.value, accessible: { ...q.accessible, simple: e.target.value, speak: e.target.value } })} />
                </label>
                <div className="opts-edit">
                  {q.options.map((o, i) => (
                    <label key={i} className={i === q.correctIndex ? 'correct' : ''}>
                      <input type="radio" name={`c-${q.id}`} checked={i === q.correctIndex} onChange={() => patch('mcq', q.id, { correctIndex: i })} aria-label={`اجعل ${LETTERS[i]} الإجابة الصحيحة`} />
                      <span>{LETTERS[i]}</span>
                      <input value={o} onChange={(e) => patch('mcq', q.id, { options: q.options.map((x, k) => (k === i ? e.target.value : x)) })} />
                    </label>
                  ))}
                </div>
                <label>
                  الشرح (لماذا هذه الإجابة صحيحة؟)
                  <textarea value={q.explanation} rows={2} onChange={(e) => patch('mcq', q.id, { explanation: e.target.value })} />
                </label>
                <div className="field-row">
                  <label>
                    التلميح
                    <input value={q.hint} onChange={(e) => patch('mcq', q.id, { hint: e.target.value })} />
                  </label>
                  <label>
                    النسخة المبسطة (للتعليمات المبسطة)
                    <input value={q.accessible.simple} onChange={(e) => patch('mcq', q.id, { accessible: { ...q.accessible, simple: e.target.value } })} />
                  </label>
                </div>
                {q.source && <p className="muted small">📘 المصدر: {q.source}</p>}
              </article>
            ))}
          </>
        )}

        {tab === 'trueFalse' && (
          <>
            <button type="button" className="btn btn-soft" onClick={addTf}>
              ＋ إضافة عبارة
            </button>
            {c.trueFalse.map((t, n) => (
              <article key={t.id} className={`review-item ${t.needsReview ? 'flag' : ''}`}>
                <header>
                  <span className="num">{n + 1}</span>
                  <label className="inline">
                    <input type="checkbox" checked={t.isTrue} onChange={(e) => patch('trueFalse', t.id, { isTrue: e.target.checked })} /> العبارة صحيحة
                  </label>
                  {t.needsReview && <span className="badge badge-warn">راجِع</span>}
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => remove('trueFalse', t.id)}>
                    🗑 حذف
                  </button>
                </header>
                <label>
                  العبارة
                  <textarea value={t.statement} rows={2} onChange={(e) => patch('trueFalse', t.id, { statement: e.target.value, accessible: { ...t.accessible, simple: e.target.value, speak: e.target.value } })} />
                </label>
                {!t.isTrue && (
                  <label>
                    التصحيح
                    <textarea value={t.correction} rows={2} onChange={(e) => patch('trueFalse', t.id, { correction: e.target.value })} />
                  </label>
                )}
                <label>
                  الشرح
                  <textarea value={t.explanation} rows={2} onChange={(e) => patch('trueFalse', t.id, { explanation: e.target.value })} />
                </label>
              </article>
            ))}
          </>
        )}

        {tab === 'pairs' && (
          <>
            <button type="button" className="btn btn-soft" onClick={addPair}>
              ＋ إضافة زوج
            </button>
            {c.pairs.map((p) => (
              <article key={p.id} className="review-item pair-edit">
                <input value={p.term} onChange={(e) => patch('pairs', p.id, { term: e.target.value, icon: iconFor(e.target.value) })} aria-label="المصطلح" />
                <span aria-hidden>↔</span>
                <input value={p.match} onChange={(e) => patch('pairs', p.id, { match: e.target.value })} aria-label="المعنى" />
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => remove('pairs', p.id)}>
                  🗑
                </button>
              </article>
            ))}
          </>
        )}

        {tab === 'sequences' &&
          (c.sequences.length ? (
            c.sequences.map((s) => (
              <article key={s.id} className="review-item">
                <header>
                  <input value={s.title} onChange={(e) => patch('sequences', s.id, { title: e.target.value })} aria-label="عنوان التسلسل" />
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => remove('sequences', s.id)}>
                    🗑 حذف
                  </button>
                </header>
                <p className="muted small">خطوة في كل سطر، بالترتيب الصحيح:</p>
                <textarea
                  rows={Math.max(3, s.steps.length)}
                  value={s.steps.join('\n')}
                  onChange={(e) => {
                    const steps = e.target.value.split('\n')
                    patch('sequences', s.id, { steps, explanation: `الترتيب الصحيح: ${steps.filter(Boolean).join(' ← ')}.` })
                  }}
                  onBlur={() => patch('sequences', s.id, { steps: s.steps.filter((x) => x.trim()) })}
                />
              </article>
            ))
          ) : (
            <p className="muted">لا توجد تسلسلات في هذا الدرس. لإضافة تسلسل، اكتب في الدرس سطرًا مثل «مراحل …:» ثم قائمة مرقمة.</p>
          ))}

        {tab === 'scramble' &&
          c.scramble.map((w) => (
            <article key={w.id} className="review-item pair-edit">
              <input value={w.word} onChange={(e) => patch('scramble', w.id, { word: e.target.value.trim() })} aria-label="الكلمة" />
              <span aria-hidden>←</span>
              <input value={w.accessible.simple} onChange={(e) => patch('scramble', w.id, { accessible: { ...w.accessible, simple: e.target.value } })} aria-label="المعنى/الدليل" />
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => remove('scramble', w.id)}>
                🗑
              </button>
            </article>
          ))}

        {tab === 'mistakes' &&
          c.mistakes.map((m) => (
            <article key={m.id} className={`review-item ${m.needsReview ? 'flag' : ''}`}>
              <label>
                الجملة (فيها الكلمة الخاطئة)
                <textarea value={m.sentence} rows={2} onChange={(e) => patch('mistakes', m.id, { sentence: e.target.value })} />
              </label>
              <div className="field-row">
                <label>
                  الكلمة الخاطئة
                  <input value={m.wrong} onChange={(e) => patch('mistakes', m.id, { wrong: e.target.value })} />
                </label>
                <label>
                  الصحيح
                  <input value={m.correct} onChange={(e) => patch('mistakes', m.id, { correct: e.target.value })} />
                </label>
              </div>
              {!m.sentence.includes(m.wrong) && <p className="error">الكلمة الخاطئة يجب أن تظهر في الجملة كما هي.</p>}
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => remove('mistakes', m.id)}>
                🗑 حذف
              </button>
            </article>
          ))}
      </div>
    </div>
  )
}
