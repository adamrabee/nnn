import { useEffect, useMemo, useRef, useState } from 'react'
import { sound } from '../../audio/sound'
import { FeedbackPanel } from '../../components/common'
import { seededRandom, shuffle } from '../../engine/arabic'
import type { PairItem } from '../../engine/types'
import { useA11y } from '../../state/a11y'
import { useGame } from '../session'
import type { BoardProps } from './ChoiceBoard'

interface Card {
  key: string
  pairId: string
  kind: 'term' | 'def'
  text: string
  icon: string
}

export function MemoryBoard({ pairs, onResult, onNext, nextLabel }: BoardProps & { pairs: PairItem[] }) {
  const { flags } = useA11y()
  const api = useGame()
  const used = useMemo(() => pairs.slice(0, flags.simplified ? 4 : 6), [pairs, flags.simplified])
  const cards = useMemo<Card[]>(
    () =>
      shuffle(
        used.flatMap((p) => [
          { key: p.id + 't', pairId: p.id, kind: 'term' as const, text: p.term, icon: p.icon },
          { key: p.id + 'd', pairId: p.id, kind: 'def' as const, text: p.match, icon: '📝' },
        ]),
        seededRandom(used.map((p) => p.id).join('|')),
      ),
    [used],
  )
  const [open, setOpen] = useState<number[]>([])
  const [matched, setMatched] = useState<string[]>([])
  const [mismatch, setMismatch] = useState(false)
  const [moves, setMoves] = useState(0)
  const hideTimer = useRef<number | null>(null)
  const done = matched.length === used.length

  const hide = () => {
    if (hideTimer.current) window.clearTimeout(hideTimer.current)
    hideTimer.current = null
    setOpen([])
    setMismatch(false)
    api.nextTurn()
  }

  useEffect(() => () => {
    if (hideTimer.current) window.clearTimeout(hideTimer.current)
  }, [])

  const flip = (i: number) => {
    if (mismatch || open.includes(i) || matched.includes(cards[i].pairId) || open.length >= 2) return
    sound.play('flip')
    const next = [...open, i]
    setOpen(next)
    if (next.length === 2) {
      setMoves((m) => m + 1)
      const [a, b] = next.map((x) => cards[x])
      if (a.pairId === b.pairId && a.kind !== b.kind) {
        window.setTimeout(() => {
          const m = [...matched, a.pairId]
          setMatched(m)
          setOpen([])
          sound.play(m.length === used.length ? 'stage' : 'match')
          api.correct()
          const term = a.kind === 'term' ? a.text : b.text
          api.record({ label: `ذاكرة: ${term}`, correct: true, concept: term })
          api.pushToast(`${api.activeTeam.name} وجد زوجًا! العبوا مرة أخرى`, '🧠')
          if (m.length === used.length) onResult(true)
        }, 500)
      } else {
        setMismatch(true)
        hideTimer.current = window.setTimeout(hide, flags.reduceMotion ? 3500 : 2600)
      }
    }
  }

  const pairOf = (id: string) => used.find((p) => p.id === id)!
  return (
    <div className="board">
      <div className="question-card compact">
        <p className="tf-label">🧠 اقلبوا بطاقتين: مصطلح 🏷️ ومعناه 📝</p>
        <p className="muted">
          الأزواج: {matched.length} / {used.length} · المحاولات: {moves}
        </p>
        {mismatch && (
          <div className="center-row">
            <span className="match-msg no">ليستا زوجًا. تذكّروا مكانهما!</span>
            <button type="button" className="btn btn-primary" onClick={hide} autoFocus>
              إخفاء البطاقتين وانتقال الدور ←
            </button>
          </div>
        )}
      </div>
      <div className={`memory-grid memory-${cards.length}`}>
        {cards.map((c, i) => {
          const isOpen = open.includes(i) || matched.includes(c.pairId)
          return (
            <button
              key={c.key}
              type="button"
              className={`mem-card ${isOpen ? 'open' : ''} ${matched.includes(c.pairId) ? 'matched' : ''} ${c.kind}`}
              onClick={() => flip(i)}
              disabled={matched.includes(c.pairId) || done}
              aria-label={isOpen ? `${c.kind === 'term' ? 'مصطلح' : 'معنى'}: ${c.text}` : `البطاقة رقم ${i + 1}`}
            >
              <span className="mem-inner">
                <span className="mem-back" aria-hidden>
                  <span className="mem-num">{i + 1}</span>
                </span>
                <span className="mem-front">
                  <span className="mem-kind" aria-hidden>
                    {c.kind === 'term' ? '🏷️' : '📝'}
                  </span>
                  {flags.icons && c.kind === 'term' && <span aria-hidden className="mem-icon">{c.icon}</span>}
                  <span className="mem-text">{c.text}</span>
                </span>
              </span>
            </button>
          )
        })}
      </div>
      {done && (
        <FeedbackPanel correct explanation={`وجدتم كل الأزواج في ${moves} محاولة.`} onNext={onNext} nextLabel={nextLabel}>
          <ul className="pair-summary">
            {matched.map((id) => (
              <li key={id}>
                <strong>{pairOf(id).term}</strong>: {pairOf(id).match}
              </li>
            ))}
          </ul>
        </FeedbackPanel>
      )}
    </div>
  )
}
