import { Link, Navigate, useNavigate } from 'react-router-dom'
import { sound } from '../audio/sound'
import { SaveToLibrary } from '../components/SaveToLibrary'
import { pickTheme } from '../engine/adventure'
import { CATEGORY_LABEL, structureLabel, suggestGames, type GameCategory, type GameDef } from '../engine/catalog'
import type { GeneratedContent } from '../engine/types'
import { makeTeams } from '../games/teams'
import { useStore } from '../state/store'

/** One-tap start with classroom defaults (2 teams, all levels, no timer). */
export function quickConfig(game: GameDef, content: GeneratedContent) {
  const coop = game.category === 'adventure'
  const mode = coop ? ('cooperative' as const) : ('teams' as const)
  const count = game.available(content).count
  return {
    gameId: game.id,
    mode,
    teams: makeTeams(mode, 2),
    difficulty: 'all' as const,
    rounds: game.id === 'escape-room' ? 5 : Math.max(1, Math.min(8, count)),
    timerSeconds: null,
  }
}

export function GamesPage() {
  const { bundle, setSession } = useStore()
  const nav = useNavigate()
  if (!bundle) return <Navigate to="/" replace />
  const { lesson, analysis: a, content: c, aiNotes } = bundle
  const suggestions = suggestGames(a, c)
  const ok = suggestions.filter((s) => s.ok)
  const off = suggestions.filter((s) => !s.ok)
  const theme = pickTheme(lesson)
  const cats = Object.keys(CATEGORY_LABEL) as GameCategory[]

  const play = (g: GameDef) => {
    sound.unlock()
    sound.play('whoosh')
    if (g.id === 'wheel') return nav('/wheel')
    setSession(quickConfig(g, c))
    nav('/play')
  }

  return (
    <div className="page games-page">
      <div className="page-head">
        <div>
          <p className="eyebrow">
            {lesson.subject} · {lesson.grade}
          </p>
          <h1>{lesson.title}</h1>
          <p className="lead">{ok.length} لعبة جاهزة لهذا الدرس. اضغط «العب» للبدء فورًا.</p>
        </div>
        <div className="row">
          <SaveToLibrary />
          <Link to="/review" className="btn btn-soft">
            ✏️ مراجعة الأسئلة
          </Link>
        </div>
      </div>

      {aiNotes.length > 0 && (
        <ul className="notes">
          {aiNotes.map((n, i) => (
            <li key={i}>⚠️ {n}</li>
          ))}
        </ul>
      )}

      {cats.map((cat) => {
        const list = ok.filter((s) => s.game.category === cat)
        if (!list.length) return null
        return (
          <section key={cat} className="section">
            <h2>{CATEGORY_LABEL[cat]}</h2>
            <div className="play-grid">
              {list.map(({ game }) => (
                <article key={game.id} className="play-card" style={{ ['--g' as string]: game.color }}>
                  <button type="button" className="play-card-main" onClick={() => play(game)}>
                    <span className="play-card-icon" aria-hidden>
                      {game.icon}
                    </span>
                    <span className="play-card-text">
                      <strong>{game.name}</strong>
                      <span>{game.id === 'escape-room' ? `«${theme.title}»` : game.tagline}</span>
                    </span>
                    <span className="play-card-go">▶ العب</span>
                  </button>
                  {game.id !== 'wheel' && (
                    <Link to={`/setup/${game.id}`} className="play-card-setup" aria-label={`إعدادات ${game.name}`}>
                      ⚙ إعداد
                    </Link>
                  )}
                </article>
              ))}
            </div>
          </section>
        )
      })}

      {off.length > 0 && (
        <details className="section details">
          <summary>ألعاب غير متاحة لهذا الدرس ({off.length})</summary>
          <ul>
            {off.map((s) => (
              <li key={s.game.id}>
                {s.game.icon} <strong>{s.game.name}</strong>: {s.reason}
              </li>
            ))}
          </ul>
        </details>
      )}

      <details className="section details">
        <summary>🔍 تحليل الدرس</summary>
        <div className="chip-list">
          {a.structure.map((s) => (
            <span key={s} className="chip">
              {structureLabel(s)}
            </span>
          ))}
          <span className="chip chip-muted">
            {a.stats.words} كلمة · {a.stats.sentences} جملة · {c.generatedBy === 'ai' ? 'مولّد بالذكاء الاصطناعي' : 'مولّد محليًا'}
          </span>
        </div>
        <div className="analysis-grid">
          <div className="card">
            <h3>🎯 الأهداف التعليمية</h3>
            <ul>{a.objectives.map((o, i) => <li key={i}>{o}</li>)}</ul>
          </div>
          <div className="card">
            <h3>📖 المفاهيم ({a.concepts.length})</h3>
            <dl className="defs">
              {a.concepts.map((cpt) => (
                <div key={cpt.id}>
                  <dt>{cpt.term}</dt>
                  <dd>{cpt.definition}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="card">
            <h3>🔢 التسلسلات والتصنيفات</h3>
            {a.sequences.map((s) => (
              <p key={s.id}>
                <strong>{s.title}:</strong> {s.steps.join(' ← ')}
              </p>
            ))}
            {a.classifications.map((g) => (
              <p key={g.id}>
                <strong>{g.group}:</strong> {g.items.join('، ')}
              </p>
            ))}
            {!a.sequences.length && !a.classifications.length && <p className="muted">لا توجد.</p>}
          </div>
          <div className="card">
            <h3>⭐ أهم المعلومات</h3>
            <ul>{a.keyPoints.map((k, i) => <li key={i}>{k}</li>)}</ul>
            {a.needsExplanation.length > 0 && (
              <>
                <h3>💡 تحتاج شرحًا إضافيًا</h3>
                <ul>{a.needsExplanation.map((n, i) => <li key={i}>{n}</li>)}</ul>
              </>
            )}
          </div>
        </div>
      </details>
    </div>
  )
}
