import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { sound } from '../audio/sound'
import { Confetti, TermsContext } from '../components/common'
import { gameById } from '../engine/catalog'
import { ChoiceBoard } from '../games/boards/ChoiceBoard'
import { GameSessionProvider } from '../games/session'
import { BADGES } from '../games/teams'
import { useStore } from '../state/store'

export function End() {
  const { lastRun, session, bundle, setLastRun } = useStore()
  const nav = useNavigate()
  const [closingDone, setClosingDone] = useState(false)
  useEffect(() => {
    const t = window.setTimeout(() => sound.play('applause'), 400)
    return () => window.clearTimeout(t)
  }, [])
  if (!lastRun || !session || !bundle) return <Navigate to="/games" replace />

  const game = gameById(session.gameId)
  const ranked = [...lastRun.teams].sort((a, b) => b.score - a.score)
  const top = ranked[0]
  const tie = ranked.length > 1 && ranked[1].score === top.score
  const solo = lastRun.teams.length === 1
  const correct = lastRun.results.filter((r) => r.correct).length
  const total = lastRun.results.length
  const closing = bundle.content.closing

  return (
    <div className="page end-page">
      <Confetti show />
      <section className="winner">
        <span className="winner-trophy" aria-hidden>
          🏆
        </span>
        {solo ? (
          <>
            <h1>أحسنتم يا {top.name}!</h1>
            <p className="lead">
              جمعتم <strong>{top.stars}</strong> نجمة و<strong>{top.score}</strong> نقطة معًا.
            </p>
          </>
        ) : tie ? (
          <>
            <h1>تعادل رائع!</h1>
            <p className="lead">
              {ranked.filter((t) => t.score === top.score).map((t) => t.name).join(' و')} بـ {top.score} نقطة.
            </p>
          </>
        ) : (
          <>
            <h1>الفائز: {top.name}</h1>
            <p className="lead">بـ {top.score} نقطة — وكل الفرق تعلّمت اليوم!</p>
          </>
        )}
      </section>

      {!solo && (
        <section className="podium" aria-label="ترتيب الفرق">
          {ranked.map((t, i) => (
            <div key={t.id} className={`podium-col p${i + 1}`} style={{ ['--team' as string]: t.color }}>
              <span className="team-badge big" aria-hidden>
                {t.icon}
                <span className="team-shape">{t.shape}</span>
              </span>
              <strong>{t.name}</strong>
              <span>{t.score} نقطة</span>
              <span>⭐ {t.stars}</span>
              <div className="podium-bar">{i + 1}</div>
            </div>
          ))}
        </section>
      )}

      <div className="end-grid">
        <section className="card">
          <h2>🏅 إنجازات الفرق</h2>
          {lastRun.teams.every((t) => t.badges.length === 0) ? (
            <p className="muted">كل محاولة كانت خطوة تعلّم!</p>
          ) : (
            <ul className="badge-list">
              {lastRun.teams.flatMap((t) =>
                t.badges.map((b) => (
                  <li key={t.id + b}>
                    <span aria-hidden>{BADGES[b].icon}</span> <strong>{t.name}</strong>: {BADGES[b].name}
                  </li>
                )),
              )}
            </ul>
          )}
        </section>

        <section className="card">
          <h2>📋 ملخص التحديات</h2>
          <p>
            {game.icon} {game.name}: <strong>{correct}</strong> إجابة صحيحة من أصل <strong>{total}</strong> تحدٍّ
          </p>
          <ul className="result-list">
            {lastRun.results.slice(0, 14).map((r, i) => (
              <li key={i} className={r.correct ? 'ok' : 'no'}>
                <span aria-hidden>{r.correct ? '✔' : '↻'}</span> {r.label}
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <h2>💡 أهم ما تعلمناه</h2>
          <ul className="learn-list">
            {bundle.content.keyLearnings.map((k, i) => (
              <li key={i}>{k}</li>
            ))}
          </ul>
        </section>
      </div>

      {closing && (
        <section className="card closing">
          <h2>🎯 سؤال ختامي للتأكد من الفهم</h2>
          <TermsContext.Provider value={bundle.analysis.terms}>
            <GameSessionProvider initialTeams={lastRun.teams} mode="whole-class">
              <ChoiceBoard q={closing} onResult={() => {}} onNext={() => setClosingDone(true)} nextLabel="تم ✔" />
            </GameSessionProvider>
          </TermsContext.Provider>
          {closingDone && <p className="center">شكرًا لكم! 🌟</p>}
        </section>
      )}

      <p className="muted center small">النتائج مؤقتة: لا تُحفظ ولا تُرسل إلى أي مكان، وتختفي عند مغادرة الصفحة.</p>
      <div className="center-row">
        <button
          type="button"
          className="btn btn-primary btn-lg"
          onClick={() => {
            setLastRun(null)
            nav('/play')
          }}
        >
          ↺ العبوا مرة أخرى
        </button>
        <Link to="/games" className="btn btn-soft btn-lg" onClick={() => setLastRun(null)}>
          🎮 لعبة أخرى لنفس الدرس
        </Link>
        <Link to="/lesson" className="btn btn-ghost btn-lg" onClick={() => setLastRun(null)}>
          ✍️ درس جديد
        </Link>
      </div>
    </div>
  )
}
