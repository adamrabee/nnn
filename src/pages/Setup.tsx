import { useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { sound } from '../audio/sound'
import { gameById } from '../engine/catalog'
import type { CompetitionMode, Difficulty, GameId, Team } from '../engine/types'
import { MODE_INFO, makeTeams } from '../games/teams'
import { useA11y } from '../state/a11y'
import { useStore } from '../state/store'

export function Setup() {
  const { gameId } = useParams<{ gameId: GameId }>()
  const nav = useNavigate()
  const { bundle, setSession } = useStore()
  const { flags } = useA11y()
  const game = gameId ? gameById(gameId) : undefined
  const [mode, setMode] = useState<CompetitionMode>(game?.category === 'adventure' ? 'cooperative' : 'teams')
  const [count, setCount] = useState(2)
  const [names, setNames] = useState<Record<string, string>>({})
  const [difficulty, setDifficulty] = useState<'all' | Difficulty>('all')
  const [timer, setTimer] = useState<number | null>(null)

  const available = useMemo(() => (game && bundle ? game.available(bundle.content).count : 0), [game, bundle])
  const maxRounds = game?.id === 'escape-room' ? 6 : game?.id === 'matching' || game?.id === 'memory' ? 1 : Math.max(1, available)
  const [rounds, setRounds] = useState(() => Math.min(maxRounds, game?.id === 'escape-room' ? 5 : 8))

  if (!bundle || !game) return <Navigate to="/games" replace />
  const av = game.available(bundle.content)
  if (!av.ok) return <Navigate to="/games" replace />

  const teams: Team[] = makeTeams(mode, count).map((t) => ({ ...t, name: names[t.id]?.trim() || t.name }))
  const singleBoard = game.id === 'matching' || game.id === 'memory'

  const start = () => {
    sound.unlock()
    sound.play('whoosh')
    setSession({ gameId: game.id, mode, teams, difficulty, rounds, timerSeconds: flags.noTimer ? null : timer })
    nav('/play')
  }

  return (
    <div className="page setup-page">
      <div className="page-head">
        <div>
          <p className="eyebrow">إعداد اللعبة</p>
          <h1>
            <span aria-hidden>{game.icon}</span> {game.name}
          </h1>
          <p className="lead">{game.tagline}</p>
        </div>
        <Link to="/games" className="btn btn-ghost">
          → ألعاب الدرس
        </Link>
      </div>

      <div className="setup-grid">
        <section className="card">
          <h2>1. طريقة المنافسة</h2>
          <div className="mode-grid" role="radiogroup" aria-label="طريقة المنافسة">
            {(Object.keys(MODE_INFO) as CompetitionMode[]).map((m) => (
              <button key={m} type="button" role="radio" aria-checked={mode === m} className={`mode-card ${mode === m ? 'on' : ''}`} onClick={() => (setMode(m), sound.play('select'))}>
                <span className="mode-icon" aria-hidden>
                  {MODE_INFO[m].icon}
                </span>
                <strong>{MODE_INFO[m].name}</strong>
                <span>{MODE_INFO[m].desc}</span>
              </button>
            ))}
          </div>

          {(mode === 'teams' || mode === 'random-team') && (
            <div className="field">
              <label>عدد الفرق</label>
              <div className="seg" role="group" aria-label="عدد الفرق">
                {[2, 3, 4, 5, 6].map((n) => (
                  <button key={n} type="button" className={count === n ? 'on' : ''} aria-pressed={count === n} onClick={() => setCount(n)}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="team-edit">
            {teams.map((t) => (
              <label key={t.id} className="team-row" style={{ ['--team' as string]: t.color }}>
                <span className="team-badge" aria-hidden>
                  {t.icon}
                  <span className="team-shape">{t.shape}</span>
                </span>
                <input value={names[t.id] ?? t.name} onChange={(e) => setNames((n) => ({ ...n, [t.id]: e.target.value }))} aria-label="اسم الفريق" maxLength={24} />
              </label>
            ))}
            <p className="muted small">أسماء الفرق مؤقتة ولا تُحفظ. استخدم أسماء الفرق وليس أسماء الطلاب.</p>
          </div>
        </section>

        <section className="card">
          <h2>2. إعدادات اللعب</h2>
          {!singleBoard && game.id !== 'sequence' && (
            <div className="field">
              <label>مستوى الصعوبة</label>
              <div className="seg" role="group" aria-label="مستوى الصعوبة">
                {(
                  [
                    ['all', 'متدرّج (الكل)'],
                    [1, 'سهل'],
                    [2, 'متوسط'],
                    [3, 'صعب'],
                  ] as const
                ).map(([v, l]) => (
                  <button key={String(v)} type="button" className={difficulty === v ? 'on' : ''} aria-pressed={difficulty === v} onClick={() => setDifficulty(v)}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          )}
          {!singleBoard && (
            <div className="field">
              <label htmlFor="rounds">
                {game.id === 'escape-room' ? 'عدد المراحل' : 'عدد الجولات'}: <strong>{Math.min(rounds, maxRounds)}</strong>
              </label>
              <input id="rounds" type="range" min={game.id === 'escape-room' ? 3 : 1} max={maxRounds} value={Math.min(rounds, maxRounds)} onChange={(e) => setRounds(Number(e.target.value))} />
              <span className="muted small">المتاح من محتوى الدرس: {game.id === 'escape-room' ? 'حتى 6 مراحل' : `${available}`}</span>
            </div>
          )}
          {!singleBoard && (
            <div className="field">
              <label>المؤقت</label>
              <div className="seg" role="group" aria-label="المؤقت">
                {[null, 30, 45, 60, 90].map((s) => (
                  <button key={String(s)} type="button" className={timer === s ? 'on' : ''} aria-pressed={timer === s} disabled={flags.noTimer && s !== null} onClick={() => setTimer(s)}>
                    {s === null ? 'بدون مؤقت' : `${s} ث`}
                  </button>
                ))}
              </div>
              <span className="muted small">
                {flags.noTimer ? 'المؤقت متوقف بسبب «وضع بلا ضغط وقت».' : 'المؤقت لا يمنح نقاطًا على السرعة، ويمكن إيقافه أثناء اللعب.'}
                {flags.extraTime && timer ? ` الوقت الفعلي: ${timer * 2} ثانية (وقت إضافي).` : ''}
              </span>
            </div>
          )}

          <h2>3. طرق المشاركة المقترحة</h2>
          <ul className="chip-list">
            {game.participation.map((p) => (
              <li key={p} className="chip">
                {p}
              </li>
            ))}
          </ul>

        </section>
      </div>

      <div className="start-bar">
        <button type="button" className="btn btn-primary btn-xl" onClick={start}>
          ▶ ابدأ اللعب على الشاشة
        </button>
      </div>
    </div>
  )
}
