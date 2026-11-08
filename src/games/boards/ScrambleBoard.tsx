import { useMemo, useState } from 'react'
import { sound } from '../../audio/sound'
import { FeedbackPanel, ReadAloud } from '../../components/common'
import { seededRandom, shuffle } from '../../engine/arabic'
import type { ScrambleItem } from '../../engine/types'
import { useA11y } from '../../state/a11y'
import type { BoardProps } from './ChoiceBoard'

export function ScrambleBoard({ item, onResult, onNext, nextLabel, extras }: BoardProps & { item: ScrambleItem }) {
  const { flags } = useA11y()
  const letters = useMemo(() => [...item.word], [item.word])
  const tiles = useMemo(() => {
    const rand = seededRandom(item.id)
    let s = shuffle(letters.map((l, i) => ({ l, i })), rand)
    for (let k = 0; k < 5 && s.map((x) => x.l).join('') === item.word; k++) s = shuffle(s, rand)
    return s
  }, [letters, item])
  const [answer, setAnswer] = useState<number[]>([]) // indices into tiles
  const [hint, setHint] = useState(false)
  const [revealed, setRevealed] = useState(0)
  const [result, setResult] = useState<null | boolean>(null)
  const [shake, setShake] = useState(false)
  const [errors, setErrors] = useState(0)

  const built = answer.map((i) => tiles[i].l).join('')

  const check = (ans: number[]) => {
    const word = ans.map((i) => tiles[i].l).join('')
    if (ans.length < letters.length) return
    if (word === item.word) {
      sound.play('correct')
      setResult(true)
      onResult(errors === 0 && revealed === 0)
    } else {
      sound.play('wrong')
      setErrors((e) => e + 1)
      setShake(true)
      window.setTimeout(() => setShake(false), 500)
    }
  }

  const add = (i: number) => {
    if (result !== null || answer.includes(i) || answer.length >= letters.length) return
    sound.play('click')
    const next = [...answer, i]
    setAnswer(next)
    check(next)
  }

  /** Tile indices spelling the first n letters of the word. */
  const solve = (n: number) => {
    const used: number[] = []
    for (let k = 0; k < n; k++) used.push(tiles.findIndex((t, ti) => t.l === letters[k] && !used.includes(ti)))
    return used
  }

  const revealLetter = () => {
    const n = revealed + 1
    setRevealed(n)
    setAnswer(solve(n))
    sound.play('hint')
    if (n >= letters.length) {
      setResult(false)
      onResult(false)
    }
  }

  const giveUp = () => {
    setAnswer(solve(letters.length))
    setResult(false)
    sound.play('reveal')
    onResult(false)
  }

  return (
    <div className="board">
      <div className="question-card">
        <p className="tf-label">🔤 رتّبوا الحروف لتكوين الكلمة</p>
        {flags.icons && (
          <span className="q-icon" aria-hidden>
            {item.accessible.icon}
          </span>
        )}
        <h2 className="q-text scramble-clue">معناها: {item.accessible.simple}</h2>
        <div className="q-tools">
          <ReadAloud text={item.accessible.speak} auto label="اقرأ المعنى" />
          {result === null && (
            <>
              <button type="button" className="btn btn-ghost btn-sm" disabled={hint} onClick={() => (setHint(true), sound.play('hint'))}>
                💡 تلميح
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={revealLetter}>
                🔓 اكشف حرفًا
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAnswer(answer.slice(0, revealed))}>
                ↺ مسح
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={giveUp}>
                👁 اكشف الكلمة
              </button>
            </>
          )}
        </div>
        {hint && result === null && <p className="hint">💡 {item.hint}</p>}
      </div>

      <div className={`slots ${shake ? 'shake' : ''}`} aria-label={`الكلمة حتى الآن: ${built || 'فارغة'}`} aria-live="polite">
        {letters.map((_, k) => (
          <button
            type="button"
            key={k}
            className={`slot ${answer[k] !== undefined ? 'slot-filled' : ''} ${result === true ? 'slot-ok' : ''}`}
            onClick={() => k >= revealed && result === null && setAnswer(answer.filter((_, x) => x !== k))}
            disabled={result !== null || answer[k] === undefined || k < revealed}
            aria-label={answer[k] !== undefined ? `إزالة الحرف ${tiles[answer[k]].l}` : 'خانة فارغة'}
          >
            {answer[k] !== undefined ? tiles[answer[k]].l : ''}
          </button>
        ))}
      </div>
      {errors > 0 && result === null && <p className="hint center">الترتيب غير صحيح بعد، اضغطوا على حرف في الخانات لإزالته وحاولوا مجددًا.</p>}

      <div className="tiles" role="group" aria-label="الحروف المبعثرة">
        {tiles.map((t, i) => (
          <button key={i} type="button" className="tile" onClick={() => add(i)} disabled={answer.includes(i) || result !== null}>
            {t.l}
          </button>
        ))}
      </div>

      {result !== null && (
        <FeedbackPanel correct={result} answer={item.word} explanation={item.explanation} source={item.source} icon={item.accessible.icon} onNext={onNext} nextLabel={nextLabel}>
          {extras?.(result)}
        </FeedbackPanel>
      )}
    </div>
  )
}
