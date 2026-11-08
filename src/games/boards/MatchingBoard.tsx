import { useMemo, useState } from 'react'
import { sound } from '../../audio/sound'
import { FeedbackPanel, RichText } from '../../components/common'
import { seededRandom, shuffle } from '../../engine/arabic'
import type { PairItem } from '../../engine/types'
import { useA11y } from '../../state/a11y'
import { useGame } from '../session'
import type { BoardProps } from './ChoiceBoard'

interface Props extends BoardProps {
  pairs: PairItem[]
  /** In team games each attempt scores and passes the turn. */
  competitive?: boolean
}

export function MatchingBoard({ pairs, onResult, onNext, nextLabel, extras, competitive = true }: Props) {
  const { flags } = useA11y()
  const api = useGame()
  const used = useMemo(() => pairs.slice(0, flags.simplified ? 4 : 6), [pairs, flags.simplified])
  const terms = useMemo(() => shuffle(used, seededRandom(used.map((p) => p.id).join())), [used])
  const defs = useMemo(() => shuffle(used, seededRandom(used.map((p) => p.match).join())), [used])
  const [selTerm, setSelTerm] = useState<string | null>(null)
  const [selDef, setSelDef] = useState<string | null>(null)
  const [matched, setMatched] = useState<string[]>([])
  const [wrongFlash, setWrongFlash] = useState<string[]>([])
  const [lastMsg, setLastMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [errors, setErrors] = useState(0)
  const done = matched.length === used.length

  const attempt = (termId: string, defId: string) => {
    if (termId === defId) {
      const p = used.find((x) => x.id === termId)!
      const next = [...matched, termId]
      setMatched(next)
      sound.play(next.length === used.length ? 'stage' : 'match')
      setLastMsg({ ok: true, text: `«${p.term}» ← ${p.match}` })
      if (competitive) {
        api.correct()
        api.record({ label: `مطابقة: ${p.term}`, correct: true, concept: p.term })
        if (next.length < used.length) api.nextTurn()
      }
      if (next.length === used.length) onResult(errors <= Math.floor(used.length / 2))
    } else {
      sound.play('wrong')
      setErrors((e) => e + 1)
      setWrongFlash([termId, defId])
      window.setTimeout(() => setWrongFlash([]), 700)
      setLastMsg({ ok: false, text: 'ليس زوجًا صحيحًا. ينتقل الدور، وتذكّروا المحاولة!' })
      if (competitive) {
        api.wrong()
        api.nextTurn()
      }
    }
    setSelTerm(null)
    setSelDef(null)
  }

  const clickTerm = (id: string) => {
    if (matched.includes(id)) return
    sound.play('select')
    if (selDef) attempt(id, selDef)
    else setSelTerm(id === selTerm ? null : id)
  }
  const clickDef = (id: string) => {
    if (matched.includes(id)) return
    sound.play('select')
    if (selTerm) attempt(selTerm, id)
    else setSelDef(id === selDef ? null : id)
  }
  const matchNo = (id: string) => matched.indexOf(id) + 1

  return (
    <div className="board">
      <div className="question-card compact">
        <p className="tf-label">🔗 اختاروا مصطلحًا ثم معناه</p>
        <p className="muted">تمت مطابقة {matched.length} من {used.length}</p>
        {lastMsg && (
          <p className={`match-msg ${lastMsg.ok ? 'ok' : 'no'}`} role="status">
            {lastMsg.ok ? '✔ ' : '✖ '}
            {lastMsg.text}
          </p>
        )}
      </div>
      <div className="match-grid">
        <div className="match-col" role="group" aria-label="المصطلحات">
          {terms.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`match-card term ${selTerm === p.id ? 'sel' : ''} ${matched.includes(p.id) ? 'done' : ''} ${wrongFlash.includes(p.id) ? 'shake' : ''}`}
              onClick={() => clickTerm(p.id)}
              disabled={matched.includes(p.id) || done}
              aria-pressed={selTerm === p.id}
            >
              {flags.icons && <span aria-hidden>{p.icon}</span>}
              <span>
                <RichText text={p.term} />
              </span>
              {matched.includes(p.id) && <span className="match-no">{matchNo(p.id)}</span>}
            </button>
          ))}
        </div>
        <div className="match-col" role="group" aria-label="المعاني">
          {defs.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`match-card def ${selDef === p.id ? 'sel' : ''} ${matched.includes(p.id) ? 'done' : ''} ${wrongFlash.includes(p.id) ? 'shake' : ''}`}
              onClick={() => clickDef(p.id)}
              disabled={matched.includes(p.id) || done}
              aria-pressed={selDef === p.id}
            >
              <span>{p.match}</span>
              {matched.includes(p.id) && <span className="match-no">{matchNo(p.id)}</span>}
            </button>
          ))}
        </div>
      </div>
      {done && (
        <FeedbackPanel
          correct={errors <= Math.floor(used.length / 2)}
          explanation={`أكملتم اللوحة! ${errors === 0 ? 'بدون أي خطأ.' : `بعد ${errors} محاولة غير صحيحة — والمحاولة جزء من التعلم.`}`}
          onNext={onNext}
          nextLabel={nextLabel}
        >
          <ul className="pair-summary">
            {used.map((p) => (
              <li key={p.id}>
                <strong>{p.term}</strong>: {p.match}
              </li>
            ))}
          </ul>
          {extras?.(true)}
        </FeedbackPanel>
      )}
    </div>
  )
}
