import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { sound } from '../audio/sound'
import { buildStages, pickTheme, STAGE_LABEL, type Stage } from '../engine/adventure'
import { LETTERS } from '../engine/generate'
import type { ChoiceQuestion, Difficulty, GameId, GeneratedContent, Lesson, SessionConfig } from '../engine/types'
import { ChoiceBoard, OPTION_STYLE } from './boards/ChoiceBoard'
import { MatchingBoard } from './boards/MatchingBoard'
import { MemoryBoard } from './boards/MemoryBoard'
import { MistakeBoard } from './boards/MistakeBoard'
import { ScrambleBoard } from './boards/ScrambleBoard'
import { SequenceBoard } from './boards/SequenceBoard'
import { TrueFalseBoard } from './boards/TrueFalseBoard'
import { BuildBoard, CriticalBoard, LogicBoard, MissingBoard, OddOneBoard, PatternBoard } from './boards2/ThinkingBoards'
import { CrosswordBoard, DetectiveBoard, WordSearchBoard } from './boards2/WordBoards'
import { ScoringBar } from './ScoringBar'
import { useGame } from './session'

export interface Progress {
  current: number
  total: number
}

interface RunnerProps {
  gameId: GameId
  lesson: Lesson
  content: GeneratedContent
  config: SessionConfig
  onFinish: () => void
  setProgress: (p: Progress) => void
}

function byDifficulty<T extends { difficulty: Difficulty }>(items: T[], d: SessionConfig['difficulty']): T[] {
  if (d === 'all') return items
  const exact = items.filter((i) => i.difficulty === d)
  return exact.length >= 3 ? exact : items
}

export function GameRunner(props: RunnerProps) {
  const { gameId, content, config } = props
  switch (gameId) {
    case 'knowledge-battle':
      return <Rounds {...props} items={byDifficulty(content.mcq, config.difficulty)} render={(q, p) => <ChoiceBoard key={q.id} q={q} {...p} />} label={(q) => q.concept} />
    case 'true-false':
      return <Rounds {...props} items={byDifficulty(content.trueFalse, config.difficulty)} render={(q, p) => <TrueFalseBoard key={q.id} item={q} {...p} />} label={(q) => q.concept} />
    case 'spot-mistake':
      return <Rounds {...props} items={byDifficulty(content.mistakes, config.difficulty)} render={(q, p) => <MistakeBoard key={q.id} item={q} {...p} />} label={(q) => q.concept} />
    case 'scramble':
      return <Rounds {...props} items={byDifficulty(content.scramble, config.difficulty)} render={(q, p) => <ScrambleBoard key={q.id} item={q} {...p} />} label={(q) => q.concept} />
    case 'sequence':
      return <Rounds {...props} items={content.sequences} render={(q, p) => <SequenceBoard key={q.id} item={q} {...p} />} label={(q) => q.title} />
    case 'matching':
      return <SingleBoard {...props} kind="matching" />
    case 'memory':
      return <SingleBoard {...props} kind="memory" />
    case 'millionaire':
      return <Millionaire {...props} />
    case 'escape-room':
      return <EscapeRoom {...props} />
    case 'patterns':
      return <Rounds {...props} items={content.patterns} render={(q, p) => <PatternBoard key={q.id} item={q} {...p} />} label={(q) => q.title} />
    case 'odd-one-out':
      return <Rounds {...props} items={content.oddOne} render={(q, p) => <OddOneBoard key={q.id} item={q} {...p} />} label={(q) => q.group} />
    case 'logic':
      return <Rounds {...props} items={content.logic} render={(q, p) => <LogicBoard key={q.id} item={q} {...p} />} label={(q) => q.answer} />
    case 'missing-piece':
      return <Rounds {...props} items={content.missing} render={(q, p) => <MissingBoard key={q.id} item={q} {...p} />} label={(q) => q.pieces[q.missingIndex]} />
    case 'critical':
      return <Rounds {...props} items={content.critical} render={(q, p) => <CriticalBoard key={q.id} item={q} {...p} />} label={(q) => q.scenario} />
    case 'build-answer':
      return <Rounds {...props} items={content.build} render={(q, p) => <BuildBoard key={q.id} item={q} {...p} />} label={(q) => q.prompt} />
    case 'detective':
      return <Rounds {...props} items={content.detective} render={(q, p) => <DetectiveBoard key={q.id} item={q} {...p} />} label={(q) => `قضية: ${q.culprit}`} />
    case 'crossword':
      return <SingleBoard {...props} kind="crossword" />
    case 'word-search':
      return <SingleBoard {...props} kind="word-search" />
    case 'wheel':
      return null
  }
}

type BoardCallbacks = {
  onResult: (ok: boolean) => void
  onNext: () => void
  nextLabel: string
  extras: (ok: boolean) => ReactNode
  timerSeconds: number | null
}

/** Generic "one item per round" game: scoring, turns and progress in one place. */
function Rounds<T extends { id: string }>({
  items,
  render,
  label,
  config,
  onFinish,
  setProgress,
}: RunnerProps & { items: T[]; render: (item: T, cb: BoardCallbacks) => ReactNode; label: (item: T) => string }) {
  const api = useGame()
  const list = useMemo(() => items.slice(0, config.rounds), [items, config.rounds])
  const [idx, setIdx] = useState(0)
  useEffect(() => setProgress({ current: idx + 1, total: list.length }), [idx, list.length, setProgress])
  const item = list[idx]
  if (!item) return null
  const last = idx === list.length - 1
  return (
    <>
      {render(item, {
        timerSeconds: config.timerSeconds,
        onResult: (ok) => {
          if (ok) api.correct()
          else api.wrong()
          api.record({ label: label(item), correct: ok, concept: label(item), teamId: api.activeTeam.id })
        },
        extras: (ok) => <ScoringBar correct={ok} />,
        nextLabel: last ? 'إنهاء اللعبة 🏁' : 'السؤال التالي ←',
        onNext: () => {
          sound.play('whoosh')
          if (last) return onFinish()
          api.nextTurn()
          setIdx((i) => i + 1)
        },
      })}
    </>
  )
}

function SingleBoard({ content, lesson, onFinish, setProgress, kind }: RunnerProps & { kind: 'matching' | 'memory' | 'crossword' | 'word-search' }) {
  useEffect(() => setProgress({ current: 1, total: 1 }), [setProgress])
  const common = { onResult: () => {}, onNext: onFinish, nextLabel: 'إنهاء اللعبة 🏁' }
  if (kind === 'crossword') return <CrosswordBoard words={content.words} seed={lesson.id} {...common} />
  if (kind === 'word-search') return <WordSearchBoard words={content.words} seed={lesson.id} {...common} />
  return kind === 'matching' ? <MatchingBoard pairs={content.pairs} {...common} /> : <MemoryBoard pairs={content.pairs} {...common} />
}

/* ------------------------------------------------------------------ */
/* Millionaire-style ladder ("تحدي القمة")                            */
/* ------------------------------------------------------------------ */

function Millionaire({ content, config, onFinish, setProgress }: RunnerProps) {
  const api = useGame()
  const ladder = useMemo(() => {
    const pool = [...content.mcq].sort((a, b) => a.difficulty - b.difficulty)
    return pool.slice(0, Math.min(config.rounds, 10))
  }, [content.mcq, config.rounds])
  const [idx, setIdx] = useState(0)
  const [level, setLevel] = useState(0)
  const [lifelines, setLifelines] = useState({ fifty: true, hint: true, vote: true })
  const [hidden, setHidden] = useState<number[]>([])
  const [forceHint, setForceHint] = useState(false)
  const [voting, setVoting] = useState(false)
  const [votes, setVotes] = useState<number[]>([0, 0, 0, 0])
  useEffect(() => setProgress({ current: idx + 1, total: ladder.length }), [idx, ladder.length, setProgress])
  const safe = [2, 5]
  const q: ChoiceQuestion | undefined = ladder[idx]
  if (!q) return null
  const last = idx === ladder.length - 1

  const useFifty = () => {
    const wrong = q.options.map((_, i) => i).filter((i) => i !== q.correctIndex)
    setHidden(wrong.slice(0, 2))
    setLifelines((l) => ({ ...l, fifty: false }))
    sound.play('reveal')
  }

  const top = (
    <div className="mill-top">
      <div className="ladder" aria-label="سلّم القمة">
        {ladder.map((_, i) => (
          <div key={i} className={`rung ${i === level ? 'current' : ''} ${i < level ? 'passed' : ''} ${safe.includes(i) ? 'safe' : ''}`}>
            <span>{i + 1}</span>
            {safe.includes(i) && <span className="rung-safe">🛡️</span>}
            {i < level && <span>⭐</span>}
          </div>
        ))}
        <div className={`rung summit ${level >= ladder.length ? 'current' : ''}`}>🏔️</div>
      </div>
      <div className="lifelines">
        <button type="button" className="btn btn-soft" disabled={!lifelines.fifty} onClick={useFifty}>
          ✂️ حذف إجابتين
        </button>
        <button
          type="button"
          className="btn btn-soft"
          disabled={!lifelines.hint}
          onClick={() => {
            setForceHint(true)
            setLifelines((l) => ({ ...l, hint: false }))
            sound.play('hint')
          }}
        >
          💡 تلميح المعلم
        </button>
        <button
          type="button"
          className="btn btn-soft"
          disabled={!lifelines.vote}
          onClick={() => {
            setVoting(true)
            setLifelines((l) => ({ ...l, vote: false }))
          }}
        >
          🙋 استشارة الفصل
        </button>
      </div>
      {voting && (
        <div className="vote-box">
          <p>ليرفع الطلاب أيديهم لكل اختيار، ويسجّل المعلم العدد:</p>
          <div className="vote-row">
            {q.options.map((_, i) =>
              hidden.includes(i) ? null : (
                <div key={i} className="vote-col">
                  <div className="vote-bar" style={{ height: `${Math.min(100, votes[i] * 8)}%` }} />
                  <button type="button" className={`btn btn-chip ${OPTION_STYLE[i].cls}`} onClick={() => setVotes((v) => v.map((x, k) => (k === i ? x + 1 : x)))}>
                    {OPTION_STYLE[i].shape} {LETTERS[i]} ({votes[i]}) +
                  </button>
                </div>
              ),
            )}
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setVoting(false)}>
            إغلاق التصويت
          </button>
        </div>
      )}
    </div>
  )

  return (
    <ChoiceBoard
      key={q.id}
      q={q}
      hidden={hidden}
      forceHint={forceHint}
      top={top}
      timerSeconds={config.timerSeconds}
      onResult={(ok) => {
        if (ok) {
          api.correct(undefined, 10 * (idx + 1 <= 3 ? 1 : idx + 1 <= 6 ? 2 : 3))
          setLevel((l) => l + 1)
        } else api.wrong()
        api.record({ label: q.concept, correct: ok, concept: q.concept })
      }}
      extras={(ok) => (
        <p className="muted">
          {ok ? `صعدتم إلى الدرجة ${level + 1}!` : 'لا بأس — تبقون في درجتكم وتتعلمون المعلومة. سؤال جديد الآن.'}
          {safe.includes(level) && ok ? ' 🛡️ وصلتم إلى محطة آمنة.' : ''}
        </p>
      )}
      nextLabel={last ? 'إلى القمة 🏔️' : 'الدرجة التالية ←'}
      onNext={() => {
        if (last) {
          sound.play('win')
          return onFinish()
        }
        sound.play('whoosh')
        setHidden([])
        setForceHint(false)
        setVoting(false)
        setVotes([0, 0, 0, 0])
        setIdx((i) => i + 1)
      }}
    />
  )
}

/* ------------------------------------------------------------------ */
/* Escape room adventure                                              */
/* ------------------------------------------------------------------ */

function EscapeRoom({ lesson, content, config, onFinish, setProgress }: RunnerProps) {
  const api = useGame()
  const theme = useMemo(() => pickTheme(lesson), [lesson])
  const stages = useMemo(() => buildStages(lesson, content, Math.min(6, Math.max(3, config.rounds))), [lesson, content, config.rounds])
  const code = useMemo(() => stages.map((_, i) => String((lesson.title.length * 7 + i * 3 + 1) % 10)), [stages, lesson.title])
  const [phase, setPhase] = useState<'intro' | 'map' | 'stage' | 'lock' | 'open'>('intro')
  const [idx, setIdx] = useState(0)
  const [attempt, setAttempt] = useState(0) // 0 = main item, 1 = backup item
  const [earned, setEarned] = useState<boolean[]>([])
  const [lastOk, setLastOk] = useState<boolean | null>(null)
  const [entered, setEntered] = useState<string>('')
  const [lockShake, setLockShake] = useState(false)
  useEffect(() => setProgress({ current: Math.min(idx + 1, stages.length), total: stages.length }), [idx, stages.length, setProgress])

  const stage = stages[idx]

  const onResult = (ok: boolean) => {
    setLastOk(ok)
    if (ok) api.correct()
    else api.wrong()
    api.record({ label: `${theme.stageNames[idx]}: ${STAGE_LABEL[stage.type]}`, correct: ok, concept: STAGE_LABEL[stage.type] })
  }

  const hasBackup = (s: Stage) => 'backup' in s && Boolean(s.backup)

  const afterStage = () => {
    if (!lastOk && attempt === 0 && hasBackup(stage)) {
      // One more chance with a different challenge of the same type.
      setAttempt(1)
      setLastOk(null)
      api.nextTurn()
      return
    }
    setEarned((e) => [...e, true])
    sound.play('unlock')
    setAttempt(0)
    setLastOk(null)
    if (idx === stages.length - 1) setPhase('lock')
    else {
      setIdx((i) => i + 1)
      api.nextTurn()
      setPhase('map')
    }
  }

  const nextLabel = !lastOk && attempt === 0 && stage && hasBackup(stage) ? 'محاولة ثانية بتحدٍّ آخر ←' : `خذوا الرقم ${code[idx]} 🔑`

  const boardFor = (s: Stage) => {
    const cb = { onResult, onNext: afterStage, nextLabel, timerSeconds: config.timerSeconds }
    switch (s.type) {
      case 'mcq':
        return <ChoiceBoard key={s.item.id + attempt} q={attempt && s.backup ? s.backup : s.item} {...cb} />
      case 'tf':
        return <TrueFalseBoard key={s.item.id + attempt} item={attempt && s.backup ? s.backup : s.item} {...cb} />
      case 'scramble':
        return <ScrambleBoard key={s.item.id + attempt} item={attempt && s.backup ? s.backup : s.item} {...cb} />
      case 'mistake':
        return <MistakeBoard key={s.item.id + attempt} item={attempt && s.backup ? s.backup : s.item} {...cb} />
      case 'sequence':
        return <SequenceBoard key={s.item.id} item={s.item} {...cb} />
      case 'matching':
        return <MatchingBoard pairs={s.pairs} competitive={false} {...cb} />
    }
  }

  if (phase === 'intro') {
    return (
      <div className="escape" style={{ ['--theme' as string]: theme.gradient }}>
        <div className="escape-hero">
          <span className="escape-icon" aria-hidden>
            {theme.icon}
          </span>
          <h2>{theme.title}</h2>
          <p className="escape-story">{theme.intro}</p>
          <p>
            أمامكم <strong>{stages.length}</strong> مراحل. كل مرحلة تمنحكم رقمًا من <strong>{theme.lockLabel}</strong>.
          </p>
          <button type="button" className="btn btn-primary btn-xl" autoFocus onClick={() => (sound.play('whoosh'), setPhase('map'))}>
            ابدؤوا المغامرة 🚪
          </button>
        </div>
      </div>
    )
  }

  const codeStrip = (
    <div className="code-strip" aria-label={theme.lockLabel}>
      {code.map((d, i) => (
        <span key={i} className={`code-digit ${earned[i] ? 'got' : ''}`}>
          {earned[i] ? d : '?'}
        </span>
      ))}
    </div>
  )

  if (phase === 'map') {
    return (
      <div className="escape" style={{ ['--theme' as string]: theme.gradient }}>
        <div className="escape-map">
          <h2>
            {theme.icon} {theme.title}
          </h2>
          {codeStrip}
          <ol className="stage-path">
            {stages.map((s, i) => (
              <li key={i} className={`stage-node ${i < idx ? 'done' : ''} ${i === idx ? 'current' : ''}`}>
                <span className="stage-icon" aria-hidden>
                  {i < idx ? '✅' : i === idx ? theme.stageIcons[i] : '🔒'}
                </span>
                <span className="stage-name">{theme.stageNames[i]}</span>
                <span className="stage-type">{STAGE_LABEL[s.type]}</span>
              </li>
            ))}
          </ol>
          <button type="button" className="btn btn-primary btn-xl" autoFocus onClick={() => (sound.play('whoosh'), setPhase('stage'))}>
            ادخلوا «{theme.stageNames[idx]}» ←
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'stage' && stage) {
    return (
      <div className="escape-stage">
        <div className="stage-banner" style={{ background: theme.gradient }}>
          <span>
            {theme.stageIcons[idx]} المرحلة {idx + 1}: {theme.stageNames[idx]} — {STAGE_LABEL[stage.type]}
            {attempt === 1 && ' (محاولة ثانية)'}
          </span>
          {codeStrip}
        </div>
        {boardFor(stage)}
      </div>
    )
  }

  if (phase === 'lock') {
    const pressDigit = (d: string) => {
      if (entered.length >= code.length) return
      sound.play('click')
      const next = entered + d
      setEntered(next)
      if (next.length === code.length) {
        if (next === code.join('')) {
          window.setTimeout(() => {
            sound.play('unlock')
            window.setTimeout(() => sound.play('applause'), 600)
            setPhase('open')
            api.bonus('complete')
          }, 300)
        } else {
          sound.play('wrong')
          setLockShake(true)
          window.setTimeout(() => {
            setLockShake(false)
            setEntered('')
          }, 700)
        }
      }
    }
    return (
      <div className="escape" style={{ ['--theme' as string]: theme.gradient }}>
        <div className="escape-lock">
          <h2>🔐 {theme.lockLabel}</h2>
          <p>أدخلوا الأرقام التي جمعتموها بالترتيب:</p>
          {codeStrip}
          <div className={`lock-display ${lockShake ? 'shake' : ''}`} aria-live="polite">
            {code.map((_, i) => (
              <span key={i}>{entered[i] ?? '•'}</span>
            ))}
          </div>
          <div className="keypad">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((d) => (
              <button key={d} type="button" className="key" onClick={() => pressDigit(d)}>
                {d}
              </button>
            ))}
            <button type="button" className="key key-wide" onClick={() => setEntered('')}>
              مسح
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="escape" style={{ ['--theme' as string]: theme.gradient }}>
      <div className="escape-hero">
        <span className="escape-icon big" aria-hidden>
          🚪✨
        </span>
        <h2>فُتح الباب!</h2>
        <p className="escape-story">{theme.finale}</p>
        <button type="button" className="btn btn-primary btn-xl" autoFocus onClick={onFinish}>
          إلى شاشة النتائج 🏆
        </button>
      </div>
    </div>
  )
}
