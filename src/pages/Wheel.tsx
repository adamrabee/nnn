import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { sound } from '../audio/sound'
import { TermsContext } from '../components/common'
import { seededRandom, shuffle } from '../engine/arabic'
import type { ChoiceQuestion, TrueFalseItem } from '../engine/types'
import { ChoiceBoard } from '../games/boards/ChoiceBoard'
import { TrueFalseBoard } from '../games/boards/TrueFalseBoard'
import { parseNames } from '../lib/roster'
import { useStore } from '../state/store'

// The class list stays on this device only (localStorage) — it is never uploaded.
// Points live for this browser tab only (sessionStorage).
const ROSTER_KEY = 'droos:roster'
const SCORE_KEY = 'droos:wheel-scores'

const SEG_COLORS = ['#102a56', '#1d4ed8', '#0f766e', '#b45309', '#334155', '#0369a1', '#4338ca', '#15803d']

function load<T>(storage: Storage, key: string, fallback: T): T {
  try {
    const raw = storage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

interface Score {
  points: number
  stars: number
}

type Question = { kind: 'mcq'; q: ChoiceQuestion } | { kind: 'tf'; q: TrueFalseItem }

function RosterEditor({ names, onSave, onClose }: { names: string[]; onSave: (n: string[]) => void; onClose: () => void }) {
  const [text, setText] = useState(names.join('\n'))
  const [msg, setMsg] = useState('')
  const parsed = parseNames(text)
  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="modal modal-wide" role="dialog" aria-modal="true" aria-label="أسماء الطلاب" onClick={(e) => e.stopPropagation()}>
        <h2>👩‍🎓 أسماء الطلاب</h2>
        <p className="muted">اكتب اسمًا في كل سطر، أو الصق عمود الأسماء من Excel، أو ارفع ملف .txt / .csv. تُحفظ الأسماء على هذا الجهاز فقط ولا تُرفع إلى أي خادم.</p>
        <textarea rows={10} value={text} onChange={(e) => setText(e.target.value)} placeholder={'أحمد\nسارة\nيوسف\n…'} aria-label="الأسماء" />
        <div className="row">
          <label className="btn btn-soft file-btn">
            📄 رفع ملف أسماء
            <input
              type="file"
              accept=".txt,.csv,text/plain,text/csv"
              onChange={async (e) => {
                const f = e.target.files?.[0]
                if (!f) return
                const t = await f.text()
                const n = parseNames(t)
                setText(n.join('\n'))
                setMsg(n.length ? `تمت قراءة ${n.length} اسمًا من الملف.` : 'لم نجد أسماء في الملف. استخدم اسمًا في كل سطر.')
              }}
            />
          </label>
          <span className="muted small">{parsed.length} اسمًا</span>
          {msg && <span className="small">{msg}</span>}
        </div>
        <div className="modal-actions row">
          <button type="button" className="btn btn-primary" disabled={parsed.length < 2} onClick={() => onSave(parsed)}>
            حفظ الأسماء
          </button>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            إلغاء
          </button>
        </div>
      </div>
    </div>
  )
}

export function Wheel() {
  const { bundle } = useStore()
  const [names, setNames] = useState<string[]>(() => load(localStorage, ROSTER_KEY, [] as string[]))
  const [scores, setScores] = useState<Record<string, Score>>(() => load(sessionStorage, SCORE_KEY, {}))
  const [editing, setEditing] = useState(false)
  const [noRepeat, setNoRepeat] = useState(true)
  const [picked, setPicked] = useState<string[]>([])
  const [angle, setAngle] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [current, setCurrent] = useState<string | null>(null)
  const [question, setQuestion] = useState<Question | null>(null)
  const [answered, setAnswered] = useState<boolean | null>(null)
  const [bonusUsed, setBonusUsed] = useState(false)
  const [sortByScore, setSortByScore] = useState(false)
  const qIndex = useRef(0)
  const raf = useRef<number | null>(null)

  useEffect(() => {
    try {
      localStorage.setItem(ROSTER_KEY, JSON.stringify(names))
    } catch {
      /* ignore */
    }
  }, [names])
  useEffect(() => {
    try {
      sessionStorage.setItem(SCORE_KEY, JSON.stringify(scores))
    } catch {
      /* ignore */
    }
  }, [scores])
  useEffect(() => () => {
    if (raf.current) cancelAnimationFrame(raf.current)
  }, [])

  const questions = useMemo<Question[]>(() => {
    if (!bundle) return []
    const all: Question[] = [...bundle.content.mcq.map((q) => ({ kind: 'mcq' as const, q })), ...bundle.content.trueFalse.map((q) => ({ kind: 'tf' as const, q }))]
    return shuffle(all, seededRandom(bundle.lesson.id + 'wheel'))
  }, [bundle])

  const seg = names.length ? 360 / names.length : 360

  const spin = () => {
    if (spinning || names.length < 2) return
    sound.unlock()
    let pool = names.map((_, i) => i)
    if (noRepeat) {
      const left = pool.filter((i) => !picked.includes(names[i]))
      pool = left.length ? left : pool
      if (!left.length) setPicked([])
    }
    const target = pool[Math.floor(Math.random() * pool.length)]
    const center = (target + 0.5) * seg
    const jitter = (Math.random() - 0.5) * seg * 0.6
    const start = angle
    const base = start - (start % 360)
    const end = base + 360 * 6 + ((360 - center + jitter) % 360 + 360) % 360
    const dur = 5200
    const t0 = performance.now()
    let lastSeg = Math.floor(start / seg)
    setSpinning(true)
    setCurrent(null)
    setQuestion(null)
    setAnswered(null)
    sound.play('spin')
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / dur)
      const eased = 1 - Math.pow(1 - t, 4)
      const a = start + (end - start) * eased
      setAngle(a)
      const s = Math.floor(a / seg)
      if (s !== lastSeg) {
        lastSeg = s
        sound.play('tick')
      }
      if (t < 1) raf.current = requestAnimationFrame(step)
      else {
        setSpinning(false)
        const name = names[target]
        setCurrent(name)
        setPicked((p) => [...p, name])
        sound.play('reveal')
        if (questions.length) {
          setQuestion(questions[qIndex.current % questions.length])
          qIndex.current++
        }
        setBonusUsed(false)
      }
    }
    raf.current = requestAnimationFrame(step)
  }

  const award = (name: string, points: number, star: boolean) =>
    setScores((s) => ({ ...s, [name]: { points: (s[name]?.points ?? 0) + points, stars: (s[name]?.stars ?? 0) + (star ? 1 : 0) } }))

  const list = sortByScore ? [...names].sort((a, b) => (scores[b]?.points ?? 0) - (scores[a]?.points ?? 0)) : names
  const best = Math.max(0, ...names.map((n) => scores[n]?.points ?? 0))
  const r = 200
  const fontSize = names.length > 24 ? 10 : names.length > 16 ? 13 : names.length > 10 ? 16 : 20

  return (
    <div className="wheel-page">
      <aside className="roster" aria-label="الطلاب والنقاط">
        <div className="roster-head">
          <h2>الطلاب ({names.length})</h2>
          <button type="button" className="btn btn-soft btn-sm" onClick={() => setEditing(true)}>
            ✏️ الأسماء
          </button>
        </div>
        {names.length === 0 ? (
          <p className="muted">لم تُضف أسماء بعد.</p>
        ) : (
          <ol className="roster-list">
            {list.map((n) => {
              const sc = scores[n] ?? { points: 0, stars: 0 }
              return (
                <li key={n} className={`${n === current ? 'current' : ''} ${noRepeat && picked.includes(n) && n !== current ? 'done' : ''}`}>
                  <span className="roster-name">
                    {sc.points > 0 && sc.points === best && <span aria-label="الأعلى نقاطًا">👑 </span>}
                    {n}
                  </span>
                  <span className="roster-stars">{sc.stars > 0 ? `⭐${sc.stars}` : ''}</span>
                  <span className="roster-points">{sc.points}</span>
                </li>
              )
            })}
          </ol>
        )}
        <div className="roster-tools">
          <label className="toggle small">
            <input type="checkbox" checked={sortByScore} onChange={(e) => setSortByScore(e.target.checked)} /> ترتيب حسب النقاط
          </label>
          <label className="toggle small">
            <input type="checkbox" checked={noRepeat} onChange={(e) => setNoRepeat(e.target.checked)} /> لا يتكرر الاسم حتى يأتي دور الجميع
          </label>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              if (window.confirm('تصفير نقاط جميع الطلاب؟')) {
                setScores({})
                setPicked([])
              }
            }}
          >
            ↺ تصفير النقاط
          </button>
        </div>
      </aside>

      <main className="wheel-main">
        <div className="wheel-top">
          <h1>🎡 عجلة التحديات</h1>
          {bundle ? (
            <span className="muted">
              أسئلة درس: <strong>{bundle.lesson.title}</strong> · <Link to="/games">تغيير اللعبة</Link>
            </span>
          ) : (
            <span className="note">
              اختر درسًا من <Link to="/">المكتبة</Link> لتظهر أسئلته بعد كل دورة.
            </span>
          )}
        </div>

        {names.length < 2 ? (
          <div className="empty">
            <p>أضف أسماء الطلاب أولًا (مرة واحدة على هذا الجهاز).</p>
            <button type="button" className="btn btn-primary btn-lg" onClick={() => setEditing(true)}>
              👩‍🎓 إضافة الأسماء
            </button>
          </div>
        ) : (
          <div className={`wheel-stage ${current ? 'has-result' : ''}`}>
            <div className="wheel-wrap">
              <div className="wheel-pointer" aria-hidden />
              <svg viewBox="-210 -210 420 420" className="wheel-svg" role="img" aria-label="عجلة أسماء الطلاب">
                <g transform={`rotate(${angle})`}>
                  {names.map((n, i) => {
                    const a0 = ((i * seg - 90) * Math.PI) / 180
                    const a1 = (((i + 1) * seg - 90) * Math.PI) / 180
                    const large = seg > 180 ? 1 : 0
                    const mid = (i + 0.5) * seg - 90
                    return (
                      <g key={n}>
                        <path
                          d={`M0 0 L${r * Math.cos(a0)} ${r * Math.sin(a0)} A${r} ${r} 0 ${large} 1 ${r * Math.cos(a1)} ${r * Math.sin(a1)} Z`}
                          fill={SEG_COLORS[i % SEG_COLORS.length]}
                          opacity={noRepeat && picked.includes(n) && n !== current ? 0.45 : 1}
                          stroke="#fff"
                          strokeWidth="2"
                        />
                        <text
                          transform={`rotate(${mid}) translate(${r * 0.62} 0) rotate(${(((mid % 360) + 360) % 360) > 90 && (((mid % 360) + 360) % 360) < 270 ? 180 : 0})`}
                          textAnchor="middle"
                          dominantBaseline="central"
                          direction="rtl"
                          fill="#fff"
                          fontSize={fontSize}
                          fontWeight="700"
                          fontFamily="IBM Plex Sans Arabic, sans-serif"
                        >
                          {n.length > 11 ? n.slice(0, 10) + '…' : n}
                        </text>
                      </g>
                    )
                  })}
                </g>
                <circle r="34" fill="#fff" stroke="#102a56" strokeWidth="4" />
                <text textAnchor="middle" dominantBaseline="central" fontSize="13" fontWeight="700" fill="#102a56" fontFamily="IBM Plex Sans Arabic, sans-serif">
                  Droos
                </text>
              </svg>
            </div>
            <button type="button" className="btn btn-primary btn-xl spin-btn" onClick={spin} disabled={spinning} autoFocus>
              {spinning ? '…' : current ? '🎡 أدر مرة أخرى' : '🎡 أدر العجلة'}
            </button>
          </div>
        )}

        {current && (
          <section className="wheel-result" aria-live="polite">
            <div className="wheel-name">
              <span>الدور على</span>
              <strong>{current}</strong>
            </div>
            {question ? (
              <TermsContext.Provider value={bundle?.analysis.terms ?? []}>
                {question.kind === 'mcq' ? (
                  <ChoiceBoard
                    key={question.q.id + current}
                    q={question.q}
                    onResult={(ok) => {
                      setAnswered(ok)
                      if (ok) award(current, 10, true)
                    }}
                    onNext={spin}
                    nextLabel="🎡 الطالب التالي"
                    extras={(ok) => <WheelBonus ok={ok} used={bonusUsed} onBonus={() => (award(current, 5, false), setBonusUsed(true), sound.play('star'))} />}
                  />
                ) : (
                  <TrueFalseBoard
                    key={question.q.id + current}
                    item={question.q}
                    onResult={(ok) => {
                      setAnswered(ok)
                      if (ok) award(current, 10, true)
                    }}
                    onNext={spin}
                    nextLabel="🎡 الطالب التالي"
                    extras={(ok) => <WheelBonus ok={ok} used={bonusUsed} onBonus={() => (award(current, 5, false), setBonusUsed(true), sound.play('star'))} />}
                  />
                )}
              </TermsContext.Provider>
            ) : (
              <div className="row center-row">
                <button type="button" className="btn btn-primary" onClick={() => (award(current, 10, true), sound.play('correct'), setAnswered(true))} disabled={answered !== null}>
                  ✔ أجاب إجابة صحيحة +10
                </button>
                <button type="button" className="btn btn-soft" onClick={() => setAnswered(false)} disabled={answered !== null}>
                  محاولة جيدة
                </button>
              </div>
            )}
          </section>
        )}
      </main>

      {editing && (
        <RosterEditor
          names={names}
          onClose={() => setEditing(false)}
          onSave={(n) => {
            setNames(n)
            setPicked([])
            setCurrent(null)
            setEditing(false)
            sound.play('stage')
          }}
        />
      )}
    </div>
  )
}

function WheelBonus({ ok, used, onBonus }: { ok: boolean; used: boolean; onBonus: () => void }) {
  if (!ok) return <span className="muted">لا بأس — المحاولة جزء من التعلم.</span>
  return (
    <button type="button" className="btn btn-soft btn-sm" disabled={used} onClick={onBonus}>
      💬 فسّر الإجابة +5
    </button>
  )
}
