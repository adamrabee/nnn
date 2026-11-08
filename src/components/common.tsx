import { createContext, Fragment, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { SOUND_CAPTION, sound, type SoundName } from '../audio/sound'
import { speak, speechAvailable } from '../audio/speech'
import { normalize, stripDiacritics } from '../engine/arabic'
import { useA11y } from '../state/a11y'

/* ---------------- Highlighted text ---------------- */

export const TermsContext = createContext<string[]>([])

/** Highlights lesson terms inside a text when "highlight important words" is on. */
export function RichText({ text }: { text: string }) {
  const terms = useContext(TermsContext)
  const { flags } = useA11y()
  if (!flags.highlight || terms.length === 0) return <>{text}</>
  const clean = terms
    .map(stripDiacritics)
    .filter((t) => t.length >= 2)
    .sort((a, b) => b.length - a.length)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  if (!clean.length) return <>{text}</>
  const re = new RegExp(`(${clean.join('|')})`, 'g')
  const parts = stripDiacritics(text).split(re)
  return (
    <>
      {parts.map((p, i) =>
        clean.some((t) => normalize(t.replace(/\\/g, '')) === normalize(p)) ? <mark key={i}>{p}</mark> : <Fragment key={i}>{p}</Fragment>,
      )}
    </>
  )
}

/* ---------------- Read aloud ---------------- */

export function ReadAloud({ text, auto = false, label = 'اقرأ' }: { text: string; auto?: boolean; label?: string }) {
  const { flags } = useA11y()
  const [msg, setMsg] = useState('')
  useEffect(() => {
    if (auto && flags.autoRead) {
      const t = window.setTimeout(() => speak(text), 350)
      return () => window.clearTimeout(t)
    }
  }, [text, auto, flags.autoRead])
  return (
    <span className="read-aloud">
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        aria-label={`قراءة النص بصوت مسموع: ${label}`}
        onClick={() => {
          const ok = speak(text)
          setMsg(ok ? '' : 'لا يتوفر صوت عربي في هذا المتصفح. جرّب Chrome أو Edge، أو اقرأ النص للطلاب.')
        }}
      >
        🔊 {label}
      </button>
      {msg && (
        <span className="read-aloud-msg" role="status">
          {msg}
        </span>
      )}
    </span>
  )
}

export function useSpeechAvailable() {
  const [ok, setOk] = useState(speechAvailable())
  useEffect(() => {
    const t = window.setTimeout(() => setOk(speechAvailable()), 800)
    return () => window.clearTimeout(t)
  }, [])
  return ok
}

/* ---------------- Number visuals (dyscalculia support) ---------------- */

export function NumberVisual({ math }: { math: { a: number; b: number; op: string; result: number } }) {
  const { a, b, op, result } = math
  if (op === '×' && a * b <= 60 && a <= 10 && b <= 10) {
    return (
      <div className="numvis" aria-label={`${b} مجموعات في كل منها ${a}`}>
        <div className="numvis-groups">
          {Array.from({ length: b }, (_, g) => (
            <div className="numvis-group" key={g}>
              {Array.from({ length: a }, (_, i) => (
                <span className="dot" key={i} />
              ))}
            </div>
          ))}
        </div>
        <p className="numvis-caption">
          {b} مجموعات × {a} في كل مجموعة = <strong>{result}</strong>
        </p>
      </div>
    )
  }
  if ((op === '+' || op === '-') && Math.max(a, result) <= 20) {
    const max = Math.max(a, result, op === '+' ? a + b : a)
    const from = a
    const to = result
    return (
      <div className="numvis" aria-label={`خط الأعداد من ${from} إلى ${to}`}>
        <div className="numline">
          {Array.from({ length: max + 1 }, (_, i) => {
            const inJump = op === '+' ? i > from && i <= to : i < from && i >= to
            return (
              <span key={i} className={`numline-cell ${i === from ? 'start' : ''} ${i === to ? 'end' : ''} ${inJump ? 'jump' : ''}`}>
                {i}
              </span>
            )
          })}
        </div>
        <p className="numvis-caption">
          نبدأ من {from} ونقفز {b} {op === '+' ? 'إلى الأمام' : 'إلى الخلف'} فنصل إلى <strong>{to}</strong>
        </p>
      </div>
    )
  }
  if (op === '÷' && a <= 40) {
    return (
      <div className="numvis">
        <div className="numvis-groups">
          {Array.from({ length: b }, (_, g) => (
            <div className="numvis-group" key={g}>
              {Array.from({ length: result }, (_, i) => (
                <span className="dot" key={i} />
              ))}
            </div>
          ))}
        </div>
        <p className="numvis-caption">
          نوزّع {a} على {b} مجموعات متساوية، فيكون في كل مجموعة <strong>{result}</strong>
        </p>
      </div>
    )
  }
  return (
    <p className="numvis-caption">
      {a} {op} {b} = <strong>{result}</strong>
    </p>
  )
}

/* ---------------- Timer ---------------- */

export function Timer({ seconds, resetKey, onExpire }: { seconds: number | null; resetKey: string | number; onExpire?: () => void }) {
  const { flags } = useA11y()
  const total = seconds ? seconds * (flags.extraTime ? 2 : 1) : null
  const [left, setLeft] = useState(total ?? 0)
  const [paused, setPaused] = useState(false)
  const expired = useRef(false)
  useEffect(() => {
    setLeft(total ?? 0)
    setPaused(false)
    expired.current = false
  }, [resetKey, total])
  useEffect(() => {
    if (!total || paused || left <= 0) return
    const t = window.setTimeout(() => {
      setLeft((l) => l - 1)
      if (left - 1 <= 5 && left - 1 > 0) sound.play('tick')
      if (left - 1 === 0 && !expired.current) {
        expired.current = true
        onExpire?.()
      }
    }, 1000)
    return () => window.clearTimeout(t)
  }, [left, paused, total, onExpire])
  if (!total || flags.noTimer) return null
  const pct = Math.max(0, left / total)
  return (
    <div className={`timer ${left <= 5 ? 'timer-low' : ''}`} role="timer" aria-live="off">
      <div className="timer-ring" style={{ ['--p' as string]: pct }}>
        <span>{left > 0 ? left : '⌛'}</span>
      </div>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPaused((p) => !p)} aria-label={paused ? 'استئناف المؤقت' : 'إيقاف المؤقت مؤقتًا'}>
        {paused ? '▶ استئناف' : '⏸ إيقاف'}
      </button>
      {left === 0 && <span className="timer-msg">انتهى الوقت — يمكنكم الإجابة الآن بلا خصم</span>}
    </div>
  )
}

/* ---------------- Feedback panel ---------------- */

interface FeedbackProps {
  correct: boolean
  answer?: string
  explanation: string
  source?: string
  icon?: string
  math?: { a: number; b: number; op: string; result: number }
  children?: ReactNode
  onNext: () => void
  nextLabel?: string
}

/** Explains WHY — the game teaches, it doesn't just say right/wrong. */
export function FeedbackPanel({ correct, answer, explanation, source, icon, math, children, onNext, nextLabel = 'التالي ←' }: FeedbackProps) {
  const { flags } = useA11y()
  const nextRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    nextRef.current?.focus()
  }, [])
  return (
    <section className={`feedback ${correct ? 'feedback-ok' : 'feedback-no'}`} role="status" aria-live="polite">
      <div className="feedback-head">
        <span className="feedback-mark" aria-hidden>
          {correct ? '✔' : '✖'}
        </span>
        <div>
          <h3>{correct ? 'إجابة صحيحة! أحسنتم' : 'ليست الإجابة الصحيحة هذه المرة'}</h3>
          {answer && (
            <p className="feedback-answer">
              الإجابة الصحيحة: <strong>{answer}</strong>
            </p>
          )}
        </div>
        {flags.icons && icon && (
          <span className="feedback-icon" aria-hidden>
            {icon}
          </span>
        )}
      </div>
      <div className="feedback-body">
        <p className="feedback-why">
          <span className="why-label">لماذا؟</span> <RichText text={explanation} />
        </p>
        {math && <NumberVisual math={math} />}
        {source && !flags.simplified && (
          <blockquote className="feedback-source">
            <span>📘 من الدرس:</span> {source}
          </blockquote>
        )}
        <ReadAloud text={`${correct ? 'إجابة صحيحة.' : 'الإجابة الصحيحة: ' + (answer ?? '')}. ${explanation}`} label="اقرأ الشرح" />
      </div>
      <div className="feedback-actions">
        {children}
        <button ref={nextRef} type="button" className="btn btn-primary btn-lg" onClick={onNext} data-key="next">
          {nextLabel}
        </button>
      </div>
    </section>
  )
}

/* ---------------- Captions for sounds (hearing support) ---------------- */

export function SoundCaptions() {
  const { flags } = useA11y()
  const [items, setItems] = useState<{ id: number; name: SoundName }[]>([])
  const id = useRef(0)
  useEffect(() => {
    if (!flags.captions) return
    return sound.onCue((name) => {
      if (name === 'click' || name === 'tick') return
      const k = ++id.current
      setItems((it) => [...it.slice(-2), { id: k, name }])
      window.setTimeout(() => setItems((it) => it.filter((x) => x.id !== k)), 2200)
    })
  }, [flags.captions])
  if (!flags.captions) return null
  return (
    <div className="captions" aria-live="polite">
      {items.map((i) => (
        <div key={i.id} className="caption">
          🔔 {SOUND_CAPTION[i.name]}
        </div>
      ))}
    </div>
  )
}

/* ---------------- Celebration ---------------- */

export function Confetti({ show }: { show: boolean }) {
  const { flags } = useA11y()
  if (!show || flags.reduceMotion || flags.calm) return null
  const colors = ['#6d5efc', '#f59e0b', '#10b981', '#ef4444', '#0ea5e9', '#ec4899']
  return (
    <div className="confetti" aria-hidden>
      {Array.from({ length: 36 }, (_, i) => (
        <span
          key={i}
          style={{
            insetInlineStart: `${(i * 37) % 100}%`,
            background: colors[i % colors.length],
            animationDelay: `${(i % 9) * 0.07}s`,
            animationDuration: `${1.6 + (i % 5) * 0.25}s`,
          }}
        />
      ))}
    </div>
  )
}

/** Fewer options when "simplified instructions" is on: keep the correct one + 2 others. */
export function simplifyOptions(options: string[], correctIndex: number, simplified: boolean) {
  if (!simplified || options.length <= 3) return { options, correctIndex, map: options.map((_, i) => i) }
  const keep = options.map((_, i) => i).filter((i) => i === correctIndex).concat(options.map((_, i) => i).filter((i) => i !== correctIndex).slice(0, 2))
  keep.sort((x, y) => x - y)
  return { options: keep.map((i) => options[i]), correctIndex: keep.indexOf(correctIndex), map: keep }
}
