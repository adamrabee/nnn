import { useMemo, useState } from 'react'
import { sound } from '../../audio/sound'
import { FeedbackPanel, ReadAloud, RichText } from '../../components/common'
import { seededRandom, shuffle } from '../../engine/arabic'
import type { SequenceItem } from '../../engine/types'
import type { BoardProps } from './ChoiceBoard'

export function SequenceBoard({ item, onResult, onNext, nextLabel, extras }: BoardProps & { item: SequenceItem }) {
  const initial = useMemo(() => {
    const idx = item.steps.map((_, i) => i)
    const rand = seededRandom(item.id)
    let s = shuffle(idx, rand)
    for (let k = 0; k < 6 && s.every((v, i) => v === i); k++) s = shuffle(idx, rand)
    return s
  }, [item])
  const [order, setOrder] = useState<number[]>(initial)
  const [locked, setLocked] = useState<boolean[]>(() => item.steps.map(() => false))
  const [checked, setChecked] = useState<boolean[] | null>(null)
  const [attempts, setAttempts] = useState(0)
  const [done, setDone] = useState<null | boolean>(null)
  const [hint, setHint] = useState(false)
  const [dragFrom, setDragFrom] = useState<number | null>(null)

  const move = (pos: number, dir: -1 | 1) => {
    let target = pos + dir
    while (target >= 0 && target < order.length && locked[target]) target += dir
    if (target < 0 || target >= order.length || locked[pos]) return
    swap(pos, target)
  }
  const swap = (a: number, b: number) => {
    if (locked[a] || locked[b] || a === b) return
    const next = order.slice()
    ;[next[a], next[b]] = [next[b], next[a]]
    setOrder(next)
    setChecked(null)
    sound.play('click')
  }

  const check = () => {
    const res = order.map((v, i) => v === i)
    const n = attempts + 1
    setAttempts(n)
    setChecked(res)
    setLocked(res)
    if (res.every(Boolean)) {
      sound.play('correct')
      setDone(true)
      onResult(n <= 2)
    } else {
      sound.play('wrong')
    }
  }

  const reveal = () => {
    setOrder(item.steps.map((_, i) => i))
    setLocked(item.steps.map(() => true))
    setDone(false)
    sound.play('reveal')
    onResult(false)
  }

  const correctCount = checked ? checked.filter(Boolean).length : 0
  return (
    <div className="board">
      <div className="question-card">
        <p className="tf-label">🔢 رتّبوا بالتسلسل الصحيح</p>
        <h2 className="q-text">
          <RichText text={item.title} />
        </h2>
        <div className="q-tools">
          <ReadAloud text={`رتّب: ${item.title}. ${order.map((i) => item.steps[i]).join('. ')}`} auto label="اقرأ الخطوات" />
          {done === null && (
            <button type="button" className="btn btn-ghost btn-sm" disabled={hint} onClick={() => (setHint(true), sound.play('hint'))}>
              💡 تلميح
            </button>
          )}
        </div>
        {hint && done === null && <p className="hint">💡 {item.hint}</p>}
        {checked && done === null && (
          <p className="hint" role="status">
            {correctCount} من {order.length} في مكانها الصحيح ✔ — الخطوات الصحيحة ثُبّتت. أكملوا الباقي!
          </p>
        )}
      </div>

      <ol className="seq-list">
        {order.map((stepIdx, pos) => (
          <li
            key={stepIdx}
            className={`seq-item ${locked[pos] ? 'seq-locked' : ''} ${checked && !checked[pos] ? 'seq-wrong' : ''} ${dragFrom === pos ? 'seq-drag' : ''}`}
            draggable={!locked[pos] && done === null}
            onDragStart={() => setDragFrom(pos)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragFrom !== null) swap(dragFrom, pos)
              setDragFrom(null)
            }}
            onDragEnd={() => setDragFrom(null)}
          >
            <span className="seq-num">{pos + 1}</span>
            <span className="seq-text">
              <RichText text={item.steps[stepIdx]} />
            </span>
            {locked[pos] ? (
              <span className="seq-lock" aria-label="في مكانها الصحيح">
                ✔
              </span>
            ) : (
              <span className="seq-ctrl">
                <button type="button" className="btn btn-icon" onClick={() => move(pos, -1)} disabled={done !== null || pos === 0} aria-label={`تحريك «${item.steps[stepIdx]}» للأعلى`}>
                  ▲
                </button>
                <button type="button" className="btn btn-icon" onClick={() => move(pos, 1)} disabled={done !== null || pos === order.length - 1} aria-label={`تحريك «${item.steps[stepIdx]}» للأسفل`}>
                  ▼
                </button>
              </span>
            )}
          </li>
        ))}
      </ol>

      {done === null && (
        <div className="center-row">
          <button type="button" className="btn btn-primary btn-lg" onClick={check}>
            ✔ تحقّق من الترتيب
          </button>
          {attempts >= 2 && (
            <button type="button" className="btn btn-ghost" onClick={reveal}>
              👁 اكشف الترتيب الصحيح
            </button>
          )}
        </div>
      )}

      {done !== null && (
        <FeedbackPanel correct={done && attempts <= 2} answer={item.steps.join(' ← ')} explanation={item.explanation} source={item.source} icon="🔢" onNext={onNext} nextLabel={nextLabel}>
          {extras?.(done && attempts <= 2)}
        </FeedbackPanel>
      )}
    </div>
  )
}
