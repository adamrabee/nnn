import { useState } from 'react'
import { useGame } from './session'
import { SCORING } from './teams'

/**
 * Shown inside feedback. Points reward reasoning and cooperation — not speed.
 * Teachers can also credit other teams that answered correctly (e.g. with A/B/C/D cards).
 */
export function ScoringBar({ correct }: { correct: boolean }) {
  const api = useGame()
  const [used, setUsed] = useState<Record<string, boolean>>({})
  const others = api.teams.filter((t) => t.id !== api.activeTeam.id)
  const mark = (k: string) => setUsed((u) => ({ ...u, [k]: true }))
  return (
    <div className="scoring-bar">
      {correct && (
        <>
          <button type="button" className="btn btn-soft btn-sm" disabled={used.explain} onClick={() => (api.bonus('explain'), mark('explain'))}>
            💬 فسّروا الإجابة +{SCORING.explain}
          </button>
          <button type="button" className="btn btn-soft btn-sm" disabled={used.team} onClick={() => (api.bonus('teamwork'), mark('team'))}>
            🤝 تعاون رائع +{SCORING.teamwork}
          </button>
        </>
      )}
      {others.length > 0 && api.mode !== 'teacher-vs-students' && (
        <div className="scoring-others">
          <span>أجاب فريق آخر بشكل صحيح؟</span>
          {others.map((t) => (
            <button
              key={t.id}
              type="button"
              className="btn btn-chip"
              style={{ ['--team' as string]: t.color }}
              disabled={used[t.id]}
              onClick={() => (api.correct(t.id), mark(t.id))}
            >
              <span aria-hidden>{t.shape}</span> {t.name} +{SCORING.correct}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
