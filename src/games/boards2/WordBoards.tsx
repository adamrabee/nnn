import { useEffect, useMemo, useState } from 'react'
import { sound } from '../../audio/sound'
import { FeedbackPanel, ReadAloud } from '../../components/common'
import { seededRandom, shuffle } from '../../engine/arabic'
import { buildCrossword, buildWordSearch, type CrossEntry } from '../../engine/grids'
import type { DetectiveCase, WordItem } from '../../engine/types'
import type { BoardProps } from '../boards/ChoiceBoard'
import { TrueFalseBoard } from '../boards/TrueFalseBoard'
import { useGame } from '../session'

const cellsOf = (e: CrossEntry) => [...e.word].map((_, i) => `${e.x + (e.dir === 'across' ? i : 0)},${e.y + (e.dir === 'down' ? i : 0)}`)

/* ------------------------------ Crossword ------------------------------ */

export function CrosswordBoard({ words, seed, onNext, nextLabel }: BoardProps & { words: WordItem[]; seed: string }) {
  const api = useGame()
  const cw = useMemo(() => buildCrossword(words, seed), [words, seed])
  const [solved, setSolved] = useState<number[]>([]) // entry indexes
  const [active, setActive] = useState(0)
  const [typed, setTyped] = useState('')
  const [shake, setShake] = useState(false)
  const [revealedCount, setRevealedCount] = useState<Record<number, number>>({})
  const keypad = useMemo(() => {
    const letters = new Set(words.flatMap((w) => [...w.word]))
    for (const l of 'ابتدرسعلمنهوي') letters.add(l)
    return shuffle([...letters], seededRandom(seed + 'k'))
  }, [words, seed])

  const entry = cw?.entries[active]
  const done = cw ? solved.length === cw.entries.length : false
  const solvedCells = useMemo(() => new Set(cw ? solved.flatMap((i) => cellsOf(cw.entries[i])) : []), [cw, solved])

  const submit = (value: string) => {
    if (!cw || !entry) return
    if (value === entry.word) {
      const next = [...solved, active]
      setSolved(next)
      setTyped('')
      sound.play(next.length === cw.entries.length ? 'stage' : 'correct')
      api.correct()
      api.record({ label: `كلمات متقاطعة: ${entry.term}`, correct: true, concept: entry.term })
      const nextIdx = cw.entries.findIndex((_, i) => !next.includes(i))
      if (nextIdx >= 0) setActive(nextIdx)
      api.nextTurn()
    } else {
      sound.play('wrong')
      setShake(true)
      window.setTimeout(() => {
        setShake(false)
        setTyped(entry.word.slice(0, revealedCount[active] ?? 0))
      }, 600)
      api.wrong()
      api.nextTurn()
    }
  }

  const type = (l: string) => {
    if (!entry || solved.includes(active) || typed.length >= entry.word.length) return
    sound.play('click')
    const v = typed + l
    setTyped(v)
    if (v.length === entry.word.length) window.setTimeout(() => submit(v), 250)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^[ء-ي]$/.test(e.key)) type(e.key)
      if (e.key === 'Backspace') setTyped((t) => t.slice(0, Math.max(revealedCount[active] ?? 0, t.length - 1)))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!cw) return <p className="note">لا توجد كلمات كافية لبناء شبكة لهذا الدرس.</p>

  const activeCells = entry ? cellsOf(entry) : []
  const select = (i: number) => {
    setActive(i)
    setTyped(cw.entries[i].word.slice(0, revealedCount[i] ?? 0))
    sound.play('select')
  }
  const revealLetter = () => {
    if (!entry || solved.includes(active)) return
    const n = Math.min(entry.word.length, (revealedCount[active] ?? 0) + 1)
    setRevealedCount((r) => ({ ...r, [active]: n }))
    setTyped(entry.word.slice(0, n))
    sound.play('hint')
    if (n === entry.word.length && !solved.includes(active)) {
      const next = [...solved, active]
      setSolved(next)
      setTyped('')
      api.record({ label: `كلمات متقاطعة: ${entry.term}`, correct: false, concept: entry.term })
      const nextIdx = cw.entries.findIndex((_, i) => !next.includes(i))
      if (nextIdx >= 0) setActive(nextIdx)
    }
  }

  return (
    <div className="board">
      <div className="cw-layout">
        <div className="cw-grid" style={{ gridTemplateColumns: `repeat(${cw.width}, 1fr)` }} role="grid" aria-label="شبكة الكلمات المتقاطعة">
          {Array.from({ length: cw.height }, (_, y) =>
            Array.from({ length: cw.width }, (_, x) => {
              const k = `${x},${y}`
              const letter = cw.letters[k]
              if (!letter) return <span key={k} className="cw-cell cw-empty" />
              const inActive = activeCells.indexOf(k)
              const show = solvedCells.has(k) ? letter : inActive >= 0 ? typed[inActive] ?? '' : ''
              return (
                <span key={k} className={`cw-cell ${inActive >= 0 && !done ? 'cw-active' : ''} ${solvedCells.has(k) ? 'cw-solved' : ''} ${inActive >= 0 && shake ? 'shake' : ''}`}>
                  {cw.numbers[k] && <span className="cw-num">{cw.numbers[k]}</span>}
                  {show}
                </span>
              )
            }),
          )}
        </div>
        <div className="cw-side">
          {(['across', 'down'] as const).map((dir) => (
            <div key={dir}>
              <h3>{dir === 'across' ? '↤ أفقي' : '↧ عمودي'}</h3>
              <ul className="cw-clues">
                {cw.entries.map((e, i) =>
                  e.dir !== dir ? null : (
                    <li key={i}>
                      <button type="button" className={`cw-clue ${i === active ? 'on' : ''} ${solved.includes(i) ? 'done' : ''}`} onClick={() => select(i)}>
                        <strong>{e.number}.</strong> {e.clue} <span className="muted">({e.word.length} أحرف)</span>
                        {solved.includes(i) && <span> ✔ {e.word}</span>}
                      </button>
                    </li>
                  ),
                )}
              </ul>
            </div>
          ))}
        </div>
      </div>
      {!done && entry && (
        <div className="cw-input">
          <div className="cw-typed" aria-live="polite">
            {[...entry.word].map((_, i) => (
              <span key={i} className="slot slot-sm">
                {typed[i] ?? ''}
              </span>
            ))}
          </div>
          <div className="keypad-ar">
            {keypad.map((l) => (
              <button key={l} type="button" className="key-ar" onClick={() => type(l)}>
                {l}
              </button>
            ))}
            <button type="button" className="key-ar key-wide" onClick={() => setTyped((t) => t.slice(0, Math.max(revealedCount[active] ?? 0, t.length - 1)))}>
              ⌫ حذف
            </button>
            <button type="button" className="key-ar key-wide" onClick={revealLetter}>
              🔓 اكشف حرفًا
            </button>
          </div>
          <ReadAloud text={entry.clue} label="اقرأ التعريف" />
        </div>
      )}
      {done && (
        <FeedbackPanel correct explanation="اكتملت الشبكة! راجعوا معاني الكلمات:" onNext={onNext} nextLabel={nextLabel}>
          <ul className="pair-summary">
            {cw.entries.map((e, i) => (
              <li key={i}>
                <strong>{e.term}</strong>: {e.clue}
              </li>
            ))}
          </ul>
        </FeedbackPanel>
      )}
    </div>
  )
}

/* ------------------------------ Word search ------------------------------ */

export function WordSearchBoard({ words, seed, onNext, nextLabel }: BoardProps & { words: WordItem[]; seed: string }) {
  const api = useGame()
  const ws = useMemo(() => buildWordSearch(words, seed), [words, seed])
  const [start, setStart] = useState<[number, number] | null>(null)
  const [found, setFound] = useState<number[]>([])
  const [flash, setFlash] = useState<string | null>(null)
  const [wrongCells, setWrongCells] = useState<string[]>([])
  if (!ws) return <p className="note">لا توجد كلمات كافية لهذه اللعبة.</p>
  const done = found.length === ws.placements.length
  const foundCells = new Set(found.flatMap((i) => ws.placements[i].cells.map(([x, y]) => `${x},${y}`)))

  const click = (x: number, y: number) => {
    if (done) return
    if (!start) {
      setStart([x, y])
      sound.play('select')
      return
    }
    const [x0, y0] = start
    setStart(null)
    const idx = ws.placements.findIndex((p, i) => {
      if (found.includes(i)) return false
      const a = p.cells[0]
      const b = p.cells[p.cells.length - 1]
      return (a[0] === x0 && a[1] === y0 && b[0] === x && b[1] === y) || (b[0] === x0 && b[1] === y0 && a[0] === x && a[1] === y)
    })
    if (idx >= 0) {
      const p = ws.placements[idx]
      const next = [...found, idx]
      setFound(next)
      setFlash(`✔ «${p.term}»: ${p.clue}`)
      sound.play(next.length === ws.placements.length ? 'stage' : 'match')
      api.correct()
      api.record({ label: `بحث عن الكلمات: ${p.term}`, correct: true, concept: p.term })
      api.nextTurn()
    } else {
      sound.play('wrong')
      setWrongCells([`${x0},${y0}`, `${x},${y}`])
      window.setTimeout(() => setWrongCells([]), 600)
      setFlash('ليست كلمة من القائمة. ابدؤوا من أول حرف وانتهوا عند آخر حرف.')
    }
  }

  return (
    <div className="board">
      <div className="question-card compact">
        <p className="tf-label">🔍 اضغطوا أول حرف ثم آخر حرف في الكلمة</p>
        <p className="muted">
          وجدتم {found.length} من {ws.placements.length} · الدور الآن: <strong>{api.activeTeam.name}</strong>
        </p>
        {flash && (
          <p className="match-msg ok" role="status">
            {flash}
          </p>
        )}
      </div>
      <div className="ws-layout">
        <div className="ws-grid" style={{ gridTemplateColumns: `repeat(${ws.size}, 1fr)` }} role="grid" aria-label="شبكة الحروف">
          {ws.grid.map((row, y) =>
            row.map((l, x) => {
              const k = `${x},${y}`
              return (
                <button
                  key={k}
                  type="button"
                  className={`ws-cell ${foundCells.has(k) ? 'found' : ''} ${start && start[0] === x && start[1] === y ? 'start' : ''} ${wrongCells.includes(k) ? 'wrong' : ''}`}
                  onClick={() => click(x, y)}
                  aria-label={`الحرف ${l}، الصف ${y + 1}، العمود ${x + 1}`}
                >
                  {l}
                </button>
              )
            }),
          )}
        </div>
        <ul className="ws-list">
          {ws.placements.map((p, i) => (
            <li key={i} className={found.includes(i) ? 'done' : ''}>
              <strong>{p.word}</strong>
              {found.includes(i) && <span className="muted small"> — {p.clue}</span>}
            </li>
          ))}
        </ul>
      </div>
      {done && (
        <FeedbackPanel correct explanation="وجدتم كل الكلمات! هذه معانيها من الدرس:" onNext={onNext} nextLabel={nextLabel}>
          <ul className="pair-summary">
            {ws.placements.map((p, i) => (
              <li key={i}>
                <strong>{p.term}</strong>: {p.clue}
              </li>
            ))}
          </ul>
        </FeedbackPanel>
      )}
      {!done && (
        <div className="center-row">
          <button type="button" className="btn btn-ghost" onClick={onNext}>
            إنهاء البحث الآن
          </button>
        </div>
      )}
    </div>
  )
}

/* ------------------------------ Mystery detective ------------------------------ */

export function DetectiveBoard({ item, onResult, onNext, nextLabel }: BoardProps & { item: DetectiveCase }) {
  const api = useGame()
  const [revealed, setRevealed] = useState(0)
  const [asking, setAsking] = useState(false)
  const [lastOk, setLastOk] = useState<boolean | null>(null)
  const [accused, setAccused] = useState<string | null>(null)
  const [cleared, setCleared] = useState<string[]>([])
  const ok = accused === item.culprit

  const accuse = (s: string) => {
    setAccused(s)
    const right = s === item.culprit
    sound.play(right ? 'win' : 'wrong')
    onResult(right)
    if (right) {
      const unused = item.evidence.length - revealed
      if (unused > 0) {
        api.addPoints(unused * 5)
        api.pushToast(`مكافأة المحقق: +${unused * 5} لأنكم احتجتم أدلة أقل`, '🕵️')
      }
    }
  }

  if (asking && revealed < item.evidence.length) {
    const q = item.evidence[revealed].question
    return (
      <div className="detective">
        <div className="det-banner">🕵️ سؤال التحقيق {revealed + 1}: أجيبوا لتكشفوا الدليل</div>
        <TrueFalseBoard
          key={q.id + revealed}
          item={q}
          onResult={(r) => {
            setLastOk(r)
            if (r) api.addPoints(5)
          }}
          onNext={() => {
            setRevealed((n) => n + 1)
            setAsking(false)
            sound.play('reveal')
          }}
          nextLabel="اكشف الدليل 🔎"
        />
      </div>
    )
  }

  return (
    <div className={`board detective ${accused ? 'answered' : ''}`}>
      <div className="det-case">
        <p className="tf-label">🕵️ ملف القضية</p>
        <p className="det-story">{item.story}</p>
        <ReadAloud text={item.story} label="اقرأ القضية" />
      </div>
      <div className="det-layout">
        <section>
          <h3>المشتبه بهم</h3>
          <div className="suspects">
            {item.suspects.map((s) => (
              <div key={s} className={`suspect ${cleared.includes(s) ? 'cleared' : ''} ${accused ? (s === item.culprit ? 'culprit' : s === accused ? 'no' : '') : ''}`}>
                <span className="suspect-face" aria-hidden>
                  {accused && s === item.culprit ? '🎯' : '👤'}
                </span>
                <strong>{s}</strong>
                {!accused && (
                  <span className="logic-actions">
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCleared((c) => (c.includes(s) ? c.filter((x) => x !== s) : [...c, s]))}>
                      {cleared.includes(s) ? '↺' : 'بريء؟'}
                    </button>
                    {!cleared.includes(s) && (
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => accuse(s)}>
                        ⚖️ اتّهام
                      </button>
                    )}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
        <section>
          <h3>الأدلة</h3>
          <ol className="evidence">
            {item.evidence.map((e, i) => (
              <li key={i} className={i < revealed ? 'open' : 'locked'}>
                {i < revealed ? e.clue : `🔒 دليل مغلق ${i + 1}`}
              </li>
            ))}
          </ol>
          {lastOk === false && <p className="hint">لم تكن إجابة التحقيق صحيحة، لكن الدليل كُشف لمساعدتكم.</p>}
          {!accused && revealed < item.evidence.length && (
            <button type="button" className="btn btn-soft" onClick={() => (setAsking(true), setLastOk(null), sound.play('select'))}>
              🔎 سؤال تحقيق لكشف دليل
            </button>
          )}
        </section>
      </div>
      {accused && (
        <FeedbackPanel correct={ok} answer={item.culprit} explanation={item.explanation} source={item.source} icon="🕵️" onNext={onNext} nextLabel={nextLabel} />
      )}
    </div>
  )
}
