import { useMemo, useState } from 'react'
import { sound } from '../../audio/sound'
import { FeedbackPanel, ReadAloud } from '../../components/common'
import type { MistakeItem } from '../../engine/types'
import type { BoardProps } from './ChoiceBoard'

/** Splits the sentence into clickable words, keeping the wrong phrase as one token. */
function tokenize(sentence: string, wrong: string) {
  const idx = sentence.indexOf(wrong)
  const words = (s: string) => s.split(/\s+/).filter(Boolean).map((w) => ({ text: w, wrong: false }))
  if (idx < 0) return words(sentence)
  return [...words(sentence.slice(0, idx)), { text: wrong, wrong: true }, ...words(sentence.slice(idx + wrong.length))]
}

export function MistakeBoard({ item, onResult, onNext, nextLabel, extras }: BoardProps & { item: MistakeItem }) {
  const tokens = useMemo(() => tokenize(item.sentence, item.wrong), [item])
  const [tried, setTried] = useState<number[]>([])
  const [done, setDone] = useState<null | boolean>(null)
  const [hint, setHint] = useState(false)
  const maxTries = 2

  const pick = (i: number) => {
    if (done !== null || tried.includes(i)) return
    if (tokens[i].wrong) {
      sound.play('correct')
      setDone(true)
      onResult(tried.length === 0)
      return
    }
    const next = [...tried, i]
    setTried(next)
    sound.play('wrong')
    if (next.length >= maxTries) {
      setDone(false)
      onResult(false)
    }
  }

  return (
    <div className="board">
      <div className="question-card">
        <p className="tf-label">🔎 في هذه الجملة كلمة واحدة خاطئة. أين هي؟</p>
        <div className="mistake-sentence" role="group" aria-label="كلمات الجملة">
          {tokens.map((t, i) => {
            const state = done !== null && t.wrong ? 'tok-wrong-found' : tried.includes(i) ? 'tok-ok' : ''
            return (
              <button key={i} type="button" className={`tok ${state}`} onClick={() => pick(i)} disabled={done !== null || tried.includes(i)}>
                {done !== null && t.wrong ? (
                  <>
                    <s>{t.text}</s> <ins>{item.correct}</ins>
                  </>
                ) : (
                  t.text
                )}
                {tried.includes(i) && <span className="tok-note"> ✔ صحيحة</span>}
              </button>
            )
          })}
        </div>
        {item.needsReview && <span className="badge badge-warn">راجِع هذه الجملة</span>}
        <div className="q-tools">
          <ReadAloud text={item.accessible.speak} auto label="اقرأ الجملة" />
          {done === null && (
            <button type="button" className="btn btn-ghost btn-sm" disabled={hint} onClick={() => (setHint(true), sound.play('hint'))}>
              💡 تلميح
            </button>
          )}
          {done === null && <span className="muted">محاولات متبقية: {maxTries - tried.length}</span>}
        </div>
        {hint && done === null && <p className="hint">💡 {item.hint}</p>}
        {tried.length > 0 && done === null && <p className="hint">هذه الكلمة صحيحة. حاولوا مرة أخرى!</p>}
      </div>
      {done !== null && (
        <FeedbackPanel
          correct={done && tried.length === 0}
          answer={`«${item.wrong}» ← «${item.correct}»`}
          explanation={item.explanation}
          source={item.source}
          icon="🔎"
          onNext={onNext}
          nextLabel={nextLabel}
        >
          {extras?.(done && tried.length === 0)}
        </FeedbackPanel>
      )}
    </div>
  )
}
