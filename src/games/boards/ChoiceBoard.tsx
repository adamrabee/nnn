import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { sound } from '../../audio/sound'
import { FeedbackPanel, ReadAloud, RichText, simplifyOptions, Timer } from '../../components/common'
import { LETTERS } from '../../engine/generate'
import type { ChoiceQuestion } from '../../engine/types'
import { useA11y } from '../../state/a11y'

export const OPTION_STYLE = [
  { shape: '●', cls: 'opt-a' },
  { shape: '▲', cls: 'opt-b' },
  { shape: '■', cls: 'opt-c' },
  { shape: '◆', cls: 'opt-d' },
]

export interface BoardProps {
  onResult: (correct: boolean) => void
  onNext: () => void
  nextLabel?: string
  extras?: (correct: boolean) => ReactNode
  timerSeconds?: number | null
}

interface Props extends BoardProps {
  q: ChoiceQuestion
  hidden?: number[]
  forceHint?: boolean
  top?: ReactNode
}

export function ChoiceBoard({ q, onResult, onNext, nextLabel, extras, timerSeconds, hidden = [], forceHint, top }: Props) {
  const { flags } = useA11y()
  const view = simplifyOptions(q.options, q.correctIndex, flags.simplified)
  const [picked, setPicked] = useState<number | null>(null)
  const [hint, setHint] = useState(false)
  const prompt = flags.simplified ? q.accessible.simple : q.prompt

  const choose = useCallback(
    (i: number) => {
      if (picked !== null || hidden.includes(view.map[i])) return
      setPicked(i)
      const ok = i === view.correctIndex
      sound.play(ok ? 'correct' : 'wrong')
      onResult(ok)
    },
    [picked, view, hidden, onResult],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (picked !== null || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const map: Record<string, number> = { '1': 0, '2': 1, '3': 2, '4': 3, 'أ': 0, 'ب': 1, 'ج': 2, 'د': 3 }
      if (e.key in map && map[e.key] < view.options.length) {
        e.preventDefault()
        choose(map[e.key])
      }
      if (e.key.toLowerCase() === 'h' || e.key === 'ا') {
        setHint(true)
        sound.play('hint')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [choose, picked, view.options.length])

  const answered = picked !== null
  const ok = picked === view.correctIndex
  return (
    <div className={`board ${answered ? 'answered' : ''}`}>
      {top}
      <div className="question-card">
        {flags.icons && (
          <span className="q-icon" aria-hidden>
            {q.accessible.icon}
          </span>
        )}
        <h2 className="q-text">
          <RichText text={prompt} />
        </h2>
        {q.needsReview && <span className="badge badge-warn">راجِع هذا السؤال</span>}
        <div className="q-tools">
          <ReadAloud text={q.accessible.speak} auto label="اقرأ السؤال" />
          {!answered && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => (setHint(true), sound.play('hint'))} disabled={hint || forceHint}>
              💡 تلميح
            </button>
          )}
          {!answered && <Timer seconds={timerSeconds ?? null} resetKey={q.id} />}
        </div>
        {(hint || forceHint) && !answered && <p className="hint">💡 {q.hint}</p>}
      </div>

      <div className={`options options-${view.options.length}`} role="group" aria-label="الاختيارات">
        {view.options.map((opt, i) => {
          const isHidden = hidden.includes(view.map[i])
          const state = !answered ? '' : i === view.correctIndex ? 'opt-correct' : i === picked ? 'opt-wrong' : 'opt-dim'
          return (
            <button
              key={i}
              type="button"
              className={`option ${OPTION_STYLE[i].cls} ${state}`}
              onClick={() => choose(i)}
              disabled={answered || isHidden}
              aria-label={`${LETTERS[i]}: ${opt}`}
              style={isHidden ? { visibility: 'hidden' } : undefined}
            >
              <span className="opt-key" aria-hidden>
                <span className="opt-shape">{OPTION_STYLE[i].shape}</span>
                {LETTERS[i]}
              </span>
              <span className="opt-text">{opt}</span>
              {answered && i === view.correctIndex && <span className="opt-mark">✔</span>}
              {answered && i === picked && i !== view.correctIndex && <span className="opt-mark">✖</span>}
            </button>
          )
        })}
      </div>

      {answered && (
        <FeedbackPanel
          correct={ok}
          answer={q.options[q.correctIndex]}
          explanation={q.explanation}
          source={q.source}
          icon={q.accessible.icon}
          math={q.math}
          onNext={onNext}
          nextLabel={nextLabel}
        >
          {extras?.(ok)}
        </FeedbackPanel>
      )}
    </div>
  )
}
