import { useCallback, useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { sound } from '../audio/sound'
import { TermsContext } from '../components/common'
import { gameById } from '../engine/catalog'
import { GameRunner, type Progress } from '../games/games'
import { GameSessionProvider, useGame } from '../games/session'
import { MODE_INFO } from '../games/teams'
import { useA11y } from '../state/a11y'
import { useStore } from '../state/store'

export function Play() {
  const { session, bundle } = useStore()
  if (!session || !bundle) return <Navigate to="/games" replace />
  return (
    <TermsContext.Provider value={bundle.analysis.terms}>
      <GameSessionProvider initialTeams={session.teams} mode={session.mode}>
        <PlayScreen />
      </GameSessionProvider>
    </TermsContext.Provider>
  )
}

function Scoreboard() {
  const api = useGame()
  const { flags } = useA11y()
  const max = Math.max(1, ...api.teams.map((t) => t.score))
  return (
    <aside className="scoreboard" aria-label="نقاط الفرق">
      {api.teams.map((t) => {
        const active = t.id === api.activeTeam.id && api.teams.length > 1
        return (
          <div key={t.id} className={`team-card ${active ? 'active' : ''} ${api.rolling && active ? 'rolling' : ''}`} style={{ ['--team' as string]: t.color }}>
            <div className="team-card-head">
              <span className="team-badge" aria-hidden>
                {t.icon}
                <span className="team-shape">{t.shape}</span>
              </span>
              <span className="team-name">{t.name}</span>
              {active && <span className="turn-tag">دوركم</span>}
            </div>
            <div className="team-score" aria-label={`${t.score} نقطة`}>
              {t.score}
              <small> نقطة</small>
            </div>
            {!flags.focus && (
              <>
                <div className="team-bar" aria-hidden>
                  <span style={{ width: `${(t.score / max) * 100}%` }} />
                </div>
                <div className="team-meta">
                  <span title="النجوم">⭐ {t.stars}</span>
                  {t.streak >= 2 && <span title="سلسلة إجابات صحيحة">🔥 {t.streak}</span>}
                  <span className="team-badges">
                    {t.badges.map((b) => (
                      <span key={b} aria-hidden>
                        {{ first: '🌟', streak3: '🔥', explain: '💬', teamwork: '🤝', persist: '💪', complete: '🏁' }[b]}
                      </span>
                    ))}
                  </span>
                </div>
              </>
            )}
          </div>
        )
      })}
    </aside>
  )
}

function PlayScreen() {
  const nav = useNavigate()
  const { session, bundle, setLastRun } = useStore()
  const { flags, setFlag } = useA11y()
  const api = useGame()
  const game = gameById(session!.gameId)
  const [phase, setPhase] = useState<'howto' | 'play'>('howto')
  const [progress, setProgress] = useState<Progress>({ current: 0, total: 0 })
  const [confirmExit, setConfirmExit] = useState(false)
  const [full, setFull] = useState(Boolean(document.fullscreenElement))
  const [runKey, setRunKey] = useState(0)

  const toggleFull = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void document.documentElement.requestFullscreen?.().catch(() => {})
  }, [])

  useEffect(() => {
    const onFs = () => setFull(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onFs)
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'f' || e.key === 'F') toggleFull()
      if (e.key === 'm') setFlag('effects', !flags.effects)
      if (e.key === 'Escape' && !document.fullscreenElement) setConfirmExit((c) => !c)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('fullscreenchange', onFs)
      window.removeEventListener('keydown', onKey)
    }
  }, [toggleFull, setFlag, flags.effects])

  const finish = useCallback(() => {
    setLastRun({ teams: api.teams, results: api.results })
    sound.play('win')
    nav('/end')
  }, [api.teams, api.results, nav, setLastRun])

  const restart = () => {
    api.resetScores()
    setRunKey((k) => k + 1)
    setPhase('howto')
    setConfirmExit(false)
  }

  return (
    <div className={`play ${flags.focus ? 'play-focus' : ''}`} style={{ ['--g' as string]: game.color }}>
      <header className="play-bar">
        <div className="play-title">
          <span className="play-icon" aria-hidden>
            {game.icon}
          </span>
          <div>
            <strong>{game.name}</strong>
            <span className="muted small">
              {bundle!.lesson.title} · {MODE_INFO[session!.mode].name}
            </span>
          </div>
        </div>
        {phase === 'play' && progress.total > 1 && (
          <div className="progress" aria-label={`الجولة ${progress.current} من ${progress.total}`}>
            <span className="progress-label">
              {progress.current} / {progress.total}
            </span>
            <div className="progress-segs">
              {Array.from({ length: progress.total }, (_, i) => (
                <span key={i} className={i < progress.current - 1 ? 'done' : i === progress.current - 1 ? 'now' : ''} />
              ))}
            </div>
          </div>
        )}
        <div className="play-tools">
          {session!.mode === 'random-team' && phase === 'play' && (
            <button type="button" className="btn btn-soft btn-sm" onClick={api.pickRandomTeam} disabled={api.rolling}>
              🎲 اختر فريقًا
            </button>
          )}
          <button type="button" className={`btn btn-icon ${flags.effects ? '' : 'off'}`} onClick={() => setFlag('effects', !flags.effects)} aria-label={flags.effects ? 'كتم المؤثرات الصوتية' : 'تشغيل المؤثرات الصوتية'} aria-pressed={flags.effects}>
            {flags.effects ? '🔊' : '🔇'}
          </button>
          <button type="button" className={`btn btn-icon ${flags.music ? '' : 'off'}`} onClick={() => setFlag('music', !flags.music)} aria-label={flags.music ? 'إيقاف الموسيقى' : 'تشغيل الموسيقى'} aria-pressed={flags.music} disabled={flags.calm}>
            🎵
          </button>
          <button type="button" className="btn btn-icon" onClick={toggleFull} aria-label={full ? 'الخروج من ملء الشاشة' : 'ملء الشاشة'}>
            {full ? '🗗' : '⛶'}
          </button>
          <button type="button" className="btn btn-soft btn-sm" onClick={() => setConfirmExit(true)}>
            ☰ القائمة
          </button>
        </div>
      </header>

      <div className="play-body">
        <Scoreboard />
        <div className="play-main">
          {phase === 'howto' ? (
            <HowTo onStart={() => (sound.play('whoosh'), setPhase('play'))} />
          ) : (
            <GameRunner key={runKey} gameId={session!.gameId} lesson={bundle!.lesson} content={bundle!.content} config={session!} onFinish={finish} setProgress={setProgress} />
          )}
        </div>
      </div>

      <div className="toasts" aria-live="polite">
        {api.toasts.map((t) => (
          <div key={t.id} className="toast">
            <span aria-hidden>{t.icon}</span> {t.text}
          </div>
        ))}
      </div>

      {confirmExit && (
        <div className="drawer-backdrop" onClick={() => setConfirmExit(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-label="قائمة اللعبة" onClick={(e) => e.stopPropagation()}>
            <h2>قائمة اللعبة</h2>
            <div className="modal-actions">
              <button type="button" className="btn btn-primary" autoFocus onClick={() => setConfirmExit(false)}>
                ▶ متابعة اللعب
              </button>
              <button type="button" className="btn btn-soft" onClick={restart}>
                ↺ إعادة اللعبة وتصفير النقاط
              </button>
              <button type="button" className="btn btn-soft" onClick={finish}>
                🏁 إنهاء الآن وعرض النتائج
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => nav(`/setup/${game.id}`)}>
                ⚙️ العودة إلى الإعداد (تُحذف النقاط)
              </button>
            </div>
            <p className="muted small">اختصارات: F ملء الشاشة · M كتم الصوت · 1–4 اختيار الإجابة · H تلميح · Esc القائمة</p>
          </div>
        </div>
      )}
    </div>
  )
}

function HowTo({ onStart }: { onStart: () => void }) {
  const { session, bundle } = useStore()
  const { flags } = useA11y()
  const game = gameById(session!.gameId)
  const example = bundle!.content.mcq[0]
  return (
    <div className="howto">
      <span className="howto-icon" aria-hidden>
        {game.icon}
      </span>
      <h1>{game.name}</h1>
      <p className="lead">{game.tagline}</p>
      <ol className="howto-steps">
        {game.howTo.map((s, i) => (
          <li key={i}>
            <span className="howto-num">{i + 1}</span>
            {s}
          </li>
        ))}
      </ol>
      <p className="muted">طرق المشاركة: {game.participation.join(' · ')}</p>
      {flags.simplified && example && game.category === 'quiz' && (
        <div className="example">
          <strong>مثال قبل أن نبدأ:</strong>
          <p>{example.accessible.simple}</p>
          <p>
            الإجابة: <mark>{example.options[example.correctIndex]}</mark> ✔
          </p>
        </div>
      )}
      <button type="button" className="btn btn-primary btn-xl" autoFocus onClick={onStart}>
        ابدؤوا! ▶
      </button>
    </div>
  )
}
