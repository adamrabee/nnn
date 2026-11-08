import { useCallback, useEffect, useState } from 'react'
import { sound } from '../../audio/sound'
import { FeedbackPanel, ReadAloud, RichText, Timer } from '../../components/common'
import type { TrueFalseItem } from '../../engine/types'
import { useA11y } from '../../state/a11y'
import type { BoardProps } from './ChoiceBoard'

export function TrueFalseBoard({ item, onResult, onNext, nextLabel, extras, timerSeconds }: BoardProps & { item: TrueFalseItem }) {
  const { flags } = useA11y()
  const [picked, setPicked] = useState<boolean | null>(null)
  const [hint, setHint] = useState(false)

  const choose = useCallback(
    (v: boolean) => {
      if (picked !== null) return
      setPicked(v)
      const ok = v === item.isTrue
      sound.play(ok ? 'correct' : 'wrong')
      onResult(ok)
    },
    [picked, item, onResult],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (picked !== null) return
      if (e.key === '1' || e.key === 'ص') choose(true)
      if (e.key === '2' || e.key === 'خ') choose(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [choose, picked])

  const answered = picked !== null
  const ok = picked === item.isTrue
  return (
    <div className="board">
      <div className="question-card tf-card">
        <p className="tf-label">صح أم خطأ؟</p>
        {flags.icons && (
          <span className="q-icon" aria-hidden>
            {item.accessible.icon}
          </span>
        )}
        <h2 className="q-text tf-statement">
          <RichText text={item.statement} />
        </h2>
        {item.needsReview && <span className="badge badge-warn">راجِع هذه العبارة</span>}
        <div className="q-tools">
          <ReadAloud text={item.accessible.speak} auto label="اقرأ العبارة" />
          {!answered && (
            <button type="button" className="btn btn-ghost btn-sm" disabled={hint} onClick={() => (setHint(true), sound.play('hint'))}>
              💡 تلميح
            </button>
          )}
          {!answered && <Timer seconds={timerSeconds ?? null} resetKey={item.id} />}
        </div>
        {hint && !answered && <p className="hint">💡 {item.hint}</p>}
      </div>
      <div className="tf-buttons">
        <button
          type="button"
          className={`tf-btn tf-true ${answered ? (item.isTrue ? 'opt-correct' : picked ? 'opt-wrong' : 'opt-dim') : ''}`}
          onClick={() => choose(true)}
          disabled={answered}
        >
          <span className="tf-emoji" aria-hidden>
            👍
          </span>
          <span>صح</span>
          <kbd>1</kbd>
        </button>
        <button
          type="button"
          className={`tf-btn tf-false ${answered ? (!item.isTrue ? 'opt-correct' : picked === false ? 'opt-wrong' : 'opt-dim') : ''}`}
          onClick={() => choose(false)}
          disabled={answered}
        >
          <span className="tf-emoji" aria-hidden>
            👎
          </span>
          <span>خطأ</span>
          <kbd>2</kbd>
        </button>
      </div>
      {answered && (
        <FeedbackPanel
          correct={ok}
          answer={item.isTrue ? 'العبارة صحيحة' : `العبارة خاطئة — والصحيح: ${item.correction}`}
          explanation={item.explanation}
          source={item.source}
          icon={item.accessible.icon}
          onNext={onNext}
          nextLabel={nextLabel}
        >
          {extras?.(ok)}
        </FeedbackPanel>
      )}
    </div>
  )
}
