import { useMemo, useState } from 'react'
import { sound } from '../../audio/sound'
import { FeedbackPanel, ReadAloud } from '../../components/common'
import { seededRandom, shuffle } from '../../engine/arabic'
import type { BuildItem, CriticalItem, LogicItem, MissingItem, OddOneItem, PatternItem } from '../../engine/types'
import type { BoardProps } from '../boards/ChoiceBoard'
import { useGame } from '../session'

/* ------------------------------ Patterns ------------------------------ */

export function PatternBoard({ item, onResult, onNext, nextLabel, extras }: BoardProps & { item: PatternItem }) {
  const [picked, setPicked] = useState<string | null>(null)
  const ok = picked === item.answer
  const pick = (o: string) => {
    if (picked) return
    setPicked(o)
    sound.play(o === item.answer ? 'correct' : 'wrong')
    onResult(o === item.answer)
  }
  const slot = (
    <span className={`pat-tile pat-slot ${picked ? (ok ? 'ok' : 'no') : ''}`} aria-label="الخانة الناقصة">
      {picked ? item.answer : '؟'}
    </span>
  )
  return (
    <div className={`board ${picked ? 'answered' : ''}`}>
      <div className="question-card">
        <p className="tf-label">🧩 اكتشاف الأنماط</p>
        <h2 className="q-text">{item.title}</h2>
        <ReadAloud text={`${item.title}. ${item.shown.join('، ')}`} auto label="اقرأ" />
      </div>
      {item.kind === 'analogy' ? (
        <div className="pat-analogy">
          <div className="pat-row">
            <span className="pat-tile">{item.shown[0]}</span>
            <span className="pat-arrow">←</span>
            <span className="pat-tile">{item.shown[1]}</span>
          </div>
          <span className="pat-sep">كما أن</span>
          <div className="pat-row">
            <span className="pat-tile">{item.shown[2]}</span>
            <span className="pat-arrow">←</span>
            {slot}
          </div>
        </div>
      ) : (
        <div className={`pat-row ${item.kind === 'numeric' ? 'pat-numeric' : ''}`}>
          {item.shown.map((s, i) => (
            <span key={i} className="pat-step">
              <span className="pat-tile">{s}</span>
              <span className="pat-arrow">←</span>
            </span>
          ))}
          {slot}
        </div>
      )}
      <div className="pick-row" role="group" aria-label="الاختيارات">
        {item.options.map((o, i) => (
          <button key={o} type="button" className={`pick ${picked === o ? (ok ? 'ok' : 'no') : picked && o === item.answer ? 'ok' : ''}`} disabled={!!picked} onClick={() => pick(o)}>
            <kbd>{i + 1}</kbd> {o}
          </button>
        ))}
      </div>
      {picked && (
        <FeedbackPanel correct={ok} answer={item.answer} explanation={`القاعدة: ${item.rule}`} source={item.source} icon="🧩" onNext={onNext} nextLabel={nextLabel}>
          {extras?.(ok)}
        </FeedbackPanel>
      )}
    </div>
  )
}

/* ------------------------------ Odd one out ------------------------------ */

export function OddOneBoard({ item, onResult, onNext, nextLabel, extras }: BoardProps & { item: OddOneItem }) {
  const [picked, setPicked] = useState<number | null>(null)
  const ok = picked === item.oddIndex
  return (
    <div className={`board ${picked !== null ? 'answered' : ''}`}>
      <div className="question-card">
        <p className="tf-label">🎯 العنصر المختلف</p>
        <h2 className="q-text">أيّ هذه العناصر لا ينتمي إلى البقية؟</h2>
        <ReadAloud text={`أي العناصر مختلف؟ ${item.items.join('، ')}`} auto label="اقرأ" />
      </div>
      <div className="odd-grid">
        {item.items.map((it, i) => (
          <button
            key={i}
            type="button"
            className={`odd-card ${picked === null ? '' : i === item.oddIndex ? 'odd' : i === picked ? 'no' : 'same'}`}
            disabled={picked !== null}
            onClick={() => {
              setPicked(i)
              sound.play(i === item.oddIndex ? 'correct' : 'wrong')
              onResult(i === item.oddIndex)
            }}
          >
            <span className="odd-num">{i + 1}</span>
            {it}
            {picked !== null && <span className="odd-tag">{i === item.oddIndex ? 'المختلف' : `من «${item.group}»`}</span>}
          </button>
        ))}
      </div>
      {picked !== null && (
        <FeedbackPanel correct={ok} answer={item.items[item.oddIndex]} explanation={item.explanation} source={item.source} icon="🎯" onNext={onNext} nextLabel={nextLabel}>
          {extras?.(ok)}
        </FeedbackPanel>
      )}
    </div>
  )
}

/* ------------------------------ Logic ------------------------------ */

export function LogicBoard({ item, onResult, onNext, nextLabel, extras }: BoardProps & { item: LogicItem }) {
  const [shownClues, setShownClues] = useState(1)
  const [crossed, setCrossed] = useState<string[]>([])
  const [answer, setAnswer] = useState<string | null>(null)
  const ok = answer === item.answer
  const choose = (c: string) => {
    setAnswer(c)
    sound.play(c === item.answer ? 'correct' : 'wrong')
    onResult(c === item.answer)
  }
  return (
    <div className={`board ${answer ? 'answered' : ''}`}>
      <div className="question-card">
        <p className="tf-label">🧠 لغز: من أنا؟</p>
        <ol className="clue-list">
          {item.clues.slice(0, shownClues).map((c, i) => (
            <li key={i}>
              <span className="clue-num">دليل {i + 1}</span> {c}
            </li>
          ))}
        </ol>
        <div className="q-tools">
          <ReadAloud text={item.clues.slice(0, shownClues).join(' ')} label="اقرأ الأدلة" />
          {!answer && shownClues < item.clues.length && (
            <button type="button" className="btn btn-soft btn-sm" onClick={() => (setShownClues((n) => n + 1), sound.play('reveal'))}>
              🔎 اكشف الدليل التالي ({shownClues}/{item.clues.length})
            </button>
          )}
        </div>
      </div>
      <p className="muted center">اضغطوا «استبعاد» على كل مرشح يتعارض مع الأدلة، ثم «هذا جوابنا».</p>
      <div className="logic-grid">
        {item.candidates.map((c) => {
          const x = crossed.includes(c)
          return (
            <div key={c} className={`logic-card ${x ? 'crossed' : ''} ${answer ? (c === item.answer ? 'ok' : c === answer ? 'no' : '') : ''}`}>
              <span className="logic-name">{c}</span>
              {!answer && (
                <span className="logic-actions">
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => (setCrossed((cs) => (x ? cs.filter((y) => y !== c) : [...cs, c])), sound.play('click'))}>
                    {x ? '↺ إرجاع' : '✕ استبعاد'}
                  </button>
                  {!x && (
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => choose(c)}>
                      ✔ هذا جوابنا
                    </button>
                  )}
                </span>
              )}
            </div>
          )
        })}
      </div>
      {answer && (
        <FeedbackPanel correct={ok} answer={item.answer} explanation={`${item.explanation} (استخدمتم ${shownClues} من ${item.clues.length} أدلة)`} source={item.source} icon="🧠" onNext={onNext} nextLabel={nextLabel}>
          {extras?.(ok)}
        </FeedbackPanel>
      )}
    </div>
  )
}

/* ------------------------------ Missing piece ------------------------------ */

export function MissingBoard({ item, onResult, onNext, nextLabel, extras }: BoardProps & { item: MissingItem }) {
  const [picked, setPicked] = useState<string | null>(null)
  const correct = item.pieces[item.missingIndex]
  const ok = picked === correct
  return (
    <div className={`board ${picked ? 'answered' : ''}`}>
      <div className="question-card">
        <p className="tf-label">🧷 القطعة المفقودة</p>
        <h2 className="q-text">أيّ قطعة تكمل الجملة؟</h2>
      </div>
      <div className="puzzle-row">
        {item.pieces.map((p, i) => (
          <span key={i} className={`piece ${i === item.missingIndex ? (picked ? (ok ? 'piece-ok' : 'piece-no') : 'piece-hole') : ''}`}>
            {i === item.missingIndex ? (picked ? correct : '؟') : p}
          </span>
        ))}
      </div>
      <div className="pick-row">
        {item.options.map((o, i) => (
          <button
            key={o}
            type="button"
            className={`piece piece-option ${picked === o ? (ok ? 'piece-ok' : 'piece-no') : ''}`}
            disabled={!!picked}
            onClick={() => {
              setPicked(o)
              sound.play(o === correct ? 'correct' : 'wrong')
              onResult(o === correct)
            }}
          >
            <kbd>{i + 1}</kbd> {o}
          </button>
        ))}
      </div>
      {picked && (
        <FeedbackPanel correct={ok} answer={correct} explanation={item.explanation} source={item.source} icon="🧷" onNext={onNext} nextLabel={nextLabel}>
          {extras?.(ok)}
        </FeedbackPanel>
      )}
    </div>
  )
}

/* ------------------------------ Critical thinking ------------------------------ */

export function CriticalBoard({ item, onResult, onNext, nextLabel }: BoardProps & { item: CriticalItem }) {
  const api = useGame()
  const [stage, setStage] = useState<'think' | 'answer'>('think')
  const [picked, setPicked] = useState<number | null>(null)
  const [ticks, setTicks] = useState<number[]>([])
  const ok = picked === item.correctIndex
  return (
    <div className={`board ${picked !== null ? 'answered' : ''}`}>
      <div className="question-card critical-card">
        <p className="tf-label">💭 ماذا لو…؟</p>
        <h2 className="q-text">{item.scenario}</h2>
        <p className="critical-q">{item.question}</p>
        <ReadAloud text={`${item.scenario} ${item.question}`} auto label="اقرأ الموقف" />
      </div>
      {stage === 'think' ? (
        <div className="think-steps">
          <div className="think-step">
            <span>1</span>فكّروا وحدكم لحظة
          </div>
          <div className="think-step">
            <span>2</span>ناقشوا مع فريقكم
          </div>
          <div className="think-step">
            <span>3</span>اختاروا ودافعوا عن رأيكم
          </div>
          <button type="button" className="btn btn-primary btn-lg" autoFocus onClick={() => (setStage('answer'), sound.play('reveal'))}>
            اعرض الاختيارات ←
          </button>
        </div>
      ) : (
        <div className="options options-4">
          {item.options.map((o, i) => (
            <button
              key={i}
              type="button"
              className={`option opt-${'abcd'[i]} ${picked === null ? '' : i === item.correctIndex ? 'opt-correct' : i === picked ? 'opt-wrong' : 'opt-dim'}`}
              disabled={picked !== null}
              onClick={() => {
                setPicked(i)
                sound.play(i === item.correctIndex ? 'correct' : 'wrong')
                onResult(i === item.correctIndex)
              }}
            >
              <span className="opt-key">{i + 1}</span>
              <span className="opt-text">{o}</span>
            </button>
          ))}
        </div>
      )}
      {picked !== null && (
        <FeedbackPanel correct={ok} answer={item.options[item.correctIndex]} explanation={item.explanation} source={item.source} icon="💭" onNext={onNext} nextLabel={nextLabel}>
          <div className="rubric">
            <strong>استمعوا لتفسير الفريق — +5 لكل فكرة صحيحة:</strong>
            {item.rubric.map((r, i) => (
              <label key={i} className="rubric-item">
                <input
                  type="checkbox"
                  checked={ticks.includes(i)}
                  disabled={ticks.includes(i)}
                  onChange={() => {
                    setTicks((t) => [...t, i])
                    api.addPoints(5)
                  }}
                />
                {r}
              </label>
            ))}
          </div>
        </FeedbackPanel>
      )}
    </div>
  )
}

/* ------------------------------ Build the answer ------------------------------ */

export function BuildBoard({ item, onResult, onNext, nextLabel, extras }: BoardProps & { item: BuildItem }) {
  const chips = useMemo(() => shuffle([...item.chunks, ...item.distractors].map((t, i) => ({ t, i })), seededRandom(item.id)), [item])
  const [built, setBuilt] = useState<number[]>([])
  const [tries, setTries] = useState(0)
  const [done, setDone] = useState<null | boolean>(null)
  const [shake, setShake] = useState(false)
  const target = item.chunks.join(' ')
  const text = built.map((i) => chips[i].t).join(' ')

  const check = () => {
    if (text === target) {
      sound.play('correct')
      setDone(true)
      onResult(tries === 0)
    } else {
      sound.play('wrong')
      setTries((t) => t + 1)
      setShake(true)
      window.setTimeout(() => setShake(false), 500)
    }
  }
  const reveal = () => {
    setBuilt(item.chunks.map((c) => chips.findIndex((ch) => ch.t === c)))
    setDone(false)
    sound.play('reveal')
    onResult(false)
  }
  return (
    <div className={`board ${done !== null ? 'answered' : ''}`}>
      <div className="question-card">
        <p className="tf-label">🧱 ابنِ الإجابة</p>
        <h2 className="q-text">{item.prompt}</h2>
        <ReadAloud text={item.prompt} auto label="اقرأ" />
      </div>
      <div className={`build-area ${shake ? 'shake' : ''}`} aria-live="polite">
        {built.length === 0 ? (
          <span className="muted">اضغطوا القطع بالترتيب لبناء الإجابة…</span>
        ) : (
          built.map((i, k) => (
            <button key={k} type="button" className="chip-built" disabled={done !== null} onClick={() => setBuilt((b) => b.filter((_, x) => x !== k))}>
              {chips[i].t}
            </button>
          ))
        )}
      </div>
      {tries > 0 && done === null && <p className="hint center">ليست صحيحة بعد. اضغطوا قطعة في الإجابة لإزالتها. (المحاولة {tries + 1})</p>}
      <div className="chip-bank">
        {chips.map((c, i) => (
          <button key={i} type="button" className="chip-src" disabled={built.includes(i) || done !== null} onClick={() => (setBuilt((b) => [...b, i]), sound.play('click'))}>
            {c.t}
          </button>
        ))}
      </div>
      {done === null && (
        <div className="center-row">
          <button type="button" className="btn btn-primary btn-lg" disabled={built.length === 0} onClick={check}>
            ✔ تحقّق
          </button>
          {tries >= 2 && (
            <button type="button" className="btn btn-ghost" onClick={reveal}>
              👁 اكشف الإجابة
            </button>
          )}
        </div>
      )}
      {done !== null && (
        <FeedbackPanel correct={done && tries === 0} answer={target} explanation={item.explanation} source={item.source} icon="🧱" onNext={onNext} nextLabel={nextLabel}>
          {extras?.(done && tries === 0)}
        </FeedbackPanel>
      )}
    </div>
  )
}
